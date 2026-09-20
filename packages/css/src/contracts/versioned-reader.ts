import {
  nativeArtifactCodec,
  NativeArtifactVersion,
  type NativeArtifact,
} from "./payloads"
import type { ContractResult, DataCodec } from "./data-codec"

/**
 * A reader entry is a lossless wire codec for one artifact version.
 *
 * This module deliberately stops at data admission. Native lowering and
 * generated-module emission are separate compiler stages and are not part of
 * artifact decoding or encoding.
 */
export type NativeArtifactReaderEntry = {
  readonly version: number
  readonly codec: DataCodec<NativeArtifact>
}

export type NativeArtifactReader = DataCodec<NativeArtifact> & {
  readonly supportedVersions: ReadonlyArray<number>
}

const readerBoundary = "native-artifact-reader"

function failure<T>(
  code: "CRUMBS_CONTRACT_INVALID_JSON" | "CRUMBS_CONTRACT_UNSUPPORTED_VERSION",
  path: ReadonlyArray<string | number>,
  message: string,
): ContractResult<T> {
  return { ok: false, issues: [{ code, boundary: readerBoundary, path, message }] }
}

function inspectVersion(input: unknown): number | undefined {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return undefined
  const tag = Object.getOwnPropertyDescriptor(input, "_tag")
  const version = Object.getOwnPropertyDescriptor(input, "version")
  if (!tag || !version || !("value" in tag) || !("value" in version)) return undefined
  if (tag.value !== "NativeArtifact" || typeof version.value !== "number") return undefined
  if (!Number.isSafeInteger(version.value) || version.value <= 0) return undefined
  return version.value
}

function unsupported(version: number, supportedVersions: ReadonlyArray<number>): ContractResult<never> {
  const supported = supportedVersions.length > 0 ? supportedVersions.join(", ") : "none"
  return failure(
    "CRUMBS_CONTRACT_UNSUPPORTED_VERSION",
    ["version"],
    `Unsupported native-artifact version ${version}; supported versions: ${supported}`,
  )
}

function createReaders(entries: ReadonlyArray<NativeArtifactReaderEntry>): {
  readonly readers: ReadonlyMap<number, DataCodec<NativeArtifact>>
  readonly supportedVersions: ReadonlyArray<number>
} {
  const readers = new Map<number, DataCodec<NativeArtifact>>()
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.version) || entry.version <= 0) {
      throw new Error(`Artifact reader versions must be positive safe integers: ${entry.version}`)
    }
    if (readers.has(entry.version)) throw new Error(`Duplicate artifact reader version: ${entry.version}`)
    readers.set(entry.version, entry.codec)
  }
  const supportedVersions = Object.freeze([...readers.keys()].sort((left, right) => left - right))
  return { readers, supportedVersions }
}

export function makeNativeArtifactReader(
  entries: ReadonlyArray<NativeArtifactReaderEntry> = [{ version: NativeArtifactVersion, codec: nativeArtifactCodec }],
): NativeArtifactReader {
  const { readers, supportedVersions } = createReaders(entries)

  const decode = (input: unknown): ContractResult<NativeArtifact> => {
    const version = inspectVersion(input)
    if (version !== undefined) {
      const reader = readers.get(version)
      if (!reader) return unsupported(version, supportedVersions)
      return reader.decode(input)
    }
    // The canonical v1 codec retains ordinary schema errors for malformed
    // envelopes, missing versions and descriptor-safe data failures.
    return nativeArtifactCodec.decode(input)
  }

  const encode = (input: NativeArtifact): ContractResult<string> => {
    const reader = readers.get(input.version)
    if (!reader) return unsupported(input.version, supportedVersions)
    return reader.encode(input)
  }

  return {
    supportedVersions,
    decode,
    encode,
    encodeUnknown(input) {
      const decoded = decode(input)
      if (!decoded.ok) return decoded
      const reader = readers.get(decoded.value.version)
      if (!reader) return unsupported(decoded.value.version, supportedVersions)
      return reader.encode(decoded.value)
    },
    decodeJson(input) {
      if (typeof input !== "string") return failure("CRUMBS_CONTRACT_INVALID_JSON", [], "Expected JSON text")
      let data: unknown
      try { data = JSON.parse(input) }
      catch { return failure("CRUMBS_CONTRACT_INVALID_JSON", [], "Invalid JSON text") }
      return decode(data)
    },
  }
}

export const nativeArtifactReader = makeNativeArtifactReader()
