import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  createNativeConditionResolver,
  createNativeMapValueFn,
  createNativeNormalizeValueFn,
  mapNativeConditionValueToBranches,
  NATIVE_RESPONSIVE_CONDITION_MATCHERS,
  NATIVE_RESPONSIVE_CONDITION_NAMES,
  normalizeNativeConditionInput,
  type NativeConditionalValue,
} from "../src/conditions"

const normalize = createNativeNormalizeValueFn(NATIVE_RESPONSIVE_CONDITION_NAMES)
const mapValue = createNativeMapValueFn(NATIVE_RESPONSIVE_CONDITION_NAMES)

describe("native conditional values", () => {
  it("normalizes scalar, record, and responsive tuple forms to one canonical map", () => {
    const scalar = normalize(8)
    const record = normalize({
      expanded: 24,
      default: 8,
      medium: 16,
      compact: 12,
    })
    const tuple = normalize([8, 12, 16, 24])

    expect(scalar).toEqual({default: 8})
    expect(record).toEqual({default: 8, compact: 12, medium: 16, expanded: 24})
    expect(tuple).toEqual(record)
    expect(Object.isFrozen(record)).toBe(true)
    expect(Object.keys(record)).toEqual(["default", "compact", "medium", "expanded"])
  })

  it("omits nullish tuple entries and rejects values outside the finite condition set", () => {
    expect(normalize([8, null, undefined, 24])).toEqual({default: 8, expanded: 24})
    expect(() => normalize([8, 12, 16, 24, 32] as never)).toThrow(
      "responsive tuple has at most 4 entries",
    )
    expect(() => normalize({tablet: 16} as never)).toThrow(
      "Unsupported native condition name: tablet",
    )
  })

  it("maps every present value without changing canonical condition order", () => {
    const seen: string[] = []
    const mapped = mapValue(
      {default: 8, medium: 16},
      (value, condition) => {
        seen.push(condition)
        return `${condition}:${value}`
      },
    )

    expect(mapped).toEqual({
      default: "default:8",
      medium: "medium:16",
    })
    expect(seen).toEqual(["default", "medium"])
  })

  it("maps canonical values to M6.1 branches and resolves through finite snapshots", () => {
    const branches = mapNativeConditionValueToBranches(
      [8, 12, 16, 24],
      NATIVE_RESPONSIVE_CONDITION_MATCHERS,
    )
    const resolve = createNativeConditionResolver(branches, 0)

    expect(resolve(normalizeNativeConditionInput({width: 420}))).toBe(12)
    expect(resolve(normalizeNativeConditionInput({width: 700}))).toBe(16)
    expect(resolve(normalizeNativeConditionInput({width: 1_000}))).toBe(24)
  })

  it("keeps the conditional value type finite and name-safe", () => {
    const value: NativeConditionalValue<number, typeof NATIVE_RESPONSIVE_CONDITION_NAMES> = [
      8,
      12,
      16,
      24,
    ]
    expect(normalize(value)).toEqual({default: 8, compact: 12, medium: 16, expanded: 24})
  })

  it("keeps tuple and record forms equivalent across generated finite values", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.integer(), fc.integer(), fc.integer(), fc.integer()),
        ([defaultValue, compact, medium, expanded]) => {
          expect(normalize([defaultValue, compact, medium, expanded])).toEqual(
            normalize({default: defaultValue, compact, medium, expanded}),
          )
        },
      ),
    )
  })
})
