import {
  nativeComponentContractIdentityKey,
  validateNativeComponentContract,
  type NativeComponentContract,
  type NativeComponentContractIdentity,
} from "./contracts"
import {
  NativeComponentRecipeContractVersion,
  NativeComponentRecipeExtensionType,
  NativeComponentRecipeExtensionVersion,
  NativeComponentRecipeType,
} from "../native-tags"

const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const IDENTITY_NAME = /^[A-Za-z][A-Za-z0-9._-]*$/
const NativeRecipeClassSymbol = Symbol.for("crumbs.css.recipe-class-reference")

export type NativeComponentRecipeExtensionIdentity = NativeComponentContractIdentity
export type NativeComponentExtensionSlotStyles = Readonly<Record<string, unknown>>
export type NativeComponentExtensionVariants = Readonly<Record<
  string,
  Readonly<Record<string, NativeComponentExtensionSlotStyles>>
>>

declare const NativeComponentRecipeExtensionTypeInfo: unique symbol

/** Immutable serialized operations supplied by one extension in a chain. */
export type NativeComponentRecipeExtensionDescriptor<
  TBase = unknown,
  TAddedVariants extends NativeComponentExtensionVariants = NativeComponentExtensionVariants,
  TAllAddedVariants = TAddedVariants,
> = {
  readonly $$type: typeof NativeComponentRecipeExtensionType
  readonly version: typeof NativeComponentRecipeExtensionVersion
  readonly identity: NativeComponentRecipeExtensionIdentity
  readonly componentIdentity: NativeComponentContractIdentity
  readonly parentExtensionIdentity?: NativeComponentRecipeExtensionIdentity
  readonly defaultVariants: Readonly<Record<string, string | boolean>>
  /** Only this descriptor's new value branches. */
  readonly variants: TAddedVariants
  readonly compoundVariants: ReadonlyArray<{
    readonly variants: Readonly<Record<string, string | boolean>>
    readonly styles: NativeComponentExtensionSlotStyles
  }>
  readonly slotOverrides: NativeComponentExtensionSlotStyles
  /** Compile-time provenance; deliberately absent from the serialized object. */
  readonly [NativeComponentRecipeExtensionTypeInfo]?: {
    readonly base: TBase
    readonly variants: TAllAddedVariants
  }
}

export type NativeComponentRecipeExtensionTypeDetails<TExtension> =
  TExtension extends {
    readonly [NativeComponentRecipeExtensionTypeInfo]?: infer TDetails
  } ? Exclude<TDetails, undefined> : never

export type NativeComponentRecipeExtensionDraft = {
  readonly identity: NativeComponentRecipeExtensionIdentity
  readonly componentIdentity: NativeComponentContractIdentity
  readonly parentExtensionIdentity?: NativeComponentRecipeExtensionIdentity
  readonly defaultVariants: Readonly<Record<string, string | boolean>>
  readonly variants: NativeComponentExtensionVariants
  readonly compoundVariants: ReadonlyArray<{
    readonly variants: Readonly<Record<string, string | boolean>>
    readonly styles: NativeComponentExtensionSlotStyles
  }>
  readonly slotOverrides: NativeComponentExtensionSlotStyles
}

export type NativeComponentRecipeExtensionPlan = {
  readonly extensions: ReadonlyArray<NativeComponentRecipeExtensionDescriptor>
  readonly defaultVariants: Readonly<Record<string, string | boolean>>
  readonly variants: NativeComponentExtensionVariants
  readonly compoundVariants: ReadonlyArray<{
    readonly variants: Readonly<Record<string, string | boolean>>
    readonly styles: NativeComponentExtensionSlotStyles
  }>
  readonly slotOverrides: ReadonlyArray<NativeComponentExtensionSlotStyles>
  readonly selectionKeys: ReadonlyArray<string>
}

type ComponentBase = {
  readonly $$type: unknown
  readonly version: unknown
  readonly slots: unknown
  readonly variants: unknown
  readonly defaultVariants: unknown
  readonly stateVariants?: unknown
  readonly contract?: unknown
}

type StyleValidationMode = "descriptor" | "authoring"

const EMPTY_EXTENSION_PLAN: NativeComponentRecipeExtensionPlan = Object.freeze({
  extensions: Object.freeze([]),
  defaultVariants: Object.freeze({}),
  variants: Object.freeze({}),
  compoundVariants: Object.freeze([]),
  slotOverrides: Object.freeze([]),
  selectionKeys: Object.freeze([]),
})

/** Validate a complete base-to-leaf chain and precompute immutable merge data. */
export function validateNativeComponentRecipeExtensionChain(
  baseValue: unknown,
  extensionValues: unknown,
): NativeComponentRecipeExtensionPlan {
  return validateExtensionChain(baseValue, extensionValues, "descriptor")
}

/** Validate authoring operations before any vanilla-extract style is captured. */
export function validateNativeComponentRecipeExtensionDraft(
  base: unknown,
  config: unknown,
  priorExtensions: unknown = [],
): NativeComponentRecipeExtensionDraft {
  const prior = validateNativeComponentRecipeExtensionChain(base, priorExtensions)
  const configEntries = dataRecordEntries(config, "component recipe extension config")
  assertExactKeys(configEntries, ["identity"], ["defaultVariants", "variants", "compoundVariants", "slotOverrides"], "component recipe extension config")
  const values = Object.fromEntries(configEntries) as Record<string, unknown>
  const candidate = Object.freeze({
    $$type: NativeComponentRecipeExtensionType,
    version: NativeComponentRecipeExtensionVersion,
    identity: values.identity,
    componentIdentity: validateComponentBase(base).contract.identity,
    ...(prior.extensions.length === 0
      ? {}
      : {parentExtensionIdentity: prior.extensions[prior.extensions.length - 1]!.identity}),
    defaultVariants: values.defaultVariants === undefined ? {} : values.defaultVariants,
    variants: values.variants === undefined ? {} : values.variants,
    compoundVariants: values.compoundVariants === undefined ? [] : values.compoundVariants,
    slotOverrides: values.slotOverrides === undefined ? {} : values.slotOverrides,
  })
  const chain = validateExtensionChain(base, [...prior.extensions, candidate], "authoring")
  return chain.extensions[chain.extensions.length - 1] as unknown as NativeComponentRecipeExtensionDraft
}

function validateExtensionChain(
  baseValue: unknown,
  extensionValues: unknown,
  mode: StyleValidationMode,
): NativeComponentRecipeExtensionPlan {
  const rawExtensions = dataArray(extensionValues, "component recipe extensions")
  if (rawExtensions.length === 0) return EMPTY_EXTENSION_PLAN
  const base = validateComponentBase(baseValue)
  const contract = validateNativeComponentContract(
    base.contract,
    {slots: base.slots, variants: variantSurface(base.variants)},
    base.stateVariants,
  )
  const componentIdentity = contract.identity
  const publicAxes = new Set(Object.keys(contract.public.variants))
  const stateDiscriminator = getStateDiscriminator(base.stateVariants)
  const publicSlots = new Set(contract.public.slots)
  const extensionPoints = contract.extensionPoints
  const defaultAxes = new Set(extensionPoints?.defaults ?? [])
  const variantAxes = new Set(extensionPoints?.variantValues ?? [])
  const permittedSlots = new Set(extensionPoints?.slotStyles ?? [])
  const availableValues = new Map<string, Set<string>>()
  for (const [axis, values] of Object.entries(contract.public.variants)) {
    availableValues.set(axis, new Set(values))
  }

  const seenIdentities = new Set([nativeComponentContractIdentityKey(componentIdentity)])
  const normalizedExtensions: NativeComponentRecipeExtensionDescriptor[] = []
  const mergedDefaults: Record<string, string | boolean> = {...base.defaultVariants}
  const extensionDefaults: Record<string, string | boolean> = {}
  const addedVariantEntries = new Map<string, Array<readonly [string, NativeComponentExtensionSlotStyles]>>()
  const compounds: Array<{
    readonly variants: Readonly<Record<string, string | boolean>>
    readonly styles: NativeComponentExtensionSlotStyles
  }> = []
  const slotOverrides: NativeComponentExtensionSlotStyles[] = []
  let previousIdentity: NativeComponentRecipeExtensionIdentity | undefined

  for (let index = 0; index < rawExtensions.length; index += 1) {
    const descriptor = normalizeExtensionDescriptor(rawExtensions[index], index, mode)
    const extensionKey = nativeComponentContractIdentityKey(descriptor.identity)
    if (seenIdentities.has(extensionKey)) {
      throw new TypeError(`Component recipe extension identity ${JSON.stringify(extensionKey)} collides with the base or an earlier extension.`)
    }
    seenIdentities.add(extensionKey)
    if (!sameIdentity(descriptor.componentIdentity, componentIdentity)) {
      throw new TypeError("Component recipe extension component identity does not match the supplied base recipe.")
    }
    if (previousIdentity === undefined) {
      if (descriptor.parentExtensionIdentity !== undefined) {
        throw new TypeError("The first component recipe extension cannot declare a parent extension identity.")
      }
    } else if (descriptor.parentExtensionIdentity === undefined ||
      !sameIdentity(descriptor.parentExtensionIdentity, previousIdentity)) {
      throw new TypeError("Component recipe extension parent identity must match the immediately preceding extension.")
    }

    const normalizedVariants = validateAddedVariants(
      descriptor.variants,
      mode,
      variantAxes,
      publicAxes,
      publicSlots,
      permittedSlots,
      stateDiscriminator,
      availableValues,
      addedVariantEntries,
      `extension ${JSON.stringify(extensionKey)}`,
    )
    const normalizedDefaults = validateDefaultChanges(
      descriptor.defaultVariants,
      defaultAxes,
      publicAxes,
      availableValues,
      `extension ${JSON.stringify(extensionKey)}`,
    )
    Object.assign(mergedDefaults, normalizedDefaults)
    Object.assign(extensionDefaults, normalizedDefaults)
    assertStateDefaultsRemainValid(base.stateVariants, mergedDefaults, extensionKey)

    const normalizedCompounds = validateCompoundVariants(
      descriptor.compoundVariants,
      extensionPoints?.compoundVariants === true,
      publicAxes,
      availableValues,
      publicSlots,
      permittedSlots,
      mode,
      `extension ${JSON.stringify(extensionKey)}`,
    )
    const normalizedOverrides = validateSlotStyles(
      descriptor.slotOverrides,
      publicSlots,
      permittedSlots,
      mode,
      `extension ${JSON.stringify(extensionKey)} slot overrides`,
    )

    const normalizedDescriptor = Object.freeze({
      $$type: NativeComponentRecipeExtensionType,
      version: NativeComponentRecipeExtensionVersion,
      identity: descriptor.identity,
      componentIdentity: descriptor.componentIdentity,
      ...(descriptor.parentExtensionIdentity === undefined
        ? {}
        : {parentExtensionIdentity: descriptor.parentExtensionIdentity}),
      defaultVariants: normalizedDefaults,
      variants: normalizedVariants,
      compoundVariants: normalizedCompounds,
      slotOverrides: normalizedOverrides,
    }) as NativeComponentRecipeExtensionDescriptor
    normalizedExtensions.push(normalizedDescriptor)
    compounds.push(...normalizedCompounds)
    if (Object.keys(normalizedOverrides).length > 0) slotOverrides.push(normalizedOverrides)
    previousIdentity = descriptor.identity
  }

  const variants = Object.fromEntries([...addedVariantEntries.entries()].map(([axis, entries]) => [
    axis,
    Object.freeze(Object.fromEntries(entries)),
  ]))
  return Object.freeze({
    extensions: Object.freeze(normalizedExtensions),
    defaultVariants: Object.freeze(extensionDefaults),
    variants: Object.freeze(variants),
    compoundVariants: Object.freeze(compounds),
    slotOverrides: Object.freeze(slotOverrides),
    selectionKeys: Object.freeze([...publicAxes].sort(compareText)),
  })
}

function validateComponentBase(value: unknown): ComponentBase & {
  readonly contract: NativeComponentContract
  readonly slots: Readonly<Record<string, unknown>>
  readonly variants: Readonly<Record<string, unknown>>
  readonly defaultVariants: Readonly<Record<string, string | boolean>>
} {
  const entries = dataRecordEntries(value, "component recipe base")
  const base = Object.fromEntries(entries) as unknown as ComponentBase
  if (base.$$type !== NativeComponentRecipeType || base.version !== NativeComponentRecipeContractVersion) {
    throw new TypeError("Component recipe extensions require a version 3 contract-bearing base recipe")
  }
  const slots = dataRecordEntries(base.slots, "component recipe base slots")
  const variants = dataRecordEntries(base.variants, "component recipe base variants")
  const defaults = dataRecordEntries(base.defaultVariants, "component recipe base default variants")
  if (base.contract === undefined) throw new TypeError("Version 3 component recipes require contract metadata")
  const normalizedDefaults = normalizeSelection(Object.fromEntries(defaults), "component recipe base default variants")
  return {
    ...base,
    contract: base.contract as NativeComponentContract,
    slots: Object.freeze(Object.fromEntries(slots)),
    variants: Object.freeze(Object.fromEntries(variants)),
    defaultVariants: normalizedDefaults,
  }
}

function variantSurface(variants: Readonly<Record<string, unknown>>): Readonly<Record<string, Readonly<Record<string, true>>>> {
  return Object.fromEntries(dataRecordEntries(variants, "component recipe base variants").map(([axis, values]) => [
    axis,
    Object.fromEntries(dataRecordEntries(values, `component recipe variant ${JSON.stringify(axis)}`).map(([value]) => [value, true as const])),
  ]))
}

function normalizeExtensionDescriptor(
  value: unknown,
  index: number,
  mode: StyleValidationMode,
): NativeComponentRecipeExtensionDescriptor {
  const entries = dataRecordEntries(value, `component recipe extension ${index}`)
  assertExactKeys(
    entries,
    ["$$type", "version", "identity", "componentIdentity", "defaultVariants", "variants", "compoundVariants", "slotOverrides"],
    ["parentExtensionIdentity"],
    `component recipe extension ${index}`,
  )
  const record = Object.fromEntries(entries) as Record<string, unknown>
  if (record.$$type !== NativeComponentRecipeExtensionType) {
    throw new TypeError(`Component recipe extension ${index} has an unsupported descriptor type`)
  }
  if (record.version !== NativeComponentRecipeExtensionVersion) {
    throw new TypeError(`Unsupported component recipe extension version ${String(record.version)}`)
  }
  const identity = validateIdentity(record.identity, `component recipe extension ${index} identity`)
  const componentIdentity = validateIdentity(record.componentIdentity, `component recipe extension ${index} component identity`)
  const parentExtensionIdentity = record.parentExtensionIdentity === undefined
    ? undefined
    : validateIdentity(record.parentExtensionIdentity, `component recipe extension ${index} parent identity`)
  const defaultVariants = normalizeSelection(record.defaultVariants, `component recipe extension ${index} defaults`)
  const variants = dataRecordEntries(record.variants, `component recipe extension ${index} variants`)
  const normalizedVariantEntries: Array<readonly [string, Readonly<Record<string, unknown>>]> = []
  for (const [axis, rawValues] of variants) {
    const values = dataRecordEntries(rawValues, `component recipe extension ${index} variant ${JSON.stringify(axis)}`)
    const normalizedValues: Array<readonly [string, Readonly<Record<string, unknown>>]> = []
    for (const [valueName, rawStyles] of values) {
      normalizedValues.push([valueName, validateRawSlotStyleRecord(rawStyles, mode, `extension ${index} variant ${JSON.stringify(axis)} value ${JSON.stringify(valueName)}`)])
    }
    normalizedVariantEntries.push([axis, Object.freeze(Object.fromEntries(normalizedValues))])
  }
  const compoundVariants = dataArray(record.compoundVariants, `component recipe extension ${index} compound variants`)
    .map((compound, compoundIndex) => {
      const compoundEntries = dataRecordEntries(compound, `component recipe extension ${index} compound ${compoundIndex}`)
      assertExactKeys(compoundEntries, ["variants", "styles"], [], `component recipe extension ${index} compound ${compoundIndex}`)
      const compoundRecord = Object.fromEntries(compoundEntries) as Record<string, unknown>
      return Object.freeze({
        variants: normalizeSelection(compoundRecord.variants, `component recipe extension ${index} compound ${compoundIndex} selection`),
        styles: validateRawSlotStyleRecord(compoundRecord.styles, mode, `extension ${index} compound ${compoundIndex}`),
      })
    })
  const slotOverrides = validateRawSlotStyleRecord(record.slotOverrides, mode, `component recipe extension ${index} slot overrides`)
  return Object.freeze({
    $$type: NativeComponentRecipeExtensionType,
    version: NativeComponentRecipeExtensionVersion,
    identity,
    componentIdentity,
    ...(parentExtensionIdentity === undefined ? {} : {parentExtensionIdentity}),
    defaultVariants,
    variants: Object.freeze(Object.fromEntries(normalizedVariantEntries)),
    compoundVariants: Object.freeze(compoundVariants),
    slotOverrides,
  }) as NativeComponentRecipeExtensionDescriptor
}

function validateAddedVariants(
  value: NativeComponentExtensionVariants,
  mode: StyleValidationMode,
  permittedAxes: ReadonlySet<string>,
  publicAxes: ReadonlySet<string>,
  publicSlots: ReadonlySet<string>,
  permittedSlots: ReadonlySet<string>,
  stateDiscriminator: string | undefined,
  availableValues: Map<string, Set<string>>,
  addedVariantEntries: Map<string, Array<readonly [string, NativeComponentExtensionSlotStyles]>>,
  context: string,
): NativeComponentExtensionVariants {
  const axes = dataRecordEntries(value, context + " variants")
  const result: Array<readonly [string, Readonly<Record<string, NativeComponentExtensionSlotStyles>>]> = []
  for (const [axis, rawValues] of axes) {
    if (!publicAxes.has(axis)) {
      throw new TypeError(`${context} cannot add private or unknown variant axis ${JSON.stringify(axis)}`)
    }
    if (!permittedAxes.has(axis)) {
      throw new TypeError(`${context} variant axis ${JSON.stringify(axis)} is not permitted by extensionPoints.variantValues`)
    }
    if (axis === stateDiscriminator) {
      throw new TypeError(`${context} cannot add values to state discriminator ${JSON.stringify(axis)} because its owner state constraints are sealed`)
    }
    const values = dataRecordEntries(rawValues, context + ` variant ${JSON.stringify(axis)}`)
    if (values.length === 0) throw new TypeError(`${context} must add at least one value to variant ${JSON.stringify(axis)}`)
    const seenValues = availableValues.get(axis)!
    const normalizedValues: Array<readonly [string, NativeComponentExtensionSlotStyles]> = []
    const targetEntries = addedVariantEntries.get(axis) ?? []
    for (const [valueName, rawStyles] of values) {
      if (seenValues.has(valueName)) {
        throw new TypeError(`${context} variant value ${JSON.stringify(valueName)} for ${JSON.stringify(axis)} already exists in the base or extension chain`)
      }
      const styles = validateSlotStyles(rawStyles, publicSlots, permittedSlots, mode,
        `${context} variant ${JSON.stringify(axis)} value ${JSON.stringify(valueName)}`)
      seenValues.add(valueName)
      normalizedValues.push([valueName, styles])
      targetEntries.push([valueName, styles])
    }
    addedVariantEntries.set(axis, targetEntries)
    result.push([axis, Object.freeze(Object.fromEntries(normalizedValues))])
  }
  return Object.freeze(Object.fromEntries(result))
}

function validateDefaultChanges(
  value: unknown,
  permittedAxes: ReadonlySet<string>,
  publicAxes: ReadonlySet<string>,
  availableValues: ReadonlyMap<string, ReadonlySet<string>>,
  context: string,
): Readonly<Record<string, string | boolean>> {
  const entries = dataRecordEntries(value, context + " defaults")
  const normalized: Array<readonly [string, string | boolean]> = []
  for (const [axis, selectedValue] of entries) {
    if (!publicAxes.has(axis)) throw new TypeError(`${context} cannot change private or unknown default axis ${JSON.stringify(axis)}`)
    if (!permittedAxes.has(axis)) {
      throw new TypeError(`${context} default axis ${JSON.stringify(axis)} is not permitted by extensionPoints.defaults`)
    }
    if (typeof selectedValue !== "string" && typeof selectedValue !== "boolean") {
      throw new TypeError(`${context} default for ${JSON.stringify(axis)} must be a string or boolean data value`)
    }
    if (!availableValues.get(axis)?.has(String(selectedValue))) {
      throw new TypeError(`${context} default for ${JSON.stringify(axis)} selects an unavailable public value ${JSON.stringify(selectedValue)}`)
    }
    normalized.push([axis, selectedValue])
  }
  return Object.freeze(Object.fromEntries(normalized))
}

function validateCompoundVariants(
  value: ReadonlyArray<unknown>,
  permitted: boolean,
  publicAxes: ReadonlySet<string>,
  availableValues: ReadonlyMap<string, ReadonlySet<string>>,
  publicSlots: ReadonlySet<string>,
  permittedSlots: ReadonlySet<string>,
  mode: StyleValidationMode,
  context: string,
): NativeComponentRecipeExtensionDraft["compoundVariants"] {
  const compounds = dataArray(value, context + " compound variants")
  if (compounds.length > 0 && !permitted) {
    throw new TypeError(`${context} compounds require extensionPoints.compoundVariants permission`)
  }
  return Object.freeze(compounds.map((compound, index) => {
    const entries = dataRecordEntries(compound, `${context} compound ${index}`)
    assertExactKeys(entries, ["variants", "styles"], [], `${context} compound ${index}`)
    const record = Object.fromEntries(entries) as Record<string, unknown>
    const selectors = normalizeSelection(record.variants, `${context} compound ${index} selection`)
    if (Object.keys(selectors).length === 0) throw new TypeError(`${context} compound ${index} must select at least one public variant`)
    for (const [axis, value] of Object.entries(selectors)) {
      if (!publicAxes.has(axis) || !availableValues.get(axis)?.has(String(value))) {
        throw new TypeError(`${context} compound ${index} selects an unknown or unavailable public value ${JSON.stringify(value)} for ${JSON.stringify(axis)}`)
      }
    }
    const styles = validateSlotStyles(record.styles, publicSlots, permittedSlots, mode, `${context} compound ${index}`)
    return Object.freeze({variants: selectors, styles})
  }))
}

function validateSlotStyles(
  value: unknown,
  publicSlots: ReadonlySet<string>,
  permittedSlots: ReadonlySet<string>,
  mode: StyleValidationMode,
  context: string,
): NativeComponentExtensionSlotStyles {
  const entries = dataRecordEntries(value, context + " slot styles")
  const normalized: Array<readonly [string, unknown]> = []
  for (const [slot, style] of entries) {
    if (!publicSlots.has(slot)) throw new TypeError(`${context} cannot style private or unknown slot ${JSON.stringify(slot)}`)
    if (!permittedSlots.has(slot)) {
      throw new TypeError(`${context} slot ${JSON.stringify(slot)} is not permitted by extensionPoints.slotStyles`)
    }
    normalized.push([slot, mode === "descriptor"
      ? normalizeClassReference(style, context + ` style for ${JSON.stringify(slot)}`)
      : assertStyleInputData(style, context + ` style for ${JSON.stringify(slot)}`)])
  }
  return Object.freeze(Object.fromEntries(normalized))
}

function validateRawSlotStyleRecord(
  value: unknown,
  mode: StyleValidationMode,
  context: string,
): NativeComponentExtensionSlotStyles {
  const entries = dataRecordEntries(value, context + " slot styles")
  return Object.freeze(Object.fromEntries(entries.map(([slot, style]) => [
    slot,
    mode === "descriptor" ? normalizeClassReference(style, context + ` style for ${JSON.stringify(slot)}`)
      : assertStyleInputData(style, context + ` style for ${JSON.stringify(slot)}`),
  ])))
}

function normalizeClassReference(value: unknown, context: string): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be a plain native class reference`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${context} must be a plain native class reference`)
  }
  const keys = Reflect.ownKeys(value)
  const stringKeys = keys.filter((key): key is string => typeof key === "string")
  const symbols = keys.filter((key): key is symbol => typeof key === "symbol")
  if (stringKeys.length !== 2 || !stringKeys.includes("$$type") || !stringKeys.includes("className") ||
    (symbols.length > 0 && (symbols.length !== 1 || symbols[0] !== NativeRecipeClassSymbol))) {
    throw new TypeError(`${context} must be a plain native class reference`)
  }
  const tag = Object.getOwnPropertyDescriptor(value, "$$type")
  const className = Object.getOwnPropertyDescriptor(value, "className")
  if (tag === undefined || !("value" in tag) || tag.enumerable !== true || tag.value !== "crumbs.css.class" ||
    className === undefined || !("value" in className) || className.enumerable !== true ||
    typeof className.value !== "string" || className.value.length === 0) {
    throw new TypeError(`${context} must be a plain native class reference`)
  }
  if (symbols.length === 1) {
    const marker = Object.getOwnPropertyDescriptor(value, NativeRecipeClassSymbol)
    if (marker === undefined || !("value" in marker) || marker.value !== true) {
      throw new TypeError(`${context} has an invalid native class reference marker`)
    }
  }
  const reference = {$$type: "crumbs.css.class", className: className.value}
  Object.defineProperty(reference, NativeRecipeClassSymbol, {value: true, enumerable: true})
  return Object.freeze(reference)
}

function assertStyleInputData(value: unknown, context: string, ancestors = new Set<object>()): unknown {
  if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new TypeError(`${context} must contain only plain data values`)
  }
  if (typeof value !== "object" || value === null) return value
  if (isNativeClassReference(value)) return value
  if (ancestors.has(value)) throw new TypeError(`${context} cannot contain a cycle`)
  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      const values = dataArray(value, context)
      values.forEach((entry, index) => assertStyleInputData(entry, `${context}[${index}]`, ancestors))
      return value
    }
    const entries = dataRecordEntries(value, context)
    for (const [key, entry] of entries) assertStyleInputData(entry, `${context}.${key}`, ancestors)
    return value
  } finally {
    ancestors.delete(value)
  }
}

function isNativeClassReference(value: object): boolean {
  try {
    normalizeClassReference(value, "native class reference")
    return true
  } catch {
    return false
  }
}

function getStateDiscriminator(value: unknown): string | undefined {
  if (value === undefined) return undefined
  const entries = dataRecordEntries(value, "component recipe state variants")
  if (entries.length !== 1) throw new TypeError("Component recipe stateVariants must define exactly one discriminator")
  return entries[0]![0]
}

function assertStateDefaultsRemainValid(
  stateVariants: unknown,
  defaults: Readonly<Record<string, unknown>>,
  extensionKey: string,
): void {
  if (stateVariants === undefined) return
  const discriminators = dataRecordEntries(stateVariants, "component recipe state variants")
  if (discriminators.length !== 1) throw new TypeError("Component recipe stateVariants must define exactly one discriminator")
  const [discriminator, rawCases] = discriminators[0]!
  const selectedState = defaults[discriminator]
  if (typeof selectedState !== "string" && typeof selectedState !== "boolean") {
    throw new TypeError(`Extension ${JSON.stringify(extensionKey)} leaves the default state discriminator unset`)
  }
  const cases = dataRecordEntries(rawCases, `component recipe state ${JSON.stringify(discriminator)}`)
  const selectedCase = cases.find(([caseName]) => caseName === String(selectedState))?.[1]
  if (selectedCase === undefined) {
    throw new TypeError(`Extension ${JSON.stringify(extensionKey)} default selects an unknown state ${JSON.stringify(selectedState)}`)
  }
  for (const [axis, rawValues] of dataRecordEntries(selectedCase, `component recipe state ${JSON.stringify(selectedState)} constraints`)) {
    const selectedValue = defaults[axis]
    const allowedValues = dataArray(rawValues, `component recipe state ${JSON.stringify(selectedState)} constraint ${JSON.stringify(axis)}`)
    if (!allowedValues.some(value => value === selectedValue)) {
      throw new TypeError(`Extension ${JSON.stringify(extensionKey)} defaults violate owner state constraint ${JSON.stringify(axis)}`)
    }
  }
}

function normalizeSelection(value: unknown, context: string): Readonly<Record<string, string | boolean>> {
  const entries = dataRecordEntries(value, context)
  const normalized: Array<readonly [string, string | boolean]> = []
  for (const [axis, selectedValue] of entries) {
    if (typeof selectedValue !== "string" && typeof selectedValue !== "boolean") {
      throw new TypeError(`${context} values must be strings or booleans`)
    }
    normalized.push([axis, selectedValue])
  }
  return Object.freeze(Object.fromEntries(normalized))
}

function validateIdentity(value: unknown, context: string): NativeComponentRecipeExtensionIdentity {
  const entries = dataRecordEntries(value, context)
  assertExactKeys(entries, ["owner", "name", "version"], [], context)
  const identity = Object.fromEntries(entries) as Record<string, unknown>
  if (typeof identity.owner !== "string" || !PACKAGE_NAME.test(identity.owner) ||
    typeof identity.name !== "string" || !IDENTITY_NAME.test(identity.name) ||
    typeof identity.version !== "number" || !Number.isSafeInteger(identity.version) || identity.version <= 0) {
    throw new TypeError(`${context} must have a package owner, identifier name, and positive safe integer version`)
  }
  return Object.freeze({owner: identity.owner, name: identity.name, version: identity.version})
}

function sameIdentity(left: NativeComponentContractIdentity, right: NativeComponentContractIdentity): boolean {
  return nativeComponentContractIdentityKey(left) === nativeComponentContractIdentityKey(right)
}

function dataRecordEntries(value: unknown, context: string): Array<[string, unknown]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be a plain data record`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${context} must be a plain data record`)
  if (Object.getOwnPropertySymbols(value).length > 0) throw new TypeError(`${context} cannot contain symbol keys`)
  const entries: Array<[string, unknown]> = []
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw new TypeError(`${context} cannot contain symbol keys`)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${context}.${key} must be an enumerable data property`)
    }
    entries.push([key, descriptor.value])
  }
  return entries
}

function dataArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${context} must be an array`)
  }
  if (Object.getOwnPropertySymbols(value).length > 0) throw new TypeError(`${context} cannot contain symbol properties`)
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length") continue
    if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) {
      throw new TypeError(`${context} must contain only indexed data values`)
    }
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const result: unknown[] = []
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)]
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError(`${context} must contain dense enumerable data values`)
    }
    result.push(descriptor.value)
  }
  return result
}

function assertExactKeys(
  entries: ReadonlyArray<readonly [string, unknown]>,
  required: ReadonlyArray<string>,
  optional: ReadonlyArray<string>,
  context: string,
): void {
  const keys = new Set(entries.map(([key]) => key))
  for (const key of required) if (!keys.has(key)) throw new TypeError(`${context} is missing ${JSON.stringify(key)}`)
  for (const key of keys) {
    if (!required.includes(key) && !optional.includes(key)) throw new TypeError(`${context} has unknown field ${JSON.stringify(key)}`)
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
