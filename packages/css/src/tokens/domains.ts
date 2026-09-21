import {
  formatNativeStylesDiagnostic,
  NativeStylesDiagnosticCode,
} from "../diagnostics"
import {
  assertThemeContractIdentityAvailable,
  getThemeContractIdentity,
  getThemeContractIdentityKey,
  getThemeContractShapeSignature,
  getThemeTokenAliasForContract,
  getThemeTokenDomainForContract,
  getThemeTokenOrigin,
  getThemeTokenPublicId,
  registerThemeTokenReference,
  registerThemeTokenContract,
  type DomainThemeVar,
  type NativeThemeVar,
  type TokenDomain,
  type TokenDomainValue,
  type ThemeTokenAliasMetadata,
  type ThemeTokenDomainMetadata,
  type ThemeTokenOrigin,
  type ThemeTokenOriginStep,
  type ThemeVar,
  type ExternalTokenThemePayload,
  type nativeThemeValuesBrand,
} from "../theme-token"
import {
  createTheme,
  createThemeContract,
  getThemeTokenPath,
  getThemeVarName,
  isThemeVar,
  type NativeTheme,
  type ThemeContractInput,
} from "../native-style"
import {
  normalizeTokenContractIdentity,
  tokenContractShapeSignature,
  tokenPublicId,
  tokenVariableName,
  type TokenContractIdentity,
  type TokenContractIdentityInput,
} from "./identity"

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

export type TokenAliasTarget = string | ReadonlyArray<string>

export type TokenAliasDefinition<
  TTarget extends TokenAliasTarget = TokenAliasTarget,
  TDomain extends TokenDomain | undefined = undefined,
> = {
  readonly $$type: typeof TokenAliasDefinitionType
  readonly target: TTarget
  readonly domain?: TDomain
  readonly fallback?: TDomain extends TokenDomain ? TokenDomainValue<TDomain> : string | number
}

type AnyTokenAliasDefinition = TokenAliasDefinition<TokenAliasTarget, TokenDomain | undefined>

export const TokenDefinitionType = "crumbs.css.token-definition" as const
export const TokenAliasDefinitionType = "crumbs.css.token-alias" as const
export type TokenDefinition<TDomain extends TokenDomain = TokenDomain> = {
  readonly $$type: typeof TokenDefinitionType
  readonly domain: TDomain
}

export type TokenContractInput = {
  readonly [key: string]: TokenContractInput | TokenDefinition | AnyTokenAliasDefinition
}

export type TokenContractOptions = TokenContractIdentityInput

export type TokenDefinitionInput<TDefinition extends TokenDomainDefinition = TokenDomainDefinition> = TokenDefinition<NormalizedDomain<TDefinition>>

declare const tokenContractShapeBrand: unique symbol

type SplitTokenPath<TPath extends string> =
  TPath extends `${infer THead}.${infer TTail}`
    ? THead extends "" ? SplitTokenPath<TTail> : [THead, ...SplitTokenPath<TTail>]
    : TPath extends "" ? [] : [TPath]

type LookupTokenShape<TShape, TPath extends ReadonlyArray<string>> =
  TPath extends readonly [infer THead extends string, ...infer TRest extends string[]]
    ? THead extends keyof TShape
      ? TRest extends [] ? TShape[THead] : LookupTokenShape<TShape[THead], TRest>
      : never
    : never

type AliasTargetPath<TTarget> =
  TTarget extends ReadonlyArray<string> ? TTarget
    : TTarget extends string ? SplitTokenPath<TTarget>
      : never

type AliasTargetValue<TShape, TTarget> = LookupTokenShape<TShape, AliasTargetPath<TTarget>>
type AliasTargetDomain<TShape, TTarget, TDeclaredDomain, TDepth extends ReadonlyArray<unknown> = []> =
  TDepth["length"] extends 8 ? TokenDomain
    : [TDeclaredDomain] extends [TokenDomain] ? TDeclaredDomain
    : AliasTargetValue<TShape, TTarget> extends TokenDefinition<infer TDomain>
      ? TDomain
      : AliasTargetValue<TShape, TTarget> extends TokenAliasDefinition<infer TNestedTarget, infer TNestedDomain>
        ? AliasTargetDomain<TShape, TNestedTarget, TNestedDomain, [...TDepth, unknown]>
      : TokenDomain

type TokenContractValue<TRootShape, TShape, TValue> =
  TValue extends TokenDefinition<infer TDomain>
    ? DomainThemeVar<TDomain>
    : TValue extends TokenAliasDefinition<infer TTarget, infer TDeclaredDomain>
      ? DomainThemeVar<AliasTargetDomain<TRootShape, TTarget, TDeclaredDomain>>
      : TValue extends TokenContractInput
        ? TokenContractNode<TRootShape, TValue>
        : never

type TokenContractNode<TRootShape, TShape extends TokenContractInput> = {
  readonly [K in keyof TShape]: TokenContractValue<TRootShape, TShape, TShape[K]>
}

type ResolvedTokenThemeValues<TContract> = {
  readonly [K in keyof TContract]: TContract[K] extends DomainThemeVar<infer TDomain>
    ? TokenDomainValue<TDomain>
    : TContract[K] extends Readonly<Record<string, unknown>>
      ? ResolvedTokenThemeValues<TContract[K]>
      : never
}

export type TokenContract<TShape extends TokenContractInput> = TokenContractNode<TShape, TShape> & {
  readonly [tokenContractShapeBrand]?: TShape
  readonly [nativeThemeValuesBrand]: ResolvedTokenThemeValues<TokenContractNode<TShape, TShape>>
}

type HasRequiredToken<TValue> =
  TValue extends AnyTokenAliasDefinition ? false
    : TValue extends TokenDefinition ? true
      : TValue extends TokenContractInput
        ? true extends {[K in keyof TValue]: HasRequiredToken<TValue[K]>}[keyof TValue] ? true : false
        : false

type TokenThemeValuesForShape<TShape extends TokenContractInput> = {
  readonly [K in keyof TShape as TShape[K] extends AnyTokenAliasDefinition
    ? never
    : TShape[K] extends TokenContractInput
      ? HasRequiredToken<TShape[K]> extends true ? K : never
      : K]:
    TShape[K] extends TokenDefinition<infer TDomain>
      ? TokenDomainValue<TDomain>
      : TShape[K] extends TokenContractInput
        ? TokenThemeValuesForShape<TShape[K]>
        : never
} & {
  readonly [K in keyof TShape as TShape[K] extends AnyTokenAliasDefinition
    ? K
    : TShape[K] extends TokenContractInput
      ? HasRequiredToken<TShape[K]> extends true ? never : K
      : never]?: TShape[K] extends TokenContractInput ? TokenThemeValuesForShape<TShape[K]> : never
}

export type TokenThemeValues<TContract> = TContract extends { readonly [tokenContractShapeBrand]?: infer TShape }
  ? TShape extends TokenContractInput ? TokenThemeValuesForShape<TShape> : never
  : {
  readonly [K in keyof TContract]: TContract[K] extends DomainThemeVar<infer TDomain>
    ? TokenDomainValue<TDomain>
    : TContract[K] extends Readonly<Record<string, unknown>>
      ? TokenThemeValues<TContract[K]>
      : never
}

/** Independent theme axes are merged after the canonical base snapshot. */
export const TOKEN_THEME_CONTEXT_PRECEDENCE = Object.freeze([
  "brand",
  "mode",
  "density",
] as const)
export type TokenThemeContextName = (typeof TOKEN_THEME_CONTEXT_PRECEDENCE)[number]

type TokenThemeLayerNode<TValue> = TValue extends ReadonlyArray<unknown>
  ? TValue
  : TValue extends Readonly<Record<string, unknown>>
    ? { readonly [K in keyof TValue]?: TokenThemeLayerNode<TValue[K]> }
    : TValue

/** A sparse, domain-checked override for one independent theme context. */
export type TokenThemeLayer<TContract> = TokenThemeLayerNode<TokenThemeValues<TContract>>
export type TokenThemeContexts<TContract> = {
  readonly [K in TokenThemeContextName]?: TokenThemeLayer<TContract>
}
export type TokenThemeSnapshotInput<TContract> = {
  readonly base: TokenThemeValues<TContract>
  readonly contexts?: TokenThemeContexts<TContract>
}

export type TokenThemeOperationError = {
  readonly code: string
  readonly path: ReadonlyArray<string | number>
  readonly message: string
}
export type TokenThemePatchResult<TContract> =
  | {
      readonly ok: true
      readonly theme: NativeTheme<TContract>
      readonly changedPaths: ReadonlyArray<ReadonlyArray<string>>
    }
  | {
      readonly ok: false
      readonly error: TokenThemeOperationError
    }
export type ExternalTokenThemeResult<TContract> =
  | { readonly ok: true; readonly theme: NativeTheme<TContract> }
  | { readonly ok: false; readonly error: TokenThemeOperationError }

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

export function defineAlias<const TDomain extends TokenDomain>(
  target: DomainThemeVar<TDomain>,
  options?: { readonly fallback?: TokenDomainValue<TDomain> },
): TokenAliasDefinition<ReadonlyArray<string>, TDomain>
export function defineAlias<const TTarget extends TokenAliasTarget>(
  target: TTarget,
): TokenAliasDefinition<TTarget>
export function defineAlias<
  const TTarget extends TokenAliasTarget,
  const TDefinition extends TokenDomainDefinition,
>(
  target: TTarget,
  options: {
    readonly domain: TDefinition
    readonly fallback?: TokenDomainValue<NormalizedDomain<TDefinition>>
  },
): TokenAliasDefinition<TTarget, NormalizedDomain<TDefinition>>
export function defineAlias<const TTarget extends TokenAliasTarget>(
  target: TTarget,
  options: { readonly domain?: TokenDomainDefinition; readonly fallback?: string | number } = {},
): TokenAliasDefinition<TTarget, TokenDomain | undefined> {
  const normalizedTarget = normalizeAliasTargetInput(target)
  const domain = options.domain === undefined ? undefined : normalizeDomain(options.domain)
  const result = {
    $$type: TokenAliasDefinitionType,
    target: normalizedTarget,
    ...(domain === undefined ? {} : {domain: Object.freeze(domain)}),
    ...(options.fallback === undefined ? {} : {fallback: options.fallback}),
  }
  return Object.freeze(result) as unknown as TokenAliasDefinition<TTarget, TokenDomain | undefined>
}

/** Concise alias spelling for design-system layer definitions. */
export const alias: typeof defineAlias = defineAlias

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

export function isTokenAliasDefinition(value: unknown): value is AnyTokenAliasDefinition {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const keys = Object.keys(value)
  if (!keys.includes("$$type") || !keys.includes("target") ||
    keys.some(key => !["$$type", "target", "domain", "fallback"].includes(key))) return false
  const tag = Object.getOwnPropertyDescriptor(value, "$$type")
  const target = Object.getOwnPropertyDescriptor(value, "target")
  const domain = Object.getOwnPropertyDescriptor(value, "domain")
  const fallback = Object.getOwnPropertyDescriptor(value, "fallback")
  if (tag === undefined || !("value" in tag) || tag.enumerable !== true || tag.value !== TokenAliasDefinitionType ||
    target === undefined || !("value" in target) || target.enumerable !== true || !isTokenAliasTarget(target.value)) return false
  if (domain !== undefined && (!("value" in domain) || domain.enumerable !== true || !isTokenDomain(domain.value))) return false
  if (fallback !== undefined && (!("value" in fallback) || fallback.enumerable !== true ||
    (typeof fallback.value !== "string" && typeof fallback.value !== "number"))) return false
  return true
}

type TokenEntry =
  | {
      readonly path: ReadonlyArray<string>
      readonly kind: "token"
      readonly definition: TokenDefinition
    }
  | {
      readonly path: ReadonlyArray<string>
      readonly kind: "alias"
      readonly definition: AnyTokenAliasDefinition
    }

type ResolvedTokenEntry = {
  readonly entry: TokenEntry
  readonly domain: TokenDomain
  readonly targetPath?: ReadonlyArray<string>
  readonly fallback?: string | number
  readonly chainPaths: ReadonlyArray<ReadonlyArray<string>>
}

export function createTokenContract<const TShape extends TokenContractInput>(
  shape: TShape,
  identityOrOptions?: TokenContractIdentityInput,
): TokenContract<TShape> {
  const identity = normalizeTokenContractIdentity(identityOrOptions)
  const entries = collectTokenEntries(shape, [])
  const resolvedEntries = resolveTokenEntries(entries)
  const domainEntries = [...resolvedEntries.values()].map(resolved => ({
    path: resolved.entry.path,
    domain: resolved.domain,
    ...(resolved.entry.kind === "alias"
      ? {
          alias: {
            target: resolved.targetPath ?? [],
            ...(resolved.fallback === undefined ? {} : {fallback: resolved.fallback}),
          },
        }
      : {}),
  }))
  const signature = tokenContractShapeSignature(domainEntries)
  if (identity !== undefined) assertThemeContractIdentityAvailable(identity, signature)
  const legacyContract = createThemeContract(toLegacyShape(shape))
  const domains = new Map<string, ThemeTokenDomainMetadata>()
  const contract = mapContract(shape, legacyContract, [], domains, identity, resolvedEntries) as TokenContract<TShape>
  registerThemeTokenContract(contract as object, domains,
    identity === undefined ? undefined : {identity, signature})
  return contract
}

export function getTokenContractIdentity(contract: object): TokenContractIdentity | undefined {
  return getThemeContractIdentity(contract)
}

export function getTokenContractKey(contract: object): string | undefined {
  return getThemeContractIdentityKey(contract)
}

export function getTokenId(token: DomainThemeVar): string {
  return getThemeTokenPublicId(token)
}

export function getTokenOrigin(token: DomainThemeVar): ThemeTokenOrigin | undefined {
  return getThemeTokenOrigin(token)
}

export function createTokenTheme<TContract extends Readonly<Record<string, unknown>>>(
  contract: TContract,
  values: TokenThemeValues<TContract>,
): NativeTheme<TContract> {
  const resolvedValues = resolveTokenThemeValues(contract, values as unknown)
  return createTheme(contract, resolvedValues as never)
}

/**
 * Build one complete theme snapshot from a required base and sparse context
 * layers. The layers are always applied in the documented brand → mode →
 * density order, regardless of object insertion order or provider nesting.
 */
export function createTokenThemeSnapshot<TContract extends Readonly<Record<string, unknown>>>(
  contract: TContract,
  input: TokenThemeSnapshotInput<TContract>,
): NativeTheme<TContract> {
  // Validate the base before accepting any context data. A context must never
  // be able to hide an incomplete or malformed foundation snapshot.
  createTokenTheme(contract, input.base)
  const merged = cloneThemeValue(input.base as unknown)
  for (const context of Object.keys(input.contexts ?? {})) {
    if (!(TOKEN_THEME_CONTEXT_PRECEDENCE as ReadonlyArray<string>).includes(context)) {
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
        `Unknown token theme context "${context}". Supported contexts: ${TOKEN_THEME_CONTEXT_PRECEDENCE.join(", ")}.`,
      ))
    }
  }
  for (const context of TOKEN_THEME_CONTEXT_PRECEDENCE) {
    const layer = input.contexts?.[context]
    if (layer === undefined) continue
    validateTokenThemeLayer(contract, contract, layer, [], context)
    mergeThemeLayer(merged, layer)
  }
  return createTokenTheme(contract, merged as TokenThemeValues<TContract>)
}

/**
 * Rebase independent context layers on an already validated theme. This is
 * used by nested providers so every emitted value/token map is one complete
 * immutable snapshot rather than a partially resolved overlay.
 */
export function createTokenThemeScopedSnapshot<TContract extends Readonly<Record<string, unknown>>>(
  contract: TContract,
  baseTheme: NativeTheme<TContract>,
  contexts: TokenThemeContexts<TContract>,
): NativeTheme<TContract> {
  const baseValues = extractBaseThemeValues(contract, baseTheme)
  return createTokenThemeSnapshot(contract, {base: baseValues, contexts})
}

/** Concise alias for callers that model a scope as a resolved snapshot. */
export const createTokenThemeScope = createTokenThemeScopedSnapshot

/**
 * Apply a sparse patch to one complete snapshot. The current snapshot is only
 * read; all validation and derivation happen against cloned values, so a
 * failed operation cannot leave partially updated canonical or flat state.
 */
export function applyTokenThemePatch<TContract extends Readonly<Record<string, unknown>>>(
  contract: TContract,
  current: NativeTheme<TContract>,
  patch: TokenThemeLayer<TContract>,
): TokenThemePatchResult<TContract> {
  try {
    assertTokenThemeContractCompatibility(contract, current)
    const baseValues = extractBaseThemeValues(contract, current)
    validateTokenThemeLayer(contract, contract, patch, [], "patch")
    const nextValues = cloneThemeValue(baseValues)
    mergeThemeLayer(nextValues, patch)
    const theme = createTokenTheme(contract, nextValues as TokenThemeValues<TContract>)
    return {
      ok: true,
      theme,
      changedPaths: collectThemeLayerPaths(contract, patch, []),
    }
  } catch (error) {
    return {ok: false, error: toTokenThemeOperationError(error, NativeStylesDiagnosticCode.TokenThemePatchInvalid)}
  }
}

/**
 * Validate a decoded external payload against one identified contract and
 * publish a complete native theme. The external format is keyed by stable
 * public token IDs, so paths and domains cannot drift silently.
 */
export function createTokenThemeFromExternalPayload<TContract extends Readonly<Record<string, unknown>>>(
  contract: TContract,
  payload: ExternalTokenThemePayload,
): ExternalTokenThemeResult<TContract> {
  try {
    const identity = getThemeContractIdentity(contract)
    if (identity === undefined || !sameIdentity(identity, payload.contract)) {
      return {
        ok: false,
        error: {
          code: NativeStylesDiagnosticCode.TokenThemeExternalContractMismatch,
          path: ["contract"],
          message: "External token theme identity does not match the identified contract.",
        },
      }
    }
    const definitions = new Map<string, { readonly path: ReadonlyArray<string>; readonly token: ThemeVar }>()
    collectExternalThemeDefinitions(contract, contract, [], definitions)
    const base: Record<string, unknown> = {}
    for (const [publicId, value] of Object.entries(payload.values)) {
      const definition = definitions.get(publicId)
      if (definition === undefined) {
        return {
          ok: false,
          error: {
            code: NativeStylesDiagnosticCode.TokenThemeExternalTokenMismatch,
            path: ["values", publicId],
            message: `External token theme contains unknown or derived token ID "${publicId}".`,
          },
        }
      }
      if (typeof value === "number" && (!Number.isFinite(value) || Object.is(value, -0))) {
        return {
          ok: false,
          error: {
            code: NativeStylesDiagnosticCode.TokenThemeExternalTokenMismatch,
            path: ["values", publicId],
            message: `External value for "${publicId}" is not a finite JSON number.`,
          },
        }
      }
      const domain = getThemeTokenDomainForContract(contract, definition.token)
      if (domain !== undefined && !isTokenDomainValue(domain, value)) {
        return {
          ok: false,
          error: {
            code: NativeStylesDiagnosticCode.TokenThemeExternalTokenMismatch,
            path: ["values", publicId],
            message: `External value for "${publicId}" does not satisfy the ${domain.kind} token domain.`,
          },
        }
      }
      setPathValue(base, definition.path, value)
    }
    for (const [publicId, definition] of definitions) {
      if (!hasPathValue(base, definition.path)) {
        return {
          ok: false,
          error: {
            code: NativeStylesDiagnosticCode.TokenThemeExternalTokenMismatch,
            path: ["values", publicId],
            message: `External token theme is missing required definition token ID "${publicId}".`,
          },
        }
      }
    }
    return {ok: true, theme: createTokenTheme(contract, base as TokenThemeValues<TContract>)}
  } catch (error) {
    return {ok: false, error: toTokenThemeOperationError(error, NativeStylesDiagnosticCode.TokenThemeExternalTokenMismatch)}
  }
}

function validateTokenThemeLayer(
  rootContract: Readonly<Record<string, unknown>>,
  contract: Readonly<Record<string, unknown>>,
  layer: unknown,
  path: ReadonlyArray<string>,
  context: string,
): void {
  if (!isRecord(layer)) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
      `Token theme ${context} scope at "${formatPath(path)}" must be a nested record of token overrides.`,
    ))
  }
  const contractKeys = new Set(Object.keys(contract))
  for (const key of Object.keys(layer)) {
    if (!contractKeys.has(key)) {
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
        `Unknown token theme ${context} scope value "${formatPath([...path, key])}".`,
      ))
    }
  }
  for (const [key, value] of Object.entries(layer)) {
    const contractValue = contract[key]
    const nextPath = [...path, key]
    if (isThemeVar(contractValue)) {
      const alias = getThemeTokenAliasForContract(rootContract, contractValue)
      if (alias !== undefined) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenAliasOverride,
          `Token theme ${context} scope value "${formatPath(nextPath)}" is derived from an alias and cannot be overridden.`,
        ))
      }
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
          `Token theme ${context} scope value "${formatPath(nextPath)}" must be a string or number.`,
        ))
      }
      const domain = getThemeTokenDomainForContract(rootContract, contractValue)
      if (domain !== undefined && !isTokenDomainValue(domain, value)) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
          `Token theme ${context} scope value "${formatPath(nextPath)}" does not satisfy the ${domain.kind} token domain.`,
        ))
      }
    } else if (isRecord(contractValue)) {
      validateTokenThemeLayer(rootContract, contractValue, value, nextPath, context)
    } else {
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.InvalidThemeContract,
        `Invalid token contract at "${formatPath(nextPath)}".`,
      ))
    }
  }
}

function mergeThemeLayer(target: unknown, layer: unknown): void {
  if (!isRecord(target) || !isRecord(layer)) return
  for (const [key, value] of Object.entries(layer)) {
    if (isRecord(value)) {
      const existing = target[key]
      if (isRecord(existing)) mergeThemeLayer(existing, value)
      else target[key] = cloneThemeValue(value)
    } else target[key] = value
  }
}

function cloneThemeValue(value: unknown): unknown {
  if (!isRecord(value)) return value
  const result: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(value)) result[key] = cloneThemeValue(nested)
  return result
}

function extractBaseThemeValues<TContract extends Readonly<Record<string, unknown>>>(
  contract: TContract,
  theme: NativeTheme<TContract>,
): TokenThemeValues<TContract> {
  const output: Record<string, unknown> = {}
  collectBaseThemeValues(contract, contract, theme, [], output)
  return output as TokenThemeValues<TContract>
}

function collectBaseThemeValues(
  rootContract: Readonly<Record<string, unknown>>,
  contract: Readonly<Record<string, unknown>>,
  theme: NativeTheme<Record<string, unknown>>,
  path: ReadonlyArray<string>,
  output: Record<string, unknown>,
): void {
  for (const [key, contractValue] of Object.entries(contract)) {
    const nextPath = [...path, key]
    if (isThemeVar(contractValue)) {
      if (getThemeTokenAliasForContract(rootContract, contractValue) !== undefined) continue
      const varName = getThemeVarName(contractValue)
      if (!Object.prototype.hasOwnProperty.call(theme.tokens, varName)) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
          `Base theme is missing token "${formatPath(nextPath)}" while creating a scoped snapshot.`,
        ))
      }
      setPathValue(output, nextPath, theme.tokens[varName] as string | number)
    } else if (isRecord(contractValue)) {
      collectBaseThemeValues(rootContract, contractValue, theme, nextPath, output)
    }
  }
}

/** @internal Shared contract guard for atomic patches and optic focus updates. */
export function assertTokenThemeContractCompatibility<TContract extends Readonly<Record<string, unknown>>>(
  contract: TContract,
  current: NativeTheme<TContract>,
): void {
  const expectedKey = getThemeContractIdentityKey(contract)
  const actualKey = getThemeContractIdentityKey(current.contract)
  const expectedSignature = getThemeContractShapeSignature(contract)
  const actualSignature = getThemeContractShapeSignature(current.contract)
  const unidentifiedContractsDiffer = expectedKey === undefined && actualKey === undefined &&
    expectedSignature === undefined && actualSignature === undefined && current.contract !== contract
  if (unidentifiedContractsDiffer || expectedKey !== actualKey || expectedSignature !== actualSignature) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.TokenThemePatchContractMismatch,
      `Theme patch contract ${JSON.stringify(actualKey ?? "<unidentified>")} is incompatible with ${JSON.stringify(expectedKey ?? "<unidentified>")}.`,
    ))
  }
}

function collectThemeLayerPaths(
  contract: Readonly<Record<string, unknown>>,
  layer: unknown,
  path: ReadonlyArray<string>,
): ReadonlyArray<ReadonlyArray<string>> {
  if (!isRecord(layer)) return []
  const paths: Array<ReadonlyArray<string>> = []
  for (const [key, value] of Object.entries(layer)) {
    const nextPath = [...path, key]
    const contractValue = contract[key]
    if (isThemeVar(contractValue)) paths.push(Object.freeze([...nextPath]))
    else if (isRecord(contractValue)) paths.push(...collectThemeLayerPaths(contractValue, value, nextPath))
  }
  return Object.freeze(paths)
}

function collectExternalThemeDefinitions(
  rootContract: Readonly<Record<string, unknown>>,
  contract: Readonly<Record<string, unknown>>,
  path: ReadonlyArray<string>,
  definitions: Map<string, { readonly path: ReadonlyArray<string>; readonly token: ThemeVar }>,
): void {
  for (const [key, value] of Object.entries(contract)) {
    const nextPath = [...path, key]
    if (isThemeVar(value)) {
      if (getThemeTokenAliasForContract(rootContract, value) !== undefined) continue
      definitions.set(getThemeTokenPublicId(value), {
        path: Object.freeze([...nextPath]),
        token: value,
      })
    } else if (isRecord(value)) {
      collectExternalThemeDefinitions(rootContract, value, nextPath, definitions)
    }
  }
}

function hasPathValue(root: Readonly<Record<string, unknown>>, path: ReadonlyArray<string>): boolean {
  let cursor: unknown = root
  for (const key of path) {
    if (!isRecord(cursor) || !Object.prototype.hasOwnProperty.call(cursor, key)) return false
    cursor = cursor[key]
  }
  return true
}

function sameIdentity(
  left: TokenContractIdentity,
  right: TokenContractIdentity,
): boolean {
  return left.owner === right.owner && left.name === right.name && left.version === right.version
}

function toTokenThemeOperationError(
  error: unknown,
  fallbackCode: string,
): TokenThemeOperationError {
  const message = error instanceof Error ? error.message : String(error)
  const code = message.match(/CRUMBS_CSS_[A-Z0-9_]+/)?.[0] ?? fallbackCode
  return {code, path: [], message}
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

function normalizeAliasTargetInput(target: TokenAliasTarget): TokenAliasTarget {
  if (Array.isArray(target)) {
    const path = readTokenPath(target)
    if (path === undefined) throw new Error("Token alias targets must contain non-empty string path segments")
    return Object.freeze(path)
  }
  if (typeof target !== "string" || target.length === 0) {
    throw new Error("Token alias targets must be a non-empty dot path or path array")
  }
  if (isThemeVar(target)) return Object.freeze([...getThemeTokenPath(target)])
  if (target.startsWith("var(")) throw new Error("Token alias targets must use a registered token reference or a path")
  const path = splitTokenPath(target)
  if (path.length === 0) throw new Error("Token alias targets must contain at least one path segment")
  return target
}

function normalizeAliasTarget(target: TokenAliasTarget): ReadonlyArray<string> {
  if (Array.isArray(target)) {
    const path = readTokenPath(target)
    if (path === undefined) throw new Error("Token alias target contains an invalid path")
    return path
  }
  if (isThemeVar(target)) return getThemeTokenPath(target)
  if (typeof target !== "string") throw new Error("Token alias target contains an invalid path")
  const path = splitTokenPath(target)
  if (path.length === 0) throw new Error("Token alias target contains an empty path")
  return path
}

function isTokenAliasTarget(value: unknown): value is TokenAliasTarget {
  if (typeof value === "string") return value.length > 0
  return Array.isArray(value) && readTokenPath(value) !== undefined
}

function readTokenPath(value: ReadonlyArray<unknown>): ReadonlyArray<string> | undefined {
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length")
  if (lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
    typeof lengthDescriptor.value !== "number" || !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value === 0) return undefined
  const result: string[] = []
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (descriptor === undefined || !("value" in descriptor) || typeof descriptor.value !== "string" || descriptor.value.length === 0) return undefined
    result.push(descriptor.value)
  }
  return result
}

function splitTokenPath(value: string): ReadonlyArray<string> {
  const segments = value.split(".")
  return segments.length === 0 || segments.some(segment => segment.length === 0) ? [] : segments
}

function sameDomain(left: TokenDomain, right: TokenDomain): boolean {
  if (left.kind !== right.kind) return false
  if (left.kind === "length" && right.kind === "length") return left.allowNegative === right.allowNegative
  if (left.kind === "enum" && right.kind === "enum") {
    return left.values.length === right.values.length &&
      [...left.values].sort().every((value, index) => value === [...right.values].sort()[index])
  }
  return true
}

function describeDomain(domain: TokenDomain): string {
  return domain.kind === "length"
    ? domain.kind + (domain.allowNegative ? "(negative)" : "")
    : domain.kind === "enum"
      ? domain.kind + "(" + domain.values.join("|") + ")"
      : domain.kind
}

function pathKey(path: ReadonlyArray<string>): string {
  return path.map(segment => segment.length + ":" + segment).join("/")
}

function formatPath(path: ReadonlyArray<string>): string {
  return path.length === 0 ? "<root>" : path.join(".")
}

function setPathValue(root: Record<string, unknown>, path: ReadonlyArray<string>, value: string | number): void {
  let cursor = root
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index]
    if (key === undefined) return
    const next = Object.prototype.hasOwnProperty.call(cursor, key) ? cursor[key] : undefined
    if (!isRecord(next)) {
      const child: Record<string, unknown> = {}
      Object.defineProperty(cursor, key, {
        value: child,
        enumerable: true,
        configurable: true,
        writable: true,
      })
    }
    cursor = cursor[key] as Record<string, unknown>
  }
  const key = path[path.length - 1]
  if (key !== undefined) {
    Object.defineProperty(cursor, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
}


function toLegacyShape(shape: TokenContractInput): ThemeContractInput {
  if (!isRecord(shape)) throw new Error("Token contracts must be nested records of token definitions or aliases")
  const result: Record<string, ThemeContractInput | null> = {}
  for (const [key, value] of Object.entries(shape)) {
    result[key] = isTokenDefinitionInput(value) || isTokenAliasDefinition(value) ? null : toLegacyShape(value)
  }
  return result
}

function collectTokenEntries(
  shape: TokenContractInput,
  path: ReadonlyArray<string>,
): ReadonlyArray<TokenEntry> {
  if (!isRecord(shape)) throw new Error("Token contract at \"" + formatPath(path) + "\" must be a nested record")
  const entries: Array<TokenEntry> = []
  for (const [key, value] of Object.entries(shape)) {
    const nextPath = [...path, key]
    if (isTokenDefinitionInput(value)) entries.push({path: nextPath, kind: "token", definition: value})
    else if (isTokenAliasDefinition(value)) entries.push({path: nextPath, kind: "alias", definition: value})
    else entries.push(...collectTokenEntries(value, nextPath))
  }
  return entries
}

function resolveTokenEntries(entries: ReadonlyArray<TokenEntry>): ReadonlyMap<string, ResolvedTokenEntry> {
  const byPath = new Map(entries.map(entry => [pathKey(entry.path), entry]))
  const resolved = new Map<string, ResolvedTokenEntry>()
  const visiting = new Map<string, number>()

  const resolve = (entry: TokenEntry, stack: ReadonlyArray<TokenEntry>): ResolvedTokenEntry => {
    const key = pathKey(entry.path)
    const known = resolved.get(key)
    if (known !== undefined) return known
    const cycleStart = visiting.get(key)
    if (cycleStart !== undefined) {
      const cycle = [...stack.slice(cycleStart), entry].map(item => formatPath(item.path)).join(" -> ")
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.TokenAliasCycle,
        "Token alias cycle detected: " + cycle + ". Aliases must resolve to a foundation token or an acyclic alias.",
      ))
    }
    if (entry.kind === "token") {
      const value: ResolvedTokenEntry = {entry, domain: entry.definition.domain, chainPaths: [entry.path]}
      resolved.set(key, value)
      return value
    }

    visiting.set(key, stack.length)
    const definition = entry.definition
    const targetPath = normalizeAliasTarget(definition.target)
    const targetEntry = byPath.get(pathKey(targetPath))
    const fallback = definition.fallback
    let value: ResolvedTokenEntry
    if (targetEntry === undefined) {
      if (definition.domain === undefined || fallback === undefined) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenAliasMissingTarget,
          "Token alias \"" + formatPath(entry.path) + "\" targets missing token \"" + formatPath(targetPath) + "\". Add the target to this contract or provide an explicit fallback together with its domain.",
        ))
      }
      if (!isTokenDomainValue(definition.domain, fallback)) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenAliasFallbackDomainMismatch,
          "Fallback for token alias \"" + formatPath(entry.path) + "\" does not satisfy its " + definition.domain.kind + " domain.",
        ))
      }
      value = {entry, domain: definition.domain, targetPath, fallback, chainPaths: [entry.path]}
    } else {
      const target = resolve(targetEntry, [...stack, entry])
      if (definition.domain !== undefined && !sameDomain(definition.domain, target.domain)) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenAliasDomainMismatch,
          "Token alias \"" + formatPath(entry.path) + "\" declares " + describeDomain(definition.domain) + " but target \"" + formatPath(targetPath) + "\" is " + describeDomain(target.domain) + ".",
        ))
      }
      if (fallback !== undefined && !isTokenDomainValue(target.domain, fallback)) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenAliasFallbackDomainMismatch,
          "Fallback for token alias \"" + formatPath(entry.path) + "\" does not satisfy the target " + target.domain.kind + " domain.",
        ))
      }
      value = {
        entry,
        domain: target.domain,
        targetPath,
        ...(fallback === undefined ? {} : {fallback}),
        chainPaths: [entry.path, ...target.chainPaths],
      }
    }
    visiting.delete(key)
    resolved.set(key, value)
    return value
  }

  for (const entry of entries) resolve(entry, [])
  return resolved
}

function mapContract(
  shape: TokenContractInput,
  legacyContract: unknown,
  path: ReadonlyArray<string>,
  domains: Map<string, ThemeTokenDomainMetadata>,
  identity: TokenContractIdentity | undefined,
  resolvedEntries: ReadonlyMap<string, ResolvedTokenEntry>,
): unknown {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(shape)) {
    const nextPath = [...path, key]
    if (isTokenDefinitionInput(value) || isTokenAliasDefinition(value)) {
      const legacyValue = getPath(legacyContract, nextPath)
      const resolved = resolvedEntries.get(pathKey(nextPath))
      if (resolved === undefined) throw new Error("Token contract path not found: " + formatPath(nextPath))
      const publicId = identity === undefined
        ? getThemeTokenPublicId(legacyValue as NativeThemeVar)
        : tokenPublicId(identity, nextPath)
      const origin = createTokenOrigin(resolved, publicId, identity, resolvedEntries, legacyContract)
      const reference = identity === undefined
        ? registerThemeTokenReference(getThemeVarName(legacyValue as NativeThemeVar), nextPath, {origin})
        : registerThemeTokenReference(tokenVariableName(identity, nextPath), nextPath, {publicId, origin})
      const alias = resolved.entry.kind === "alias"
        ? {
            targetPath: Object.freeze([...(resolved.targetPath ?? [])]),
            ...(resolved.fallback === undefined ? {} : {fallback: resolved.fallback}),
            origin,
          } satisfies ThemeTokenAliasMetadata
        : undefined
      domains.set(String(reference), {
        domain: resolved.domain,
        validate: candidate => isTokenDomainValue(resolved.domain, candidate),
        ...(alias === undefined ? {} : {alias}),
      })
      result[key] = reference as unknown as DomainThemeVar<TokenDomain>
    } else {
      result[key] = mapContract(value, legacyContract, nextPath, domains, identity, resolvedEntries)
    }
  }
  return result
}

function createTokenOrigin(
  resolved: ResolvedTokenEntry,
  publicId: string,
  identity: TokenContractIdentity | undefined,
  resolvedEntries: ReadonlyMap<string, ResolvedTokenEntry>,
  legacyContract: unknown,
): ThemeTokenOrigin {
  const chain: ThemeTokenOriginStep[] = resolved.chainPaths.map(path => {
    const entry = resolvedEntries.get(pathKey(path))
    const reference = entry === undefined ? undefined : getPath(legacyContract, path) as NativeThemeVar
    const stepPublicId = identity === undefined
      ? reference === undefined ? "#" + formatPath(path) : getThemeTokenPublicId(reference)
      : tokenPublicId(identity, path)
    return {path: Object.freeze([...path]), publicId: stepPublicId}
  })
  const targetPublicId = resolved.targetPath === undefined
    ? undefined
    : resolvedEntries.has(pathKey(resolved.targetPath))
      ? identity === undefined
        ? getThemeTokenPublicId(getPath(legacyContract, resolved.targetPath) as NativeThemeVar)
        : tokenPublicId(identity, resolved.targetPath)
      : undefined
  return Object.freeze({
    kind: resolved.entry.kind === "alias" ? "alias" : "definition",
    path: Object.freeze([...resolved.entry.path]),
    publicId,
    ...(resolved.targetPath === undefined ? {} : {targetPath: Object.freeze([...resolved.targetPath])}),
    ...(targetPublicId === undefined ? {} : {targetPublicId}),
    chain: Object.freeze(chain.map(step => Object.freeze(step))),
    ...(resolved.fallback === undefined ? {} : {fallback: resolved.fallback}),
  })
}

function resolveTokenThemeValues(
  contract: Readonly<Record<string, unknown>>,
  values: unknown,
): Readonly<Record<string, unknown>> {
  const output: Record<string, unknown> = {}
  const baseValues = new Map<string, string | number>()
  const aliasValues = new Map<string, ThemeTokenAliasMetadata>()
  collectThemeContractRefs(contract, contract, [], aliasValues)
  collectThemeInput(contract, contract, values, [], output, baseValues, aliasValues)
  const resolving = new Set<string>()
  const resolved = new Map<string, string | number>()
  const resolveAlias = (path: ReadonlyArray<string>, aliasMetadata: ThemeTokenAliasMetadata): string | number => {
    const key = pathKey(path)
    const existing = resolved.get(key)
    if (existing !== undefined) return existing
    if (resolving.has(key)) {
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.TokenAliasCycle,
        "Token alias cycle detected while resolving \"" + formatPath(path) + "\".",
      ))
    }
    resolving.add(key)
    const targetKey = pathKey(aliasMetadata.targetPath)
    const targetAlias = aliasValues.get(targetKey)
    const value = targetAlias === undefined
      ? baseValues.get(targetKey) ?? aliasMetadata.fallback
      : resolveAlias(aliasMetadata.targetPath, targetAlias)
    resolving.delete(key)
    if (value === undefined) {
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.TokenAliasMissingTarget,
        "Token alias \"" + formatPath(path) + "\" has no resolved value for target \"" + formatPath(aliasMetadata.targetPath) + "\".",
      ))
    }
    resolved.set(key, value)
    return value
  }
  for (const aliasMetadata of aliasValues.values()) {
    const path = aliasMetadata.origin.path
    setPathValue(output, path, resolveAlias(path, aliasMetadata))
  }
  return output
}

function collectThemeContractRefs(
  rootContract: Readonly<Record<string, unknown>>,
  contract: Readonly<Record<string, unknown>>,
  path: ReadonlyArray<string>,
  aliases: Map<string, ThemeTokenAliasMetadata>,
): void {
  for (const [key, value] of Object.entries(contract)) {
    const nextPath = [...path, key]
    if (isThemeVar(value)) {
      const aliasMetadata = getThemeTokenAliasForContract(rootContract, value)
      if (aliasMetadata !== undefined) aliases.set(pathKey(nextPath), aliasMetadata)
    } else if (isRecord(value)) {
      collectThemeContractRefs(rootContract, value, nextPath, aliases)
    }
  }
}

function collectThemeInput(
  rootContract: Readonly<Record<string, unknown>>,
  contract: Readonly<Record<string, unknown>>,
  values: unknown,
  path: ReadonlyArray<string>,
  output: Record<string, unknown>,
  baseValues: Map<string, string | number>,
  aliases: Map<string, ThemeTokenAliasMetadata>,
): void {
  const valueRecord = values === undefined ? undefined : isRecord(values) ? values : undefined
  if (values !== undefined && valueRecord === undefined) {
    throw new Error("Theme values for \"" + formatPath(path) + "\" must be an object")
  }
  const valueKeys = new Set(valueRecord === undefined ? [] : Object.keys(valueRecord))
  const contractKeys = new Set(Object.keys(contract))
  for (const key of valueKeys) {
    if (!contractKeys.has(key)) throw new Error("Unknown theme value \"" + formatPath([...path, key]) + "\"")
  }
  for (const [key, contractValue] of Object.entries(contract)) {
    const nextPath = [...path, key]
    const aliasMetadata = isThemeVar(contractValue) ? aliases.get(pathKey(nextPath)) : undefined
    if (aliasMetadata !== undefined) {
      if (valueKeys.has(key)) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenAliasOverride,
          "Theme value \"" + formatPath(nextPath) + "\" is derived from an alias and cannot be overridden. Change its target or declare an explicit fallback.",
        ))
      }
      continue
    }
    const hasValue = valueKeys.has(key)
    if (isThemeVar(contractValue)) {
      if (!hasValue) throw new Error("Missing theme value for \"" + formatPath(nextPath) + "\"")
      const themeValue = valueRecord?.[key]
      if (typeof themeValue !== "string" && typeof themeValue !== "number") {
        throw new Error("Theme value for \"" + formatPath(nextPath) + "\" must be a string or number")
      }
      const domain = getThemeTokenDomainForContractForAlias(rootContract, contractValue)
      if (domain !== undefined && !isTokenDomainValue(domain, themeValue)) {
        throw new Error("Theme value for \"" + formatPath(nextPath) + "\" does not satisfy the " + domain.kind + " token domain")
      }
      baseValues.set(pathKey(nextPath), themeValue)
      output[key] = themeValue
    } else if (isRecord(contractValue)) {
      if (!hasValue && !containsRequiredToken(contractValue, aliases, nextPath)) {
        output[key] = {}
        continue
      }
      const nested: Record<string, unknown> = {}
      output[key] = nested
      collectThemeInput(rootContract, contractValue, hasValue ? valueRecord?.[key] : undefined, nextPath, nested, baseValues, aliases)
    } else {
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.InvalidThemeContract,
        "Invalid token contract at \"" + formatPath(nextPath) + "\".",
      ))
    }
  }
}

function containsRequiredToken(
  contract: Readonly<Record<string, unknown>>,
  aliases: Map<string, ThemeTokenAliasMetadata>,
  path: ReadonlyArray<string> = [],
): boolean {
  return Object.entries(contract).some(([key, value]) => {
    const nextPath = [...path, key]
    if (isThemeVar(value)) return !aliases.has(pathKey(nextPath))
    return isRecord(value) && containsRequiredToken(value, aliases, nextPath)
  })
}

function getThemeTokenDomainForContractForAlias(contract: object, token: ThemeVar): TokenDomain | undefined {
  return getThemeTokenDomainForContract(contract, token)
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
