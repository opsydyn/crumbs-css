import { a as NativeLocalFallback, f as NativePrimitiveDomain, i as NativeLocalDomain, n as AnyLocalVar, o as NativeLocalStylePlan, p as NativePrimitiveKind, r as LocalLiteral, s as NativeLocalVar, t as AnyLocalFallback } from "./model-DAuWjF1q.mjs";
import { t as TokenContractIdentity } from "./identity-DwBRSt_G.mjs";
import { c as PublicDomainThemeVar, f as ThemeVar, p as TokenDomain, r as LegacyNativeThemeVar, t as DomainThemeVar } from "./theme-token-5fLFCMug.mjs";
import { f as TokenDomainDefinition } from "./domains-DjWDvNbl.mjs";
import { StyleRule } from "@vanilla-extract/css";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";

//#region src/components/contracts.d.ts
type NativeComponentContractIdentity = {
  readonly owner: string;
  readonly name: string;
  readonly version: number;
};
type NativeComponentContractExtensionPoints = {
  readonly defaults?: ReadonlyArray<string>;
  readonly variantValues?: ReadonlyArray<string>;
  readonly compoundVariants?: true;
  readonly slotStyles?: ReadonlyArray<string>;
};
type NativeComponentContract = {
  readonly identity: NativeComponentContractIdentity;
  readonly public: {
    readonly slots: ReadonlyArray<string>;
    readonly variants: Readonly<Record<string, ReadonlyArray<string>>>;
  };
  readonly extensionPoints?: NativeComponentContractExtensionPoints;
};
//#endregion
//#region src/native-tags.d.ts
declare const NativeRecipeType: "crumbs.css.recipe";
declare const NativeRecipeClassType: "crumbs.css.class";
declare const NativeComponentRecipeType: "crumbs.css.component-recipe";
declare const NativeComponentRecipeLegacyVersion: 1;
declare const NativeComponentRecipeVersion: 2;
declare const NativeComponentRecipeContractVersion: 3;
declare const NativeComponentRecipeExtensionType: "crumbs.css.component-recipe-extension";
declare const NativeComponentRecipeExtensionVersion: 1;
declare const NativeSprinklesLookupPlanType: "crumbs.css.sprinkles-lookup-plan";
declare const NativeSprinklesLookupPlanVersion: 1;
//#endregion
//#region src/components/extension-contract.d.ts
type NativeComponentRecipeExtensionIdentity = NativeComponentContractIdentity;
type NativeComponentExtensionSlotStyles = Readonly<Record<string, unknown>>;
type NativeComponentExtensionVariants = Readonly<Record<string, Readonly<Record<string, NativeComponentExtensionSlotStyles>>>>;
declare const NativeComponentRecipeExtensionTypeInfo: unique symbol;
/** Immutable serialized operations supplied by one extension in a chain. */
type NativeComponentRecipeExtensionDescriptor<TBase = unknown, TAddedVariants extends NativeComponentExtensionVariants = NativeComponentExtensionVariants, TAllAddedVariants = TAddedVariants, TAllDefaultVariants = Readonly<Record<never, never>>> = {
  readonly $$type: typeof NativeComponentRecipeExtensionType;
  readonly version: typeof NativeComponentRecipeExtensionVersion;
  readonly identity: NativeComponentRecipeExtensionIdentity;
  readonly componentIdentity: NativeComponentContractIdentity;
  readonly parentExtensionIdentity?: NativeComponentRecipeExtensionIdentity;
  readonly defaultVariants: Readonly<Record<string, string | boolean>>; /** Only this descriptor's new value branches. */
  readonly variants: TAddedVariants;
  readonly compoundVariants: ReadonlyArray<{
    readonly variants: Readonly<Record<string, string | boolean>>;
    readonly styles: NativeComponentExtensionSlotStyles;
  }>;
  readonly slotOverrides: NativeComponentExtensionSlotStyles; /** Compile-time provenance; deliberately absent from the serialized object. */
  readonly [NativeComponentRecipeExtensionTypeInfo]?: {
    readonly base: TBase;
    readonly variants: TAllAddedVariants;
    readonly defaultVariants: TAllDefaultVariants;
  };
};
type NativeComponentRecipeExtensionTypeDetails<TExtension> = TExtension extends {
  readonly [NativeComponentRecipeExtensionTypeInfo]?: infer TDetails;
} ? Exclude<TDetails, undefined> : never;
type NativeComponentRecipeExtensionPlan = {
  readonly extensions: ReadonlyArray<NativeComponentRecipeExtensionDescriptor>;
  readonly defaultVariants: Readonly<Record<string, string | boolean>>;
  readonly variants: NativeComponentExtensionVariants;
  readonly compoundVariants: ReadonlyArray<{
    readonly variants: Readonly<Record<string, string | boolean>>;
    readonly styles: NativeComponentExtensionSlotStyles;
  }>;
  readonly slotOverrides: ReadonlyArray<NativeComponentExtensionSlotStyles>;
  readonly selectionKeys: ReadonlyArray<string>; /** Owner-only values are never admitted by extension consumer selections. */
  readonly privateOwnerValues: Readonly<Record<string, Readonly<Record<string, true>>>>;
};
//#endregion
//#region src/local-vars/authoring.d.ts
declare function createVar<const D extends TokenDomainDefinition>(definition: D, identity: TokenContractIdentity): NativeLocalVar<NativeLocalDomain<D>>;
type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;
type CheckedTerminal<D extends TokenDomain, T> = T extends ThemeVar ? T extends PublicDomainThemeVar<D> ? unknown : never : T extends LocalLiteral<D> ? unknown : never;
declare function fallbackVar<D extends TokenDomain, const A extends [...NativeLocalVar<NoInfer<D>>[], string | number]>(primary: NativeLocalVar<D>, ...rest: A & CheckedTerminal<NoInfer<D>, Last<A>>): NativeLocalFallback<D>;
//#endregion
//#region src/sprinkles/index.d.ts
declare const allNativePrimitives: readonly ["view", "text", "image"];
type PrimitiveStyleInput<TPrimitive extends NativePrimitiveKind> = TPrimitive extends "view" ? NativeViewStyleInput : TPrimitive extends "text" ? NativeTextStyleInput : TPrimitive extends "image" ? NativeImageStyleInput : never;
type PrimitiveInputUnion<TPrimitives extends NativePrimitiveDomain> = PrimitiveStyleInput<TPrimitives[number]>;
/** Properties present on every primitive in a sprinkle definition. */
type NativeSprinklePropertyKey<TPrimitives extends NativePrimitiveDomain> = keyof PrimitiveInputUnion<TPrimitives>;
type PrimitiveValue<TPrimitive extends NativePrimitiveKind, TProperty extends PropertyKey> = TProperty extends keyof PrimitiveStyleInput<TPrimitive> ? NonNullable<PrimitiveStyleInput<TPrimitive>[TProperty]> : never;
type SprinkleTokenValue<TProperty extends PropertyKey> = [NativeStyleTokenDomainForProperty<TProperty>] extends [never] ? never : DomainThemeVar<NativeStyleTokenDomainForProperty<TProperty>>;
type DomainValue<TPrimitives extends NativePrimitiveDomain, TProperty extends PropertyKey> = NonNullable<PrimitiveValue<TPrimitives[number], TProperty>> | SprinkleTokenValue<TProperty>;
type PropertyScale<TPrimitives extends NativePrimitiveDomain, TProperty extends PropertyKey> = Readonly<Record<string, DomainValue<TPrimitives, TProperty>>>;
type NativeSprinklePropertyConfig<TPrimitives extends NativePrimitiveDomain> = { readonly [TProperty in NativeSprinklePropertyKey<TPrimitives>]?: PropertyScale<TPrimitives, TProperty> };
type PropertyName<TProperties> = Extract<keyof TProperties, string>;
type ShorthandTarget<TProperties> = readonly [PropertyName<TProperties>, ...PropertyName<TProperties>[]];
type NativeSprinkleShorthandConfig<TProperties> = Readonly<Record<string, ShorthandTarget<TProperties>>>;
type NativeSprinkleDefinition<TPrimitives extends NativePrimitiveDomain, TProperties extends object, TShorthands extends Readonly<Record<string, readonly string[]>>> = {
  readonly primitives: TPrimitives;
  readonly properties: TProperties;
  readonly shorthands: TShorthands;
};
type NativeSprinklesConfig<TPrimitives extends NativePrimitiveDomain, TProperties extends object, TShorthands extends Readonly<Record<string, readonly string[]>>> = {
  readonly primitives?: TPrimitives;
  readonly properties: TProperties;
  readonly shorthands?: TShorthands;
};
type ScaleName<TScale> = Extract<keyof TScale, string>;
type ShorthandScaleNames<TProperties, TTargets> = TTargets extends readonly (keyof TProperties & string)[] ? Extract<keyof TProperties[TTargets[number]], string> : never;
type NativeSprinklesSelection<TProperties extends object, TShorthands extends Readonly<Record<string, readonly string[]>>> = Partial<{ readonly [TProperty in keyof TProperties]: TProperty extends keyof TProperties ? ScaleName<TProperties[TProperty]> | false | null | undefined : never } & { readonly [TShorthand in keyof TShorthands]: ShorthandScaleNames<TProperties, TShorthands[TShorthand]> | false | null | undefined }>;
type NativeSprinkleStaticResult<TPrimitives extends NativePrimitiveDomain> = TPrimitives extends readonly [infer TPrimitive extends NativePrimitiveKind] ? TPrimitive extends "view" ? ViewStyle : TPrimitive extends "text" ? TextStyle : ImageStyle : NativeStyle;
type NativeSprinklesLookupPlan<TPrimitives extends NativePrimitiveDomain = NativePrimitiveDomain, TProperties extends object = NativeSprinklePropertyMap, TShorthands extends Readonly<Record<string, readonly string[]>> = Readonly<Record<string, readonly string[]>>> = {
  readonly $$type: typeof NativeSprinklesLookupPlanType;
  readonly version: typeof NativeSprinklesLookupPlanVersion;
  readonly primitives: TPrimitives;
  readonly properties: { readonly [TProperty in keyof TProperties]: TProperties[TProperty] extends Readonly<Record<string, unknown>> ? { readonly [TScale in keyof TProperties[TProperty]]: NativeSprinkleStaticResult<TPrimitives> } : never };
  readonly shorthands: TShorthands;
};
type NativeSprinklePropertyMap = Readonly<Record<string, Readonly<Record<string, unknown>>>>;
type ValidateTokenDomain<TValue, TProperty extends PropertyKey> = TValue extends DomainThemeVar<infer TDomain> ? [NativeStyleTokenDomainForProperty<TProperty>] extends [never] ? never : TDomain extends NativeStyleTokenDomainForProperty<TProperty> ? TValue : never : TValue extends LegacyNativeThemeVar ? TValue : TValue;
type ValidateScaleValue<TPrimitives extends NativePrimitiveDomain, TProperty extends PropertyKey, TValue> = TValue extends DomainValue<TPrimitives, TProperty> ? ValidateTokenDomain<TValue, TProperty> : never;
type ValidatedSprinkleProperties<TPrimitives extends NativePrimitiveDomain, TProperties extends NativeSprinklePropertyMap> = { readonly [TProperty in keyof TProperties]: TProperty extends NativeSprinklePropertyKey<TPrimitives> ? TProperties[TProperty] extends Readonly<Record<string, unknown>> ? { readonly [TName in keyof TProperties[TProperty]]: ValidateScaleValue<TPrimitives, TProperty, TProperties[TProperty][TName]> } : never : never };
/**
 * Define a finite, typed native utility property set.
 *
 * Values are keyed by stable scale names and are checked against every
 * declared primitive. Omit `primitives` only for a shared view/text/image set.
 */
declare function defineProperties<const TPrimitives extends NativePrimitiveDomain = typeof allNativePrimitives, const TProperties extends NativeSprinklePropertyMap = NativeSprinklePropertyMap, const TShorthands extends NativeSprinkleShorthandConfig<TProperties> = {}>(config: NativeSprinklesConfig<TPrimitives, TProperties, TShorthands> & {
  readonly properties: TProperties & ValidatedSprinkleProperties<TPrimitives, TProperties>;
}): NativeSprinkleDefinition<TPrimitives, TProperties, TShorthands>;
declare function createSprinkles<const TPrimitives extends NativePrimitiveDomain, const TProperties extends NativeSprinklePropertyMap, const TShorthands extends NativeSprinkleShorthandConfig<TProperties>>(definition: NativeSprinkleDefinition<TPrimitives, TProperties, TShorthands>): (selection: NativeSprinklesSelection<TProperties, TShorthands>, debugId?: string) => NativeSprinkleStaticResult<TPrimitives>;
/**
 * Generate a finite, non-Cartesian lookup plan for runtime selections.
 *
 * `createSprinkles` is the authored static path and returns one compiled style
 * reference. This plan emits one native style reference per property/scale;
 * the runtime resolver can then select and order those references without
 * evaluating authoring code or expanding every combination.
 */
declare function createSprinklesLookupPlan<const TPrimitives extends NativePrimitiveDomain, const TProperties extends NativeSprinklePropertyMap, const TShorthands extends NativeSprinkleShorthandConfig<TProperties>>(definition: NativeSprinkleDefinition<TPrimitives, TProperties, TShorthands>, debugId?: string): NativeSprinklesLookupPlan<TPrimitives, TProperties, TShorthands>;
//#endregion
//#region src/components/index.d.ts
type NativeComponentSlotKind = NativePrimitiveKind;
type NativeComponentSlots = Readonly<Record<string, NativeComponentSlotKind>>;
type NativeComponentSlotStyleInput<TKind extends NativeComponentSlotKind> = TKind extends "view" ? NativeViewStyleInput | ViewStyle | NativeStyleComposition<NativeViewStyleInput, ViewStyle> : TKind extends "text" ? NativeTextStyleInput | TextStyle | NativeStyleComposition<NativeTextStyleInput, TextStyle> : NativeImageStyleInput | ImageStyle | NativeStyleComposition<NativeImageStyleInput, ImageStyle>;
type NativeComponentSlotStyles<TSlots extends NativeComponentSlots> = Partial<{ readonly [TSlot in keyof TSlots & string]: NativeComponentSlotStyleInput<TSlots[TSlot]> }>;
type NativeComponentVariantsConfig<TSlots extends NativeComponentSlots> = Readonly<Record<string, Readonly<Record<string, NativeComponentSlotStyles<TSlots>>>>>;
type NativeComponentVariantsShape = Readonly<Record<string, Readonly<Record<string, unknown>>>>;
type NativeComponentVariantSelection<TValues> = keyof TValues extends "false" | "true" ? boolean | keyof TValues : keyof TValues;
type NativeComponentRecipeSelection<TVariants extends NativeComponentVariantsShape> = { readonly [K in keyof TVariants]?: NativeComponentVariantSelection<TVariants[K]> };
type NativeComponentNonEmptyTuple<T> = readonly [T, ...T[]];
type NativeComponentStateCaseConstraints<TVariants extends NativeComponentVariantsShape, TDiscriminator extends keyof TVariants> = Readonly<{ readonly [K in Exclude<keyof TVariants, TDiscriminator>]?: NativeComponentNonEmptyTuple<NativeComponentVariantSelection<TVariants[K]>> }>;
type NativeComponentStateCases<TVariants extends NativeComponentVariantsShape, TDiscriminator extends keyof TVariants> = Readonly<{ readonly [TCase in keyof TVariants[TDiscriminator]]: NativeComponentStateCaseConstraints<TVariants, TDiscriminator> }>;
/** One exhaustive discriminator with per-case constraints over sibling variant axes. */
type NativeComponentStateVariants<TVariants extends NativeComponentVariantsShape> = { readonly [TDiscriminator in keyof TVariants]: Readonly<{ readonly [K in TDiscriminator]: NativeComponentStateCases<TVariants, TDiscriminator> }> & Readonly<{ readonly [K in Exclude<keyof TVariants, TDiscriminator>]?: never }> }[keyof TVariants];
type IsUnion<T, TAll = T> = T extends TAll ? ([TAll] extends [T] ? false : true) : never;
type StateConstraintTupleIsValid<TVariant, TAllowed> = TAllowed extends readonly [unknown, ...unknown[]] ? Exclude<TAllowed[number], NativeComponentVariantSelection<TVariant>> extends never ? true : false : false;
type StateCaseConstraintsAreValid<TVariants extends NativeComponentVariantsShape, TDiscriminator extends keyof TVariants, TCase extends object> = [Exclude<keyof TCase, Exclude<keyof TVariants, TDiscriminator>>] extends [never] ? false extends { [TAxis in keyof TCase]: TAxis extends keyof TVariants ? StateConstraintTupleIsValid<TVariants[TAxis], TCase[TAxis]> : false }[keyof TCase] ? false : true : false;
type StateCasesAreValid<TVariants extends NativeComponentVariantsShape, TDiscriminator extends keyof TVariants, TCases extends object> = [Exclude<keyof TCases, keyof TVariants[TDiscriminator]> | Exclude<keyof TVariants[TDiscriminator], keyof TCases>] extends [never] ? false extends { [TCase in keyof TCases]: TCases[TCase] extends object ? StateCaseConstraintsAreValid<TVariants, TDiscriminator, TCases[TCase]> : false }[keyof TCases] ? false : true : false;
type StateVariantMapIsValid<TVariants extends NativeComponentVariantsShape, TStates> = TStates extends object ? [keyof TStates] extends [never] ? false : IsUnion<keyof TStates> extends true ? false : [Exclude<keyof TStates, keyof TVariants>] extends [never] ? keyof TStates extends infer TDiscriminator ? TDiscriminator extends keyof TStates & keyof TVariants ? TStates[TDiscriminator] extends object ? StateCasesAreValid<TVariants, TDiscriminator, TStates[TDiscriminator]> : false : false : false : false : false;
type IsRequiredProperty<T, K extends PropertyKey> = K extends keyof T ? {} extends Pick<T, K> ? false : true : false;
type StringifiedStateValue<T> = T extends string ? T : T extends boolean ? `${T}` : never;
type DefaultStateCaseKey<TStates, TDiscriminator extends keyof TStates, TDefaults> = TDiscriminator extends keyof TDefaults ? Extract<keyof TStates[TDiscriminator], StringifiedStateValue<TDefaults[TDiscriminator]>> : never;
type OptionalDefaultStateCaseKey<TStates, TDiscriminator extends keyof TStates, TDefaults> = [DefaultStateCaseKey<TStates, TDiscriminator, TDefaults>] extends [never] ? never : IsUnion<DefaultStateCaseKey<TStates, TDiscriminator, TDefaults>> extends true ? never : DefaultStateCaseKey<TStates, TDiscriminator, TDefaults>;
type StateDefaultCaseConstraintsAreValid<TConstraints extends object, TDefaults> = [Exclude<keyof TConstraints, keyof TDefaults>] extends [never] ? false extends { [TAxis in keyof TConstraints]: TAxis extends keyof TDefaults ? IsRequiredProperty<TDefaults, TAxis> extends true ? TConstraints[TAxis] extends ReadonlyArray<infer TAllowed> ? [TDefaults[TAxis]] extends [TAllowed] ? true : false : false : false : false }[keyof TConstraints] ? false : true : false;
type StateDefaultsAreValid<TVariants extends NativeComponentVariantsShape, TStates, TDefaults> = TStates extends undefined ? true : TStates extends object ? [keyof TStates] extends [never] ? false : IsUnion<keyof TStates> extends true ? false : keyof TStates extends infer TDiscriminator ? TDiscriminator extends keyof TStates & keyof TVariants ? IsRequiredProperty<TDefaults, TDiscriminator> extends true ? [DefaultStateCaseKey<TStates, TDiscriminator, TDefaults>] extends [never] ? false : DefaultStateCaseKey<TStates, TDiscriminator, TDefaults> extends infer TCase ? TCase extends keyof TStates[TDiscriminator] ? TStates[TDiscriminator][TCase] extends object ? StateDefaultCaseConstraintsAreValid<TStates[TDiscriminator][TCase], TDefaults> : false : false : false : false : false : false : false;
type ComponentStateCaseValue<TVariant, TCase extends string> = keyof TVariant extends "false" | "true" ? TCase extends "true" ? true : false : TCase;
type RequiredStateAxisKeys<TConstraints, TDefaults> = { [TAxis in keyof TConstraints]-?: TAxis extends keyof TDefaults ? IsRequiredProperty<TDefaults, TAxis> extends true ? TConstraints[TAxis] extends ReadonlyArray<infer TAllowed> ? [TDefaults[TAxis]] extends [TAllowed] ? never : TAxis : TAxis : TAxis : TAxis }[keyof TConstraints];
type StateCaseAxisValue<TVariants, TConstraints, TAxis extends keyof TVariants> = TAxis extends keyof TConstraints ? TConstraints[TAxis] extends ReadonlyArray<infer TAllowed> ? TAllowed : never : NativeComponentVariantSelection<TVariants[TAxis]>;
type StateCaseAxisSelection<TVariants extends NativeComponentVariantsShape, TConstraints extends object, TDefaults, TDiscriminator extends keyof TVariants> = { readonly [TAxis in Exclude<keyof TVariants, TDiscriminator> as TAxis extends RequiredStateAxisKeys<TConstraints, TDefaults> ? never : TAxis]?: StateCaseAxisValue<TVariants, TConstraints, TAxis> } & { readonly [TAxis in Extract<Exclude<keyof TVariants, TDiscriminator>, RequiredStateAxisKeys<TConstraints, TDefaults>>]: StateCaseAxisValue<TVariants, TConstraints, TAxis> };
type StateCaseSelection<TVariants extends NativeComponentVariantsShape, TStates extends object, TDefaults, TDiscriminator extends keyof TVariants & keyof TStates, TCase extends string, TConstraints extends object> = (TCase extends OptionalDefaultStateCaseKey<TStates, TDiscriminator, TDefaults> ? { readonly [K in TDiscriminator]?: ComponentStateCaseValue<TVariants[TDiscriminator], TCase> } : { readonly [K in TDiscriminator]: ComponentStateCaseValue<TVariants[TDiscriminator], TCase> }) & StateCaseAxisSelection<TVariants, TConstraints, TDefaults, TDiscriminator>;
type NativeComponentStateRecipeSelection<TVariants extends NativeComponentVariantsShape, TStates, TDefaults> = TStates extends undefined ? NativeComponentRecipeSelection<TVariants> : TStates extends object ? { [TDiscriminator in keyof TStates]: TDiscriminator extends keyof TVariants ? { [TCase in keyof TStates[TDiscriminator]]: TCase extends string ? TStates[TDiscriminator][TCase] extends object ? StateCaseSelection<TVariants, TStates, TDefaults, TDiscriminator, TCase, TStates[TDiscriminator][TCase]> : never : never }[keyof TStates[TDiscriminator]] : never }[keyof TStates] : never;
type NativeComponentStateContractValidation<TVariants extends NativeComponentVariantsShape, TStates, TDefaults, TConfig> = [TStates] extends [undefined] ? unknown : StateVariantMapIsValid<TVariants, TStates> extends true ? TConfig extends {
  readonly defaultVariants?: unknown;
} ? IsRequiredProperty<TConfig, "defaultVariants"> extends true ? StateDefaultsAreValid<TVariants, TStates, TDefaults> extends true ? unknown : never : unknown : StateDefaultsAreValid<TVariants, TStates, TDefaults> extends true ? unknown : never : never;
type IsEqual<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends (<T>() => T extends TRight ? 1 : 2) ? true : false;
type StateVariantsFromConfig<TConfig, TVariants extends NativeComponentVariantsShape> = TConfig extends {
  readonly stateVariants: infer TStates;
} ? TStates : TConfig extends {
  readonly stateVariants?: infer TStates;
} ? IsEqual<TStates, NativeComponentStateVariants<TVariants> | undefined> extends true ? undefined : Exclude<TStates, undefined> extends infer TExplicitStates ? [TExplicitStates] extends [never] ? undefined : TExplicitStates : undefined : undefined;
type DefaultsFromConfig<TConfig, TVariants extends NativeComponentVariantsShape> = TConfig extends {
  readonly defaultVariants: infer TDefaults;
} ? TDefaults : NativeComponentRecipeSelection<TVariants>;
type NativeComponentCompoundVariant<TSlots extends NativeComponentSlots, TVariants extends NativeComponentVariantsShape> = {
  readonly styles: NativeComponentSlotStyles<TSlots>;
  readonly variants: NativeComponentRecipeSelection<TVariants>;
};
type NativeComponentSlotStyleResult<TKind extends NativeComponentSlotKind> = TKind extends "view" ? ViewStyle : TKind extends "text" ? TextStyle : ImageStyle;
type NativeComponentResolvedSlotStyles<TSlots extends NativeComponentSlots> = Partial<{ readonly [TSlot in keyof TSlots & string]: NativeComponentSlotStyleResult<TSlots[TSlot]> }>;
type NativeComponentRecipe<TSlots extends NativeComponentSlots, TVariants extends NativeComponentVariantsShape, TStateVariants extends NativeComponentStateVariants<TVariants> | undefined = undefined, TDefaults extends NativeComponentRecipeSelection<TVariants> = NativeComponentRecipeSelection<TVariants>, TContract extends NativeComponentContract | undefined = undefined> = {
  readonly $$debugName?: string;
  readonly $$type: typeof NativeComponentRecipeType;
  readonly slots: TSlots;
  readonly base?: NativeComponentResolvedSlotStyles<TSlots>;
  readonly variants: { readonly [K in keyof TVariants]: { readonly [V in keyof TVariants[K]]: NativeComponentResolvedSlotStyles<TSlots> } };
  readonly defaultVariants: TDefaults;
  readonly compoundVariants: ReadonlyArray<NativeComponentCompoundVariant<TSlots, TVariants> & {
    readonly styles: NativeComponentResolvedSlotStyles<TSlots>;
  }>;
} & (TStateVariants extends undefined ? {} : {
  readonly stateVariants: TStateVariants;
}) & (TContract extends NativeComponentContract ? {
  readonly version: typeof NativeComponentRecipeContractVersion;
  readonly contract: TContract;
} : {
  readonly version: typeof NativeComponentRecipeVersion;
});
type NativeComponentRecipeDescriptor = {
  readonly $$debugName?: string;
  readonly $$type: typeof NativeComponentRecipeType;
  readonly version: typeof NativeComponentRecipeLegacyVersion | typeof NativeComponentRecipeVersion | typeof NativeComponentRecipeContractVersion;
  readonly slots: NativeComponentSlots;
  readonly base?: object;
  readonly variants: object;
  readonly defaultVariants: object;
  readonly stateVariants?: object;
  readonly compoundVariants: ReadonlyArray<{
    readonly variants: object;
    readonly styles: object;
  }>;
  readonly contract?: NativeComponentContract;
};
type NativeComponentRecipeConfig<TSlots extends NativeComponentSlots, TVariants extends NativeComponentVariantsConfig<TSlots>, TStateVariants extends NativeComponentStateVariants<TVariants> | undefined = NativeComponentStateVariants<TVariants> | undefined, TDefaults extends NativeComponentRecipeSelection<TVariants> = NativeComponentRecipeSelection<TVariants>, TContract extends NativeComponentContract | undefined = NativeComponentContract | undefined> = {
  readonly slots: TSlots;
  readonly contract?: TContract;
  readonly base?: NativeComponentSlotStyles<TSlots>;
  readonly variants: TVariants;
  readonly defaultVariants?: TDefaults;
  readonly compoundVariants?: ReadonlyArray<NativeComponentCompoundVariant<TSlots, TVariants>>;
  readonly stateVariants?: TStateVariants;
};
type NativeComponentRecipeProps<TRecipe> = TRecipe extends NativeComponentRecipe<infer _TSlots, infer TVariants, infer TStateVariants, infer TDefaults, infer _TContract> ? NativeComponentStateRecipeSelection<TVariants, TStateVariants, TDefaults> : TRecipe extends {
  readonly version: typeof NativeComponentRecipeLegacyVersion;
  readonly variants: infer TVariants;
} ? { readonly [TVariant in keyof TVariants]?: NativeComponentVariantSelection<TVariants[TVariant]> } : never;
type ContractPublicVariants<TContract> = TContract extends {
  readonly public: {
    readonly variants: infer TVariants;
  };
} ? TVariants : never;
type ContractPublicSlots<TContract> = TContract extends {
  readonly public: {
    readonly slots: ReadonlyArray<infer TSlot>;
  };
} ? TSlot : never;
type ContractPublicValues<TContract, TAxis> = TAxis extends keyof ContractPublicVariants<TContract> ? ContractPublicVariants<TContract>[TAxis] extends ReadonlyArray<infer TValue> ? TValue : never : never;
type PublicVariantsForContract<TVariants extends NativeComponentVariantsShape, TContract> = { readonly [TAxis in keyof TVariants as TAxis extends keyof ContractPublicVariants<TContract> ? TAxis : never]: Pick<TVariants[TAxis], Extract<keyof TVariants[TAxis], ContractPublicValues<TContract, TAxis>>> };
type ContractPublicSurfaceIsValid<TSlots, TVariants, TContract> = [Exclude<ContractPublicSlots<TContract>, keyof TSlots>] extends [never] ? [Exclude<keyof ContractPublicVariants<TContract>, keyof TVariants>] extends [never] ? false extends { [TAxis in keyof ContractPublicVariants<TContract>]: TAxis extends keyof TVariants ? Exclude<ContractPublicValues<TContract, TAxis>, keyof TVariants[TAxis]> extends never ? true : false : false }[keyof ContractPublicVariants<TContract>] ? false : true : false : false;
type StringifiedContractStateValue<TValue> = TValue extends true ? "true" : TValue extends false ? "false" : TValue;
type ContractPublicConstraintsAreValid<TConstraints, TContract> = [Exclude<keyof TConstraints, keyof ContractPublicVariants<TContract>>] extends [never] ? false extends { [TAxis in keyof TConstraints]: TAxis extends keyof ContractPublicVariants<TContract> ? TConstraints[TAxis] extends ReadonlyArray<infer TAllowed> ? Exclude<StringifiedContractStateValue<TAllowed>, ContractPublicValues<TContract, TAxis>> extends never ? true : false : false : false }[keyof TConstraints] ? false : true : false;
type ContractPublicStateCasesAreValid<TStates, TContract, TDiscriminator extends keyof TStates> = TStates[TDiscriminator] extends object ? [Exclude<keyof TStates[TDiscriminator], ContractPublicValues<TContract, TDiscriminator>>] extends [never] ? [Exclude<ContractPublicValues<TContract, TDiscriminator>, keyof TStates[TDiscriminator]>] extends [never] ? false extends { [TCase in keyof TStates[TDiscriminator]]: TStates[TDiscriminator][TCase] extends object ? ContractPublicConstraintsAreValid<TStates[TDiscriminator][TCase], TContract> : false }[keyof TStates[TDiscriminator]] ? false : true : false : false : false;
type ContractPublicStateProjectionIsValid<TStates, TContract> = Exclude<TStates, undefined> extends infer TConcreteStates ? TConcreteStates extends object ? Extract<keyof TConcreteStates, keyof ContractPublicVariants<TContract>> extends infer TDiscriminator ? [TDiscriminator] extends [never] ? true : TDiscriminator extends keyof TConcreteStates ? ContractPublicStateCasesAreValid<TConcreteStates, TContract, TDiscriminator> : false : false : true : true;
type ContractFromConfig<TConfig> = TConfig extends {
  readonly contract: infer TContract extends NativeComponentContract;
} ? TContract : undefined;
type NativeComponentContractValidation<TSlots, TVariants, TStates, TContract> = [TContract] extends [undefined] ? unknown : TContract extends NativeComponentContract ? ContractPublicSurfaceIsValid<TSlots, TVariants, TContract> extends true ? ContractPublicStateProjectionIsValid<TStates, TContract> extends true ? unknown : never : never : never;
type MergePublicVariantMaps<TLeft, TRight> = { readonly [TAxis in keyof TLeft | keyof TRight]: (TAxis extends keyof TLeft ? TLeft[TAxis] : Readonly<Record<never, never>>) & (TAxis extends keyof TRight ? NonNullable<TRight[TAxis]> : Readonly<Record<never, never>>) };
type PublicComponentSelection<TVariants extends NativeComponentVariantsShape, TStates, TDefaults, TContract, TAdded = {}> = MergePublicVariantMaps<PublicVariantsForContract<TVariants, TContract>, TAdded> extends infer TPublicVariants extends NativeComponentVariantsShape ? Extract<keyof Exclude<TStates, undefined>, keyof TPublicVariants> extends never ? NativeComponentRecipeSelection<TPublicVariants> : NativeComponentStateRecipeSelection<TPublicVariants, Exclude<TStates, undefined>, TDefaults> : never;
type ApplyExtensionDefaults<TBaseDefaults, TExtensionDefaults> = Omit<TBaseDefaults, keyof TExtensionDefaults> & TExtensionDefaults;
type NativeComponentPublicPropsFromBase<TRecipe, TAdded, TExtensionDefaults = {}> = TRecipe extends NativeComponentRecipe<infer _TSlots, infer TVariants, infer TStateVariants, infer TDefaults, infer TContract> ? TContract extends NativeComponentContract ? PublicComponentSelection<TVariants, TStateVariants, ApplyExtensionDefaults<TDefaults, TExtensionDefaults>, TContract, TAdded> : never : never;
/** Consumer selection narrowed to the surfaces declared by a v3 contract. */
type NativeComponentPublicProps<TRecipe> = [NativeComponentRecipeExtensionTypeDetails<TRecipe>] extends [never] ? NativeComponentPublicPropsFromBase<TRecipe, {}> : NativeComponentRecipeExtensionTypeDetails<TRecipe> extends {
  readonly base: infer TBase;
  readonly variants: infer TAdded;
  readonly defaultVariants: infer TExtensionDefaults;
} ? NativeComponentPublicPropsFromBase<TBase, TAdded, TExtensionDefaults> : never;
type NativeComponentResolvedStyles<TSlots extends NativeComponentSlots> = Readonly<{ readonly [TSlot in keyof TSlots & string]: ReadonlyArray<NativeComponentSlotStyleResult<TSlots[TSlot]>> }>;
type NativeComponentVariantsFromRecipe<TSlot extends string, TVariants extends NativeRecipeVariantsConfig> = { readonly [TVariant in keyof TVariants]: { readonly [TValue in keyof TVariants[TVariant]]: Readonly<Partial<Record<TSlot, NativeRecipeStyleInput>>> } };
/**
 * Define a multi-slot component style contract with one shared variant map.
 * Each authored slot branch is captured for its declared native primitive.
 */
declare function componentRecipe<const TSlots extends NativeComponentSlots, const TVariants extends NativeComponentVariantsConfig<TSlots>, const TConfig extends NativeComponentRecipeConfig<TSlots, TVariants, NativeComponentStateVariants<TVariants> | undefined, NativeComponentRecipeSelection<TVariants>, NativeComponentContract | undefined>>(config: NativeComponentRecipeConfig<TSlots, TVariants, NativeComponentStateVariants<TVariants> | undefined, NativeComponentRecipeSelection<TVariants>, NativeComponentContract | undefined> & TConfig & NativeComponentStateContractValidation<TVariants, StateVariantsFromConfig<TConfig, TVariants>, DefaultsFromConfig<TConfig, TVariants>, TConfig> & NativeComponentContractValidation<TSlots, TVariants, StateVariantsFromConfig<TConfig, TVariants>, ContractFromConfig<TConfig>>, debugId?: string): NativeComponentRecipe<TSlots, TVariants, StateVariantsFromConfig<TConfig, TVariants>, DefaultsFromConfig<TConfig, TVariants>, ContractFromConfig<TConfig>>;
/**
 * Wrap an existing view recipe in one named slot without reauthoring its
 * compiled class references or changing its selection model.
 */
declare function componentRecipeFromRecipe<const TSlot extends string, TVariants extends NativeRecipeVariantsConfig, const TContract extends NativeComponentContract | undefined = undefined>(recipe: NativeRecipe<TVariants>, options: {
  readonly slot: TSlot;
  readonly debugId?: string;
  readonly contract?: TContract;
}): NativeComponentRecipe<Readonly<Record<TSlot, "view">>, NativeComponentVariantsFromRecipe<TSlot, TVariants>, undefined, NativeComponentRecipeSelection<NativeComponentVariantsFromRecipe<TSlot, TVariants>>, TContract>;
//#endregion
//#region src/components/extensions.d.ts
type ContractOf<TBase> = TBase extends {
  readonly contract: infer TContract extends NativeComponentContract;
} ? TContract : never;
type SlotsOf<TBase> = TBase extends {
  readonly slots: infer TSlots extends NativeComponentSlots;
} ? TSlots : NativeComponentSlots;
type SlotStylePermission<TBase> = ContractOf<TBase> extends {
  readonly extensionPoints?: {
    readonly slotStyles?: ReadonlyArray<infer TSlot>;
  };
} ? Extract<TSlot, keyof SlotsOf<TBase> & string> : never;
type PermittedExtensionSlots<TBase> = Pick<SlotsOf<TBase>, SlotStylePermission<TBase>>;
type PublicVariantAxes<TBase> = ContractOf<TBase> extends {
  readonly public: {
    readonly variants: infer TVariants;
  };
} ? Extract<keyof TVariants, string> : never;
type DefaultVariantAxes<TBase> = ContractOf<TBase> extends {
  readonly extensionPoints?: {
    readonly defaults?: ReadonlyArray<infer TAxis>;
  };
} ? Extract<TAxis, string> : never;
type AddVariantAxes<TBase> = ContractOf<TBase> extends {
  readonly extensionPoints?: {
    readonly variantValues?: ReadonlyArray<infer TAxis>;
  };
} ? Extract<TAxis, string> : never;
type HasCompoundVariantPermission<TBase> = ContractOf<TBase> extends {
  readonly extensionPoints: infer TExtensionPoints;
} ? TExtensionPoints extends {
  readonly compoundVariants: true;
} ? true : false : false;
type ExtensionCompoundVariants<TBase> = HasCompoundVariantPermission<TBase> extends true ? ReadonlyArray<{
  readonly variants: Partial<Record<PublicVariantAxes<TBase>, string | boolean>>;
  readonly styles: NativeComponentSlotStyles<PermittedExtensionSlots<TBase>>;
}> : never;
type NativeComponentRecipeExtensionConfig<TBase extends NativeComponentRecipeDescriptor = NativeComponentRecipeDescriptor> = {
  readonly identity: NativeComponentContractIdentity;
  readonly defaultVariants?: Partial<Record<DefaultVariantAxes<TBase>, string | boolean>>;
  readonly variants?: Partial<Record<AddVariantAxes<TBase>, Readonly<Record<string, NativeComponentSlotStyles<PermittedExtensionSlots<TBase>>>>>>;
  readonly compoundVariants?: ExtensionCompoundVariants<TBase>;
  readonly slotOverrides?: NativeComponentSlotStyles<PermittedExtensionSlots<TBase>>;
};
type ExtraKeys<TValue, TAllowed extends PropertyKey> = TValue extends object ? Exclude<keyof TValue, TAllowed> : never;
type ExtensionVariantStyleBranches<TVariants> = TVariants extends object ? { [TAxis in keyof TVariants]: TVariants[TAxis] extends object ? TVariants[TAxis][keyof TVariants[TAxis]] : never }[keyof TVariants] : never;
type ExtensionCompoundAxisKeys<TCompound, TAllowed extends PropertyKey> = TCompound extends {
  readonly variants: infer TSelection;
} ? ExtraKeys<TSelection, TAllowed> : never;
type ExtensionCompoundSlotKeys<TCompound, TAllowed extends PropertyKey> = TCompound extends {
  readonly styles: infer TStyles;
} ? ExtraKeys<TStyles, TAllowed> : never;
type ExtensionCompoundRecordKeys<TCompound> = TCompound extends object ? Exclude<keyof TCompound, "variants" | "styles"> : never;
type ExtensionConfigExtraKeys<TBase extends NativeComponentRecipeDescriptor, TConfig> = ExtraKeys<TConfig, keyof NativeComponentRecipeExtensionConfig<TBase>> | (TConfig extends {
  readonly identity: infer TIdentity;
} ? ExtraKeys<TIdentity, keyof NativeComponentContractIdentity> : never) | (TConfig extends {
  readonly defaultVariants: infer TDefaults;
} ? ExtraKeys<TDefaults, DefaultVariantAxes<TBase>> : never) | (TConfig extends {
  readonly variants: infer TVariants;
} ? ExtraKeys<TVariants, AddVariantAxes<TBase>> | ExtraKeys<ExtensionVariantStyleBranches<TVariants>, keyof PermittedExtensionSlots<TBase>> : never) | (TConfig extends {
  readonly compoundVariants: infer TCompounds extends ReadonlyArray<unknown>;
} ? ExtensionCompoundAxisKeys<TCompounds[number], PublicVariantAxes<TBase>> | ExtensionCompoundSlotKeys<TCompounds[number], keyof PermittedExtensionSlots<TBase>> | ExtensionCompoundRecordKeys<TCompounds[number]> : never) | (TConfig extends {
  readonly slotOverrides: infer TOverrides;
} ? ExtraKeys<TOverrides, keyof PermittedExtensionSlots<TBase>> : never);
type ExtensionConfigExactness<TBase extends NativeComponentRecipeDescriptor, TConfig> = [ExtensionConfigExtraKeys<TBase, TConfig>] extends [never] ? unknown : never;
type AddedVariantsOf<TConfig> = TConfig extends {
  readonly variants: infer TVariants extends NativeComponentExtensionVariants;
} ? TVariants : Readonly<Record<never, never>>;
type AddedVariantsFromPrior<TPrior extends ReadonlyArray<unknown>> = UnionToIntersection<TPrior[number] extends infer TExtension ? NativeComponentRecipeExtensionTypeDetails<TExtension> extends {
  readonly variants: infer TVariants;
} ? TVariants : Readonly<Record<never, never>> : never>;
type EmptyExtensionDefaults = Readonly<Record<never, never>>;
type AddedDefaultsOf<TConfig> = TConfig extends {
  readonly defaultVariants: infer TDefaults extends Readonly<Record<string, string | boolean>>;
} ? TDefaults : EmptyExtensionDefaults;
type AddedDefaultsFromPrior<TPrior extends ReadonlyArray<unknown>> = TPrior extends readonly [...ReadonlyArray<unknown>, infer TLast] ? NativeComponentRecipeExtensionTypeDetails<TLast> extends {
  readonly defaultVariants: infer TDefaults extends Readonly<Record<string, string | boolean>>;
} ? TDefaults : EmptyExtensionDefaults : EmptyExtensionDefaults;
type MergeVariantMaps<TLeft, TRight> = Simplify<{ readonly [TAxis in keyof TLeft | keyof TRight]: (TAxis extends keyof TLeft ? TLeft[TAxis] : Readonly<Record<never, never>>) & (TAxis extends keyof TRight ? TRight[TAxis] : Readonly<Record<never, never>>) }>;
type MergeDefaultMaps<TLeft extends Readonly<Record<string, string | boolean>>, TRight extends Readonly<Record<string, string | boolean>>> = Simplify<Omit<TLeft, keyof TRight> & TRight>;
type UnionToIntersection<TUnion> = (TUnion extends unknown ? (value: TUnion) => void : never) extends ((value: infer TIntersection) => void) ? TIntersection : Readonly<Record<never, never>>;
type Simplify<T> = { [K in keyof T]: T[K] };
/**
 * Author a separate, immutable extension descriptor. The base recipe remains
 * authoritative; extensions can only use operations declared in its v3 contract.
 */
declare function extendComponentRecipe<const TBase extends NativeComponentRecipeDescriptor & {
  readonly version: 3;
  readonly contract: NativeComponentContract;
}, const TConfig extends NativeComponentRecipeExtensionConfig<TBase>, const TPrior extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor<TBase, any, any, any>> = readonly []>(base: TBase, config: TConfig & ExtensionConfigExactness<TBase, TConfig>, priorExtensions?: TPrior): NativeComponentRecipeExtensionDescriptor<TBase, AddedVariantsOf<TConfig>, MergeVariantMaps<AddedVariantsFromPrior<TPrior>, AddedVariantsOf<TConfig>>, MergeDefaultMaps<AddedDefaultsFromPrior<TPrior>, AddedDefaultsOf<TConfig>>>;
//#endregion
//#region src/native-style.d.ts
type NativeStyle = ImageStyle & TextStyle & ViewStyle;
type NativeStyleComposition<TInput, TStyle = NativePrimitiveReference> = ReadonlyArray<TInput | TStyle | NativeStyleComposition<TInput, TStyle>>;
type NativePrimitiveReference = ImageStyle | TextStyle | ViewStyle;
type NativeSpacingAlias = "paddingInline" | "paddingBlock" | "paddingInlineStart" | "paddingInlineEnd" | "paddingBlockStart" | "paddingBlockEnd" | "marginInline" | "marginBlock" | "marginInlineStart" | "marginInlineEnd" | "marginBlockStart" | "marginBlockEnd";
type NativeInsetAlias = "inset" | "insetInline" | "insetBlock" | "insetInlineStart" | "insetInlineEnd" | "insetBlockStart" | "insetBlockEnd";
type NativeSideBorder = "borderTop" | "borderRight" | "borderBottom" | "borderLeft" | "borderInline" | "borderBlock" | "borderInlineStart" | "borderInlineEnd" | "borderBlockStart" | "borderBlockEnd";
type UnsupportedSideBorderInput = { readonly [K in NativeSideBorder | `${NativeSideBorder}Style`]?: never };
type NativeFlatStyleRule = Omit<StyleRule, "flex" | NativeSpacingAlias | NativeInsetAlias> & Pick<StaticNativeStyleInput<NativeStyle>, "flex" | NativeSpacingAlias | NativeInsetAlias> & UnsupportedSideBorderInput;
type NativeStyleRule = NativeFlatStyleRule | StaticNativeStyleInput<NativeStyle> | NativeStyleComposition<NativeFlatStyleRule | StaticNativeStyleInput<NativeStyle>, NativePrimitiveReference>;
type CompletePrimitiveReference<T> = T extends NativePrimitiveReference ? keyof ViewStyle extends keyof T ? T : keyof ImageStyle extends keyof T ? T : never : never;
type CompositionReferences<T, TSeen = never> = T extends ReadonlyArray<infer TEntry> ? T extends TSeen ? CompletePrimitiveReference<TEntry> : CompositionReferences<TEntry, TSeen | T> : CompletePrimitiveReference<T>;
type NativeStyleResult<T> = NativeStyleRule extends T ? NativeStyle : [CompositionReferences<T>] extends [never] ? NativeStyle : CompositionReferences<T>;
type NativeAuthoringRule = NativeStyleRule | NativePrimitiveReference;
type PrimitiveInlineInput<T> = T extends NativePrimitiveReference ? StaticNativeStyleInput<T> : never;
type PrimitiveKeys<T> = T extends NativePrimitiveReference ? keyof T : never;
type CheckedComposition<T, TReference, TSeen = never> = T extends ReadonlyArray<unknown> ? T extends TSeen ? unknown : { readonly [K in keyof T]: CheckedComposition<T[K], TReference, TSeen | T> } : [CompletePrimitiveReference<T>] extends [never] ? Exclude<keyof T, PrimitiveKeys<TReference>> extends never ? T extends PrimitiveInlineInput<TReference> ? unknown : never : never : unknown;
type CheckedGenericComposition<T, TSeen = never> = T extends ReadonlyArray<unknown> ? T extends TSeen ? unknown : { readonly [K in keyof T]: CheckedGenericComposition<T[K], TSeen | T> } : [CompletePrimitiveReference<T>] extends [never] ? T extends NativeFlatStyleRule | StaticNativeStyleInput<NativeStyle> ? unknown : never : unknown;
type CheckedNativeRule<T> = [CompletePrimitiveReference<T>] extends [never] ? NativeStyleRule extends T ? NativeStyleRule : [CompositionReferences<T>] extends [never] ? NativeStyleRule : keyof NativeStyle extends keyof CompositionReferences<T> ? CheckedGenericComposition<T> : CheckedComposition<T, CompositionReferences<T>> : unknown;
type StaticTransformEntry<TEntry> = TEntry extends unknown ? { readonly [K in keyof TEntry]: TEntry[K] extends ReadonlyArray<unknown> ? number[] : Extract<TEntry[K], string | number> } : never;
type NativeStaticTransform = StaticTransformEntry<Extract<NonNullable<ViewStyle["transform"]>, ReadonlyArray<unknown>>[number]>;
type NativeStyleInput<TStyle> = { readonly [K in keyof TStyle]?: NativeStyleValueInput<TStyle[K], K> } & UnsupportedSideBorderInput;
type StaticNativeStyleInput<TStyle> = Omit<NativeStyleInput<TStyle>, "transform"> & {
  readonly transform?: string | ReadonlyArray<NativeStaticTransform> | undefined;
};
type NativeImageStyleInput = NativeStyleInput<ImageStyle>;
type NativeTextStyleInput = NativeStyleInput<TextStyle>;
type NativeViewStyleInput = NativeStyleInput<ViewStyle>;
type NativeRecipeVariantValue = string | boolean;
type NativeRecipeStyleInput = NativeViewStyleInput | ViewStyle | NativeStyle;
type NativeRecipeVariantsConfig = Readonly<Record<string, Readonly<Record<string, NativeRecipeStyleInput>>>>;
type NativeRecipeVariantSelection<TValues> = keyof TValues extends "false" | "true" ? boolean | keyof TValues : keyof TValues;
type NativeRecipeSelection<TVariants extends NativeRecipeVariantsConfig> = { readonly [K in keyof TVariants]?: NativeRecipeVariantSelection<TVariants[K]> };
type NativeRecipeCompoundVariant<TVariants extends NativeRecipeVariantsConfig> = {
  readonly style: NativeRecipeStyleInput;
  readonly variants: NativeRecipeSelection<TVariants>;
};
type NativeRecipeConfig<TVariants extends NativeRecipeVariantsConfig> = {
  readonly base?: NativeRecipeStyleInput;
  readonly compoundVariants?: ReadonlyArray<NativeRecipeCompoundVariant<TVariants>>;
  readonly defaultVariants?: NativeRecipeSelection<TVariants>;
  readonly variants: TVariants;
};
type NativeRecipe<TVariants extends NativeRecipeVariantsConfig> = {
  readonly $$debugName?: string;
  readonly $$type: typeof NativeRecipeType;
  readonly base?: NativeStyle;
  readonly compoundVariants: ReadonlyArray<{
    readonly style: NativeStyle;
    readonly variants: NativeRecipeSelection<TVariants>;
  }>;
  readonly defaultVariants: NativeRecipeSelection<TVariants>;
  readonly variants: { readonly [K in keyof TVariants]: { readonly [V in keyof TVariants[K]]: NativeStyle } };
};
type NativeRecipeVariants<TRecipe> = TRecipe extends NativeRecipe<infer TVariants> ? TVariants : never;
type NativeRecipeProps<TRecipe> = TRecipe extends NativeRecipe<infer TVariants> ? NativeRecipeSelection<TVariants> : never;
type NativeStyleVariants<TVariants extends object> = { readonly [K in keyof TVariants]: TVariants[K] extends NativeAuthoringRule ? NativeStyleResult<TVariants[K]> : never };
type ColorStyleProperty = "color" | `${string}Color`;
type LengthStyleProperty = "fontSize" | "letterSpacing" | "lineHeight" | "flexBasis" | "width" | "height" | "minWidth" | "minHeight" | "maxWidth" | "maxHeight" | "top" | "right" | "bottom" | "left" | "start" | "end" | "inset" | "insetInline" | "insetBlock" | "insetInlineStart" | "insetInlineEnd" | "insetBlockStart" | "insetBlockEnd" | "padding" | "paddingHorizontal" | "paddingVertical" | "paddingLeft" | "paddingRight" | "paddingTop" | "paddingBottom" | "paddingStart" | "paddingEnd" | "paddingInline" | "paddingBlock" | "paddingInlineStart" | "paddingInlineEnd" | "paddingBlockStart" | "paddingBlockEnd" | "margin" | "marginHorizontal" | "marginVertical" | "marginLeft" | "marginRight" | "marginTop" | "marginBottom" | "marginStart" | "marginEnd" | "marginInline" | "marginBlock" | "marginInlineStart" | "marginInlineEnd" | "marginBlockStart" | "marginBlockEnd" | "borderWidth" | "borderTopWidth" | "borderRightWidth" | "borderBottomWidth" | "borderLeftWidth" | "borderStartWidth" | "borderEndWidth" | "borderInlineWidth" | "borderBlockWidth" | "borderInlineStartWidth" | "borderInlineEndWidth" | "borderBlockStartWidth" | "borderBlockEndWidth" | "borderRadius" | "borderTopLeftRadius" | "borderTopRightRadius" | "borderBottomLeftRadius" | "borderBottomRightRadius" | "borderTopStartRadius" | "borderTopEndRadius" | "borderBottomStartRadius" | "borderBottomEndRadius" | "borderStartStartRadius" | "borderStartEndRadius" | "borderEndStartRadius" | "borderEndEndRadius" | "gap" | "rowGap" | "columnGap" | "outlineOffset" | "outlineWidth";
type OpacityStyleProperty = "opacity" | "shadowOpacity";
type EnumStyleProperty = "display" | "position" | "direction" | "overflow" | "flexDirection" | "flexWrap" | "alignContent" | "alignItems" | "alignSelf" | "justifyContent" | "boxSizing" | "backfaceVisibility" | "cursor" | "borderCurve" | "pointerEvents" | "borderStyle" | "outlineStyle" | "isolation" | "mixBlendMode" | "resizeMode" | "objectFit" | "fontStyle" | "fontWeight" | "textAlign" | "textAlignVertical" | "verticalAlign" | "textDecorationLine" | "textDecorationStyle" | "textTransform" | "writingDirection" | "userSelect";
type NativeStyleTokenDomainForProperty<K extends PropertyKey> = K extends ColorStyleProperty ? Extract<TokenDomain, {
  readonly kind: "color";
}> : K extends LengthStyleProperty ? Extract<TokenDomain, {
  readonly kind: "length";
}> : K extends OpacityStyleProperty ? Extract<TokenDomain, {
  readonly kind: "opacity";
}> : K extends EnumStyleProperty ? Extract<TokenDomain, {
  readonly kind: "enum";
}> : never;
type NativeStyleTokenForProperty<K extends PropertyKey> = LegacyNativeThemeVar | ([NativeStyleTokenDomainForProperty<K>] extends [never] ? never : DomainThemeVar<NativeStyleTokenDomainForProperty<K>>);
type LengthStyleLiteral = number | `${number}%` | "auto";
type NativeStyleValueInput<TValue, TProperty extends PropertyKey = never> = TProperty extends LengthStyleProperty ? Exclude<TValue, string | number> | LengthStyleLiteral | NativeStyleTokenForProperty<TProperty> : Extract<Exclude<TValue, undefined>, string | number> extends never ? TValue : TValue | NativeStyleTokenForProperty<TProperty>;
type LocalPropertyDomain<K extends PropertyKey, V> = NativeStyleTokenDomainForProperty<K> extends {
  readonly kind: "enum";
} ? {
  readonly kind: "enum";
  readonly values: ReadonlyArray<Extract<V, string>>;
} : NativeStyleTokenDomainForProperty<K>;
type LocalPropertyOperand<K extends PropertyKey, V> = [NativeStyleTokenDomainForProperty<K>] extends [never] ? never : (AnyLocalVar & {
  readonly domain: LocalPropertyDomain<K, V>;
}) | (AnyLocalFallback & {
  readonly variables: ReadonlyArray<AnyLocalVar & {
    readonly domain: LocalPropertyDomain<K, V>;
  }>;
});
type LocalStyleInput<S> = { readonly [K in keyof StaticNativeStyleInput<S>]?: StaticNativeStyleInput<S>[K] | LocalPropertyOperand<K, K extends keyof S ? S[K] : never> };
type LocalPrimitiveRule<S> = LocalStyleInput<S> | S | NativeLocalStylePlan<S> | ReadonlyArray<LocalPrimitiveRule<S>>;
type CheckedLocalRule<T, S, Seen = never> = T extends NativeLocalStylePlan<unknown> ? unknown : T extends ReadonlyArray<unknown> ? T extends Seen ? unknown : { readonly [K in keyof T]: CheckedLocalRule<T[K], S, Seen | T> } : [CompletePrimitiveReference<T>] extends [never] ? Exclude<keyof T, keyof LocalStyleInput<S>> extends never ? T extends LocalStyleInput<S> ? unknown : never : never : unknown;
type HasLocal<T, Seen = never> = T extends AnyLocalVar | AnyLocalFallback | NativeLocalStylePlan<unknown> ? true : T extends Seen ? false : T extends ReadonlyArray<infer E> ? HasLocal<E, Seen | T> : T extends object ? { [K in keyof T]: HasLocal<T[K], Seen | T> }[keyof T] : false;
type LocalResult<T, S> = true extends HasLocal<T> ? NativeLocalStylePlan<S> : S;
type LocalReferences<T, Seen = never> = T extends NativeLocalStylePlan<infer S> ? S : T extends ReadonlyArray<infer E> ? T extends Seen ? never : LocalReferences<E, Seen | T> : never;
type GenericLocalResult<T> = LocalResult<T, [LocalReferences<T>] extends [never] ? NativeStyleResult<T> : LocalReferences<T>>;
type GenericLocalRule = LocalStyleInput<NativeStyle> | NativePrimitiveReference | NativeLocalStylePlan<NativePrimitiveReference> | ReadonlyArray<GenericLocalRule>;
type GenericLocalReference<T> = CompositionReferences<T> | LocalReferences<T>;
type CheckedGenericLocal<T> = [GenericLocalReference<T>] extends [never] ? CheckedLocalRule<T, NativeStyle> : CheckedLocalRule<T, GenericLocalReference<T>>;
declare function style<const T extends GenericLocalRule>(rule: T & (true extends HasLocal<T> ? CheckedGenericLocal<T> : never), debugId?: string): GenericLocalResult<T>;
declare function style<const TRule extends NativeAuthoringRule>(rule: TRule & CheckedNativeRule<TRule>, debugId?: string): NativeStyleResult<TRule>;
declare function viewStyle<const T extends LocalPrimitiveRule<ViewStyle>>(rule: T & CheckedLocalRule<T, ViewStyle>, debugId?: string): LocalResult<T, ViewStyle>;
declare function viewStyle(rule: StaticNativeStyleInput<ViewStyle> | NativeStyleComposition<StaticNativeStyleInput<ViewStyle>, ViewStyle>, debugId?: string): ViewStyle;
declare function textStyle<const T extends LocalPrimitiveRule<TextStyle>>(rule: T & CheckedLocalRule<T, TextStyle>, debugId?: string): LocalResult<T, TextStyle>;
declare function textStyle(rule: StaticNativeStyleInput<TextStyle> | NativeStyleComposition<StaticNativeStyleInput<TextStyle>, TextStyle>, debugId?: string): TextStyle;
declare function imageStyle<const T extends LocalPrimitiveRule<ImageStyle>>(rule: T & CheckedLocalRule<T, ImageStyle>, debugId?: string): LocalResult<T, ImageStyle>;
declare function imageStyle(rule: StaticNativeStyleInput<ImageStyle> | NativeStyleComposition<StaticNativeStyleInput<ImageStyle>, ImageStyle>, debugId?: string): ImageStyle;
declare function styleVariants<const V extends Readonly<Record<string, GenericLocalRule>>>(variants: V & (true extends HasLocal<V> ? { readonly [K in keyof V]: CheckedGenericLocal<V[K]> } : never), debugId?: string): { readonly [K in keyof V]: GenericLocalResult<V[K]> };
declare function styleVariants<const TData extends Readonly<Record<string | number, unknown>>, const TStyle extends NativeAuthoringRule>(values: TData, mapper: (value: TData[keyof TData], key: keyof TData) => TStyle, debugId?: string): NativeStyleVariants<{ readonly [K in keyof TData]: TStyle }>;
declare function styleVariants<const TVariants extends Readonly<Record<string, NativeAuthoringRule>>>(variants: TVariants & { readonly [K in keyof TVariants]: CheckedNativeRule<TVariants[K]> }, debugId?: string): NativeStyleVariants<TVariants>;
declare function recipe<TVariants extends NativeRecipeVariantsConfig>(config: NativeRecipeConfig<TVariants>, debugId?: string): NativeRecipe<TVariants>;
//#endregion
export { createSprinkles as $, NativeComponentRecipe as A, NativeComponentStateVariants as B, styleVariants as C, extendComponentRecipe as D, NativeComponentRecipeExtensionConfig as E, NativeComponentResolvedStyles as F, NativeSprinkleDefinition as G, NativeComponentVariantsConfig as H, NativeComponentSlotKind as I, NativeSprinkleShorthandConfig as J, NativeSprinklePropertyConfig as K, NativeComponentSlotStyleInput as L, NativeComponentRecipeDescriptor as M, NativeComponentRecipeProps as N, NativeComponentCompoundVariant as O, NativeComponentResolvedSlotStyles as P, NativeSprinklesSelection as Q, NativeComponentSlotStyles as R, style as S, viewStyle as T, componentRecipe as U, NativeComponentVariantSelection as V, componentRecipeFromRecipe as W, NativeSprinklesConfig as X, NativeSprinkleStaticResult as Y, NativeSprinklesLookupPlan as Z, NativeStyleVariants as _, NativeComponentContractIdentity as _t, NativeRecipeProps as a, NativeComponentRecipeExtensionPlan as at, imageStyle as b, NativeRecipeVariantSelection as c, NativeComponentRecipeExtensionVersion as ct, NativeRecipeVariantsConfig as d, NativeRecipeClassType as dt, createSprinklesLookupPlan as et, NativeStyle as f, NativeRecipeType as ft, NativeStyleTokenDomainForProperty as g, NativeComponentContractExtensionPoints as gt, NativeStyleRule as h, NativeComponentContract as ht, NativeRecipeConfig as i, NativeComponentRecipeExtensionDescriptor as it, NativeComponentRecipeConfig as j, NativeComponentPublicProps as k, NativeRecipeVariantValue as l, NativeComponentRecipeType as lt, NativeStyleInput as m, NativeSprinklesLookupPlanVersion as mt, NativeRecipe as n, createVar as nt, NativeRecipeSelection as o, NativeComponentRecipeContractVersion as ot, NativeStyleComposition as p, NativeSprinklesLookupPlanType as pt, NativeSprinklePropertyKey as q, NativeRecipeCompoundVariant as r, fallbackVar as rt, NativeRecipeStyleInput as s, NativeComponentRecipeExtensionType as st, NativeImageStyleInput as t, defineProperties as tt, NativeRecipeVariants as u, NativeComponentRecipeVersion as ut, NativeTextStyleInput as v, textStyle as w, recipe as x, NativeViewStyleInput as y, NativeComponentSlots as z };