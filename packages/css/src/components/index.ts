import type {ImageStyle, TextStyle, ViewStyle} from "react-native"
import {authorNativeStyle} from "../native-authoring"
import {NativeComponentRecipeType, NativeComponentRecipeVersion, NativeRecipeClassType} from "../native-tags"
import {NativeRecipeClassSymbol} from "../native-style-map"
import type {
  NativeImageStyleInput,
  NativeRecipe,
  NativeStyle,
  NativeRecipeStyleInput,
  NativeRecipeVariantsConfig,
  NativeStyleComposition,
  NativeTextStyleInput,
  NativeViewStyleInput,
} from "../native-style"
import type {NativePrimitiveKind} from "../compiler/native-capture"

export {NativeComponentRecipeType, NativeComponentRecipeVersion}

export type NativeComponentSlotKind = NativePrimitiveKind
export type NativeComponentSlots = Readonly<Record<string, NativeComponentSlotKind>>

export type NativeComponentSlotStyleInput<TKind extends NativeComponentSlotKind> =
  TKind extends "view" ? NativeViewStyleInput | ViewStyle | NativeStyleComposition<NativeViewStyleInput, ViewStyle>
    : TKind extends "text" ? NativeTextStyleInput | TextStyle | NativeStyleComposition<NativeTextStyleInput, TextStyle>
      : NativeImageStyleInput | ImageStyle | NativeStyleComposition<NativeImageStyleInput, ImageStyle>

export type NativeComponentSlotStyles<TSlots extends NativeComponentSlots> = Partial<{
  readonly [TSlot in keyof TSlots & string]: NativeComponentSlotStyleInput<TSlots[TSlot]>
}>

export type NativeComponentVariantsConfig<TSlots extends NativeComponentSlots> = Readonly<
  Record<string, Readonly<Record<string, NativeComponentSlotStyles<TSlots>>>>
>

type NativeComponentVariantsShape = Readonly<Record<string, Readonly<Record<string, unknown>>>>

export type NativeComponentVariantSelection<TValues> = keyof TValues extends "false" | "true"
  ? boolean | keyof TValues
  : keyof TValues

export type NativeComponentRecipeSelection<
  TVariants extends NativeComponentVariantsShape,
> = {
  readonly [K in keyof TVariants]?: NativeComponentVariantSelection<TVariants[K]>
}

export type NativeComponentCompoundVariant<
  TSlots extends NativeComponentSlots,
  TVariants extends NativeComponentVariantsShape,
> = {
  readonly styles: NativeComponentSlotStyles<TSlots>
  readonly variants: NativeComponentRecipeSelection<TVariants>
}

export type NativeComponentSlotStyleResult<TKind extends NativeComponentSlotKind> =
  TKind extends "view" ? ViewStyle
    : TKind extends "text" ? TextStyle
      : ImageStyle

export type NativeComponentResolvedSlotStyles<TSlots extends NativeComponentSlots> = Partial<{
  readonly [TSlot in keyof TSlots & string]: NativeComponentSlotStyleResult<TSlots[TSlot]>
}>

export type NativeComponentRecipe<TSlots extends NativeComponentSlots, TVariants extends NativeComponentVariantsShape> = {
  readonly $$debugName?: string
  readonly $$type: typeof NativeComponentRecipeType
  readonly version: typeof NativeComponentRecipeVersion
  readonly slots: TSlots
  readonly base?: NativeComponentResolvedSlotStyles<TSlots>
  readonly variants: {
    readonly [K in keyof TVariants]: {
      readonly [V in keyof TVariants[K]]: NativeComponentResolvedSlotStyles<TSlots>
    }
  }
  readonly defaultVariants: NativeComponentRecipeSelection<TVariants>
  readonly compoundVariants: ReadonlyArray<NativeComponentCompoundVariant<TSlots, TVariants> & {
    readonly styles: NativeComponentResolvedSlotStyles<TSlots>
  }>
}

export type NativeComponentRecipeDescriptor = {
  readonly $$debugName?: string
  readonly $$type: typeof NativeComponentRecipeType
  readonly version: typeof NativeComponentRecipeVersion
  readonly slots: NativeComponentSlots
  readonly base?: object
  readonly variants: object
  readonly defaultVariants: object
  readonly compoundVariants: ReadonlyArray<{
    readonly variants: object
    readonly styles: object
  }>
}

export type NativeComponentRecipeConfig<
  TSlots extends NativeComponentSlots,
  TVariants extends NativeComponentVariantsConfig<TSlots>,
> = {
  readonly slots: TSlots
  readonly base?: NativeComponentSlotStyles<TSlots>
  readonly variants: TVariants
  readonly defaultVariants?: NativeComponentRecipeSelection<TVariants>
  readonly compoundVariants?: ReadonlyArray<NativeComponentCompoundVariant<TSlots, TVariants>>
}

export type NativeComponentRecipeProps<TRecipe> =
  TRecipe extends NativeComponentRecipe<infer TSlots, infer TVariants>
    ? NativeComponentRecipeSelection<TVariants>
    : never

export type NativeComponentResolvedStyles<TSlots extends NativeComponentSlots> = Readonly<{
  readonly [TSlot in keyof TSlots & string]: ReadonlyArray<NativeComponentSlotStyleResult<TSlots[TSlot]>>
}>

type ValidatedSlotStyles = ReadonlyArray<readonly [string, unknown]>
type ValidatedVariants = ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, ValidatedSlotStyles]>]>
type ValidatedCompound = {
  readonly selection: Readonly<Record<string, string | boolean>>
  readonly styles: ValidatedSlotStyles
}

type NativeComponentStyleReference = {
  readonly $$type: typeof NativeRecipeClassType
  readonly className: string
}

type NativeComponentVariantsFromRecipe<
  TSlot extends string,
  TVariants extends NativeRecipeVariantsConfig,
> = {
  readonly [TVariant in keyof TVariants]: {
    readonly [TValue in keyof TVariants[TVariant]]: Readonly<
      Partial<Record<TSlot, NativeRecipeStyleInput>>
    >
  }
}

/**
 * Define a multi-slot component style contract with one shared variant map.
 * Each authored slot branch is captured for its declared native primitive.
 */
export function componentRecipe<
  const TSlots extends NativeComponentSlots,
  const TVariants extends NativeComponentVariantsConfig<TSlots>,
>(
  config: NativeComponentRecipeConfig<TSlots, TVariants>,
  debugId?: string,
): NativeComponentRecipe<TSlots, TVariants> {
  assertPlainRecord(config, "component recipe")
  const slots = validateSlots(config.slots)
  const baseInput = config.base === undefined
    ? undefined
    : validateSlotStyles(config.base, slots, "base")
  const validatedVariants = validateVariants(config.variants, slots)
  const variantValues = selectionValues(validatedVariants)
  const defaultVariants = validateSelection(
    config.defaultVariants === undefined ? {} : config.defaultVariants,
    variantValues,
    `${componentName(debugId)} default variants`,
  )
  const validatedCompounds = validateCompounds(
    config.compoundVariants === undefined ? [] : config.compoundVariants,
    variantValues,
    slots,
    debugId,
  )

  // Run structural validation before handing any branch to vanilla-extract so
  // malformed declarations fail without leaving partially authored CSS state.
  const base = baseInput === undefined
    ? undefined
    : authorSlotStyles(baseInput, slots, debugId, "base")
  const variants = authorVariants(validatedVariants, slots, debugId)
  const compoundVariants = authorCompoundVariants(validatedCompounds, slots, debugId)

  return Object.freeze({
    $$type: NativeComponentRecipeType,
    version: NativeComponentRecipeVersion,
    ...(debugId === undefined ? {} : {$$debugName: debugId}),
    slots,
    ...(base === undefined ? {} : {base}),
    variants,
    defaultVariants,
    compoundVariants,
  }) as NativeComponentRecipe<TSlots, TVariants>
}

/**
 * Wrap an existing view recipe in one named slot without reauthoring its
 * compiled class references or changing its selection model.
 */
export function componentRecipeFromRecipe<
  const TSlot extends string,
  TVariants extends NativeRecipeVariantsConfig,
>(
  recipe: NativeRecipe<TVariants>,
  options: {readonly slot: TSlot; readonly debugId?: string},
): NativeComponentRecipe<
  Readonly<Record<TSlot, "view">>,
  NativeComponentVariantsFromRecipe<TSlot, TVariants>
> {
  if (typeof options?.slot !== "string" || options.slot.length === 0) {
    throw new TypeError("Component recipe migration slot name must be non-empty")
  }
  const slots = Object.freeze({[options.slot]: "view" as const}) as Readonly<Record<TSlot, "view">>
  const base = recipe.base === undefined
    ? undefined
    : freezeRecord([[options.slot, freezeLegacyClassReference(recipe.base)]]) as NativeComponentResolvedSlotStyles<Readonly<Record<TSlot, "view">>>
  const variants = freezeRecord(Object.entries(recipe.variants ?? {}).map(([name, values]) => [
    name,
    freezeRecord(Object.entries(values).map(([value, style]) => [
      value,
      freezeRecord([[options.slot, freezeLegacyClassReference(style as NativeStyle)]]),
    ])),
  ]))
  const compoundVariants = Object.freeze((recipe.compoundVariants ?? []).map(compound => Object.freeze({
    variants: Object.freeze({...compound.variants}),
    styles: freezeRecord([[options.slot, freezeLegacyClassReference(compound.style)]]),
  })))
  return Object.freeze({
    $$type: NativeComponentRecipeType,
    version: NativeComponentRecipeVersion,
    ...((options.debugId ?? recipe.$$debugName) === undefined
      ? {}
      : {$$debugName: options.debugId ?? recipe.$$debugName}),
    slots,
    ...(base === undefined ? {} : {base}),
    variants,
    defaultVariants: Object.freeze({...recipe.defaultVariants}),
    compoundVariants,
  }) as unknown as NativeComponentRecipe<
    Readonly<Record<TSlot, "view">>,
    NativeComponentVariantsFromRecipe<TSlot, TVariants>
  >
}

function validateSlots(value: unknown): NativeComponentSlots {
  const entries = recordEntries(value, "component recipe slots")
  if (entries.length === 0) throw new TypeError("Component recipe must define at least one slot")
  for (const [name, kind] of entries) {
    if (name.length === 0) throw new TypeError("Component recipe slot names must be non-empty")
    if (kind !== "view" && kind !== "text" && kind !== "image") {
      throw new TypeError(`Component recipe slot "${name}" has invalid primitive kind ${JSON.stringify(kind)}`)
    }
  }
  return freezeRecord(entries) as NativeComponentSlots
}

function validateVariants(value: unknown, slots: NativeComponentSlots): ValidatedVariants {
  const variants: Array<readonly [string, ReadonlyArray<readonly [string, ValidatedSlotStyles]>]> = []
  for (const [variantName, variantValues] of recordEntries(value, "component recipe variants")) {
    if (variantName.length === 0) throw new TypeError("Component recipe variant names must be non-empty")
    const values: Array<readonly [string, ValidatedSlotStyles]> = []
    for (const [valueName, branch] of recordEntries(variantValues, `component recipe variant "${variantName}"`)) {
      if (valueName.length === 0) throw new TypeError(`Component recipe variant "${variantName}" values must be non-empty`)
      values.push([valueName, validateSlotStyles(branch, slots, `variant "${variantName}" value "${valueName}"` )])
    }
    if (values.length === 0) throw new TypeError(`Component recipe variant "${variantName}" must define at least one value`)
    variants.push([variantName, values])
  }
  return variants
}

function selectionValues(variants: ValidatedVariants): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
  return Object.fromEntries(variants.map(([name, values]) => [
    name,
    Object.fromEntries(values.map(([value]) => [value, true])),
  ]))
}

function authorVariants(
  value: ValidatedVariants,
  slots: NativeComponentSlots,
  debugId: string | undefined,
): Readonly<Record<string, Readonly<Record<string, NativeComponentResolvedSlotStyles<NativeComponentSlots>>>>> {
  return freezeRecord(value.map(([variantName, variantValues]) => [
    variantName,
    freezeRecord(variantValues.map(([valueName, branch]) => [valueName, authorSlotStyles(
        branch,
        slots,
        debugId,
        "variant",
        variantName,
        valueName,
      )]))
  ])) as Readonly<Record<string, Readonly<Record<string, NativeComponentResolvedSlotStyles<NativeComponentSlots>>>>>
}

function validateSlotStyles(
  value: unknown,
  slots: NativeComponentSlots,
  context: string,
): ValidatedSlotStyles {
  return recordEntries(value, `component recipe ${context} slot styles`).map(([slot, rule]) => {
    if (slots[slot] === undefined) {
      throw new TypeError(`Component recipe ${context} references unknown slot ${JSON.stringify(slot)}`)
    }
    return [slot, rule] as const
  })
}

function authorSlotStyles(
  entries: ValidatedSlotStyles,
  slots: NativeComponentSlots,
  debugId: string | undefined,
  branchKind: string,
  ...segments: ReadonlyArray<string>
): NativeComponentResolvedSlotStyles<NativeComponentSlots> {
  const result: Array<readonly [string, NativeComponentStyleReference]> = []
  entries.forEach(([slot, rule], index) => {
    const kind = slots[slot]
    if (kind === undefined) throw new TypeError(`Component recipe ${branchKind} references unknown slot ${JSON.stringify(slot)}`)
    const slotDebugId = debugId === undefined ? undefined : `${debugId}.${slot}`
    const className = authorNativeStyle(
      rule,
      [kind],
      componentDebugId(slotDebugId, "slot", branchKind, ...segments, String(index)),
    )
    result.push([slot, componentStyleReference(className)])
  })
  return freezeRecord(result) as unknown as NativeComponentResolvedSlotStyles<NativeComponentSlots>
}

function validateCompounds(
  value: unknown,
  variants: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  slots: NativeComponentSlots,
  debugId: string | undefined,
): ReadonlyArray<ValidatedCompound> {
  if (!Array.isArray(value)) throw new TypeError("Component recipe compound variants must be an array")
  return Object.freeze(value.map((compound, index) => {
    assertPlainRecord(compound, `component recipe compound variant ${index}`)
    const keys = Object.keys(compound)
    if (keys.some(key => key !== "variants" && key !== "styles")) {
      throw new TypeError(`Component recipe compound variant ${index} has an unknown field`)
    }
    const selection = validateSelection(
      compound.variants ?? {}, variants,
      `${componentName(debugId)} compound variant ${index}`,
      "selection",
    )
    const styles = validateSlotStyles(compound.styles, slots, `compound variant ${index}`)
    return Object.freeze({selection, styles})
  }))
}

function authorCompoundVariants(
  compounds: ReadonlyArray<ValidatedCompound>,
  slots: NativeComponentSlots,
  debugId: string | undefined,
): ReadonlyArray<NativeComponentCompoundVariant<NativeComponentSlots, NativeComponentVariantsShape>> {
  return Object.freeze(compounds.map((compound, index) => Object.freeze({
    variants: compound.selection,
    styles: authorSlotStyles(compound.styles, slots, debugId, "compound", String(index)),
  }))) as ReadonlyArray<NativeComponentCompoundVariant<NativeComponentSlots, NativeComponentVariantsShape>>
}

function validateSelection(
  value: unknown,
  variants: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  context: string,
  valueLabel = "default",
): Readonly<Record<string, string | boolean>> {
  const entries: Array<readonly [string, string | boolean]> = []
  for (const [variantName, selectedValue] of recordEntries(value, context)) {
    const values = variants[variantName]
    if (values === undefined) throw new TypeError(`${context} references unknown variant ${JSON.stringify(variantName)}`)
    if (typeof selectedValue !== "string" && typeof selectedValue !== "boolean") {
      throw new TypeError(`${context} values must be strings or booleans`)
    }
    const key = String(selectedValue)
    if (!Object.hasOwn(values, key)) {
      throw new TypeError(`${context} ${valueLabel} value ${JSON.stringify(selectedValue)} is not defined for variant ${JSON.stringify(variantName)}`)
    }
    entries.push([variantName, selectedValue])
  }
  return freezeRecord(entries) as Readonly<Record<string, string | boolean>>
}

function componentStyleReference(className: string): NativeComponentStyleReference {
  const reference = {
    $$type: NativeRecipeClassType,
    className,
  }
  Object.defineProperty(reference, NativeRecipeClassSymbol, {value: true, enumerable: true})
  return Object.freeze(reference)
}

function freezeLegacyClassReference(style: NativeStyle): NativeStyle {
  if (typeof style === "object" && style !== null &&
    "$$type" in style && style.$$type === NativeRecipeClassType) {
    Object.freeze(style)
  }
  return style
}

function recordEntries(value: unknown, context: string): Array<[string, unknown]> {
  assertPlainRecord(value, context)
  return Object.entries(value as Record<string, unknown>)
}

function assertPlainRecord(value: unknown, context: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be a plain data record`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${context} must be a plain data record`)
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

function freezeRecord(entries: Iterable<readonly [string, unknown]>): Readonly<Record<string, unknown>> {
  return Object.freeze(Object.fromEntries(entries))
}

function componentName(debugId: string | undefined): string {
  return debugId === undefined ? "Component recipe" : `Component recipe "${debugId}"`
}

function componentDebugId(debugId: string | undefined, ...segments: ReadonlyArray<string>): string | undefined {
  return debugId === undefined ? undefined : [debugId, ...segments].join("_")
}
