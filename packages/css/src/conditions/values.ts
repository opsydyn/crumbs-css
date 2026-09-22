import type {
  NativeConditionBranch,
  NativeConditionMatcher,
} from "./index"

/**
 * Condition names are ordered so responsive tuples have a finite, reviewable
 * meaning. `default` must be the first name and represents the unqualified
 * branch.
 */
export type NativeConditionNameList = readonly ["default", ...string[]]

export type NativeConditionalRecord<
  TValue,
  TConditions extends readonly string[],
> = Readonly<Partial<Record<TConditions[number], TValue | null | undefined>>> & {
  readonly length?: never
}

/** A bounded tuple whose positions correspond to the configured condition names. */
export type NativeConditionalTuple<
  TValue,
  TConditions extends readonly string[],
> = {
  readonly [K in keyof TConditions]: TValue | null | undefined
}

type NativeConditionalScalar<TValue> = TValue extends readonly unknown[] ? never : TValue

export type NativeConditionalValue<
  TValue,
  TConditions extends NativeConditionNameList,
> = NativeConditionalScalar<TValue>
  | NativeConditionalRecord<TValue, TConditions>
  | NativeConditionalTuple<TValue, TConditions>

export type NativeNormalizedConditionalValue<
  TValue,
  TConditions extends readonly string[],
> = Readonly<Partial<Record<TConditions[number], TValue>>>

export type NativeConditionDefinitions<
  TConditions extends NativeConditionNameList,
> = Readonly<Record<TConditions[number], NativeConditionMatcher>>

export const NATIVE_RESPONSIVE_CONDITION_NAMES = [
  "default",
  "compact",
  "medium",
  "expanded",
] as const satisfies NativeConditionNameList

export const NATIVE_RESPONSIVE_CONDITION_MATCHERS = Object.freeze({
  default: Object.freeze({}),
  compact: Object.freeze({widthBucket: "compact"}),
  medium: Object.freeze({widthBucket: "medium"}),
  expanded: Object.freeze({widthBucket: "expanded"}),
} as const satisfies NativeConditionDefinitions<typeof NATIVE_RESPONSIVE_CONDITION_NAMES>)

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function validateConditionNames<TConditions extends NativeConditionNameList>(
  conditions: TConditions,
): Readonly<TConditions> {
  if (conditions.length === 0 || conditions[0] !== "default") {
    throw new TypeError('native condition names must start with "default"')
  }
  if (conditions.some((condition) => typeof condition !== "string" || condition.length === 0)) {
    throw new TypeError("native condition names must be non-empty strings")
  }
  if (new Set(conditions).size !== conditions.length) {
    throw new TypeError("native condition names must be unique")
  }
  return Object.freeze([...conditions]) as Readonly<TConditions>
}

function canonicalize<TValue, TConditions extends NativeConditionNameList>(
  conditions: Readonly<TConditions>,
  value: unknown,
): NativeNormalizedConditionalValue<TValue, TConditions> {
  const conditionSet = new Set<string>(conditions)
  const output: Record<string, TValue> = {}

  const add = (condition: string, candidate: unknown): void => {
    if (candidate === null || candidate === undefined) return
    output[condition] = candidate as TValue
  }

  if (Array.isArray(value)) {
    if (value.length > conditions.length) {
      throw new TypeError(`responsive tuple has at most ${conditions.length} entries`)
    }
    for (let index = 0; index < value.length; index += 1) {
      add(conditions[index] as string, value[index])
    }
  } else if (isRecord(value)) {
    for (const key of Object.keys(value)) {
      if (!conditionSet.has(key)) throw new TypeError(`Unsupported native condition name: ${key}`)
    }
    for (const condition of conditions) {
      if (Object.prototype.hasOwnProperty.call(value, condition)) {
        add(condition, value[condition])
      }
    }
  } else {
    add("default", value)
  }

  return Object.freeze(output) as NativeNormalizedConditionalValue<TValue, TConditions>
}

export type NativeNormalizeValueFn<TConditions extends NativeConditionNameList> = {
  <TValue>(
    value: NativeConditionalRecord<TValue, TConditions>,
  ): NativeNormalizedConditionalValue<TValue, TConditions>
  <TValue>(
    value: NativeConditionalTuple<TValue, TConditions>,
  ): NativeNormalizedConditionalValue<TValue, TConditions>
  <TValue>(
    value: NativeConditionalScalar<TValue>,
  ): NativeNormalizedConditionalValue<TValue, TConditions>
}

/**
 * Create a finite conditional-value normalizer. Scalar values become the
 * `default` branch; records and bounded tuples are emitted in configured
 * condition order with nullish entries omitted.
 */
export function createNativeNormalizeValueFn<
  const TConditions extends NativeConditionNameList,
>(conditions: TConditions): NativeNormalizeValueFn<TConditions> {
  const names = validateConditionNames(conditions)
  return (<TValue>(value: NativeConditionalValue<TValue, TConditions>) =>
    canonicalize<TValue, TConditions>(names, value)) as NativeNormalizeValueFn<TConditions>
}

export type NativeConditionValueMapper<
  TValue,
  TOutput,
  TCondition extends string,
> = (value: TValue, condition: TCondition) => TOutput

export type NativeMapValueFn<TConditions extends NativeConditionNameList> = {
  <TValue, TOutput>(
    value: NativeConditionalRecord<TValue, TConditions>,
    mapper: NativeConditionValueMapper<TValue, TOutput, TConditions[number]>,
  ): NativeNormalizedConditionalValue<TOutput, TConditions>
  <TValue, TOutput>(
    value: NativeConditionalTuple<TValue, TConditions>,
    mapper: NativeConditionValueMapper<TValue, TOutput, TConditions[number]>,
  ): NativeNormalizedConditionalValue<TOutput, TConditions>
  <TValue, TOutput>(
    value: NativeConditionalScalar<TValue>,
    mapper: NativeConditionValueMapper<TValue, TOutput, TConditions[number]>,
  ): NativeNormalizedConditionalValue<TOutput, TConditions>
}

/**
 * Create a mapper that first canonicalises a conditional value and then maps
 * only present entries. The condition name is provided for diagnostics or
 * domain-specific mapping while output order stays deterministic.
 */
export function createNativeMapValueFn<
  const TConditions extends NativeConditionNameList,
>(conditions: TConditions): NativeMapValueFn<TConditions> {
  const names = validateConditionNames(conditions)
  return (<TValue, TOutput>(
    value: NativeConditionalValue<TValue, TConditions>,
    mapper: NativeConditionValueMapper<TValue, TOutput, TConditions[number]>,
  ) => {
    const normalized = canonicalize<TValue, TConditions>(names, value)
    const mapped: Record<string, TOutput> = {}
    for (const condition of names) {
      if (Object.prototype.hasOwnProperty.call(normalized, condition)) {
        mapped[condition] = mapper(
          (normalized as Partial<Record<string, TValue>>)[condition] as TValue,
          condition,
        )
      }
    }
    return Object.freeze(mapped) as NativeNormalizedConditionalValue<TOutput, TConditions>
  }) as NativeMapValueFn<TConditions>
}

/**
 * Attach finite matchers to a normalized value so it can be consumed by the
 * M6.1 condition resolver. Missing values do not create branches, preserving
 * fallback behaviour for snapshots with no matching declaration.
 */
export function mapNativeConditionValueToBranches<
  TValue,
  const TConditions extends NativeConditionNameList,
>(
  value: NativeConditionalRecord<TValue, TConditions>,
  definitions: NativeConditionDefinitions<TConditions>,
): ReadonlyArray<NativeConditionBranch<TValue>>
export function mapNativeConditionValueToBranches<
  TValue,
  const TConditions extends NativeConditionNameList,
>(
  value: NativeConditionalTuple<TValue, TConditions>,
  definitions: NativeConditionDefinitions<TConditions>,
): ReadonlyArray<NativeConditionBranch<TValue>>
export function mapNativeConditionValueToBranches<
  TValue,
  const TConditions extends NativeConditionNameList,
>(
  value: NativeConditionalScalar<TValue>,
  definitions: NativeConditionDefinitions<TConditions>,
): ReadonlyArray<NativeConditionBranch<TValue>>
export function mapNativeConditionValueToBranches<
  const TConditions extends NativeConditionNameList,
>(
  value: NativeConditionalValue<unknown, TConditions>,
  definitions: NativeConditionDefinitions<TConditions>,
): ReadonlyArray<NativeConditionBranch<unknown>> {
  const normalize = createNativeNormalizeValueFn(
    Object.keys(definitions) as unknown as TConditions,
  )
  const normalized = normalize(value)
  const names = Object.keys(definitions) as Array<TConditions[number]>
  if (names.length === 0 || names[0] !== "default") {
    throw new TypeError('native condition definitions must start with "default"')
  }
  if (new Set(names).size !== names.length) {
    throw new TypeError("native condition definitions must be unique")
  }
  for (const name of names) {
    if (!isRecord(definitions[name])) {
      throw new TypeError(`Condition matcher for ${name} must be an object`)
    }
  }
  const branches: Array<NativeConditionBranch<unknown>> = []
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(normalized, name)) {
      branches.push({when: definitions[name], value: normalized[name] as unknown})
    }
  }
  return Object.freeze(branches)
}
