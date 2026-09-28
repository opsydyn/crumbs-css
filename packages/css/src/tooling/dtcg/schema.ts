import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import {
  CRUMBS_DTCG_RESOLVER_VERSIONS,
  type CrumbsDtcgDiagnostic,
  type CrumbsDtcgImportRequest,
  type CrumbsDtcgResolverVersion,
  type DtcgJsonObject,
  type DtcgOperationResult,
} from "./model"
import { decodeManifest, decodeManifestContractIdentity } from "../manifest/schema"

const MAX_INPUT_NODES = 100_000
const MAX_CONTAINER_DEPTH = 256

const resolverVersionSchema = Schema.Literals(CRUMBS_DTCG_RESOLVER_VERSIONS)
const jsonObjectSchema = Schema.Record(Schema.String, Schema.Unknown)
const absoluteUriSchema = Schema.String.check(Schema.makeFilter<string>(isAbsoluteUri))
const resolverRefSchema = Schema.Struct({ $ref: Schema.String })
const resolverSourceSchema = Schema.Union([
  resolverRefSchema,
  Schema.Record(Schema.String, Schema.Unknown),
]).check(Schema.makeFilter(value => isSource(value)))
const resolverSetSchema = Schema.Struct({ sources: Schema.Array(resolverSourceSchema) })
const resolverContextsSchema = Schema.Record(Schema.String, Schema.Array(resolverSourceSchema))
const resolverModifierSchema = Schema.Struct({
  contexts: resolverContextsSchema,
  default: Schema.optionalKey(Schema.String),
})
const inlineResolverSetSchema = Schema.Struct({
  type: Schema.Literal("set"),
  name: Schema.String,
  sources: Schema.Array(resolverSourceSchema),
})
const inlineResolverModifierSchema = Schema.Struct({
  type: Schema.Literal("modifier"),
  name: Schema.String,
  contexts: resolverContextsSchema,
  default: Schema.optionalKey(Schema.String),
})
const resolverOrderEntrySchema = Schema.Union([
  resolverRefSchema,
  inlineResolverSetSchema,
  inlineResolverModifierSchema,
])
const resolverStructureSchema = Schema.Struct({
  version: Schema.String,
  name: Schema.optionalKey(Schema.String),
  description: Schema.optionalKey(Schema.String),
  $schema: Schema.optionalKey(Schema.String),
  $defs: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
  sets: Schema.optionalKey(Schema.Record(Schema.String, resolverSetSchema)),
  modifiers: Schema.optionalKey(Schema.Record(Schema.String, resolverModifierSchema)),
  resolutionOrder: Schema.Array(resolverOrderEntrySchema),
}).check(Schema.makeFilter(value => isResolverStructure(value)))
const importRequestSchema = Schema.Struct({
  resolver: jsonObjectSchema,
  resolverUri: absoluteUriSchema,
  documents: Schema.Record(Schema.String, jsonObjectSchema),
  manifest: Schema.Unknown,
  contractIdentity: Schema.Unknown,
  modifiers: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  remBasePx: Schema.optionalKey(Schema.Finite.check(Schema.makeFilter<number>(value => value > 0))),
})

const decodeResolverVersion = Schema.decodeUnknownResult(resolverVersionSchema, {
  errors: "all",
})
const decodeResolverStructure = Schema.decodeUnknownResult(resolverStructureSchema, {
  errors: "all",
  onExcessProperty: "error",
})
const decodeImportRequest = Schema.decodeUnknownResult(importRequestSchema, {
  errors: "all",
  onExcessProperty: "error",
})

class InputSnapshotError extends Error {
  constructor(
    readonly code: "input.invalid" | "resource.limit-exceeded",
    readonly detail: string,
  ) {
    super(detail)
  }
}

function diagnostic(code: CrumbsDtcgDiagnostic["code"], message: string): CrumbsDtcgDiagnostic {
  return { code, severity: "error", message }
}

function failure<T>(code: CrumbsDtcgDiagnostic["code"], message: string): DtcgOperationResult<T> {
  return { ok: false, diagnostics: [diagnostic(code, message)] }
}

function isAbsoluteUri(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:[^\s]*$/u.test(value)
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: UnknownRecord, allowed: ReadonlyArray<string>): boolean {
  const allowedKeys = new Set(allowed)
  return Reflect.ownKeys(value).every(key => typeof key === "string" && allowedKeys.has(key))
}

function isSource(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (Object.hasOwn(value, "$ref")) {
    return hasOnlyKeys(value, ["$ref"]) && typeof value.$ref === "string"
  }
  return true
}

function isSourceArray(value: unknown): value is ReadonlyArray<unknown> {
  return Array.isArray(value) && value.every(isSource)
}

function isSetDefinition(value: unknown, inline: boolean): boolean {
  if (!isRecord(value)) return false
  const expected = inline ? ["type", "name", "sources"] : ["sources"]
  if (!hasOnlyKeys(value, expected) || !isSourceArray(value.sources)) return false
  return !inline || (value.type === "set" && typeof value.name === "string")
}

function isModifierDefinition(value: unknown, inline: boolean): boolean {
  if (!isRecord(value)) return false
  const expected = inline ? ["type", "name", "contexts", "default"] : ["contexts", "default"]
  if (!hasOnlyKeys(value, expected) || (inline && (value.type !== "modifier" || typeof value.name !== "string"))) return false
  if (value.default !== undefined && typeof value.default !== "string") return false
  const contexts = value.contexts
  if (!isRecord(contexts)) return false
  const names = Reflect.ownKeys(contexts)
  if (names.length < 2 || names.some(name => typeof name !== "string")) return false
  return names.every(name => isSourceArray(contexts[name as string]))
}

function isDefinitionMap(value: unknown, kind: "set" | "modifier"): boolean {
  if (!isRecord(value)) return false
  return Reflect.ownKeys(value).every(key => typeof key === "string"
    && (kind === "set" ? isSetDefinition(value[key], false) : isModifierDefinition(value[key], false)))
}

function isResolverOrderEntry(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (Object.hasOwn(value, "$ref")) return hasOnlyKeys(value, ["$ref"]) && typeof value.$ref === "string"
  if (value.type === "set") return isSetDefinition(value, true)
  if (value.type === "modifier") return isModifierDefinition(value, true)
  return false
}

/** Strict structural gate for the Resolver subset accepted by the DTCG adapter. */
function isResolverStructure(input: unknown): boolean {
  if (!isRecord(input)) return false
  const allowed = ["version", "name", "description", "$schema", "$defs", "sets", "modifiers", "resolutionOrder"]
  if (!hasOnlyKeys(input, allowed)
    || typeof input.version !== "string"
    || !Array.isArray(input.resolutionOrder)
    || input.resolutionOrder.length === 0
    || !input.resolutionOrder.every(isResolverOrderEntry)) return false
  if (input.name !== undefined && typeof input.name !== "string") return false
  if (input.description !== undefined && typeof input.description !== "string") return false
  if (input.$schema !== undefined && typeof input.$schema !== "string") return false
  if (input.$defs !== undefined && !isRecord(input.$defs)) return false
  if (input.sets !== undefined && !isDefinitionMap(input.sets, "set")) return false
  if (input.modifiers !== undefined && !isDefinitionMap(input.modifiers, "modifier")) return false

  const inlineNames = new Set<string>()
  for (const entry of input.resolutionOrder) {
    if (isRecord(entry) && (entry.type === "set" || entry.type === "modifier")) {
      const key = `${entry.type}:${String(entry.name)}`
      if (inlineNames.has(key)) return false
      inlineNames.add(key)
    }
  }
  return true
}

/** Copy plain JSON without invoking accessors or passing caller-owned objects to Schema. */
function snapshotJson(input: unknown): DtcgOperationResult<unknown> {
  let nodeCount = 0
  const ancestors = new Set<object>()

  const copy = (value: unknown, depth: number): unknown => {
    nodeCount += 1
    if (nodeCount > MAX_INPUT_NODES) {
      throw new InputSnapshotError(
        "resource.limit-exceeded",
        "DTCG import input exceeds the 100,000-node limit.",
      )
    }

    if (value === null || typeof value === "string" || typeof value === "boolean") return value
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new InputSnapshotError("input.invalid", "Invalid DTCG import request.")
      return value
    }
    if (typeof value !== "object") throw new InputSnapshotError("input.invalid", "Invalid DTCG import request.")
    if (depth > MAX_CONTAINER_DEPTH) {
      throw new InputSnapshotError(
        "resource.limit-exceeded",
        "DTCG import input exceeds the 256-container depth limit.",
      )
    }
    if (ancestors.has(value)) throw new InputSnapshotError("input.invalid", "Invalid DTCG import request.")

    const isArray = Array.isArray(value)
    const prototype = Object.getPrototypeOf(value)
    if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
      throw new InputSnapshotError("input.invalid", "Invalid DTCG import request.")
    }

    const keys = Reflect.ownKeys(value)
    let arrayLength = 0
    if (isArray) {
      const descriptor = Object.getOwnPropertyDescriptor(value, "length")
      if (descriptor === undefined || !("value" in descriptor) || !Number.isSafeInteger(descriptor.value)) {
        throw new InputSnapshotError("input.invalid", "Invalid DTCG import request.")
      }
      arrayLength = descriptor.value as number
      if (arrayLength < 0 || keys.length !== arrayLength + 1) {
        throw new InputSnapshotError("input.invalid", "Invalid DTCG import request.")
      }
    }

    const childCount = keys.length - (isArray ? 1 : 0)
    if (childCount > MAX_INPUT_NODES - nodeCount) {
      throw new InputSnapshotError(
        "resource.limit-exceeded",
        "DTCG import input exceeds the 100,000-node limit.",
      )
    }

    ancestors.add(value)
    try {
      const output: Record<string, unknown> | unknown[] = isArray ? [] : Object.create(null)
      for (const key of keys) {
        if (isArray && key === "length") continue
        if (typeof key !== "string") throw new InputSnapshotError("input.invalid", "Invalid DTCG import request.")

        if (isArray) {
          const index = Number(key)
          if (!Number.isSafeInteger(index) || index < 0 || index >= arrayLength || String(index) !== key) {
            throw new InputSnapshotError("input.invalid", "Invalid DTCG import request.")
          }
        }

        const descriptor = Object.getOwnPropertyDescriptor(value, key)
        if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
          throw new InputSnapshotError("input.invalid", "Invalid DTCG import request.")
        }
        const copied = copy(descriptor.value, depth + 1)
        Object.defineProperty(output, key, {
          value: copied,
          enumerable: true,
          configurable: true,
          writable: true,
        })
      }
      return output
    } finally {
      ancestors.delete(value)
    }
  }

  try {
    return { ok: true, value: copy(input, 0), diagnostics: [] }
  } catch (error) {
    if (error instanceof InputSnapshotError) return failure(error.code, error.detail)
    return failure("input.invalid", "Invalid DTCG import request.")
  }
}

/** Decode exactly the Resolver versions admitted by the Crumbs DTCG profile. */
export function decodeCrumbsDtcgResolverVersion(
  input: unknown,
): DtcgOperationResult<CrumbsDtcgResolverVersion> {
  const result = decodeResolverVersion(input)
  if (Result.isSuccess(result)) return { ok: true, value: result.success, diagnostics: [] }
  return failure("resolver.version-unsupported", "Unsupported Crumbs DTCG Resolver version.")
}

/** Safely snapshot and structurally decode the Resolver subset used by selection. */
export function decodeDtcgResolverStructure(
  input: unknown,
  resolverUri: string,
): DtcgOperationResult<DtcgJsonObject> {
  const snapshot = snapshotJson(input)
  if (!snapshot.ok) {
    const issue: CrumbsDtcgDiagnostic = {
      code: snapshot.diagnostics[0]!.code,
      severity: "error",
      message: snapshot.diagnostics[0]!.message,
      documentUri: resolverUri,
      jsonPointer: "",
    }
    return { ok: false, diagnostics: [issue] }
  }

  const parsed = decodeResolverStructure(snapshot.value)
  if (Result.isFailure(parsed)) {
    return {
      ok: false,
      diagnostics: [{
        code: "format.structure-invalid",
        severity: "error",
        message: "Invalid DTCG Resolver structure.",
        documentUri: resolverUri,
        jsonPointer: "",
      }],
    }
  }
  return { ok: true, value: parsed.success as DtcgJsonObject, diagnostics: [] }
}

/** Safely snapshot and validate a public import request before any resolver work. */
export function decodeDtcgImportRequest(input: unknown): DtcgOperationResult<CrumbsDtcgImportRequest> {
  const snapshot = snapshotJson(input)
  if (!snapshot.ok) return snapshot

  const parsed = decodeImportRequest(snapshot.value)
  if (Result.isFailure(parsed)) return failure("input.invalid", "Invalid DTCG import request.")

  try {
    const manifest = decodeManifest(parsed.success.manifest)
    const contractIdentity = decodeManifestContractIdentity(parsed.success.contractIdentity)
    const documents = parsed.success.documents as Readonly<Record<string, DtcgJsonObject>>
    if (Object.keys(documents).some(uri => !isAbsoluteUri(uri))) {
      return failure("input.invalid", "Invalid DTCG import request.")
    }

    const request: CrumbsDtcgImportRequest = {
      resolver: parsed.success.resolver as DtcgJsonObject,
      resolverUri: parsed.success.resolverUri,
      documents,
      manifest,
      contractIdentity,
      ...(parsed.success.modifiers === undefined ? {} : { modifiers: parsed.success.modifiers }),
      ...(parsed.success.remBasePx === undefined ? {} : { remBasePx: parsed.success.remBasePx }),
    }
    return { ok: true, value: request, diagnostics: [] }
  } catch {
    return failure("input.invalid", "Invalid DTCG import request.")
  }
}
