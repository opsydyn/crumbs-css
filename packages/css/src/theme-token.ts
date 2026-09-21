import {formatNativeStylesDiagnostic, NativeStylesDiagnosticCode} from "./diagnostics"
import {
  tokenContractIdentityKey,
  type TokenContractIdentity,
} from "./tokens/identity"

export const NativeThemeTokenReferenceType = "crumbs.css.theme-token" as const
export type NativeThemeTokenReference = {
  readonly $$type: typeof NativeThemeTokenReferenceType
  readonly varName: string
}

/**
 * A token domain is deliberately data rather than a class or an Effect value.
 * Authoring code can therefore carry the domain through declarations without
 * making ordinary style consumers depend on Effect at runtime.
 */
export type TokenDomain =
  | { readonly kind: "color" }
  | { readonly kind: "length"; readonly allowNegative: boolean }
  | { readonly kind: "duration" }
  | { readonly kind: "opacity" }
  | { readonly kind: "enum"; readonly values: ReadonlyArray<string> }

export type TokenDomainValue<TDomain extends TokenDomain> =
  TDomain extends { readonly kind: "color" } ? string
    : TDomain extends { readonly kind: "length" } ? number | `${number}%` | "auto"
      : TDomain extends { readonly kind: "duration" } ? number
        : TDomain extends { readonly kind: "opacity" } ? number
          : TDomain extends { readonly kind: "enum"; readonly values: infer TValues }
            ? TValues extends ReadonlyArray<infer TValue> ? TValue : never
            : never

declare const legacyThemeVarBrand: unique symbol
declare const domainThemeVarBrand: unique symbol

/** The pre-M3 unscoped token brand retained for the migration path. */
export type LegacyNativeThemeVar = `var(--crumbs-${string})` & {
  readonly [legacyThemeVarBrand]: "legacy"
}

/** A domain-carrying token reference used by the M3 token contract API. */
export type DomainThemeVar<TDomain extends TokenDomain = TokenDomain> = `var(--crumbs-${string})` & {
  readonly [domainThemeVarBrand]: TDomain
}

/** Legacy token values remain the public `NativeThemeVar` migration type. */
export type NativeThemeVar = LegacyNativeThemeVar
export type ThemeVar = NativeThemeVar | DomainThemeVar
const NATIVE_TOKEN_NAME = /^--crumbs-[A-Za-z0-9_-]+$/

export type ThemeTokenDomainValidator = (value: unknown) => boolean
export type ThemeTokenDomainMetadata = {
  readonly domain: TokenDomain
  readonly validate: ThemeTokenDomainValidator
  readonly alias?: ThemeTokenAliasMetadata
}
export type ThemeTokenReferenceMetadata = {
  readonly path: ReadonlyArray<string>
  readonly varName: string
  readonly publicId?: string
  readonly origin?: ThemeTokenOrigin
}
export type ThemeTokenOriginStep = {
  readonly path: ReadonlyArray<string>
  readonly publicId: string
}
export type ThemeTokenOrigin = {
  readonly kind: "definition" | "alias"
  readonly path: ReadonlyArray<string>
  readonly publicId: string
  readonly targetPath?: ReadonlyArray<string>
  readonly targetPublicId?: string
  readonly chain: ReadonlyArray<ThemeTokenOriginStep>
  readonly fallback?: string | number
}
export type ThemeTokenAliasMetadata = {
  readonly targetPath: ReadonlyArray<string>
  readonly fallback?: string | number
  readonly origin: ThemeTokenOrigin
}
export type ThemeContractIdentityMetadata = {
  readonly identity: TokenContractIdentity
  readonly key: string
  readonly signature: string
}

/** Versioned, plain-data representation accepted at the external theme boundary. */
export type ExternalTokenThemePayload = {
  readonly _tag: "CrumbsTokenTheme"
  readonly version: 1
  readonly contract: TokenContractIdentity
  readonly values: Readonly<Record<string, string | number>>
}

const domainContracts = sharedRegistry(
  Symbol.for("crumbs.css.theme-token-domain-contracts.v1"),
  () => new WeakMap<object, ReadonlyMap<string, ThemeTokenDomainMetadata>>(),
)
const contractIdentities = sharedRegistry(
  Symbol.for("crumbs.css.theme-contract-identities.v1"),
  () => new Map<string, { readonly identity: TokenContractIdentity; readonly signature: string }>(),
)
const contractIdentitySymbol = Symbol.for("crumbs.css.theme-contract-identity.v1")
const themeTokenRegistry = sharedRegistry(
  Symbol.for("crumbs.css.theme-token-registry.v1"),
  () => new Map<ThemeVar, ThemeTokenReferenceMetadata>(),
)

export function createThemeTokenReference(varName: string): NativeThemeTokenReference {
  if (typeof varName !== "string" || !NATIVE_TOKEN_NAME.test(varName)) invalidReference("constructor")
  return {$$type: NativeThemeTokenReferenceType, varName}
}

/** @internal Publish a native token string to the shared cross-copy registry. */
export function registerThemeTokenReference(
  varName: string,
  path: ReadonlyArray<string>,
  metadata: { readonly publicId?: string; readonly origin?: ThemeTokenOrigin } = {},
): NativeThemeVar {
  if (!NATIVE_TOKEN_NAME.test(varName)) invalidReference("registry")
  const token = `var(${varName})` as NativeThemeVar
  const existing = themeTokenRegistry.get(token)
  if (existing !== undefined && (!samePath(existing.path, path) ||
    (metadata.publicId !== undefined && existing.publicId !== metadata.publicId))) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.ThemeTokenCollision,
      `Native theme token "${varName}" is already owned by ${JSON.stringify(existing.path)} and cannot be rebound to ${JSON.stringify(path)}.`,
    ))
  }
  if (existing === undefined) {
    themeTokenRegistry.set(token, Object.freeze({
      path: Object.freeze([...path]),
      varName,
      ...(metadata.publicId === undefined ? {} : {publicId: metadata.publicId}),
      ...(metadata.origin === undefined ? {} : {origin: freezeOrigin(metadata.origin)}),
    }))
  } else if ((metadata.publicId !== undefined && existing.publicId === undefined) ||
    (metadata.origin !== undefined && existing.origin === undefined)) {
    themeTokenRegistry.set(token, Object.freeze({
      ...existing,
      ...(metadata.publicId === undefined ? {} : {publicId: metadata.publicId}),
      ...(metadata.origin === undefined ? {} : {origin: freezeOrigin(metadata.origin)}),
    }))
  }
  return token
}

/** @internal Used by native-style without exposing registry machinery publicly. */
export function isRegisteredThemeVar(value: unknown): value is ThemeVar {
  return typeof value === "string" && themeTokenRegistry.has(value as ThemeVar)
}

/** @internal Used by native-style and token ID helpers. */
export function getThemeTokenMetadata(value: ThemeVar): ThemeTokenReferenceMetadata {
  const metadata = themeTokenRegistry.get(value)
  if (metadata === undefined) throw new Error(`Unknown native theme token "${value}"`)
  return metadata
}

export function getThemeTokenPublicId(value: ThemeVar): string {
  const metadata = getThemeTokenMetadata(value)
  return metadata.publicId ?? metadata.varName
}

export function getThemeTokenOrigin(value: ThemeVar): ThemeTokenOrigin | undefined {
  return getThemeTokenMetadata(value).origin
}

/** @internal Domain validation is owned by the contract object, not a global path. */
export function registerThemeTokenContract(
  contract: object,
  entries: ReadonlyMap<string, ThemeTokenDomainMetadata>,
  identityMetadata?: { readonly identity: TokenContractIdentity; readonly signature: string },
): void {
  if (identityMetadata !== undefined) {
    registerThemeContractIdentity(contract, identityMetadata.identity, identityMetadata.signature)
  }
  domainContracts.set(contract, new Map(entries))
}

/** Reserve a stable identity before publishing any contract-local metadata. */
export function assertThemeContractIdentityAvailable(
  identity: TokenContractIdentity,
  signature: string,
): void {
  const key = tokenContractIdentityKey(identity)
  const previous = contractIdentities.get(key)
  if (previous !== undefined && previous.signature !== signature) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.TokenContractIdentityCollision,
      `Token contract identity ${JSON.stringify(key)} is already registered with a different shape. Increment the contract version or keep the public token paths and domains unchanged.`,
    ))
  }
}

export function registerThemeContractIdentity(
  contract: object,
  identity: TokenContractIdentity,
  signature: string,
): void {
  assertThemeContractIdentityAvailable(identity, signature)
  const key = tokenContractIdentityKey(identity)
  if (!contractIdentities.has(key)) contractIdentities.set(key, {identity, signature})
  Object.defineProperty(contract, contractIdentitySymbol, {
    value: Object.freeze({identity, key, signature} satisfies ThemeContractIdentityMetadata),
    enumerable: false,
    configurable: false,
    writable: false,
  })
}

export function getThemeContractIdentity(contract: unknown): TokenContractIdentity | undefined {
  return getThemeContractIdentityMetadata(contract)?.identity
}

export function getThemeContractIdentityKey(contract: unknown): string | undefined {
  return getThemeContractIdentityMetadata(contract)?.key
}

export function getThemeContractShapeSignature(contract: unknown): string | undefined {
  return getThemeContractIdentityMetadata(contract)?.signature
}

function getThemeContractIdentityMetadata(contract: unknown): ThemeContractIdentityMetadata | undefined {
  if (typeof contract !== "object" || contract === null) return undefined
  const descriptor = Object.getOwnPropertyDescriptor(contract, contractIdentitySymbol)
  if (descriptor === undefined || !("value" in descriptor)) return undefined
  const value = descriptor.value
  if (typeof value !== "object" || value === null) return undefined
  const metadata = value as Partial<ThemeContractIdentityMetadata>
  return typeof metadata.key === "string" && typeof metadata.signature === "string" &&
    typeof metadata.identity === "object" && metadata.identity !== null
    ? metadata as ThemeContractIdentityMetadata
    : undefined
}

function sharedRegistry<T>(key: symbol, create: () => T): T {
  const root = globalThis as unknown as Record<PropertyKey, unknown>
  const descriptor = Object.getOwnPropertyDescriptor(root, key)
  if (descriptor !== undefined && "value" in descriptor) return descriptor.value as T
  const value = create()
  Object.defineProperty(root, key, {value, enumerable: false, configurable: false, writable: false})
  return value
}

/** @internal Runtime theme construction uses this without importing Effect. */
export function validateThemeTokenValueForContract(
  contract: object,
  token: ThemeVar,
  value: unknown,
): boolean {
  return domainContracts.get(contract)?.get(String(token))?.validate(value) ?? true
}

/** @internal Used by diagnostics and future manifest emitters. */
export function getThemeTokenDomainForContract(
  contract: object,
  token: ThemeVar,
): TokenDomain | undefined {
  return domainContracts.get(contract)?.get(String(token))?.domain
}

export function getThemeTokenAliasForContract(
  contract: object,
  token: ThemeVar,
): ThemeTokenAliasMetadata | undefined {
  return domainContracts.get(contract)?.get(String(token))?.alias
}

// ADR D2: validate data descriptors without evaluating user-provided accessors.
export function isThemeTokenReference(value: unknown): value is NativeThemeTokenReference {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== null && Object.getPrototypeOf(prototype) !== null) return false
  if (Reflect.ownKeys(value).length !== 2) return false
  const tag = Object.getOwnPropertyDescriptor(value, "$$type")
  const name = Object.getOwnPropertyDescriptor(value, "varName")
  return tag !== undefined && "value" in tag && tag.enumerable === true && tag.value === NativeThemeTokenReferenceType &&
    name !== undefined && "value" in name && name.enumerable === true && typeof name.value === "string" && NATIVE_TOKEN_NAME.test(name.value)
}

// Internal candidate check keeps invalid tagged payloads out of variant-map inference.
export function isThemeTokenReferenceCandidate(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false
  for (let current = value; current !== null; current = Object.getPrototypeOf(current)) {
    const descriptor = Object.getOwnPropertyDescriptor(current, "$$type")
    if (descriptor !== undefined) return !("value" in descriptor) || descriptor.value === NativeThemeTokenReferenceType
  }
  return false
}

export function assertThemeTokenReference(value: unknown, property: string): asserts value is NativeThemeTokenReference {
  if (!isThemeTokenReference(value)) invalidReference(`property "${property}"`)
}

function invalidReference(location: string): never {
  throw new Error(formatNativeStylesDiagnostic(
    NativeStylesDiagnosticCode.InvalidThemeTokenReference,
    `Invalid native theme token reference at ${location}. Expected exactly own enumerable data fields $$type="${NativeThemeTokenReferenceType}" and varName matching --crumbs-[A-Za-z0-9_-]+. Regenerate artifacts or use createThemeTokenReference with a valid native token name.`,
  ))
}

function samePath(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
  return left.length === right.length && left.every((segment, index) => segment === right[index])
}

function freezeOrigin(origin: ThemeTokenOrigin): ThemeTokenOrigin {
  return Object.freeze({
    ...origin,
    path: Object.freeze([...origin.path]),
    ...(origin.targetPath === undefined ? {} : {targetPath: Object.freeze([...origin.targetPath])}),
    chain: Object.freeze(origin.chain.map(step => Object.freeze({
      path: Object.freeze([...step.path]),
      publicId: step.publicId,
    }))),
  })
}
