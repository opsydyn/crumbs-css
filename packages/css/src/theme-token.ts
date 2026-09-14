import {formatNativeStylesDiagnostic, NativeStylesDiagnosticCode} from "./diagnostics"

export const NativeThemeTokenReferenceType = "crumbs.css.theme-token" as const
export type NativeThemeTokenReference = {
  readonly $$type: typeof NativeThemeTokenReferenceType
  readonly varName: string
}
const NATIVE_TOKEN_NAME = /^--crumbs-[A-Za-z0-9_-]+$/

export function createThemeTokenReference(varName: string): NativeThemeTokenReference {
  if (typeof varName !== "string" || !NATIVE_TOKEN_NAME.test(varName)) invalidReference("constructor")
  return {$$type: NativeThemeTokenReferenceType, varName}
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
