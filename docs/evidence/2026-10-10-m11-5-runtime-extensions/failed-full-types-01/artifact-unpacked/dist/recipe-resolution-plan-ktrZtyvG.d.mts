import { f as NativeStyle } from "./native-style-minqF-Hg.mjs";

//#region src/runtime/recipe-resolution-plan.d.ts
declare const RecipeResolutionPlanType: "crumbs.css.recipe-resolution-plan";
declare const RecipeResolutionPlanVersion: 1;
type RecipeResolutionPlan = {
  readonly $$type: typeof RecipeResolutionPlanType;
  readonly version: typeof RecipeResolutionPlanVersion;
  readonly recipe: RecipeResolutionInput;
  readonly variantOrder: ReadonlyArray<string>;
  readonly selectionKeys: ReadonlyArray<string>;
  readonly defaultSelection: Readonly<Record<string, unknown>>;
  readonly variants: ReadonlyArray<RecipeResolutionVariant>;
  readonly compoundMatchers: ReadonlyArray<RecipeCompoundMatcher>;
};
type RecipeResolutionInput = {
  readonly $$type: string;
  readonly $$debugName?: string;
  readonly base?: NativeStyle;
  readonly defaultVariants?: Readonly<Record<string, unknown>>;
  readonly variants?: Readonly<Record<string, Readonly<Record<string, NativeStyle>>>>;
  readonly compoundVariants?: ReadonlyArray<{
    readonly style: NativeStyle;
    readonly variants: Readonly<Record<string, unknown>>;
  }>;
};
type RecipeResolutionVariant = {
  readonly name: string;
  readonly values: Readonly<Record<string, NativeStyle>>;
};
type RecipeCompoundMatcher = {
  readonly requirements: ReadonlyArray<readonly [string, unknown]>;
  readonly matches: (selection: Readonly<Record<string, unknown>>) => boolean;
  readonly style: NativeStyle;
};
type RecipeResolverCacheStats = {
  readonly capacity: number;
  readonly size: number;
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
};
//#endregion
export { RecipeResolverCacheStats as a, RecipeResolutionVariant as i, RecipeResolutionInput as n, RecipeResolutionPlan as r, RecipeCompoundMatcher as t };