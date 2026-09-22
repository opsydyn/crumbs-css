import type {
  NativeStyle,
} from "../native-style"

export const RecipeResolutionPlanType = "crumbs.css.recipe-resolution-plan" as const
export const RecipeResolutionPlanVersion = 1 as const
export const DEFAULT_RECIPE_RESOLVER_CACHE_SIZE = 32
export const MAX_RECIPE_RESOLVER_CACHE_SIZE = 1024

export type RecipeResolutionPlan = {
  readonly $$type: typeof RecipeResolutionPlanType
  readonly version: typeof RecipeResolutionPlanVersion
  readonly recipe: RecipeResolutionInput
  readonly variantOrder: ReadonlyArray<string>
  readonly selectionKeys: ReadonlyArray<string>
  readonly defaultSelection: Readonly<Record<string, unknown>>
  readonly variants: ReadonlyArray<RecipeResolutionVariant>
  readonly compoundMatchers: ReadonlyArray<RecipeCompoundMatcher>
}

export type RecipeResolutionInput = {
  readonly $$type: string
  readonly $$debugName?: string
  readonly base?: NativeStyle
  readonly defaultVariants?: Readonly<Record<string, unknown>>
  readonly variants?: Readonly<Record<string, Readonly<Record<string, NativeStyle>>>>
  readonly compoundVariants?: ReadonlyArray<{
    readonly style: NativeStyle
    readonly variants: Readonly<Record<string, unknown>>
  }>
}

export type RecipeResolutionVariant = {
  readonly name: string
  readonly values: Readonly<Record<string, NativeStyle>>
}

export type RecipeCompoundMatcher = {
  readonly requirements: ReadonlyArray<readonly [string, unknown]>
  readonly matches: (selection: Readonly<Record<string, unknown>>) => boolean
  readonly style: NativeStyle
}

export type RecipeInvalidVariantReporter = (
  variantName: string,
  selectedValue: unknown,
  variantValues: Readonly<Record<string, NativeStyle>>,
) => void

export type RecipeResolverCacheStats = {
  readonly capacity: number
  readonly size: number
  readonly hits: number
  readonly misses: number
  readonly evictions: number
}

type RecipeCacheLookup<T> =
  | {readonly hit: false}
  | {readonly hit: true; readonly value: T}

export function createRecipeResolutionPlan(
  recipe: RecipeResolutionInput,
): RecipeResolutionPlan {
  const variants = Object.entries(recipe.variants ?? {}).map(([name, values]) => ({
    name,
    values: Object.freeze({...values}) as Readonly<Record<string, NativeStyle>>,
  }))
  const variantOrder = variants.map(({name}) => name)
  const defaultSelection = Object.freeze({...recipe.defaultVariants}) as Readonly<Record<string, unknown>>
  const compoundMatchers = (recipe.compoundVariants ?? []).map((compoundVariant) => {
    const requirements = Object.freeze(
      Object.entries(compoundVariant.variants ?? {}) as Array<readonly [string, unknown]>,
    )
    return {
      requirements,
      matches: (selection: Readonly<Record<string, unknown>>) =>
        requirements.every(([name, value]) => selection[name] === value),
      style: compoundVariant.style,
    }
  })

  const selectionKeySet = new Set<string>([
    ...variantOrder,
    ...Object.keys(defaultSelection),
    ...compoundMatchers.flatMap(({requirements}) => requirements.map(([name]) => name)),
  ])
  const selectionKeys = [
    ...variantOrder,
    ...[...selectionKeySet]
      .filter((name) => !variantOrder.includes(name))
      .sort((left, right) => left.localeCompare(right)),
  ]

  return Object.freeze({
    $$type: RecipeResolutionPlanType,
    version: RecipeResolutionPlanVersion,
    recipe,
    variantOrder: Object.freeze(variantOrder),
    selectionKeys: Object.freeze(selectionKeys),
    defaultSelection,
    variants: Object.freeze(variants.map((variant) => Object.freeze(variant))),
    compoundMatchers: Object.freeze(compoundMatchers.map((matcher) => Object.freeze(matcher))),
  })
}

export function resolveRecipeResolutionPlan(
  plan: RecipeResolutionPlan,
  selection: Readonly<Record<string, unknown>> = {},
  reportInvalidVariant?: RecipeInvalidVariantReporter,
): ReadonlyArray<NativeStyle> {
  const selected = {...plan.defaultSelection, ...selection}
  const styles: Array<NativeStyle> = []
  if (plan.recipe.base !== undefined) styles.push(plan.recipe.base)

  for (const variant of plan.variants) {
    const selectedValue = selected[variant.name]
    if (selectedValue === undefined) continue
    const valueName = String(selectedValue)
    if (!Object.prototype.hasOwnProperty.call(variant.values, valueName)) {
      reportInvalidVariant?.(variant.name, selectedValue, variant.values)
      continue
    }
    styles.push(variant.values[valueName]!)
  }

  for (const compound of plan.compoundMatchers) {
    if (compound.matches(selected)) {
      styles.push(compound.style)
    }
  }

  return Object.freeze(styles)
}

export function canonicalRecipeSelectionKey(
  plan: Pick<RecipeResolutionPlan, "selectionKeys" | "defaultSelection">,
  selection: Readonly<Record<string, unknown>> = {},
): string {
  const selected = {...plan.defaultSelection, ...selection}
  return plan.selectionKeys.map((name) => {
    const hasValue = Object.prototype.hasOwnProperty.call(selected, name)
    return `${name.length}:${name}=${hasValue ? encodeRecipeSelectionValue(selected[name]) : "missing"}`
  }).join("|")
}

export function createBoundedRecipeSelectionCache<T>(capacity: number) {
  const entries = new Map<string, T>()
  let hits = 0
  let misses = 0
  let evictions = 0

  return {
    get(key: string): RecipeCacheLookup<T> {
      if (!entries.has(key)) {
        misses += 1
        return {hit: false}
      }
      const value = entries.get(key)!
      entries.delete(key)
      entries.set(key, value)
      hits += 1
      return {hit: true, value}
    },
    set(key: string, value: T): void {
      if (capacity === 0) return
      if (entries.has(key)) entries.delete(key)
      else if (entries.size >= capacity) {
        const oldest = entries.keys().next().value
        if (oldest !== undefined) entries.delete(oldest)
        evictions += 1
      }
      entries.set(key, value)
    },
    clear(): void {
      entries.clear()
    },
    stats(): RecipeResolverCacheStats {
      return Object.freeze({
        capacity,
        size: entries.size,
        hits,
        misses,
        evictions,
      })
    },
  }
}

export function validateRecipeResolverCacheSize(cacheSize: number): number {
  if (!Number.isFinite(cacheSize) || !Number.isInteger(cacheSize)) {
    throw new RangeError("Recipe resolver cacheSize must be a finite integer")
  }
  if (cacheSize < 0 || cacheSize > MAX_RECIPE_RESOLVER_CACHE_SIZE) {
    throw new RangeError(
      `Recipe resolver cacheSize must be between 0 and ${MAX_RECIPE_RESOLVER_CACHE_SIZE}`,
    )
  }
  return cacheSize
}

function encodeRecipeSelectionValue(value: unknown): string {
  switch (typeof value) {
    case "undefined": return "u"
    case "boolean": return value ? "b1" : "b0"
    case "string": return `s${value.length}:${value}`
    case "number": {
      if (Number.isNaN(value)) return "n:NaN"
      if (Object.is(value, -0)) return "n:-0"
      return `n:${String(value)}`
    }
    case "bigint": return `i:${String(value)}`
    case "symbol": return `y:${String(value)}`
    default: return `o:${String(value)}`
  }
}
