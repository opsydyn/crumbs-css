import {
  registerThemeTokenContract,
  type DomainThemeVar,
  type NativeThemeVar,
  type TokenDomain,
  type TokenDomainValue,
  type ThemeTokenDomainMetadata,
} from "../theme-token"
import {
  createTheme,
  createThemeContract,
  type NativeTheme,
  type ThemeContractInput,
} from "../native-style"

export type TokenDomainDefinition =
  | "color"
  | "duration"
  | "opacity"
  | "length"
  | { readonly kind: "color" }
  | { readonly kind: "duration" }
  | { readonly kind: "opacity" }
  | { readonly kind: "length"; readonly allowNegative?: boolean }
  | { readonly kind: "enum"; readonly values: ReadonlyArray<string> }

type NormalizedDomain<TDefinition extends TokenDomainDefinition> =
  TDefinition extends "color" | { readonly kind: "color" } ? { readonly kind: "color" }
    : TDefinition extends "duration" | { readonly kind: "duration" } ? { readonly kind: "duration" }
      : TDefinition extends "opacity" | { readonly kind: "opacity" } ? { readonly kind: "opacity" }
        : TDefinition extends "length" | { readonly kind: "length" }
          ? { readonly kind: "length"; readonly allowNegative: TDefinition extends { readonly allowNegative: true } ? true : false }
          : TDefinition extends { readonly kind: "enum"; readonly values: infer TValues }
            ? TValues extends ReadonlyArray<string> ? { readonly kind: "enum"; readonly values: TValues } : never
            : never

export const TokenDefinitionType = "crumbs.css.token-definition" as const
export type TokenDefinition<TDomain extends TokenDomain = TokenDomain> = {
  readonly $$type: typeof TokenDefinitionType
  readonly domain: TDomain
}

export type TokenContractInput = {
  readonly [key: string]: TokenContractInput | TokenDefinition
}

export type TokenDefinitionInput<TDefinition extends TokenDomainDefinition = TokenDomainDefinition> = TokenDefinition<NormalizedDomain<TDefinition>>

export type TokenContract<TShape extends TokenContractInput> = {
  readonly [K in keyof TShape]: TShape[K] extends TokenDefinitionInput<infer TDefinition>
    ? TShape[K] extends { readonly domain: infer TDomain extends TokenDomain }
      ? DomainThemeVar<TDomain>
      : never
    : TShape[K] extends TokenContractInput
      ? TokenContract<TShape[K]>
      : never
}

export type TokenThemeValues<TContract> = {
  readonly [K in keyof TContract]: TContract[K] extends DomainThemeVar<infer TDomain>
    ? TokenDomainValue<TDomain>
    : TContract[K] extends Readonly<Record<string, unknown>>
      ? TokenThemeValues<TContract[K]>
      : never
}

export function defineToken<const TDefinition extends TokenDomainDefinition>(
  definition: TDefinition,
): TokenDefinition<NormalizedDomain<TDefinition>>
export function defineToken<const TKind extends "color" | "duration" | "opacity" | "length">(
  kind: TKind,
): TokenDefinition<NormalizedDomain<TKind>>
export function defineToken(
  definition: TokenDomainDefinition,
): TokenDefinition {
  const domain = normalizeDomain(definition)
  return Object.freeze({
    $$type: TokenDefinitionType,
    domain: Object.freeze(domain),
  }) as TokenDefinition
}

/** Concise factories for the common native design-token domains. */
export const token = Object.freeze({
  color: (): TokenDefinition<{ readonly kind: "color" }> => defineToken("color"),
  length: (options: { readonly allowNegative?: boolean } = {}): TokenDefinition<{ readonly kind: "length"; readonly allowNegative: boolean }> =>
    defineToken({ kind: "length", allowNegative: options.allowNegative === true }),
  duration: (): TokenDefinition<{ readonly kind: "duration" }> => defineToken("duration"),
  opacity: (): TokenDefinition<{ readonly kind: "opacity" }> => defineToken("opacity"),
  enum: <const TValues extends ReadonlyArray<string>>(values: TValues): TokenDefinition<{ readonly kind: "enum"; readonly values: TValues }> =>
    defineToken({ kind: "enum", values }),
})

export function isTokenDefinition(value: unknown): value is TokenDefinition {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const keys = Object.keys(value)
  if (keys.length !== 2 || !keys.includes("$$type") || !keys.includes("domain")) return false
  const tag = Object.getOwnPropertyDescriptor(value, "$$type")
  const domain = Object.getOwnPropertyDescriptor(value, "domain")
  return tag !== undefined && "value" in tag && tag.enumerable === true && tag.value === TokenDefinitionType &&
    domain !== undefined && "value" in domain && domain.enumerable === true && isTokenDomain(domain.value)
}

export function createTokenContract<const TShape extends TokenContractInput>(
  shape: TShape,
): TokenContract<TShape> {
  const legacyContract = createThemeContract(toLegacyShape(shape))
  const domains = new Map<string, ThemeTokenDomainMetadata>()
  const contract = mapContract(shape, legacyContract, [], domains) as TokenContract<TShape>
  registerThemeTokenContract(contract as object, domains)
  return contract
}

export function createTokenTheme<TContract extends Readonly<Record<string, unknown>>>(
  contract: TContract,
  values: TokenThemeValues<TContract>,
): NativeTheme<TContract> {
  return createTheme(contract, values as never)
}

export function isTokenDomainValue(domain: TokenDomain, value: unknown): boolean {
  switch (domain.kind) {
    case "color":
      return typeof value === "string" && value.length > 0
    case "length":
      if (value === "auto") return true
      if (typeof value === "number") return Number.isFinite(value) && (domain.allowNegative || value >= 0)
      if (typeof value !== "string") return false
      if (!new RegExp(`^${domain.allowNegative ? "[+-]?" : "\\+?"}(?:\\d+(?:\\.\\d*)?|\\.\\d+)%$`).test(value)) return false
      return Number.isFinite(Number.parseFloat(value))
    case "duration":
      return typeof value === "number" && Number.isFinite(value) && value >= 0
    case "opacity":
      return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    case "enum":
      return typeof value === "string" && domain.values.includes(value)
  }
}
function normalizeDomain(definition: TokenDomainDefinition): TokenDomain {
  if (definition === "color" || (typeof definition === "object" && definition.kind === "color")) return { kind: "color" }
  if (definition === "duration" || (typeof definition === "object" && definition.kind === "duration")) return { kind: "duration" }
  if (definition === "opacity" || (typeof definition === "object" && definition.kind === "opacity")) return { kind: "opacity" }
  if (definition === "length" || (typeof definition === "object" && definition.kind === "length")) {
    return { kind: "length", allowNegative: typeof definition === "object" && definition.allowNegative === true }
  }
  if (typeof definition === "object" && definition.kind === "enum") {
    if (definition.values.length === 0 || definition.values.some(value => typeof value !== "string" || value.length === 0)) {
      throw new Error("Token enum domains require one or more non-empty string values")
    }
    if (new Set(definition.values).size !== definition.values.length) {
      throw new Error("Token enum domains cannot contain duplicate values")
    }
    return { kind: "enum", values: [...definition.values] }
  }
  throw new Error(`Unsupported token domain: ${String(definition)}`)
}

function isTokenDomain(value: unknown): value is TokenDomain {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const kind = (value as { readonly kind?: unknown }).kind
  if (kind === "color" || kind === "duration" || kind === "opacity") return Object.keys(value).length === 1
  if (kind === "length") return Object.keys(value).length === 2 && typeof (value as { allowNegative?: unknown }).allowNegative === "boolean"
  if (kind === "enum") {
    const values = (value as { readonly values?: unknown }).values
    return Object.keys(value).length === 2 && Array.isArray(values) && values.length > 0 && values.every(entry => typeof entry === "string" && entry.length > 0)
  }
  return false
}


function toLegacyShape(shape: TokenContractInput): ThemeContractInput {
  if (!isRecord(shape)) throw new Error("Token contracts must be nested records of token definitions")
  const result: Record<string, ThemeContractInput | null> = {}
  for (const [key, value] of Object.entries(shape)) {
    result[key] = isTokenDefinitionInput(value) ? null : toLegacyShape(value)
  }
  return result
}

function mapContract(
  shape: TokenContractInput,
  legacyContract: unknown,
  path: ReadonlyArray<string>,
  domains: Map<string, ThemeTokenDomainMetadata>,
): unknown {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(shape)) {
    const nextPath = [...path, key]
    const legacyValue = getPath(legacyContract, nextPath)
    if (isTokenDefinitionInput(value)) {
      const reference = legacyValue as NativeThemeVar
      domains.set(String(reference), {
        domain: value.domain,
        validate: candidate => isTokenDomainValue(value.domain, candidate),
      })
      result[key] = reference as unknown as DomainThemeVar<TokenDomain>
    } else {
      result[key] = mapContract(value, legacyContract, nextPath, domains)
    }
  }
  return result
}

function isTokenDefinitionInput(value: unknown): value is TokenDefinition {
  return isTokenDefinition(value)
}

function getPath(root: unknown, path: ReadonlyArray<string>): unknown {
  let cursor = root
  for (const key of path) {
    if (!isRecord(cursor) || !(key in cursor)) throw new Error(`Token contract path not found: ${path.join(".")}`)
    cursor = cursor[key]
  }
  return cursor
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
