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
