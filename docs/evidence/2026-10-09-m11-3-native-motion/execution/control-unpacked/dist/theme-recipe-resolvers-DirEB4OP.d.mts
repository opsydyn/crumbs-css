import { F as NativeComponentResolvedStyles, M as NativeComponentRecipeDescriptor, N as NativeComponentRecipeProps, P as NativeComponentResolvedSlotStyles, at as NativeComponentRecipeExtensionPlan, d as NativeRecipeVariantsConfig, f as NativeStyle, it as NativeComponentRecipeExtensionDescriptor, k as NativeComponentPublicProps, n as NativeRecipe, o as NativeRecipeSelection, z as NativeComponentSlots } from "./native-style-minqF-Hg.mjs";
import { a as RecipeResolverCacheStats, r as RecipeResolutionPlan } from "./recipe-resolution-plan-S4Cw0UfI.mjs";

//#region src/runtime/component-recipe-resolution-plan.d.ts
declare const ComponentRecipeResolutionPlanType: "crumbs.css.component-recipe-resolution-plan";
declare const ComponentRecipeResolutionPlanVersion: 1;
type ComponentSlotRecord = NativeComponentResolvedSlotStyles<NativeComponentSlots>;
type ComponentRecipeStateConstraint = {
  readonly discriminator: string;
  readonly cases: ReadonlyArray<{
    readonly value: string;
    readonly constraints: ReadonlyArray<readonly [string, ReadonlyArray<string | boolean>]>;
  }>;
};
type ComponentRecipeResolutionVariant = {
  readonly name: string;
  readonly values: Readonly<Record<string, ComponentSlotRecord>>;
};
type ComponentRecipeCompoundMatcher = {
  readonly requirements: ReadonlyArray<readonly [string, unknown]>;
  readonly matches: (selection: Readonly<Record<string, unknown>>) => boolean;
  readonly styles: ComponentSlotRecord;
};
type ComponentRecipeResolutionPlanOptions<TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor> = ReadonlyArray<NativeComponentRecipeExtensionDescriptor>> = {
  readonly extensions?: TExtensions;
};
type ComponentRecipeResolutionPlan<TRecipe extends NativeComponentRecipeDescriptor = NativeComponentRecipeDescriptor> = {
  readonly $$type: typeof ComponentRecipeResolutionPlanType;
  readonly version: typeof ComponentRecipeResolutionPlanVersion;
  readonly recipe: TRecipe;
  readonly slotOrder: ReadonlyArray<string>;
  readonly variantOrder: ReadonlyArray<string>;
  readonly selectionKeys: ReadonlyArray<string>;
  readonly defaultSelection: Readonly<Record<string, unknown>>;
  readonly base: ComponentSlotRecord;
  readonly variants: ReadonlyArray<ComponentRecipeResolutionVariant>;
  readonly compoundMatchers: ReadonlyArray<ComponentRecipeCompoundMatcher>;
  readonly stateConstraint?: ComponentRecipeStateConstraint;
  readonly extensionPlan?: NativeComponentRecipeExtensionPlan;
};
type ComponentRecipeInvalidVariantReporter = (variantName: string, selectedValue: unknown, variantValues: ComponentSlotRecordMap) => void;
type ComponentRecipeInvalidStateReporter = (discriminator: string, selection: Readonly<Record<string, unknown>>, constraint: ComponentRecipeStateConstraint) => void;
type ComponentSlotRecordMap = Readonly<Record<string, ComponentSlotRecord>>;
/** Build one shared plan for all slots without expanding variant products. */
declare function createComponentRecipeResolutionPlan<TRecipe extends NativeComponentRecipeDescriptor, TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor> = ReadonlyArray<NativeComponentRecipeExtensionDescriptor>>(recipe: TRecipe, options?: ComponentRecipeResolutionPlanOptions<TExtensions>): ComponentRecipeResolutionPlan<TRecipe>;
declare function resolveComponentRecipeResolutionPlan<TRecipe extends NativeComponentRecipeDescriptor>(plan: ComponentRecipeResolutionPlan<TRecipe>, selection?: Readonly<Record<string, unknown>>, reportInvalidVariant?: ComponentRecipeInvalidVariantReporter, reportInvalidState?: ComponentRecipeInvalidStateReporter): NativeComponentResolvedStyles<TRecipe["slots"]>;
//#endregion
//#region src/runtime/theme-recipe-resolvers.d.ts
type ComponentRecipeDescriptor = NativeComponentRecipeDescriptor;
type LastComponentRecipeExtension<TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor>> = TExtensions extends readonly [...ReadonlyArray<unknown>, infer TLast] ? TLast : never;
type ComponentRecipeSelectionForExtensions<TRecipe extends ComponentRecipeDescriptor, TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor>> = TExtensions extends readonly [NativeComponentRecipeExtensionDescriptor, ...ReadonlyArray<NativeComponentRecipeExtensionDescriptor>] ? NativeComponentPublicProps<LastComponentRecipeExtension<TExtensions>> : NativeComponentRecipeProps<TRecipe>;
type NativeRecipeResolver<TVariants extends NativeRecipeVariantsConfig> = (selection?: NativeRecipeSelection<TVariants>) => ReadonlyArray<NativeStyle>;
type RecipeResolverOptions = {
  /** Maximum number of canonical selections retained by this resolver. Zero disables selection caching. */readonly cacheSize?: number;
};
type RecipeResolverControls = {
  readonly plan: RecipeResolutionPlan;
  readonly getCacheStats: () => RecipeResolverCacheStats & {
    readonly disposed: boolean;
  };
  readonly clearCache: () => void;
  readonly dispose: () => void;
};
type BoundedNativeRecipeResolver<TVariants extends NativeRecipeVariantsConfig> = NativeRecipeResolver<TVariants> & RecipeResolverControls;
type NativeComponentRecipeResolver<TRecipe extends ComponentRecipeDescriptor, TSelection = NativeComponentRecipeProps<TRecipe>> = (selection?: TSelection) => NativeComponentResolvedStyles<TRecipe["slots"]>;
type ComponentRecipeResolverOptions<TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor> = ReadonlyArray<NativeComponentRecipeExtensionDescriptor>> = RecipeResolverOptions & ComponentRecipeResolutionPlanOptions<TExtensions>;
type ComponentRecipeResolverControls<TRecipe extends ComponentRecipeDescriptor> = {
  readonly plan: ComponentRecipeResolutionPlan<TRecipe>;
  readonly getCacheStats: () => RecipeResolverCacheStats & {
    readonly disposed: boolean;
  };
  readonly clearCache: () => void;
  readonly dispose: () => void;
};
type BoundedNativeComponentRecipeResolver<TRecipe extends ComponentRecipeDescriptor, TSelection = NativeComponentRecipeProps<TRecipe>> = NativeComponentRecipeResolver<TRecipe, TSelection> & ComponentRecipeResolverControls<TRecipe>;
declare function resolveRecipeStyle<TVariants extends NativeRecipeVariantsConfig>(recipe: NativeRecipe<TVariants>, selection?: NativeRecipeSelection<TVariants>): ReadonlyArray<NativeStyle>;
declare function createRecipeResolver<TVariants extends NativeRecipeVariantsConfig>(recipe: NativeRecipe<TVariants>, options?: RecipeResolverOptions): BoundedNativeRecipeResolver<TVariants>;
declare function resolveComponentRecipeStyles<TRecipe extends ComponentRecipeDescriptor, const TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor> = readonly []>(recipe: TRecipe, selection?: ComponentRecipeSelectionForExtensions<TRecipe, TExtensions>, options?: ComponentRecipeResolutionPlanOptions<TExtensions>): NativeComponentResolvedStyles<TRecipe["slots"]>;
declare function createComponentRecipeResolver<TRecipe extends ComponentRecipeDescriptor, const TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor> = readonly []>(recipe: TRecipe, options?: ComponentRecipeResolverOptions<TExtensions>): BoundedNativeComponentRecipeResolver<TRecipe, ComponentRecipeSelectionForExtensions<TRecipe, TExtensions>>;
//#endregion
export { createComponentRecipeResolutionPlan as _, NativeComponentRecipeResolver as a, RecipeResolverOptions as c, resolveComponentRecipeStyles as d, resolveRecipeStyle as f, ComponentRecipeResolutionVariant as g, ComponentRecipeResolutionPlan as h, ComponentRecipeResolverOptions as i, createComponentRecipeResolver as l, ComponentRecipeInvalidVariantReporter as m, BoundedNativeRecipeResolver as n, NativeRecipeResolver as o, ComponentRecipeCompoundMatcher as p, ComponentRecipeResolverControls as r, RecipeResolverControls as s, BoundedNativeComponentRecipeResolver as t, createRecipeResolver as u, resolveComponentRecipeResolutionPlan as v };