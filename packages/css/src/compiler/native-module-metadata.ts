import { isThemeTokenReference } from "../theme-token"
import { sortedOwnEnumerableDataEntries } from "./record-admission"

export const NativeModuleMetadataExportName = "__crumbsModule" as const
export const NativeModuleMetadataType = "crumbs.css.native-module" as const
export const NativeModuleMetadataVersion = 1 as const

export type NativeModuleMetadata = {
  readonly $$type: typeof NativeModuleMetadataType
  readonly version: typeof NativeModuleMetadataVersion
  readonly tokens: ReadonlyArray<string>
  readonly conditions: ReadonlyArray<never>
}

/**
 * Production metadata is derived from the final native values, after
 * composition and lowering have removed overridden declarations. Conditions
 * are intentionally represented as an empty closed list until M6 introduces
 * a native condition algebra.
 */
export function createNativeModuleMetadata(
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
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
    conditions: Object.freeze([]),
  })
}

export function emitNativeModuleMetadata(classStyles: ReadonlyMap<string, Record<string, unknown>>): string {
  const metadata = createNativeModuleMetadata(classStyles)
  return `export const ${NativeModuleMetadataExportName} = Object.freeze({$$type:${JSON.stringify(metadata.$$type)},version:${metadata.version},tokens:Object.freeze(${JSON.stringify(metadata.tokens)}),conditions:Object.freeze([])});`
}
