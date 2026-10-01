import {
  createContext,
  createElement,
  type Context,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"
import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode } from "./diagnostics"
import type { ImageStyle, TextStyle, ViewStyle } from "react-native"
import type {
  NativeRecipe,
  NativeRecipeVariantsConfig,
  NativeSprinklesLookupPlan,
  NativeStyle,
  NativeTheme,
} from "./native-style"
import type {NativeComponentRecipeDescriptor} from "./components"
import {
  validateNativeComponentRecipeExtensionDescriptor,
  type NativeComponentRecipeExtensionDescriptor,
} from "./components/extension-contract"
import {validateNativeComponentContract} from "./components/contracts"
import type { NativePrimitiveDomain } from "./compiler/native-capture"
import {
  NativeComponentRecipeContractVersion,
  NativeComponentRecipeExtensionType,
  NativeComponentRecipeExtensionVersion,
  NativeComponentRecipeType,
  NativeComponentRecipeLegacyVersion,
  NativeComponentRecipeVersion,
  NativeRecipeClassType,
  NativeRecipeType,
  NativeSprinklesLookupPlanType,
} from "./native-tags"
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
import {
  createThemeDependencyPlan,
  themeDependencyPathKey,
  type ThemeDependencyPlan,
  type ThemeDependencyPlanEntry,
  type ThemeDependencyPathSegment,
} from "./runtime/theme-dependency-plan"
import {
  createThemeSelectorStore,
  createThemeStore,
  type ThemeSelectorStore,
  type ThemeStore,
} from "./runtime/theme-store"

export {
  resolveRecipeStyle,
  createRecipeResolver,
  resolveComponentRecipeStyles,
  createComponentRecipeResolver,
} from "./runtime/theme-recipe-resolvers"
export type {
  NativeRecipeResolver,
  RecipeResolverOptions,
  RecipeResolverControls,
  BoundedNativeRecipeResolver,
  NativeComponentRecipeResolver,
  ComponentRecipeResolverOptions,
  ComponentRecipeResolverControls,
  BoundedNativeComponentRecipeResolver,
} from "./runtime/theme-recipe-resolvers"
export { createSprinklesResolver } from "./runtime/theme-sprinkles-resolver"
export type {
  NativeSprinklesResolver,
  SprinklesResolverOptions,
  SprinklesResolverControls,
  BoundedNativeSprinklesResolver,
} from "./runtime/theme-sprinkles-resolver"

export type { NativeThemeTokenReference } from "./theme-token"
export type {
  NativeSprinklesLookupPlan,
  NativeSprinklesSelection,
} from "./native-style"
export type {
  ThemeDependencyPlan,
  ThemeDependencyPlanEntry,
  ThemeDependencyPathSegment,
} from "./runtime/theme-dependency-plan"
export { createThemeDependencyPlan } from "./runtime/theme-dependency-plan"
export type {
  RecipeCompoundMatcher,
  RecipeResolutionInput,
  RecipeResolutionPlan,
  RecipeResolutionVariant,
  RecipeResolverCacheStats,
} from "./runtime/recipe-resolution-plan"
export {
  createComponentRecipeResolutionPlan,
  resolveComponentRecipeResolutionPlan,
} from "./runtime/component-recipe-resolution-plan"
export type {
  ComponentRecipeCompoundMatcher,
  ComponentRecipeInvalidVariantReporter,
  ComponentRecipeResolutionPlan,
  ComponentRecipeResolutionVariant,
} from "./runtime/component-recipe-resolution-plan"
export type {
  NativeSprinklesResolutionPlan,
  NativeSprinklesResolutionSelection,
} from "./runtime/sprinkles-resolution-plan"
export {
  createNativeMapValueFn,
  createNativeNormalizeValueFn,
  createNativeConditionResolver,
  createNativeConditionStore,
  defaultNativeConditionSnapshot,
  mapNativeConditionValueToBranches,
  nativeConditionSnapshotKey,
  NATIVE_CONDITION_BREAKPOINTS,
  NATIVE_RESPONSIVE_CONDITION_MATCHERS,
  NATIVE_RESPONSIVE_CONDITION_NAMES,
  normalizeNativeConditionInput,
  useNativeConditionSnapshot,
} from "./conditions"
export {
  NativeExpressionEvaluationError,
  createNativeExpressionRuntime,
  evaluateNativeExpression,
  foldNativeExpression,
} from "./expressions"
export type {
  NativeExpressionEvaluationErrorCode,
  NativeExpressionEvaluationState,
  NativeExpressionRuntime,
  NativeExpressionRuntimeStats,
} from "./expressions"
export type {
  NativeConditionDefinitions,
  NativeConditionBranch,
  NativeConditionInput,
  NativeConditionMatcher,
  NativeConditionNameList,
  NativeConditionSnapshot,
  NativeConditionSource,
  NativeConditionStore,
  NativeConditionStoreOptions,
  NativeConditionStoreStats,
  NativeConditionValueMapper,
  NativeContrastPreference,
  NativeConditionalRecord,
  NativeConditionalTuple,
  NativeConditionalValue,
  NativeMapValueFn,
  NativeNormalizedConditionalValue,
  NativeNormalizeValueFn,
  NativeDirection,
  NativeFontScaleBucket,
  NativeHeightBucket,
  NativeMotionPreference,
  NativeOrientation,
  NativePlatform,
  NativeWidthBucket,
} from "./conditions"
export {
  createThemeTokenReference,
  isThemeTokenReference,
  NativeThemeTokenReferenceType,
} from "./theme-token"

type NativeThemeContextValue = NativeTheme<Record<string, unknown>>
type NativeThemeStore = ThemeStore<NativeThemeContextValue>
type ThemeProviderProps<TContract extends Record<string, unknown>> = {
  readonly children?: ReactNode
  readonly theme: NativeTheme<TContract>
}
type TokenThemeScopeState = {
  readonly baseTheme: NativeTheme<Record<string, unknown>>
  readonly layers: ReadonlyMap<TokenThemeContextName, unknown>
  readonly theme: NativeTheme<Record<string, unknown>>
  readonly store: NativeThemeStore
}
type TokenThemeContextValue = ReadonlyMap<string, TokenThemeScopeState>
const ThemeStoreContext: Context<NativeThemeStore | null> = sharedRegistry(
  Symbol.for("crumbs.css.theme-store-context.v1"),
  () => createContext<NativeThemeStore | null>(null),
)
const TokenThemeContext: Context<TokenThemeContextValue | null> = sharedRegistry(
  Symbol.for("crumbs.css.token-theme-context.v2"),
  () => createContext<TokenThemeContextValue | null>(null),
)
type ThemeResolutionCacheKind = "tokens" | "styles" | "recipe" | "component-recipe" | "component-recipe-extension"
type ThemeResolutionCacheEntry = {
  readonly value: unknown
}
type ThemeResolutionCacheByInput = Map<ThemeResolutionCacheKind, ThemeResolutionCacheEntry>
const themeResolutionCache = sharedRegistry(
  Symbol.for("crumbs.css.theme-resolution-cache.v1"),
  () => new WeakMap<object, WeakMap<object, ThemeResolutionCacheByInput>>(),
)

function useThemeStore(theme: NativeThemeContextValue): NativeThemeStore {
  const [store] = useState(() => createThemeStore(theme))
  useLayoutEffect(() => {
    store.setSnapshot(theme)
  }, [store, theme])
  return store
}

function useThemeStoreSelector<TSelected>(
  store: NativeThemeStore,
  selector: (theme: NativeThemeContextValue) => TSelected,
): TSelected {
  const selectedStore = useMemo<ThemeSelectorStore<TSelected>>(
    () => createThemeSelectorStore(store, selector),
    [selector, store],
  )
  return useSyncExternalStore(
    selectedStore.subscribe,
    selectedStore.getSnapshot,
    selectedStore.getSnapshot,
  )
}

const identityThemeSelector = (theme: NativeThemeContextValue): NativeThemeContextValue => theme

export function ThemeProvider<TContract extends Record<string, unknown>>({
  children,
  theme,
}: ThemeProviderProps<TContract>): ReactElement {
  const store = useThemeStore(theme as NativeThemeContextValue)
  return createElement(
    ThemeStoreContext.Provider,
    {value: store},
    children,
  )
}

export function useTheme<TContract extends Record<string, unknown>>(): NativeTheme<TContract> {
  const store = use(ThemeStoreContext)
  if (store === null) {
    throw new Error("useTheme must be used within a ThemeProvider from @opsydyn/crumbs-css/theme")
  }
  return useThemeStoreSelector(store, identityThemeSelector) as NativeTheme<TContract>
}

export function useThemeSelector<TSelected>(
  selector: (theme: NativeTheme<Record<string, unknown>>) => TSelected,
): TSelected {
  const store = use(ThemeStoreContext)
  if (store === null) {
    throw new Error("useThemeSelector must be used within a ThemeProvider from @opsydyn/crumbs-css/theme")
  }
  return useThemeStoreSelector(store, selector)
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
  const store = useThemeStore(theme as NativeThemeContextValue)
  const parent = use(TokenThemeContext)
  const value = useMemo(() => {
    const next = new Map(parent ?? [])
    const baseTheme = theme as NativeTheme<Record<string, unknown>>
    next.set(key, {baseTheme, layers: new Map(), store, theme: baseTheme})
    return next
  }, [key, parent, store, theme])
  return createElement(
    ThemeStoreContext.Provider,
    {value: store},
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
  const theme = useThemeStoreSelector(state.store, identityThemeSelector)
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
  const scopedTheme = useMemo(() => {
    const layers = new Map(parentState.layers)
    layers.set(context, values)
    return materializeTokenThemeScope(
      contract as Record<string, unknown>,
      parentState.baseTheme,
      layers,
    )
  }, [context, contract, parentState, values])
  const store = useThemeStore(scopedTheme)
  const state = useMemo(() => {
    const layers = new Map(parentState.layers)
    layers.set(context, values)
    return {
      baseTheme: parentState.baseTheme,
      layers,
      store,
      theme: scopedTheme,
    } satisfies TokenThemeScopeState
  }, [context, parentState, scopedTheme, store, values])
  const nextContext = useMemo(() => {
    const next = new Map(parent ?? [])
    next.set(key, state)
    return next
  }, [key, parent, state])
  return createElement(
    ThemeStoreContext.Provider,
    {value: store},
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
  : TInput extends NativeComponentRecipeDescriptor | NativeComponentRecipeExtensionDescriptor
    ? TInput
  : TInput extends NativePrimitiveStyle
    ? TInput
    : TInput extends ReadonlyArray<infer TEntry>
      ? TInput extends TSeen
        ? RecursiveStyleLeaf<TEntry>
        : ResolvedNativeStyleInput<TEntry, TSeen | TInput>
      : NativeStyle

export function useThemedStyle<TInput>(style: TInput): ResolvedNativeStyleInput<TInput> | undefined {
  const selector = useCallback(
    (theme: NativeTheme<Record<string, unknown>>) => resolveThemeTokens(style, theme),
    [style],
  )
  return useThemeSelector(selector)
}

export type ResolvedThemeStyles<TStyles extends Readonly<Record<string, unknown>>> = {
  readonly [K in keyof TStyles]: TStyles[K] extends NativeComponentRecipeDescriptor | NativeComponentRecipeExtensionDescriptor
    ? TStyles[K]
    : TStyles[K] extends NativeRecipe<infer TVariants>
    ? NativeRecipe<TVariants>
    : TStyles[K] extends NativeSprinklesLookupPlan<
      infer TPrimitives extends NativePrimitiveDomain,
      infer TProperties extends object,
      infer TShorthands extends Readonly<Record<string, readonly string[]>>
    >
      ? NativeSprinklesLookupPlan<TPrimitives, TProperties, TShorthands>
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
  const selector = useCallback(
    (theme: NativeTheme<Record<string, unknown>>) => resolveThemeStyles(styles, theme),
    [styles],
  )
  return useThemeSelector(selector)
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

export type ThemeDependencyResolutionMetrics = {
  readonly recomputations: number
  readonly notifications: number
  readonly changedTokens: ReadonlyArray<string>
}

export type ThemeDependencyResolution<TStyles extends Readonly<Record<string, unknown>>> = {
  readonly value: ResolvedThemeStyles<TStyles>
  readonly metrics: ThemeDependencyResolutionMetrics
}

export type ThemeDependencyResolver<TStyles extends Readonly<Record<string, unknown>>> = {
  readonly resolve: (
    theme: NativeTheme<Record<string, unknown>>,
  ) => ThemeDependencyResolution<TStyles>
}

/**
 * Resolves only the exported paths named by a compiler dependency plan. The
 * receipt's notification count is the number of output paths whose resolved
 * value changed; it is an invalidation signal for a future subscription layer,
 * not a claim about React renders.
 */
export function createThemeDependencyResolver<TStyles extends Readonly<Record<string, unknown>>>(
  styles: TStyles,
  plan: ThemeDependencyPlan,
): ThemeDependencyResolver<TStyles> {
  if (plan.$$type !== "crumbs.css.theme-dependency-plan" || plan.version !== 1) {
    throw new TypeError("Unsupported theme dependency plan version")
  }
  const canonicalPlan = createThemeDependencyPlan(plan.entries)
  const byToken = new Map<string, ThemeDependencyPlanEntry[]>()
  for (const entry of canonicalPlan.entries) {
    for (const token of entry.tokens) {
      const dependants = byToken.get(token)
      if (dependants === undefined) byToken.set(token, [entry])
      else dependants.push(entry)
    }
  }
  const planTokens = [...byToken.keys()].sort((left, right) => left.localeCompare(right))
  let previousTheme: NativeTheme<Record<string, unknown>> | undefined
  let previousValue: ResolvedThemeStyles<TStyles> | undefined
  let hasPrevious = false

  return {
    resolve(theme) {
      if (hasPrevious && theme === previousTheme) {
        return {
          value: previousValue!,
          metrics: {recomputations: 0, notifications: 0, changedTokens: []},
        }
      }

      const contractChanged = hasPrevious && previousTheme!.contract !== theme.contract
      const changedTokens = hasPrevious && !contractChanged
        ? planTokens.filter(token => themeTokenChanged(previousTheme!, theme, token))
        : planTokens
      const affected = hasPrevious
        ? uniquePlanEntries(changedTokens.flatMap(token => byToken.get(token) ?? []))
        : canonicalPlan.entries
      let nextValue = hasPrevious ? previousValue! : styles as ResolvedThemeStyles<TStyles>
      let notifications = 0
      for (const entry of affected) {
        const source = readThemeDependencyPath(styles, entry.path)
        const previous = hasPrevious ? readThemeDependencyPath(previousValue, entry.path).value : undefined
        const next = resolveThemeTokens(source.value, theme)
        if (hasPrevious && equivalentResolvedValue(previous, next)) continue
        nextValue = setThemeDependencyPath(nextValue, entry.path, next)
        if (hasPrevious) notifications += 1
      }

      previousTheme = theme
      previousValue = nextValue
      hasPrevious = true
      return {
        value: nextValue,
        metrics: {
          recomputations: affected.length,
          notifications,
          changedTokens: Object.freeze([...changedTokens]),
        },
      }
    },
  }
}

function themeTokenChanged(
  previous: NativeTheme<Record<string, unknown>>,
  next: NativeTheme<Record<string, unknown>>,
  token: string,
): boolean {
  const previousHas = Object.prototype.hasOwnProperty.call(previous.tokens, token)
  const nextHas = Object.prototype.hasOwnProperty.call(next.tokens, token)
  return previousHas !== nextHas || !Object.is(previous.tokens[token], next.tokens[token])
}

function uniquePlanEntries(entries: ReadonlyArray<ThemeDependencyPlanEntry>): ReadonlyArray<ThemeDependencyPlanEntry> {
  const byPath = new Map<string, ThemeDependencyPlanEntry>()
  for (const entry of entries) byPath.set(themeDependencyPathKey(entry.path), entry)
  return [...byPath.values()].sort((left, right) =>
    themeDependencyPathKey(left.path).localeCompare(themeDependencyPathKey(right.path)))
}

function readThemeDependencyPath(
  root: unknown,
  path: ReadonlyArray<ThemeDependencyPathSegment>,
): {readonly value: unknown} {
  let cursor = root
  for (const segment of path) {
    if (cursor === null || typeof cursor !== "object" ||
      !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      throw new TypeError(`Theme dependency plan path does not exist: ${formatThemeDependencyPath(path)}`)
    }
    cursor = (cursor as Record<PropertyKey, unknown>)[segment]
  }
  return {value: cursor}
}

function setThemeDependencyPath<T>(
  root: T,
  path: ReadonlyArray<ThemeDependencyPathSegment>,
  value: unknown,
): T {
  if (path.length === 0) return value as T
  const nextRoot = cloneThemeDependencyContainer(root)
  let cursor = nextRoot
  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index]!
    const objectCursor = cursor as Record<PropertyKey, unknown>
    const child = objectCursor[segment]
    const nextChild = cloneThemeDependencyContainer(child)
    objectCursor[segment] = nextChild
    cursor = nextChild
  }
  const finalCursor = cursor as Record<PropertyKey, unknown>
  finalCursor[path[path.length - 1]!] = value
  return nextRoot as T
}

function cloneThemeDependencyContainer(value: unknown): Record<PropertyKey, unknown> | unknown[] {
  if (Array.isArray(value)) return [...value]
  if (value !== null && typeof value === "object") {
    return Object.assign(Object.create(Object.getPrototypeOf(value)), value) as Record<PropertyKey, unknown>
  }
  throw new TypeError("Theme dependency plan path traverses a non-container value")
}

function equivalentResolvedValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((entry, index) => Object.is(entry, right[index]))
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false
  const leftKeys = Reflect.ownKeys(left)
  const rightKeys = Reflect.ownKeys(right)
  return leftKeys.length === rightKeys.length && leftKeys.every(key =>
    Object.prototype.hasOwnProperty.call(right, key) &&
    Object.is((left as Record<PropertyKey, unknown>)[key], (right as Record<PropertyKey, unknown>)[key]))
}

function formatThemeDependencyPath(path: ReadonlyArray<ThemeDependencyPathSegment>): string {
  return path.map(segment => typeof segment === "number" ? `[${segment}]` : segment).join(".")
}

export function resolveThemeTokens<TInput>(
  style: TInput,
  theme: NativeTheme<Record<string, unknown>>,
): ResolvedNativeStyleInput<TInput> | undefined {
  const cached = getCachedResolution(theme, style, "tokens")
  if (cached.hit) return cached.value as ResolvedNativeStyleInput<TInput> | undefined

  if (isNativeComponentRecipe(style)) {
    const resolved = resolveComponentRecipeThemeTokens(style, theme)
    setCachedResolution(theme, style, "tokens", resolved)
    return resolved as ResolvedNativeStyleInput<TInput>
  }
  if (isNativeComponentRecipeExtension(style)) {
    const resolved = resolveComponentRecipeExtensionThemeTokens(style, theme)
    setCachedResolution(theme, style, "tokens", resolved)
    return resolved as ResolvedNativeStyleInput<TInput>
  }

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
  | NativeComponentRecipeDescriptor
  | NativeSprinklesLookupPlan
  | NativeStyle
  | Readonly<Record<string, NativeStyle | undefined>>
  | undefined {
  if (isNativeComponentRecipe(style)) return resolveComponentRecipeThemeTokens(style, theme)
  if (isNativeRecipe(style)) return resolveRecipeThemeTokens(style, theme)
  if (isNativeSprinklesLookupPlan(style)) return resolveSprinklesThemeTokens(style, theme)
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

function resolveSprinklesThemeTokens(
  plan: NativeSprinklesLookupPlan,
  theme: NativeTheme<Record<string, unknown>>,
): NativeSprinklesLookupPlan {
  let changed = false
  const properties: Record<string, Record<string, NativeStyle>> = {}
  for (const [property, scale] of Object.entries(plan.properties)) {
    const resolvedScale: Record<string, NativeStyle> = {}
    for (const [scaleName, style] of Object.entries(scale)) {
      const next = typeof style === "object" && style !== null
        ? resolveThemeTokens(style, theme) ?? style
        : style
      resolvedScale[scaleName] = next as NativeStyle
      if (next !== style) changed = true
    }
    properties[property] = resolvedScale
  }
  if (!changed) return plan
  return Object.freeze({
    ...plan,
    properties: Object.freeze(Object.fromEntries(
      Object.entries(properties).map(([property, scale]) => [property, Object.freeze(scale)]),
    )),
  }) as NativeSprinklesLookupPlan
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

function resolveComponentRecipeThemeTokens<TRecipe extends NativeComponentRecipeDescriptor>(
  recipe: TRecipe,
  theme: NativeTheme<Record<string, unknown>>,
): TRecipe {
  const cached = getCachedResolution(theme, recipe, "component-recipe")
  if (cached.hit) return cached.value as TRecipe
  if (recipe.version !== NativeComponentRecipeLegacyVersion && recipe.version !== NativeComponentRecipeVersion &&
    recipe.version !== NativeComponentRecipeContractVersion) {
    throw new TypeError(`Unsupported component recipe version ${String(recipe.version)}`)
  }
  if (recipe.version === NativeComponentRecipeContractVersion) {
    if (recipe.contract === undefined) {
      throw new TypeError("Version 3 component recipes require contract metadata")
    }
    const variantSurface = Object.fromEntries(Object.entries(recipe.variants ?? {}).map(([axis, values]) => [
      axis,
      Object.fromEntries(Object.keys(values).map(value => [value, true])),
    ]))
    validateNativeComponentContract(recipe.contract, {slots: recipe.slots, variants: variantSurface}, recipe.stateVariants)
  } else if (recipe.contract !== undefined) {
    throw new TypeError("Component contract metadata requires component recipe version 3")
  }

  let changed = recipe.variants === undefined || recipe.defaultVariants === undefined ||
    recipe.compoundVariants === undefined
  const base = recipe.base === undefined
    ? undefined
    : resolveComponentSlotStyles(recipe.base, theme, "base", () => { changed = true })
  const variants: Record<string, Record<string, Readonly<Record<string, unknown>>>> = {}
  for (const [variantName, variantValues] of Object.entries(recipe.variants ?? {})) {
    const resolvedValues: Record<string, Readonly<Record<string, unknown>>> = {}
    for (const [valueName, styles] of Object.entries(variantValues)) {
      resolvedValues[valueName] = resolveComponentSlotStyles(
        styles,
        theme,
        `variant ${JSON.stringify(variantName)} value ${JSON.stringify(valueName)}`,
        () => { changed = true },
      )
    }
    variants[variantName] = Object.freeze(resolvedValues)
  }

  const compoundVariants = (recipe.compoundVariants ?? []).map((compound, index) => Object.freeze({
    variants: Object.freeze({...compound.variants}),
    styles: resolveComponentSlotStyles(
      compound.styles,
      theme,
      `compound variant ${index}`,
      () => { changed = true },
    ),
  }))
  if (!changed) {
    setCachedResolution(theme, recipe, "component-recipe", recipe)
    return recipe
  }

  const frozenVariants = Object.freeze(Object.fromEntries(
    Object.entries(variants).map(([variantName, values]) => [
      variantName,
      Object.freeze(Object.fromEntries(Object.entries(values).map(([valueName, styles]) => [
        valueName,
        freezeComponentSlotStyles(styles),
      ]))),
    ]),
  ))
  const frozenCompounds = Object.freeze(compoundVariants.map((compound) => Object.freeze({
    variants: compound.variants,
    styles: freezeComponentSlotStyles(compound.styles),
  })))
  const stateVariants = recipe.stateVariants === undefined
    ? undefined
    : cloneAndFreezeComponentStyle(recipe.stateVariants)
  const resolved = Object.freeze({
    $$type: NativeComponentRecipeType,
    version: recipe.version,
    ...(recipe.$$debugName === undefined ? {} : {$$debugName: recipe.$$debugName}),
    slots: Object.freeze({...recipe.slots}),
    ...(recipe.contract === undefined ? {} : {contract: recipe.contract}),
    ...(base === undefined ? {} : {base: freezeComponentSlotStyles(base)}),
    variants: frozenVariants,
    defaultVariants: Object.freeze({...recipe.defaultVariants}),
    ...(stateVariants === undefined ? {} : {stateVariants}),
    compoundVariants: frozenCompounds,
  }) as TRecipe
  setCachedResolution(theme, recipe, "component-recipe", resolved)
  return resolved
}

function resolveComponentRecipeExtensionThemeTokens<TExtension extends NativeComponentRecipeExtensionDescriptor>(
  extension: TExtension,
  theme: NativeTheme<Record<string, unknown>>,
): TExtension {
  const cached = getCachedResolution(theme, extension, "component-recipe-extension")
  if (cached.hit) return cached.value as TExtension
  if (extension.version !== NativeComponentRecipeExtensionVersion) {
    throw new TypeError(`Unsupported component recipe extension version ${String(extension.version)}`)
  }
  const normalized = validateNativeComponentRecipeExtensionDescriptor(extension)
  let changed = false
  const variants = Object.fromEntries(Object.entries(normalized.variants).map(([axis, values]) => [
    axis,
    Object.fromEntries(Object.entries(values).map(([value, styles]) => [
      value,
      resolveComponentSlotStyles(styles, theme,
        `extension variant ${JSON.stringify(axis)} value ${JSON.stringify(value)}`,
        () => { changed = true }),
    ])),
  ]))
  const compoundVariants = normalized.compoundVariants.map((compound, index) => Object.freeze({
    variants: compound.variants,
    styles: resolveComponentSlotStyles(compound.styles, theme,
      `extension compound variant ${index}`,
      () => { changed = true }),
  }))
  const slotOverrides = resolveComponentSlotStyles(normalized.slotOverrides, theme,
    "extension slot overrides",
    () => { changed = true })
  if (!changed) {
    setCachedResolution(theme, extension, "component-recipe-extension", extension)
    return extension
  }

  const resolved = Object.freeze({
    ...normalized,
    defaultVariants: cloneAndFreezeComponentStyle(normalized.defaultVariants),
    variants: Object.freeze(Object.fromEntries(Object.entries(variants).map(([axis, values]) => [
      axis,
      Object.freeze(Object.fromEntries(Object.entries(values).map(([value, styles]) => [
        value,
        freezeComponentSlotStyles(styles as Readonly<Record<string, unknown>>),
      ]))),
    ]))),
    compoundVariants: Object.freeze(compoundVariants.map(compound => Object.freeze({
      variants: cloneAndFreezeComponentStyle(compound.variants),
      styles: freezeComponentSlotStyles(compound.styles),
    }))),
    slotOverrides: freezeComponentSlotStyles(slotOverrides),
  }) as TExtension
  setCachedResolution(theme, extension, "component-recipe-extension", resolved)
  return resolved
}

function resolveComponentSlotStyles(
  styles: unknown,
  theme: NativeTheme<Record<string, unknown>>,
  context: string,
  markChanged: () => void,
): Readonly<Record<string, unknown>> {
  const entries: Array<readonly [string, unknown]> = []
  assertComponentThemeRecord(styles, `Component recipe ${context} slot styles`)
  for (const [slot, style] of Object.entries(styles)) {
    const next = resolveThemeTokens(style, theme)
    if (next !== style) markChanged()
    entries.push([slot, next ?? style])
  }
  return Object.freeze(Object.fromEntries(entries))
}

function assertComponentThemeRecord(
  value: unknown,
  context: string,
): asserts value is Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${context} must be a record`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${context} must be a plain record`)
  }
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${context} must contain enumerable data properties`)
    }
  }
}

function freezeComponentSlotStyles(
  styles: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return Object.freeze(Object.fromEntries(Object.entries(styles).map(([slot, style]) => [
    slot,
    cloneAndFreezeComponentStyle(style),
  ])))
}

function cloneAndFreezeComponentStyle(value: unknown): unknown {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => cloneAndFreezeComponentStyle(entry)))
  }
  if (value === null || typeof value !== "object") return value
  if ("$$type" in value && value.$$type === NativeRecipeClassType &&
    "className" in value && typeof value.className === "string" && Object.isFrozen(value)) {
    return value
  }
  const clone = Object.create(Object.getPrototypeOf(value)) as Record<PropertyKey, unknown>
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined) continue
    if (!("value" in descriptor)) {
      throw new TypeError("Component recipe style values must be plain data records")
    }
    Object.defineProperty(clone, key, {
      ...descriptor,
      value: cloneAndFreezeComponentStyle(descriptor.value),
    })
  }
  return Object.freeze(clone)
}

function isNativeRecipe(value: unknown): value is NativeRecipe<NativeRecipeVariantsConfig> {
  return (
    typeof value === "object" &&
    value !== null &&
    "$$type" in value &&
    value.$$type === NativeRecipeType
  )
}

function isNativeComponentRecipeExtension(value: unknown): value is NativeComponentRecipeExtensionDescriptor {
  return typeof value === "object" && value !== null &&
    "$$type" in value && value.$$type === NativeComponentRecipeExtensionType
}

function isNativeComponentRecipe(value: unknown): value is NativeComponentRecipeDescriptor {
  return (
    typeof value === "object" &&
    value !== null &&
    "$$type" in value &&
    value.$$type === NativeComponentRecipeType
  )
}

function isNativeSprinklesLookupPlan(value: unknown): value is NativeSprinklesLookupPlan {
  return (
    typeof value === "object" &&
    value !== null &&
    "$$type" in value &&
    value.$$type === NativeSprinklesLookupPlanType
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
