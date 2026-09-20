import { ExportNegativeZeroType, ExportRecordType, ExportStringType, ExportUndefinedType } from "../export-values"
import { NativeStyleMapType } from "../native-style-map"
import { emitNativeModuleMetadata, NativeModuleMetadataExportName } from "./native-module-metadata"
import { sortedOwnEnumerableDataEntries } from "./record-admission"

export type BuildStyleSheetCodeOptions = {
  readonly useStyleSheet?: boolean
  readonly cacheIdentity?: string
}

/**
 * Emits the final native module from already validated compiler outputs.
 * Inputs are ordered at this boundary so equivalent maps produce byte-stable
 * modules while encoded export records retain their authored semantic order.
 */
export function emitStyleSheetModule(
  exportMap: ReadonlyMap<string, unknown>,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
  depRelativePaths: ReadonlyArray<string> = [],
  options: BuildStyleSheetCodeOptions = {},
): string {
  if (exportMap.has(NativeModuleMetadataExportName)) {
    throw new TypeError(`Native module export "${NativeModuleMetadataExportName}" is reserved for generated metadata`)
  }

  const useStyleSheet = options.useStyleSheet ?? true
  const createEntries = [...classStyles.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([cls, styles]) => `  ${JSON.stringify(cls)}: ${serializeRuntimeValue(styles)}`)
    .join(",\n")

  const exports = [...exportMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => serializeStyleExport(name, value, classStyles))
    .join("\n")

  const depImports = [...new Set(depRelativePaths)]
    .sort((left, right) => left.localeCompare(right))
    .map((dependency) => `import ${JSON.stringify(dependency)};`)
    .join("\n")
  const cacheMarker = options.cacheIdentity === undefined
    ? ""
    : `/* @crumbs-native-cache ${options.cacheIdentity} */`

  const parts = [
    cacheMarker,
    useStyleSheet ? `import { StyleSheet } from "react-native";` : "",
    depImports,
    useStyleSheet
      ? `const _s = StyleSheet.create({\n${createEntries}\n});`
      : `const _s = {\n${createEntries}\n};`,
    emitNativeModuleMetadata(classStyles),
    exports,
  ].filter(Boolean)

  return parts.join("\n")
}

function serializeRuntimeValue(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Native style output contains a non-finite number")
    return Object.is(value, -0) ? "-0" : JSON.stringify(value)
  }
  if (typeof value === "string" || typeof value === "boolean" || value === null) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(serializeRuntimeValue).join(",")}]`
  if (typeof value === "object" && value !== null) {
    const entries = sortedOwnEnumerableDataEntries(value, "native style output").map(([key, entry]) => {
      const property = key === "__proto__" ? `[${JSON.stringify(key)}]` : JSON.stringify(key)
      return `${property}:${serializeRuntimeValue(entry)}`
    })
    return `{${entries.join(",")}}`
  }
  throw new TypeError(`Native style output contains unsupported ${typeof value}`)
}

function serializeStyleExport(
  name: string,
  value: unknown,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
): string {
  if (typeof value === "string") {
    return classStyles.has(value)
      ? `export const ${name} = _s[${JSON.stringify(value)}];`
      : `export const ${name} = undefined;`
  }

  return `export const ${name} = ${serializeExportValue(value, classStyles)};`
}

function serializeExportValue(
  value: unknown,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
): string {
  if (typeof value === "object" && value !== null && "$$type" in value) {
    if (value.$$type === ExportStringType && "value" in value) return JSON.stringify(value.value)
    if (value.$$type === ExportUndefinedType) return "undefined"
    if (value.$$type === ExportNegativeZeroType) return "-0"
    if (value.$$type === ExportRecordType && "entries" in value) {
      const entries = (value.entries as Array<[string, unknown]>).map(([key, entry]) =>
        `${key === "__proto__" ? `[${JSON.stringify(key)}]` : JSON.stringify(key)}: ${serializeExportValue(entry, classStyles)}`,
      ).join(", ")
      const record = `{ ${entries} }`
      return "nullPrototype" in value && value.nullPrototype === true ? `Object.assign(Object.create(null), ${record})` : record
    }
  }
  if (typeof value === "object" && value !== null && "$$type" in value && value.$$type === NativeStyleMapType && "styles" in value) {
    return `Object.defineProperty(${serializeExportValue(value.styles, classStyles)}, Symbol.for(${JSON.stringify(NativeStyleMapType)}), { value: true, enumerable: true })`
  }
  if (isRecipeClassRef(value)) {
    return classStyles.has(value.className) ? `_s[${JSON.stringify(value.className)}]` : "undefined"
  }
  if (typeof value === "string") {
    return classStyles.has(value) ? `_s[${JSON.stringify(value)}]` : JSON.stringify(value)
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null || value === undefined) {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map((entry) => serializeExportValue(entry, classStyles)).join(", ")}]`
  if (typeof value === "object") {
    const entries = sortedOwnEnumerableDataEntries(value, "compiled export")
      .map(([key, entry]) => {
        const property = key === "__proto__" ? `[${JSON.stringify(key)}]` : JSON.stringify(key)
        return `${property}: ${serializeExportValue(entry, classStyles)}`
      })
      .join(", ")
    return `{ ${entries} }`
  }

  return "undefined"
}

function isRecipeClassRef(value: unknown): value is { readonly className: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$$type" in value &&
    value.$$type === "crumbs.css.class" &&
    "className" in value &&
    typeof value.className === "string"
  )
}
