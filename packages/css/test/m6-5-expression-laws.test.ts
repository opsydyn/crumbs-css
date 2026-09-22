import {describe, expect, it} from "bun:test"
import fc from "fast-check"
import {
  createNativeExpressionAdd,
  createNativeExpressionClamp,
  createNativeExpressionCompose,
  createNativeExpressionDomain,
  createNativeExpressionLiteral,
  createNativeExpressionMatch,
  createNativeExpressionProgram,
  createNativeExpressionScale,
  createNativeExpressionTokenReference,
  createNativeExpressionRuntime,
  evaluateNativeExpression,
  foldNativeExpression,
  type NativeExpressionEvaluationState,
} from "../src/expressions"
import {
  createNativeNormalizeValueFn,
  NATIVE_RESPONSIVE_CONDITION_NAMES,
  normalizeNativeConditionInput,
  type NativeConditionalRecord,
  type NativeConditionSnapshot,
} from "../src/conditions"

const lengthDomain = createNativeExpressionDomain({
  kind: "length",
  unit: "px",
  allowNegative: false,
})
const numberDomain = createNativeExpressionDomain({
  kind: "number",
  unit: "unitless",
})

const baseConditions = {
  platform: "ios",
  widthBucket: "compact",
  heightBucket: "regular",
  orientation: "portrait",
  direction: "ltr",
  fontScaleBucket: "normal",
  motion: "full",
  contrast: "normal",
} as const

function state(
  tokens: Readonly<Record<string, unknown>> = {"space.md": 4},
  overrides: Partial<NativeConditionSnapshot> = {},
): NativeExpressionEvaluationState {
  return {
    tokens,
    conditions: {...baseConditions, ...overrides},
  }
}

function nativeState(input: Parameters<typeof normalizeNativeConditionInput>[0]): NativeExpressionEvaluationState {
  return {
    tokens: {},
    conditions: normalizeNativeConditionInput(input),
  }
}

describe("M6.5 expression laws", () => {
  it("folds static descendants while preserving dynamic dependencies", () => {
    const expression = createNativeExpressionAdd(
      createNativeExpressionTokenReference("space.md", lengthDomain),
      createNativeExpressionScale(
        createNativeExpressionLiteral(lengthDomain, 2),
        3,
      ),
    )

    const folded = foldNativeExpression(expression)

    expect(folded.kind).toBe("add")
    if (folded.kind !== "add") return
    expect(folded.right.kind).toBe("literal")
    if (folded.right.kind !== "literal") return
    expect(folded.right.value).toBe(6)
    expect(evaluateNativeExpression(folded, state())).toBe(10)
  })

  it("keeps folding idempotent for generated static programs", () => {
    fc.assert(
      fc.property(
        fc.integer({min: -100, max: 100}),
        fc.integer({min: -100, max: 100}),
        fc.integer({min: -4, max: 4}),
        (left, right, factor) => {
          const expression = createNativeExpressionAdd(
            createNativeExpressionLiteral(
              createNativeExpressionDomain({kind: "number", unit: "unitless"}),
              left,
            ),
            createNativeExpressionScale(
              createNativeExpressionLiteral(
                createNativeExpressionDomain({kind: "number", unit: "unitless"}),
                right,
              ),
              factor,
            ),
          )
          const once = foldNativeExpression(expression)
          const twice = foldNativeExpression(once)

          expect(twice).toEqual(once)
          expect(evaluateNativeExpression(twice, state())).toBe(left + right * factor)
        },
      ),
    )
  })

  it("keeps conditional-value normalization idempotent", () => {
    const normalize = createNativeNormalizeValueFn(NATIVE_RESPONSIVE_CONDITION_NAMES)
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer(),
          fc.integer(),
          fc.integer(),
          fc.integer(),
        ),
        ([defaultValue, compact, medium, expanded]) => {
          const once = normalize([defaultValue, compact, medium, expanded])
          const twice = normalize(
            once as NativeConditionalRecord<
              number,
              typeof NATIVE_RESPONSIVE_CONDITION_NAMES
            >,
          )
          expect(twice).toEqual(once)
          expect(Object.keys(twice)).toEqual(Object.keys(once))
        },
      ),
    )
  })

  it("evaluates the same program deterministically across input insertion order", () => {
    const expression = createNativeExpressionAdd(
      createNativeExpressionTokenReference("space.md", lengthDomain),
      createNativeExpressionLiteral(lengthDomain, 2),
    )
    const firstState: NativeExpressionEvaluationState = {
      tokens: {"space.md": 4, unrelated: 99},
      conditions: state().conditions,
    }
    const secondState: NativeExpressionEvaluationState = {
      tokens: {unrelated: 99, "space.md": 4},
      conditions: {
        contrast: "normal",
        motion: "full",
        fontScaleBucket: "normal",
        direction: "ltr",
        orientation: "portrait",
        heightBucket: "regular",
        widthBucket: "compact",
        platform: "ios",
      },
    }

    const first = evaluateNativeExpression(expression, firstState)
    const second = evaluateNativeExpression(expression, secondState)
    expect(first).toBe(6)
    expect(second).toBe(first)
  })

  it("preserves the algebraic laws supported by the scalar operators", () => {
    fc.assert(
      fc.property(
        fc.integer({min: -100, max: 100}),
        fc.integer({min: -100, max: 100}),
        fc.integer({min: -100, max: 100}),
        fc.integer({min: -50, max: 50}),
        fc.integer({min: -50, max: 50}),
        (a, b, c, lower, upper) => {
          const minimum = Math.min(lower, upper)
          const maximum = Math.max(lower, upper)
          const literal = (value: number) => createNativeExpressionLiteral(numberDomain, value)
          const evaluate = (expression: Parameters<typeof evaluateNativeExpression>[0]) =>
            evaluateNativeExpression(expression, state())

          const commutativeLeft = evaluate(createNativeExpressionAdd(literal(a), literal(b)))
          const commutativeRight = evaluate(createNativeExpressionAdd(literal(b), literal(a)))
          if (commutativeLeft !== commutativeRight) {
            throw new Error(`addition commutativity failed: ${a}, ${b}`)
          }
          const associative = evaluate(createNativeExpressionAdd(
            createNativeExpressionAdd(literal(a), literal(b)),
            literal(c),
          ))
          if (associative !== a + b + c) {
            throw new Error(`addition associativity failed: ${a}, ${b}, ${c}`)
          }
          const identity = evaluate(createNativeExpressionScale(literal(a), 1))
          if (identity !== a) throw new Error(`scale identity failed: ${a}`)

          const clamped = createNativeExpressionClamp(literal(a), minimum, maximum)
          const clampedTwice = evaluate(createNativeExpressionClamp(clamped, minimum, maximum))
          const clampedOnce = evaluate(clamped)
          if (clampedTwice !== clampedOnce) {
            throw new Error(`clamp idempotence failed: ${a}, ${minimum}, ${maximum}`)
          }

          const leftAssociated = createNativeExpressionCompose([
            createNativeExpressionCompose([literal(a), literal(b)]),
            literal(c),
          ])
          const rightAssociated = createNativeExpressionCompose([
            literal(a),
            createNativeExpressionCompose([literal(b), literal(c)]),
          ])
          const leftValue = evaluate(leftAssociated)
          const rightValue = evaluate(rightAssociated)
          if (leftValue !== rightValue) {
            throw new Error(`composition associativity failed: ${a}, ${b}, ${c}`)
          }
        },
      ),
    )
  })

  it("recomputes only for generated declared-token changes", () => {
    fc.assert(
      fc.property(
        fc.integer({min: 0, max: 100}),
        fc.integer({min: 0, max: 100}),
        (initial, next) => {
          const expression = createNativeExpressionAdd(
            createNativeExpressionTokenReference("space.md", lengthDomain),
            createNativeExpressionLiteral(lengthDomain, 2),
          )
          const runtime = createNativeExpressionRuntime(
            createNativeExpressionProgram(expression),
            state({"space.md": initial, unrelated: 0}),
          )

          expect(runtime.update(state(
            {"space.md": initial, unrelated: next},
            {direction: "rtl"},
          ))).toBe(false)
          expect(runtime.update(state(
            {"space.md": next, unrelated: next},
            {direction: "rtl"},
          ))).toBe(next !== initial)
          expect(runtime.getValue()).toBe(next + 2)
        },
      ),
    )
  })

  it("propagates finite resize, font-scale, orientation and RTL boundaries", () => {
    const widthRuntime = createNativeExpressionRuntime(
      createNativeExpressionProgram(createNativeExpressionMatch({
        condition: "widthBucket",
        cases: [
          {value: "compact", expression: createNativeExpressionLiteral(numberDomain, 1)},
          {value: "medium", expression: createNativeExpressionLiteral(numberDomain, 2)},
          {value: "expanded", expression: createNativeExpressionLiteral(numberDomain, 3)},
        ],
      })),
      nativeState({width: 599, height: 800}),
    )
    expect(widthRuntime.getValue()).toBe(1)
    expect(widthRuntime.update(nativeState({width: 599.5, height: 800}))).toBe(false)
    expect(widthRuntime.update(nativeState({width: 600, height: 800}))).toBe(true)
    expect(widthRuntime.getValue()).toBe(2)

    const fontScaleRuntime = createNativeExpressionRuntime(
      createNativeExpressionProgram(createNativeExpressionMatch({
        condition: "fontScaleBucket",
        cases: [
          {value: "normal", expression: createNativeExpressionLiteral(numberDomain, 1)},
          {value: "large", expression: createNativeExpressionLiteral(numberDomain, 2)},
          {value: "extraLarge", expression: createNativeExpressionLiteral(numberDomain, 3)},
        ],
      })),
      nativeState({fontScale: 1.14}),
    )
    expect(fontScaleRuntime.update(nativeState({fontScale: 1.149}))).toBe(false)
    expect(fontScaleRuntime.update(nativeState({fontScale: 1.15}))).toBe(true)
    expect(fontScaleRuntime.getValue()).toBe(2)

    const orientationRuntime = createNativeExpressionRuntime(
      createNativeExpressionProgram(createNativeExpressionMatch({
        condition: "orientation",
        cases: [
          {value: "portrait", expression: createNativeExpressionLiteral(numberDomain, 1)},
          {value: "landscape", expression: createNativeExpressionLiteral(numberDomain, 2)},
        ],
      })),
      nativeState({width: 320, height: 640}),
    )
    expect(orientationRuntime.update(nativeState({width: 400, height: 640}))).toBe(false)
    expect(orientationRuntime.update(nativeState({width: 800, height: 640}))).toBe(true)
    expect(orientationRuntime.getValue()).toBe(2)

    const rtlRuntime = createNativeExpressionRuntime(
      createNativeExpressionProgram(createNativeExpressionMatch({
        condition: "direction",
        cases: [
          {value: "ltr", expression: createNativeExpressionLiteral(numberDomain, 1)},
          {value: "rtl", expression: createNativeExpressionLiteral(numberDomain, 2)},
        ],
      })),
      nativeState({isRTL: false}),
    )
    expect(rtlRuntime.update(nativeState({isRTL: false, width: 700}))).toBe(false)
    expect(rtlRuntime.update(nativeState({isRTL: true, width: 700}))).toBe(true)
    expect(rtlRuntime.getValue()).toBe(2)
  })
})
