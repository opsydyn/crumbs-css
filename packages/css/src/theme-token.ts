import {formatNativeStylesDiagnostic, NativeStylesDiagnosticCode} from "./diagnostics"

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
}
const domainContracts = new WeakMap<object, ReadonlyMap<string, ThemeTokenDomainMetadata>>()

export function createThemeTokenReference(varName: string): NativeThemeTokenReference {
  if (typeof varName !== "string" || !NATIVE_TOKEN_NAME.test(varName)) invalidReference("constructor")
  return {$$type: NativeThemeTokenReferenceType, varName}
}

/** @internal Domain validation is owned by the contract object, not a global path. */
export function registerThemeTokenContract(
  contract: object,
  entries: ReadonlyMap<string, ThemeTokenDomainMetadata>,
): void {
  domainContracts.set(contract, new Map(entries))
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
