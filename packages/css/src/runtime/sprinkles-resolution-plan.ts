import type { NativePrimitiveKind } from "../compiler/native-capture"
import type { NativeStyle } from "../native-style"
import {
  NativeSprinklesLookupPlanType,
  NativeSprinklesLookupPlanVersion,
} from "../native-tags"
import type {
  NativeSprinklesLookupPlan,
  NativeSprinklesSelection,
} from "../sprinkles"

export type NativeSprinklesResolutionPlan<
  TProperties extends object = object,
  TShorthands extends Readonly<Record<string, readonly string[]>> = Readonly<Record<string, readonly string[]>>,
> = {
  readonly $$type: typeof NativeSprinklesLookupPlanType
  readonly version: typeof NativeSprinklesLookupPlanVersion
  readonly primitives: readonly [NativePrimitiveKind, ...NativePrimitiveKind[]]
  readonly properties: Readonly<Record<string, Readonly<Record<string, NativeStyle>>>>
  readonly shorthands: Readonly<Record<string, readonly string[]>>
  readonly selectionKeys: ReadonlyArray<keyof TProperties | keyof TShorthands>
}

export type NativeSprinklesResolutionSelection<
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
> = NativeSprinklesSelection<TProperties, TShorthands>

const nativePrimitiveKinds = new Set<NativePrimitiveKind>(["view", "text", "image"])

export function createSprinklesResolutionPlan<
  TPrimitives extends readonly [NativePrimitiveKind, ...NativePrimitiveKind[]],
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
>(
  lookup: NativeSprinklesLookupPlan<TPrimitives, TProperties, TShorthands>,
): NativeSprinklesResolutionPlan<TProperties, TShorthands> {
  if (!isRecord(lookup) || lookup.$$type !== NativeSprinklesLookupPlanType) {
    throw new TypeError("Invalid native Sprinkles lookup plan type")
  }
  if (lookup.version !== NativeSprinklesLookupPlanVersion) {
    throw new TypeError(`Unsupported native Sprinkles lookup plan version ${String(lookup.version)}`)
  }
  const primitives = validatePrimitives(lookup.primitives)
  const properties = validateProperties(lookup.properties)
  const shorthands = validateShorthands(lookup.shorthands, properties)
  const selectionKeys = Object.freeze([
    ...Object.keys(properties),
    ...Object.keys(shorthands),
  ]) as ReadonlyArray<keyof TProperties | keyof TShorthands>

  return Object.freeze({
    $$type: NativeSprinklesLookupPlanType,
    version: NativeSprinklesLookupPlanVersion,
    primitives,
    properties,
    shorthands,
    selectionKeys,
  }) as NativeSprinklesResolutionPlan<TProperties, TShorthands>
}

export function resolveSprinklesLookupPlan<
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
>(
  plan: NativeSprinklesResolutionPlan<TProperties, TShorthands>,
  selection: NativeSprinklesResolutionSelection<TProperties, TShorthands> = {},
): ReadonlyArray<NativeStyle> {
  validateSprinklesSelection(plan, selection)
  const styles: Array<NativeStyle> = []
  for (const name of Object.keys(selection)) {
    const selectedScale = selection[name]
    if (selectedScale === undefined || selectedScale === null || selectedScale === false) continue
    const targets = getSelectionTargets(plan, name)
    if (targets === undefined) continue
    for (const target of targets) {
      const scale = plan.properties[target]
      const style = scale?.[selectedScale as string]
      if (style === undefined) {
        throw new TypeError(`Native Sprinkles runtime plan is missing ${target}.${String(selectedScale)}`)
      }
      styles.push(style)
    }
  }
  return Object.freeze(styles)
}

/** Validate a runtime selection before consulting a resolver cache. */
export function validateSprinklesSelection<
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
>(
  plan: NativeSprinklesResolutionPlan<TProperties, TShorthands>,
  selection: NativeSprinklesResolutionSelection<TProperties, TShorthands>,
): void {
  if (!isRecord(selection)) throw new TypeError("Native Sprinkles runtime selection must be a record")
  for (const name of Object.keys(selection)) {
    const selectedScale = selection[name]
    if (selectedScale === undefined || selectedScale === null || selectedScale === false) continue
    if (typeof selectedScale !== "string") {
      throw new TypeError(`Native Sprinkles runtime selection ${name} must use a scale name`)
    }
    const targets = getSelectionTargets(plan, name)
    if (targets === undefined) throw new TypeError(`Unknown native Sprinkles runtime selection ${name}`)
    for (const target of targets) {
      const scale = plan.properties[target]
      if (scale === undefined || !Object.hasOwn(scale, selectedScale)) {
        throw new TypeError(`Native Sprinkles runtime scale ${JSON.stringify(selectedScale)} is not defined for ${target}`)
      }
      if (scale[selectedScale] === undefined) {
        throw new TypeError(`Native Sprinkles runtime plan is missing ${target}.${selectedScale}`)
      }
    }
  }
}

export function canonicalSprinklesSelectionKey(
  selection: Readonly<Record<string, unknown>>,
): string {
  return Object.keys(selection)
    .filter((name) => selection[name] !== undefined && selection[name] !== null && selection[name] !== false)
    .map((name) => {
      const value = selection[name]
      return `${name.length}:${name}=${typeof value === "string" ? `s${value.length}:${value}` : String(value)}`
    })
    .join("|")
}

function getSelectionTargets<
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
>(
  plan: NativeSprinklesResolutionPlan<TProperties, TShorthands>,
  name: string,
): readonly string[] | undefined {
  return Object.hasOwn(plan.properties, name)
    ? [name]
    : Object.hasOwn(plan.shorthands, name) ? plan.shorthands[name]
      : undefined
}

function validatePrimitives(value: unknown): readonly [NativePrimitiveKind, ...NativePrimitiveKind[]] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("Native Sprinkles lookup plan requires a primitive domain")
  }
  const seen = new Set<NativePrimitiveKind>()
  for (const primitive of value) {
    if (typeof primitive !== "string" || !nativePrimitiveKinds.has(primitive as NativePrimitiveKind)) {
      throw new TypeError(`Unknown native Sprinkles primitive kind ${JSON.stringify(primitive)}`)
    }
    if (seen.has(primitive as NativePrimitiveKind)) {
      throw new TypeError(`Duplicate native Sprinkles primitive kind ${JSON.stringify(primitive)}`)
    }
    seen.add(primitive as NativePrimitiveKind)
  }
  return Object.freeze([...value] as [NativePrimitiveKind, ...NativePrimitiveKind[]])
}

function validateProperties(value: unknown): Readonly<Record<string, Readonly<Record<string, NativeStyle>>>> {
  if (!isRecord(value)) throw new TypeError("Native Sprinkles lookup plan properties must be a record")
  const properties: Record<string, Readonly<Record<string, NativeStyle>>> = {}
  for (const [property, scaleValue] of Object.entries(value)) {
    if (!isRecord(scaleValue)) throw new TypeError(`Native Sprinkles lookup plan scale for ${property} must be a record`)
    const scale: Record<string, NativeStyle> = {}
    for (const [name, style] of Object.entries(scaleValue)) {
      if (!isRuntimeStyleReference(style)) {
        throw new TypeError(`Native Sprinkles lookup plan entry ${property}.${name} must be a style reference`)
      }
      scale[name] = style as NativeStyle
    }
    properties[property] = Object.freeze(scale)
  }
  return Object.freeze(properties)
}

function validateShorthands(
  value: unknown,
  properties: Readonly<Record<string, Readonly<Record<string, NativeStyle>>>>,
): Readonly<Record<string, readonly string[]>> {
  if (!isRecord(value)) throw new TypeError("Native Sprinkles lookup plan shorthands must be a record")
  const shorthands: Record<string, readonly string[]> = {}
  for (const [name, targetValue] of Object.entries(value)) {
    if (!Array.isArray(targetValue) || targetValue.length === 0 || targetValue.some((target) => typeof target !== "string")) {
      throw new TypeError(`Native Sprinkles lookup plan shorthand ${name} must target one or more properties`)
    }
    const targets = [...targetValue] as string[]
    if (new Set(targets).size !== targets.length) {
      throw new TypeError(`Native Sprinkles lookup plan shorthand ${name} contains duplicate targets`)
    }
    for (const target of targets) {
      if (!Object.hasOwn(properties, target)) {
        throw new TypeError(`Native Sprinkles lookup plan shorthand ${name} targets missing property ${target}`)
      }
    }
    shorthands[name] = Object.freeze(targets)
  }
  return Object.freeze(shorthands)
}

function isRuntimeStyleReference(value: unknown): boolean {
  return (typeof value === "object" && value !== null) || typeof value === "number" || typeof value === "string"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
