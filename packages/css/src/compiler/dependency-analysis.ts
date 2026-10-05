import { createHash } from "node:crypto"
import { readFileSync, realpathSync } from "node:fs"
import * as path from "node:path"
import { ownEnumerableDataEntries } from "./record-admission"

export type DependencyAnalysisOptions = {
  readonly cwd: string
  readonly absoluteEntryPath: string
  readonly nativeStylesDistRoot: string
  readonly workspaceRoot?: string
}

export type AnalysedDependencyInput = {
  readonly importPath: string
  readonly sourcePath: string
  readonly sourceHash: string
}

export type DependencyCacheContext = {
  readonly compilerKey: string
  readonly platform: string | null
  readonly dev: boolean
  readonly strictDiagnostics: boolean
  readonly useStyleSheet: boolean
  readonly identOption: string
}

type DependencyPath = {
  readonly importPath: string
  readonly sourcePath: string
}

/**
 * Converts esbuild's input map into the stable, project-local side-effect
 * imports required by Metro. The result is deduplicated and sorted once at
 * the compiler boundary.
 */
export function analyseDependencyImports(
  capturedInputs: Readonly<Record<string, unknown>>,
  options: DependencyAnalysisOptions,
): ReadonlyArray<string> {
  return collectDependencyPaths(capturedInputs, options).map(({ importPath }) => importPath)
}

export function analyseDependencyInputs(
  capturedInputs: Readonly<Record<string, unknown>>,
  options: DependencyAnalysisOptions,
): ReadonlyArray<AnalysedDependencyInput> {
  return collectDependencyPaths(capturedInputs, options).map(({ importPath, sourcePath }) => ({
    importPath,
    sourcePath,
    sourceHash: createHash("sha256").update(readFileSync(sourcePath)).digest("hex"),
  }))
}

export function createDependencyCacheIdentity(
  dependencies: ReadonlyArray<AnalysedDependencyInput>,
  context: DependencyCacheContext,
  resolutionKey?: string,
): string {
  const hash = createHash("sha256")
  hash.update("crumbs-native-cache-v1\0")
  hash.update(`compiler=${context.compilerKey}\0`)
  hash.update(`platform=${context.platform ?? ""}\0`)
  hash.update(`dev=${context.dev ? "1" : "0"}\0`)
  hash.update(`strict=${context.strictDiagnostics ? "1" : "0"}\0`)
  hash.update(`styleSheet=${context.useStyleSheet ? "1" : "0"}\0`)
  hash.update(`ident=${context.identOption}\0`)
  for (const dependency of [...dependencies].sort((left, right) => left.importPath.localeCompare(right.importPath))) {
    hash.update(`${dependency.importPath}\0${dependency.sourceHash}\0`)
  }
  if (resolutionKey !== undefined) hash.update(`resolution=${resolutionKey}\0`)
  return hash.digest("hex")
}

function collectDependencyPaths(
  capturedInputs: Readonly<Record<string, unknown>>,
  options: DependencyAnalysisOptions,
): ReadonlyArray<DependencyPath> {
  const projectRoot = path.resolve(options.cwd)
  const entryPath = path.resolve(options.absoluteEntryPath)
  const workspaceRoot = path.resolve(options.workspaceRoot ?? findWorkspaceRoot(projectRoot))
  const dependencies = new Map<string, DependencyPath>()

  for (const [inputPath] of ownEnumerableDataEntries(capturedInputs, "esbuild metafile inputs")) {
    const logicalPath = path.resolve(projectRoot, inputPath)
    const sourcePath = resolveExistingPath(logicalPath)
    if (!shouldEmitDependencyImport(sourcePath, entryPath, workspaceRoot, options.nativeStylesDistRoot)) continue
    const importPath = toRelativeImport(path.dirname(entryPath), sourcePath)
    dependencies.set(sourcePath, { importPath, sourcePath })
  }

  return [...dependencies.values()].sort((left, right) => left.importPath.localeCompare(right.importPath))
}

function shouldEmitDependencyImport(
  absoluteDependencyPath: string,
  absoluteEntryPath: string,
  workspaceRoot: string,
  nativeStylesDistRoot: string,
): boolean {
  return (
    absoluteDependencyPath !== absoluteEntryPath &&
    isInsidePath(workspaceRoot, absoluteDependencyPath) &&
    !hasPathSegment(absoluteDependencyPath, "node_modules") &&
    !hasPathSegment(absoluteDependencyPath, "dist") &&
    !isInsidePath(path.resolve(nativeStylesDistRoot), absoluteDependencyPath)
  )
}

function resolveExistingPath(value: string): string {
  try {
    return realpathSync(value)
  } catch {
    return value
  }
}

function findWorkspaceRoot(startPath: string): string {
  let directory = path.resolve(startPath)
  while (true) {
    try {
      const manifest = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8")) as {
        workspaces?: unknown
      }
      if (Array.isArray(manifest.workspaces) || (manifest.workspaces !== null && typeof manifest.workspaces === "object")) {
        return directory
      }
    } catch {
      // Continue to the parent when the directory has no readable package manifest.
    }
    const parent = path.dirname(directory)
    if (parent === directory) return path.resolve(startPath)
    directory = parent
  }
}

function hasPathSegment(value: string, segment: string): boolean {
  return value.split(path.sep).includes(segment)
}

function isInsidePath(parentPath: string, childPath: string): boolean {
  const relative = path.relative(parentPath, childPath)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function toRelativeImport(fromDir: string, absoluteDependencyPath: string): string {
  const rel = path.relative(fromDir, absoluteDependencyPath)
  return rel.startsWith(".") ? rel : `./${rel}`
}
