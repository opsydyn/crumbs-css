import { type StyleRule, style as vanillaStyle } from "@vanilla-extract/css"
import { markCompositionUsed, registerComposition } from "@vanilla-extract/css/adapter"
import { getFileScope } from "@vanilla-extract/css/fileScope"
import type { ImageStyle, TextStyle, ViewStyle } from "react-native"
import { markNativeStyleMap, NativeRecipeClassSymbol } from "./native-style-map"
import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode } from "./diagnostics"
import { NativeRecipeType, NativeRecipeClassType } from "./native-tags"
export { NativeRecipeType, NativeRecipeClassType } from "./native-tags"

export type { NativeThemeTokenReference } from "./theme-token"
export {
  createThemeTokenReference,
  isThemeTokenReference,
  NativeThemeTokenReferenceType,
} from "./theme-token"

export type NativeStyle = ImageStyle & TextStyle & ViewStyle
export type NativeStyleComposition<TInput, TStyle = NativePrimitiveReference> = ReadonlyArray<
  TInput | TStyle | NativeStyleComposition<TInput, TStyle>
>
type NativePrimitiveReference = ImageStyle | TextStyle | ViewStyle
type NativeSpacingAlias = "paddingInline" | "paddingBlock" | "paddingInlineStart" | "paddingInlineEnd" | "paddingBlockStart" | "paddingBlockEnd"
  | "marginInline" | "marginBlock" | "marginInlineStart" | "marginInlineEnd" | "marginBlockStart" | "marginBlockEnd"
type NativeInsetAlias = "inset" | "insetInline" | "insetBlock" | "insetInlineStart" | "insetInlineEnd" | "insetBlockStart" | "insetBlockEnd"
type NativeSideBorder = "borderTop" | "borderRight" | "borderBottom" | "borderLeft" | "borderInline" | "borderBlock"
  | "borderInlineStart" | "borderInlineEnd" | "borderBlockStart" | "borderBlockEnd"
type UnsupportedSideBorderInput = { readonly [K in NativeSideBorder | `${NativeSideBorder}Style`]?: never }
type NativeFlatStyleRule = Omit<StyleRule, "flex" | NativeSpacingAlias | NativeInsetAlias> &
  Pick<StaticNativeStyleInput<NativeStyle>, "flex" | NativeSpacingAlias | NativeInsetAlias> & UnsupportedSideBorderInput
export type NativeStyleRule = NativeFlatStyleRule | StaticNativeStyleInput<NativeStyle> |
  NativeStyleComposition<NativeFlatStyleRule | StaticNativeStyleInput<NativeStyle>, NativePrimitiveReference>

// Complete primitive types identify existing references without treating narrow
// inline rules as references or adding runtime/phantom branding to native styles.
type CompletePrimitiveReference<T> = T extends NativePrimitiveReference
  ? keyof ViewStyle extends keyof T ? T
    : keyof ImageStyle extends keyof T ? T : never
  : never
type CompositionReferences<T, TSeen = never> = T extends ReadonlyArray<infer TEntry>
  ? T extends TSeen ? CompletePrimitiveReference<TEntry>
    : CompositionReferences<TEntry, TSeen | T>
  : CompletePrimitiveReference<T>
type NativeStyleResult<T> = NativeStyleRule extends T ? NativeStyle
  : [CompositionReferences<T>] extends [never]
  ? NativeStyle : CompositionReferences<T>
type NativeAuthoringRule = NativeStyleRule | NativePrimitiveReference
type PrimitiveInlineInput<T> = T extends NativePrimitiveReference ? StaticNativeStyleInput<T> : never
type PrimitiveKeys<T> = T extends NativePrimitiveReference ? keyof T : never
type CheckedComposition<T, TReference, TSeen = never> = T extends ReadonlyArray<unknown>
  ? T extends TSeen ? unknown
    : { readonly [K in keyof T]: CheckedComposition<T[K], TReference, TSeen | T> }
  : [CompletePrimitiveReference<T>] extends [never]
    ? Exclude<keyof T, PrimitiveKeys<TReference>> extends never
      ? T extends PrimitiveInlineInput<TReference> ? unknown : never
      : never
    : unknown
type CheckedGenericComposition<T, TSeen = never> = T extends ReadonlyArray<unknown>
  ? T extends TSeen ? unknown
    : { readonly [K in keyof T]: CheckedGenericComposition<T[K], TSeen | T> }
  : [CompletePrimitiveReference<T>] extends [never]
    ? T extends NativeFlatStyleRule | StaticNativeStyleInput<NativeStyle> ? unknown : never
    : unknown
type CheckedNativeRule<T> = [CompletePrimitiveReference<T>] extends [never]
  ? NativeStyleRule extends T ? NativeStyleRule
    : [CompositionReferences<T>] extends [never] ? NativeStyleRule
      // Generic references retain CSS shorthand inputs, but inline entries must
      // satisfy static authoring rules rather than the weak primitive interfaces.
      : keyof NativeStyle extends keyof CompositionReferences<T> ? CheckedGenericComposition<T>
        : CheckedComposition<T, CompositionReferences<T>>
  : unknown
type StaticTransformEntry<TEntry> = TEntry extends unknown ? {
  readonly [K in keyof TEntry]: TEntry[K] extends ReadonlyArray<unknown>
    ? number[] : Extract<TEntry[K], string | number>
} : never
type NativeStaticTransform = StaticTransformEntry<Extract<NonNullable<ViewStyle["transform"]>, ReadonlyArray<unknown>>[number]>
export type NativeStyleInput<TStyle> = {
  readonly [K in keyof TStyle]?: NativeStyleValueInput<TStyle[K]>
} & UnsupportedSideBorderInput
type StaticNativeStyleInput<TStyle> = Omit<NativeStyleInput<TStyle>, "transform"> & {
  readonly transform?: string | ReadonlyArray<NativeStaticTransform> | undefined
}
export type NativeImageStyleInput = NativeStyleInput<ImageStyle>
export type NativeTextStyleInput = NativeStyleInput<TextStyle>
export type NativeViewStyleInput = NativeStyleInput<ViewStyle>
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
export type NativeStyleVariants<TVariants extends Readonly<Record<string, NativeAuthoringRule>>> = {
  readonly [K in keyof TVariants]: NativeStyleResult<TVariants[K]>
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

export function style<const TRule extends NativeAuthoringRule>(
  rule: TRule & CheckedNativeRule<TRule>,
  debugId?: string,
): NativeStyleResult<TRule> {
  return authorStyle(rule, debugId) as unknown as NativeStyleResult<TRule>
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
  // A compiled reference is a build-time class handle, not a declaration object.
  if (typeof rule === "string") return authorStyle([rule], debugId)
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

export function styleVariants<const TVariants extends Readonly<Record<string, NativeAuthoringRule>>>(
  variants: TVariants & { readonly [K in keyof TVariants]: CheckedNativeRule<TVariants[K]> },
  debugId?: string,
): NativeStyleVariants<TVariants> {
  const result: Partial<Record<keyof TVariants, NativeStyle>> = {}
  for (const [name, rule] of Object.entries(variants) as Array<[keyof TVariants, NativeAuthoringRule]>) {
    result[name] = authorStyle(rule, debugId === undefined ? undefined : `${debugId}_${String(name)}`) as unknown as NativeStyle
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
  const state: ThemeContractBuildState = {
    tokenPathsByVarName: new Map(),
  }
  const contract = createThemeContractNode(shape, [], state)
  // ADR D5 / M0.6: legacy identity is the exact raw path; validate the entire
  // transaction before publishing metadata. Explicit package identities await M3.
  for (const [varName, path] of state.tokenPathsByVarName) {
    const previous = themeTokenRegistry.get(`var(${varName})` as NativeThemeVar)
    if (previous !== undefined && !samePath(previous.path, path)) {
      throw new Error(formatNativeStylesDiagnostic(NativeStylesDiagnosticCode.ThemeTokenCollision,
        `Native theme token "${varName}" for raw path ${JSON.stringify(path)} is already owned by ${JSON.stringify(previous.path)}. Namespace contract roots or rename the colliding path; existing metadata was not changed.`))
    }
  }
  for (const [varName, path] of state.tokenPathsByVarName) {
    const token = `var(${varName})` as NativeThemeVar
    if (!themeTokenRegistry.has(token)) themeTokenRegistry.set(token, Object.freeze({path: Object.freeze([...path]), varName}))
  }
  return contract as ThemeContract<T>
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
  return Object.defineProperty({
    $$type: NativeRecipeClassType,
    className: vanillaStyle(rule as StyleRule, debugId),
  }, NativeRecipeClassSymbol, { value: true, enumerable: true }) as NativeRecipeClassRef
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
  const token = `var(${varName})` as NativeThemeVar
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
      if (!samePath(getThemeTokenPath(contractValue), nextPath)) invalidThemeContract(nextPath, "token is registered to a different raw path")
      if (typeof themeValue !== "string" && typeof themeValue !== "number") {
        throw new Error(`Theme value for "${formatPath(nextPath)}" must be a string or number`)
      }
      tokens[getThemeVarName(contractValue)] = themeValue
    } else if (isRecord(contractValue)) {
      collectThemeValues(contractValue, themeValue, nextPath, tokens)
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

function getThemeTokenMetadata(value: NativeThemeVar): ThemeTokenMetadata {
  const metadata = themeTokenRegistry.get(value)
  if (metadata === undefined) {
    throw new Error(`Unknown native theme token "${value}"`)
  }
  return metadata
}
