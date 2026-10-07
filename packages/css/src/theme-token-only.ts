import {
  createContext,
  createElement,
  use,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type Context,
  type ReactElement,
  type ReactNode,
} from "react"
import {formatNativeStylesDiagnostic, NativeStylesDiagnosticCode} from "./diagnostics"
import {getThemeVarName} from "./theme-contract"
import {createThemeSelectorStore, createThemeStore, type ThemeSelectorStore, type ThemeStore} from "./runtime/theme-store"
import {
  assertThemeTokenReference,
  createThemeTokenReference,
  isThemeTokenContract,
  isThemeTokenOwnedByContract,
  isThemeTokenReferenceCandidate,
  type NativeThemeTokenReference,
  type ThemeVar,
} from "./theme-token"
import type {ImageStyle, TextStyle, ViewStyle} from "react-native"
import type {NativeStyleTokenDomainForProperty} from "./native-style"
import type {DomainThemeVar, TokenDomain, TokenDomainValue} from "./theme-token"
import type {NativeTheme, NativeThemeValue} from "./theme-contract"

declare const themeStyleTokenDomain: unique symbol

/** A token reference that retains the domain inferred from its token contract. */
export type ThemeStyleToken<TDomain extends TokenDomain = TokenDomain> =
  NativeThemeTokenReference & {readonly [themeStyleTokenDomain]: TDomain}

type NativePrimitiveStyle = ImageStyle | TextStyle | ViewStyle

type TokenizedNativeStyle<TStyle extends object> = {
  readonly [K in keyof TStyle]?: Extract<Exclude<TStyle[K], undefined>, NativeThemeValue> | undefined | ThemeStyleToken
}

export type ResolvedTokenNativeStyle<TStyle extends Readonly<Record<string, unknown>>> = {
  readonly [K in keyof TStyle]: TStyle[K] extends ThemeStyleToken<infer TDomain> ? TokenDomainValue<TDomain> : TStyle[K]
}

export type ResolvedTokenStyleMap<TStyles extends Readonly<Record<string, Readonly<Record<string, unknown>>>>> = {
  readonly [K in keyof TStyles]: ResolvedTokenNativeStyle<TStyles[K]>
}

type CheckedTokenStyleValue<
  TStyle extends object,
  TProperty extends PropertyKey,
  TValue,
> = TProperty extends keyof TStyle
  ? TValue extends ThemeStyleToken<infer TDomain>
    ? TDomain extends NativeStyleTokenDomainForProperty<TProperty>
      ? TokenDomainValue<TDomain> extends Exclude<TStyle[TProperty], undefined> ? TValue : never
      : never
    : TValue extends Extract<Exclude<TStyle[TProperty], undefined>, NativeThemeValue> | undefined ? TValue : never
  : never

type CheckedTokenStyles<TStyle extends object, TStyles> = {
  readonly [TName in keyof TStyles]: TStyles[TName] extends Readonly<Record<string, unknown>>
    ? {
        readonly [TProperty in keyof TStyles[TName]]: CheckedTokenStyleValue<
          TStyle,
          TProperty,
          TStyles[TName][TProperty]
        >
      } & (Exclude<keyof TStyles[TName], keyof TStyle> extends never ? unknown : never)
    : never
}

/** Currying keeps the target native style type fixed while preserving literal style keys. */
export function createTokenStyles<TStyle extends NativePrimitiveStyle>() {
  return <const TStyles extends Readonly<Record<string, TokenizedNativeStyle<TStyle>>>>(
    styles: TStyles & CheckedTokenStyles<TStyle, TStyles>,
  ): TStyles => styles
}

/** Create a style reference whose value and domain are derived from its token contract. */
export function themeToken<const TDomain extends TokenDomain>(token: DomainThemeVar<TDomain>): ThemeStyleToken<TDomain> {
  return createThemeTokenReference(getThemeVarName(token)) as ThemeStyleToken<TDomain>
}

type ThemeSnapshot = NativeTheme<Record<string, unknown>>
type ThemeRuntimeStore = ThemeStore<ThemeSnapshot>
const themeStoreContext: Context<ThemeRuntimeStore | null> = sharedRegistry(
  Symbol.for("crumbs.css.theme-store-context.v1"),
  () => createContext<ThemeRuntimeStore | null>(null),
)
const resolutions = new WeakMap<object, WeakMap<object, unknown>>()

type ThemeProviderProps<TContract extends Record<string, unknown>> = {
  readonly children?: ReactNode
  readonly theme: NativeTheme<TContract>
}

/** A minimal provider that interoperates with the full theme entrypoint. */
export function ThemeProvider<TContract extends Record<string, unknown>>({
  children,
  theme,
}: ThemeProviderProps<TContract>): ReactElement {
  const [store] = useState(() => createThemeStore(theme as ThemeSnapshot))
  useLayoutEffect(() => store.setSnapshot(theme as ThemeSnapshot), [store, theme])
  return createElement(themeStoreContext.Provider, {value: store}, children)
}

/** Resolve a flat map of primitive native styles and direct token references. */
export function resolveTokenStyles<
  const TStyles extends Readonly<Record<string, Readonly<Record<string, unknown>>>>,
>(styles: TStyles, theme: ThemeSnapshot): ResolvedTokenStyleMap<TStyles> {
  const cached = getCachedResolution(theme, styles)
  if (cached.found) return cached.value as ResolvedTokenStyleMap<TStyles>

  if (!isPlainRecord(styles)) unsupported("style map must be a flat record")
  const styleEntries = ownDataEntries(styles, "style map")
  let resolvedMap: Record<string, unknown> | undefined
  for (const [styleName, styleValue] of styleEntries) {
    if (!isPlainRecord(styleValue)) unsupported(`style "${styleName}" must be a flat record`)
    const propertyEntries = ownDataEntries(styleValue, `style "${styleName}"`)
    let resolvedStyle: Record<string, unknown> | undefined
    for (const [property, value] of propertyEntries) {
      if (isThemeTokenReferenceCandidate(value)) {
        assertThemeTokenReference(value, property)
        const nextValue = resolveTokenValue(value.varName, theme)
        if (resolvedStyle === undefined) resolvedStyle = {...styleValue}
        Object.defineProperty(resolvedStyle, property, {value: nextValue, enumerable: true, configurable: true, writable: true})
      } else if (value !== undefined && typeof value !== "string" && typeof value !== "number") {
        unsupported(`property "${property}" in style "${styleName}" must be a string, number, undefined, or direct theme token reference`)
      }
    }
    if (resolvedStyle !== undefined) {
      if (resolvedMap === undefined) resolvedMap = {...styles}
      Object.defineProperty(resolvedMap, styleName, {value: resolvedStyle, enumerable: true, configurable: true, writable: true})
    }
  }
  const result = (resolvedMap ?? styles) as ResolvedTokenStyleMap<TStyles>
  setCachedResolution(theme, styles, result)
  return result
}

/** React hook for the resolved token-only style subpath. */
export function useTokenStyles<
  const TStyles extends Readonly<Record<string, Readonly<Record<string, unknown>>>>,
>(styles: TStyles): ResolvedTokenStyleMap<TStyles> {
  const store = use(themeStoreContext)
  if (store === null) {
    throw new Error("useTokenStyles must be used within a ThemeProvider from @opsydyn/crumbs-css/theme/token")
  }
  const selector = useMemo(
    () => (snapshot: ThemeSnapshot) => resolveTokenStyles(styles, snapshot),
    [styles],
  )
  const selectedStore = useMemo<ThemeSelectorStore<ResolvedTokenStyleMap<TStyles>>>(
    () => createThemeSelectorStore(store, selector),
    [selector, store],
  )
  return useSyncExternalStore(selectedStore.subscribe, selectedStore.getSnapshot, selectedStore.getSnapshot)
}

function resolveTokenValue(varName: string, theme: ThemeSnapshot): NativeThemeValue {
  const token = `var(${varName})` as ThemeVar
  if (isThemeTokenContract(theme.contract) && !isThemeTokenOwnedByContract(theme.contract, token)) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.TokenThemeTokenContractMismatch,
      `Theme token "${varName}" does not belong to the active domain contract.`,
    ))
  }
  const descriptor = Object.getOwnPropertyDescriptor(theme.tokens, varName)
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.MissingThemeToken,
      `Theme token "${varName}" is missing from the active native theme`,
    ))
  }
  if (typeof descriptor.value !== "string" && typeof descriptor.value !== "number") {
    unsupported(`theme token "${varName}" did not resolve to a native string or number`)
  }
  return descriptor.value
}

function getCachedResolution(theme: object, styles: object): {readonly found: boolean; readonly value?: unknown} {
  return {found: resolutions.get(theme)?.has(styles) ?? false, value: resolutions.get(theme)?.get(styles)}
}

function setCachedResolution(theme: object, styles: object, value: unknown): void {
  let byStyles = resolutions.get(theme)
  if (byStyles === undefined) {
    byStyles = new WeakMap<object, unknown>()
    resolutions.set(theme, byStyles)
  }
  byStyles.set(styles, value)
}

function ownDataEntries(value: object, location: string): ReadonlyArray<readonly [string, unknown]> {
  const entries: Array<readonly [string, unknown]> = []
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") unsupported(`${location} cannot contain symbol keys`)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      unsupported(`${location} must contain only enumerable own data properties`)
    }
    entries.push([key, descriptor.value])
  }
  return entries
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function unsupported(message: string): never {
  throw new Error(`[crumbs-css:CRUMBS_CSS_TOKEN_STYLE_UNSUPPORTED] ${message}`)
}

function sharedRegistry<T>(key: symbol, create: () => T): T {
  const root = globalThis as unknown as Record<PropertyKey, unknown>
  const descriptor = Object.getOwnPropertyDescriptor(root, key)
  if (descriptor !== undefined && "value" in descriptor) return descriptor.value as T
  const value = create()
  Object.defineProperty(root, key, {value, enumerable: false, configurable: false, writable: false})
  return value
}
