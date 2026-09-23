import type {ImageStyle, TextStyle, ViewStyle} from "react-native"
import {authorNativeStyle} from "../native-authoring"
import {
  NativeComponentRecipeContractVersion,
  NativeComponentRecipeLegacyVersion,
  NativeComponentRecipeType,
  NativeComponentRecipeVersion,
  NativeRecipeClassType,
} from "../native-tags"
import {NativeRecipeClassSymbol} from "../native-style-map"
import type {
  NativeImageStyleInput,
  NativeRecipe,
  NativeStyle,
  NativeRecipeStyleInput,
  NativeRecipeVariantsConfig,
  NativeStyleComposition,
  NativeTextStyleInput,
  NativeViewStyleInput,
} from "../native-style"
import type {NativePrimitiveKind} from "../compiler/native-capture"
import {
  registerNativeComponentContract,
  validateNativeComponentContract,
  type NativeComponentContract,
} from "./contracts"
import type {NativeComponentRecipeExtensionTypeDetails} from "./extension-contract"

export type {
  NativeComponentContract,
  NativeComponentContractExtensionPoints,
  NativeComponentContractIdentity,
} from "./contracts"

export {NativeComponentRecipeType, NativeComponentRecipeVersion}
export {NativeComponentRecipeContractVersion}

export type NativeComponentSlotKind = NativePrimitiveKind
export type NativeComponentSlots = Readonly<Record<string, NativeComponentSlotKind>>

export type NativeComponentSlotStyleInput<TKind extends NativeComponentSlotKind> =
  TKind extends "view" ? NativeViewStyleInput | ViewStyle | NativeStyleComposition<NativeViewStyleInput, ViewStyle>
    : TKind extends "text" ? NativeTextStyleInput | TextStyle | NativeStyleComposition<NativeTextStyleInput, TextStyle>
      : NativeImageStyleInput | ImageStyle | NativeStyleComposition<NativeImageStyleInput, ImageStyle>

export type NativeComponentSlotStyles<TSlots extends NativeComponentSlots> = Partial<{
  readonly [TSlot in keyof TSlots & string]: NativeComponentSlotStyleInput<TSlots[TSlot]>
}>

export type NativeComponentVariantsConfig<TSlots extends NativeComponentSlots> = Readonly<
  Record<string, Readonly<Record<string, NativeComponentSlotStyles<TSlots>>>>
>

type NativeComponentVariantsShape = Readonly<Record<string, Readonly<Record<string, unknown>>>>

export type NativeComponentVariantSelection<TValues> = keyof TValues extends "false" | "true"
  ? boolean | keyof TValues
  : keyof TValues

export type NativeComponentRecipeSelection<
  TVariants extends NativeComponentVariantsShape,
> = {
  readonly [K in keyof TVariants]?: NativeComponentVariantSelection<TVariants[K]>
}

type NativeComponentNonEmptyTuple<T> = readonly [T, ...T[]]
type NativeComponentStateCaseConstraints<
  TVariants extends NativeComponentVariantsShape,
  TDiscriminator extends keyof TVariants,
> = Readonly<{
  readonly [K in Exclude<keyof TVariants, TDiscriminator>]?: NativeComponentNonEmptyTuple<
    NativeComponentVariantSelection<TVariants[K]>
  >
}>
type NativeComponentStateCases<
  TVariants extends NativeComponentVariantsShape,
  TDiscriminator extends keyof TVariants,
> = Readonly<{
  readonly [TCase in keyof TVariants[TDiscriminator]]: NativeComponentStateCaseConstraints<
    TVariants,
    TDiscriminator
  >
}>

/** One exhaustive discriminator with per-case constraints over sibling variant axes. */
export type NativeComponentStateVariants<
  TVariants extends NativeComponentVariantsShape,
> = {
  readonly [TDiscriminator in keyof TVariants]: Readonly<{
    readonly [K in TDiscriminator]: NativeComponentStateCases<TVariants, TDiscriminator>
  }> & Readonly<{
    readonly [K in Exclude<keyof TVariants, TDiscriminator>]?: never
  }>
}[keyof TVariants]

type IsUnion<T, TAll = T> = T extends TAll ? ([TAll] extends [T] ? false : true) : never
type StateConstraintTupleIsValid<TVariant, TAllowed> = TAllowed extends readonly [unknown, ...unknown[]]
  ? Exclude<TAllowed[number], NativeComponentVariantSelection<TVariant>> extends never ? true : false
  : false
type StateCaseConstraintsAreValid<
  TVariants extends NativeComponentVariantsShape,
  TDiscriminator extends keyof TVariants,
  TCase extends object,
> = [Exclude<keyof TCase, Exclude<keyof TVariants, TDiscriminator>>] extends [never]
  ? false extends {
      [TAxis in keyof TCase]: TAxis extends keyof TVariants
        ? StateConstraintTupleIsValid<TVariants[TAxis], TCase[TAxis]>
        : false
    }[keyof TCase]
    ? false
    : true
  : false
type StateCasesAreValid<
  TVariants extends NativeComponentVariantsShape,
  TDiscriminator extends keyof TVariants,
  TCases extends object,
> = [
  Exclude<keyof TCases, keyof TVariants[TDiscriminator]> |
  Exclude<keyof TVariants[TDiscriminator], keyof TCases>
] extends [never]
  ? false extends {
      [TCase in keyof TCases]: TCases[TCase] extends object
        ? StateCaseConstraintsAreValid<TVariants, TDiscriminator, TCases[TCase]>
        : false
    }[keyof TCases]
    ? false
    : true
  : false
type StateVariantMapIsValid<
  TVariants extends NativeComponentVariantsShape,
  TStates,
> = TStates extends object
  ? [keyof TStates] extends [never]
    ? false
    : IsUnion<keyof TStates> extends true
      ? false
      : [Exclude<keyof TStates, keyof TVariants>] extends [never]
        ? keyof TStates extends infer TDiscriminator
          ? TDiscriminator extends keyof TStates & keyof TVariants
            ? TStates[TDiscriminator] extends object
              ? StateCasesAreValid<TVariants, TDiscriminator, TStates[TDiscriminator]>
              : false
            : false
          : false
        : false
  : false

type IsRequiredProperty<T, K extends PropertyKey> = K extends keyof T
  ? {} extends Pick<T, K> ? false : true
  : false
type StringifiedStateValue<T> = T extends string ? T : T extends boolean ? `${T}` : never
type DefaultStateCaseKey<TStates, TDiscriminator extends keyof TStates, TDefaults> =
  TDiscriminator extends keyof TDefaults
    ? Extract<keyof TStates[TDiscriminator], StringifiedStateValue<TDefaults[TDiscriminator]>>
    : never
type OptionalDefaultStateCaseKey<TStates, TDiscriminator extends keyof TStates, TDefaults> =
  [DefaultStateCaseKey<TStates, TDiscriminator, TDefaults>] extends [never]
    ? never
    : IsUnion<DefaultStateCaseKey<TStates, TDiscriminator, TDefaults>> extends true
      ? never
      : DefaultStateCaseKey<TStates, TDiscriminator, TDefaults>
type StateDefaultCaseConstraintsAreValid<TConstraints extends object, TDefaults> =
  [Exclude<keyof TConstraints, keyof TDefaults>] extends [never]
    ? false extends {
        [TAxis in keyof TConstraints]: TAxis extends keyof TDefaults
          ? IsRequiredProperty<TDefaults, TAxis> extends true
            ? TConstraints[TAxis] extends ReadonlyArray<infer TAllowed>
              ? [TDefaults[TAxis]] extends [TAllowed] ? true : false
              : false
            : false
          : false
      }[keyof TConstraints]
      ? false
      : true
    : false
type StateDefaultsAreValid<TVariants extends NativeComponentVariantsShape, TStates, TDefaults> =
  TStates extends undefined
    ? true
    : TStates extends object
      ? [keyof TStates] extends [never]
        ? false
        : IsUnion<keyof TStates> extends true
          ? false
          : keyof TStates extends infer TDiscriminator
            ? TDiscriminator extends keyof TStates & keyof TVariants
              ? IsRequiredProperty<TDefaults, TDiscriminator> extends true
                ? [DefaultStateCaseKey<TStates, TDiscriminator, TDefaults>] extends [never]
                  ? false
                  : DefaultStateCaseKey<TStates, TDiscriminator, TDefaults> extends infer TCase
                    ? TCase extends keyof TStates[TDiscriminator]
                      ? TStates[TDiscriminator][TCase] extends object
                        ? StateDefaultCaseConstraintsAreValid<TStates[TDiscriminator][TCase], TDefaults>
                        : false
                      : false
                    : false
                : false
              : false
            : false
      : false

type ComponentStateCaseValue<TVariant, TCase extends string> =
  keyof TVariant extends "false" | "true"
    ? TCase extends "true" ? true : false
    : TCase
type RequiredStateAxisKeys<TConstraints, TDefaults> = {
  [TAxis in keyof TConstraints]-?: TAxis extends keyof TDefaults
    ? IsRequiredProperty<TDefaults, TAxis> extends true
      ? TConstraints[TAxis] extends ReadonlyArray<infer TAllowed>
        ? [TDefaults[TAxis]] extends [TAllowed] ? never : TAxis
        : TAxis
      : TAxis
    : TAxis
}[keyof TConstraints]
type StateCaseAxisValue<TVariants, TConstraints, TAxis extends keyof TVariants> =
  TAxis extends keyof TConstraints
    ? TConstraints[TAxis] extends ReadonlyArray<infer TAllowed> ? TAllowed : never
    : NativeComponentVariantSelection<TVariants[TAxis]>
type StateCaseAxisSelection<
  TVariants extends NativeComponentVariantsShape,
  TConstraints extends object,
  TDefaults,
  TDiscriminator extends keyof TVariants,
> = {
  readonly [TAxis in Exclude<keyof TVariants, TDiscriminator> as
    TAxis extends RequiredStateAxisKeys<TConstraints, TDefaults> ? never : TAxis]?:
      StateCaseAxisValue<TVariants, TConstraints, TAxis>
} & {
  readonly [TAxis in Extract<Exclude<keyof TVariants, TDiscriminator>, RequiredStateAxisKeys<TConstraints, TDefaults>>]:
    StateCaseAxisValue<TVariants, TConstraints, TAxis>
}
type StateCaseSelection<
  TVariants extends NativeComponentVariantsShape,
  TStates extends object,
  TDefaults,
  TDiscriminator extends keyof TVariants & keyof TStates,
  TCase extends string,
  TConstraints extends object,
> = (TCase extends OptionalDefaultStateCaseKey<TStates, TDiscriminator, TDefaults>
  ? {readonly [K in TDiscriminator]?: ComponentStateCaseValue<TVariants[TDiscriminator], TCase>}
  : {readonly [K in TDiscriminator]: ComponentStateCaseValue<TVariants[TDiscriminator], TCase>}) &
  StateCaseAxisSelection<TVariants, TConstraints, TDefaults, TDiscriminator>
type NativeComponentStateRecipeSelection<
  TVariants extends NativeComponentVariantsShape,
  TStates,
  TDefaults,
> = TStates extends undefined
  ? NativeComponentRecipeSelection<TVariants>
  : TStates extends object
    ? {
        [TDiscriminator in keyof TStates]: TDiscriminator extends keyof TVariants
          ? {
              [TCase in keyof TStates[TDiscriminator]]: TCase extends string
                ? TStates[TDiscriminator][TCase] extends object
                  ? StateCaseSelection<
                    TVariants,
                    TStates,
                    TDefaults,
                    TDiscriminator,
                    TCase,
                    TStates[TDiscriminator][TCase]
                  >
                  : never
                : never
            }[keyof TStates[TDiscriminator]]
          : never
      }[keyof TStates]
    : never

type NativeComponentStateContractValidation<
  TVariants extends NativeComponentVariantsShape,
  TStates,
  TDefaults,
  TConfig,
> = [TStates] extends [undefined]
  ? unknown
  : StateVariantMapIsValid<TVariants, TStates> extends true
    ? TConfig extends {readonly defaultVariants?: unknown}
      ? IsRequiredProperty<TConfig, "defaultVariants"> extends true
        ? StateDefaultsAreValid<TVariants, TStates, TDefaults> extends true ? unknown : never
        : unknown
      : StateDefaultsAreValid<TVariants, TStates, TDefaults> extends true ? unknown : never
    : never

type IsEqual<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends
    (<T>() => T extends TRight ? 1 : 2) ? true : false
type StateVariantsFromConfig<
  TConfig,
  TVariants extends NativeComponentVariantsShape,
> = TConfig extends {readonly stateVariants: infer TStates}
  ? TStates
  : TConfig extends {readonly stateVariants?: infer TStates}
    ? IsEqual<TStates, NativeComponentStateVariants<TVariants> | undefined> extends true
      ? undefined
      : Exclude<TStates, undefined> extends infer TExplicitStates
        ? [TExplicitStates] extends [never] ? undefined : TExplicitStates
        : undefined
    : undefined
type DefaultsFromConfig<TConfig, TVariants extends NativeComponentVariantsShape> =
  TConfig extends {readonly defaultVariants: infer TDefaults}
    ? TDefaults
    : NativeComponentRecipeSelection<TVariants>

export type NativeComponentCompoundVariant<
  TSlots extends NativeComponentSlots,
  TVariants extends NativeComponentVariantsShape,
> = {
  readonly styles: NativeComponentSlotStyles<TSlots>
  readonly variants: NativeComponentRecipeSelection<TVariants>
}

export type NativeComponentSlotStyleResult<TKind extends NativeComponentSlotKind> =
  TKind extends "view" ? ViewStyle
    : TKind extends "text" ? TextStyle
      : ImageStyle

export type NativeComponentResolvedSlotStyles<TSlots extends NativeComponentSlots> = Partial<{
  readonly [TSlot in keyof TSlots & string]: NativeComponentSlotStyleResult<TSlots[TSlot]>
}>

export type NativeComponentRecipe<
  TSlots extends NativeComponentSlots,
  TVariants extends NativeComponentVariantsShape,
  TStateVariants extends NativeComponentStateVariants<TVariants> | undefined = undefined,
  TDefaults extends NativeComponentRecipeSelection<TVariants> = NativeComponentRecipeSelection<TVariants>,
  TContract extends NativeComponentContract | undefined = undefined,
> = {
  readonly $$debugName?: string
  readonly $$type: typeof NativeComponentRecipeType
  readonly slots: TSlots
  readonly base?: NativeComponentResolvedSlotStyles<TSlots>
  readonly variants: {
    readonly [K in keyof TVariants]: {
      readonly [V in keyof TVariants[K]]: NativeComponentResolvedSlotStyles<TSlots>
    }
  }
  readonly defaultVariants: TDefaults
  readonly compoundVariants: ReadonlyArray<NativeComponentCompoundVariant<TSlots, TVariants> & {
    readonly styles: NativeComponentResolvedSlotStyles<TSlots>
  }>
} & (TStateVariants extends undefined ? {} : {readonly stateVariants: TStateVariants})
  & (TContract extends NativeComponentContract
    ? {readonly version: typeof NativeComponentRecipeContractVersion; readonly contract: TContract}
    : {readonly version: typeof NativeComponentRecipeVersion})

export type NativeComponentRecipeDescriptor = {
  readonly $$debugName?: string
  readonly $$type: typeof NativeComponentRecipeType
  readonly version: typeof NativeComponentRecipeLegacyVersion | typeof NativeComponentRecipeVersion | typeof NativeComponentRecipeContractVersion
  readonly slots: NativeComponentSlots
  readonly base?: object
  readonly variants: object
  readonly defaultVariants: object
  readonly stateVariants?: object
  readonly compoundVariants: ReadonlyArray<{
    readonly variants: object
    readonly styles: object
  }>
  readonly contract?: NativeComponentContract
}

export type NativeComponentRecipeConfig<
  TSlots extends NativeComponentSlots,
  TVariants extends NativeComponentVariantsConfig<TSlots>,
  TStateVariants extends NativeComponentStateVariants<TVariants> | undefined =
    NativeComponentStateVariants<TVariants> | undefined,
  TDefaults extends NativeComponentRecipeSelection<TVariants> = NativeComponentRecipeSelection<TVariants>,
  TContract extends NativeComponentContract | undefined = NativeComponentContract | undefined,
> = {
  readonly slots: TSlots
  readonly contract?: TContract
  readonly base?: NativeComponentSlotStyles<TSlots>
  readonly variants: TVariants
  readonly defaultVariants?: TDefaults
  readonly compoundVariants?: ReadonlyArray<NativeComponentCompoundVariant<TSlots, TVariants>>
  readonly stateVariants?: TStateVariants
}

export type NativeComponentRecipeProps<TRecipe> =
  TRecipe extends NativeComponentRecipe<
    infer _TSlots,
    infer TVariants,
    infer TStateVariants,
    infer TDefaults,
    infer _TContract
  >
    ? NativeComponentStateRecipeSelection<TVariants, TStateVariants, TDefaults>
    : TRecipe extends {
        readonly version: typeof NativeComponentRecipeLegacyVersion
        readonly variants: infer TVariants
      }
      ? {
          readonly [TVariant in keyof TVariants]?: NativeComponentVariantSelection<TVariants[TVariant]>
        }
      : never

type ContractPublicVariants<TContract> =
  TContract extends {readonly public: {readonly variants: infer TVariants}} ? TVariants : never
type ContractPublicSlots<TContract> =
  TContract extends {readonly public: {readonly slots: ReadonlyArray<infer TSlot>}} ? TSlot : never
type ContractPublicValues<TContract, TAxis> =
  TAxis extends keyof ContractPublicVariants<TContract>
    ? ContractPublicVariants<TContract>[TAxis] extends ReadonlyArray<infer TValue> ? TValue : never
    : never
type PublicVariantsForContract<TVariants extends NativeComponentVariantsShape, TContract> = {
  readonly [TAxis in keyof TVariants as TAxis extends keyof ContractPublicVariants<TContract> ? TAxis : never]:
    Pick<TVariants[TAxis], Extract<keyof TVariants[TAxis], ContractPublicValues<TContract, TAxis>>>
}
type ContractPublicSurfaceIsValid<TSlots, TVariants, TContract> =
  [Exclude<ContractPublicSlots<TContract>, keyof TSlots>] extends [never]
    ? [Exclude<keyof ContractPublicVariants<TContract>, keyof TVariants>] extends [never]
      ? false extends {
          [TAxis in keyof ContractPublicVariants<TContract>]: TAxis extends keyof TVariants
            ? Exclude<ContractPublicValues<TContract, TAxis>, keyof TVariants[TAxis]> extends never ? true : false
            : false
        }[keyof ContractPublicVariants<TContract>]
        ? false
        : true
      : false
    : false
type StringifiedContractStateValue<TValue> =
  TValue extends true ? "true" : TValue extends false ? "false" : TValue
type ContractPublicConstraintsAreValid<TConstraints, TContract> =
  [Exclude<keyof TConstraints, keyof ContractPublicVariants<TContract>>] extends [never]
    ? false extends {
        [TAxis in keyof TConstraints]: TAxis extends keyof ContractPublicVariants<TContract>
          ? TConstraints[TAxis] extends ReadonlyArray<infer TAllowed>
            ? Exclude<StringifiedContractStateValue<TAllowed>, ContractPublicValues<TContract, TAxis>> extends never
              ? true
              : false
            : false
          : false
      }[keyof TConstraints]
      ? false
      : true
    : false
type ContractPublicStateCasesAreValid<TStates, TContract, TDiscriminator extends keyof TStates> =
  TStates[TDiscriminator] extends object
    ? [Exclude<keyof TStates[TDiscriminator], ContractPublicValues<TContract, TDiscriminator>>] extends [never]
      ? [Exclude<ContractPublicValues<TContract, TDiscriminator>, keyof TStates[TDiscriminator]>] extends [never]
        ? false extends {
            [TCase in keyof TStates[TDiscriminator]]: TStates[TDiscriminator][TCase] extends object
              ? ContractPublicConstraintsAreValid<TStates[TDiscriminator][TCase], TContract>
              : false
          }[keyof TStates[TDiscriminator]]
          ? false
          : true
        : false
      : false
    : false
type ContractPublicStateProjectionIsValid<TStates, TContract> =
  Exclude<TStates, undefined> extends infer TConcreteStates
    ? TConcreteStates extends object
      ? Extract<keyof TConcreteStates, keyof ContractPublicVariants<TContract>> extends infer TDiscriminator
        ? [TDiscriminator] extends [never] ? true
          : TDiscriminator extends keyof TConcreteStates
            ? ContractPublicStateCasesAreValid<TConcreteStates, TContract, TDiscriminator>
            : false
        : false
      : true
    : true
type ContractFromConfig<TConfig> = TConfig extends {readonly contract: infer TContract extends NativeComponentContract}
  ? TContract
  : undefined
type NativeComponentContractValidation<TSlots, TVariants, TStates, TContract> =
  [TContract] extends [undefined] ? unknown
    : TContract extends NativeComponentContract
      ? ContractPublicSurfaceIsValid<TSlots, TVariants, TContract> extends true
        ? ContractPublicStateProjectionIsValid<TStates, TContract> extends true ? unknown : never
        : never
      : never

type MergePublicVariantMaps<TLeft, TRight> = {
  readonly [TAxis in keyof TLeft | keyof TRight]:
    (TAxis extends keyof TLeft ? TLeft[TAxis] : Readonly<Record<never, never>>) &
    (TAxis extends keyof TRight ? NonNullable<TRight[TAxis]> : Readonly<Record<never, never>>)
}
type PublicComponentSelection<TVariants extends NativeComponentVariantsShape, TStates, TDefaults, TContract, TAdded = {}> =
  MergePublicVariantMaps<PublicVariantsForContract<TVariants, TContract>, TAdded> extends infer TPublicVariants extends NativeComponentVariantsShape
    ? Extract<keyof Exclude<TStates, undefined>, keyof TPublicVariants> extends never
      ? NativeComponentRecipeSelection<TPublicVariants>
      : NativeComponentStateRecipeSelection<TPublicVariants, Exclude<TStates, undefined>, TDefaults>
    : never

type NativeComponentPublicPropsFromBase<TRecipe, TAdded> =
  TRecipe extends NativeComponentRecipe<
    infer _TSlots,
    infer TVariants,
    infer TStateVariants,
    infer TDefaults,
    infer TContract
  >
    ? TContract extends NativeComponentContract
      ? PublicComponentSelection<TVariants, TStateVariants, TDefaults, TContract, TAdded>
      : never
    : never

/** Consumer selection narrowed to the surfaces declared by a v3 contract. */
export type NativeComponentPublicProps<TRecipe> =
  [NativeComponentRecipeExtensionTypeDetails<TRecipe>] extends [never]
    ? NativeComponentPublicPropsFromBase<TRecipe, {}>
    : NativeComponentRecipeExtensionTypeDetails<TRecipe> extends {
        readonly base: infer TBase
        readonly variants: infer TAdded
      }
      ? NativeComponentPublicPropsFromBase<TBase, TAdded>
      : never

export type NativeComponentResolvedStyles<TSlots extends NativeComponentSlots> = Readonly<{
  readonly [TSlot in keyof TSlots & string]: ReadonlyArray<NativeComponentSlotStyleResult<TSlots[TSlot]>>
}>

type ValidatedSlotStyles = ReadonlyArray<readonly [string, unknown]>
type ValidatedVariants = ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, ValidatedSlotStyles]>]>
type ValidatedCompound = {
  readonly selection: Readonly<Record<string, string | boolean>>
  readonly styles: ValidatedSlotStyles
}

type NativeComponentStyleReference = {
  readonly $$type: typeof NativeRecipeClassType
  readonly className: string
}

type NativeComponentVariantsFromRecipe<
  TSlot extends string,
  TVariants extends NativeRecipeVariantsConfig,
> = {
  readonly [TVariant in keyof TVariants]: {
    readonly [TValue in keyof TVariants[TVariant]]: Readonly<
      Partial<Record<TSlot, NativeRecipeStyleInput>>
    >
  }
}

/**
 * Define a multi-slot component style contract with one shared variant map.
 * Each authored slot branch is captured for its declared native primitive.
 */
export function componentRecipe<
  const TSlots extends NativeComponentSlots,
  const TVariants extends NativeComponentVariantsConfig<TSlots>,
  const TConfig extends NativeComponentRecipeConfig<
    TSlots,
    TVariants,
    NativeComponentStateVariants<TVariants> | undefined,
    NativeComponentRecipeSelection<TVariants>,
    NativeComponentContract | undefined
  >,
>(
  config: NativeComponentRecipeConfig<
    TSlots,
    TVariants,
    NativeComponentStateVariants<TVariants> | undefined,
    NativeComponentRecipeSelection<TVariants>,
    NativeComponentContract | undefined
  > & TConfig & NativeComponentStateContractValidation<
    TVariants,
    StateVariantsFromConfig<TConfig, TVariants>,
    DefaultsFromConfig<TConfig, TVariants>,
    TConfig
  > & NativeComponentContractValidation<
    TSlots,
    TVariants,
    StateVariantsFromConfig<TConfig, TVariants>,
    ContractFromConfig<TConfig>
  >,
  debugId?: string,
): NativeComponentRecipe<
  TSlots,
  TVariants,
  StateVariantsFromConfig<TConfig, TVariants>,
  DefaultsFromConfig<TConfig, TVariants>,
  ContractFromConfig<TConfig>
> {
  assertPlainRecord(config, "component recipe")
  const slots = validateSlots(config.slots)
  const baseInput = config.base === undefined
    ? undefined
    : validateSlotStyles(config.base, slots, "base")
  const validatedVariants = validateVariants(config.variants, slots)
  const variantValues = selectionValues(validatedVariants)
  const defaultVariants = validateSelection(
    config.defaultVariants === undefined ? {} : config.defaultVariants,
    variantValues,
    `${componentName(debugId)} default variants`,
  ) as DefaultsFromConfig<TConfig, TVariants>
  const stateVariants = validateStateVariants(config.stateVariants, variantValues, defaultVariants)
  const contract = config.contract === undefined
    ? undefined
    : validateNativeComponentContract(config.contract, {slots, variants: variantValues}, stateVariants, {
        registerIdentity: false,
      })
  const validatedCompounds = validateCompounds(
    config.compoundVariants === undefined ? [] : config.compoundVariants,
    variantValues,
    slots,
    debugId,
  )

  // Run structural validation before handing any branch to vanilla-extract so
  // malformed declarations fail without leaving partially authored CSS state.
  const base = baseInput === undefined
    ? undefined
    : authorSlotStyles(baseInput, slots, debugId, "base")
  const variants = authorVariants(validatedVariants, slots, debugId)
  const compoundVariants = authorCompoundVariants(validatedCompounds, slots, debugId)
  if (contract !== undefined) registerNativeComponentContract(contract)

  return Object.freeze({
    $$type: NativeComponentRecipeType,
    version: contract === undefined ? NativeComponentRecipeVersion : NativeComponentRecipeContractVersion,
    ...(debugId === undefined ? {} : {$$debugName: debugId}),
    slots,
    ...(contract === undefined ? {} : {contract}),
    ...(base === undefined ? {} : {base}),
    variants,
    defaultVariants,
    ...(stateVariants === undefined ? {} : {stateVariants}),
    compoundVariants,
  }) as NativeComponentRecipe<
    TSlots,
    TVariants,
    StateVariantsFromConfig<TConfig, TVariants>,
    DefaultsFromConfig<TConfig, TVariants>,
    ContractFromConfig<TConfig>
  >
}

/**
 * Wrap an existing view recipe in one named slot without reauthoring its
 * compiled class references or changing its selection model.
 */
export function componentRecipeFromRecipe<
  const TSlot extends string,
  TVariants extends NativeRecipeVariantsConfig,
  const TContract extends NativeComponentContract | undefined = undefined,
>(
  recipe: NativeRecipe<TVariants>,
  options: {readonly slot: TSlot; readonly debugId?: string; readonly contract?: TContract},
): NativeComponentRecipe<
  Readonly<Record<TSlot, "view">>,
  NativeComponentVariantsFromRecipe<TSlot, TVariants>,
  undefined,
  NativeComponentRecipeSelection<NativeComponentVariantsFromRecipe<TSlot, TVariants>>,
  TContract
> {
  if (typeof options?.slot !== "string" || options.slot.length === 0) {
    throw new TypeError("Component recipe migration slot name must be non-empty")
  }
  const slots = Object.freeze({[options.slot]: "view" as const}) as Readonly<Record<TSlot, "view">>
  const base = recipe.base === undefined
    ? undefined
    : freezeRecord([[options.slot, freezeLegacyClassReference(recipe.base)]]) as NativeComponentResolvedSlotStyles<Readonly<Record<TSlot, "view">>>
  const variants = freezeRecord(Object.entries(recipe.variants ?? {}).map(([name, values]) => [
    name,
    freezeRecord(Object.entries(values).map(([value, style]) => [
      value,
      freezeRecord([[options.slot, freezeLegacyClassReference(style as NativeStyle)]]),
    ])),
  ]))
  const compoundVariants = Object.freeze((recipe.compoundVariants ?? []).map(compound => Object.freeze({
    variants: Object.freeze({...compound.variants}),
    styles: freezeRecord([[options.slot, freezeLegacyClassReference(compound.style)]]),
  })))
  const contract = options.contract === undefined
    ? undefined
    : validateNativeComponentContract(options.contract, {
        slots,
        variants: variantSelectionValues(variants),
      })
  return Object.freeze({
    $$type: NativeComponentRecipeType,
    version: contract === undefined ? NativeComponentRecipeVersion : NativeComponentRecipeContractVersion,
    ...((options.debugId ?? recipe.$$debugName) === undefined
      ? {}
      : {$$debugName: options.debugId ?? recipe.$$debugName}),
    slots,
    ...(contract === undefined ? {} : {contract}),
    ...(base === undefined ? {} : {base}),
    variants,
    defaultVariants: Object.freeze({...recipe.defaultVariants}),
    compoundVariants,
  }) as unknown as NativeComponentRecipe<
    Readonly<Record<TSlot, "view">>,
    NativeComponentVariantsFromRecipe<TSlot, TVariants>,
    undefined,
    NativeComponentRecipeSelection<NativeComponentVariantsFromRecipe<TSlot, TVariants>>,
    TContract
  >
}

function validateSlots(value: unknown): NativeComponentSlots {
  const entries = recordEntries(value, "component recipe slots")
  if (entries.length === 0) throw new TypeError("Component recipe must define at least one slot")
  for (const [name, kind] of entries) {
    if (name.length === 0) throw new TypeError("Component recipe slot names must be non-empty")
    if (kind !== "view" && kind !== "text" && kind !== "image") {
      throw new TypeError(`Component recipe slot "${name}" has invalid primitive kind ${JSON.stringify(kind)}`)
    }
  }
  return freezeRecord(entries) as NativeComponentSlots
}

function validateVariants(value: unknown, slots: NativeComponentSlots): ValidatedVariants {
  const variants: Array<readonly [string, ReadonlyArray<readonly [string, ValidatedSlotStyles]>]> = []
  for (const [variantName, variantValues] of recordEntries(value, "component recipe variants")) {
    if (variantName.length === 0) throw new TypeError("Component recipe variant names must be non-empty")
    const values: Array<readonly [string, ValidatedSlotStyles]> = []
    for (const [valueName, branch] of recordEntries(variantValues, `component recipe variant "${variantName}"`)) {
      if (valueName.length === 0) throw new TypeError(`Component recipe variant "${variantName}" values must be non-empty`)
      values.push([valueName, validateSlotStyles(branch, slots, `variant "${variantName}" value "${valueName}"` )])
    }
    if (values.length === 0) throw new TypeError(`Component recipe variant "${variantName}" must define at least one value`)
    variants.push([variantName, values])
  }
  return variants
}

function selectionValues(variants: ValidatedVariants): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
  return Object.fromEntries(variants.map(([name, values]) => [
    name,
    Object.fromEntries(values.map(([value]) => [value, true])),
  ]))
}

function variantSelectionValues(value: unknown): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
  return Object.fromEntries(recordEntries(value, "component recipe variants").map(([axis, values]) => [
    axis,
    Object.fromEntries(recordEntries(values, "component recipe variant " + JSON.stringify(axis))
      .map(([variantValue]) => [variantValue, true])),
  ]))
}

function validateStateVariants(
  value: unknown,
  variantValues: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  defaultVariants: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | undefined {
  if (value === undefined) return undefined
  const discriminators = recordEntries(value, "component recipe stateVariants")
  if (discriminators.length !== 1) {
    throw new TypeError("Component recipe stateVariants must define exactly one discriminator")
  }

  const [discriminator, rawCases] = discriminators[0]!
  const discriminatorValues = variantValues[discriminator]
  if (discriminatorValues === undefined) {
    throw new TypeError(`Component recipe stateVariants references unknown discriminator variant ${JSON.stringify(discriminator)}`)
  }
  const cases = recordEntries(rawCases, `component recipe stateVariants discriminator ${JSON.stringify(discriminator)}`)
  const expectedCases = Object.keys(discriminatorValues)
  const actualCaseNames = new Set(cases.map(([caseName]) => caseName))
  const missingCase = expectedCases.find(caseName => !actualCaseNames.has(caseName))
  if (missingCase !== undefined) {
    throw new TypeError(`Component recipe stateVariants is missing state case ${JSON.stringify(missingCase)}`)
  }
  const extraCase = cases.find(([caseName]) => !Object.hasOwn(discriminatorValues, caseName))?.[0]
  if (extraCase !== undefined) {
    throw new TypeError(`Component recipe stateVariants has unknown state case ${JSON.stringify(extraCase)}`)
  }

  if (!Object.hasOwn(defaultVariants, discriminator)) {
    throw new TypeError(`Component recipe defaultVariants must define discriminator ${JSON.stringify(discriminator)} for stateVariants`)
  }
  const defaultCaseName = String(defaultVariants[discriminator])
  let defaultConstraints: ReadonlyArray<readonly [string, ReadonlyArray<string | boolean>]> = []
  const frozenCases = cases.map(([caseName, rawConstraints]) => {
    const constraints = recordEntries(
      rawConstraints,
      `component recipe state ${JSON.stringify(caseName)} constraints`,
    )
    const frozenConstraints: Array<readonly [string, ReadonlyArray<string | boolean>]> = []
    for (const [axis, rawAllowedValues] of constraints) {
      if (axis === discriminator) {
        throw new TypeError(`Component recipe state ${JSON.stringify(caseName)} cannot constrain its discriminator ${JSON.stringify(discriminator)}`)
      }
      const values = variantValues[axis]
      if (values === undefined) {
        throw new TypeError(`Component recipe state ${JSON.stringify(caseName)} references unknown constrained variant ${JSON.stringify(axis)}`)
      }
      const allowedValues = validateStateAllowedValues(
        rawAllowedValues,
        values,
        caseName,
        axis,
      )
      frozenConstraints.push([axis, allowedValues])
    }
    if (caseName === defaultCaseName) defaultConstraints = frozenConstraints
    return [caseName, freezeRecord(frozenConstraints)] as const
  })

  for (const [axis, allowedValues] of defaultConstraints) {
    if (!Object.hasOwn(defaultVariants, axis)) {
      throw new TypeError(`Component recipe defaultVariants must define constrained variant ${JSON.stringify(axis)} for its default state`)
    }
    if (!allowedValues.includes(defaultVariants[axis] as string | boolean)) {
      throw new TypeError(`Component recipe default selection for state ${JSON.stringify(defaultCaseName)} violates constraint ${JSON.stringify(axis)}`)
    }
  }

  return freezeRecord([[discriminator, freezeRecord(frozenCases)]])
}

function validateStateAllowedValues(
  value: unknown,
  variantValues: Readonly<Record<string, unknown>>,
  caseName: string,
  axis: string,
): ReadonlyArray<string | boolean> {
  const context = `Component recipe state ${JSON.stringify(caseName)} allowed values for variant ${JSON.stringify(axis)}`
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${context} must be a non-empty array`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${context} cannot contain symbol properties`)
  }
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length") continue
    if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) {
      throw new TypeError(`${context} must contain only tuple values`)
    }
  }
  if (value.length === 0) throw new TypeError(`${context} must be non-empty`)

  const allowedValues: Array<string | boolean> = []
  const seen = new Set<string>()
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)]
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${context} must contain dense enumerable data values`)
    }
    const allowedValue = descriptor.value
    if (typeof allowedValue !== "string" && typeof allowedValue !== "boolean") {
      throw new TypeError(`${context} values must be strings or booleans`)
    }
    const valueName = String(allowedValue)
    if (!Object.hasOwn(variantValues, valueName)) {
      throw new TypeError(`${context} has unknown value ${JSON.stringify(allowedValue)} for variant ${JSON.stringify(axis)}`)
    }
    const key = typeof allowedValue === "boolean"
      ? `b:${allowedValue ? 1 : 0}`
      : `s:${allowedValue.length}:${allowedValue}`
    if (seen.has(key)) {
      throw new TypeError(`${context} contains duplicate allowed value ${JSON.stringify(allowedValue)}`)
    }
    seen.add(key)
    allowedValues.push(allowedValue)
  }
  return Object.freeze(allowedValues)
}

function authorVariants(
  value: ValidatedVariants,
  slots: NativeComponentSlots,
  debugId: string | undefined,
): Readonly<Record<string, Readonly<Record<string, NativeComponentResolvedSlotStyles<NativeComponentSlots>>>>> {
  return freezeRecord(value.map(([variantName, variantValues]) => [
    variantName,
    freezeRecord(variantValues.map(([valueName, branch]) => [valueName, authorSlotStyles(
        branch,
        slots,
        debugId,
        "variant",
        variantName,
        valueName,
      )]))
  ])) as Readonly<Record<string, Readonly<Record<string, NativeComponentResolvedSlotStyles<NativeComponentSlots>>>>>
}

function validateSlotStyles(
  value: unknown,
  slots: NativeComponentSlots,
  context: string,
): ValidatedSlotStyles {
  return recordEntries(value, `component recipe ${context} slot styles`).map(([slot, rule]) => {
    if (slots[slot] === undefined) {
      throw new TypeError(`Component recipe ${context} references unknown slot ${JSON.stringify(slot)}`)
    }
    return [slot, rule] as const
  })
}

function authorSlotStyles(
  entries: ValidatedSlotStyles,
  slots: NativeComponentSlots,
  debugId: string | undefined,
  branchKind: string,
  ...segments: ReadonlyArray<string>
): NativeComponentResolvedSlotStyles<NativeComponentSlots> {
  const result: Array<readonly [string, NativeComponentStyleReference]> = []
  entries.forEach(([slot, rule], index) => {
    const kind = slots[slot]
    if (kind === undefined) throw new TypeError(`Component recipe ${branchKind} references unknown slot ${JSON.stringify(slot)}`)
    const slotDebugId = debugId === undefined ? undefined : `${debugId}.${slot}`
    const className = authorNativeStyle(
      rule,
      [kind],
      componentDebugId(slotDebugId, "slot", branchKind, ...segments, String(index)),
    )
    result.push([slot, componentStyleReference(className)])
  })
  return freezeRecord(result) as unknown as NativeComponentResolvedSlotStyles<NativeComponentSlots>
}

function validateCompounds(
  value: unknown,
  variants: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  slots: NativeComponentSlots,
  debugId: string | undefined,
): ReadonlyArray<ValidatedCompound> {
  if (!Array.isArray(value)) throw new TypeError("Component recipe compound variants must be an array")
  return Object.freeze(value.map((compound, index) => {
    assertPlainRecord(compound, `component recipe compound variant ${index}`)
    const keys = Object.keys(compound)
    if (keys.some(key => key !== "variants" && key !== "styles")) {
      throw new TypeError(`Component recipe compound variant ${index} has an unknown field`)
    }
    const selection = validateSelection(
      compound.variants ?? {}, variants,
      `${componentName(debugId)} compound variant ${index}`,
      "selection",
    )
    const styles = validateSlotStyles(compound.styles, slots, `compound variant ${index}`)
    return Object.freeze({selection, styles})
  }))
}

function authorCompoundVariants(
  compounds: ReadonlyArray<ValidatedCompound>,
  slots: NativeComponentSlots,
  debugId: string | undefined,
): ReadonlyArray<NativeComponentCompoundVariant<NativeComponentSlots, NativeComponentVariantsShape>> {
  return Object.freeze(compounds.map((compound, index) => Object.freeze({
    variants: compound.selection,
    styles: authorSlotStyles(compound.styles, slots, debugId, "compound", String(index)),
  }))) as ReadonlyArray<NativeComponentCompoundVariant<NativeComponentSlots, NativeComponentVariantsShape>>
}

function validateSelection(
  value: unknown,
  variants: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  context: string,
  valueLabel = "default",
): Readonly<Record<string, string | boolean>> {
  const entries: Array<readonly [string, string | boolean]> = []
  for (const [variantName, selectedValue] of recordEntries(value, context)) {
    const values = variants[variantName]
    if (values === undefined) throw new TypeError(`${context} references unknown variant ${JSON.stringify(variantName)}`)
    if (typeof selectedValue !== "string" && typeof selectedValue !== "boolean") {
      throw new TypeError(`${context} values must be strings or booleans`)
    }
    const key = String(selectedValue)
    if (!Object.hasOwn(values, key)) {
      throw new TypeError(`${context} ${valueLabel} value ${JSON.stringify(selectedValue)} is not defined for variant ${JSON.stringify(variantName)}`)
    }
    entries.push([variantName, selectedValue])
  }
  return freezeRecord(entries) as Readonly<Record<string, string | boolean>>
}

function componentStyleReference(className: string): NativeComponentStyleReference {
  const reference = {
    $$type: NativeRecipeClassType,
    className,
  }
  Object.defineProperty(reference, NativeRecipeClassSymbol, {value: true, enumerable: true})
  return Object.freeze(reference)
}

function freezeLegacyClassReference(style: NativeStyle): NativeStyle {
  if (typeof style === "object" && style !== null &&
    "$$type" in style && style.$$type === NativeRecipeClassType) {
    Object.freeze(style)
  }
  return style
}

function recordEntries(value: unknown, context: string): Array<[string, unknown]> {
  assertPlainRecord(value, context)
  return Object.entries(value as Record<string, unknown>)
}

function assertPlainRecord(value: unknown, context: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be a plain data record`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${context} must be a plain data record`)
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${context} cannot contain symbol properties`)
  }
  for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${context}.${name} must be an enumerable data property`)
    }
  }
}

function freezeRecord(entries: Iterable<readonly [string, unknown]>): Readonly<Record<string, unknown>> {
  return Object.freeze(Object.fromEntries(entries))
}

function componentName(debugId: string | undefined): string {
  return debugId === undefined ? "Component recipe" : `Component recipe "${debugId}"`
}

function componentDebugId(debugId: string | undefined, ...segments: ReadonlyArray<string>): string | undefined {
  return debugId === undefined ? undefined : [debugId, ...segments].join("_")
}
