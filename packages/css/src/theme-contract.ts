import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode } from "./diagnostics"
import {
  getThemeTokenDomainForContract,
  getThemeTokenMetadata,
  isThemeTokenContract,
  isThemeTokenOwnedByContract,
  isRegisteredThemeVar,
  registerThemeTokenReference,
  validateThemeTokenValueForContract,
  type LegacyNativeThemeVar,
  type NativeThemeVar,
  type ThemeVar,
  type nativeThemeValuesBrand,
} from "./theme-token"

/** The legacy, unscoped shape accepted by createThemeContract. */
export type ThemeContractInput = {
  readonly [key: string]: ThemeContractInput | null
}

export type NativeThemeValue = string | number

export type ThemeContract<T extends ThemeContractInput> = {
  readonly [K in keyof T]: T[K] extends null
    ? LegacyNativeThemeVar
    : T[K] extends ThemeContractInput
      ? ThemeContract<T[K]>
      : never
}

type LegacyThemeValues<T> = {
  readonly [K in keyof T]: T[K] extends NativeThemeVar
    ? NativeThemeValue
    : T[K] extends Record<string, unknown>
      ? LegacyThemeValues<T[K]>
      : never
}

export type ThemeValues<T> = T extends { readonly [nativeThemeValuesBrand]: infer TValues }
  ? TValues
  : LegacyThemeValues<T>

export type NativeTheme<TContract> = {
  readonly contract: TContract
  readonly tokens: Readonly<Record<string, NativeThemeValue>>
  readonly values: ThemeValues<TContract>
}

type ThemeContractBuildState = {
  readonly tokenPathsByVarName: Map<string, ReadonlyArray<string>>
}

export function createThemeContract<T extends ThemeContractInput>(shape: T): ThemeContract<T> {
  const state: ThemeContractBuildState = {
    tokenPathsByVarName: new Map(),
  }
  const contract = createThemeContractNode(shape, [], state)
  // ADR D5 / M0.6: legacy identity is the exact raw path; validate the entire
  // transaction before publishing metadata. Identified domain contracts use
  // the package-scoped registry in tokens/domains.ts.
  for (const [varName, path] of state.tokenPathsByVarName) {
    const token = `var(${varName})` as NativeThemeVar
    const previous = isRegisteredThemeVar(token) ? getThemeTokenMetadata(token) : undefined
    if (previous !== undefined && !samePath(previous.path, path)) {
      throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.ThemeTokenCollision,
        `Native theme token "${varName}" for raw path ${JSON.stringify(path)} is already owned by ${JSON.stringify(previous.path)}. Namespace contract roots or rename the colliding path; existing metadata was not changed.`))
    }
  }
  for (const [varName, path] of state.tokenPathsByVarName) {
    registerThemeTokenReference(varName, path)
  }
  return contract as ThemeContract<T>
}

export function createTheme<TContract extends Record<string, unknown>>(
  contract: TContract,
  values: ThemeValues<TContract>,
): NativeTheme<TContract> {
  const tokens: Record<string, NativeThemeValue> = {}
  collectThemeValues(contract, values, [], tokens, contract)
  return { contract, tokens, values }
}

export function isThemeVar(value: unknown): value is ThemeVar {
  return isRegisteredThemeVar(value)
}

export function getThemeVarName(value: ThemeVar): string {
  return getThemeTokenMetadata(value).varName
}

export function getThemeTokenPath(value: ThemeVar): ReadonlyArray<string> {
  return getThemeTokenMetadata(value).path
}

function createThemeContractNode(
  shape: ThemeContractInput,
  path: ReadonlyArray<string>,
  state: ThemeContractBuildState,
): Record<string, unknown> {
  if (!isRecord(shape)) invalidThemeContract(path, "expected an object of nested records and null leaves")
  const contract: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(shape)) {
    const nextPath = [...path, key]
    const node = value === null
      ? createThemeVar(nextPath, state)
      : createThemeContractNode(value, nextPath, state)
    Object.defineProperty(contract, key, {value: node, enumerable: true, writable: true, configurable: true})
  }
  return contract
}

function createThemeVar(
  path: ReadonlyArray<string>,
  state: ThemeContractBuildState,
): NativeThemeVar {
  const varName = `--crumbs-${path.map(sanitizeTokenSegment).join("-")}`
  if (varName === "--crumbs-") invalidThemeContract(path, "empty native token name")
  const existingPath = state.tokenPathsByVarName.get(varName)
  if (existingPath !== undefined) {
    throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.ThemeTokenCollision,
      `Duplicate native theme token "${varName}" for "${formatPath(path)}"; already used by "${formatPath(existingPath)}"`,
    ))
  }
  state.tokenPathsByVarName.set(varName, path)
  return `var(${varName})` as NativeThemeVar
}

function sanitizeTokenSegment(segment: string): string {
  return segment
    .replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
}

function collectThemeValues(
  contract: Record<string, unknown>,
  values: unknown,
  path: ReadonlyArray<string>,
  tokens: Record<string, NativeThemeValue>,
  ownerContract: object,
): void {
  if (!isRecord(values)) {
    throw new Error(`Theme values for "${formatPath(path)}" must be an object`)
  }

  const contractKeys = new Set(Object.keys(contract))
  const valueKeys = new Set(Object.keys(values))
  for (const key of valueKeys) {
    if (!contractKeys.has(key)) {
      throw new Error(`Unknown theme value "${formatPath([...path, key])}"`)
    }
  }

  for (const [key, contractValue] of Object.entries(contract)) {
    const nextPath = [...path, key]
    if (!valueKeys.has(key)) {
      throw new Error(`Missing theme value for "${formatPath(nextPath)}"`)
    }
    const themeValue = values[key]
    if (isThemeVar(contractValue)) {
      if (!samePath(getThemeTokenPath(contractValue), nextPath)) invalidThemeContract(nextPath, "token is registered to a different raw path")
      if (isThemeTokenContract(ownerContract) && !isThemeTokenOwnedByContract(ownerContract, contractValue)) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenThemeTokenContractMismatch,
          `Native theme token at "${formatPath(nextPath)}" belongs to a different domain contract. Reuse the owning contract token or migrate the contract before creating a theme.`,
        ))
      }
      if (typeof themeValue !== "string" && typeof themeValue !== "number") {
        throw new Error(`Theme value for "${formatPath(nextPath)}" must be a string or number`)
      }
      if (!validateThemeTokenValueForContract(ownerContract, contractValue, themeValue)) {
        const domain = getThemeTokenDomainForContract(ownerContract, contractValue)
        throw new Error(`Theme value for "${formatPath(nextPath)}" does not satisfy the ${domain?.kind ?? "native"} token domain`)
      }
      tokens[getThemeVarName(contractValue)] = themeValue
    } else if (isRecord(contractValue)) {
      collectThemeValues(contractValue, themeValue, nextPath, tokens, ownerContract)
    } else invalidThemeContract(nextPath, "expected a registered native token leaf")
  }
}

function samePath(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
  return left.length === right.length && left.every((segment, index) => segment === right[index])
}

function invalidThemeContract(path: ReadonlyArray<string>, reason: string): never {
  throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.InvalidThemeContract,
    `Invalid native theme contract at "${formatPath(path)}": ${reason}. Reuse the owning createThemeContract result without relocating leaves; rebuild serialized contracts in their owning authoring module.`))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function formatPath(path: ReadonlyArray<string>): string {
  return path.length > 0 ? path.join(".") : "<root>"
}
