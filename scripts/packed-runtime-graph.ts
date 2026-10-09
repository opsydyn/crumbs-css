import ts from "typescript"
import { readFile, realpath, stat } from "node:fs/promises"
import { extname, isAbsolute, relative, resolve, sep } from "node:path"
import { compilerDependencies } from "../packages/css/build-policy"
import { collectPackedExportTargets, type PackedExportTarget } from "./packed-export-contract"

export type PackedRuntimeClassification =
  | "ordinary-runtime"
  | "advanced-runtime"
  | "compiler-tooling"
  | "metadata"

export type PackedRuntimeGraph = Readonly<{
  subpath: string
  classification: PackedRuntimeClassification
  format: "esm" | "cjs" | "metadata"
  entry: string
  files: ReadonlyArray<string>
  externalSpecifiers: ReadonlyArray<string>
  dynamicLoaderExceptions: ReadonlyArray<PackedDynamicLoaderException>
}>

type DynamicLoaderKind = "require" | "createRequire"

export type PackedDynamicLoaderException = Readonly<{
  callee: DynamicLoaderKind
  specifier: string
  rationale: string
}>

const exportClasses: Readonly<Record<string, PackedRuntimeClassification>> = {
  ".": "compiler-tooling",
  "./theme": "ordinary-runtime",
  "./theme/core": "ordinary-runtime",
  "./theme/token": "ordinary-runtime",
  "./theme/vars": "ordinary-runtime",
  "./theme/containers": "ordinary-runtime",
  "./theme/motion": "ordinary-runtime",
  "./theme/motion/native": "ordinary-runtime",
  "./theme/conditions": "ordinary-runtime",
  "./theme/expressions": "ordinary-runtime",
  "./theme/recipes": "ordinary-runtime",
  "./theme/sprinkles": "ordinary-runtime",
  "./dist/theme": "ordinary-runtime",
  "./tokens": "ordinary-runtime",
  "./tokens/schema": "advanced-runtime",
  "./tokens/schema/value": "advanced-runtime",
  "./tokens/optic": "advanced-runtime",
  "./devtools": "advanced-runtime",
  "./style": "compiler-tooling",
  "./tooling/manifest": "compiler-tooling",
  "./tooling/policy": "compiler-tooling",
  "./tooling/migrations": "compiler-tooling",
  "./tooling/dtcg": "compiler-tooling",
  "./tooling/ownership": "compiler-tooling",
  "./metro-plugin": "compiler-tooling",
  "./dist/transformer": "compiler-tooling",
  "./dist/metro-plugin": "compiler-tooling",
  "./package.json": "metadata",
}

const dynamicLoaderAllowlist: ReadonlyArray<Readonly<{
  subpath: string
  format: "esm" | "cjs"
  importer: string | RegExp
  callee: ReadonlyArray<DynamicLoaderKind>
  specifier: string
  sourceProperty?: string
  rationale: string
}>> = [
  {
    subpath: "./dist/transformer",
    format: "esm",
    importer: /^dist\/transformer(?:-[A-Za-z0-9_-]+)?\.mjs$/u,
    callee: ["createRequire"],
    specifier: "upstreamPath",
    sourceProperty: "upstreamTransformerPath",
    rationale: "Metro supplies its configured upstream transformer path at runtime so Crumbs can delegate Expo's selected transform worker.",
  },
  {
    subpath: "./dist/transformer",
    format: "cjs",
    importer: /^dist\/transformer(?:-[A-Za-z0-9_-]+)?\.cjs$/u,
    callee: ["require"],
    specifier: "upstreamPath",
    sourceProperty: "upstreamTransformerPath",
    rationale: "Metro supplies its configured upstream transformer path at runtime so Crumbs can delegate Expo's selected transform worker.",
  },
  {
    subpath: "./tooling/manifest",
    format: "esm",
    importer: /^dist\/transformer-[A-Za-z0-9_-]+\.mjs$/u,
    callee: ["createRequire"],
    specifier: "upstreamPath",
    sourceProperty: "upstreamTransformerPath",
    rationale: "Metro supplies its configured upstream transformer path at runtime so Crumbs can delegate Expo's selected transform worker.",
  },
  {
    subpath: "./tooling/manifest",
    format: "cjs",
    importer: /^dist\/transformer-[A-Za-z0-9_-]+\.cjs$/u,
    callee: ["require"],
    specifier: "upstreamPath",
    sourceProperty: "upstreamTransformerPath",
    rationale: "Metro supplies its configured upstream transformer path at runtime so Crumbs can delegate Expo's selected transform worker.",
  },
]

function isFunctionScope(node: ts.Node): boolean {
  return ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isGetAccessor(node) || ts.isSetAccessor(node)
}

function enclosingFunction(node: ts.Node): ts.Node | undefined {
  let current = node.parent
  while (current !== undefined) {
    if (isFunctionScope(current)) return current
    current = current.parent
  }
  return undefined
}

function skipParentheses(node: ts.Node): ts.Node {
  let current = node
  while (ts.isParenthesizedExpression(current)) current = current.expression
  return current
}

type RuntimeBindingAnalysis = Readonly<{
  sourceFile: ts.SourceFile
  checker: ts.TypeChecker
}>

function createRuntimeBindingAnalysis(filename: string, source: string): RuntimeBindingAnalysis | undefined {
  const options: ts.CompilerOptions = {
    allowJs: true,
    checkJs: false,
    module: ts.ModuleKind.ESNext,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  const originalGetSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (resolve(fileName) === resolve(filename)) {
      return ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.JS)
    }
    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  }

  const program = ts.createProgram([filename], options, host)
  const sourceFile = program.getSourceFile(filename)
  return sourceFile === undefined ? undefined : {sourceFile, checker: program.getTypeChecker()}
}

function findEquivalentNode(sourceFile: ts.SourceFile, target: ts.Node): ts.Node | undefined {
  let match: ts.Node | undefined
  function walk(node: ts.Node): void {
    if (node.kind === target.kind && node.pos === target.pos && node.end === target.end) {
      match = node
      return
    }
    if (node.pos <= target.pos && node.end >= target.end) ts.forEachChild(node, walk)
  }
  walk(sourceFile)
  return match
}

function isBindingAssignmentTarget(target: ts.Node, identifier: ts.Identifier): boolean {
  const expression = skipParentheses(target)
  if (expression === identifier) return true
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.some((element) =>
      isBindingAssignmentTarget(ts.isSpreadElement(element) ? element.expression : element, identifier))
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.some((property) => {
      if (ts.isShorthandPropertyAssignment(property)) return property.name === identifier
      if (ts.isPropertyAssignment(property)) return isBindingAssignmentTarget(property.initializer, identifier)
      if (ts.isSpreadAssignment(property)) return isBindingAssignmentTarget(property.expression, identifier)
      return false
    })
  }
  return false
}

function isWriteReference(identifier: ts.Identifier): boolean {
  let current: ts.Node = identifier
  while (current.parent !== undefined) {
    const parent = current.parent
    if (ts.isBinaryExpression(parent) &&
      parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      isBindingAssignmentTarget(parent.left, identifier)) return true
    if ((ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) &&
      (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken) &&
      skipParentheses(parent.operand) === identifier) return true
    if ((ts.isForInStatement(parent) || ts.isForOfStatement(parent)) &&
      isBindingAssignmentTarget(parent.initializer, identifier)) return true
    current = parent
  }
  return false
}

function symbolHasWrites(analysis: RuntimeBindingAnalysis, symbol: ts.Symbol): boolean {
  let reassigned = false
  function walk(node: ts.Node): void {
    if (ts.isIdentifier(node) && symbolAtIdentifier(analysis.checker, node) === symbol && isWriteReference(node)) {
      reassigned = true
      return
    }
    if (!reassigned) ts.forEachChild(node, walk)
  }
  walk(analysis.sourceFile)
  return reassigned
}

function variableBindingScope(declaration: ts.VariableDeclaration): ts.Node {
  let current: ts.Node | undefined = declaration.parent
  const blockScoped = ts.isVariableDeclarationList(declaration.parent) &&
    (declaration.parent.flags & ts.NodeFlags.BlockScoped) !== 0
  while (current !== undefined) {
    if (ts.isSourceFile(current)) return current
    if (blockScoped && (ts.isBlock(current) || ts.isModuleBlock(current) || ts.isCaseBlock(current))) return current
    if (blockScoped && (ts.isForStatement(current) || ts.isForInStatement(current) || ts.isForOfStatement(current))) return current
    if (!blockScoped && isFunctionScope(current)) return current
    current = current.parent
  }
  return declaration.getSourceFile()
}

function hasAmbiguousVariableBinding(analysis: RuntimeBindingAnalysis, declaration: ts.VariableDeclaration): boolean {
  if (!ts.isIdentifier(declaration.name)) return true
  const bindingName = declaration.name.text
  const scope = variableBindingScope(declaration)
  let ambiguous = false
  function walk(node: ts.Node): void {
    if (node !== declaration && ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) &&
      node.name.text === bindingName && variableBindingScope(node) === scope) {
      ambiguous = true
      return
    }
    if (!ambiguous) ts.forEachChild(node, walk)
  }
  walk(analysis.sourceFile)
  return ambiguous
}

function parametersOf(scope: ts.Node): ReadonlyArray<ts.ParameterDeclaration> | undefined {
  if (ts.isFunctionDeclaration(scope) || ts.isFunctionExpression(scope) || ts.isArrowFunction(scope) ||
    ts.isMethodDeclaration(scope) || ts.isConstructorDeclaration(scope) || ts.isGetAccessor(scope) || ts.isSetAccessor(scope)) {
    return scope.parameters
  }
  return undefined
}

function symbolAtIdentifier(checker: ts.TypeChecker, identifier: ts.Identifier): ts.Symbol | undefined {
  if (ts.isShorthandPropertyAssignment(identifier.parent) && identifier.parent.name === identifier) {
    return checker.getShorthandAssignmentValueSymbol(identifier.parent)
  }
  return checker.getSymbolAtLocation(identifier)
}

function isNodeCreateRequireImport(analysis: RuntimeBindingAnalysis, identifier: ts.Identifier): boolean {
  const symbol = analysis.checker.getSymbolAtLocation(identifier)
  for (const declaration of symbol?.declarations ?? []) {
    if (!ts.isImportSpecifier(declaration)) continue
    const bindings = declaration.parent
    const clause = bindings.parent
    const importDeclaration = clause.parent
    if (ts.isNamedImports(bindings) && ts.isImportClause(clause) && ts.isImportDeclaration(importDeclaration) &&
      ts.isStringLiteralLike(importDeclaration.moduleSpecifier) && importDeclaration.moduleSpecifier.text === "node:module" &&
      (declaration.propertyName?.text ?? declaration.name.text) === "createRequire") return true
  }
  return false
}

function isCreateRequireBinding(analysis: RuntimeBindingAnalysis, expression: ts.Expression): ts.Symbol | undefined {
  if (!ts.isIdentifier(expression)) return undefined
  const symbol = analysis.checker.getSymbolAtLocation(expression)
  if (symbol?.declarations?.length !== 1) return undefined
  const declaration = symbol.declarations[0]
  if (declaration === undefined || !ts.isVariableDeclaration(declaration) || declaration.initializer === undefined) return undefined
  const initializer = skipParentheses(declaration.initializer)
  if (!ts.isCallExpression(initializer) || !ts.isIdentifier(initializer.expression) ||
    !isNodeCreateRequireImport(analysis, initializer.expression)) return undefined
  return symbol
}

function isCreateRequireLoader(analysis: RuntimeBindingAnalysis, expression: ts.Expression): boolean {
  const symbol = isCreateRequireBinding(analysis, expression)
  return symbol !== undefined && !symbolHasWrites(analysis, symbol)
}

function isUnshadowedNodeRequire(analysis: RuntimeBindingAnalysis, expression: ts.Expression): boolean {
  if (!ts.isIdentifier(expression) || expression.text !== "require") return false
  const equivalent = findEquivalentNode(analysis.sourceFile, expression)
  if (equivalent === undefined || !ts.isIdentifier(equivalent)) return false
  const symbol = analysis.checker.getSymbolAtLocation(equivalent)
  return symbol === undefined || symbol.declarations === undefined || symbol.declarations.length === 0
}

function functionScopeSymbol(checker: ts.TypeChecker, scope: ts.Node): ts.Symbol | undefined {
  if ((ts.isFunctionDeclaration(scope) || ts.isFunctionExpression(scope) || ts.isMethodDeclaration(scope)) &&
    scope.name !== undefined && ts.isIdentifier(scope.name)) {
    return checker.getSymbolAtLocation(scope.name)
  }
  const parent = scope.parent
  if ((ts.isArrowFunction(scope) || ts.isFunctionExpression(scope)) && ts.isVariableDeclaration(parent) &&
    ts.isIdentifier(parent.name)) {
    return checker.getSymbolAtLocation(parent.name)
  }
  if ((ts.isArrowFunction(scope) || ts.isFunctionExpression(scope)) && ts.isPropertyAssignment(parent)) {
    return checker.getSymbolAtLocation(parent.name)
  }
  if ((ts.isArrowFunction(scope) || ts.isFunctionExpression(scope)) && ts.isBinaryExpression(parent) &&
    parent.right === scope && ts.isPropertyAccessExpression(parent.left)) {
    return checker.getSymbolAtLocation(parent.left.name)
  }
  return undefined
}

function propertyNameText(name: ts.PropertyName | undefined): string | undefined {
  if (name === undefined) return undefined
  return ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name) ? name.text : undefined
}

function getCjsExportGetterReturnSymbol(
  analysis: RuntimeBindingAnalysis,
  declaration: ts.CallExpression,
  exportName: string,
): ts.Symbol | undefined {
  const callee = declaration.expression
  const receiver = declaration.arguments[0]
  const exportedName = declaration.arguments[1]
  if (receiver === undefined || exportedName === undefined ||
    !ts.isPropertyAccessExpression(callee) || callee.name.text !== "defineProperty" ||
    !ts.isIdentifier(callee.expression) || callee.expression.text !== "Object" ||
    !isCjsExportsReceiver(receiver) || !ts.isStringLiteralLike(exportedName) || exportedName.text !== exportName) return undefined
  const descriptor = declaration.arguments[2]
  if (descriptor === undefined || !ts.isObjectLiteralExpression(descriptor)) return undefined
  const getter = descriptor.properties.find((property) =>
    ts.isPropertyAssignment(property) && propertyNameText(property.name) === "get")
  if (!getter || !ts.isPropertyAssignment(getter)) return undefined
  const initializer = getter.initializer
  if (!ts.isFunctionExpression(initializer) && !ts.isArrowFunction(initializer)) return undefined
  const body = initializer.body
  if (!ts.isBlock(body)) {
    return ts.isIdentifier(body) ? symbolAtIdentifier(analysis.checker, body) : undefined
  }
  let returnIdentifier: ts.Identifier | undefined
  let returnCount = 0
  let ambiguousReturn = false
  function walk(node: ts.Node): void {
    if (node !== body && isFunctionScope(node)) return
    if (ts.isReturnStatement(node)) {
      returnCount += 1
      if (node.parent !== body || node.expression === undefined || !ts.isIdentifier(node.expression)) {
        ambiguousReturn = true
      } else {
        returnIdentifier = node.expression
      }
      return
    }
    ts.forEachChild(node, walk)
  }
  walk(body)
  if (ambiguousReturn || returnCount !== 1 || returnIdentifier === undefined) return undefined
  return symbolAtIdentifier(analysis.checker, returnIdentifier)
}

function isCjsExportsReceiver(receiver: ts.Expression | undefined): boolean {
  if (receiver === undefined) return false
  if (ts.isIdentifier(receiver) && receiver.text === "exports") return true
  return ts.isPropertyAccessExpression(receiver) && receiver.name.text === "exports" &&
    ts.isIdentifier(receiver.expression) && receiver.expression.text === "module"
}

function exportedFunctionSymbol(analysis: RuntimeBindingAnalysis, exportName: string): ts.Symbol | undefined {
  const moduleSymbol = analysis.checker.getSymbolAtLocation(analysis.sourceFile)
  if (moduleSymbol === undefined) return undefined
  const exported = analysis.checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.name === exportName)
  if (exported === undefined) return undefined
  if ((exported.flags & ts.SymbolFlags.Alias) !== 0) {
    const aliased = analysis.checker.getAliasedSymbol(exported)
    if (aliased.declarations?.some(isFunctionScope)) return aliased
  }
  for (const declaration of exported.declarations ?? []) {
    if (ts.isFunctionDeclaration(declaration) && declaration.name !== undefined) {
      return analysis.checker.getSymbolAtLocation(declaration.name)
    }
    if (ts.isBinaryExpression(declaration) && ts.isIdentifier(declaration.right)) {
      return symbolAtIdentifier(analysis.checker, declaration.right)
    }
    if (ts.isCallExpression(declaration)) {
      const getterSymbol = getCjsExportGetterReturnSymbol(analysis, declaration, exportName)
      if (getterSymbol !== undefined) return getterSymbol
    }
  }
  return undefined
}

function isApprovedMetroTransformScope(
  analysis: RuntimeBindingAnalysis,
  scope: ts.Node,
  exportedTransformName: string | undefined,
): boolean {
  if (exportedTransformName === undefined) return false
  const scopeSymbol = functionScopeSymbol(analysis.checker, scope)
  return scopeSymbol !== undefined && scopeSymbol === exportedFunctionSymbol(analysis, exportedTransformName)
}

function isIdentifierInitializedFromProperty(
  analysis: RuntimeBindingAnalysis,
  call: ts.CallExpression,
  property: string,
  exportedTransformName: string | undefined,
): boolean {
  const equivalentCall = findEquivalentNode(analysis.sourceFile, call)
  if (equivalentCall === undefined || !ts.isCallExpression(equivalentCall)) return false
  const specifier = equivalentCall.arguments[0]
  if (specifier === undefined) return false
  const identifier = skipParentheses(specifier)
  if (!ts.isIdentifier(identifier)) return false
  const symbol = symbolAtIdentifier(analysis.checker, identifier)
  if (symbol === undefined || symbol.declarations?.length !== 1) return false
  const declaration = symbol.declarations[0]
  if (declaration === undefined || !ts.isVariableDeclaration(declaration) || declaration.initializer === undefined) return false
  const initializer = skipParentheses(declaration.initializer)
  if (!ts.isPropertyAccessExpression(initializer) || initializer.name.text !== property) return false
  const scope = enclosingFunction(equivalentCall)
  if (scope === undefined || !isApprovedMetroTransformScope(analysis, scope, exportedTransformName)) return false
  const firstParameter = scope === undefined ? undefined : parametersOf(scope)?.[0]
  if (firstParameter === undefined || !ts.isIdentifier(firstParameter.name)) return false
  const receiver = skipParentheses(initializer.expression)
  if (!ts.isIdentifier(receiver) ||
    analysis.checker.getSymbolAtLocation(receiver) !== analysis.checker.getSymbolAtLocation(firstParameter.name)) return false

  const parameterSymbol = symbolAtIdentifier(analysis.checker, firstParameter.name)
  if (parameterSymbol === undefined) return false
  let reassigned = false
  let parameterReassigned = false
  function walk(node: ts.Node): void {
    if (!reassigned && ts.isIdentifier(node) && symbolAtIdentifier(analysis.checker, node) === symbol && isWriteReference(node)) {
      reassigned = true
      return
    }
    if (!parameterReassigned && ts.isIdentifier(node) && symbolAtIdentifier(analysis.checker, node) === parameterSymbol && isWriteReference(node)) {
      parameterReassigned = true
      return
    }
    if (!reassigned && !parameterReassigned) ts.forEachChild(node, walk)
  }
  walk(scope)
  return !reassigned && !parameterReassigned
}

/** Traverse every packed ESM and CommonJS export and enforce its dependency class. */
export async function auditPackedRuntimeEntrypoints(
  packageRoot: string,
): Promise<ReadonlyArray<PackedRuntimeGraph>> {
  const installedRoot = await realpath(packageRoot)
  const manifest = JSON.parse(await readFile(resolve(installedRoot, "package.json"), "utf8")) as {
    readonly exports?: unknown
  }
  if (!isRecord(manifest.exports)) throw new Error(`Packed package at ${installedRoot} has no exports map`)

  const targets = collectPackedExportTargets(manifest.exports)
  const subpaths = [...new Set(targets.map((target) => target.subpath))]
  const classifications = new Map<string, PackedRuntimeClassification>()
  for (const subpath of subpaths) {
    const classification = exportClasses[subpath]
    if (classification === undefined) {
      throw new Error(`Unclassified export subpath ${subpath}; assign a runtime or metadata class`)
    }
    classifications.set(subpath, classification)
  }

  const validatedTargets = new Map<string, string>()
  for (const target of targets) {
    validatedTargets.set(target.target, await resolveExportTarget(installedRoot, target))
  }

  const transformerBindingsByFormat = new Map<"esm" | "cjs", ReadonlyMap<string, string>>()
  for (const condition of ["import", "require"] as const) {
    const target = selectRuntimeTarget(targets, "./dist/transformer", condition)
    const entry = target === undefined ? undefined : validatedTargets.get(target.target)
    if (entry !== undefined) {
      const format = condition === "import" ? "esm" : "cjs"
      transformerBindingsByFormat.set(format, await findMetroTransformerExports(installedRoot, entry, format))
    }
  }

  const advancedEntryFiles = new Set<string>()
  const compilerEntryFiles = new Set<string>()
  const migrationEntryFiles = new Set<string>()
  const dtcgEntryFiles = new Set<string>()
  for (const [subpath, classification] of classifications) {
    if (classification !== "advanced-runtime" && classification !== "compiler-tooling") continue
    for (const format of ["import", "require"] as const) {
      const target = selectRuntimeTarget(targets, subpath, format)
      if (target !== undefined) {
        const absolute = validatedTargets.get(target.target)
        if (absolute !== undefined) {
          if (classification === "advanced-runtime") advancedEntryFiles.add(absolute)
          else compilerEntryFiles.add(absolute)
          if (subpath === "./tooling/migrations") migrationEntryFiles.add(absolute)
          if (subpath === "./tooling/dtcg") dtcgEntryFiles.add(absolute)
        }
      }
    }
  }

  const graphs: Array<PackedRuntimeGraph> = []
  for (const subpath of subpaths) {
    const classification = classifications.get(subpath)!
    if (classification === "metadata") {
      const target = targets.find((entry) => entry.subpath === subpath)
      if (target === undefined) throw new Error(`Metadata export ${subpath} has no target`)
      graphs.push({
        subpath,
        classification,
        format: "metadata",
        entry: target.target,
        files: [toPackageRelative(installedRoot, validatedTargets.get(target.target)!)],
        externalSpecifiers: [],
        dynamicLoaderExceptions: [],
      })
      continue
    }

    for (const format of ["import", "require"] as const) {
      const target = selectRuntimeTarget(targets, subpath, format)
      if (target === undefined) {
        throw new Error(`Export ${subpath} is missing its ${format === "import" ? "ESM" : "CommonJS"} target`)
      }
      const entry = validatedTargets.get(target.target)
      if (entry === undefined) throw new Error(`Export ${subpath} target ${target.target} was not validated`)
      const files = new Set<string>()
      const externalSpecifiers = new Set<string>()
      const dynamicLoaderExceptions = new Map<string, PackedDynamicLoaderException>()
      const graphFormat = format === "import" ? "esm" : "cjs"
      await visit(
        entry,
        installedRoot,
        classification,
        subpath,
        graphFormat,
        advancedEntryFiles,
        compilerEntryFiles,
        migrationEntryFiles,
        dtcgEntryFiles,
        transformerBindingsByFormat.get(graphFormat) ?? new Map(),
        files,
        externalSpecifiers,
        dynamicLoaderExceptions,
      )
      if (subpath === "./theme/motion" || subpath === "./theme/motion/native") {
        const oldTargets = new Set(targets.filter(t => t.subpath !== "./theme/motion" && t.subpath !== "./theme/motion/native" && t.subpath !== "./package.json").map(t => validatedTargets.get(t.target)));
        if ([...files].some(file => oldTargets.has(file))) throw new Error("Existing entry reached from isolated motion runtime");
      }
      graphs.push({
        subpath,
        classification,
        format: format === "import" ? "esm" : "cjs",
        entry: target.target,
        files: [...files].map((file) => toPackageRelative(installedRoot, file)).sort(),
        externalSpecifiers: [...externalSpecifiers].sort(),
        dynamicLoaderExceptions: [...dynamicLoaderExceptions.values()],
      })
    }
  }
  return graphs
}

async function visit(
  file: string,
  packageRoot: string,
  classification: Exclude<PackedRuntimeClassification, "metadata">,
  subpath: string,
  format: "esm" | "cjs",
  advancedEntryFiles: ReadonlySet<string>,
  compilerEntryFiles: ReadonlySet<string>,
  migrationEntryFiles: ReadonlySet<string>,
  dtcgEntryFiles: ReadonlySet<string>,
  transformerBindings: ReadonlyMap<string, string>,
  visited: Set<string>,
  externals: Set<string>,
  dynamicLoaderExceptions: Map<string, PackedDynamicLoaderException>,
): Promise<void> {
  if (visited.has(file)) return
  if (!isPathWithin(packageRoot, file)) {
    throw new Error(`Local dependency ${file} resolves outside the installed package`)
  }
  if (subpath !== "./tooling/dtcg" && dtcgEntryFiles.has(file)) {
    throw new Error(`${classification} export reaches isolated DTCG tooling target ${toPackageRelative(packageRoot, file)}`)
  }
  if (subpath !== "./tooling/migrations" && migrationEntryFiles.has(file)) {
    throw new Error(`${classification} export reaches isolated compiler-tooling migration target ${toPackageRelative(packageRoot, file)}`)
  }
  if (classification === "ordinary-runtime" && advancedEntryFiles.has(file)) {
    throw new Error(`ordinary-runtime entry reaches advanced-runtime entry target ${toPackageRelative(packageRoot, file)}`)
  }
  if (classification === "ordinary-runtime" && compilerEntryFiles.has(file)) {
    throw new Error(`ordinary-runtime entry reaches compiler-tooling entry target ${toPackageRelative(packageRoot, file)}`)
  }

  visited.add(file)
  if (extname(file) === ".json") return
  const source = await readFile(file, "utf8")
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const syntaxDiagnostics = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      allowJs: true,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
    },
  }).diagnostics ?? []
  const syntaxError = syntaxDiagnostics.find((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
  if (syntaxError !== undefined) {
    const message = ts.flattenDiagnosticMessageText(syntaxError.messageText, "\n")
    throw new Error(`Cannot parse packed runtime file ${toPackageRelative(packageRoot, file)}: ${message}`)
  }

  const dependencies: Array<string> = []
  let bindingAnalysis: RuntimeBindingAnalysis | undefined
  let bindingAnalysisResolved = false
  const getBindingAnalysis = (): RuntimeBindingAnalysis | undefined => {
    if (!bindingAnalysisResolved) {
      bindingAnalysis = createRuntimeBindingAnalysis(file, source)
      bindingAnalysisResolved = true
    }
    return bindingAnalysis
  }
  const walk = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined && ts.isStringLiteralLike(node.moduleSpecifier)) {
      dependencies.push(node.moduleSpecifier.text)
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const expression = node.moduleReference.expression
      if (expression !== undefined && ts.isStringLiteralLike(expression)) dependencies.push(expression.text)
      else throw new Error(`Non-literal import-equals loader in ${toPackageRelative(packageRoot, file)}`)
    }
    if (ts.isCallExpression(node)) {
      const dynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
      const namedLoader = ts.isIdentifier(node.expression) &&
        (node.expression.text === "require" || node.expression.text === "__require")
      const analysis = !dynamicImport && ts.isIdentifier(node.expression) ? getBindingAnalysis() : undefined
      const equivalentLoader = analysis === undefined ? undefined : findEquivalentNode(analysis.sourceFile, node.expression)
      const loaderIdentifier = equivalentLoader !== undefined && ts.isIdentifier(equivalentLoader)
        ? equivalentLoader
        : undefined
      const createRequireBinding = analysis !== undefined && loaderIdentifier !== undefined
        ? isCreateRequireBinding(analysis, loaderIdentifier)
        : undefined
      const loader: DynamicLoaderKind | undefined = dynamicImport || analysis === undefined || loaderIdentifier === undefined
        ? undefined
        : isUnshadowedNodeRequire(analysis, loaderIdentifier)
          ? "require"
          : createRequireBinding !== undefined && isCreateRequireLoader(analysis, loaderIdentifier)
            ? "createRequire"
            : undefined
      if (dynamicImport || namedLoader || createRequireBinding !== undefined) {
        const expressionName = dynamicImport ? "import()" : "require"
        const specifier = node.arguments[0]
        if (specifier !== undefined && ts.isStringLiteralLike(specifier)) {
          if (!dynamicImport && loader === undefined) {
            throw new Error(`Shadowed or unverified require call in ${toPackageRelative(packageRoot, file)}: ${node.expression.getText(sourceFile)}`)
          }
          dependencies.push(specifier.text)
        }
        else {
          const expression = specifier?.getText(sourceFile) ?? "<no argument>"
          const exception = dynamicLoaderAllowlist.find((entry) => {
            const importer = toPackageRelative(packageRoot, file)
            if (dynamicImport || loader === undefined || entry.subpath !== subpath || entry.format !== format ||
              !entry.callee.includes(loader) ||
              !(typeof entry.importer === "string" ? entry.importer === importer : entry.importer.test(importer)) ||
              specifier === undefined || entry.sourceProperty === undefined) return false
            return analysis !== undefined && isIdentifierInitializedFromProperty(
              analysis,
              node,
              entry.sourceProperty,
              transformerBindings.get(file),
            )
          })
          if (exception === undefined || loader === undefined) {
            const callee = dynamicImport ? "import()" : loader ?? node.expression.getText(sourceFile)
            throw new Error(`Non-literal ${expressionName} in ${toPackageRelative(packageRoot, file)}: ${callee}(${expression})`)
          }
          const key = `${loader}:${exception.specifier}`
          if (dynamicLoaderExceptions.has(key)) {
            throw new Error(`Duplicate allowlisted dynamic loader ${key} in ${toPackageRelative(packageRoot, file)}`)
          }
          dynamicLoaderExceptions.set(key, {
            callee: loader,
            specifier: exception.specifier,
            rationale: exception.rationale,
          })
        }
      }
    }
    ts.forEachChild(node, walk)
  }
  walk(sourceFile)

  for (const specifier of dependencies) {
    if (specifier.startsWith(".") || isAbsolute(specifier)) {
      const dependency = await resolveLocalDependency(packageRoot, file, specifier)
      await visit(
        dependency,
        packageRoot,
        classification,
        subpath,
        format,
        advancedEntryFiles,
        compilerEntryFiles,
        migrationEntryFiles,
        dtcgEntryFiles,
        transformerBindings,
        visited,
        externals,
        dynamicLoaderExceptions,
      )
    } else {
      assertExternalAllowed(classification, subpath, specifier, toPackageRelative(packageRoot, file))
      externals.add(specifier)
    }
  }
}

async function resolveExportTarget(packageRoot: string, target: PackedExportTarget): Promise<string> {
  if (!target.target.startsWith("./") || isAbsolute(target.target)) {
    throw new Error(`Export target ${target.target} for ${target.subpath} resolves outside the installed package`)
  }
  const candidate = resolve(packageRoot, target.target.slice(2))
  if (!isPathWithin(packageRoot, candidate)) {
    throw new Error(`Export target ${target.target} for ${target.subpath} resolves outside the installed package`)
  }
  let canonical: string
  try {
    canonical = await realpath(candidate)
  } catch {
    throw new Error(`Missing packed export target ${target.target} for ${target.subpath}`)
  }
  if (!isPathWithin(packageRoot, canonical)) {
    throw new Error(`Export target ${target.target} for ${target.subpath} resolves outside the installed package`)
  }
  if (!(await stat(canonical)).isFile()) {
    throw new Error(`Packed export target ${target.target} for ${target.subpath} is not a regular file`)
  }
  return canonical
}

async function resolveLocalDependency(packageRoot: string, importer: string, specifier: string): Promise<string> {
  const candidate = isAbsolute(specifier)
    ? resolve(specifier)
    : resolve(importer.slice(0, importer.lastIndexOf(sep)), specifier)
  if (!isPathWithin(packageRoot, candidate)) {
    throw new Error(`Local dependency ${specifier} from ${toPackageRelative(packageRoot, importer)} resolves outside the installed package`)
  }
  const candidates = extname(candidate) === ""
    ? [candidate, `${candidate}.mjs`, `${candidate}.cjs`, `${candidate}.js`, `${candidate}.json`,
      resolve(candidate, "index.mjs"), resolve(candidate, "index.cjs"), resolve(candidate, "index.js")]
    : [candidate]
  for (const possible of candidates) {
    try {
      const canonical = await realpath(possible)
      if (!isPathWithin(packageRoot, canonical)) {
        throw new Error(`Local dependency ${specifier} from ${toPackageRelative(packageRoot, importer)} resolves outside the installed package`)
      }
      if ((await stat(canonical)).isFile()) return canonical
    } catch (error) {
      if (error instanceof Error && /resolves outside the installed package/i.test(error.message)) throw error
    }
  }
  throw new Error(`Missing local dependency ${specifier} imported by ${toPackageRelative(packageRoot, importer)}`)
}

async function findMetroTransformerExports(
  packageRoot: string,
  entry: string,
  format: "esm" | "cjs",
): Promise<ReadonlyMap<string, string>> {
  const source = await readFile(entry, "utf8")
  const sourceFile = ts.createSourceFile(entry, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const exports = new Map<string, string>()

  if (format === "esm") {
    const imports = new Map<string, Readonly<{specifier: string; importedName: string}>>()
    function collectImports(node: ts.Node): void {
      if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
        const bindings = node.importClause?.namedBindings
        if (bindings !== undefined && ts.isNamedImports(bindings)) {
          for (const specifier of bindings.elements) {
            if (specifier.isTypeOnly) continue
            imports.set(specifier.name.text, {
              specifier: node.moduleSpecifier.text,
              importedName: specifier.propertyName?.text ?? specifier.name.text,
            })
          }
        }
      }
      ts.forEachChild(node, collectImports)
    }
    collectImports(sourceFile)

    async function registerExport(specifier: string | undefined, importedName: string): Promise<void> {
      if (specifier === undefined) {
        exports.set(entry, "transform")
        return
      }
      const dependency = await resolveLocalDependency(packageRoot, entry, specifier)
      exports.set(dependency, importedName)
    }

    const exportDeclarations: Array<Readonly<{specifier: string | undefined; importedName: string}>> = []
    function collectExports(node: ts.Node): void {
      if (ts.isExportDeclaration(node) && node.exportClause !== undefined && ts.isNamedExports(node.exportClause)) {
        const specifier = node.moduleSpecifier !== undefined && ts.isStringLiteralLike(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : undefined
        for (const element of node.exportClause.elements) {
          if (element.isTypeOnly || element.name.text !== "transform") continue
          const localName = element.propertyName?.text ?? element.name.text
          const imported = specifier === undefined ? imports.get(localName) : undefined
          exportDeclarations.push({
            specifier: specifier ?? imported?.specifier,
            importedName: specifier === undefined ? imported?.importedName ?? localName : localName,
          })
        }
      }
      if (ts.isFunctionDeclaration(node) && node.name?.text === "transform" &&
        node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        exports.set(entry, "transform")
      }
      if (ts.isVariableStatement(node) && node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name) && declaration.name.text === "transform") {
            exports.set(entry, "transform")
          }
        }
      }
      ts.forEachChild(node, collectExports)
    }
    collectExports(sourceFile)
    for (const declaration of exportDeclarations) {
      await registerExport(declaration.specifier, declaration.importedName)
    }
    return exports
  }

  const analysis = createRuntimeBindingAnalysis(entry, source)
  const bindingSourceFile = analysis?.sourceFile ?? sourceFile
  const requiredModules = new Map<ts.Symbol, Readonly<{specifier: string; reassigned: boolean; ambiguous: boolean}>>()
  function collectRequiredModules(node: ts.Node): void {
    const initializer = ts.isVariableDeclaration(node) ? node.initializer : undefined
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && initializer !== undefined &&
      ts.isCallExpression(initializer) && ts.isIdentifier(initializer.expression) && initializer.expression.text === "require") {
      const specifier = initializer.arguments[0]
      const symbol = analysis?.checker.getSymbolAtLocation(node.name)
      if (symbol !== undefined && specifier !== undefined && ts.isStringLiteralLike(specifier)) {
        const existing = requiredModules.get(symbol)
        requiredModules.set(symbol, {
          specifier: specifier.text,
          reassigned: analysis !== undefined && symbolHasWrites(analysis, symbol),
          ambiguous: existing !== undefined || (analysis !== undefined && hasAmbiguousVariableBinding(analysis, node)),
        })
      }
    }
    ts.forEachChild(node, collectRequiredModules)
  }
  collectRequiredModules(bindingSourceFile)

  async function registerCjsValue(value: ts.Expression): Promise<void> {
    const expression = skipParentheses(value)
    if (analysis !== undefined && ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
      const symbol = analysis.checker.getSymbolAtLocation(expression.expression)
      const requiredModule = symbol === undefined ? undefined : requiredModules.get(symbol)
      if (requiredModule !== undefined) {
        if (requiredModule.reassigned || requiredModule.ambiguous) {
          throw new Error(`Reassigned or ambiguous CommonJS module binding prevents transformer export tracing in ${toPackageRelative(packageRoot, entry)}`)
        }
        const dependency = await resolveLocalDependency(packageRoot, entry, requiredModule.specifier)
        exports.set(dependency, expression.name.text)
        return
      }
    }
    exports.set(entry, "transform")
  }

  function isModuleExportsAssignment(expression: ts.Expression): boolean {
    return ts.isPropertyAccessExpression(expression) && expression.name.text === "exports" &&
      ts.isIdentifier(expression.expression) && expression.expression.text === "module"
  }

  async function collectCjsExports(node: ts.Node): Promise<void> {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) && node.left.name.text === "transform" &&
      isCjsExportsReceiver(node.left.expression)) {
      await registerCjsValue(node.right)
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      isModuleExportsAssignment(node.left) && ts.isObjectLiteralExpression(node.right)) {
      for (const property of node.right.properties) {
        if (ts.isPropertyAssignment(property) && propertyNameText(property.name) === "transform") {
          await registerCjsValue(property.initializer)
        } else if (ts.isShorthandPropertyAssignment(property) && property.name.text === "transform") {
          exports.set(entry, "transform")
        }
      }
    }
    const children: Array<ts.Node> = []
    ts.forEachChild(node, (child) => { children.push(child) })
    for (const child of children) await collectCjsExports(child)
  }
  await collectCjsExports(bindingSourceFile)
  return exports
}

function selectRuntimeTarget(
  targets: ReadonlyArray<PackedExportTarget>,
  subpath: string,
  condition: "import" | "require",
): PackedExportTarget | undefined {
  const entries = targets.filter((target) => target.subpath === subpath)
  const direct = entries.find((target) => target.conditions.includes(condition))
  if (direct !== undefined) return direct
  const opposite = condition === "import" ? "require" : "import"
  return entries.find((target) =>
    !target.conditions.includes(opposite) &&
    (target.conditions.length === 0 || target.conditions.includes("default"))
  )
}

function assertExternalAllowed(
  classification: Exclude<PackedRuntimeClassification, "metadata">,
  subpath: string,
  specifier: string,
  importer: string,
): void {
  let allowed = false
  if (classification === "ordinary-runtime") {
    const reactRuntimeEntry = subpath === "./theme" || subpath === "./theme/core" || subpath === "./theme/token" ||
      subpath === "./dist/theme" || subpath === "./theme/conditions" || subpath === "./theme/vars" || subpath === "./theme/containers" || subpath === "./theme/motion/native"
    allowed = (reactRuntimeEntry && (specifier === "react" || specifier.startsWith("react/"))) || (subpath === "./theme/motion/native" && specifier === "react-native")
  } else if (classification === "compiler-tooling") {
    const neverBundle = toPatterns(compilerDependencies.neverBundle)
    const alwaysBundle = toPatterns(compilerDependencies.alwaysBundle)
    const migrationTypeScriptPeer = subpath === "./tooling/migrations" && specifier === "typescript"
    allowed = migrationTypeScriptPeer || (
      neverBundle.some((pattern) => matchesPattern(specifier, pattern)) &&
      !alwaysBundle.some((pattern) => matchesPattern(specifier, pattern))
    )
  } else if (classification === "advanced-runtime" && subpath === "./devtools") {
    allowed = specifier === "effect" || specifier.startsWith("effect/") || specifier === "react" || specifier.startsWith("react/")
  }
  if (!allowed) {
    throw new Error(`${classification} export imports unauthorized external ${specifier} from ${importer}`)
  }
}

function toPatterns(value: unknown): ReadonlyArray<unknown> {
  return Array.isArray(value) ? value : value === undefined ? [] : [value]
}

function matchesPattern(specifier: string, pattern: unknown): boolean {
  if (pattern instanceof RegExp) {
    pattern.lastIndex = 0
    return pattern.test(specifier)
  }
  if (typeof pattern === "string") return specifier === pattern || specifier.startsWith(`${pattern}/`)
  return false
}

function toPackageRelative(packageRoot: string, filename: string): string {
  return relative(packageRoot, filename).split(sep).join("/")
}

function isPathWithin(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return pathFromRoot === "" || (
    !isAbsolute(pathFromRoot) &&
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith(`..${sep}`)
  )
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
