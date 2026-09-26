import {
  externalTokenThemeCodec,
  type ExternalTokenTheme,
} from "../contracts/payloads"
import type { ContractResult } from "../contracts/data-codec"

export { decodeTokenValue } from "./schema-value"

/** Decode a versioned external theme without constructing a runtime theme. */
export function decodeExternalTokenTheme(input: unknown): ContractResult<ExternalTokenTheme> {
  return externalTokenThemeCodec.decode(input)
}

/** Encode an already decoded external theme using its canonical JSON shape. */
export function encodeExternalTokenTheme(input: ExternalTokenTheme): ContractResult<string> {
  return externalTokenThemeCodec.encode(input)
}

export { externalTokenThemeCodec }
export type { ExternalTokenTheme }
