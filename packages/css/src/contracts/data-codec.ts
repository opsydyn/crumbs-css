import * as Schema from "effect/Schema"
import * as Result from "effect/Result"
import * as SchemaIssue from "effect/SchemaIssue"

export type ContractIssue = {
  readonly code: "CRUMBS_CONTRACT_INVALID_PAYLOAD" | "CRUMBS_CONTRACT_INVALID_JSON" | "CRUMBS_CONTRACT_UNSUPPORTED_VERSION"
  readonly boundary: string
  readonly path: ReadonlyArray<string | number>
  readonly message: string
}
export type ContractResult<T> = { readonly ok: true; readonly value: T } |
  { readonly ok: false; readonly issues: ReadonlyArray<ContractIssue> }
export type DataCodec<T> = {
  readonly decode: (input: unknown) => ContractResult<T>
  readonly decodeJson: (input: unknown) => ContractResult<T>
  readonly encode: (input: T) => ContractResult<string>
  readonly encodeUnknown: (input: unknown) => ContractResult<string>
}
const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1()
const options = { onExcessProperty: "error", errors: "all" } as const
const MAX_DATA_DEPTH = 64

class DataIssue extends Error {
  constructor(readonly path: ReadonlyArray<string | number>, message: string) { super(message) }
}

// ADR D2/D3: do not hand getters or toJSON hooks to schema traversal/JSON encoding.
// The domain is same-realm plain data; Proxy traps are outside this contract.
function copyData(input: unknown, path: ReadonlyArray<string | number> = [], ancestors = new Set<object>()): unknown {
  if (input === null || typeof input === "string" || typeof input === "boolean" || typeof input === "number") return input
  if (typeof input !== "object") throw new DataIssue(path, "Expected plain serializable data")
  if (path.length >= MAX_DATA_DEPTH) throw new DataIssue(path, `Data exceeds ${MAX_DATA_DEPTH} nested containers`)
  if (ancestors.has(input)) throw new DataIssue(path, "Cyclic data is not supported")
  const array = Array.isArray(input)
  const prototype = Object.getPrototypeOf(input)
  if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
    throw new DataIssue(path, "Expected a plain record or array")
  }
  ancestors.add(input)
  try {
    const output: Record<string, unknown> | unknown[] = array ? [] : Object.create(null)
    const keys = Reflect.ownKeys(input)
    const length = array ? Object.getOwnPropertyDescriptor(input, "length")?.value as number : 0
    if (array && keys.length !== length + 1) throw new DataIssue(path, "Expected a dense undecorated array")
    for (const key of keys) {
      if (array && key === "length") continue
      if (typeof key !== "string") throw new DataIssue(path, "Symbol fields are not supported")
      const index = array ? Number(key) : key
      if (array && (!Number.isSafeInteger(index) || Number(index) < 0 || Number(index) >= length || String(index) !== key)) {
        throw new DataIssue(path, "Expected a dense undecorated array")
      }
      const nextPath = [...path, index]
      const descriptor = Object.getOwnPropertyDescriptor(input, key)
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        throw new DataIssue(nextPath, "Expected an own enumerable data field")
      }
      Object.defineProperty(output, key, { value: copyData(descriptor.value, nextPath, ancestors), enumerable: true, writable: true, configurable: true })
    }
    return output
  } finally { ancestors.delete(input) }
}

export function makeDataCodec<S extends Schema.ConstraintCodec<unknown, unknown, never, never>>(
  boundary: string,
  schema: S & ([S["Type"]] extends [S["Encoded"]] ? [S["Encoded"]] extends [S["Type"]] ? unknown : never : never),
): DataCodec<S["Type"]> {
  const decodeSchema = Schema.decodeUnknownResult(schema, options)
  const encodeSchema = Schema.encodeUnknownResult(schema, options)
  const failure = (code: ContractIssue["code"], path: ReadonlyArray<string | number>, message: string): ContractResult<never> =>
    ({ ok: false, issues: [{ code, boundary, path, message }] })
  const schemaFailure = (error: Schema.SchemaError): ContractResult<never> => ({
    ok: false,
    issues: formatIssues(error.issue).issues.map(issue => ({
      code: "CRUMBS_CONTRACT_INVALID_PAYLOAD" as const, boundary,
      path: (issue.path ?? []).map(segment => typeof segment === "object" ? segment.key : segment).map(key => typeof key === "number" ? key : String(key)),
      message: issue.message,
    })),
  })
  const decode = (input: unknown): ContractResult<S["Type"]> => {
    let data: unknown
    try { data = copyData(input) }
    catch (error) {
      return failure("CRUMBS_CONTRACT_INVALID_PAYLOAD", error instanceof DataIssue ? error.path : [], error instanceof DataIssue ? error.message : "Data could not be inspected")
    }
    const result = decodeSchema(data)
    if (Result.isSuccess(result)) return { ok: true, value: result.success }
    return schemaFailure(result.failure)
  }
  const encode = (input: unknown): ContractResult<string> => {
    const result = decode(input)
    if (!result.ok) return result
    // These schemas describe identical encoded/decoded plain data.
    const encoded = encodeSchema(result.value)
    if (Result.isFailure(encoded)) return schemaFailure(encoded.failure)
    return { ok: true, value: JSON.stringify(encoded.success) }
  }
  return {
    decode,
    encode,
    encodeUnknown: encode,
    decodeJson(input) {
      if (typeof input !== "string") return failure("CRUMBS_CONTRACT_INVALID_JSON", [], "Expected JSON text")
      let data: unknown
      try { data = JSON.parse(input) }
      catch { return failure("CRUMBS_CONTRACT_INVALID_JSON", [], "Invalid JSON text") }
      return decode(data)
    },
  }
}
