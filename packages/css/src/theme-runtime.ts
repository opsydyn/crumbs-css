import {
  createContext,
  createElement,
  type Context,
  type ReactElement,
  type ReactNode,
  use,
  useMemo,
} from "react"
import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode } from "./diagnostics"
import type { ImageStyle, TextStyle, ViewStyle } from "react-native"
import type {
  NativeRecipe,
  NativeRecipeSelection,
  NativeRecipeVariantsConfig,
  NativeStyle,
  NativeTheme,
} from "./native-style"
import { NativeRecipeType } from "./native-tags"
import { isNativeStyleMap, markNativeStyleMap } from "./native-style-map"
import {
  getThemeContractIdentityKey,
  getThemeContractShapeSignature,
  getThemeTokenAliasForContract,
  getThemeTokenDomainForContract,
  getThemeTokenMetadata,
  type NativeThemeTokenReference,
  type ThemeVar,
  assertThemeTokenReference,
  isThemeTokenContract,
  isThemeTokenOwnedByContract,
  isRegisteredThemeVar,
  isThemeTokenReferenceCandidate,
} from "./theme-token"
import type {
  TokenThemeContextName,
  TokenThemeLayer,
} from "./tokens/domains"

export type { NativeThemeTokenReference } from "./theme-token"
export {
  createThemeTokenReference,
  isThemeTokenReference,
  NativeThemeTokenReferenceType,
} from "./theme-token"

type NativeThemeContextValue = NativeTheme<Record<string, unknown>>
type ThemeProviderProps<TContract extends Record<string, unknown>> = {
  readonly children?: ReactNode
  readonly theme: NativeTheme<TContract>
}
type RecipeDiagnosticTarget = {
  readonly $$debugName?: string
  readonly variants?: unknown
}
export type NativeRecipeResolver<TVariants extends NativeRecipeVariantsConfig> = (
  selection?: NativeRecipeSelection<TVariants>,
) => ReadonlyArray<NativeStyle>

const NativeThemeContext = createContext<NativeThemeContextValue | null>(null)
type TokenThemeScopeState = {
  readonly baseTheme: NativeTheme<Record<string, unknown>>
  readonly layers: ReadonlyMap<TokenThemeContextName, unknown>
  readonly theme: NativeTheme<Record<string, unknown>>
}
type TokenThemeContextValue = ReadonlyMap<string, TokenThemeScopeState>
const TokenThemeContext: Context<TokenThemeContextValue | null> = sharedRegistry(
  Symbol.for("crumbs.css.token-theme-context.v2"),
  () => createContext<TokenThemeContextValue | null>(null),
)
const recipeDiagnosticWarnings = new Set<string>()
type ThemeResolutionCacheKind = "tokens" | "styles" | "recipe"
type ThemeResolutionCacheEntry = {
  readonly value: unknown
}
type ThemeResolutionCacheByInput = Map<ThemeResolutionCacheKind, ThemeResolutionCacheEntry>
const themeResolutionCache = sharedRegistry(
  Symbol.for("crumbs.css.theme-resolution-cache.v1"),
  () => new WeakMap<object, WeakMap<object, ThemeResolutionCacheByInput>>(),
)

export function ThemeProvider<TContract extends Record<string, unknown>>({
  children,
  theme,
}: ThemeProviderProps<TContract>): ReactElement {
  return createElement(
    NativeThemeContext.Provider,
    { value: theme as NativeThemeContextValue },
    children,
  )
}

export function useTheme<TContract extends Record<string, unknown>>(): NativeTheme<TContract> {
  const theme = use(NativeThemeContext)
  if (theme === null) {
    throw new Error("useTheme must be used within a ThemeProvider from @opsydyn/crumbs-css/theme")
  }
  return theme as NativeTheme<TContract>
}

export type TokenThemeProviderProps<TContract extends Record<string, unknown>> = {
  readonly children?: ReactNode
  readonly contract: TContract
  readonly theme: NativeTheme<TContract>
}

/**
 * A provider keyed by the contract's stable public identity. The context map
 * is shared through a global symbol so duplicate package copies in one app
 * observe the same provider rather than creating isolated React contexts.
 */
export function TokenThemeProvider<TContract extends Record<string, unknown>>({
  children,
  contract,
  theme,
}: TokenThemeProviderProps<TContract>): ReactElement {
  const key = requireTokenContractKey(contract)
  assertTokenThemeCompatibility(contract, theme)
  const parent = use(TokenThemeContext)
  const value = useMemo(() => {
    const next = new Map(parent ?? [])
    const baseTheme = theme as NativeTheme<Record<string, unknown>>
    next.set(key, {baseTheme, layers: new Map(), theme: baseTheme})
    return next
  }, [key, parent, theme])
  return createElement(
    NativeThemeContext.Provider,
    {value: theme as NativeThemeContextValue},
    createElement(TokenThemeContext.Provider, {value}, children),
  )
}

/** Read a theme only when its contract identity and shape are both compatible. */
export function useTokenTheme<TContract extends Record<string, unknown>>(
  contract: TContract,
): NativeTheme<TContract> {
  const key = requireTokenContractKey(contract)
  const themes = use(TokenThemeContext)
  const state = themes?.get(key)
  if (state === undefined) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.TokenThemeProviderMismatch,
      `No TokenThemeProvider is active for contract ${JSON.stringify(key)}. Mount TokenThemeProvider with the same identified contract before calling useTokenTheme.`,
    ))
  }
  const theme = state.theme
  assertTokenThemeCompatibility(contract, theme)
  return theme as NativeTheme<TContract>
}

export type TokenThemeScopeProviderProps<TContract extends Record<string, unknown>> = {
  readonly children?: ReactNode
  readonly contract: TContract
  readonly context: TokenThemeContextName
  readonly values: TokenThemeLayer<TContract>
}

/**
 * Add one independent brand, mode, or density layer to the nearest complete
 * token theme. Layers compose by fixed axis precedence, so provider nesting
 * order cannot change which axis wins when the same token is overridden.
 */
export function TokenThemeScopeProvider<TContract extends Record<string, unknown>>({
  children,
  contract,
  context,
  values,
}: TokenThemeScopeProviderProps<TContract>): ReactElement {
  const key = requireTokenContractKey(contract)
  if (!(TOKEN_THEME_SCOPE_PRECEDENCE as ReadonlyArray<string>).includes(context)) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
      `Unknown token theme context "${String(context)}". Supported contexts: ${TOKEN_THEME_SCOPE_PRECEDENCE.join(", ")}.`,
    ))
  }
  const parent = use(TokenThemeContext)
  const parentState = parent?.get(key)
  if (parentState === undefined) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.TokenThemeScopeProviderMismatch,
      `No TokenThemeProvider is active for contract ${JSON.stringify(key)}. Mount a complete TokenThemeProvider before adding a ${context} scope.`,
    ))
  }
  assertTokenThemeCompatibility(contract, parentState.theme)
  const state = useMemo(() => {
    const layers = new Map(parentState.layers)
    layers.set(context, values)
    const theme = materializeTokenThemeScope(
      contract as Record<string, unknown>,
      parentState.baseTheme,
      layers,
    )
    return {
      baseTheme: parentState.baseTheme,
      layers,
      theme,
    } satisfies TokenThemeScopeState
  }, [contract, context, parentState, values])
  const nextContext = useMemo(() => {
    const next = new Map(parent ?? [])
    next.set(key, state)
    return next
  }, [key, parent, state])
  return createElement(
    NativeThemeContext.Provider,
    {value: state.theme},
    createElement(TokenThemeContext.Provider, {value: nextContext}, children),
  )
}

export function isTokenThemeCompatible<TContract extends object>(
  contract: TContract,
  theme: NativeTheme<Record<string, unknown>>,
): boolean {
  const contractKey = getThemeContractIdentityKey(contract)
  const themeKey = getThemeContractIdentityKey(theme.contract)
  const contractSignature = getThemeContractShapeSignature(contract)
  const themeSignature = getThemeContractShapeSignature(theme.contract)
  return contractKey !== undefined && contractKey === themeKey &&
    contractSignature !== undefined && contractSignature === themeSignature
}

type NativePrimitiveStyle = ImageStyle | TextStyle | ViewStyle
type TokenizedNativeStyle<TStyle> = {
  readonly [K in keyof TStyle]?: TStyle[K] | NativeThemeTokenReference
}
type TokenizedNativePrimitiveStyle = TokenizedNativeStyle<ImageStyle> |
  TokenizedNativeStyle<TextStyle> | TokenizedNativeStyle<ViewStyle>
type RecursiveStyleLeaf<TInput> = [Extract<TInput, NativePrimitiveStyle>] extends [never]
  ? NativeStyle : Extract<TInput, NativePrimitiveStyle>
type ResolvedNativeStyleInput<TInput, TSeen = never> = TInput extends false | null | undefined
  ? undefined
  : TInput extends NativePrimitiveStyle
    ? TInput
    : TInput extends ReadonlyArray<infer TEntry>
      ? TInput extends TSeen
        ? RecursiveStyleLeaf<TEntry>
        : ResolvedNativeStyleInput<TEntry, TSeen | TInput>
      : NativeStyle

export function useThemedStyle<TInput>(style: TInput): ResolvedNativeStyleInput<TInput> | undefined {
  const theme = useTheme()
  return useMemo(() => resolveThemeTokens(style, theme), [style, theme])
}

type ResolvedThemeStyles<TStyles extends Readonly<Record<string, unknown>>> = {
  readonly [K in keyof TStyles]: TStyles[K] extends NativeRecipe<infer TVariants>
    ? NativeRecipe<TVariants>
    : TStyles[K] extends NativePrimitiveStyle
      ? TStyles[K] | undefined
      : TStyles[K] extends TokenizedNativePrimitiveStyle
        ? NativeStyle | undefined
        : TStyles[K] extends Readonly<Record<string, unknown>>
          ? { readonly [V in keyof TStyles[K]]: ResolvedNativeStyleInput<TStyles[K][V]> | undefined }
          : ResolvedNativeStyleInput<TStyles[K]> | undefined
}

export function useThemedStyles<TStyles extends Readonly<Record<string, unknown>>>(
  styles: TStyles,
): ResolvedThemeStyles<TStyles> {
  const theme = useTheme()
  return useMemo(() => resolveThemeStyles(styles, theme), [styles, theme])
}

export function resolveThemeStyles<TStyles extends Readonly<Record<string, unknown>>>(
  styles: TStyles,
  theme: NativeTheme<Record<string, unknown>>,
): ResolvedThemeStyles<TStyles> {
  const cached = getCachedResolution(theme, styles, "styles")
  if (cached.hit) return cached.value as ResolvedThemeStyles<TStyles>

  const resolved = {} as Record<keyof TStyles, unknown>
  let changed = false
  for (const [key, style] of Object.entries(styles)) {
    const next = resolveStyleExport(style, theme)
    resolved[key as keyof TStyles] = next
    if (next !== style) changed = true
  }
  const result = (changed ? resolved : styles) as ResolvedThemeStyles<TStyles>
  setCachedResolution(theme, styles, "styles", result)
  return result
}

export function resolveThemeTokens<TInput>(
  style: TInput,
  theme: NativeTheme<Record<string, unknown>>,
): ResolvedNativeStyleInput<TInput> | undefined {
  const cached = getCachedResolution(theme, style, "tokens")
  if (cached.hit) return cached.value as ResolvedNativeStyleInput<TInput> | undefined

  const flattened = flattenStyle(style)
  if (flattened === undefined) {
    setCachedResolution(theme, style, "tokens", undefined)
    return undefined
  }

  const entries = Object.entries(flattened)
  let changed = Array.isArray(style)
  let resolved: Record<string, unknown> | undefined = Array.isArray(style) ? {} : undefined
  for (const [index, entry] of entries.entries()) {
    const [key, value] = entry
    if (isThemeTokenReferenceCandidate(value)) {
      assertThemeTokenReference(value, key)
      if (resolved === undefined) {
        resolved = {}
        for (const [previousKey, previousValue] of entries.slice(0, index)) {
          resolved[previousKey] = previousValue
        }
      }
      resolved[key] = resolveTokenValue(value.varName, theme)
      changed = true
    } else if (resolved !== undefined) resolved[key] = value
  }

  const result = (changed ? resolved ?? {} : style) as ResolvedNativeStyleInput<TInput>
  setCachedResolution(theme, style, "tokens", result)
  return result
}

export function resolveRecipeStyle<TVariants extends NativeRecipeVariantsConfig>(
  recipe: NativeRecipe<TVariants>,
  selection: NativeRecipeSelection<TVariants> = {},
): ReadonlyArray<NativeStyle> {
  warnForPartialRecipePayload(recipe)

  const selected = { ...(recipe.defaultVariants ?? {}), ...selection }
  const styles: Array<NativeStyle | undefined> = []
  styles.push(recipe.base)

  for (const [variantName, variantValues] of Object.entries(recipe.variants ?? {})) {
    const selectedValue = selected[variantName]
    if (selectedValue === undefined) continue
    if (variantValues === undefined || !(String(selectedValue) in variantValues)) {
      warnForInvalidRecipeVariant(recipe, variantName, selectedValue, variantValues)
      continue
    }
    styles.push(variantValues[String(selectedValue)])
  }

  for (const compoundVariant of recipe.compoundVariants ?? []) {
    if (compoundVariantMatches(compoundVariant.variants, selected)) {
      styles.push(compoundVariant.style)
    }
  }

  return styles.filter((style): style is NativeStyle => style !== undefined)
}

export function createRecipeResolver<TVariants extends NativeRecipeVariantsConfig>(
  recipe: NativeRecipe<TVariants>,
): NativeRecipeResolver<TVariants> {
  return (selection = {}) => resolveRecipeStyle(recipe, selection)
}

function flattenStyle(style: unknown): Record<string, unknown> | undefined {
  if (style === null || style === undefined || style === false) return undefined
  if (Array.isArray(style)) {
    const flattened = style.flatMap((item) => {
      const resolved = flattenStyle(item)
      return resolved === undefined ? [] : [resolved]
    })
    if (flattened.length === 0) return undefined
    return Object.assign({}, ...flattened) as Record<string, unknown>
  }
  if (typeof style === "object") return style as Record<string, unknown>
  return undefined
}

function resolveStyleExport(
  style: unknown,
  theme: NativeTheme<Record<string, unknown>>,
):
  | NativeRecipe<NativeRecipeVariantsConfig>
  | NativeStyle
  | Readonly<Record<string, NativeStyle | undefined>>
  | undefined {
  if (isNativeRecipe(style)) return resolveRecipeThemeTokens(style, theme)
  if (isNestedStyleMap(style)) {
    const resolved: Record<string, NativeStyle | undefined> = {}
    let changed = false
    for (const [key, value] of Object.entries(style)) {
      const next = resolveThemeTokens(value, theme)
      resolved[key] = next
      if (next !== value) changed = true
    }
    if (!changed) return style
    return isNativeStyleMap(style) ? markNativeStyleMap(resolved) : resolved
  }
  return resolveThemeTokens(style, theme)
}

function resolveRecipeThemeTokens<TVariants extends NativeRecipeVariantsConfig>(
  recipe: NativeRecipe<TVariants>,
  theme: NativeTheme<Record<string, unknown>>,
): NativeRecipe<TVariants> {
  const cached = getCachedResolution(theme, recipe, "recipe")
  if (cached.hit) return cached.value as NativeRecipe<TVariants>

  const variants: Record<string, Record<string, NativeStyle | undefined>> = {}
  let changed = recipe.variants === undefined || recipe.defaultVariants === undefined || recipe.compoundVariants === undefined
  for (const [variantName, variantValues] of Object.entries(recipe.variants ?? {})) {
    const resolvedValues: Record<string, NativeStyle | undefined> = {}
    for (const [valueName, style] of Object.entries(variantValues)) {
      const next = resolveThemeTokens(style, theme)
      resolvedValues[valueName] = next
      if (next !== style) changed = true
    }
    variants[variantName] = resolvedValues
  }

  const base = recipe.base === undefined ? undefined : resolveThemeTokens(recipe.base, theme)
  if (base !== recipe.base) changed = true
  const compoundVariants = (recipe.compoundVariants ?? []).map((compoundVariant) => {
    const style = resolveThemeTokens(compoundVariant.style, theme)
    if (style !== compoundVariant.style) changed = true
    return {style, variants: compoundVariant.variants}
  })

  if (!changed) {
    setCachedResolution(theme, recipe, "recipe", recipe)
    return recipe
  }

  const resolved = {
    $$type: NativeRecipeType,
    ...(recipe.$$debugName === undefined ? {} : { $$debugName: recipe.$$debugName }),
    ...(base === undefined ? {} : { base }),
    compoundVariants,
    defaultVariants: recipe.defaultVariants ?? {},
    variants,
  } as NativeRecipe<TVariants>
  setCachedResolution(theme, recipe, "recipe", resolved)
  return resolved
}

function warnForPartialRecipePayload(
  recipe: NativeRecipe<NativeRecipeVariantsConfig> | RecipeDiagnosticTarget,
): void {
  if (recipe.variants !== undefined) return
  warnOnce(
    `missing-variants:${recipeDiagnosticName(recipe)}`,
    formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.PartialRecipePayload,
      `Invalid native recipe "${recipeDiagnosticName(recipe)}": missing variants map; using base fallback. This can happen when Metro serves stale transformed output.`,
    ),
  )
}

function warnForInvalidRecipeVariant(
  recipe: RecipeDiagnosticTarget,
  variantName: string,
  selectedValue: unknown,
  variantValues: Readonly<Record<string, NativeStyle>> | undefined,
): void {
  const supportedValues = Object.keys(variantValues ?? {}).join(", ") || "(none)"
  warnOnce(
    `invalid-variant:${recipeDiagnosticName(recipe)}:${variantName}:${String(selectedValue)}`,
    formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.InvalidRecipeVariant,
      `Invalid native recipe "${recipeDiagnosticName(recipe)}": variant "${variantName}" does not define value "${String(selectedValue)}"; supported values: ${supportedValues}.`,
    ),
  )
}

function recipeDiagnosticName(recipe: RecipeDiagnosticTarget): string {
  return recipe.$$debugName ?? "anonymous"
}

function warnOnce(key: string, message: string): void {
  if (!shouldWarnInDev() || recipeDiagnosticWarnings.has(key)) return
  recipeDiagnosticWarnings.add(key)
  console.warn(message)
}

function shouldWarnInDev(): boolean {
  const nativeDev = (globalThis as { readonly __DEV__?: boolean }).__DEV__
  if (nativeDev !== undefined) return nativeDev
  if (typeof process === "undefined") return true
  return process.env.NODE_ENV !== "production"
}

function compoundVariantMatches(
  compoundSelection: Readonly<Record<string, unknown>>,
  selection: Readonly<Record<string, unknown>>,
): boolean {
  return Object.entries(compoundSelection).every(
    ([variantName, value]) => selection[variantName] === value,
  )
}

function isNativeRecipe(value: unknown): value is NativeRecipe<NativeRecipeVariantsConfig> {
  return (
    typeof value === "object" &&
    value !== null &&
    "$$type" in value &&
    value.$$type === NativeRecipeType
  )
}

function isNestedStyleMap(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  if (isNativeStyleMap(value)) return true
  const entries = Object.entries(value)
  return entries.length > 0 && entries.every(([key, entry]) => {
    if (isStructuredNativeValue(key, entry)) return false
    return entry === undefined || entry === null || entry === false ||
      (typeof entry === "object" && !isThemeTokenReferenceCandidate(entry))
  })
}

const NATIVE_ARRAY_VALUE_PROPS = new Set([
  "transform", "transformOrigin", "transformMatrix", "fontVariant", "filter", "boxShadow",
  "experimental_backgroundImage", "experimental_backgroundSize",
  "experimental_backgroundPosition", "experimental_backgroundRepeat",
])

function isStructuredNativeValue(key: string, value: unknown): boolean {
  if (Array.isArray(value)) return NATIVE_ARRAY_VALUE_PROPS.has(key)
  if (typeof value !== "object" || value === null || isThemeTokenReferenceCandidate(value)) return false
  if (key === "color" || key.endsWith("Color")) return true
  if ((key === "shadowOffset" || key === "textShadowOffset") && "width" in value && "height" in value) return true
  // Animated nodes are opaque native values; never execute them here.
  return "__getValue" in value && typeof value.__getValue === "function"
}

function resolveTokenValue(varName: string, theme: NativeTheme<Record<string, unknown>>): unknown {
  const token = `var(${varName})` as ThemeVar
  if (isThemeTokenContract(theme.contract) && !isThemeTokenOwnedByContract(theme.contract, token)) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.TokenThemeTokenContractMismatch,
      `Theme token "${varName}" does not belong to the active domain contract. Use the token reference exported by that contract or keep the legacy reference on a legacy ThemeProvider.`,
    ))
  }
  if (!Object.prototype.hasOwnProperty.call(theme.tokens, varName)) {
    throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.MissingThemeToken,
      `Theme token "${varName}" is missing from the active native theme`))
  }
  return theme.tokens[varName]
}

const TOKEN_THEME_SCOPE_PRECEDENCE: ReadonlyArray<TokenThemeContextName> = [
  "brand",
  "mode",
  "density",
]

function materializeTokenThemeScope(
  contract: Record<string, unknown>,
  baseTheme: NativeTheme<Record<string, unknown>>,
  layers: ReadonlyMap<TokenThemeContextName, unknown>,
): NativeTheme<Record<string, unknown>> {
  const tokens: Record<string, string | number> = {...baseTheme.tokens}
  for (const context of TOKEN_THEME_SCOPE_PRECEDENCE) {
    const layer = layers.get(context)
    if (layer !== undefined) applyTokenThemeLayer(contract, contract, layer, [], context, tokens)
  }

  const resolving = new Set<string>()
  const resolvePath = (path: ReadonlyArray<string>): string | number => {
    const reference = getThemeTokenAtPath(contract, path)
    if (!isRegisteredThemeVar(reference)) {
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
        `Token theme scope target "${path.join(".")}" is not a registered token.`,
      ))
    }
    const metadata = getThemeTokenMetadata(reference)
    const alias = getThemeTokenAliasForContract(contract, reference)
    if (alias === undefined) {
      const value = tokens[metadata.varName]
      if (value === undefined) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
          `Complete token theme snapshot is missing "${path.join(".")}".`,
        ))
      }
      return value
    }
    const key = pathKey(path)
    if (resolving.has(key)) {
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.TokenAliasCycle,
        `Token alias cycle detected while resolving scoped snapshot at "${path.join(".")}".`,
      ))
    }
    resolving.add(key)
    const targetReference = getThemeTokenAtPath(contract, alias.targetPath)
    const target = isRegisteredThemeVar(targetReference)
      ? resolvePath(alias.targetPath)
      : alias.fallback
    if (target === undefined) {
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
        `Complete token theme snapshot is missing alias target "${alias.targetPath.join(".")}" for "${path.join(".")}".`,
      ))
    }
    resolving.delete(key)
    tokens[metadata.varName] = target
    return target
  }

  const values: Record<string, unknown> = {}
  collectTokenThemeSnapshot(contract, contract, [], values, resolvePath)
  return {contract, tokens, values: values as NativeTheme<Record<string, unknown>>["values"]}
}

function applyTokenThemeLayer(
  rootContract: Record<string, unknown>,
  contract: Record<string, unknown>,
  layer: unknown,
  path: ReadonlyArray<string>,
  context: TokenThemeContextName,
  tokens: Record<string, string | number>,
): void {
  if (!isRecord(layer)) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
      `Token theme ${context} scope at "${path.join(".") || "<root>"}" must be a nested record.`,
    ))
  }
  for (const key of Object.keys(layer)) {
    const contractValue = contract[key]
    const nextPath = [...path, key]
    if (contractValue === undefined) {
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
        `Unknown token theme ${context} scope value "${nextPath.join(".")}".`,
      ))
    }
    const value = layer[key]
    if (isRegisteredThemeVar(contractValue)) {
      const alias = getThemeTokenAliasForContract(rootContract, contractValue)
      if (alias !== undefined) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenAliasOverride,
          `Token theme ${context} scope value "${nextPath.join(".")}" is derived from an alias and cannot be overridden.`,
        ))
      }
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
          `Token theme ${context} scope value "${nextPath.join(".")}" must be a string or number.`,
        ))
      }
      const domain = getThemeTokenDomainForContract(rootContract, contractValue)
      if (domain !== undefined && !isValidScopedTokenValue(domain, value)) {
        throw new Error(formatNativeStylesDiagnostic(
          NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
          `Token theme ${context} scope value "${nextPath.join(".")}" does not satisfy the ${domain.kind} token domain.`,
        ))
      }
      tokens[getThemeTokenMetadata(contractValue).varName] = value
    } else if (isRecord(contractValue)) {
      applyTokenThemeLayer(rootContract, contractValue, value, nextPath, context, tokens)
    } else {
      throw new Error(formatNativeStylesDiagnostic(
        NativeStylesDiagnosticCode.TokenThemeScopeInvalid,
        `Invalid token contract at "${nextPath.join(".")}".`,
      ))
    }
  }
}

function collectTokenThemeSnapshot(
  rootContract: Record<string, unknown>,
  contract: Record<string, unknown>,
  path: ReadonlyArray<string>,
  output: Record<string, unknown>,
  resolvePath: (path: ReadonlyArray<string>) => string | number,
): void {
  for (const [key, contractValue] of Object.entries(contract)) {
    const nextPath = [...path, key]
    if (isRegisteredThemeVar(contractValue)) {
      output[key] = resolvePath(nextPath)
    } else if (isRecord(contractValue)) {
      const nested: Record<string, unknown> = {}
      output[key] = nested
      collectTokenThemeSnapshot(rootContract, contractValue, nextPath, nested, resolvePath)
    }
  }
}

function getThemeTokenAtPath(root: Record<string, unknown>, path: ReadonlyArray<string>): unknown {
  let cursor: unknown = root
  for (const segment of path) {
    if (!isRecord(cursor) || !Object.prototype.hasOwnProperty.call(cursor, segment)) return undefined
    cursor = cursor[segment]
  }
  return cursor
}

function pathKey(path: ReadonlyArray<string>): string {
  return path.map(segment => `${segment.length}:${segment}`).join("/")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidScopedTokenValue(
  domain: { readonly kind: string; readonly [key: string]: unknown },
  value: string | number,
): boolean {
  switch (domain.kind) {
    case "color": return typeof value === "string" && value.length > 0
    case "length": {
      const allowNegative = domain.allowNegative === true
      if (value === "auto") return true
      if (typeof value === "number") return Number.isFinite(value) && (allowNegative || value >= 0)
      const pattern = new RegExp(`^${allowNegative ? "[+-]?" : "\\+?"}(?:\\d+(?:\\.\\d*)?|\\.\\d+)%$`)
      return pattern.test(value) && Number.isFinite(Number.parseFloat(value))
    }
    case "duration": return typeof value === "number" && Number.isFinite(value) && value >= 0
    case "opacity": return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    case "enum": return typeof value === "string" && Array.isArray(domain.values) && domain.values.includes(value)
    default: return false
  }
}

function requireTokenContractKey(contract: object): string {
  const key = getThemeContractIdentityKey(contract)
  if (key === undefined) {
    throw new Error(formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.TokenThemeProviderMismatch,
      "TokenThemeProvider and useTokenTheme require a contract created with an explicit stable identity. Use the legacy ThemeProvider for unscoped contracts.",
    ))
  }
  return key
}

function assertTokenThemeCompatibility(
  contract: object,
  theme: NativeTheme<Record<string, unknown>>,
): void {
  if (isTokenThemeCompatible(contract, theme)) return
  const expected = getThemeContractIdentityKey(contract) ?? "<unidentified>"
  const actual = getThemeContractIdentityKey(theme.contract) ?? "<unidentified>"
  throw new Error(formatNativeStylesDiagnostic(
    NativeStylesDiagnosticCode.TokenThemeProviderMismatch,
    `Theme contract ${JSON.stringify(actual)} is incompatible with requested contract ${JSON.stringify(expected)}. Use the theme created from the same stable contract identity and shape.`,
  ))
}

function getCachedResolution(
  theme: object,
  input: unknown,
  kind: ThemeResolutionCacheKind,
): {readonly hit: false} | {readonly hit: true; readonly value: unknown} {
  if (!isCacheableObject(input)) return {hit: false}
  const byInput = themeResolutionCache.get(theme)
  const entries = byInput?.get(input)
  const entry = entries?.get(kind)
  return entry === undefined ? {hit: false} : {hit: true, value: entry.value}
}

function setCachedResolution(
  theme: object,
  input: unknown,
  kind: ThemeResolutionCacheKind,
  value: unknown,
): void {
  if (!isCacheableObject(input)) return
  let byInput = themeResolutionCache.get(theme)
  if (byInput === undefined) {
    byInput = new WeakMap<object, ThemeResolutionCacheByInput>()
    themeResolutionCache.set(theme, byInput)
  }
  let entries = byInput.get(input)
  if (entries === undefined) {
    entries = new Map()
    byInput.set(input, entries)
  }
  entries.set(kind, {value})
}

function isCacheableObject(value: unknown): value is object {
  return typeof value === "object" && value !== null
}

function sharedRegistry<T>(key: symbol, create: () => T): T {
  const root = globalThis as unknown as Record<PropertyKey, unknown>
  const descriptor = Object.getOwnPropertyDescriptor(root, key)
  if (descriptor !== undefined && "value" in descriptor) return descriptor.value as T
  const value = create()
  Object.defineProperty(root, key, {value, enumerable: false, configurable: false, writable: false})
  return value
}
