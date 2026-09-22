// ADR D6 / M0.7: shared runtime tags must not import authoring or compiler code.
export const NativeRecipeType = "crumbs.css.recipe" as const
export const NativeRecipeClassType = "crumbs.css.class" as const
export const NativeComponentRecipeType = "crumbs.css.component-recipe" as const
export const NativeComponentRecipeVersion = 1 as const
export const NativeSprinklesLookupPlanType = "crumbs.css.sprinkles-lookup-plan" as const
export const NativeSprinklesLookupPlanVersion = 1 as const
