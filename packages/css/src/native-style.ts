import type {AnyLocalVar,AnyLocalFallback,NativeLocalStylePlan} from "./local-vars/model"
export {createVar,fallbackVar} from "./local-vars/authoring"
import { type StyleRule } from "@vanilla-extract/css"
import type { ImageStyle, TextStyle, ViewStyle } from "react-native"
import { markNativeStyleMap, NativeRecipeClassSymbol } from "./native-style-map"
import { NativeRecipeType, NativeRecipeClassType } from "./native-tags"
import { authorNativeStyle } from "./native-authoring"
export {
  createSprinkles,
  createSprinklesLookupPlan,
  defineProperties,
} from "./sprinkles"
export type {
  NativeSprinkleDefinition,
  NativeSprinklePropertyConfig,
  NativeSprinklePropertyKey,
  NativeSprinkleShorthandConfig,
  NativeSprinkleStaticResult,
  NativeSprinklesConfig,
  NativeSprinklesLookupPlan,
  NativeSprinklesSelection,
} from "./sprinkles"
export {componentRecipe, componentRecipeFromRecipe} from "./components"
export {extendComponentRecipe} from "./components/extensions"
export type {
  NativeComponentCompoundVariant,
  NativeComponentContract,
  NativeComponentContractExtensionPoints,
  NativeComponentContractIdentity,
  NativeComponentRecipe,
  NativeComponentRecipeConfig,
  NativeComponentRecipeProps,
  NativeComponentPublicProps,
  NativeComponentResolvedStyles,
  NativeComponentSlotKind,
  NativeComponentSlotStyleInput,
  NativeComponentSlotStyles,
  NativeComponentSlots,
  NativeComponentStateVariants,
  NativeComponentVariantSelection,
  NativeComponentVariantsConfig,
} from "./components"
export type {NativeComponentRecipeExtensionConfig} from "./components/extensions"
export type {NativeComponentRecipeExtensionDescriptor} from "./components/extension-contract"
export {
  createNativeMapValueFn,
  createNativeNormalizeValueFn,
  mapNativeConditionValueToBranches,
  NATIVE_RESPONSIVE_CONDITION_MATCHERS,
  NATIVE_RESPONSIVE_CONDITION_NAMES,
} from "./conditions/values"
export type {
  NativeConditionDefinitions,
  NativeConditionNameList,
  NativeConditionValueMapper,
  NativeConditionalRecord,
  NativeConditionalTuple,
  NativeConditionalValue,
  NativeMapValueFn,
  NativeNormalizedConditionalValue,
  NativeNormalizeValueFn,
} from "./conditions/values"
export {
  NativeExpressionProgramType,
  NativeExpressionProgramVersion,
  NativeExpressionType,
  NativeExpressionVersion,
  NativeExpressionEvaluationError,
  createNativeExpressionAdd,
  createNativeExpressionAlias,
  createNativeExpressionClamp,
  createNativeExpressionCompose,
  createNativeExpressionConditionReference,
  createNativeExpressionDomain,
  createNativeExpressionRuntime,
  createNativeExpressionFallback,
  createNativeExpressionLiteral,
  createNativeExpressionMatch,
  createNativeExpressionProgram,
  createNativeExpressionScale,
  createNativeExpressionSubtract,
  createNativeExpressionTokenReference,
  isNativeExpression,
  isNativeExpressionProgram,
  evaluateNativeExpression,
  foldNativeExpression,
  nativeExpressionDependencyKey,
  nativeExpressionDomainKey,
} from "./expressions"
export type {
  NativeConditionKey,
  NativeConditionValue,
  NativeExpression,
  NativeExpressionAdd,
  NativeExpressionAlias,
  NativeExpressionClamp,
  NativeExpressionColorDomain,
  NativeExpressionCompose,
  NativeExpressionConditionReference,
  NativeExpressionDependency,
  NativeExpressionDomain,
  NativeExpressionDomainInput,
  NativeExpressionDurationDomain,
  NativeExpressionEnumDomain,
  NativeExpressionFallback,
  NativeExpressionLengthDomain,
  NativeExpressionLiteral,
  NativeExpressionMatch,
  NativeExpressionMatchCase,
  NativeExpressionMatchOptions,
  NativeExpressionNumberDomain,
  NativeExpressionOpacityDomain,
  NativeExpressionProgram,
  NativeExpressionEvaluationErrorCode,
  NativeExpressionEvaluationState,
  NativeExpressionRuntime,
  NativeExpressionRuntimeStats,
  NativeExpressionScale,
  NativeExpressionSubtract,
  NativeExpressionTokenReference,
  NativeExpressionValue,
} from "./expressions"
import {
  type DomainThemeVar,
  type LegacyNativeThemeVar,
  type TokenDomain,
  type TokenDomainValue,
} from "./theme-token"
export {
  NativeComponentRecipeType,
  NativeComponentRecipeContractVersion,
  NativeComponentRecipeVersion,
  NativeComponentRecipeExtensionType,
  NativeComponentRecipeExtensionVersion,
  NativeRecipeType,
  NativeRecipeClassType,
  NativeSprinklesLookupPlanType,
  NativeSprinklesLookupPlanVersion,
} from "./native-tags"

export {
  createTheme,
  createThemeContract,
  getThemeTokenPath,
  getThemeVarName,
  isThemeVar,
} from "./theme-contract"
export type {
  NativeTheme,
  NativeThemeValue,
  ThemeContract,
  ThemeContractInput,
  ThemeValues,
} from "./theme-contract"

export type {
  DomainThemeVar,
  LegacyNativeThemeVar,
  NativeThemeTokenReference,
  NativeThemeVar,
  ThemeVar,
  TokenDomain,
  TokenDomainValue,
} from "./theme-token"
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
  readonly [K in keyof TStyle]?: K extends "fontVariationSettings" ? never : NativeStyleValueInput<TStyle[K], K>
} & UnsupportedSideBorderInput
type StaticNativeStyleInput<TStyle> = Omit<NativeStyleInput<TStyle>, "transform"> & {
  readonly transform?: string | ReadonlyArray<NativeStaticTransform> | undefined
}
export type NativeImageStyleInput = NativeStyleInput<ImageStyle>
export type NativeTextStyleInput = NativeStyleInput<TextStyle>
export type NativeViewStyleInput = NativeStyleInput<ViewStyle>
export type NativeRecipeVariantValue = string | boolean
export type NativeRecipeStyleInput = NativeViewStyleInput | ViewStyle | NativeStyle
export type NativeRecipeVariantsConfig = Readonly<
  Record<string, Readonly<Record<string, NativeRecipeStyleInput>>>
>
export type NativeRecipeVariantSelection<TValues> = keyof TValues extends "false" | "true"
  ? boolean | keyof TValues
  : keyof TValues
export type NativeRecipeSelection<TVariants extends NativeRecipeVariantsConfig> = {
  readonly [K in keyof TVariants]?: NativeRecipeVariantSelection<TVariants[K]>
}
export type NativeRecipeCompoundVariant<TVariants extends NativeRecipeVariantsConfig> = {
  readonly style: NativeRecipeStyleInput
  readonly variants: NativeRecipeSelection<TVariants>
}
export type NativeRecipeConfig<TVariants extends NativeRecipeVariantsConfig> = {
  readonly base?: NativeRecipeStyleInput
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
export type NativeStyleVariants<TVariants extends object> = {
  readonly [K in keyof TVariants]: TVariants[K] extends NativeAuthoringRule
    ? NativeStyleResult<TVariants[K]>
    : never
}
type ColorStyleProperty = "color" | `${string}Color`
type LengthStyleProperty =
  | "fontSize" | "letterSpacing" | "lineHeight" | "flexBasis"
  | "width" | "height" | "minWidth" | "minHeight" | "maxWidth" | "maxHeight"
  | "top" | "right" | "bottom" | "left" | "start" | "end"
  | "inset" | "insetInline" | "insetBlock" | "insetInlineStart" | "insetInlineEnd" | "insetBlockStart" | "insetBlockEnd"
  | "padding" | "paddingHorizontal" | "paddingVertical" | "paddingLeft" | "paddingRight" | "paddingTop" | "paddingBottom"
  | "paddingStart" | "paddingEnd" | "paddingInline" | "paddingBlock" | "paddingInlineStart" | "paddingInlineEnd" | "paddingBlockStart" | "paddingBlockEnd"
  | "margin" | "marginHorizontal" | "marginVertical" | "marginLeft" | "marginRight" | "marginTop" | "marginBottom"
  | "marginStart" | "marginEnd" | "marginInline" | "marginBlock" | "marginInlineStart" | "marginInlineEnd" | "marginBlockStart" | "marginBlockEnd"
  | "borderWidth" | "borderTopWidth" | "borderRightWidth" | "borderBottomWidth" | "borderLeftWidth" | "borderStartWidth" | "borderEndWidth"
  | "borderInlineWidth" | "borderBlockWidth" | "borderInlineStartWidth" | "borderInlineEndWidth" | "borderBlockStartWidth" | "borderBlockEndWidth"
  | "borderRadius" | "borderTopLeftRadius" | "borderTopRightRadius" | "borderBottomLeftRadius" | "borderBottomRightRadius"
  | "borderTopStartRadius" | "borderTopEndRadius" | "borderBottomStartRadius" | "borderBottomEndRadius"
  | "borderStartStartRadius" | "borderStartEndRadius" | "borderEndStartRadius" | "borderEndEndRadius"
  | "gap" | "rowGap" | "columnGap" | "outlineOffset" | "outlineWidth"
type OpacityStyleProperty = "opacity" | "shadowOpacity"
type EnumStyleProperty =
  | "display" | "position" | "direction" | "overflow" | "flexDirection" | "flexWrap"
  | "alignContent" | "alignItems" | "alignSelf" | "justifyContent" | "boxSizing"
  | "backfaceVisibility" | "cursor" | "borderCurve" | "pointerEvents"
  | "borderStyle" | "outlineStyle" | "isolation" | "mixBlendMode" | "resizeMode" | "objectFit"
  | "fontStyle" | "fontWeight" | "textAlign" | "textAlignVertical" | "verticalAlign"
  | "textDecorationLine" | "textDecorationStyle" | "textTransform" | "writingDirection" | "userSelect"

export type NativeStyleTokenDomainForProperty<K extends PropertyKey> =
  K extends ColorStyleProperty ? Extract<TokenDomain, { readonly kind: "color" }>
    : K extends LengthStyleProperty ? Extract<TokenDomain, { readonly kind: "length" }>
      : K extends OpacityStyleProperty ? Extract<TokenDomain, { readonly kind: "opacity" }>
        : K extends EnumStyleProperty ? Extract<TokenDomain, { readonly kind: "enum" }>
          : never

type NativeStyleTokenForProperty<K extends PropertyKey> =
  LegacyNativeThemeVar |
  ([NativeStyleTokenDomainForProperty<K>] extends [never] ? never : DomainThemeVar<NativeStyleTokenDomainForProperty<K>>)

type LengthStyleLiteral = number | `${number}%` | "auto"
type NativeStyleValueInput<TValue, TProperty extends PropertyKey = never> =
  TProperty extends LengthStyleProperty
    ? Exclude<TValue, string | number> | LengthStyleLiteral | NativeStyleTokenForProperty<TProperty>
    : Extract<Exclude<TValue, undefined>, string | number> extends never
      ? TValue
      : TValue | NativeStyleTokenForProperty<TProperty>

type LocalPropertyDomain<K extends PropertyKey,V> = NativeStyleTokenDomainForProperty<K> extends {readonly kind:"enum"} ? {readonly kind:"enum";readonly values:ReadonlyArray<Extract<V,string>>} : NativeStyleTokenDomainForProperty<K>
type LocalPropertyOperand<K extends PropertyKey,V> = [NativeStyleTokenDomainForProperty<K>] extends [never] ? never :
 (AnyLocalVar & {readonly domain:LocalPropertyDomain<K,V>}) | (AnyLocalFallback & {readonly variables:ReadonlyArray<AnyLocalVar & {readonly domain:LocalPropertyDomain<K,V>}>})
type LocalStyleInput<S> = {readonly [K in keyof StaticNativeStyleInput<S>]?:StaticNativeStyleInput<S>[K] | LocalPropertyOperand<K,K extends keyof S ? S[K] : never>}
type LocalPrimitiveRule<S> = LocalStyleInput<S> | S | NativeLocalStylePlan<S> | ReadonlyArray<LocalPrimitiveRule<S>>
type CheckedLocalRule<T,S,Seen=never> = T extends NativeLocalStylePlan<unknown> ? unknown : T extends ReadonlyArray<unknown> ? T extends Seen ? unknown : {readonly [K in keyof T]:CheckedLocalRule<T[K],S,Seen|T>} : [CompletePrimitiveReference<T>] extends [never] ? Exclude<keyof T,keyof LocalStyleInput<S>> extends never ? T extends LocalStyleInput<S> ? unknown : never : never : unknown
type HasLocal<T,Seen=never> = T extends AnyLocalVar|AnyLocalFallback|NativeLocalStylePlan<unknown> ? true : T extends Seen ? false : T extends ReadonlyArray<infer E> ? HasLocal<E,Seen|T> : T extends object ? {[K in keyof T]:HasLocal<T[K],Seen|T>}[keyof T] : false
type LocalResult<T,S> = true extends HasLocal<T> ? NativeLocalStylePlan<S> : S
type LocalReferences<T,Seen=never> = T extends NativeLocalStylePlan<infer S> ? S : T extends ReadonlyArray<infer E> ? T extends Seen ? never : LocalReferences<E,Seen|T> : never
type GenericLocalResult<T> = LocalResult<T,[LocalReferences<T>] extends [never] ? NativeStyleResult<T> : LocalReferences<T>>

type GenericLocalRule = LocalStyleInput<NativeStyle> | NativePrimitiveReference | NativeLocalStylePlan<NativePrimitiveReference> | ReadonlyArray<GenericLocalRule>
type GenericLocalReference<T> = CompositionReferences<T>|LocalReferences<T>
type CheckedGenericLocal<T> = [GenericLocalReference<T>] extends [never] ? CheckedLocalRule<T,NativeStyle> : CheckedLocalRule<T,GenericLocalReference<T>>
export function style<const T extends GenericLocalRule>(rule:T & (true extends HasLocal<T> ? CheckedGenericLocal<T> : never),debugId?:string):GenericLocalResult<T>
export function style<const TRule extends NativeAuthoringRule>(
  rule: TRule & CheckedNativeRule<TRule>,
  debugId?: string,
): NativeStyleResult<TRule>
export function style(rule:unknown,debugId?:string):unknown {
  return authorNativeStyle(rule, ["view", "text", "image"], debugId)
}

export function viewStyle<const T extends LocalPrimitiveRule<ViewStyle>>(rule:T & CheckedLocalRule<T,ViewStyle>,debugId?:string):LocalResult<T,ViewStyle>
export function viewStyle(
  rule: StaticNativeStyleInput<ViewStyle> | NativeStyleComposition<StaticNativeStyleInput<ViewStyle>, ViewStyle>,
  debugId?: string,
): ViewStyle
export function viewStyle(rule:unknown,debugId?:string):unknown {
  return authorNativeStyle(rule, ["view"], debugId)
}

export function textStyle<const T extends LocalPrimitiveRule<TextStyle>>(rule:T & CheckedLocalRule<T,TextStyle>,debugId?:string):LocalResult<T,TextStyle>
export function textStyle(
  rule: StaticNativeStyleInput<TextStyle> | NativeStyleComposition<StaticNativeStyleInput<TextStyle>, TextStyle>,
  debugId?: string,
): TextStyle
export function textStyle(rule:unknown,debugId?:string):unknown {
  return authorNativeStyle(rule, ["text"], debugId)
}

export function imageStyle<const T extends LocalPrimitiveRule<ImageStyle>>(rule:T & CheckedLocalRule<T,ImageStyle>,debugId?:string):LocalResult<T,ImageStyle>
export function imageStyle(
  rule: StaticNativeStyleInput<ImageStyle> | NativeStyleComposition<StaticNativeStyleInput<ImageStyle>, ImageStyle>,
  debugId?: string,
): ImageStyle
export function imageStyle(rule:unknown,debugId?:string):unknown {
  return authorNativeStyle(rule, ["image"], debugId)
}

export function styleVariants<const V extends Readonly<Record<string,GenericLocalRule>>>(variants:V & (true extends HasLocal<V> ? {readonly [K in keyof V]:CheckedGenericLocal<V[K]>} : never),debugId?:string):{readonly [K in keyof V]:GenericLocalResult<V[K]>}
export function styleVariants<
  const TData extends Readonly<Record<string | number, unknown>>,
  const TStyle extends NativeAuthoringRule,
>(
  values: TData,
  mapper: (value: TData[keyof TData], key: keyof TData) => TStyle,
  debugId?: string,
): NativeStyleVariants<{ readonly [K in keyof TData]: TStyle }>

export function styleVariants<const TVariants extends Readonly<Record<string, NativeAuthoringRule>>>(
  variants: TVariants & { readonly [K in keyof TVariants]: CheckedNativeRule<TVariants[K]> },
  debugId?: string,
): NativeStyleVariants<TVariants>

export function styleVariants(
  values: Readonly<Record<string | number, unknown>>,
  mapperOrDebugId?: string | ((value: unknown, key: string) => unknown),
  debugId?: string,
): Record<string, unknown> {
  const mapper = typeof mapperOrDebugId === "function" ? mapperOrDebugId : undefined
  const resolvedDebugId = typeof mapperOrDebugId === "string" ? mapperOrDebugId : debugId
  return styleVariantsFromEntries(values, mapper, resolvedDebugId)
}

function styleVariantsFromEntries(
  values: Readonly<Record<string | number, unknown>>,
  mapper: ((value: unknown, key: string) => unknown) | undefined,
  debugId: string | undefined,
): Record<string, NativeStyle> {
  const result: Record<string, NativeStyle> = {}
  for (const [name, value] of Object.entries(values)) {
    const rule = mapper === undefined ? value : mapper(value, name)
    result[name] = authorNativeStyle(
      rule,
      ["view", "text", "image"],
      debugId === undefined ? undefined : `${debugId}_${name}`,
    ) as unknown as NativeStyle
  }
  return markNativeStyleMap(result)
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

function recipeClass(rule: NativeRecipeStyleInput, debugId?: string): NativeRecipeClassRef {
  return Object.defineProperty({
    $$type: NativeRecipeClassType,
    className: authorNativeStyle(rule, ["view"], debugId),
  }, NativeRecipeClassSymbol, { value: true, enumerable: true }) as NativeRecipeClassRef
}

function recipeDebugId(
  debugId: string | undefined,
  ...segments: ReadonlyArray<string>
): string | undefined {
  return debugId === undefined ? undefined : [debugId, ...segments].join("_")
}
