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

export type PackedDynamicLoaderException = Readonly<{
  callee: "require" | "__require"
  specifier: string
  rationale: string
}>

const exportClasses: Readonly<Record<string, PackedRuntimeClassification>> = {
  ".": "compiler-tooling",
  "./theme": "ordinary-runtime",
  "./theme/core": "ordinary-runtime",
  "./dist/theme": "ordinary-runtime",
  "./tokens": "ordinary-runtime",
  "./tokens/schema": "advanced-runtime",
  "./tokens/schema/value": "advanced-runtime",
  "./tokens/optic": "advanced-runtime",
  "./devtools": "advanced-runtime",
  "./style": "compiler-tooling",
  "./tooling/manifest": "compiler-tooling",
  "./metro-plugin": "compiler-tooling",
  "./dist/transformer": "compiler-tooling",
  "./dist/metro-plugin": "compiler-tooling",
  "./package.json": "metadata",
}

const dynamicLoaderAllowlist: ReadonlyArray<Readonly<{
  subpath: string
  format: "esm" | "cjs"
  importer: string | RegExp
  callee: "require" | "__require"
  specifier: string
  rationale: string
}>> = [
  {
    subpath: "./dist/transformer",
    format: "esm",
    importer: /^dist\/transformer(?:-[A-Za-z0-9_-]+)?\.mjs$/u,
    callee: "__require",
    specifier: "upstreamPath",
    rationale: "Metro supplies its configured upstream transformer path at runtime so Crumbs can delegate Expo's selected transform worker.",
  },
  {
    subpath: "./dist/transformer",
    format: "cjs",
    importer: /^dist\/transformer(?:-[A-Za-z0-9_-]+)?\.cjs$/u,
    callee: "require",
    specifier: "upstreamPath",
    rationale: "Metro supplies its configured upstream transformer path at runtime so Crumbs can delegate Expo's selected transform worker.",
  },
  {
    subpath: "./tooling/manifest",
    format: "esm",
    importer: /^dist\/transformer-[A-Za-z0-9_-]+\.mjs$/u,
    callee: "__require",
    specifier: "upstreamPath",
    rationale: "Metro supplies its configured upstream transformer path at runtime so Crumbs can delegate Expo's selected transform worker.",
  },
  {
    subpath: "./tooling/manifest",
    format: "cjs",
    importer: /^dist\/transformer-[A-Za-z0-9_-]+\.cjs$/u,
    callee: "require",
    specifier: "upstreamPath",
    rationale: "Metro supplies its configured upstream transformer path at runtime so Crumbs can delegate Expo's selected transform worker.",
  },
]

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

  const advancedEntryFiles = new Set<string>()
  const compilerEntryFiles = new Set<string>()
  for (const [subpath, classification] of classifications) {
    if (classification !== "advanced-runtime" && classification !== "compiler-tooling") continue
    for (const format of ["import", "require"] as const) {
      const target = selectRuntimeTarget(targets, subpath, format)
      if (target !== undefined) {
        const absolute = validatedTargets.get(target.target)
        if (absolute !== undefined) {
          if (classification === "advanced-runtime") advancedEntryFiles.add(absolute)
          else compilerEntryFiles.add(absolute)
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
        files,
        externalSpecifiers,
        dynamicLoaderExceptions,
      )
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
  visited: Set<string>,
  externals: Set<string>,
  dynamicLoaderExceptions: Map<string, PackedDynamicLoaderException>,
): Promise<void> {
  if (visited.has(file)) return
  if (!isPathWithin(packageRoot, file)) {
    throw new Error(`Local dependency ${file} resolves outside the installed package`)
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
      const commonJsRequire = ts.isIdentifier(node.expression) && ["require", "__require"].includes(node.expression.text)
      if (dynamicImport || commonJsRequire) {
        const expressionName = dynamicImport ? "import()" : "require"
        const specifier = node.arguments[0]
        if (specifier !== undefined && ts.isStringLiteralLike(specifier)) dependencies.push(specifier.text)
        else {
          const callee = dynamicImport ? "import()" : node.expression.getText(sourceFile)
          const expression = specifier?.getText(sourceFile) ?? "<no argument>"
          const exception = dynamicLoaderAllowlist.find((entry) =>
            entry.subpath === subpath &&
            entry.format === format &&
            (typeof entry.importer === "string"
              ? entry.importer === toPackageRelative(packageRoot, file)
              : entry.importer.test(toPackageRelative(packageRoot, file))) &&
            entry.callee === callee &&
            entry.specifier === expression
          )
          if (exception === undefined) {
            throw new Error(`Non-literal ${expressionName} in ${toPackageRelative(packageRoot, file)}: ${expression}`)
          }
          const key = `${exception.callee}:${exception.specifier}`
          if (dynamicLoaderExceptions.has(key)) {
            throw new Error(`Duplicate allowlisted dynamic loader ${key} in ${toPackageRelative(packageRoot, file)}`)
          }
          dynamicLoaderExceptions.set(key, {
            callee: exception.callee,
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
    const reactRuntimeEntry = subpath === "./theme" || subpath === "./theme/core" || subpath === "./dist/theme"
    allowed = reactRuntimeEntry && (specifier === "react" || specifier.startsWith("react/"))
  } else if (classification === "compiler-tooling") {
    const neverBundle = toPatterns(compilerDependencies.neverBundle)
    const alwaysBundle = toPatterns(compilerDependencies.alwaysBundle)
    allowed = neverBundle.some((pattern) => matchesPattern(specifier, pattern)) &&
      !alwaysBundle.some((pattern) => matchesPattern(specifier, pattern))
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
