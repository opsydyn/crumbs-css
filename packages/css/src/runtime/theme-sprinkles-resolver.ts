import type { NativePrimitiveDomain } from "../compiler/native-capture"
import type {
  NativeSprinklesLookupPlan,
  NativeSprinklesSelection,
  NativeStyle,
} from "../native-style"
import {
  createBoundedRecipeSelectionCache,
  DEFAULT_RECIPE_RESOLVER_CACHE_SIZE,
  validateRecipeResolverCacheSize,
  type RecipeResolverCacheStats,
} from "./recipe-resolution-plan"
import {
  canonicalSprinklesSelectionKey,
  createSprinklesResolutionPlan,
  resolveSprinklesLookupPlan,
  validateSprinklesSelection,
  type NativeSprinklesResolutionPlan,
  type NativeSprinklesResolutionSelection,
} from "./sprinkles-resolution-plan"

export type NativeSprinklesResolver<
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
> = (
  selection?: NativeSprinklesSelection<TProperties, TShorthands>,
) => ReadonlyArray<NativeStyle>

export type SprinklesResolverOptions = {
  /** Maximum number of canonical selections retained by this resolver. Zero disables selection caching. */
  readonly cacheSize?: number
}

export type SprinklesResolverControls<
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
> = {
  readonly plan: NativeSprinklesResolutionPlan<TProperties, TShorthands>
  readonly getCacheStats: () => RecipeResolverCacheStats & {readonly disposed: boolean}
  readonly clearCache: () => void
  readonly dispose: () => void
}

export type BoundedNativeSprinklesResolver<
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
> = NativeSprinklesResolver<TProperties, TShorthands> &
  SprinklesResolverControls<TProperties, TShorthands>

/**
 * Create a bounded runtime selector for a generated Sprinkles lookup plan.
 * Static utility authoring stays in `createSprinkles`; this resolver only
 * selects already-compiled atomic references and preserves authored order.
 */
export function createSprinklesResolver<
  TPrimitives extends NativePrimitiveDomain,
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
>(
  lookup: NativeSprinklesLookupPlan<TPrimitives, TProperties, TShorthands>,
  options: SprinklesResolverOptions = {},
): BoundedNativeSprinklesResolver<TProperties, TShorthands> {
  const plan = createSprinklesResolutionPlan(lookup)
  const cacheSize = validateRecipeResolverCacheSize(
    options.cacheSize ?? DEFAULT_RECIPE_RESOLVER_CACHE_SIZE,
  )
  const cache = createBoundedRecipeSelectionCache<ReadonlyArray<NativeStyle>>(cacheSize)
  let disposed = false

  const resolve = ((selection = {}) => {
    if (disposed) throw new Error("Sprinkles resolver has been disposed")
    validateSprinklesSelection(plan, selection)
    const key = canonicalSprinklesSelectionKey(selection as Readonly<Record<string, unknown>>)
    const cached = cache.get(key)
    if (cached.hit) return cached.value

    const resolved = resolveSprinklesLookupPlan(
      plan,
      selection as NativeSprinklesResolutionSelection<TProperties, TShorthands>,
    )
    cache.set(key, resolved)
    return resolved
  }) as BoundedNativeSprinklesResolver<TProperties, TShorthands>

  Object.defineProperties(resolve, {
    plan: {value: plan, enumerable: true},
    getCacheStats: {
      value: () => Object.freeze({...cache.stats(), disposed}),
      enumerable: true,
    },
    clearCache: {value: () => cache.clear(), enumerable: true},
    dispose: {
      value: () => {
        if (disposed) return
        cache.clear()
        disposed = true
      },
      enumerable: true,
    },
  })
  return resolve
}
