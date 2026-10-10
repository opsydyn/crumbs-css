import {isCapturedRuntimeExtension} from './runtime-extension-model'
import type {
  StyleExplanationCoverage,
  StyleExplanationDeclaration,
  StyleExplanationMetadata,
  StyleExplanationValue,
} from "../devtools/style-explanation-model"
import { ExportRecordType } from "../export-values"
import { NativeStyleMapType } from "../native-style-map"
import { themeDependencyPathKey, type ThemeDependencyPlan } from "../runtime/theme-dependency-plan"
import { sortedOwnEnumerableDataEntries } from "./record-admission"

const STYLE_EXPLANATION_METADATA_TYPE = "crumbs.css.style-explanation-metadata" as const
const STYLE_EXPLANATION_VALUE_TYPE = "crumbs.css.style-explanation-value" as const
const STYLE_EXPLANATION_VERSION = 1 as const

export type CreateNativeStyleExplanationMetadataInput = {
  readonly moduleId: string
  readonly exportMap: ReadonlyMap<string, unknown>
  readonly classStyles: ReadonlyMap<string, Record<string, unknown>>
  readonly classCandidates: ReadonlyMap<string, ReadonlyArray<StyleExplanationDeclaration>>
  readonly dependencyPlan: ThemeDependencyPlan
}

type LogicalStyleExport = { readonly path: ReadonlyArray<string | number>; readonly className: string }

/**
 * Projects pre-composition IR candidates into a package-relative, versioned
 * sidecar. Missing source candidates are reported as compatibility-only
 * evidence limits; final output values are never used to fabricate origins.
 */
export function createNativeStyleExplanationMetadata(
  input: CreateNativeStyleExplanationMetadataInput,
): StyleExplanationMetadata {
  if (!isRelativeIdentity(input.moduleId)) {
    throw new TypeError("Style explanation module identity must be package-relative")
  }

  const dependencyTokens = new Map<string, Set<string>>()
  for (const entry of input.dependencyPlan.entries) {
    const key = themeDependencyPathKey(entry.path)
    const tokens = dependencyTokens.get(key) ?? new Set<string>()
    for (const token of entry.tokens) tokens.add(token)
    dependencyTokens.set(key, tokens)
  }

  const exports: StyleExplanationMetadata["exports"][number][] = []
  for (const logicalExport of collectLogicalStyleExports(input.exportMap)) {
    const classNames = logicalExport.className.trim().split(/\s+/u).filter(Boolean)
    const candidates: StyleExplanationMetadata["exports"][number]["candidates"][number][] = []
    let compatibilityOnly = false
    for (const className of classNames) {
      const classCandidates = input.classCandidates.get(className) ?? []
      const candidateProperties = new Set(classCandidates.map(candidate => candidate.canonicalProperty))
      const style = input.classStyles.get(className)
      if (style !== undefined) {
        for (const [property] of sortedOwnEnumerableDataEntries(style, "style explanation class style")) {
          if (!candidateProperties.has(property)) compatibilityOnly = true
        }
      }
      for (const candidate of classCandidates) {
        candidates.push({
          ...candidate,
          order: candidates.length,
          value: encodeStyleExplanationValue(candidate.value),
        })
      }
    }

    const reasons = new Set<StyleExplanationCoverage["reasons"][number]>()
    if (compatibilityOnly) reasons.add("compatibility-only")
    if (candidates.some(candidate => containsOpaqueValue(candidate.value))) reasons.add("opaque-value")
    const coverage: StyleExplanationCoverage = reasons.size === 0
      ? { status: "complete", reasons: [] }
      : { status: "partial", reasons: [...reasons].sort((left, right) => left.localeCompare(right)) }
    const tokens = dependencyTokens.get(themeDependencyPathKey(logicalExport.path)) ?? new Set<string>()
    exports.push({
      path: [...logicalExport.path],
      candidates,
      branches: [],
      tokenDependencies: [...tokens].sort((left, right) => left.localeCompare(right)),
      coverage,
    })
  }

  const metadata: StyleExplanationMetadata = {
    $$type: STYLE_EXPLANATION_METADATA_TYPE,
    version: STYLE_EXPLANATION_VERSION,
    moduleId: input.moduleId,
    exports,
  }
  return deepFreeze(metadata)
}

/** Convert an admitted compiler value to the explicit JSON-safe value domain. */
export function encodeStyleExplanationValue(input: unknown): StyleExplanationValue {
  return encodeValue(input, new Set(), 0)
}

/** Emit deterministic source that deeply freezes the generated sidecar. */
export function emitNativeStyleExplanationMetadata(metadata: StyleExplanationMetadata): string {
  if (metadata.$$type !== STYLE_EXPLANATION_METADATA_TYPE || metadata.version !== STYLE_EXPLANATION_VERSION) {
    throw new TypeError("Unsupported style explanation metadata tag or version")
  }
  return `export const __crumbsDev = ${serializeFrozenData(metadata)};`
}

function collectLogicalStyleExports(exportMap: ReadonlyMap<string, unknown>): ReadonlyArray<LogicalStyleExport> {
  const result: LogicalStyleExport[] = []
  const active = new Set<object>()
  const visit = (value: unknown, path: ReadonlyArray<string | number>): void => {
    if (isCapturedRuntimeExtension(value)) return
    if (isClassReference(value)) {
      result.push({ path: [...path], className: value.className })
      return
    }
    if (value === null || typeof value !== "object") return
    if (active.has(value)) throw new TypeError("Style explanation metadata cannot inspect cyclic export data")
    active.add(value)
    try {
      if (Array.isArray(value)) {
        value.forEach((entry, index) => visit(entry, [...path, index]))
        return
      }
      if (isNativeStyleMap(value)) {
        visit(value.styles, path)
        return
      }
      if (isCapturedExportRecord(value)) {
        for (const [key, entry] of value.entries) visit(entry, [...path, key])
      }
    } finally {
      active.delete(value)
    }
  }

  for (const [name, value] of [...exportMap.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (name === "__crumbsModule" || name === "__crumbsDev") continue
    visit(value, [name])
  }
  return Object.freeze(result.sort((left, right) => comparePath(left.path, right.path) || left.className.localeCompare(right.className)))
}

function comparePath(left: ReadonlyArray<string | number>, right: ReadonlyArray<string | number>): number {
  const length = Math.min(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const a = left[index]!
    const b = right[index]!
    const compared = typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b))
    if (compared !== 0) return compared
  }
  return left.length - right.length
}

function encodeValue(input: unknown, ancestors: Set<object>, depth: number): StyleExplanationValue {
  if (input === undefined) return valueNode({ kind: "undefined" })
  if (input === null || typeof input === "string" || typeof input === "boolean") return input
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return valueNode({ kind: "opaque", reason: "non-finite-number" })
    return Object.is(input, -0) ? valueNode({ kind: "negative-zero" }) : input
  }
  if (typeof input === "function") return valueNode({ kind: "opaque", reason: "function" })
  if (typeof input === "symbol") return valueNode({ kind: "opaque", reason: "symbol" })
  if (typeof input === "bigint") return valueNode({ kind: "opaque", reason: "bigint" })
  if (typeof input !== "object") return valueNode({ kind: "opaque", reason: "unsupported-object" })
  if (depth >= 64) return valueNode({ kind: "opaque", reason: "depth-limit" })
  if (ancestors.has(input)) return valueNode({ kind: "opaque", reason: "cycle" })

  let prototype: object | null
  let keys: ReadonlyArray<PropertyKey>
  try {
    prototype = Object.getPrototypeOf(input)
    keys = Reflect.ownKeys(input)
  } catch {
    return valueNode({ kind: "opaque", reason: "unsupported-object" })
  }
  if (prototype !== Object.prototype && prototype !== null && prototype !== Array.prototype) {
    return valueNode({ kind: "opaque", reason: "unsupported-object" })
  }
  if (keys.some(key => typeof key !== "string")) return valueNode({ kind: "opaque", reason: "symbol" })
  if (Array.isArray(input)) {
    const length = Object.getOwnPropertyDescriptor(input, "length")?.value
    const indexes = keys.filter(key => key !== "length")
    if (typeof length !== "number" || keys.length !== length + 1 || indexes.length !== length ||
      indexes.some((key, index) => key !== String(index))) {
      return valueNode({ kind: "opaque", reason: "unsupported-object" })
    }
  }

  ancestors.add(input)
  try {
    if (Array.isArray(input)) {
      const output: StyleExplanationValue[] = []
      for (let index = 0; index < input.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(input, String(index))
        if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
          return valueNode({ kind: "opaque", reason: "accessor" })
        }
        output.push(encodeValue(descriptor.value, ancestors, depth + 1))
      }
      return Object.freeze(output)
    }

    const output: Record<string, StyleExplanationValue> = Object.create(null)
    for (const key of keys as ReadonlyArray<string>) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key)
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
        return valueNode({ kind: "opaque", reason: "accessor" })
      }
      Object.defineProperty(output, key, {
        value: encodeValue(descriptor.value, ancestors, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true,
      })
    }
    return Object.freeze(output)
  } catch {
    return valueNode({ kind: "opaque", reason: "unsupported-object" })
  } finally {
    ancestors.delete(input)
  }
}

function valueNode(value: { readonly kind: "undefined" | "negative-zero" } | {
  readonly kind: "opaque"
  readonly reason: "accessor" | "cycle" | "depth-limit" | "function" | "symbol" | "bigint" | "non-finite-number" | "unsupported-object"
}): StyleExplanationValue {
  return Object.freeze({ $$type: STYLE_EXPLANATION_VALUE_TYPE, version: STYLE_EXPLANATION_VERSION, ...value }) as StyleExplanationValue
}

function containsOpaqueValue(value: StyleExplanationValue): boolean {
  if (Array.isArray(value)) return value.some(containsOpaqueValue)
  if (typeof value !== "object" || value === null) return false
  if ("kind" in value && value.kind === "opaque") return true
  return Object.values(value).some(containsOpaqueValue)
}

function isRelativeIdentity(value: string): boolean {
  if (value.length === 0 || value !== value.trim() || value.startsWith("/") || value.includes("\\") ||
    /^[A-Za-z]:/u.test(value) || /^file:/iu.test(value) || /[\u0000-\u001f\u007f]/u.test(value)) return false
  return !value.split("/").some(segment => segment === "" || segment === "." || segment === "..")
}

function isClassReference(value: unknown): value is { readonly $$type: "crumbs.css.class"; readonly className: string } {
  return typeof value === "object" && value !== null &&
    "$$type" in value && value.$$type === "crumbs.css.class" &&
    "className" in value && typeof value.className === "string"
}

function isNativeStyleMap(value: unknown): value is { readonly $$type: typeof NativeStyleMapType; readonly styles: unknown } {
  return typeof value === "object" && value !== null &&
    "$$type" in value && value.$$type === NativeStyleMapType && "styles" in value
}

function isCapturedExportRecord(value: unknown): value is { readonly $$type: typeof ExportRecordType; readonly entries: ReadonlyArray<readonly [string, unknown]> } {
  return typeof value === "object" && value !== null &&
    "$$type" in value && value.$$type === ExportRecordType && "entries" in value && Array.isArray(value.entries)
}

function deepFreeze<T>(value: T, seen = new Set<object>()): T {
  if (value === null || typeof value !== "object" || seen.has(value)) return value
  seen.add(value)
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor !== undefined && "value" in descriptor) deepFreeze(descriptor.value, seen)
  }
  return Object.freeze(value)
}

function serializeFrozenData(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value)
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new TypeError("Style explanation metadata contains an unsafe number")
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `Object.freeze([${value.map(serializeFrozenData).join(",")}])`
  if (typeof value !== "object" || value === undefined) throw new TypeError("Style explanation metadata contains unsupported data")
  const entries = sortedOwnEnumerableDataEntries(value, "style explanation metadata")
  const fields = entries.map(([key, entry]) =>
    `${key === "__proto__" ? `[${JSON.stringify(key)}]` : JSON.stringify(key)}:${serializeFrozenData(entry)}`,
  )
  return `Object.freeze({${fields.join(",")}})`
}
