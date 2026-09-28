import * as ts from "typescript"
import type { ManifestToken } from "../manifest/model"
import type { SourceMigrationDiagnostic } from "./model"
import {
  migrationDiagnosticAt,
  type ParsedMigrationSource,
  type SourceEdit,
  type SourceEditResult,
} from "./ast"
import type { ValidatedSourceMigration, ValidatedTokenMigration } from "./validate"

const editCode = "source.unsupported-syntax" as const

type ImportGroup = {
  readonly moduleSpecifier: string
  readonly importedName: string
  readonly mappings: ReadonlyArray<ValidatedTokenMigration>
  readonly fromContractKey: string
  readonly toContractKey: string
}

type StaticAccess = {
  readonly root: ts.Identifier
  readonly segments: ReadonlyArray<string>
  readonly nodes: ReadonlyArray<ts.PropertyAccessExpression>
  readonly optional: boolean
}

type MatchedImport = {
  readonly declaration: ts.ImportDeclaration
  readonly specifier: ts.ImportSpecifier
  readonly group: ImportGroup
  readonly localName: string
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function bindingKey(binding: { readonly moduleSpecifier: string; readonly importedName: string }): string {
  return `${binding.moduleSpecifier}\u0000${binding.importedName}`
}

function contractKey(token: ManifestToken): string {
  return `${token.contract.owner}\u0000${token.contract.name}\u0000${token.contract.version}`
}

function pathKey(path: ReadonlyArray<string>): string {
  return JSON.stringify(path)
}

function sameDomain(left: ManifestToken["domain"], right: ManifestToken["domain"]): boolean {
  if (left.kind !== right.kind) return false
  switch (left.kind) {
    case "color":
    case "duration":
    case "opacity":
      return true
    case "length":
      return right.kind === "length" && left.allowNegative === right.allowNegative
    case "enum":
      return right.kind === "enum" &&
        JSON.stringify([...left.values].sort(compareOrdinal)) === JSON.stringify([...right.values].sort(compareOrdinal))
  }
}

function importGroups(validated: ValidatedSourceMigration): ReadonlyMap<string, ImportGroup> {
  const grouped = new Map<string, ValidatedTokenMigration[]>()
  for (const mapping of validated.tokens) {
    const key = bindingKey(mapping.mapping.fromImport)
    const items = grouped.get(key) ?? []
    items.push(mapping)
    grouped.set(key, items)
  }
  return new Map([...grouped].map(([key, mappings]) => [key, {
    moduleSpecifier: mappings[0]!.mapping.fromImport.moduleSpecifier,
    importedName: mappings[0]!.mapping.fromImport.importedName,
    mappings,
    fromContractKey: contractKey(mappings[0]!.from),
    toContractKey: contractKey(mappings[0]!.to),
  }]))
}

function flattenAccess(expression: ts.Expression): StaticAccess | undefined {
  if (ts.isIdentifier(expression)) return { root: expression, segments: [], nodes: [], optional: false }
  if (!ts.isPropertyAccessExpression(expression)) return undefined
  const inner = flattenAccess(expression.expression)
  if (inner === undefined) return undefined
  return {
    root: inner.root,
    segments: [...inner.segments, expression.name.text],
    nodes: [...inner.nodes, expression],
    optional: inner.optional || expression.questionDotToken !== undefined,
  }
}

function isAccessContinuation(node: ts.Node): boolean {
  const parent = node.parent
  return (ts.isPropertyAccessExpression(parent) && parent.expression === node) ||
    (ts.isElementAccessExpression(parent) && parent.expression === node)
}

function bindingIdentifiers(name: ts.BindingName): ReadonlyArray<ts.Identifier> {
  if (ts.isIdentifier(name)) return [name]
  const identifiers: ts.Identifier[] = []
  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) continue
    identifiers.push(...bindingIdentifiers(element.name))
  }
  return identifiers
}

function isBindingDeclaration(identifier: ts.Identifier): boolean {
  const parent = identifier.parent
  if (ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent)) {
    return bindingIdentifiers(parent.name).includes(identifier)
  }
  if (ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) ||
    ts.isClassDeclaration(parent) || ts.isClassExpression(parent) ||
    ts.isEnumDeclaration(parent) || ts.isInterfaceDeclaration(parent) ||
    ts.isTypeAliasDeclaration(parent) || ts.isTypeParameterDeclaration(parent) ||
    ts.isModuleDeclaration(parent)) return parent.name === identifier
  if (ts.isCatchClause(parent)) return parent.variableDeclaration !== undefined && bindingIdentifiers(parent.variableDeclaration.name).includes(identifier)
  if (ts.isImportClause(parent) || ts.isImportSpecifier(parent) || ts.isNamespaceImport(parent) || ts.isImportEqualsDeclaration(parent)) {
    return parent.name === identifier
  }
  return false
}

function isNonReferenceName(identifier: ts.Identifier): boolean {
  const parent = identifier.parent
  if (isBindingDeclaration(identifier)) return true
  if ((ts.isPropertyAccessExpression(parent) && parent.name === identifier) ||
    (ts.isQualifiedName(parent) && parent.right === identifier) ||
    (ts.isPropertyAssignment(parent) && parent.name === identifier) ||
    (ts.isMethodDeclaration(parent) && parent.name === identifier) ||
    (ts.isPropertyDeclaration(parent) && parent.name === identifier) ||
    (ts.isMethodSignature(parent) && parent.name === identifier) ||
    (ts.isPropertySignature(parent) && parent.name === identifier) ||
    (ts.isImportSpecifier(parent) && parent.propertyName === identifier)) return true
  return false
}

function unwrapped(expression: ts.Expression): ts.Expression {
  let current = expression
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isTypeAssertionExpression(current) || ts.isSatisfiesExpression(current)) {
    current = current.expression
  }
  return current
}

function containsIdentifier(expression: ts.Expression, localName: string): boolean {
  let found = false
  const visit = (node: ts.Node): void => {
    if (found) return
    if (ts.isIdentifier(node) && node.text === localName && !isNonReferenceName(node)) {
      found = true
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(expression)
  return found
}

function isAssignmentOperatorKind(kind: ts.SyntaxKind): boolean {
  return kind === ts.SyntaxKind.EqualsToken ||
    (kind >= ts.SyntaxKind.FirstCompoundAssignment && kind <= ts.SyntaxKind.LastCompoundAssignment)
}

function assignmentTarget(expression: ts.Expression, localName: string): boolean {
  const target = unwrapped(expression)
  if (ts.isIdentifier(target)) return target.text === localName
  if (ts.isArrayLiteralExpression(target) || ts.isObjectLiteralExpression(target)) return containsIdentifier(target, localName)
  return false
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

function escapedStringLiteral(value: string, quote: string): string {
  const escaped = value.replaceAll("\\", "\\\\").replaceAll(quote, `\\${quote}`)
  return `${quote}${escaped}${quote}`
}

function planImportEdits(
  parsed: ParsedMigrationSource,
  imports: ReadonlyArray<MatchedImport>,
  edits: SourceEdit[],
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  const byDeclaration = new Map<ts.ImportDeclaration, MatchedImport[]>()
  for (const matched of imports) {
    const entries = byDeclaration.get(matched.declaration) ?? []
    entries.push(matched)
    byDeclaration.set(matched.declaration, entries)
  }

  for (const [declaration, entries] of byDeclaration) {
    const targets = new Set(entries.map(entry => entry.group.mappings[0]!.mapping.toImport.moduleSpecifier))
    if (targets.size !== 1) {
      addDiagnostic(parsed, declaration, "source.ambiguous-binding", "One import declaration maps to multiple target token modules.", undefined, diagnostics, seen)
      continue
    }
    const targetModule = [...targets][0]!
    const moduleSpecifier = declaration.moduleSpecifier
    if (!ts.isStringLiteral(moduleSpecifier)) {
      addDiagnostic(parsed, declaration, "source.unsupported-syntax", "Mapped token imports require a static string module specifier.", undefined, diagnostics, seen)
      continue
    }
    if (targetModule !== moduleSpecifier.text) {
      const start = moduleSpecifier.getStart(parsed.sourceFile)
      const quote = parsed.source.slice(start, start + 1)
      edits.push(makeEdit(start, moduleSpecifier.end, escapedStringLiteral(targetModule, quote)))
    }
    for (const { specifier, group, localName } of entries) {
      const targetName = group.mappings[0]!.mapping.toImport.importedName
      const importedName = specifier.propertyName?.text ?? specifier.name.text
      if (targetName === importedName) continue
      if (specifier.propertyName !== undefined) {
        edits.push(makeEdit(
          specifier.propertyName.getStart(parsed.sourceFile),
          specifier.propertyName.end,
          targetName,
        ))
      } else if (targetName !== localName) {
        edits.push(makeEdit(
          specifier.name.getStart(parsed.sourceFile),
          specifier.name.end,
          `${targetName} as ${localName}`,
        ))
      }
    }
  }
}

function addTokenPathEdits(
  parsed: ParsedMigrationSource,
  access: StaticAccess,
  oldPath: ReadonlyArray<string>,
  newPath: ReadonlyArray<string>,
  entityId: string,
  edits: SourceEdit[],
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  let shared = 0
  while (shared < oldPath.length && shared < newPath.length && oldPath[shared] === newPath[shared]) shared += 1
  if (shared === oldPath.length && shared === newPath.length) return
  if (oldPath.length === newPath.length) {
    for (let index = shared; index < newPath.length; index += 1) {
      const name = access.nodes[index]?.name
      if (name === undefined) {
        addDiagnostic(parsed, access.nodes.at(-1), "source.unsupported-syntax", "Static token path could not be mapped to source spans.", entityId, diagnostics, seen)
        return
      }
      edits.push(makeEdit(name.getStart(parsed.sourceFile), name.end, newPath[index]!))
    }
    return
  }

  const start = shared === 0 ? access.root.end : access.nodes[shared - 1]!.end
  const end = access.nodes.at(-1)!.end
  let previousEnd = start
  for (let index = shared; index < oldPath.length; index += 1) {
    const name = access.nodes[index]!.name
    if (parsed.source.slice(previousEnd, name.getStart(parsed.sourceFile)) !== ".") {
      addDiagnostic(parsed, access.nodes.at(-1), "source.unsupported-syntax", "Token path segment edits cannot cross comments or nonstandard access trivia.", entityId, diagnostics, seen)
      return
    }
    previousEnd = name.end
  }
  if (start > end) {
    addDiagnostic(parsed, access.nodes.at(-1), "source.unsupported-syntax", "Static token path has an invalid source span.", entityId, diagnostics, seen)
    return
  }
  const suffix = newPath.slice(shared)
  edits.push(makeEdit(start, end, suffix.length === 0 ? "" : `.${suffix.join(".")}`))
}

function planBindingReferences(
  parsed: ParsedMigrationSource,
  matchedImports: ReadonlyArray<MatchedImport>,
  group: ImportGroup,
  validated: ValidatedSourceMigration,
  localName: string,
  edits: SourceEdit[],
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  const matchingSpecifiers = new Set(matchedImports.filter(item => item.localName === localName).map(item => item.specifier))
  let hasUse = false
  let shadow: ts.Identifier | undefined
  let reassignment: ts.Node | undefined

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && (ts.isObjectBindingPattern(node.name) || ts.isArrayBindingPattern(node.name)) &&
      node.initializer !== undefined && containsIdentifier(node.initializer, localName)) {
      hasUse = true
      addDiagnostic(parsed, node, "source.unsupported-syntax", "Destructured token references are not rewritten.", group.mappings[0]!.mapping.fromId, diagnostics, seen)
    }

    if (ts.isElementAccessExpression(node)) {
      const access = flattenAccess(node.expression)
      if (access?.root.text === localName) {
        hasUse = true
        addDiagnostic(parsed, node, "source.unsupported-syntax", "Computed token property access is not rewritten.", group.mappings[0]!.mapping.fromId, diagnostics, seen)
      }
    }

    if (ts.isBinaryExpression(node) && isAssignmentOperatorKind(node.operatorToken.kind) && assignmentTarget(node.left, localName)) {
      hasUse = true
      reassignment ??= node
    }
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)) {
      const operand = unwrapped(node.operand)
      if (!ts.isIdentifier(operand) || operand.text !== localName) {
        ts.forEachChild(node, visit)
        return
      }
      hasUse = true
      reassignment ??= node
    }

    if (ts.isPropertyAccessExpression(node)) {
      const access = flattenAccess(node)
      if (access?.root.text === localName) {
        hasUse = true
        if (!isAccessContinuation(node)) {
          if (access.optional) {
            addDiagnostic(parsed, node, "source.unsupported-syntax", "Optional token property access is not rewritten.", group.mappings[0]!.mapping.fromId, diagnostics, seen)
          } else if ((ts.isCallExpression(node.parent) && node.parent.expression === node) ||
            (ts.isTaggedTemplateExpression(node.parent) && node.parent.tag === node)) {
            addDiagnostic(parsed, node, "source.unsupported-syntax", "Called token property access is not rewritten.", group.mappings[0]!.mapping.fromId, diagnostics, seen)
          } else {
            planStaticTokenPath(parsed, access, group, validated, edits, diagnostics, seen)
          }
        }
      }
    }

    if (ts.isIdentifier(node) && node.text === localName) {
      if (isBindingDeclaration(node)) {
        if (!matchingSpecifiers.has(node.parent as ts.ImportSpecifier)) shadow ??= node
      } else if (!isNonReferenceName(node)) {
        hasUse = true
        const parent = node.parent
        if (!(ts.isPropertyAccessExpression(parent) && parent.expression === node) &&
          !(ts.isElementAccessExpression(parent) && parent.expression === node) &&
          !(ts.isElementAccessExpression(parent) && parent.argumentExpression === node)) {
          if (ts.isBinaryExpression(parent) && isAssignmentOperatorKind(parent.operatorToken.kind) && parent.left === node) {
            reassignment ??= parent
          } else if (!(ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent))) {
            addDiagnostic(parsed, node, "source.unsupported-syntax", "Token contract value is used outside a recognized static property path.", group.mappings[0]!.mapping.fromId, diagnostics, seen)
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed.sourceFile)

  if (hasUse && shadow !== undefined) {
    addDiagnostic(parsed, shadow, "source.ambiguous-binding", "Mapped token import is shadowed by another local binding.", group.mappings[0]!.mapping.fromId, diagnostics, seen)
  }
  if (reassignment !== undefined) {
    addDiagnostic(parsed, reassignment, "source.ambiguous-binding", "Mapped token import binding is reassigned.", group.mappings[0]!.mapping.fromId, diagnostics, seen)
  }
}

function planStaticTokenPath(
  parsed: ParsedMigrationSource,
  access: StaticAccess,
  group: ImportGroup,
  validated: ValidatedSourceMigration,
  edits: SourceEdit[],
  diagnostics: SourceMigrationDiagnostic[],
  seen: Set<string>,
): void {
  if (access.segments.length === 0) {
    addDiagnostic(parsed, access.root, "source.unsupported-syntax", "Bare token contract references are not rewritten.", group.mappings[0]!.mapping.fromId, diagnostics, seen)
    return
  }
  if (group.mappings.some(mapping => contractKey(mapping.from) !== group.fromContractKey || contractKey(mapping.to) !== group.toContractKey)) {
    addDiagnostic(parsed, access.nodes.at(-1), "source.ambiguous-binding", "One token import binding maps across multiple token contracts.", group.mappings[0]!.mapping.fromId, diagnostics, seen)
    return
  }
  const oldMatches = validated.baseline.tokens.filter(token => contractKey(token) === group.fromContractKey && samePath(token.path, access.segments))
  if (oldMatches.length === 0) {
    addDiagnostic(parsed, access.nodes.at(-1), "token.contract-path-unmapped", "Static path is not a token path in the baseline contract.", group.mappings[0]!.mapping.fromId, diagnostics, seen)
    return
  }
  if (oldMatches.length > 1) {
    addDiagnostic(parsed, access.nodes.at(-1), "source.ambiguous-binding", "Static path identifies multiple baseline tokens.", group.mappings[0]!.mapping.fromId, diagnostics, seen)
    return
  }
  const oldToken = oldMatches[0]!
  const mapping = group.mappings.find(candidate => candidate.from.id === oldToken.id)
  if (mapping !== undefined) {
    addTokenPathEdits(parsed, access, mapping.from.path, mapping.to.path, mapping.from.id, edits, diagnostics, seen)
    return
  }

  const currentMatches = validated.current.tokens.filter(token => contractKey(token) === group.toContractKey && samePath(token.path, access.segments))
  if (currentMatches.length !== 1 || !sameDomain(oldToken.domain, currentMatches[0]!.domain)) {
    addDiagnostic(parsed, access.nodes.at(-1), "token.contract-path-unmapped", "Unmapped baseline token path is absent or has a different domain in the current contract.", oldToken.id, diagnostics, seen)
  }
}

function samePath(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
  return left.length === right.length && left.every((segment, index) => segment === right[index])
}

/** Plan edits for mapped named token imports and prove unchanged paths against both explicit manifests. */
export function planTokenReferenceEdits(input: {
  readonly parsed: ParsedMigrationSource
  readonly validated: ValidatedSourceMigration
}): SourceEditResult {
  const { parsed, validated } = input
  if (parsed.diagnostics.length > 0) return { edits: [], diagnostics: [...parsed.diagnostics] }

  const groups = importGroups(validated)
  const matchedImports: MatchedImport[] = []
  const diagnostics: SourceMigrationDiagnostic[] = []
  const seenDiagnostics = new Set<string>()
  const edits: SourceEdit[] = []

  const visit = (node: ts.Node): void => {
    const namedBindings = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : undefined
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) &&
      node.importClause !== undefined && !node.importClause.isTypeOnly && namedBindings !== undefined && ts.isNamedImports(namedBindings)) {
      for (const specifier of namedBindings.elements) {
        if (specifier.isTypeOnly) continue
        const importedName = specifier.propertyName?.text ?? specifier.name.text
        const group = groups.get(bindingKey({ moduleSpecifier: node.moduleSpecifier.text, importedName }))
        if (group !== undefined) matchedImports.push({ declaration: node, specifier, group, localName: specifier.name.text })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed.sourceFile)

  const groupsByLocal = new Map<string, ImportGroup>()
  for (const matched of matchedImports) {
    const previous = groupsByLocal.get(matched.localName)
    if (previous !== undefined && previous !== matched.group) {
      addDiagnostic(parsed, matched.specifier, "source.ambiguous-binding", "A local token binding refers to multiple migration imports.", matched.group.mappings[0]!.mapping.fromId, diagnostics, seenDiagnostics)
    } else groupsByLocal.set(matched.localName, matched.group)
  }

  planImportEdits(parsed, matchedImports, edits, diagnostics, seenDiagnostics)

  for (const group of groups.values()) {
    const imported = matchedImports.filter(item => item.group === group)
    if (imported.length === 0) continue
    if (group.mappings.some(mapping => contractKey(mapping.from) !== group.fromContractKey || contractKey(mapping.to) !== group.toContractKey)) {
      addDiagnostic(parsed, imported[0]!.declaration, "source.ambiguous-binding", "One token import binding maps across multiple token contracts.", group.mappings[0]!.mapping.fromId, diagnostics, seenDiagnostics)
      continue
    }
    const localNames = new Set(imported.map(item => item.localName))
    if (localNames.size !== imported.length) {
      addDiagnostic(parsed, imported[0]!.declaration, "source.ambiguous-binding", "A mapped token import declares the same local binding more than once.", group.mappings[0]!.mapping.fromId, diagnostics, seenDiagnostics)
    }
    for (const localName of localNames) {
      planBindingReferences(parsed, imported, group, validated, localName, edits, diagnostics, seenDiagnostics)
    }
  }

  diagnostics.sort((left, right) => compareOrdinal(left.path ?? "", right.path ?? "") ||
    (left.line ?? 0) - (right.line ?? 0) || (left.column ?? 0) - (right.column ?? 0) || compareOrdinal(left.code, right.code))
  return diagnostics.length === 0 ? { edits, diagnostics } : { edits: [], diagnostics }
}
