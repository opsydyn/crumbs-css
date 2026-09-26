import type {
  NativeComponentRecipeDescriptor,
  NativeComponentResolvedSlotStyles,
  NativeComponentResolvedStyles,
  NativeComponentSlots,
} from "../components"
import type {NativeStyle} from "../native-style"
import {validateNativeComponentContract} from "../components/contracts"
import {
  validateNativeComponentRecipeExtensionChain,
  type NativeComponentRecipeExtensionDescriptor,
  type NativeComponentRecipeExtensionPlan,
} from "../components/extension-contract"
import {
  NativeComponentRecipeContractVersion,
  NativeComponentRecipeLegacyVersion,
  NativeComponentRecipeType,
  NativeComponentRecipeVersion,
} from "../native-tags"

export const ComponentRecipeResolutionPlanType = "crumbs.css.component-recipe-resolution-plan" as const
export const ComponentRecipeResolutionPlanVersion = 1 as const

type ComponentSlotRecord = NativeComponentResolvedSlotStyles<NativeComponentSlots>
type ComponentRecipeStateConstraint = {
  readonly discriminator: string
  readonly cases: ReadonlyArray<{
    readonly value: string
    readonly constraints: ReadonlyArray<readonly [string, ReadonlyArray<string | boolean>]>
  }>
}

export type ComponentRecipeResolutionVariant = {
  readonly name: string
  readonly values: Readonly<Record<string, ComponentSlotRecord>>
}

export type ComponentRecipeCompoundMatcher = {
  readonly requirements: ReadonlyArray<readonly [string, unknown]>
  readonly matches: (selection: Readonly<Record<string, unknown>>) => boolean
  readonly styles: ComponentSlotRecord
}

export type ComponentRecipeResolutionPlanOptions<
  TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor> = ReadonlyArray<NativeComponentRecipeExtensionDescriptor>,
> = {
  readonly extensions?: TExtensions
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
  readonly stateConstraint?: ComponentRecipeStateConstraint
  readonly extensionPlan?: NativeComponentRecipeExtensionPlan
}

export type ComponentRecipeInvalidVariantReporter = (
  variantName: string,
  selectedValue: unknown,
  variantValues: ComponentSlotRecordMap,
) => void

type ComponentRecipeInvalidStateReporter = (
  discriminator: string,
  selection: Readonly<Record<string, unknown>>,
  constraint: ComponentRecipeStateConstraint,
) => void

type ComponentSlotRecordMap = Readonly<Record<string, ComponentSlotRecord>>

/** Build one shared plan for all slots without expanding variant products. */
export function createComponentRecipeResolutionPlan<
  TRecipe extends NativeComponentRecipeDescriptor,
  TExtensions extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor> = ReadonlyArray<NativeComponentRecipeExtensionDescriptor>,
>(
  recipe: TRecipe,
  options: ComponentRecipeResolutionPlanOptions<TExtensions> = {},
): ComponentRecipeResolutionPlan<TRecipe> {
  if (recipe.$$type !== NativeComponentRecipeType ||
    (recipe.version !== NativeComponentRecipeLegacyVersion &&
      recipe.version !== NativeComponentRecipeVersion &&
      recipe.version !== NativeComponentRecipeContractVersion)) {
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

  const stateConstraint = recipe.version === NativeComponentRecipeVersion ||
      recipe.version === NativeComponentRecipeContractVersion
    ? validateStateConstraint(recipe.stateVariants, variants, defaultSelection)
    : undefined
  if (recipe.version === NativeComponentRecipeContractVersion) {
    if (recipe.contract === undefined) {
      throw new TypeError("Version 3 component recipes require contract metadata")
    }
    const variantSurface = Object.fromEntries(variants.map(variant => [
      variant.name,
      Object.fromEntries(Object.keys(variant.values).map(value => [value, true])),
    ]))
    validateNativeComponentContract(recipe.contract, {slots, variants: variantSurface}, recipe.stateVariants)
  } else if (recipe.contract !== undefined) {
    throw new TypeError("Component contract metadata requires component recipe version 3")
  }

  const extensionPlan = validateNativeComponentRecipeExtensionChain(
    recipe,
    options.extensions === undefined ? [] : options.extensions,
  )
  const effectiveDefaults = Object.freeze({...defaultSelection, ...extensionPlan.defaultVariants})
  const mergedVariants = variants.map(variant => {
    const addedValues = extensionPlan.variants[variant.name]
    return addedValues === undefined
      ? variant
      : Object.freeze({name: variant.name, values: Object.freeze({...variant.values, ...addedValues})})
  })
  const extensionCompoundMatchers = extensionPlan.compoundVariants.map((compound, index) => {
    const requirements = Object.freeze(Object.entries(compound.variants) as Array<readonly [string, unknown]>)
    return Object.freeze({
      requirements,
      matches: (selection: Readonly<Record<string, unknown>>) =>
        requirements.every(([name, value]) => selection[name] === value),
      styles: validateSlotRecord(compound.styles as ComponentSlotRecord, slots, `extension compound variant ${index}`),
    })
  })
  const extensionOverrides = extensionPlan.slotOverrides.map((styles, index) =>
    validateSlotRecord(styles as ComponentSlotRecord, slots, `extension slot overrides ${index}`))
  const hasExtensions = extensionPlan.extensions.length > 0

  const selectionKeySet = new Set<string>([
    ...(hasExtensions
      ? variantOrder.filter(name => extensionPlan.selectionKeys.includes(name))
      : variantOrder),
    ...Object.keys(effectiveDefaults).filter(name => !hasExtensions || extensionPlan.selectionKeys.includes(name)),
    ...compoundMatchers.flatMap(({requirements}) => requirements.map(([name]) => name)),
    ...extensionCompoundMatchers.flatMap(({requirements}) => requirements.map(([name]) => name)),
  ])
  const selectionKeys = hasExtensions
    ? variantOrder.filter(name => extensionPlan.selectionKeys.includes(name))
    : [
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
    defaultSelection: effectiveDefaults,
    base,
    variants: Object.freeze(mergedVariants),
    compoundMatchers: Object.freeze([...compoundMatchers, ...extensionCompoundMatchers]),
    ...(stateConstraint === undefined ? {} : {stateConstraint}),
    ...(hasExtensions ? {extensionPlan: Object.freeze({...extensionPlan, slotOverrides: Object.freeze(extensionOverrides)})} : {}),
  }) as ComponentRecipeResolutionPlan<TRecipe>
}

export function resolveComponentRecipeResolutionPlan<
  TRecipe extends NativeComponentRecipeDescriptor,
>(
  plan: ComponentRecipeResolutionPlan<TRecipe>,
  selection: Readonly<Record<string, unknown>> = {},
  reportInvalidVariant?: ComponentRecipeInvalidVariantReporter,
  reportInvalidState?: ComponentRecipeInvalidStateReporter,
): NativeComponentResolvedStyles<TRecipe["slots"]> {
  validateComponentRecipeExtensionSelection(plan, selection)
  const selected = {...plan.defaultSelection, ...selection}
  const collected = Object.fromEntries(
    plan.slotOrder.map((slot) => [slot, [] as NativeStyle[]]),
  ) as Record<string, NativeStyle[]>

  for (const slot of plan.slotOrder) {
    const baseStyle = plan.base[slot]
    if (baseStyle !== undefined) collected[slot]!.push(baseStyle as NativeStyle)
  }

  if (plan.stateConstraint !== undefined && !matchesSelectedState(plan.stateConstraint, selected)) {
    reportInvalidState?.(plan.stateConstraint.discriminator, selected, plan.stateConstraint)
    return freezeCollectedSlotStyles(plan.slotOrder, collected) as NativeComponentResolvedStyles<TRecipe["slots"]>
  }

  const stateDiscriminator = plan.recipe.version === NativeComponentRecipeContractVersion
    ? plan.stateConstraint?.discriminator
    : undefined
  for (const variant of plan.variants) {
    if (variant.name === stateDiscriminator) continue
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

  if (stateDiscriminator !== undefined) {
    const variant = plan.variants.find(entry => entry.name === stateDiscriminator)
    const selectedValue = selected[stateDiscriminator]
    if (variant !== undefined && selectedValue !== undefined &&
      (typeof selectedValue === "string" || typeof selectedValue === "boolean")) {
      const valueName = String(selectedValue)
      if (Object.hasOwn(variant.values, valueName)) {
        appendSlotStyles(collected, variant.values[valueName]!)
      }
    }
  }

  for (const compound of plan.compoundMatchers) {
    if (compound.matches(selected)) appendSlotStyles(collected, compound.styles)
  }

  for (const override of plan.extensionPlan?.slotOverrides ?? []) {
    appendSlotStyles(collected, override as ComponentSlotRecord)
  }

  return freezeCollectedSlotStyles(plan.slotOrder, collected) as NativeComponentResolvedStyles<TRecipe["slots"]>
}

/** Reject private and unknown keys before resolver cache lookup. */
export function validateComponentRecipeExtensionSelection(
  plan: Pick<ComponentRecipeResolutionPlan, "extensionPlan" | "selectionKeys">,
  selection: Readonly<Record<string, unknown>>,
): void {
  if (plan.extensionPlan === undefined) return
  if (Object.getOwnPropertySymbols(selection).length > 0) {
    throw new TypeError("Component recipe extension resolver received an unknown symbol selection key")
  }
  for (const key of Object.keys(selection)) {
    if (!plan.selectionKeys.includes(key)) {
      throw new TypeError(`Component recipe extension resolver received unknown or private selection key ${JSON.stringify(key)}`)
    }
    const selectedValue = selection[key]
    const privateValues = plan.extensionPlan?.privateOwnerValues[key]
    if ((typeof selectedValue === "string" || typeof selectedValue === "boolean") &&
      privateValues !== undefined && Object.hasOwn(privateValues, String(selectedValue))) {
      throw new TypeError(`Component recipe extension resolver received private owner value ${JSON.stringify(selectedValue)} for selection key ${JSON.stringify(key)}`)
    }
  }
}

function validateStateConstraint(
  value: unknown,
  variants: ReadonlyArray<ComponentRecipeResolutionVariant>,
  defaults: Readonly<Record<string, unknown>>,
): ComponentRecipeStateConstraint | undefined {
  if (value === undefined) return undefined
  const discriminators = stateRecordEntries(value, "Component recipe stateVariants")
  if (discriminators.length !== 1) {
    throw new TypeError("Component recipe stateVariants must define exactly one discriminator")
  }
  const [discriminator, rawCases] = discriminators[0]!
  const discriminatorVariant = variants.find(variant => variant.name === discriminator)
  if (discriminatorVariant === undefined) {
    throw new TypeError(`Component recipe stateVariants references unknown discriminator variant ${JSON.stringify(discriminator)}`)
  }

  const cases = stateRecordEntries(rawCases, `Component recipe stateVariants discriminator ${JSON.stringify(discriminator)}`)
  const expectedCaseNames = Object.keys(discriminatorVariant.values)
  const actualCaseNames = new Set(cases.map(([name]) => name))
  const missingCase = expectedCaseNames.find(name => !actualCaseNames.has(name))
  if (missingCase !== undefined) {
    throw new TypeError(`Component recipe stateVariants is missing state case ${JSON.stringify(missingCase)}`)
  }
  const extraCase = cases.find(([name]) => !Object.hasOwn(discriminatorVariant.values, name))?.[0]
  if (extraCase !== undefined) {
    throw new TypeError(`Component recipe stateVariants has unknown state case ${JSON.stringify(extraCase)}`)
  }
  if (!Object.hasOwn(defaults, discriminator)) {
    throw new TypeError(`Component recipe defaultVariants must define discriminator ${JSON.stringify(discriminator)} for stateVariants`)
  }
  const defaultCaseName = String(defaults[discriminator])
  let defaultConstraints: ReadonlyArray<readonly [string, ReadonlyArray<string | boolean>]> = []
  const normalizedCases = cases.map(([caseName, rawConstraints]) => {
    const constraints = stateRecordEntries(rawConstraints, `Component recipe state ${JSON.stringify(caseName)} constraints`)
    const normalizedConstraints: Array<readonly [string, ReadonlyArray<string | boolean>]> = []
    for (const [axis, rawAllowedValues] of constraints) {
      if (axis === discriminator) {
        throw new TypeError(`Component recipe state ${JSON.stringify(caseName)} cannot constrain its discriminator ${JSON.stringify(discriminator)}`)
      }
      const variant = variants.find(entry => entry.name === axis)
      if (variant === undefined) {
        throw new TypeError(`Component recipe state ${JSON.stringify(caseName)} references unknown constrained variant ${JSON.stringify(axis)}`)
      }
      const allowedValues = validateStateConstraintValues(rawAllowedValues, variant.values, caseName, axis)
      normalizedConstraints.push([axis, allowedValues])
    }
    if (caseName === defaultCaseName) defaultConstraints = normalizedConstraints
    return Object.freeze({value: caseName, constraints: Object.freeze(normalizedConstraints)})
  })

  for (const [axis, allowedValues] of defaultConstraints) {
    if (!Object.hasOwn(defaults, axis)) {
      throw new TypeError(`Component recipe defaultVariants must define constrained variant ${JSON.stringify(axis)} for its default state`)
    }
    if (!allowedValues.includes(defaults[axis] as string | boolean)) {
      throw new TypeError(`Component recipe default selection for state ${JSON.stringify(defaultCaseName)} violates constraint ${JSON.stringify(axis)}`)
    }
  }

  return Object.freeze({discriminator, cases: Object.freeze(normalizedCases)})
}

function validateStateConstraintValues(
  value: unknown,
  variantValues: Readonly<Record<string, ComponentSlotRecord>>,
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

  const values: Array<string | boolean> = []
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
    if (!Object.hasOwn(variantValues, String(allowedValue))) {
      throw new TypeError(`${context} has unknown value ${JSON.stringify(allowedValue)} for variant ${JSON.stringify(axis)}`)
    }
    const key = typeof allowedValue === "boolean"
      ? `b:${allowedValue ? 1 : 0}`
      : `s:${allowedValue.length}:${allowedValue}`
    if (seen.has(key)) throw new TypeError(`${context} contains duplicate allowed value ${JSON.stringify(allowedValue)}`)
    seen.add(key)
    values.push(allowedValue)
  }
  return Object.freeze(values)
}

function matchesSelectedState(
  constraint: ComponentRecipeStateConstraint,
  selection: Readonly<Record<string, unknown>>,
): boolean {
  const discriminatorValue = selection[constraint.discriminator]
  if (typeof discriminatorValue !== "string" && typeof discriminatorValue !== "boolean") return false
  const selectedCase = constraint.cases.find(({value}) => value === String(discriminatorValue))
  if (selectedCase === undefined) return false
  return selectedCase.constraints.every(([axis, allowedValues]) =>
    allowedValues.includes(selection[axis] as string | boolean))
}

function freezeCollectedSlotStyles(
  slotOrder: ReadonlyArray<string>,
  collected: Readonly<Record<string, ReadonlyArray<NativeStyle>>>,
): Readonly<Record<string, ReadonlyArray<NativeStyle>>> {
  return Object.freeze(Object.fromEntries(
    slotOrder.map((slot) => [slot, Object.freeze(collected[slot] ?? [])]),
  ))
}

function stateRecordEntries(value: unknown, context: string): Array<[string, unknown]> {
  assertStateRecord(value, context)
  return Object.entries(value as Record<string, unknown>)
}

function assertStateRecord(value: unknown, context: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${context} must be a plain record`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${context} must be a plain record`)
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
