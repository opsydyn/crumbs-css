import type { ImageStyle, TextStyle, ViewStyle } from "react-native"
import { markNativeCaptureRule, type NativePrimitiveDomain, type NativePrimitiveKind } from "../compiler/native-capture"
import type {
  NativeImageStyleInput,
  NativeStyle,
  NativeStyleRule,
  NativeStyleTokenDomainForProperty,
  NativeTextStyleInput,
  NativeViewStyleInput,
} from "../native-style"
import type { DomainThemeVar, LegacyNativeThemeVar } from "../theme-token"
import { style } from "../native-style"

const allNativePrimitives = ["view", "text", "image"] as const

type PrimitiveStyleInput<TPrimitive extends NativePrimitiveKind> =
  TPrimitive extends "view" ? NativeViewStyleInput
    : TPrimitive extends "text" ? NativeTextStyleInput
      : TPrimitive extends "image" ? NativeImageStyleInput
        : never

type PrimitiveInputUnion<TPrimitives extends NativePrimitiveDomain> =
  PrimitiveStyleInput<TPrimitives[number]>

/** Properties present on every primitive in a sprinkle definition. */
export type NativeSprinklePropertyKey<TPrimitives extends NativePrimitiveDomain> =
  keyof PrimitiveInputUnion<TPrimitives>

type PrimitiveValue<TPrimitive extends NativePrimitiveKind, TProperty extends PropertyKey> =
  TProperty extends keyof PrimitiveStyleInput<TPrimitive>
    ? NonNullable<PrimitiveStyleInput<TPrimitive>[TProperty]>
    : never

type SprinkleTokenValue<TProperty extends PropertyKey> =
  [NativeStyleTokenDomainForProperty<TProperty>] extends [never]
    ? never
    : DomainThemeVar<NativeStyleTokenDomainForProperty<TProperty>>

type DomainValue<TPrimitives extends NativePrimitiveDomain, TProperty extends PropertyKey> =
  NonNullable<PrimitiveValue<TPrimitives[number], TProperty>> | SprinkleTokenValue<TProperty>

type PropertyScale<TPrimitives extends NativePrimitiveDomain, TProperty extends PropertyKey> =
  Readonly<Record<string, DomainValue<TPrimitives, TProperty>>>

export type NativeSprinklePropertyConfig<TPrimitives extends NativePrimitiveDomain> = {
  readonly [TProperty in NativeSprinklePropertyKey<TPrimitives>]?:
    PropertyScale<TPrimitives, TProperty>
}

type PropertyName<TProperties> = Extract<keyof TProperties, string>
type ShorthandTarget<TProperties> = readonly [PropertyName<TProperties>, ...PropertyName<TProperties>[]]

export type NativeSprinkleShorthandConfig<TProperties> =
  Readonly<Record<string, ShorthandTarget<TProperties>>>

export type NativeSprinkleDefinition<
  TPrimitives extends NativePrimitiveDomain,
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
> = {
  readonly primitives: TPrimitives
  readonly properties: TProperties
  readonly shorthands: TShorthands
}

export type NativeSprinklesConfig<
  TPrimitives extends NativePrimitiveDomain,
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
> = {
  readonly primitives?: TPrimitives
  readonly properties: TProperties
  readonly shorthands?: TShorthands
}

type ScaleName<TScale> = Extract<keyof TScale, string>
type ShorthandScaleNames<TProperties, TTargets> = TTargets extends readonly (keyof TProperties & string)[]
  ? Extract<keyof TProperties[TTargets[number]], string>
  : never

export type NativeSprinklesSelection<
  TProperties extends object,
  TShorthands extends Readonly<Record<string, readonly string[]>>,
> = Partial<{
  readonly [TProperty in keyof TProperties]: TProperty extends keyof TProperties
    ? ScaleName<TProperties[TProperty]> | false | null | undefined
    : never
} & {
  readonly [TShorthand in keyof TShorthands]: ShorthandScaleNames<TProperties, TShorthands[TShorthand]>
    | false | null | undefined
}>

type NativeSprinkleResult<TPrimitives extends NativePrimitiveDomain> =
  TPrimitives extends readonly [infer TPrimitive extends NativePrimitiveKind]
    ? TPrimitive extends "view" ? ViewStyle
      : TPrimitive extends "text" ? TextStyle
        : ImageStyle
    : NativeStyle

type NativeSprinklePropertyMap = Readonly<Record<string, Readonly<Record<string, unknown>>>>

type ValidateTokenDomain<TValue, TProperty extends PropertyKey> =
  TValue extends DomainThemeVar<infer TDomain>
    ? [NativeStyleTokenDomainForProperty<TProperty>] extends [never]
      ? never
      : TDomain extends NativeStyleTokenDomainForProperty<TProperty> ? TValue : never
    : TValue extends LegacyNativeThemeVar ? TValue : TValue

type ValidateScaleValue<
  TPrimitives extends NativePrimitiveDomain,
  TProperty extends PropertyKey,
  TValue,
> = TValue extends DomainValue<TPrimitives, TProperty>
  ? ValidateTokenDomain<TValue, TProperty>
  : never

type ValidatedSprinkleProperties<
  TPrimitives extends NativePrimitiveDomain,
  TProperties extends NativeSprinklePropertyMap,
> = {
  readonly [TProperty in keyof TProperties]: TProperty extends NativeSprinklePropertyKey<TPrimitives>
    ? TProperties[TProperty] extends Readonly<Record<string, unknown>>
      ? { readonly [TName in keyof TProperties[TProperty]]: ValidateScaleValue<
        TPrimitives,
        TProperty,
        TProperties[TProperty][TName]
      > }
      : never
    : never
}

/**
 * Define a finite, typed native utility property set.
 *
 * Values are keyed by stable scale names and are checked against every
 * declared primitive. Omit `primitives` only for a shared view/text/image set.
 */
export function defineProperties<
  const TPrimitives extends NativePrimitiveDomain = typeof allNativePrimitives,
  const TProperties extends NativeSprinklePropertyMap = NativeSprinklePropertyMap,
  const TShorthands extends NativeSprinkleShorthandConfig<TProperties> = {},
>(
  config: NativeSprinklesConfig<TPrimitives, TProperties, TShorthands> & {
    readonly properties: TProperties & ValidatedSprinkleProperties<TPrimitives, TProperties>
  },
): NativeSprinkleDefinition<TPrimitives, TProperties, TShorthands> {
  const primitives = normalizePrimitives(config.primitives ?? allNativePrimitives)
  const properties = validateProperties(config.properties, primitives)
  const shorthands = validateShorthands(config.shorthands ?? {}, properties)
  return Object.freeze({
    primitives: Object.freeze(primitives) as TPrimitives,
    properties,
    shorthands,
  }) as unknown as NativeSprinkleDefinition<TPrimitives, TProperties, TShorthands>
}

export function createSprinkles<
  const TPrimitives extends NativePrimitiveDomain,
  const TProperties extends NativeSprinklePropertyMap,
  const TShorthands extends NativeSprinkleShorthandConfig<TProperties>,
>(
  definition: NativeSprinkleDefinition<TPrimitives, TProperties, TShorthands>,
): (
  selection: NativeSprinklesSelection<TProperties, TShorthands>,
  debugId?: string,
) => NativeSprinkleResult<TPrimitives> {
  const primitives = normalizePrimitives(definition.primitives)
  const properties = validateProperties(definition.properties, primitives)
  const shorthands = validateShorthands(definition.shorthands, properties)

  return ((selection: NativeSprinklesSelection<TProperties, TShorthands>, debugId?: string) => {
    const rule = resolveSelection(
      selection as Record<string, unknown>,
      properties as Readonly<Record<string, Readonly<Record<string, unknown>>>>,
      shorthands as Readonly<Record<string, readonly string[]>>,
    )
    const marked = markNativeCaptureRule(rule, primitives)
    return style(marked as NativeStyleRule, debugId) as NativeSprinkleResult<TPrimitives>
  }) as (
    selection: NativeSprinklesSelection<TProperties, TShorthands>,
    debugId?: string,
  ) => NativeSprinkleResult<TPrimitives>
}

function normalizePrimitives(value: readonly NativePrimitiveKind[]): NativePrimitiveDomain {
  if (value.length === 0) throw new TypeError("Native sprinkle definitions require at least one primitive kind")
  const seen = new Set<NativePrimitiveKind>()
  for (const primitive of value) {
    if (!allNativePrimitives.includes(primitive)) {
      throw new TypeError(`Unknown native sprinkle primitive kind ${JSON.stringify(primitive)}`)
    }
    if (seen.has(primitive)) throw new TypeError(`Duplicate native sprinkle primitive kind ${JSON.stringify(primitive)}`)
    seen.add(primitive)
  }
  return allNativePrimitives.filter(primitive => seen.has(primitive)) as unknown as NativePrimitiveDomain
}

function validateProperties<TProperties extends object>(
  properties: TProperties,
  primitives: NativePrimitiveDomain,
): TProperties {
  if (!isRecord(properties)) throw new TypeError("Native sprinkle properties must be a record")
  const copy: Record<string, Readonly<Record<string, unknown>>> = {}
  for (const [property, scale] of Object.entries(properties)) {
    if (property.length === 0) throw new TypeError("Native sprinkle property names must be non-empty")
    if (!isRecord(scale)) throw new TypeError(`Native sprinkle scale for ${property} must be a record`)
    const scaleCopy: Record<string, unknown> = {}
    for (const [name, value] of Object.entries(scale)) {
      if (name.length === 0) throw new TypeError(`Native sprinkle scale name for ${property} must be non-empty`)
      assertFiniteNativeValue(value, `properties.${property}.${name}`)
      scaleCopy[name] = value
    }
    copy[property] = Object.freeze(scaleCopy)
  }
  // Keep this check close to definition time for helpful diagnostics while
  // leaving the compiler's structured/scalar admission as the final oracle.
  if (primitives.length === 0) throw new TypeError("Native sprinkle definitions require a primitive domain")
  return Object.freeze(copy) as unknown as TProperties
}

function validateShorthands<TShorthands extends object>(
  shorthands: TShorthands,
  properties: object,
): TShorthands {
  if (!isRecord(shorthands)) throw new TypeError("Native sprinkle shorthands must be a record")
  const copy: Record<string, readonly string[]> = {}
  for (const [name, targets] of Object.entries(shorthands)) {
    if (name.length === 0) throw new TypeError("Native sprinkle shorthand names must be non-empty")
    if (Object.hasOwn(properties, name)) throw new TypeError(`Native sprinkle shorthand ${name} collides with a property scale`)
    if (!Array.isArray(targets) || targets.length === 0 || targets.some(target => typeof target !== "string")) {
      throw new TypeError(`Native sprinkle shorthand ${name} must target one or more properties`)
    }
    const uniqueTargets = new Set(targets)
    if (uniqueTargets.size !== targets.length) throw new TypeError(`Native sprinkle shorthand ${name} contains duplicate targets`)
    for (const target of targets) {
      if (!Object.hasOwn(properties, target)) {
        throw new TypeError(`Native sprinkle shorthand ${name} targets missing property ${target}`)
      }
    }
    copy[name] = Object.freeze([...targets])
  }
  return Object.freeze(copy) as unknown as TShorthands
}

function resolveSelection(
  selection: Record<string, unknown>,
  properties: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  shorthands: Readonly<Record<string, readonly string[]>>,
): Record<string, unknown> {
  if (!isRecord(selection)) throw new TypeError("Native sprinkle selection must be a record")
  const result: Record<string, unknown> = {}
  for (const name of Object.keys(selection)) {
    const selectedScale = selection[name]
    if (selectedScale === undefined || selectedScale === null || selectedScale === false) continue
    if (typeof selectedScale !== "string") {
      throw new TypeError(`Native sprinkle selection ${name} must use a scale name`)
    }
    const targets = Object.hasOwn(properties, name)
      ? [name]
      : Object.hasOwn(shorthands, name) ? shorthands[name]
        : undefined
    if (targets === undefined) throw new TypeError(`Unknown native sprinkle selection ${name}`)
    for (const target of targets) {
      const scale = properties[target]
      if (scale === undefined || !Object.hasOwn(scale, selectedScale)) {
        throw new TypeError(`Native sprinkle scale ${JSON.stringify(selectedScale)} is not defined for ${target}`)
      }
      // delete + set makes the final winner's authored position observable to
      // the native IR, so overlapping aliases and longhands are deterministic.
      delete result[target]
      result[target] = scale[selectedScale]
    }
  }
  return result
}

function assertFiniteNativeValue(value: unknown, path: string, seen = new Set<object>()): void {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`Native sprinkle value at ${path} must be finite`)
    return
  }
  if (typeof value === "string") {
    if (value.length === 0) throw new TypeError(`Native sprinkle value at ${path} must be non-empty`)
    return
  }
  if (typeof value === "boolean") return
  if (typeof value !== "object" || value === null) {
    throw new TypeError(`Native sprinkle value at ${path} must be a finite native value`)
  }
  if (seen.has(value)) throw new TypeError(`Native sprinkle value at ${path} must not be cyclic`)
  seen.add(value)
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !("value" in descriptor)) {
      throw new TypeError(`Native sprinkle value at ${path} must use data properties`)
    }
    assertFiniteNativeValue(descriptor.value, `${path}.${String(key)}`, seen)
  }
  seen.delete(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
