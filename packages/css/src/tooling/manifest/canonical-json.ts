import { decodeManifest } from "./schema"
import type { DesignSystemManifest } from "./model"

/**
 * Compare strings by Unicode code units, independent of the host locale.
 * Set-like values use this ordinal order: token, component and module records by
 * identity; dependencies, capabilities and coverage records by canonical bytes;
 * enum values, slots, variant axes/values, extension points, state-constraint
 * axes/values, module exports, record keys and all JSON object keys by key text.
 * Token paths, alias target paths and other semantic sequences keep authored order.
 */
function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function canonicalJsonForSort(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value))
}

function sortRecord(record: Readonly<Record<string, ReadonlyArray<string>>>): Record<string, ReadonlyArray<string>> {
  return Object.fromEntries(Object.keys(record).sort(compareOrdinal).map(key => [key, [...record[key]!].sort(compareOrdinal)]))
}

function byIdentity<T extends { readonly id: string }>(items: ReadonlyArray<T>): ReadonlyArray<T> {
  return [...items].sort((left, right) => compareOrdinal(left.id, right.id) || compareOrdinal(canonicalJsonForSort(left), canonicalJsonForSort(right)))
}

function byCanonicalValue<T>(items: ReadonlyArray<T>): ReadonlyArray<T> {
  return [...items].sort((left, right) => compareOrdinal(canonicalJsonForSort(left), canonicalJsonForSort(right)))
}

function compareStateValue(left: string | boolean, right: string | boolean): number {
  if (typeof left !== typeof right) return typeof left === "string" ? -1 : 1
  if (typeof left === "string" && typeof right === "string") return compareOrdinal(left, right)
  return Number(left) - Number(right)
}

function normalizeStateConstraints(constraints: DesignSystemManifest["components"][number]["stateConstraints"]) {
  return constraints.map(constraint => ({
    ...constraint,
    axes: Object.fromEntries(Object.keys(constraint.axes).sort(compareOrdinal).map(axis => [
      axis,
      [...constraint.axes[axis]!].sort(compareStateValue),
    ])),
  })).sort((left, right) => compareOrdinal(left.discriminator, right.discriminator) ||
    compareOrdinal(left.case, right.case) || compareOrdinal(canonicalJsonForSort(left), canonicalJsonForSort(right)))
}

function normalizeManifest(manifest: DesignSystemManifest): DesignSystemManifest {
  const tokens = manifest.tokens.map(token => ({
    ...token,
    path: [...token.path],
    domain: token.domain.kind === "enum" ? { ...token.domain, values: [...token.domain.values].sort(compareOrdinal) } : token.domain,
    ...(token.alias === undefined ? {} : { alias: { ...token.alias, targetPath: [...token.alias.targetPath] } }),
  }))
  const components = manifest.components.map(component => ({
    ...component,
    slots: [...component.slots].sort(compareOrdinal),
    variants: sortRecord(component.variants),
    extensionPoints: [...component.extensionPoints].sort(compareOrdinal),
    stateConstraints: normalizeStateConstraints(component.stateConstraints),
    defaults: Object.fromEntries(Object.keys(component.defaults).sort(compareOrdinal).map(key => [key, component.defaults[key]!])),
  }))
  const modules = manifest.modules.map(module => ({ ...module, exports: [...module.exports].sort(compareOrdinal) }))

  return {
    ...manifest,
    tokens: byIdentity(tokens),
    components: byIdentity(components),
    modules: byIdentity(modules),
    dependencies: byCanonicalValue(manifest.dependencies),
    capabilities: byCanonicalValue(manifest.capabilities),
    coverage: {
      roots: byCanonicalValue(manifest.coverage.roots),
      unresolved: byCanonicalValue(manifest.coverage.unresolved),
    },
  }
}

/** Recursively fix object key order; array order remains semantic unless normalized above. */
function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys)
  if (value === null || typeof value !== "object") return value
  const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>
  for (const key of Object.keys(value).sort(compareOrdinal)) {
    Object.defineProperty(output, key, {
      value: sortObjectKeys((value as Record<string, unknown>)[key]),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return output
}

/** Encode a validated manifest as compact UTF-8 JSON with one trailing newline. */
export function encodeCanonicalManifest(input: unknown): string {
  const manifest = decodeManifest(input)
  return `${JSON.stringify(sortObjectKeys(normalizeManifest(manifest)))}\n`
}
