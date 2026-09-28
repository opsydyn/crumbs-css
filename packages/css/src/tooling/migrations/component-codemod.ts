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

function apiLocalNames(parsed: ParsedMigrationSource, importedExport: "componentRecipe" | "extendComponentRecipe"): ReadonlyArray<string> {
  const names: string[] = []
  const visit = (node: ts.Node): void => {
    const namedBindings = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : undefined
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === STYLE_MODULE &&
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
      if (ts.isIdentifier(node) && node.text === localName && !isBindingDeclaration(node) && !isNonReferenceName(node) && !recognizedReferences.has(node)) {
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
