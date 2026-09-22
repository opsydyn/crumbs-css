import type {
  NativeComponentRecipeDescriptor,
  NativeComponentResolvedSlotStyles,
  NativeComponentResolvedStyles,
  NativeComponentSlots,
} from "../components"
import type {NativeStyle} from "../native-style"
import {NativeComponentRecipeType, NativeComponentRecipeVersion} from "../native-tags"

export const ComponentRecipeResolutionPlanType = "crumbs.css.component-recipe-resolution-plan" as const
export const ComponentRecipeResolutionPlanVersion = 1 as const

type ComponentSlotRecord = NativeComponentResolvedSlotStyles<NativeComponentSlots>

export type ComponentRecipeResolutionVariant = {
  readonly name: string
  readonly values: Readonly<Record<string, ComponentSlotRecord>>
}

export type ComponentRecipeCompoundMatcher = {
  readonly requirements: ReadonlyArray<readonly [string, unknown]>
  readonly matches: (selection: Readonly<Record<string, unknown>>) => boolean
  readonly styles: ComponentSlotRecord
}

export type ComponentRecipeResolutionPlan<
  TRecipe extends NativeComponentRecipeDescriptor = NativeComponentRecipeDescriptor,
> = {
  readonly $$type: typeof ComponentRecipeResolutionPlanType
  readonly version: typeof ComponentRecipeResolutionPlanVersion
  readonly recipe: TRecipe
  readonly slotOrder: ReadonlyArray<string>
  readonly variantOrder: ReadonlyArray<string>
  readonly selectionKeys: ReadonlyArray<string>
  readonly defaultSelection: Readonly<Record<string, unknown>>
  readonly base: ComponentSlotRecord
  readonly variants: ReadonlyArray<ComponentRecipeResolutionVariant>
  readonly compoundMatchers: ReadonlyArray<ComponentRecipeCompoundMatcher>
}

export type ComponentRecipeInvalidVariantReporter = (
  variantName: string,
  selectedValue: unknown,
  variantValues: ComponentSlotRecordMap,
) => void

type ComponentSlotRecordMap = Readonly<Record<string, ComponentSlotRecord>>

/** Build one shared plan for all slots without expanding variant products. */
export function createComponentRecipeResolutionPlan<
  TRecipe extends NativeComponentRecipeDescriptor,
>(recipe: TRecipe): ComponentRecipeResolutionPlan<TRecipe> {
  if (recipe.$$type !== NativeComponentRecipeType || recipe.version !== NativeComponentRecipeVersion) {
    throw new TypeError("Unsupported component recipe descriptor version")
  }
  const slots = validateComponentSlots(recipe.slots)
  const slotOrder = Object.keys(slots)
  const base = validateSlotRecord(recipe.base ?? {}, slots, "base")
  const variants = Object.entries(recipe.variants ?? {}).map(([name, values]) => {
    const normalizedValues = Object.fromEntries(Object.entries(values).map(([value, styles]) => [
      value,
      validateSlotRecord(styles, slots, `variant ${JSON.stringify(name)} value ${JSON.stringify(value)}`),
    ]))
    return Object.freeze({name, values: Object.freeze(normalizedValues)})
  })
  const variantOrder = variants.map(({name}) => name)
  const defaultSelection = Object.freeze({...recipe.defaultVariants})
  const compoundMatchers = (recipe.compoundVariants ?? []).map((compound, index) => {
    const requirements = Object.freeze(
      Object.entries(compound.variants ?? {}) as Array<readonly [string, unknown]>,
    )
    for (const [name, value] of requirements) {
      if (typeof value !== "string" && typeof value !== "boolean") {
        throw new TypeError(`Component recipe compound variant ${index} selections must be strings or booleans`)
      }
      const variant = variants.find((entry) => entry.name === name)
      if (variant === undefined) {
        throw new TypeError(`Component recipe compound variant ${index} references unknown variant ${JSON.stringify(name)}`)
      }
      if (!Object.hasOwn(variant.values, String(value))) {
        throw new TypeError(`Component recipe compound variant ${index} references unknown value ${JSON.stringify(value)} for variant ${JSON.stringify(name)}`)
      }
    }
    return Object.freeze({
      requirements,
      matches: (selection: Readonly<Record<string, unknown>>) =>
        requirements.every(([name, value]) => selection[name] === value),
      styles: validateSlotRecord(compound.styles, slots, `compound variant ${index}`),
    })
  })

  for (const [name, value] of Object.entries(defaultSelection)) {
    const variant = variants.find((entry) => entry.name === name)
    if ((typeof value !== "string" && typeof value !== "boolean") ||
      variant === undefined || !Object.hasOwn(variant.values, String(value))) {
      throw new TypeError(`Component recipe default value ${JSON.stringify(value)} is not defined for variant ${JSON.stringify(name)}`)
    }
  }

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
    $$type: ComponentRecipeResolutionPlanType,
    version: ComponentRecipeResolutionPlanVersion,
    recipe,
    slotOrder: Object.freeze(slotOrder),
    variantOrder: Object.freeze(variantOrder),
    selectionKeys: Object.freeze(selectionKeys),
    defaultSelection,
    base,
    variants: Object.freeze(variants),
    compoundMatchers: Object.freeze(compoundMatchers),
  }) as ComponentRecipeResolutionPlan<TRecipe>
}

export function resolveComponentRecipeResolutionPlan<
  TRecipe extends NativeComponentRecipeDescriptor,
>(
  plan: ComponentRecipeResolutionPlan<TRecipe>,
  selection: Readonly<Record<string, unknown>> = {},
  reportInvalidVariant?: ComponentRecipeInvalidVariantReporter,
): NativeComponentResolvedStyles<TRecipe["slots"]> {
  const selected = {...plan.defaultSelection, ...selection}
  const collected = Object.fromEntries(
    plan.slotOrder.map((slot) => [slot, [] as NativeStyle[]]),
  ) as Record<string, NativeStyle[]>

  for (const slot of plan.slotOrder) {
    const baseStyle = plan.base[slot]
    if (baseStyle !== undefined) collected[slot]!.push(baseStyle as NativeStyle)
  }

  for (const variant of plan.variants) {
    const selectedValue = selected[variant.name]
    if (selectedValue === undefined) continue
    if (typeof selectedValue !== "string" && typeof selectedValue !== "boolean") {
      reportInvalidVariant?.(variant.name, selectedValue, variant.values)
      continue
    }
    const valueName = String(selectedValue)
    if (!Object.hasOwn(variant.values, valueName)) {
      reportInvalidVariant?.(variant.name, selectedValue, variant.values)
      continue
    }
    appendSlotStyles(collected, variant.values[valueName]!)
  }

  for (const compound of plan.compoundMatchers) {
    if (compound.matches(selected)) appendSlotStyles(collected, compound.styles)
  }

  return Object.freeze(Object.fromEntries(
    plan.slotOrder.map((slot) => [slot, Object.freeze(collected[slot] ?? [])]),
  )) as NativeComponentResolvedStyles<TRecipe["slots"]>
}

function appendSlotStyles(
  collected: Record<string, NativeStyle[]>,
  branch: ComponentSlotRecord,
): void {
  for (const [slot, style] of Object.entries(branch)) {
    const target = collected[slot]
    if (target === undefined) throw new TypeError(`Component recipe branch references unknown slot ${JSON.stringify(slot)}`)
    target.push(style as NativeStyle)
  }
}

function validateComponentSlots(value: unknown): NativeComponentSlots {
  assertRecord(value, "Component recipe slots")
  const entries = Object.entries(value)
  if (entries.length === 0) throw new TypeError("Component recipe must define at least one slot")
  for (const [slot, kind] of entries) {
    if (slot.length === 0) throw new TypeError("Component recipe slot names must be non-empty")
    if (kind !== "view" && kind !== "text" && kind !== "image") {
      throw new TypeError(`Component recipe slot ${JSON.stringify(slot)} has an invalid primitive kind`)
    }
  }
  return value as NativeComponentSlots
}

function validateSlotRecord(
  value: unknown,
  slots: NativeComponentSlots,
  context: string,
): ComponentSlotRecord {
  assertRecord(value, `Component recipe ${context} slot styles`)
  const entries = Object.entries(value)
  for (const [slot, style] of entries) {
    if (!Object.hasOwn(slots, slot)) {
      throw new TypeError(`Component recipe ${context} references unknown slot ${JSON.stringify(slot)}`)
    }
    if (style === null || typeof style !== "object" || Array.isArray(style)) {
      throw new TypeError(`Component recipe ${context} style for slot ${JSON.stringify(slot)} must be a record`)
    }
  }
  return Object.freeze(Object.fromEntries(entries)) as ComponentSlotRecord
}

function assertRecord(value: unknown, context: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${context} must be a plain record`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${context} must be a plain record`)
  }
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${context} must contain enumerable data properties`)
    }
  }
}
