import {authorNativeStyle} from "../native-authoring"
import {NativeRecipeClassSymbol} from "../native-style-map"
import {getThemeTokenVisibility, isRegisteredThemeVar, type ThemeVar} from "../theme-token"
import {NativeComponentRecipeExtensionType, NativeComponentRecipeExtensionVersion} from "../native-tags"
import type {
  NativeComponentContract,
  NativeComponentContractIdentity,
  NativeComponentRecipeDescriptor,
  NativeComponentPublicProps,
  NativeComponentSlotStyles,
  NativeComponentSlots,
} from "./index"
import type {
  NativeComponentExtensionVariants,
  NativeComponentRecipeExtensionDescriptor,
  NativeComponentRecipeExtensionTypeDetails,
} from "./extension-contract"
import {
  validateNativeComponentRecipeExtensionChain,
  validateNativeComponentRecipeExtensionDraft,
} from "./extension-contract"

type ContractOf<TBase> = TBase extends {readonly contract: infer TContract extends NativeComponentContract}
  ? TContract
  : never
type SlotsOf<TBase> = TBase extends {readonly slots: infer TSlots extends NativeComponentSlots}
  ? TSlots
  : NativeComponentSlots
type SlotStylePermission<TBase> = ContractOf<TBase> extends {
  readonly extensionPoints?: {readonly slotStyles?: ReadonlyArray<infer TSlot>}
} ? Extract<TSlot, keyof SlotsOf<TBase> & string> : never
type PermittedExtensionSlots<TBase> = Pick<SlotsOf<TBase>, SlotStylePermission<TBase>>
type PublicVariantAxes<TBase> = ContractOf<TBase> extends {
  readonly public: {readonly variants: infer TVariants}
} ? Extract<keyof TVariants, string> : never
type DefaultVariantAxes<TBase> = ContractOf<TBase> extends {
  readonly extensionPoints?: {readonly defaults?: ReadonlyArray<infer TAxis>}
} ? Extract<TAxis, string> : never
type AddVariantAxes<TBase> = ContractOf<TBase> extends {
  readonly extensionPoints?: {readonly variantValues?: ReadonlyArray<infer TAxis>}
} ? Extract<TAxis, string> : never

export type NativeComponentRecipeExtensionConfig<
  TBase extends NativeComponentRecipeDescriptor = NativeComponentRecipeDescriptor,
> = {
  readonly identity: NativeComponentContractIdentity
  readonly defaultVariants?: Partial<Record<DefaultVariantAxes<TBase>, string | boolean>>
  readonly variants?: Partial<Record<
    AddVariantAxes<TBase>,
    Readonly<Record<string, NativeComponentSlotStyles<PermittedExtensionSlots<TBase>>>>
  >>
  readonly compoundVariants?: ReadonlyArray<{
    readonly variants: Partial<Record<PublicVariantAxes<TBase>, string | boolean>>
    readonly styles: NativeComponentSlotStyles<PermittedExtensionSlots<TBase>>
  }>
  readonly slotOverrides?: NativeComponentSlotStyles<PermittedExtensionSlots<TBase>>
}

type AddedVariantsOf<TConfig> = TConfig extends {readonly variants: infer TVariants extends NativeComponentExtensionVariants}
  ? TVariants
  : Readonly<Record<never, never>>
type AddedVariantsFromPrior<TPrior extends ReadonlyArray<unknown>> =
  UnionToIntersection<TPrior[number] extends infer TExtension
    ? NativeComponentRecipeExtensionTypeDetails<TExtension> extends {readonly variants: infer TVariants}
      ? TVariants
      : Readonly<Record<never, never>>
    : never>
type EmptyExtensionDefaults = Readonly<Record<never, never>>
type AddedDefaultsOf<TConfig> = TConfig extends {
  readonly defaultVariants: infer TDefaults extends Readonly<Record<string, string | boolean>>
} ? TDefaults : EmptyExtensionDefaults
type AddedDefaultsFromPrior<TPrior extends ReadonlyArray<unknown>> =
  TPrior extends readonly [...ReadonlyArray<unknown>, infer TLast]
    ? NativeComponentRecipeExtensionTypeDetails<TLast> extends {
      readonly defaultVariants: infer TDefaults extends Readonly<Record<string, string | boolean>>
    }
      ? TDefaults
      : EmptyExtensionDefaults
    : EmptyExtensionDefaults
type MergeVariantMaps<TLeft, TRight> = Simplify<{
  readonly [TAxis in keyof TLeft | keyof TRight]:
    (TAxis extends keyof TLeft ? TLeft[TAxis] : Readonly<Record<never, never>>) &
    (TAxis extends keyof TRight ? TRight[TAxis] : Readonly<Record<never, never>>)
}>
type MergeDefaultMaps<
  TLeft extends Readonly<Record<string, string | boolean>>,
  TRight extends Readonly<Record<string, string | boolean>>,
> = Simplify<Omit<TLeft, keyof TRight> & TRight>
type UnionToIntersection<TUnion> =
  (TUnion extends unknown ? (value: TUnion) => void : never) extends (value: infer TIntersection) => void
    ? TIntersection
    : Readonly<Record<never, never>>
type Simplify<T> = {[K in keyof T]: T[K]}

/**
 * Author a separate, immutable extension descriptor. The base recipe remains
 * authoritative; extensions can only use operations declared in its v3 contract.
 */
export function extendComponentRecipe<
  const TBase extends NativeComponentRecipeDescriptor & {
    readonly version: 3
    readonly contract: NativeComponentContract
  },
  const TConfig extends NativeComponentRecipeExtensionConfig<TBase>,
  const TPrior extends ReadonlyArray<NativeComponentRecipeExtensionDescriptor<TBase, any, any, any>> = readonly [],
>(
  base: TBase,
  config: TConfig,
  priorExtensions: TPrior = [] as unknown as TPrior,
): NativeComponentRecipeExtensionDescriptor<
  TBase,
  AddedVariantsOf<TConfig>,
  MergeVariantMaps<AddedVariantsFromPrior<TPrior>, AddedVariantsOf<TConfig>>,
  MergeDefaultMaps<AddedDefaultsFromPrior<TPrior>, AddedDefaultsOf<TConfig>>
> {
  const draft = validateNativeComponentRecipeExtensionDraft(base, config, priorExtensions)
  assertExtensionStyleTokensArePublic(draft)

  const slots = base.slots
  const debugPrefix = `${base.$$debugName ?? "component"}_${draft.identity.name}`
  const variants = Object.freeze(Object.fromEntries(Object.entries(draft.variants).map(([axis, values]) => [
    axis,
    Object.freeze(Object.fromEntries(Object.entries(values).map(([value, styles]) => [
      value,
      authorSlotStyles(styles, slots, `${debugPrefix}_variant_${axis}_${value}`),
    ]))),
  ]))) as AddedVariantsOf<TConfig>
  const compoundVariants = Object.freeze(draft.compoundVariants.map((compound, index) => Object.freeze({
    variants: compound.variants,
    styles: authorSlotStyles(compound.styles, slots, `${debugPrefix}_compound_${index}`),
  })))
  const slotOverrides = authorSlotStyles(draft.slotOverrides, slots, `${debugPrefix}_override`)
  const descriptor = Object.freeze({
    $$type: NativeComponentRecipeExtensionType,
    version: NativeComponentRecipeExtensionVersion,
    identity: draft.identity,
    componentIdentity: draft.componentIdentity,
    ...(draft.parentExtensionIdentity === undefined
      ? {}
      : {parentExtensionIdentity: draft.parentExtensionIdentity}),
    defaultVariants: draft.defaultVariants,
    variants,
    compoundVariants,
    slotOverrides,
  }) as unknown as NativeComponentRecipeExtensionDescriptor<
    TBase,
    AddedVariantsOf<TConfig>,
    MergeVariantMaps<AddedVariantsFromPrior<TPrior>, AddedVariantsOf<TConfig>>,
    MergeDefaultMaps<AddedDefaultsFromPrior<TPrior>, AddedDefaultsOf<TConfig>>
  >

  validateNativeComponentRecipeExtensionChain(base, [...priorExtensions, descriptor])
  return descriptor
}

/** The consumer selection type after applying every extension in a chain. */
export type NativeComponentExtensionPublicProps<TExtension> =
  NativeComponentPublicProps<TExtension>

function authorSlotStyles(
  styles: Readonly<Record<string, unknown>>,
  slots: NativeComponentSlots,
  debugPrefix: string,
): Readonly<Record<string, Readonly<Record<string, unknown>>>> {
  const references: Array<readonly [string, Readonly<Record<string, unknown>>]> = []
  let index = 0
  for (const [slot, rule] of Object.entries(styles)) {
    const kind = slots[slot]
    if (kind !== "view" && kind !== "text" && kind !== "image") {
      throw new TypeError(`Component recipe extension references unknown slot ${JSON.stringify(slot)}`)
    }
    const className = authorNativeStyle(rule, [kind], `${debugPrefix}_${slot}_${index}`)
    const reference: Record<string | symbol, unknown> = {
      $$type: "crumbs.css.class",
      className,
    }
    Object.defineProperty(reference, NativeRecipeClassSymbol, {value: true, enumerable: true})
    references.push([slot, Object.freeze(reference)])
    index += 1
  }
  return Object.freeze(Object.fromEntries(references))
}

function assertExtensionStyleTokensArePublic(draft: {
  readonly variants: NativeComponentExtensionVariants
  readonly compoundVariants: ReadonlyArray<{readonly styles: Readonly<Record<string, unknown>>}>
  readonly slotOverrides: Readonly<Record<string, unknown>>
}): void {
  for (const values of Object.values(draft.variants)) {
    for (const styles of Object.values(values)) assertStyleTokensArePublic(styles)
  }
  for (const compound of draft.compoundVariants) assertStyleTokensArePublic(compound.styles)
  assertStyleTokensArePublic(draft.slotOverrides)
}

function assertStyleTokensArePublic(value: unknown, ancestors = new Set<object>()): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(/var\(\s*(--crumbs-[A-Za-z0-9_-]+)(?=[\s,)])/g)) {
      const token = `var(${match[1]})` as ThemeVar
      if (!isRegisteredThemeVar(token)) {
        throw new TypeError("Component recipe extensions cannot reference unregistered theme tokens")
      }
      if (getThemeTokenVisibility(token) !== "public") {
        throw new TypeError("Component recipe extensions cannot reference private theme tokens")
      }
    }
    return
  }
  if (typeof value !== "object" || value === null) return
  if (ancestors.has(value)) throw new TypeError("Component recipe extension styles cannot contain a cycle")
  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      for (const item of value) assertStyleTokensArePublic(item, ancestors)
      return
    }
    for (const item of Object.values(value)) assertStyleTokensArePublic(item, ancestors)
  } finally {
    ancestors.delete(value)
  }
}
