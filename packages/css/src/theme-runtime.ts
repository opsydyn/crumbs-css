import {
  createContext,
  createElement,
  type ReactElement,
  type ReactNode,
  use,
  useMemo,
} from "react"
import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode } from "./diagnostics"
import type {
  NativeRecipe,
  NativeRecipeSelection,
  NativeRecipeVariantsConfig,
  NativeStyle,
  NativeTheme,
} from "./native-style"
import { NativeRecipeType } from "./native-style"
import { isThemeTokenReference } from "./theme-token"

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
const recipeDiagnosticWarnings = new Set<string>()

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

export function useThemedStyle(style: unknown): NativeStyle | undefined {
  const theme = useTheme()
  return useMemo(() => resolveThemeTokens(style, theme), [style, theme])
}

type ResolvedThemeStyles<TStyles extends Readonly<Record<string, unknown>>> = {
  readonly [K in keyof TStyles]: TStyles[K] extends NativeRecipe<infer TVariants>
    ? NativeRecipe<TVariants>
    : TStyles[K] extends NativeStyle
      ? NativeStyle | undefined
      : TStyles[K] extends Readonly<Record<string, unknown>>
        ? { readonly [V in keyof TStyles[K]]: NativeStyle | undefined }
        : NativeStyle | undefined
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
  const resolved = {} as Record<keyof TStyles, unknown>
  for (const [key, style] of Object.entries(styles)) {
    resolved[key as keyof TStyles] = resolveStyleExport(style, theme)
  }
  return resolved as ResolvedThemeStyles<TStyles>
}

export function resolveThemeTokens(
  style: unknown,
  theme: NativeTheme<Record<string, unknown>>,
): NativeStyle | undefined {
  const flattened = flattenStyle(style)
  if (flattened === undefined) return undefined

  const resolved: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flattened)) {
    resolved[key] = isThemeTokenReference(value) ? resolveTokenValue(value.varName, theme) : value
  }

  return resolved as NativeStyle
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
    for (const [key, value] of Object.entries(style)) {
      resolved[key] = resolveThemeTokens(value, theme)
    }
    return resolved
  }
  return resolveThemeTokens(style, theme)
}

function resolveRecipeThemeTokens<TVariants extends NativeRecipeVariantsConfig>(
  recipe: NativeRecipe<TVariants>,
  theme: NativeTheme<Record<string, unknown>>,
): NativeRecipe<TVariants> {
  const variants: Record<string, Record<string, NativeStyle | undefined>> = {}
  for (const [variantName, variantValues] of Object.entries(recipe.variants ?? {})) {
    const resolvedValues: Record<string, NativeStyle | undefined> = {}
    for (const [valueName, style] of Object.entries(variantValues)) {
      resolvedValues[valueName] = resolveThemeTokens(style, theme)
    }
    variants[variantName] = resolvedValues
  }

  return {
    $$type: NativeRecipeType,
    ...(recipe.$$debugName === undefined ? {} : { $$debugName: recipe.$$debugName }),
    ...(recipe.base === undefined ? {} : { base: resolveThemeTokens(recipe.base, theme) }),
    compoundVariants: (recipe.compoundVariants ?? []).map((compoundVariant) => ({
      style: resolveThemeTokens(compoundVariant.style, theme),
      variants: compoundVariant.variants,
    })),
    defaultVariants: recipe.defaultVariants ?? {},
    variants,
  } as NativeRecipe<TVariants>
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
  return Object.values(value).some(
    (entry) => typeof entry === "object" && entry !== null && !isThemeTokenReference(entry),
  )
}

function resolveTokenValue(varName: string, theme: NativeTheme<Record<string, unknown>>): unknown {
  if (!(varName in theme.tokens)) {
    throw new Error(`Theme token "${varName}" is missing from the active native theme`)
  }
  return theme.tokens[varName]
}
