import {isCapturedRuntimeExtension} from './runtime-extension-model'
import { isThemeTokenReference } from "../theme-token"
import { NativeStyleMapType } from "../native-style-map"
import { sortedOwnEnumerableDataEntries } from "./record-admission"
import {
  createThemeDependencyPlan,
  type ThemeDependencyPlan,
  type ThemeDependencyPlanEntry,
} from "../runtime/theme-dependency-plan"

export const NativeModuleMetadataExportName = "__crumbsModule" as const
export const NativeModuleMetadataType = "crumbs.css.native-module" as const
export const NativeModuleMetadataVersion = 2 as const

export type NativeModuleMetadata = {
  readonly $$type: typeof NativeModuleMetadataType
  readonly version: typeof NativeModuleMetadataVersion
  readonly tokens: ReadonlyArray<string>
  readonly dependencyPlan: ThemeDependencyPlan
  readonly conditions: ReadonlyArray<never>
}

/**
 * Production metadata is derived from the final native values, after
 * composition and lowering have removed overridden declarations. The
 * dependency plan keeps the surviving token edges attached to export paths so
 * runtime resolution can avoid scanning unrelated leaves. Conditions are
 * intentionally represented as an empty closed list until M6 introduces a
 * native condition algebra.
 */
export function createNativeModuleMetadata(
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
  exportMap: ReadonlyMap<string, unknown> = new Map(),
): NativeModuleMetadata {
  const tokens = new Set<string>()
  const active = new Set<object>()

  function visit(value: unknown): void {
    if (isThemeTokenReference(value)) {
      tokens.add(value.varName)
      return
    }
    if (value === null || typeof value !== "object") return
    if (active.has(value)) throw new TypeError("Native module metadata cannot inspect cyclic style data")
    active.add(value)
    try {
      if (Array.isArray(value)) {
        for (const entry of value) visit(entry)
        return
      }
      for (const [, entry] of sortedOwnEnumerableDataEntries(value, "native module metadata")) visit(entry)
    } finally {
      active.delete(value)
    }
  }

  for (const [, style] of [...classStyles.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    visit(style)
  }

  return Object.freeze({
    $$type: NativeModuleMetadataType,
    version: NativeModuleMetadataVersion,
    tokens: Object.freeze([...tokens].sort((left, right) => left.localeCompare(right))),
    dependencyPlan: createThemeDependencyPlan(createDependencyPlanEntries(exportMap, classStyles)),
    conditions: Object.freeze([]),
  })
}

export function emitNativeModuleMetadata(
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
  exportMap: ReadonlyMap<string, unknown> = new Map(),
): string {
  const metadata = createNativeModuleMetadata(classStyles, exportMap)
  const entries = metadata.dependencyPlan.entries.map(entry =>
    `Object.freeze({path:Object.freeze(${JSON.stringify(entry.path)}),tokens:Object.freeze(${JSON.stringify(entry.tokens)})})`,
  ).join(",")
  const dependencyPlan = `Object.freeze({$$type:${JSON.stringify(metadata.dependencyPlan.$$type)},version:${metadata.dependencyPlan.version},entries:Object.freeze([${entries}])})`
  return `export const ${NativeModuleMetadataExportName} = Object.freeze({$$type:${JSON.stringify(metadata.$$type)},version:${metadata.version},tokens:Object.freeze(${JSON.stringify(metadata.tokens)}),dependencyPlan:${dependencyPlan},conditions:Object.freeze([])});`
}

function createDependencyPlanEntries(
  exportMap: ReadonlyMap<string, unknown>,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
): ReadonlyArray<ThemeDependencyPlanEntry> {
  const entries: ThemeDependencyPlanEntry[] = []
  const active = new Set<object>()
  for (const [name, value] of [...exportMap.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    collectDependencyPlanEntries(value, [name], classStyles, active, entries)
  }
  return entries
}

function collectDependencyPlanEntries(
  value: unknown,
  path: ReadonlyArray<string | number>,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
  active: Set<object>,
  output: ThemeDependencyPlanEntry[],
): void {
  if (isCapturedRuntimeExtension(value)) return
  const className = classReferenceName(value)
  if (className !== undefined) {
    const style = classStyles.get(className)
    if (style !== undefined) {
      const tokens = collectTokenNames(style)
      if (tokens.length > 0) output.push({path, tokens})
    }
    return
  }
  if (value === null || typeof value !== "object") return
  if (active.has(value)) throw new TypeError("Native module dependency metadata cannot inspect cyclic export data")
  active.add(value)
  try {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => collectDependencyPlanEntries(entry, [...path, index], classStyles, active, output))
      return
    }
    if (isCapturedNativeStyleMap(value)) {
      collectDependencyPlanEntries(value.styles, path, classStyles, active, output)
      return
    }
    if (isCapturedExportRecord(value)) {
      for (const [key, entry] of value.entries) {
        collectDependencyPlanEntries(entry, [...path, key], classStyles, active, output)
      }
      return
    }
    for (const [key, entry] of sortedOwnEnumerableDataEntries(value, "native module dependency metadata")) {
      collectDependencyPlanEntries(entry, [...path, key], classStyles, active, output)
    }
  } finally {
    active.delete(value)
  }
}

function collectTokenNames(value: unknown): ReadonlyArray<string> {
  const tokens = new Set<string>()
  const active = new Set<object>()
  const visit = (entry: unknown): void => {
    if (isThemeTokenReference(entry)) {
      tokens.add(entry.varName)
      return
    }
    if (entry === null || typeof entry !== "object") return
    if (active.has(entry)) throw new TypeError("Native module dependency metadata cannot inspect cyclic style data")
    active.add(entry)
    try {
      if (Array.isArray(entry)) {
        entry.forEach(visit)
        return
      }
      for (const [, nested] of sortedOwnEnumerableDataEntries(entry, "native module dependency metadata")) visit(nested)
    } finally {
      active.delete(entry)
    }
  }
  visit(value)
  return [...tokens].sort((left, right) => left.localeCompare(right))
}

function classReferenceName(value: unknown): string | undefined {
  return typeof value === "object" && value !== null &&
    "$$type" in value && value.$$type === "crumbs.css.class" &&
    "className" in value && typeof value.className === "string"
    ? value.className : typeof value === "string" ? value : undefined
}

function isCapturedNativeStyleMap(value: unknown): value is {readonly $$type: typeof NativeStyleMapType; readonly styles: unknown} {
  return typeof value === "object" && value !== null &&
    "$$type" in value && value.$$type === NativeStyleMapType && "styles" in value
}

function isCapturedExportRecord(value: unknown): value is {readonly $$type: "crumbs.css.export-record"; readonly entries: ReadonlyArray<readonly [string, unknown]>} {
  return typeof value === "object" && value !== null &&
    "$$type" in value && value.$$type === "crumbs.css.export-record" &&
    "entries" in value && Array.isArray(value.entries)
}
