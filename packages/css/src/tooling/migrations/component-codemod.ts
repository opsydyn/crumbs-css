import * as ts from "typescript"
import type { ManifestComponent } from "../manifest/model"
import type { SourceMigrationDiagnostic } from "./model"
import {
  migrationDiagnosticAt,
  type ParsedMigrationSource,
  type SourceEdit,
  type SourceEditResult,
} from "./ast"
import type { ValidatedComponentMigration, ValidatedSourceMigration } from "./validate"

const STYLE_MODULE = "@opsydyn/crumbs-css/style"
const editCode = "source.unsupported-syntax" as const
const identifierNamePattern = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u

type MatchedComponentImport = {
  readonly declaration: ts.ImportDeclaration
  readonly specifier: ts.ImportSpecifier
  readonly mapping: ValidatedComponentMigration
  readonly localName: string
}

type RecipeDefinition = {
  readonly mapping: ValidatedComponentMigration
  readonly declaration: ts.VariableDeclaration
  readonly call: ts.CallExpression
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function bindingKey(binding: { readonly moduleSpecifier: string; readonly importedName: string }): string {
  return `${binding.moduleSpecifier}\u0000${binding.importedName}`
}

function addDiagnostic(
  parsed: ParsedMigrationSource,
  node: ts.Node | undefined,
  code: SourceMigrationDiagnostic["code"],
  message: string,
  entityId: string | undefined,
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  const diagnostic = migrationDiagnosticAt(parsed, node, code, message, entityId)
  const key = `${diagnostic.code}\u0000${diagnostic.path}\u0000${diagnostic.line}\u0000${diagnostic.column}\u0000${diagnostic.entityId ?? ""}`
  if (seen.has(key)) return
  seen.add(key)
  diagnostics.push(diagnostic)
}

function makeEdit(start: number, end: number, replacement: string): SourceEdit {
  return { start, end, replacement, code: editCode }
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) || ts.isSatisfiesExpression(current)) {
    current = current.expression
  }
  return current
}

function propertyNameText(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text
  return undefined
}

function escapeString(value: string, quote: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(quote, `\\${quote}`)
}

function renamePropertyName(
  parsed: ParsedMigrationSource,
  name: ts.PropertyName,
  replacement: string,
): SourceEdit {
  const start = name.getStart(parsed.sourceFile)
  if (ts.isStringLiteral(name)) {
    const quote = parsed.source.slice(start, start + 1)
    return makeEdit(start, name.end, `${quote}${escapeString(replacement, quote)}${quote}`)
  }
  const emitted = identifierNamePattern.test(replacement) ? replacement : `"${escapeString(replacement, "\"")}"`
  return makeEdit(start, name.end, emitted)
}

function isExported(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false)
}

function declarationBindingNames(name: ts.BindingName): ReadonlyArray<ts.Identifier> {
  if (ts.isIdentifier(name)) return [name]
  const identifiers: ts.Identifier[] = []
  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) continue
    identifiers.push(...declarationBindingNames(element.name))
  }
  return identifiers
}

function isBindingDeclaration(identifier: ts.Identifier): boolean {
  const parent = identifier.parent
  if (ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent)) {
    return declarationBindingNames(parent.name).includes(identifier)
  }
  if (ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) ||
    ts.isClassDeclaration(parent) || ts.isClassExpression(parent) ||
    ts.isEnumDeclaration(parent) || ts.isInterfaceDeclaration(parent) ||
    ts.isTypeAliasDeclaration(parent) || ts.isTypeParameterDeclaration(parent) ||
    ts.isModuleDeclaration(parent)) return parent.name === identifier
  if (ts.isCatchClause(parent)) return parent.variableDeclaration !== undefined && declarationBindingNames(parent.variableDeclaration.name).includes(identifier)
  if (ts.isImportClause(parent) || ts.isImportSpecifier(parent) || ts.isNamespaceImport(parent) || ts.isImportEqualsDeclaration(parent)) {
    return parent.name === identifier
  }
  return false
}

function isNonReferenceName(identifier: ts.Identifier): boolean {
  const parent = identifier.parent
  if (isBindingDeclaration(identifier)) return true
  if ((ts.isPropertyAccessExpression(parent) && parent.name === identifier) ||
    (ts.isPropertyAssignment(parent) && parent.name === identifier) ||
    (ts.isMethodDeclaration(parent) && parent.name === identifier) ||
    (ts.isPropertyDeclaration(parent) && parent.name === identifier) ||
    (ts.isMethodSignature(parent) && parent.name === identifier) ||
    (ts.isPropertySignature(parent) && parent.name === identifier) ||
    (ts.isImportSpecifier(parent) && parent.propertyName === identifier)) return true
  return false
}

function hasShadowedBinding(
  parsed: ParsedMigrationSource,
  localName: string,
  expectedImports: ReadonlySet<ts.ImportSpecifier>,
): ts.Identifier | undefined {
  let shadow: ts.Identifier | undefined
  const visit = (node: ts.Node): void => {
    if (shadow !== undefined) return
    if (ts.isIdentifier(node) && node.text === localName && isBindingDeclaration(node) &&
      !expectedImports.has(node.parent as ts.ImportSpecifier)) {
      shadow = node
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed.sourceFile)
  return shadow
}

function staticProperties(object: ts.ObjectLiteralExpression): ReadonlyArray<ts.PropertyAssignment> | undefined {
  if (object.properties.some(property => !ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name))) return undefined
  return object.properties as unknown as ReadonlyArray<ts.PropertyAssignment>
}

function propertiesNamed(object: ts.ObjectLiteralExpression, name: string): ReadonlyArray<ts.PropertyAssignment> | undefined {
  const properties = staticProperties(object)
  if (properties === undefined) return undefined
  return properties.filter(property => propertyNameText(property.name) === name)
}

function objectValue(
  parsed: ParsedMigrationSource,
  property: ts.PropertyAssignment,
  label: string,
  entityId: string,
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): ts.ObjectLiteralExpression | undefined {
  const value = unwrap(property.initializer)
  if (ts.isObjectLiteralExpression(value)) return value
  addDiagnostic(parsed, property, "source.unsupported-syntax", `${label} must be a static object literal.`, entityId, diagnostics, seen)
  return undefined
}

function visitSlotRecord(
  parsed: ParsedMigrationSource,
  object: ts.ObjectLiteralExpression,
  slotMap: Readonly<Record<string, string>>,
  entityId: string,
  label: string,
  requireComplete: boolean,
  edits: SourceEdit[],
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  const properties = staticProperties(object)
  if (properties === undefined) {
    addDiagnostic(parsed, object, "source.unsupported-syntax", `${label} must contain only static slot property assignments.`, entityId, diagnostics, seen)
    return
  }
  const found = new Set<string>()
  const targetOwners = new Map<string, string>()
  for (const property of properties) {
    const name = propertyNameText(property.name)
    if (name === undefined) {
      addDiagnostic(parsed, property, "source.unsupported-syntax", `${label} contains an unsupported slot key.`, entityId, diagnostics, seen)
      continue
    }
    const target = slotMap[name]
    if (target === undefined) {
      addDiagnostic(parsed, property, "source.unsupported-syntax", `${label} contains slot ${JSON.stringify(name)} outside the validated migration map.`, entityId, diagnostics, seen)
      continue
    }
    if (found.has(name)) {
      addDiagnostic(parsed, property, "source.ambiguous-binding", `${label} contains duplicate slot ${JSON.stringify(name)}.`, entityId, diagnostics, seen)
      continue
    }
    found.add(name)
    const previousOwner = targetOwners.get(target)
    if (previousOwner !== undefined && previousOwner !== name) {
      addDiagnostic(parsed, property, "source.ambiguous-binding", `${label} maps both ${JSON.stringify(previousOwner)} and ${JSON.stringify(name)} to the same output slot.`, entityId, diagnostics, seen)
      continue
    }
    targetOwners.set(target, name)
    if (target !== name) edits.push(renamePropertyName(parsed, property.name, target))
  }
  if (requireComplete) {
    const missing = Object.keys(slotMap).filter(name => !found.has(name))
    if (missing.length > 0) {
      addDiagnostic(parsed, object, "component.origin-ambiguous", `${label} does not declare every baseline slot from the migration map.`, entityId, diagnostics, seen)
    }
  }
}

function visitVariantBranches(
  parsed: ParsedMigrationSource,
  object: ts.ObjectLiteralExpression,
  slotMap: Readonly<Record<string, string>>,
  entityId: string,
  label: string,
  edits: SourceEdit[],
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  const axes = staticProperties(object)
  if (axes === undefined) {
    addDiagnostic(parsed, object, "source.unsupported-syntax", `${label} axes must be static object properties.`, entityId, diagnostics, seen)
    return
  }
  const seenAxes = new Set<string>()
  for (const axis of axes) {
    const axisName = propertyNameText(axis.name)
    if (axisName === undefined) {
      addDiagnostic(parsed, axis, "source.unsupported-syntax", `${label} contains a computed variant axis.`, entityId, diagnostics, seen)
      continue
    }
    if (seenAxes.has(axisName)) addDiagnostic(parsed, axis, "source.ambiguous-binding", `${label} contains duplicate variant axis ${JSON.stringify(axisName)}.`, entityId, diagnostics, seen)
    seenAxes.add(axisName)
    const branches = objectValue(parsed, axis, `Variant axis ${axisName}`, entityId, diagnostics, seen)
    if (branches === undefined) continue
    const values = staticProperties(branches)
    if (values === undefined) {
      addDiagnostic(parsed, branches, "source.unsupported-syntax", `Variant axis ${axisName} branches must be static object properties.`, entityId, diagnostics, seen)
      continue
    }
    const seenValues = new Set<string>()
    for (const branch of values) {
      const valueName = propertyNameText(branch.name)
      if (valueName === undefined) {
        addDiagnostic(parsed, branch, "source.unsupported-syntax", `Variant axis ${axisName} contains a computed value.`, entityId, diagnostics, seen)
        continue
      }
      if (seenValues.has(valueName)) addDiagnostic(parsed, branch, "source.ambiguous-binding", `Variant axis ${axisName} contains duplicate value ${JSON.stringify(valueName)}.`, entityId, diagnostics, seen)
      seenValues.add(valueName)
      const styles = objectValue(parsed, branch, `Variant branch ${axisName}.${valueName}`, entityId, diagnostics, seen)
      if (styles !== undefined) visitSlotRecord(parsed, styles, slotMap, entityId, `Variant branch ${axisName}.${valueName}`, false, edits, diagnostics, seen)
    }
  }
}

function visitCompoundVariants(
  parsed: ParsedMigrationSource,
  expression: ts.Expression,
  slotMap: Readonly<Record<string, string>>,
  entityId: string,
  edits: SourceEdit[],
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  const value = unwrap(expression)
  if (!ts.isArrayLiteralExpression(value)) {
    addDiagnostic(parsed, expression, "source.unsupported-syntax", "compoundVariants must be a static array literal.", entityId, diagnostics, seen)
    return
  }
  for (const element of value.elements) {
    if (!ts.isObjectLiteralExpression(element)) {
      addDiagnostic(parsed, element, "source.unsupported-syntax", "Each compound variant must be a static object literal.", entityId, diagnostics, seen)
      continue
    }
    const properties = staticProperties(element)
    if (properties === undefined) {
      addDiagnostic(parsed, element, "source.unsupported-syntax", "Compound variant fields must be static object properties.", entityId, diagnostics, seen)
      continue
    }
    const styles = properties.filter(property => propertyNameText(property.name) === "styles")
    if (styles.length > 1) {
      addDiagnostic(parsed, element, "source.ambiguous-binding", "Compound variant declares styles more than once.", entityId, diagnostics, seen)
      continue
    }
    if (styles.length === 1) {
      const styleObject = objectValue(parsed, styles[0]!, "Compound variant styles", entityId, diagnostics, seen)
      if (styleObject !== undefined) visitSlotRecord(parsed, styleObject, slotMap, entityId, "Compound variant styles", false, edits, diagnostics, seen)
    }
  }
}

function visitRecipeConfig(
  parsed: ParsedMigrationSource,
  config: ts.ObjectLiteralExpression,
  mapping: ValidatedComponentMigration,
  edits: SourceEdit[],
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  const properties = staticProperties(config)
  if (properties === undefined) {
    addDiagnostic(parsed, config, "source.unsupported-syntax", "Recipe configuration must use static top-level properties.", mapping.from.id, diagnostics, seen)
    return
  }
  const fields = new Map<string, ts.PropertyAssignment[]>()
  for (const property of properties) {
    const name = propertyNameText(property.name)
    if (name === undefined) continue
    const values = fields.get(name) ?? []
    values.push(property)
    fields.set(name, values)
  }
  const slotMap = mapping.mapping.slots
  const slots = fields.get("slots") ?? []
  if (slots.length !== 1) {
    addDiagnostic(parsed, config, slots.length === 0 ? "component.origin-ambiguous" : "source.ambiguous-binding", "Recipe configuration must declare exactly one static slots object.", mapping.from.id, diagnostics, seen)
  } else {
    const object = objectValue(parsed, slots[0]!, "Recipe slots", mapping.from.id, diagnostics, seen)
    if (object !== undefined) visitSlotRecord(parsed, object, slotMap, mapping.from.id, "Recipe slots", true, edits, diagnostics, seen)
  }
  for (const field of ["base", "variants", "compoundVariants"] as const) {
    const matches = fields.get(field) ?? []
    if (matches.length > 1) {
      addDiagnostic(parsed, config, "source.ambiguous-binding", `Recipe configuration declares ${field} more than once.`, mapping.from.id, diagnostics, seen)
      continue
    }
    const property = matches[0]
    if (property === undefined) continue
    if (field === "compoundVariants") {
      visitCompoundVariants(parsed, property.initializer, slotMap, mapping.from.id, edits, diagnostics, seen)
      continue
    }
    const object = objectValue(parsed, property, `Recipe ${field}`, mapping.from.id, diagnostics, seen)
    if (object === undefined) continue
    if (field === "base") visitSlotRecord(parsed, object, slotMap, mapping.from.id, "Recipe base styles", false, edits, diagnostics, seen)
    else visitVariantBranches(parsed, object, slotMap, mapping.from.id, "Recipe variants", edits, diagnostics, seen)
  }
}

function apiLocalNames(
  parsed: ParsedMigrationSource,
  importedExport: string,
  moduleSpecifiers: ReadonlyArray<string> = [STYLE_MODULE],
): ReadonlyArray<string> {
  const names: string[] = []
  const allowedModules = new Set(moduleSpecifiers)
  const visit = (node: ts.Node): void => {
    const namedBindings = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : undefined
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && allowedModules.has(node.moduleSpecifier.text) &&
      node.importClause !== undefined && !node.importClause.isTypeOnly && namedBindings !== undefined && ts.isNamedImports(namedBindings)) {
      for (const specifier of namedBindings.elements) {
        if (!specifier.isTypeOnly && (specifier.propertyName?.text ?? specifier.name.text) === importedExport) names.push(specifier.name.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed.sourceFile)
  return names
}


function isWithinNamedCall(node: ts.Node, names: ReadonlySet<string>): boolean {
  let current: ts.Node = node
  while (current.parent !== undefined) {
    const parent = current.parent
    if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) && names.has(parent.expression.text)) return true
    current = parent
  }
  return false
}

function exportedVariables(parsed: ParsedMigrationSource, exportName: string): ReadonlyArray<ts.VariableDeclaration> {
  const declarations: ts.VariableDeclaration[] = []
  for (const statement of parsed.sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !isExported(statement) ||
      (statement.declarationList.flags & ts.NodeFlags.Const) === 0) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === exportName) declarations.push(declaration)
    }
  }
  return declarations
}

function recipeCall(
  parsed: ParsedMigrationSource,
  mapping: ValidatedComponentMigration,
  declaration: ts.VariableDeclaration,
  apiNames: ReadonlyArray<string>,
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): RecipeDefinition | undefined {
  const initializer = declaration.initializer === undefined ? undefined : unwrap(declaration.initializer)
  if (initializer === undefined || !ts.isCallExpression(initializer) || !ts.isIdentifier(initializer.expression) ||
    !apiNames.includes(initializer.expression.text)) {
    addDiagnostic(parsed, declaration, "component.origin-ambiguous", "Manifest recipe origin does not match a simple exported componentRecipe call.", mapping.from.id, diagnostics, seen)
    return undefined
  }
  if (apiNames.length === 0) {
    addDiagnostic(parsed, initializer, "source.ambiguous-binding", "componentRecipe must be a named import from @opsydyn/crumbs-css/style.", mapping.from.id, diagnostics, seen)
    return undefined
  }
  if (initializer.arguments.length === 0) {
    addDiagnostic(parsed, initializer, "source.unsupported-syntax", "componentRecipe requires an explicit configuration object for source migration.", mapping.from.id, diagnostics, seen)
    return undefined
  }
  const config = unwrap(initializer.arguments[0]!)
  if (!ts.isObjectLiteralExpression(config)) {
    addDiagnostic(parsed, initializer.arguments[0], "source.unsupported-syntax", "componentRecipe configuration must be a static object literal.", mapping.from.id, diagnostics, seen)
    return undefined
  }
  return { mapping, declaration, call: initializer }
}

function collectRecipeDefinitions(
  parsed: ParsedMigrationSource,
  validated: ValidatedSourceMigration,
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): ReadonlyArray<RecipeDefinition> {
  const candidates = validated.components.filter(mapping => mapping.from.origin.path === parsed.path)
  if (candidates.length === 0) return []
  const byExport = new Map<string, ValidatedComponentMigration[]>()
  for (const mapping of candidates) {
    const exportPath = mapping.from.origin.exportPath
    if (exportPath === undefined || !identifierNamePattern.test(exportPath)) {
      addDiagnostic(parsed, undefined, "component.origin-ambiguous", "Manifest recipe origin must name one exported identifier.", mapping.from.id, diagnostics, seen)
      continue
    }
    const entries = byExport.get(exportPath) ?? []
    entries.push(mapping)
    byExport.set(exportPath, entries)
  }

  const apiNames = apiLocalNames(parsed, "componentRecipe")
  const definitions: RecipeDefinition[] = []
  for (const [exportPath, mappings] of byExport) {
    if (mappings.length !== 1) {
      addDiagnostic(parsed, undefined, "component.origin-ambiguous", `Multiple baseline components match export ${JSON.stringify(exportPath)} at this file origin.`, mappings[0]!.from.id, diagnostics, seen)
      continue
    }
    const mapping = mappings[0]!
    const declarations = exportedVariables(parsed, exportPath)
    if (declarations.length !== 1) {
      addDiagnostic(parsed, declarations[0], "component.origin-ambiguous", `Expected exactly one exported recipe named ${JSON.stringify(exportPath)} at the manifest origin.`, mapping.from.id, diagnostics, seen)
      continue
    }
    if (apiNames.length === 0) {
      addDiagnostic(parsed, declarations[0], "source.ambiguous-binding", "componentRecipe must be a named import from @opsydyn/crumbs-css/style.", mapping.from.id, diagnostics, seen)
      continue
    }
    const definition = recipeCall(parsed, mapping, declarations[0]!, apiNames, diagnostics, seen)
    if (definition !== undefined) definitions.push(definition)
  }
  return definitions
}

/** Plan slot-key edits only for a recipe declaration at its exact manifest origin and export. */
export function planComponentDeclarationEdits(input: {
  readonly parsed: ParsedMigrationSource
  readonly validated: ValidatedSourceMigration
}): SourceEditResult {
  const { parsed, validated } = input
  if (parsed.diagnostics.length > 0) return { edits: [], diagnostics: [...parsed.diagnostics] }
  const edits: SourceEdit[] = []
  const diagnostics: SourceMigrationDiagnostic[] = []
  const seen = new Set<string>()
  const definitions = collectRecipeDefinitions(parsed, validated, diagnostics, seen)
  for (const definition of definitions) {
    const config = unwrap(definition.call.arguments[0]!)
    if (ts.isObjectLiteralExpression(config)) visitRecipeConfig(parsed, config, definition.mapping, edits, diagnostics, seen)
  }
  diagnostics.sort((left, right) => compareOrdinal(left.path ?? "", right.path ?? "") ||
    (left.line ?? 0) - (right.line ?? 0) || (left.column ?? 0) - (right.column ?? 0) || compareOrdinal(left.code, right.code))
  return diagnostics.length === 0 ? { edits, diagnostics } : { edits: [], diagnostics }
}

function componentImportGroups(validated: ValidatedSourceMigration): ReadonlyMap<string, ReadonlyArray<ValidatedComponentMigration>> {
  const groups = new Map<string, ValidatedComponentMigration[]>()
  for (const mapping of validated.components) {
    const key = bindingKey(mapping.mapping.fromImport)
    const entries = groups.get(key) ?? []
    entries.push(mapping)
    groups.set(key, entries)
  }
  return groups
}

function addImportRewriteEdits(
  parsed: ParsedMigrationSource,
  imports: ReadonlyArray<MatchedComponentImport>,
  edits: SourceEdit[],
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  const declarations = new Map<ts.ImportDeclaration, MatchedComponentImport[]>()
  for (const item of imports) {
    const entries = declarations.get(item.declaration) ?? []
    entries.push(item)
    declarations.set(item.declaration, entries)
  }
  for (const [declaration, entries] of declarations) {
    const targets = new Set(entries.map(item => item.mapping.mapping.toImport.moduleSpecifier))
    if (targets.size !== 1) {
      addDiagnostic(parsed, declaration, "source.ambiguous-binding", "One import declaration maps to multiple replacement modules.", entries[0]!.mapping.from.id, diagnostics, seen)
      continue
    }
    const targetModule = [...targets][0]!
    const moduleSpecifier = declaration.moduleSpecifier
    if (!ts.isStringLiteral(moduleSpecifier)) {
      addDiagnostic(parsed, declaration, "source.unsupported-syntax", "Mapped component imports require a static string module specifier.", entries[0]!.mapping.from.id, diagnostics, seen)
      continue
    }
    if (targetModule !== moduleSpecifier.text) {
      const start = moduleSpecifier.getStart(parsed.sourceFile)
      const quote = parsed.source.slice(start, start + 1)
      edits.push(makeEdit(start, moduleSpecifier.end, `${quote}${escapeString(targetModule, quote)}${quote}`))
    }
    for (const item of entries) {
      const targetName = item.mapping.mapping.toImport.importedName
      const importedName = item.specifier.propertyName?.text ?? item.specifier.name.text
      if (targetName === importedName) continue
      if (item.specifier.propertyName !== undefined) {
        edits.push(renamePropertyName(parsed, item.specifier.propertyName, targetName))
      } else if (targetName !== item.localName) {
        edits.push(makeEdit(item.specifier.name.getStart(parsed.sourceFile), item.specifier.name.end, `${targetName} as ${item.localName}`))
      }
    }
  }
}

function diagnoseAmbiguousComponentImports(
  parsed: ParsedMigrationSource,
  validated: ValidatedSourceMigration,
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  const groups = componentImportGroups(validated)
  const visit = (node: ts.Node): void => {
    const namedBindings = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : undefined
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && namedBindings !== undefined && ts.isNamedImports(namedBindings)) {
      for (const specifier of namedBindings.elements) {
        if (specifier.isTypeOnly) continue
        const importedName = specifier.propertyName?.text ?? specifier.name.text
        const mappings = groups.get(bindingKey({ moduleSpecifier: node.moduleSpecifier.text, importedName }))
        if (mappings !== undefined && mappings.length > 1) {
          addDiagnostic(parsed, specifier, "source.ambiguous-binding", "One component import binding maps to multiple baseline component IDs.", mappings[0]!.from.id, diagnostics, seen)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed.sourceFile)
}

function componentImports(
  parsed: ParsedMigrationSource,
  validated: ValidatedSourceMigration,
): ReadonlyArray<MatchedComponentImport> {
  const groups = componentImportGroups(validated)
  const imports: MatchedComponentImport[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.importClause !== undefined &&
      !node.importClause.isTypeOnly && node.importClause.namedBindings !== undefined && ts.isNamedImports(node.importClause.namedBindings)) {
      for (const specifier of node.importClause.namedBindings.elements) {
        if (specifier.isTypeOnly) continue
        const importedName = specifier.propertyName?.text ?? specifier.name.text
        const mappings = groups.get(bindingKey({ moduleSpecifier: node.moduleSpecifier.text, importedName }))
        if (mappings?.length === 1) imports.push({ declaration: node, specifier, mapping: mappings[0]!, localName: specifier.name.text })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed.sourceFile)
  return imports
}

function visitExtensionConfig(
  parsed: ParsedMigrationSource,
  configExpression: ts.Expression | undefined,
  mapping: ValidatedComponentMigration,
  edits: SourceEdit[],
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  if (configExpression === undefined) {
    addDiagnostic(parsed, undefined, "source.unsupported-syntax", "extendComponentRecipe requires an explicit static configuration object.", mapping.from.id, diagnostics, seen)
    return
  }
  const config = unwrap(configExpression)
  if (!ts.isObjectLiteralExpression(config)) {
    addDiagnostic(parsed, configExpression, "source.unsupported-syntax", "extendComponentRecipe configuration must be a static object literal.", mapping.from.id, diagnostics, seen)
    return
  }
  const properties = staticProperties(config)
  if (properties === undefined) {
    addDiagnostic(parsed, config, "source.unsupported-syntax", "Extension configuration must use static top-level properties.", mapping.from.id, diagnostics, seen)
    return
  }
  const fields = new Map<string, ts.PropertyAssignment[]>()
  for (const property of properties) {
    const name = propertyNameText(property.name)
    if (name === undefined) continue
    const matches = fields.get(name) ?? []
    matches.push(property)
    fields.set(name, matches)
  }
  const slotMap = mapping.mapping.slots
  for (const field of ["slotOverrides", "variants", "compoundVariants"] as const) {
    const matches = fields.get(field) ?? []
    if (matches.length > 1) {
      addDiagnostic(parsed, config, "source.ambiguous-binding", `Extension configuration declares ${field} more than once.`, mapping.from.id, diagnostics, seen)
      continue
    }
    const property = matches[0]
    if (property === undefined) continue
    if (field === "compoundVariants") {
      visitCompoundVariants(parsed, property.initializer, slotMap, mapping.from.id, edits, diagnostics, seen)
      continue
    }
    const object = objectValue(parsed, property, `Extension ${field}`, mapping.from.id, diagnostics, seen)
    if (object === undefined) continue
    if (field === "slotOverrides") visitSlotRecord(parsed, object, slotMap, mapping.from.id, "Extension slotOverrides", false, edits, diagnostics, seen)
    else visitVariantBranches(parsed, object, slotMap, mapping.from.id, "Extension variants", edits, diagnostics, seen)
  }
}

/** Plan explicit recipe-import and slot edits inside recognized component extension calls. */
export function planComponentExtensionEdits(input: {
  readonly parsed: ParsedMigrationSource
  readonly validated: ValidatedSourceMigration
}): SourceEditResult {
  const { parsed, validated } = input
  if (parsed.diagnostics.length > 0) return { edits: [], diagnostics: [...parsed.diagnostics] }
  const edits: SourceEdit[] = []
  const diagnostics: SourceMigrationDiagnostic[] = []
  const seen = new Set<string>()
  diagnoseAmbiguousComponentImports(parsed, validated, diagnostics, seen)
  const imports = componentImports(parsed, validated)
  const importsByLocal = new Map<string, MatchedComponentImport[]>()
  for (const item of imports) {
    const entries = importsByLocal.get(item.localName) ?? []
    entries.push(item)
    importsByLocal.set(item.localName, entries)
  }
  addImportRewriteEdits(parsed, imports, edits, diagnostics, seen)

  const extensionNames = new Set(apiLocalNames(parsed, "extendComponentRecipe"))
  const useThemedStylesNames = new Set(apiLocalNames(parsed, "useThemedStyles", ["@opsydyn/crumbs-css/theme", "@opsydyn/crumbs-css/theme/core"]))
  const recognizedReferences = new Set<ts.Identifier>()
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && extensionNames.has(node.expression.text)) {
      const base = node.arguments[0]
      if (base !== undefined && ts.isIdentifier(base)) {
        const mapped = importsByLocal.get(base.text)
        if (mapped !== undefined) {
          recognizedReferences.add(base)
          const uniqueMappings = new Set(mapped.map(item => item.mapping))
          if (uniqueMappings.size !== 1) {
            addDiagnostic(parsed, base, "source.ambiguous-binding", "Extension base import matches multiple component migrations.", mapped[0]!.mapping.from.id, diagnostics, seen)
          } else {
            visitExtensionConfig(parsed, node.arguments[1], mapped[0]!.mapping, edits, diagnostics, seen)
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed.sourceFile)

  for (const [localName, matched] of importsByLocal) {
    const importSpecifiers = new Set(matched.map(item => item.specifier))
    const shadow = hasShadowedBinding(parsed, localName, importSpecifiers)
    if (shadow !== undefined) {
      addDiagnostic(parsed, shadow, "source.ambiguous-binding", "Mapped component import is shadowed by another local binding.", matched[0]!.mapping.from.id, diagnostics, seen)
    }
    const mappedIds = new Set(matched.map(item => item.mapping.from.id))
    if (mappedIds.size > 1) {
      addDiagnostic(parsed, matched[0]!.specifier, "source.ambiguous-binding", "One component import binding maps to multiple baseline component IDs.", matched[0]!.mapping.from.id, diagnostics, seen)
    }
    const inspectUses = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node.text === localName && !isBindingDeclaration(node) && !isNonReferenceName(node) &&
        !recognizedReferences.has(node) && !isWithinNamedCall(node, useThemedStylesNames)) {
        addDiagnostic(parsed, node, "source.unsupported-syntax", "Mapped recipe import is used outside a recognized component extension call.", matched[0]!.mapping.from.id, diagnostics, seen)
      }
      ts.forEachChild(node, inspectUses)
    }
    inspectUses(parsed.sourceFile)
  }

  diagnostics.sort((left, right) => compareOrdinal(left.path ?? "", right.path ?? "") ||
    (left.line ?? 0) - (right.line ?? 0) || (left.column ?? 0) - (right.column ?? 0) || compareOrdinal(left.code, right.code))
  return diagnostics.length === 0 ? { edits, diagnostics } : { edits: [], diagnostics }
}

type ApiImportBinding = {
  readonly localName: string
  readonly specifier: ts.ImportSpecifier
}

type ThemedRecipeProperty = {
  readonly mapping: ValidatedComponentMigration
  readonly holder: string
  readonly property: string
  readonly declaration: ts.VariableDeclaration
  readonly propertyNode: ts.Node
}

type ResolverCreation = {
  readonly call: ts.CallExpression
  readonly holder: string
  readonly property: string
}

function apiImportBindings(
  parsed: ParsedMigrationSource,
  importedExport: string,
  moduleSpecifiers: ReadonlyArray<string>,
): ReadonlyArray<ApiImportBinding> {
  const allowedModules = new Set(moduleSpecifiers)
  const bindings: ApiImportBinding[] = []
  const visit = (node: ts.Node): void => {
    const namedBindings = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : undefined
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) &&
      allowedModules.has(node.moduleSpecifier.text) && node.importClause !== undefined &&
      !node.importClause.isTypeOnly && namedBindings !== undefined && ts.isNamedImports(namedBindings)) {
      for (const specifier of namedBindings.elements) {
        if (!specifier.isTypeOnly && (specifier.propertyName?.text ?? specifier.name.text) === importedExport) {
          bindings.push({ localName: specifier.name.text, specifier })
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed.sourceFile)
  return bindings
}

function findOtherBinding(
  parsed: ParsedMigrationSource,
  localName: string,
  allowed: ReadonlySet<ts.Identifier>,
): ts.Identifier | undefined {
  let result: ts.Identifier | undefined
  const visit = (node: ts.Node): void => {
    if (result !== undefined) return
    if (ts.isIdentifier(node) && node.text === localName && isBindingDeclaration(node) && !allowed.has(node)) {
      result = node
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed.sourceFile)
  return result
}

function nodeContains(root: ts.Node, target: ts.Node): boolean {
  if (root === target) return true
  let found = false
  const visit = (node: ts.Node): void => {
    if (found) return
    if (node === target) {
      found = true
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(root)
  return found
}

function hasWriteToLocal(parsed: ParsedMigrationSource, localName: string): ts.Identifier | undefined {
  let result: ts.Identifier | undefined
  const visit = (node: ts.Node): void => {
    if (result !== undefined) return
    if (ts.isIdentifier(node) && node.text === localName && !isBindingDeclaration(node) && !isNonReferenceName(node)) {
      let current: ts.Node = node
      while (current.parent !== undefined) {
        const parent = current.parent
        if (ts.isBinaryExpression(parent) &&
          (parent.operatorToken.kind === ts.SyntaxKind.EqualsToken ||
            (parent.operatorToken.kind >= ts.SyntaxKind.FirstCompoundAssignment &&
              parent.operatorToken.kind <= ts.SyntaxKind.LastCompoundAssignment)) &&
          nodeContains(parent.left, node)) {
          result = node
          return
        }
        if (ts.isDeleteExpression(parent) && nodeContains(parent.expression, node)) {
          result = node
          return
        }
        if (((ts.isPrefixUnaryExpression(parent) &&
            (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken)) ||
          (ts.isPostfixUnaryExpression(parent) &&
            (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken))) &&
          nodeContains(parent.operand, node)) {
          result = node
          return
        }
        current = parent
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed.sourceFile)
  return result
}

function variableDeclarations(parsed: ParsedMigrationSource): ReadonlyArray<ts.VariableDeclaration> {
  const declarations: ts.VariableDeclaration[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node)) declarations.push(node)
    ts.forEachChild(node, visit)
  }
  visit(parsed.sourceFile)
  return declarations
}

function isConstVariable(declaration: ts.VariableDeclaration): boolean {
  return ts.isVariableDeclarationList(declaration.parent) &&
    (declaration.parent.flags & ts.NodeFlags.Const) !== 0
}

function namedCall(expression: ts.Expression, names: ReadonlySet<string>): ts.CallExpression | undefined {
  const unwrapped = unwrap(expression)
  return ts.isCallExpression(unwrapped) && ts.isIdentifier(unwrapped.expression) && names.has(unwrapped.expression.text)
    ? unwrapped
    : undefined
}

function directThemedProperty(
  reference: ts.Identifier,
  localName: string,
  useThemedStylesNames: ReadonlySet<string>,
  declarations: ReadonlyArray<ts.VariableDeclaration>,
): { readonly call: ts.CallExpression; readonly property: string; readonly propertyNode: ts.Node } | undefined {
  const parent = reference.parent
  let propertyName: string | undefined
  let propertyNode: ts.Node
  let object: ts.ObjectLiteralExpression
  if (ts.isShorthandPropertyAssignment(parent) && parent.name === reference &&
    parent.objectAssignmentInitializer === undefined && ts.isObjectLiteralExpression(parent.parent)) {
    propertyName = localName
    propertyNode = parent
    object = parent.parent
  } else if (ts.isPropertyAssignment(parent) && parent.initializer === reference &&
    !ts.isComputedPropertyName(parent.name) && ts.isObjectLiteralExpression(parent.parent)) {
    propertyName = propertyNameText(parent.name)
    propertyNode = parent
    object = parent.parent
  } else {
    return undefined
  }
  if (propertyName === undefined) return undefined

  const properties = object.properties
  const propertyKeys = properties.map(property => {
    if (ts.isPropertyAssignment(property) && !ts.isComputedPropertyName(property.name)) {
      return propertyNameText(property.name)
    }
    if (ts.isShorthandPropertyAssignment(property) && property.objectAssignmentInitializer === undefined) {
      return property.name.text
    }
    return undefined
  })
  if (propertyKeys.some(key => key === undefined) ||
    new Set(propertyKeys).size !== propertyKeys.length) return undefined
  const matchingProperties = properties.filter((_property, index) => propertyKeys[index] === propertyName)
  if (matchingProperties.length !== 1 || matchingProperties[0] !== propertyNode) return undefined

  let current: ts.Node = object
  while (current.parent !== undefined) {
    const parentNode = current.parent
    if (ts.isCallExpression(parentNode) && parentNode.arguments.length === 1 &&
      unwrap(parentNode.arguments[0]!) === object && ts.isIdentifier(parentNode.expression) &&
      useThemedStylesNames.has(parentNode.expression.text)) {
      const declaration = declarations.find(candidate =>
        candidate.initializer !== undefined && unwrap(candidate.initializer) === parentNode)
      if (declaration === undefined || !isConstVariable(declaration) || !ts.isIdentifier(declaration.name)) return undefined
      return { call: parentNode, property: propertyName, propertyNode }
    }
    if (ts.isParenthesizedExpression(parentNode) || ts.isAsExpression(parentNode) ||
      ts.isTypeAssertionExpression(parentNode) || ts.isSatisfiesExpression(parentNode)) {
      current = parentNode
      continue
    }
    return undefined
  }
  return undefined
}

function resolverCreation(
  expression: ts.Expression,
  resolverNames: ReadonlySet<string>,
  useMemoNames: ReadonlySet<string>,
): ResolverCreation | undefined {
  let call = namedCall(expression, resolverNames)
  if (call === undefined) {
    const memo = namedCall(expression, useMemoNames)
    if (memo === undefined || memo.arguments.length !== 2) return undefined
    const callback = unwrap(memo.arguments[0]!)
    const isAsync = ts.canHaveModifiers(callback) &&
      (ts.getModifiers(callback)?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) ?? false)
    if (!ts.isArrowFunction(callback) || ts.isBlock(callback.body) || callback.parameters.length !== 0 || isAsync) return undefined
    call = namedCall(callback.body, resolverNames)
  }
  if (call === undefined || call.arguments.length < 1 || call.arguments.length > 2) return undefined
  const recipe = unwrap(call.arguments[0]!)
  if (!ts.isPropertyAccessExpression(recipe) || recipe.questionDotToken !== undefined ||
    !ts.isIdentifier(recipe.expression)) return undefined
  return { call, holder: recipe.expression.text, property: recipe.name.text }
}

function isExtensionBaseReference(node: ts.Identifier, extensionNames: ReadonlySet<string>): boolean {
  const parent = node.parent
  return ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) &&
    extensionNames.has(parent.expression.text) && parent.arguments[0] === node
}

/**
 * Trace only direct, immutable useThemedStyles -> recipe resolver flows.
 * Unsupported references fail closed so the aggregator can suppress every file in the invocation.
 */
export function planComponentResolverEdits(input: {
  readonly parsed: ParsedMigrationSource
  readonly validated: ValidatedSourceMigration
}): SourceEditResult {
  const { parsed, validated } = input
  if (parsed.diagnostics.length > 0) return { edits: [], diagnostics: [...parsed.diagnostics] }
  const edits: SourceEdit[] = []
  const diagnostics: SourceMigrationDiagnostic[] = []
  const seen = new Set<string>()
  diagnoseAmbiguousComponentImports(parsed, validated, diagnostics, seen)

  const declarations = variableDeclarations(parsed)
  const imports = componentImports(parsed, validated)
  const importsByLocal = new Map<string, MatchedComponentImport[]>()
  for (const item of imports) {
    const entries = importsByLocal.get(item.localName) ?? []
    entries.push(item)
    importsByLocal.set(item.localName, entries)
  }

  const useBindings = apiImportBindings(parsed, "useThemedStyles", [
    "@opsydyn/crumbs-css/theme",
    "@opsydyn/crumbs-css/theme/core",
  ])
  const resolverBindings = apiImportBindings(parsed, "createComponentRecipeResolver", ["@opsydyn/crumbs-css/theme"])
  const memoBindings = apiImportBindings(parsed, "useMemo", ["react"])
  const extensionNames = new Set(apiLocalNames(parsed, "extendComponentRecipe"))
  const useNames = new Set(useBindings.map(binding => binding.localName))
  const resolverNames = new Set(resolverBindings.map(binding => binding.localName))
  const memoNames = new Set(memoBindings.map(binding => binding.localName))

  const calledHelperNames = new Set<string>()
  const collectCalledHelpers = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      calledHelperNames.add(node.expression.text)
    }
    ts.forEachChild(node, collectCalledHelpers)
  }
  collectCalledHelpers(parsed.sourceFile)
  for (const [bindings, label] of [
    [useBindings, "useThemedStyles"],
    [resolverBindings, "createComponentRecipeResolver"],
    [memoBindings, "useMemo"],
  ] as const) {
    const byLocal = new Map<string, ApiImportBinding[]>()
    for (const binding of bindings) {
      const entries = byLocal.get(binding.localName) ?? []
      entries.push(binding)
      byLocal.set(binding.localName, entries)
    }
    for (const [localName, entries] of byLocal) {
      if (!calledHelperNames.has(localName)) continue
      if (entries.length > 1) {
        addDiagnostic(parsed, entries[1]!.specifier, "source.ambiguous-binding",
          "A resolver-flow helper local name is imported more than once (" + label + ").",
          undefined, diagnostics, seen)
      }
      const shadow = findOtherBinding(parsed, localName, new Set(entries.map(entry => entry.specifier.name)))
      if (shadow !== undefined) {
        addDiagnostic(parsed, shadow, "source.ambiguous-binding",
          "A resolver-flow helper import is shadowed by another local binding.",
          undefined, diagnostics, seen)
      }
    }
  }

  const recipeProperties: ThemedRecipeProperty[] = []
  for (const [localName, matched] of importsByLocal) {
    const mappingIds = new Set(matched.map(item => item.mapping.from.id))
    if (mappingIds.size !== 1) continue
    const references: ts.Identifier[] = []
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node.text === localName && !isBindingDeclaration(node) && !isNonReferenceName(node)) {
        references.push(node)
      }
      ts.forEachChild(node, visit)
    }
    visit(parsed.sourceFile)

    const expectedImports = new Set(matched.map(item => item.specifier))
    const shadow = hasShadowedBinding(parsed, localName, expectedImports)
    if (shadow !== undefined) {
      addDiagnostic(parsed, shadow, "source.ambiguous-binding",
        "Mapped recipe import is shadowed by another local binding.",
        matched[0]!.mapping.from.id, diagnostics, seen)
    }

    for (const reference of references) {
      if (isExtensionBaseReference(reference, extensionNames)) continue
      const flow = directThemedProperty(reference, localName, useNames, declarations)
      if (flow === undefined) {
        addDiagnostic(parsed, reference, "component.resolver-unresolved",
          "Mapped recipe import must be a direct property value of an immutable useThemedStyles result.",
          matched[0]!.mapping.from.id, diagnostics, seen)
        continue
      }
      const declaration = declarations.find(candidate =>
        candidate.initializer !== undefined && unwrap(candidate.initializer) === flow.call)
      if (declaration === undefined || !isConstVariable(declaration) || !ts.isIdentifier(declaration.name)) {
        addDiagnostic(parsed, flow.propertyNode, "source.unsupported-syntax",
          "useThemedStyles resolver flows require a const identifier result.",
          matched[0]!.mapping.from.id, diagnostics, seen)
        continue
      }
      const holder = declaration.name.text
      const holderShadow = findOtherBinding(parsed, holder, new Set([declaration.name]))
      if (holderShadow !== undefined) {
        addDiagnostic(parsed, holderShadow, "source.ambiguous-binding",
          "The useThemedStyles result binding is shadowed.",
          matched[0]!.mapping.from.id, diagnostics, seen)
      }
      const holderWrite = hasWriteToLocal(parsed, holder)
      if (holderWrite !== undefined) {
        addDiagnostic(parsed, holderWrite, "source.unsupported-syntax",
          "The useThemedStyles result binding is reassigned or mutated.",
          matched[0]!.mapping.from.id, diagnostics, seen)
      }
      recipeProperties.push({
        mapping: matched[0]!.mapping,
        holder,
        property: flow.property,
        declaration,
        propertyNode: flow.propertyNode,
      })
    }
  }

  const propertiesByKey = new Map<string, ThemedRecipeProperty[]>()
  for (const property of recipeProperties) {
    const key = property.holder + "\u0000" + property.property
    const entries = propertiesByKey.get(key) ?? []
    entries.push(property)
    propertiesByKey.set(key, entries)
  }
  for (const properties of propertiesByKey.values()) {
    const mappingIds = new Set(properties.map(property => property.mapping.from.id))
    if (mappingIds.size > 1) {
      addDiagnostic(parsed, properties[0]!.propertyNode, "source.ambiguous-binding",
        "One themed recipe property resolves to multiple baseline component IDs.",
        properties[0]!.mapping.from.id, diagnostics, seen)
    }
  }

  const mappedPropertyKeys = new Set(propertiesByKey.keys())
  const resolverVariables: Array<{
    readonly mapping: ValidatedComponentMigration
    readonly localName: string
    readonly declaration: ts.VariableDeclaration
  }> = []
  for (const declaration of declarations) {
    if (declaration.initializer === undefined) continue
    const creation = resolverCreation(declaration.initializer, resolverNames, memoNames)
    if (creation === undefined) continue
    const key = creation.holder + "\u0000" + creation.property
    const properties = propertiesByKey.get(key)
    if (properties === undefined) continue
    const mappingIds = new Set(properties.map(property => property.mapping.from.id))
    if (mappingIds.size !== 1) continue
    mappedPropertyKeys.delete(key)
    if (!isConstVariable(declaration) || !ts.isIdentifier(declaration.name)) {
      addDiagnostic(parsed, declaration, "source.unsupported-syntax",
        "Recipe resolver values must be stored in a const identifier binding.",
        properties[0]!.mapping.from.id, diagnostics, seen)
      continue
    }
    const localName = declaration.name.text
    const shadow = findOtherBinding(parsed, localName, new Set([declaration.name]))
    if (shadow !== undefined) {
      addDiagnostic(parsed, shadow, "source.ambiguous-binding",
        "Recipe resolver binding is shadowed.", properties[0]!.mapping.from.id, diagnostics, seen)
    }
    const write = hasWriteToLocal(parsed, localName)
    if (write !== undefined) {
      addDiagnostic(parsed, write, "source.unsupported-syntax",
        "Recipe resolver binding is reassigned or mutated.", properties[0]!.mapping.from.id, diagnostics, seen)
    }
    resolverVariables.push({ mapping: properties[0]!.mapping, localName, declaration })
  }

  for (const key of mappedPropertyKeys) {
    const properties = propertiesByKey.get(key)!
    addDiagnostic(parsed, properties[0]!.propertyNode, "component.resolver-unresolved",
      "Mapped themed recipe property is not passed directly to a component recipe resolver.",
      properties[0]!.mapping.from.id, diagnostics, seen)
  }

  const resultsByLocal = new Map<string, Array<{
    readonly mapping: ValidatedComponentMigration
    readonly declaration: ts.VariableDeclaration
  }>>()
  for (const resolver of resolverVariables) {
    const references: ts.Identifier[] = []
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node.text === resolver.localName &&
        !isBindingDeclaration(node) && !isNonReferenceName(node)) references.push(node)
      ts.forEachChild(node, visit)
    }
    visit(parsed.sourceFile)
    for (const reference of references) {
      const parent = reference.parent
      if (!ts.isCallExpression(parent) || parent.expression !== reference) {
        addDiagnostic(parsed, reference, "source.unsupported-syntax",
          "Recipe resolver bindings may only be invoked directly for static result analysis.",
          resolver.mapping.from.id, diagnostics, seen)
        continue
      }
      const resultDeclaration = declarations.find(candidate =>
        candidate.initializer !== undefined && unwrap(candidate.initializer) === parent)
      if (resultDeclaration === undefined) {
        addDiagnostic(parsed, parent, "source.unsupported-syntax",
          "Resolver calls must initialize a local const result binding.",
          resolver.mapping.from.id, diagnostics, seen)
        continue
      }
      if (!isConstVariable(resultDeclaration) || !ts.isIdentifier(resultDeclaration.name) || parent.arguments.length > 1) {
        addDiagnostic(parsed, resultDeclaration, "source.unsupported-syntax",
          "Resolver results must use a const identifier and at most one selection argument.",
          resolver.mapping.from.id, diagnostics, seen)
        continue
      }
      const resultLocal = resultDeclaration.name.text
      const resultShadow = findOtherBinding(parsed, resultLocal, new Set([resultDeclaration.name]))
      if (resultShadow !== undefined) {
        addDiagnostic(parsed, resultShadow, "source.ambiguous-binding",
          "Resolver result binding is shadowed.", resolver.mapping.from.id, diagnostics, seen)
      }
      const resultWrite = hasWriteToLocal(parsed, resultLocal)
      if (resultWrite !== undefined) {
        addDiagnostic(parsed, resultWrite, "source.unsupported-syntax",
          "Resolver result binding is reassigned or mutated.", resolver.mapping.from.id, diagnostics, seen)
      }
      const entries = resultsByLocal.get(resultLocal) ?? []
      entries.push({ mapping: resolver.mapping, declaration: resultDeclaration })
      resultsByLocal.set(resultLocal, entries)
    }
  }

  for (const [resultLocal, results] of resultsByLocal) {
    const mappingIds = new Set(results.map(result => result.mapping.from.id))
    if (mappingIds.size !== 1) {
      addDiagnostic(parsed, results[0]!.declaration, "source.ambiguous-binding",
        "One resolver result binding is associated with multiple baseline component IDs.",
        results[0]!.mapping.from.id, diagnostics, seen)
      continue
    }
    const mapping = results[0]!.mapping
    const references: ts.Identifier[] = []
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node.text === resultLocal &&
        !isBindingDeclaration(node) && !isNonReferenceName(node)) references.push(node)
      ts.forEachChild(node, visit)
    }
    visit(parsed.sourceFile)

    for (const reference of references) {
      const parent = reference.parent
      if (ts.isPropertyAccessExpression(parent) && parent.expression === reference &&
        parent.questionDotToken === undefined) {
        const replacement = mapping.mapping.slots[parent.name.text]
        if (replacement === undefined) {
          addDiagnostic(parsed, parent, "component.resolver-unresolved",
            "Static resolver result member is not present in the migration slot map.",
            mapping.from.id, diagnostics, seen)
        } else if (replacement !== parent.name.text) {
          edits.push(makeEdit(parent.name.getStart(parsed.sourceFile), parent.name.end, replacement))
        }
      } else {
        addDiagnostic(parsed, reference, "source.unsupported-syntax",
          "Resolver results may only be read through static result.slot member access.",
          mapping.from.id, diagnostics, seen)
      }
    }
  }

  diagnostics.sort((left, right) => compareOrdinal(left.path ?? "", right.path ?? "") ||
    (left.line ?? 0) - (right.line ?? 0) || (left.column ?? 0) - (right.column ?? 0) ||
    compareOrdinal(left.code, right.code) || compareOrdinal(left.entityId ?? "", right.entityId ?? ""))
  return diagnostics.length === 0 ? { edits, diagnostics } : { edits: [], diagnostics }
}
