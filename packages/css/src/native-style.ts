import { type StyleRule, style as vanillaStyle } from "@vanilla-extract/css"
import { markCompositionUsed, registerComposition } from "@vanilla-extract/css/adapter"
import { getFileScope } from "@vanilla-extract/css/fileScope"
import type { ImageStyle, TextStyle, ViewStyle } from "react-native"
import { markNativeStyleMap } from "./native-style-map"

export type { NativeThemeTokenReference } from "./theme-token"
export {
  createThemeTokenReference,
  isThemeTokenReference,
  NativeThemeTokenReferenceType,
} from "./theme-token"

export type NativeStyle = ImageStyle & TextStyle & ViewStyle
export type NativeStyleComposition<TInput, TStyle = NativeStyle> = ReadonlyArray<
  TInput | TStyle | NativeStyleComposition<TInput, TStyle>
>
export type NativeStyleRule = StyleRule | StaticNativeStyleInput<NativeStyle> |
  NativeStyleComposition<StyleRule | StaticNativeStyleInput<NativeStyle>>
type StaticTransformEntry<TEntry> = TEntry extends unknown ? {
  readonly [K in keyof TEntry]: TEntry[K] extends ReadonlyArray<unknown>
    ? number[] : Extract<TEntry[K], string | number>
} : never
type NativeStaticTransform = StaticTransformEntry<Extract<NonNullable<ViewStyle["transform"]>, ReadonlyArray<unknown>>[number]>
export type NativeStyleInput<TStyle> = {
  readonly [K in keyof TStyle]?: NativeStyleValueInput<TStyle[K]>
}
type StaticNativeStyleInput<TStyle> = Omit<NativeStyleInput<TStyle>, "transform"> & {
  readonly transform?: string | ReadonlyArray<NativeStaticTransform> | undefined
}
export type NativeImageStyleInput = NativeStyleInput<ImageStyle>
export type NativeTextStyleInput = NativeStyleInput<TextStyle>
export type NativeViewStyleInput = NativeStyleInput<ViewStyle>
export const NativeRecipeType = "crumbs.css.recipe" as const
export const NativeRecipeClassType = "crumbs.css.class" as const
export type NativeRecipeVariantValue = string | boolean
export type NativeRecipeVariantsConfig = Readonly<
  Record<string, Readonly<Record<string, NativeViewStyleInput>>>
>
export type NativeRecipeVariantSelection<TValues> = keyof TValues extends "false" | "true"
  ? boolean | keyof TValues
  : keyof TValues
export type NativeRecipeSelection<TVariants extends NativeRecipeVariantsConfig> = {
  readonly [K in keyof TVariants]?: NativeRecipeVariantSelection<TVariants[K]>
}
export type NativeRecipeCompoundVariant<TVariants extends NativeRecipeVariantsConfig> = {
  readonly style: NativeViewStyleInput
  readonly variants: NativeRecipeSelection<TVariants>
}
export type NativeRecipeConfig<TVariants extends NativeRecipeVariantsConfig> = {
  readonly base?: NativeViewStyleInput
  readonly compoundVariants?: ReadonlyArray<NativeRecipeCompoundVariant<TVariants>>
  readonly defaultVariants?: NativeRecipeSelection<TVariants>
  readonly variants: TVariants
}
export type NativeRecipe<TVariants extends NativeRecipeVariantsConfig> = {
  readonly $$debugName?: string
  readonly $$type: typeof NativeRecipeType
  readonly base?: NativeStyle
  readonly compoundVariants: ReadonlyArray<{
    readonly style: NativeStyle
    readonly variants: NativeRecipeSelection<TVariants>
  }>
  readonly defaultVariants: NativeRecipeSelection<TVariants>
  readonly variants: {
    readonly [K in keyof TVariants]: {
      readonly [V in keyof TVariants[K]]: NativeStyle
    }
  }
}
export type NativeRecipeVariants<TRecipe> =
  TRecipe extends NativeRecipe<infer TVariants> ? TVariants : never
export type NativeRecipeProps<TRecipe> =
  TRecipe extends NativeRecipe<infer TVariants> ? NativeRecipeSelection<TVariants> : never
type NativeRecipeClassRef = {
  readonly $$type: typeof NativeRecipeClassType
  readonly className: string
}
export type NativeStyleVariants<TVariants extends Readonly<Record<string, NativeStyleRule>>> = {
  readonly [K in keyof TVariants]: NativeStyle
}
export type ThemeContractInput = {
  readonly [key: string]: ThemeContractInput | null
}
export type NativeThemeValue = string | number
export type NativeThemeVar = `var(--crumbs-${string})` & {
  readonly __nativeThemeVarBrand: unique symbol
}
type NativeStyleValueInput<TValue> =
  Extract<Exclude<TValue, undefined>, string | number> extends never
    ? TValue
    : TValue | NativeThemeVar
export type ThemeContract<T extends ThemeContractInput> = {
  readonly [K in keyof T]: T[K] extends null
    ? NativeThemeVar
    : T[K] extends ThemeContractInput
      ? ThemeContract<T[K]>
      : never
}
export type ThemeValues<T> = {
  readonly [K in keyof T]: T[K] extends NativeThemeVar
    ? NativeThemeValue
    : T[K] extends Record<string, unknown>
      ? ThemeValues<T[K]>
      : never
}
export type NativeTheme<TContract> = {
  readonly contract: TContract
  readonly tokens: Readonly<Record<string, NativeThemeValue>>
  readonly values: ThemeValues<TContract>
}

type ThemeTokenMetadata = {
  readonly path: ReadonlyArray<string>
  readonly varName: string
}
type ThemeContractBuildState = {
  readonly tokenPathsByVarName: Map<string, ReadonlyArray<string>>
}

const themeTokenRegistry = new Map<NativeThemeVar, ThemeTokenMetadata>()

export function style(rule: NativeStyleRule, debugId?: string): NativeStyle {
  return authorStyle(rule, debugId) as unknown as NativeStyle
}

export function viewStyle(
  rule: StaticNativeStyleInput<ViewStyle> | NativeStyleComposition<StaticNativeStyleInput<ViewStyle>, ViewStyle>,
  debugId?: string,
): ViewStyle {
  return authorStyle(rule, debugId) as unknown as ViewStyle
}

export function textStyle(
  rule: StaticNativeStyleInput<TextStyle> | NativeStyleComposition<StaticNativeStyleInput<TextStyle>, TextStyle>,
  debugId?: string,
): TextStyle {
  return authorStyle(rule, debugId) as unknown as TextStyle
}

export function imageStyle(
  rule: StaticNativeStyleInput<ImageStyle> | NativeStyleComposition<StaticNativeStyleInput<ImageStyle>, ImageStyle>,
  debugId?: string,
): ImageStyle {
  return authorStyle(rule, debugId) as unknown as ImageStyle
}

function authorStyle(rule: unknown, debugId?: string): string {
  if (!Array.isArray(rule)) return vanillaStyle(rule as StyleRule, debugId)

  // ADR D2: native order includes inline rules, nested sequences and repeats.
  const identifier = vanillaStyle({}, debugId)
  const classList = [identifier, ...rule.map((entry, index) =>
    typeof entry === "string"
      ? entry
      : authorStyle(entry, debugId === undefined ? undefined : `${debugId}_${index}`),
  )].join(" ")
  registerComposition({ identifier, classList }, getFileScope())
  markCompositionUsed(identifier)
  return classList
}

export function styleVariants<TVariants extends Readonly<Record<string, NativeStyleRule>>>(
  variants: TVariants,
  debugId?: string,
): NativeStyleVariants<TVariants> {
  const result: Partial<Record<keyof TVariants, NativeStyle>> = {}
  for (const [name, rule] of Object.entries(variants) as Array<[keyof TVariants, NativeStyleRule]>) {
    result[name] = style(rule, debugId === undefined ? undefined : `${debugId}_${String(name)}`)
  }
  return markNativeStyleMap(result) as NativeStyleVariants<TVariants>
}

export function recipe<TVariants extends NativeRecipeVariantsConfig>(
  config: NativeRecipeConfig<TVariants>,
  debugId?: string,
): NativeRecipe<TVariants> {
  const variants = {} as Record<string, Record<string, NativeRecipeClassRef>>
  for (const [variantName, variantValues] of Object.entries(config.variants)) {
    const values = {} as Record<string, NativeRecipeClassRef>
    for (const [valueName, rule] of Object.entries(variantValues)) {
      values[valueName] = recipeClass(rule, recipeDebugId(debugId, variantName, valueName))
    }
    variants[variantName] = values
  }

  return {
    $$type: NativeRecipeType,
    ...(debugId === undefined ? {} : { $$debugName: debugId }),
    ...(config.base === undefined
      ? {}
      : { base: recipeClass(config.base, recipeDebugId(debugId, "base")) }),
    compoundVariants: (config.compoundVariants ?? []).map((compoundVariant, index) => ({
      style: recipeClass(
        compoundVariant.style,
        recipeDebugId(debugId, "compound", String(index)),
      ) as unknown as NativeStyle,
      variants: compoundVariant.variants,
    })),
    defaultVariants: config.defaultVariants ?? {},
    variants: variants as unknown as NativeRecipe<TVariants>["variants"],
  } as NativeRecipe<TVariants>
}

export function createThemeContract<T extends ThemeContractInput>(shape: T): ThemeContract<T> {
  return createThemeContractNode(shape, [], {
    tokenPathsByVarName: new Map(),
  }) as ThemeContract<T>
}

export function createTheme<TContract extends Record<string, unknown>>(
  contract: TContract,
  values: ThemeValues<TContract>,
): NativeTheme<TContract> {
  const tokens: Record<string, NativeThemeValue> = {}
  collectThemeValues(contract, values, [], tokens)
  return { contract, tokens, values }
}

function recipeClass(rule: NativeViewStyleInput, debugId?: string): NativeRecipeClassRef {
  return {
    $$type: NativeRecipeClassType,
    className: vanillaStyle(rule as StyleRule, debugId),
  }
}

function recipeDebugId(
  debugId: string | undefined,
  ...segments: ReadonlyArray<string>
): string | undefined {
  return debugId === undefined ? undefined : [debugId, ...segments].join("_")
}

export function isThemeVar(value: unknown): value is NativeThemeVar {
  return typeof value === "string" && themeTokenRegistry.has(value as NativeThemeVar)
}

export function getThemeVarName(value: NativeThemeVar): string {
  return getThemeTokenMetadata(value).varName
}

export function getThemeTokenPath(value: NativeThemeVar): ReadonlyArray<string> {
  return getThemeTokenMetadata(value).path
}

function createThemeContractNode(
  shape: ThemeContractInput,
  path: ReadonlyArray<string>,
  state: ThemeContractBuildState,
): Record<string, unknown> {
  const contract: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(shape)) {
    const nextPath = [...path, key]
    contract[key] =
      value === null
        ? createThemeVar(nextPath, state)
        : createThemeContractNode(value, nextPath, state)
  }
  return contract
}

function createThemeVar(
  path: ReadonlyArray<string>,
  state: ThemeContractBuildState,
): NativeThemeVar {
  const varName = `--crumbs-${path.map(sanitizeTokenSegment).join("-")}`
  const existingPath = state.tokenPathsByVarName.get(varName)
  if (existingPath !== undefined) {
    throw new Error(
      `Duplicate native theme token "${varName}" for "${formatPath(path)}"; already used by "${formatPath(existingPath)}"`,
    )
  }
  state.tokenPathsByVarName.set(varName, path)
  const token = `var(${varName})` as NativeThemeVar
  themeTokenRegistry.set(token, { path, varName })
  return token
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
      if (typeof themeValue !== "string" && typeof themeValue !== "number") {
        throw new Error(`Theme value for "${formatPath(nextPath)}" must be a string or number`)
      }
      tokens[getThemeVarName(contractValue)] = themeValue
    } else if (isRecord(contractValue)) {
      collectThemeValues(contractValue, themeValue, nextPath, tokens)
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function formatPath(path: ReadonlyArray<string>): string {
  return path.length > 0 ? path.join(".") : "<root>"
}

function getThemeTokenMetadata(value: NativeThemeVar): ThemeTokenMetadata {
  const metadata = themeTokenRegistry.get(value)
  if (metadata === undefined) {
    throw new Error(`Unknown native theme token "${value}"`)
  }
  return metadata
}
