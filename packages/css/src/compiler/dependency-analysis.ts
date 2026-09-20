import * as path from "node:path"
import { ownEnumerableDataEntries } from "./record-admission"

export type DependencyAnalysisOptions = {
  readonly cwd: string
  readonly absoluteEntryPath: string
  readonly nativeStylesDistRoot: string
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
  const projectRoot = path.resolve(options.cwd)
  const entryPath = path.resolve(options.absoluteEntryPath)
  const imports = new Set<string>()

  for (const [inputPath] of ownEnumerableDataEntries(capturedInputs, "esbuild metafile inputs")) {
    const absoluteDependencyPath = path.resolve(options.cwd, inputPath)
    if (!shouldEmitDependencyImport(absoluteDependencyPath, entryPath, projectRoot, options.nativeStylesDistRoot)) continue
    imports.add(toRelativeImport(path.dirname(entryPath), absoluteDependencyPath))
  }

  return [...imports].sort((left, right) => left.localeCompare(right))
}

function shouldEmitDependencyImport(
  absoluteDependencyPath: string,
  absoluteEntryPath: string,
  projectRoot: string,
  nativeStylesDistRoot: string,
): boolean {
  return (
    absoluteDependencyPath !== absoluteEntryPath &&
    isInsidePath(projectRoot, absoluteDependencyPath) &&
    !isInsidePath(path.join(projectRoot, "node_modules"), absoluteDependencyPath) &&
    !isInsidePath(path.join(projectRoot, "dist"), absoluteDependencyPath) &&
    !isInsidePath(path.resolve(nativeStylesDistRoot), absoluteDependencyPath)
  )
}

function isInsidePath(parentPath: string, childPath: string): boolean {
  const relative = path.relative(parentPath, childPath)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function toRelativeImport(fromDir: string, absoluteDependencyPath: string): string {
  const rel = path.relative(fromDir, absoluteDependencyPath)
  return rel.startsWith(".") ? rel : `./${rel}`
}
