import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode } from "../diagnostics"
import type {
  NativeComponentPublicProps,
  NativeComponentRecipeProps,
  NativeComponentResolvedStyles,
  NativeRecipe,
  NativeRecipeSelection,
  NativeRecipeVariantsConfig,
  NativeStyle,
} from "../native-style"
import type { NativeComponentRecipeDescriptor } from "../components"
import type { NativeComponentRecipeExtensionDescriptor } from "../components/extension-contract"
import {
  canonicalRecipeSelectionKey,
  createBoundedRecipeSelectionCache,
  createRecipeResolutionPlan,
  DEFAULT_RECIPE_RESOLVER_CACHE_SIZE,
  resolveRecipeResolutionPlan,
  validateRecipeResolverCacheSize,
  type RecipeResolutionPlan,
  type RecipeResolverCacheStats,
} from "./recipe-resolution-plan"
import {
  createComponentRecipeResolutionPlan,
  resolveComponentRecipeResolutionPlan,
  validateComponentRecipeExtensionSelection,
  type ComponentRecipeResolutionPlan,
  type ComponentRecipeResolutionPlanOptions,
  type ComponentRecipeStateConstraint,
} from "./component-recipe-resolution-plan"

const recipeDiagnosticWarnings = new Set<string>()

type RecipeDiagnosticTarget = {
  readonly $$debugName?: string
  readonly variants?: unknown
}
type ComponentRecipeDiagnosticTarget = {
  readonly $$debugName?: string
  readonly variants?: unknown
}
type ComponentRecipeDescriptor = NativeComponentRecipeDescriptor

type LastComponentRecipeExtension<TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor>> =
  TExtensions extends readonly [...ReadonlyArray<unknown>, infer TLast] ? TLast : never
type ComponentRecipeSelectionForExtensions<
  TRecipe extends ComponentRecipeDescriptor,
  TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor>,
> = TExtensions extends readonly [NativeComponentRecipeExtensionDescriptor, ...ReadonlyArray<NativeComponentRecipeExtensionDescriptor>]
  ? NativeComponentPublicProps<LastComponentRecipeExtension<TExtensions>>
  : NativeComponentRecipeProps<TRecipe>

export type NativeRecipeResolver<TVariants extends NativeRecipeVariantsConfig> = (
  selection?: NativeRecipeSelection<TVariants>,
) => ReadonlyArray<NativeStyle>

export type RecipeResolverOptions = {
  /** Maximum number of canonical selections retained by this resolver. Zero disables selection caching. */
  readonly cacheSize?: number
}

export type RecipeResolverControls = {
  readonly plan: RecipeResolutionPlan
  readonly getCacheStats: () => RecipeResolverCacheStats & {readonly disposed: boolean}
  readonly clearCache: () => void
  readonly dispose: () => void
}

export type BoundedNativeRecipeResolver<TVariants extends NativeRecipeVariantsConfig> =
  NativeRecipeResolver<TVariants> & RecipeResolverControls

export type NativeComponentRecipeResolver<
  TRecipe extends ComponentRecipeDescriptor,
  TSelection = NativeComponentRecipeProps<TRecipe>,
> = (
  selection?: TSelection,
) => NativeComponentResolvedStyles<TRecipe["slots"]>

export type ComponentRecipeResolverOptions<
  TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor> = ReadonlyArray<NativeComponentRecipeExtensionDescriptor>,
> = RecipeResolverOptions & ComponentRecipeResolutionPlanOptions<TExtensions>

export type ComponentRecipeResolverControls<TRecipe extends ComponentRecipeDescriptor> = {
  readonly plan: ComponentRecipeResolutionPlan<TRecipe>
  readonly getCacheStats: () => RecipeResolverCacheStats & {readonly disposed: boolean}
  readonly clearCache: () => void
  readonly dispose: () => void
}

export type BoundedNativeComponentRecipeResolver<
  TRecipe extends ComponentRecipeDescriptor,
  TSelection = NativeComponentRecipeProps<TRecipe>,
> = NativeComponentRecipeResolver<TRecipe, TSelection> & ComponentRecipeResolverControls<TRecipe>

export function resolveRecipeStyle<TVariants extends NativeRecipeVariantsConfig>(
  recipe: NativeRecipe<TVariants>,
  selection: NativeRecipeSelection<TVariants> = {},
): ReadonlyArray<NativeStyle> {
  warnForPartialRecipePayload(recipe)
  const plan = createRecipeResolutionPlan(recipe)
  return resolveRecipeResolutionPlan(
    plan,
    selection,
    (variantName, selectedValue, variantValues) =>
      warnForInvalidRecipeVariant(recipe, variantName, selectedValue, variantValues),
  )
}

export function createRecipeResolver<TVariants extends NativeRecipeVariantsConfig>(
  recipe: NativeRecipe<TVariants>,
  options: RecipeResolverOptions = {},
): BoundedNativeRecipeResolver<TVariants> {
  const plan = createRecipeResolutionPlan(recipe)
  const cacheSize = validateRecipeResolverCacheSize(
    options.cacheSize ?? DEFAULT_RECIPE_RESOLVER_CACHE_SIZE,
  )
  const cache = createBoundedRecipeSelectionCache<ReadonlyArray<NativeStyle>>(cacheSize)
  let disposed = false

  const resolve = ((selection = {}) => {
    if (disposed) throw new Error("Recipe resolver has been disposed")
    warnForPartialRecipePayload(recipe)
    const key = canonicalRecipeSelectionKey(plan, selection)
    const cached = cache.get(key)
    if (cached.hit) return cached.value

    const resolved = resolveRecipeResolutionPlan(
      plan,
      selection,
      (variantName, selectedValue, variantValues) =>
        warnForInvalidRecipeVariant(recipe, variantName, selectedValue, variantValues),
    )
    cache.set(key, resolved)
    return resolved
  }) as BoundedNativeRecipeResolver<TVariants>

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

export function resolveComponentRecipeStyles<
  TRecipe extends ComponentRecipeDescriptor,
  const TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor> = readonly [],
>(
  recipe: TRecipe,
  selection: ComponentRecipeSelectionForExtensions<TRecipe, TExtensions> =
    {} as ComponentRecipeSelectionForExtensions<TRecipe, TExtensions>,
  options: ComponentRecipeResolutionPlanOptions<TExtensions> = {},
): NativeComponentResolvedStyles<TRecipe["slots"]> {
  warnForPartialComponentRecipePayload(recipe)
  const plan = createComponentRecipeResolutionPlan(recipe, options)
  return resolveComponentRecipeResolutionPlan(
    plan,
    selection as Readonly<Record<string, unknown>>,
    (variantName, selectedValue, variantValues) =>
      warnForInvalidComponentRecipeVariant(recipe, variantName, selectedValue, variantValues),
    (discriminator, normalizedSelection, constraint) =>
      warnForInvalidComponentRecipeState(recipe, discriminator, normalizedSelection, constraint),
  )
}

export function createComponentRecipeResolver<
  TRecipe extends ComponentRecipeDescriptor,
  const TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor> = readonly [],
>(
  recipe: TRecipe,
  options: ComponentRecipeResolverOptions<TExtensions> = {},
): BoundedNativeComponentRecipeResolver<
  TRecipe,
  ComponentRecipeSelectionForExtensions<TRecipe, TExtensions>
> {
  const plan = createComponentRecipeResolutionPlan(recipe, options)
  const cacheSize = validateRecipeResolverCacheSize(
    options.cacheSize ?? DEFAULT_RECIPE_RESOLVER_CACHE_SIZE,
  )
  const cache = createBoundedRecipeSelectionCache<NativeComponentResolvedStyles<TRecipe["slots"]>>(cacheSize)
  let disposed = false

  const resolve = ((selection: ComponentRecipeSelectionForExtensions<TRecipe, TExtensions> =
    {} as ComponentRecipeSelectionForExtensions<TRecipe, TExtensions>) => {
    if (disposed) throw new Error("Component recipe resolver has been disposed")
    warnForPartialComponentRecipePayload(recipe)
    const normalizedSelection = selection as Readonly<Record<string, unknown>>
    validateComponentRecipeExtensionSelection(plan, normalizedSelection)
    const key = canonicalRecipeSelectionKey(plan, normalizedSelection)
    const cached = cache.get(key)
    if (cached.hit) return cached.value

    const resolved = resolveComponentRecipeResolutionPlan(
      plan,
      normalizedSelection,
      (variantName, selectedValue, variantValues) =>
        warnForInvalidComponentRecipeVariant(recipe, variantName, selectedValue, variantValues),
      (discriminator, normalizedStateSelection, constraint) =>
        warnForInvalidComponentRecipeState(recipe, discriminator, normalizedStateSelection, constraint),
    )
    cache.set(key, resolved)
    return resolved
  }) as BoundedNativeComponentRecipeResolver<TRecipe>

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

function warnForPartialRecipePayload(
  recipe: NativeRecipe<NativeRecipeVariantsConfig> | RecipeDiagnosticTarget,
): void {
  if (recipe.variants !== undefined) return
  warnOnce(
    `missing-variants:${recipeDiagnosticName(recipe)}`,
    formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.PartialRecipePayload,
      `Invalid native recipe "${recipeDiagnosticName(recipe)}": missing variants map; using base fallback. This can happen when Metro serves stale transformed output.`,
    ),
  )
}

function warnForPartialComponentRecipePayload(
  recipe: ComponentRecipeDiagnosticTarget,
): void {
  if (recipe.variants !== undefined) return
  const name = componentRecipeDiagnosticName(recipe)
  warnOnce(
    `missing-component-variants:${name}`,
    formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.PartialRecipePayload,
      `Invalid native component recipe "${name}": missing variants map; using base fallback. This can happen when Metro serves stale transformed output.`,
    ),
  )
}

function warnForInvalidComponentRecipeVariant(
  recipe: ComponentRecipeDiagnosticTarget,
  variantName: string,
  selectedValue: unknown,
  variantValues: Readonly<Record<string, unknown>> | undefined,
): void {
  const supportedValues = Object.keys(variantValues ?? {}).join(", ") || "(none)"
  const name = componentRecipeDiagnosticName(recipe)
  warnOnce(
    `invalid-component-variant:${name}:${variantName}:${String(selectedValue)}`,
    formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.InvalidRecipeVariant,
      `Invalid native component recipe "${name}": variant "${variantName}" does not define value "${String(selectedValue)}"; supported values: ${supportedValues}.`,
    ),
  )
}

function warnForInvalidComponentRecipeState(
  recipe: ComponentRecipeDiagnosticTarget,
  discriminator: string,
  selection: Readonly<Record<string, unknown>>,
  constraint: ComponentRecipeStateConstraint,
): void {
  const name = componentRecipeDiagnosticName(recipe)
  const keys = Object.keys(selection).sort((left, right) => left.localeCompare(right))
  const selectionKey = keys.map((key) => `${key.length}:${key}=${componentDiagnosticValue(selection[key])}`).join("|")
  const describedSelection = keys.map((key) => `${JSON.stringify(key)}: ${componentDiagnosticValue(selection[key])}`).join(", ")
  const supportedCases = constraint.cases.map(({value, constraints}) => {
    const requirements = constraints.map(([axis, values]) =>
      `${axis}: ${values.map(value => JSON.stringify(value)).join(" | ")}`,
    ).join(", ")
    return requirements === "" ? JSON.stringify(value) : `${JSON.stringify(value)} (${requirements})`
  }).join("; ")
  warnOnce(
    `invalid-component-state:${name}:${discriminator}:${selectionKey}`,
    formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.InvalidRecipeVariant,
      `Invalid native component recipe "${name}": state "${discriminator}" rejects normalized selection {${describedSelection}}; supported states: ${supportedCases}.`,
    ),
  )
}

function componentDiagnosticValue(value: unknown): string {
  if (value === null) return "null"
  switch (typeof value) {
    case "undefined": return "undefined"
    case "boolean": return String(value)
    case "string": return JSON.stringify(value)
    case "number": return Number.isNaN(value) ? "NaN" : String(value)
    case "bigint": return `${String(value)}n`
    case "symbol": return String(value)
    case "function": return "[function]"
    case "object": return "[object]"
  }
  return "[unknown]"
}

function componentRecipeDiagnosticName(recipe: ComponentRecipeDiagnosticTarget): string {
  return recipe.$$debugName ?? "anonymous"
}

function warnForInvalidRecipeVariant(
  recipe: RecipeDiagnosticTarget,
  variantName: string,
  selectedValue: unknown,
  variantValues: Readonly<Record<string, NativeStyle>> | undefined,
): void {
  const supportedValues = Object.keys(variantValues ?? {}).join(", ") || "(none)"
  warnOnce(
    `invalid-variant:${recipeDiagnosticName(recipe)}:${variantName}:${String(selectedValue)}`,
    formatNativeStylesDiagnostic(
      NativeStylesDiagnosticCode.InvalidRecipeVariant,
      `Invalid native recipe "${recipeDiagnosticName(recipe)}": variant "${variantName}" does not define value "${String(selectedValue)}"; supported values: ${supportedValues}.`,
    ),
  )
}

function recipeDiagnosticName(recipe: RecipeDiagnosticTarget): string {
  return recipe.$$debugName ?? "anonymous"
}

function warnOnce(key: string, message: string): void {
  if (!shouldWarnInDev() || recipeDiagnosticWarnings.has(key)) return
  recipeDiagnosticWarnings.add(key)
  console.warn(message)
}

function shouldWarnInDev(): boolean {
  const nativeDev = (globalThis as { readonly __DEV__?: boolean }).__DEV__
  if (nativeDev !== undefined) return nativeDev
  if (typeof process === "undefined") return true
  return process.env.NODE_ENV !== "production"
}
