import {
  getThemeTokenPublicId,
  isRegisteredThemeVar,
  isThemeTokenReference,
  type ThemeVar,
} from "../theme-token"
import type {
  ManifestCapability,
  ManifestDependency,
  ManifestModule,
  ManifestUnresolvedReference,
} from "../tooling/manifest/model"

export type ManifestSidecarPropertyOrigin = {
  readonly packageOwner: string
  readonly sourceId: string
  readonly primitiveDomain: ReadonlyArray<string>
}

export type CompilerManifestSidecar = {
  readonly module: ManifestModule
  readonly dependencies: ReadonlyArray<ManifestDependency>
  readonly capabilities: ReadonlyArray<ManifestCapability>
  readonly unresolved: ReadonlyArray<ManifestUnresolvedReference>
}

export type CaptureManifestSidecarInput = {
  readonly packageOwner: string
  readonly sourceId: string
  readonly exportMap: ReadonlyMap<string, unknown>
  readonly resolvedClassStyles: ReadonlyMap<string, Readonly<Record<string, unknown>>>
  readonly resolvedClassOrigins: ReadonlyMap<
    string,
    ReadonlyMap<string, ManifestSidecarPropertyOrigin>
  >
  /** Token IDs represented by the manifest's explicitly supplied token roots. */
  readonly declaredTokenIds?: ReadonlySet<string>
}

type LogicalStyleExport = {
  readonly className: string
  readonly exportPath: string
}

/**
 * Project the final compiler output into tooling data. This deliberately takes
 * already-composed class styles and their winning IR origins; it never
 * re-evaluates a CSS module or participates in runtime emission.
 */
export function captureManifestSidecar(input: CaptureManifestSidecarInput): CompilerManifestSidecar {
  const moduleId = createModuleId(input.packageOwner, input.sourceId)
  const exports = collectLogicalStyleExports(input.exportMap)
  const exportPaths = [...new Set(exports.map(styleExport => styleExport.exportPath))].sort(compare)
  const dependencies: ManifestDependency[] = []
  const capabilities: ManifestCapability[] = []
  const unresolved: ManifestUnresolvedReference[] = []

  for (const styleExport of exports) {
    const style = input.resolvedClassStyles.get(styleExport.className)
    if (style === undefined) continue
    const origins = input.resolvedClassOrigins.get(styleExport.className)

    for (const [property, value] of Object.entries(style)) {
      const origin = origins?.get(property)
      if (origin !== undefined) {
        for (const primitive of origin.primitiveDomain) {
          capabilities.push({
            moduleId,
            exportPath: styleExport.exportPath,
            property,
            primitive,
            evidence: "compiler-observed",
          })
        }
      }

      for (const varName of collectTokenReferences(value)) {
        const dependencyOrigin = {
          moduleId,
          exportPath: styleExport.exportPath,
          property,
        }
        const token = `var(${varName})` as ThemeVar
        if (!isRegisteredThemeVar(token)) {
          dependencies.push({
            from: moduleId,
            kind: "style-token",
            resolution: "unresolved",
            origin: dependencyOrigin,
          })
          unresolved.push({
            reference: `legacy:${varName}`,
            reason: "The style token reference has no registered stable contract identity.",
            origin: dependencyOrigin,
          })
          continue
        }

        const tokenId = getThemeTokenPublicId(token)
        dependencies.push({
          from: moduleId,
          to: tokenId,
          kind: "style-token",
          resolution: input.declaredTokenIds?.has(tokenId) === true ? "internal" : "external",
          origin: dependencyOrigin,
        })
      }
    }
  }

  return Object.freeze({
    module: Object.freeze({
      id: moduleId,
      origin: Object.freeze({ path: normalizeSourcePath(input.sourceId) }),
      exports: Object.freeze(exportPaths),
    }),
    dependencies: Object.freeze(uniqueSorted(dependencies, dependencyKey)),
    capabilities: Object.freeze(uniqueSorted(capabilities, capabilityKey)),
    unresolved: Object.freeze(uniqueSorted(unresolved, unresolvedKey)),
  })
}

function collectLogicalStyleExports(exportMap: ReadonlyMap<string, unknown>): ReadonlyArray<LogicalStyleExport> {
  const styles: LogicalStyleExport[] = []
  for (const [name, value] of exportMap) collectStyleExports(value, [name], styles)
  return Object.freeze(styles.sort((left, right) =>
    compare(left.exportPath, right.exportPath) || compare(left.className, right.className),
  ))
}

function collectStyleExports(
  value: unknown,
  path: ReadonlyArray<string>,
  output: LogicalStyleExport[],
): void {
  if (isRecord(value) && value.$$type === "crumbs.css.class" && typeof value.className === "string") {
    output.push({ className: value.className, exportPath: path.join(".") })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectStyleExports(entry, [...path, String(index)], output))
    return
  }
  if (!isRecord(value)) return
  if (value.$$type === "crumbs.css.style-map") {
    collectStyleExports(value.styles, path, output)
    return
  }
  if (value.$$type !== "crumbs.css.export-record" || !Array.isArray(value.entries)) return
  for (const entry of value.entries) {
    if (!Array.isArray(entry) || typeof entry[0] !== "string") continue
    collectStyleExports(entry[1], [...path, entry[0]], output)
  }
}

function collectTokenReferences(value: unknown): ReadonlyArray<string> {
  const names = new Set<string>()
  const active = new Set<object>()
  const visit = (current: unknown): void => {
    if (isThemeTokenReference(current)) {
      names.add(current.varName)
      return
    }
    if (current === null || typeof current !== "object") return
    if (active.has(current)) throw new TypeError("Compiler manifest sidecar cannot inspect cyclic style data.")
    active.add(current)
    try {
      if (Array.isArray(current)) {
        current.forEach(visit)
        return
      }
      for (const entry of Object.values(current)) visit(entry)
    } finally {
      active.delete(current)
    }
  }
  visit(value)
  return Object.freeze([...names].sort(compare))
}

function createModuleId(packageOwner: string, sourceId: string): string {
  return `${packageOwner}#${normalizeSourcePath(sourceId)}`
}

function normalizeSourcePath(sourceId: string): string {
  const normalized = sourceId.replace(/\\/gu, "/")
  if (normalized.length === 0 || normalized.startsWith("/") || /^[A-Za-z]:/u.test(normalized) ||
    normalized.split("/").some(segment => segment.length === 0 || segment === "." || segment === "..")) {
    throw new TypeError(`Compiler manifest source ID must be a safe package-relative path: ${JSON.stringify(sourceId)}.`)
  }
  return normalized
}

function uniqueSorted<T>(values: ReadonlyArray<T>, key: (value: T) => string): ReadonlyArray<T> {
  const unique = new Map<string, T>()
  for (const value of values) unique.set(key(value), value)
  return Object.freeze([...unique.entries()].sort(([left], [right]) => compare(left, right)).map(([, value]) => value))
}

function dependencyKey(value: ManifestDependency): string {
  return JSON.stringify([value.from, value.to ?? null, value.kind, value.resolution, value.origin ?? null])
}

function capabilityKey(value: ManifestCapability): string {
  return JSON.stringify([value.moduleId, value.exportPath, value.property, value.primitive, value.evidence])
}

function unresolvedKey(value: ManifestUnresolvedReference): string {
  return JSON.stringify([value.reference, value.reason ?? null, value.origin ?? null])
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
