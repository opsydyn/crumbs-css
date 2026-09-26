import * as Schema from "effect/Schema"
import type { TokenDomain, TokenDomainValue } from "../theme-token"

/** Decode one external token value without loading external-theme contracts. */
export function decodeTokenValue<TDomain extends TokenDomain>(
  domain: TDomain,
  value: unknown,
): TokenDomainValue<TDomain> {
  return Schema.decodeUnknownSync(schemaForDomain(domain))(value) as TokenDomainValue<TDomain>
}

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
