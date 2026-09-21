import * as Schema from "effect/Schema"
import type { TokenDomain, TokenDomainValue } from "../theme-token"
import {
  externalTokenThemeCodec,
  type ExternalTokenTheme,
} from "../contracts/payloads"
import type { ContractResult } from "../contracts/data-codec"

/**
 * Effect 4 ingress decoder for external token values. This lives in the
 * dedicated schema entrypoint; the authoring contract entrypoint remains
 * service-free and does not pull Effect into ordinary consumer bundles.
 */
export function decodeTokenValue<TDomain extends TokenDomain>(
  domain: TDomain,
  value: unknown,
): TokenDomainValue<TDomain> {
  return Schema.decodeUnknownSync(schemaForDomain(domain))(value) as TokenDomainValue<TDomain>
}

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

function schemaForDomain(domain: TokenDomain) {
  switch (domain.kind) {
    case "color":
      return Schema.NonEmptyString
    case "length": {
      const sign = domain.allowNegative ? "[+-]?" : "\\+?"
      const percentage = Schema.String.check(
        Schema.isPattern(new RegExp(`^${sign}(?:\\d+(?:\\.\\d*)?|\\.\\d+)%$`)),
        Schema.makeFilter<string>(value => Number.isFinite(Number.parseFloat(value))),
      )
      const number = Schema.Finite.check(Schema.makeFilter<number>(value => domain.allowNegative || value >= 0))
      return Schema.Union([number, percentage, Schema.Literal("auto")])
    }
    case "duration":
      return Schema.Finite.check(Schema.makeFilter<number>(value => value >= 0))
    case "opacity":
      return Schema.Finite.check(Schema.makeFilter<number>(value => value >= 0 && value <= 1))
    case "enum":
      return Schema.String.check(Schema.makeFilter<string>(value => domain.values.includes(value)))
  }
}
