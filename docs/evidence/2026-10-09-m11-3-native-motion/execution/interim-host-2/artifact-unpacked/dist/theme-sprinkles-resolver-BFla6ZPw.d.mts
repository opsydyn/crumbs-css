import { f as NativePrimitiveDomain, p as NativePrimitiveKind } from "./model-DAuWjF1q.mjs";
import { Q as NativeSprinklesSelection, Z as NativeSprinklesLookupPlan, f as NativeStyle, mt as NativeSprinklesLookupPlanVersion, pt as NativeSprinklesLookupPlanType } from "./native-style-minqF-Hg.mjs";
import { a as RecipeResolverCacheStats } from "./recipe-resolution-plan-S4Cw0UfI.mjs";

//#region src/runtime/sprinkles-resolution-plan.d.ts
type NativeSprinklesResolutionPlan<TProperties extends object = object, TShorthands extends Readonly<Record<string, readonly string[]>> = Readonly<Record<string, readonly string[]>>> = {
  readonly $$type: typeof NativeSprinklesLookupPlanType;
  readonly version: typeof NativeSprinklesLookupPlanVersion;
  readonly primitives: readonly [NativePrimitiveKind, ...NativePrimitiveKind[]];
  readonly properties: Readonly<Record<string, Readonly<Record<string, NativeStyle>>>>;
  readonly shorthands: Readonly<Record<string, readonly string[]>>;
  readonly selectionKeys: ReadonlyArray<keyof TProperties | keyof TShorthands>;
};
type NativeSprinklesResolutionSelection<TProperties extends object, TShorthands extends Readonly<Record<string, readonly string[]>>> = NativeSprinklesSelection<TProperties, TShorthands>;
//#endregion
//#region src/runtime/theme-sprinkles-resolver.d.ts
type NativeSprinklesResolver<TProperties extends object, TShorthands extends Readonly<Record<string, readonly string[]>>> = (selection?: NativeSprinklesSelection<TProperties, TShorthands>) => ReadonlyArray<NativeStyle>;
type SprinklesResolverOptions = {
  /** Maximum number of canonical selections retained by this resolver. Zero disables selection caching. */readonly cacheSize?: number;
};
type SprinklesResolverControls<TProperties extends object, TShorthands extends Readonly<Record<string, readonly string[]>>> = {
  readonly plan: NativeSprinklesResolutionPlan<TProperties, TShorthands>;
  readonly getCacheStats: () => RecipeResolverCacheStats & {
    readonly disposed: boolean;
  };
  readonly clearCache: () => void;
  readonly dispose: () => void;
};
type BoundedNativeSprinklesResolver<TProperties extends object, TShorthands extends Readonly<Record<string, readonly string[]>>> = NativeSprinklesResolver<TProperties, TShorthands> & SprinklesResolverControls<TProperties, TShorthands>;
/**
 * Create a bounded runtime selector for a generated Sprinkles lookup plan.
 * Static utility authoring stays in `createSprinkles`; this resolver only
 * selects already-compiled atomic references and preserves authored order.
 */
declare function createSprinklesResolver<TPrimitives extends NativePrimitiveDomain, TProperties extends object, TShorthands extends Readonly<Record<string, readonly string[]>>>(lookup: NativeSprinklesLookupPlan<TPrimitives, TProperties, TShorthands>, options?: SprinklesResolverOptions): BoundedNativeSprinklesResolver<TProperties, TShorthands>;
//#endregion
export { createSprinklesResolver as a, SprinklesResolverOptions as i, NativeSprinklesResolver as n, NativeSprinklesResolutionPlan as o, SprinklesResolverControls as r, NativeSprinklesResolutionSelection as s, BoundedNativeSprinklesResolver as t };