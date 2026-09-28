import type {
  CrumbsDtcgDiagnostic,
  DtcgJsonObject,
  DtcgJsonValue,
  DtcgOperationResult,
  DtcgOrigin,
} from "./model"

export type ResolvedDtcgReference = {
  readonly value: DtcgJsonValue
  /** Canonical URI of the explicitly supplied document. */
  readonly documentUri: string
  /** Decoded RFC 6901 JSON Pointer, without URI-fragment percent encoding. */
  readonly jsonPointer: string
  /** Location of the reference that led to this target. */
  readonly referringOrigin: DtcgOrigin
}

function makeFailure<T>(
  code: CrumbsDtcgDiagnostic["code"],
  message: string,
  origin: DtcgOrigin,
  reference?: string,
): DtcgOperationResult<T> {
  const issue: CrumbsDtcgDiagnostic = {
    code,
    severity: "error",
    message,
    documentUri: origin.documentUri,
    jsonPointer: origin.jsonPointer,
    ...(reference === undefined ? {} : { referenceChain: [reference] }),
  }
  return { ok: false, diagnostics: [issue] }
}

function canonicalDocumentUri(input: string): string | undefined {
  try {
    const uri = new URL(input)
    if (uri.hash !== "") return undefined
    return uri.href
  } catch {
    return undefined
  }
}

/** Canonicalize only caller-supplied URI keys and reject aliases of one key. */
export function indexDtcgDocuments(
  documents: Readonly<Record<string, DtcgJsonObject>>,
): DtcgOperationResult<ReadonlyMap<string, DtcgJsonObject>> {
  const indexed = new Map<string, DtcgJsonObject>()
  try {
    const prototype = Object.getPrototypeOf(documents)
    if (prototype !== Object.prototype && prototype !== null) {
      return makeFailure("input.invalid", "DTCG documents must be a plain URI map.", { documentUri: "", jsonPointer: "" })
    }

    const keys = Reflect.ownKeys(documents)
    if (keys.some(key => typeof key !== "string")) {
      return makeFailure("input.invalid", "DTCG documents must be a plain URI map.", { documentUri: "", jsonPointer: "" })
    }

    for (const key of keys as ReadonlyArray<string>) {
      const descriptor = Object.getOwnPropertyDescriptor(documents, key)
      if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
        return makeFailure("input.invalid", "DTCG documents must be a plain URI map.", { documentUri: "", jsonPointer: "" })
      }
      const uri = canonicalDocumentUri(key)
      if (uri === undefined) {
        return makeFailure("input.invalid", "DTCG document keys must be absolute URIs without fragments.", { documentUri: key, jsonPointer: "" })
      }
      if (indexed.has(uri)) {
        return makeFailure("input.invalid", "DTCG documents contain duplicate canonical URIs.", { documentUri: uri, jsonPointer: "" })
      }
      indexed.set(uri, descriptor.value as DtcgJsonObject)
    }

    const entries = [...indexed.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    return { ok: true, value: new Map(entries), diagnostics: [] }
  } catch {
    return makeFailure("input.invalid", "DTCG documents must be a plain URI map.", { documentUri: "", jsonPointer: "" })
  }
}

function decodePointer(fragment: string): ReadonlyArray<string> | undefined {
  let pointer: string
  try {
    pointer = decodeURIComponent(fragment)
  } catch {
    return undefined
  }
  if (pointer === "") return []
  if (!pointer.startsWith("/")) return undefined

  const segments: Array<string> = []
  for (const encodedSegment of pointer.slice(1).split("/")) {
    if (/~(?![01])/u.test(encodedSegment)) return undefined
    // Decode ~1 first; ~01 must decode to the literal sequence ~1.
    segments.push(encodedSegment.replace(/~1/gu, "/").replace(/~0/gu, "~"))
  }
  return segments
}

function encodePointer(segments: ReadonlyArray<string>): string {
  if (segments.length === 0) return ""
  return `/${segments.map(segment => segment.replace(/~/gu, "~0").replace(/\//gu, "~1")).join("/")}`
}

function readPointer(root: DtcgJsonValue, segments: ReadonlyArray<string>): DtcgJsonValue | undefined {
  let current: DtcgJsonValue = root
  for (const segment of segments) {
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9]\d*)$/u.test(segment)) return undefined
      const index = Number(segment)
      if (!Number.isSafeInteger(index) || index >= current.length || !Object.hasOwn(current, index)) return undefined
      current = current[index]!
      continue
    }
    if (current === null || typeof current !== "object" || !Object.hasOwn(current, segment)) return undefined
    current = (current as DtcgJsonObject)[segment]!
  }
  return current
}

/** Resolve a URI reference and optional JSON Pointer using only a pre-indexed map. */
export function resolveDtcgReference(
  reference: string,
  baseUri: string,
  documents: ReadonlyMap<string, DtcgJsonObject>,
  referringOrigin: DtcgOrigin = { documentUri: baseUri, jsonPointer: "" },
): DtcgOperationResult<ResolvedDtcgReference> {
  let target: URL
  try {
    if (typeof reference !== "string" || typeof baseUri !== "string") throw new TypeError("URI must be a string")
    target = new URL(reference, baseUri)
  } catch {
    return makeFailure("format.structure-invalid", "Invalid DTCG document reference.", referringOrigin, reference)
  }

  const segments = decodePointer(target.hash.slice(1))
  if (segments === undefined) {
    return makeFailure("format.structure-invalid", "Invalid DTCG JSON Pointer fragment.", referringOrigin, reference)
  }

  target.hash = ""
  const documentUri = target.href
  const document = documents.get(documentUri)
  if (document === undefined) {
    return makeFailure("reference.missing", "Referenced DTCG document or JSON Pointer was not found.", referringOrigin, reference)
  }

  const pointer = encodePointer(segments)
  const value = readPointer(document, segments)
  if (value === undefined) {
    return makeFailure("reference.missing", "Referenced DTCG document or JSON Pointer was not found.", referringOrigin, reference)
  }

  return {
    ok: true,
    value: { value, documentUri, jsonPointer: pointer, referringOrigin },
    diagnostics: [],
  }
}
