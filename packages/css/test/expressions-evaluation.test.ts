import {describe, expect, it} from "bun:test"
import fc from "fast-check"
import {
  createNativeExpressionAdd,
  createNativeExpressionClamp,
  createNativeExpressionCompose,
  createNativeExpressionConditionReference,
  createNativeExpressionDomain,
  createNativeExpressionFallback,
  createNativeExpressionLiteral,
  createNativeExpressionMatch,
  createNativeExpressionProgram,
  createNativeExpressionScale,
  createNativeExpressionRuntime,
  createNativeExpressionTokenReference,
  evaluateNativeExpression,
  foldNativeExpression,
  type NativeExpressionEvaluationState,
  type NativeExpressionProgram,
} from "../src/expressions"
import type {NativeConditionSnapshot} from "../src/conditions"

const numberDomain = createNativeExpressionDomain({
  kind: "number",
  unit: "unitless",
})
const lengthDomain = createNativeExpressionDomain({
  kind: "length",
  unit: "px",
  allowNegative: false,
})

const conditions: NativeConditionSnapshot = Object.freeze({
  platform: "ios",
  widthBucket: "compact",
  heightBucket: "regular",
  orientation: "portrait",
  direction: "ltr",
  fontScaleBucket: "normal",
  motion: "full",
  contrast: "normal",
})

function state(
  tokens: Readonly<Record<string, unknown>> = {},
  overrides: Partial<NativeConditionSnapshot> = {},
): NativeExpressionEvaluationState {
  return {
    tokens,
    conditions: Object.freeze({...conditions, ...overrides}),
  }
}

describe("native expression evaluation and folding", () => {
  it("evaluates every supported node with deterministic missing-input semantics", () => {
    const token = createNativeExpressionTokenReference("space.md", lengthDomain)
    const alias = createNativeExpressionFallback(
      createNativeExpressionLiteral(lengthDomain, 12),
      createNativeExpressionLiteral(lengthDomain, 8),
    )
    const arithmetic = createNativeExpressionAdd(
      token,
      createNativeExpressionLiteral(lengthDomain, 4),
    )
    expect(evaluateNativeExpression(arithmetic, state({"space.md": 8}))).toBe(12)
    expect(evaluateNativeExpression(alias, state())).toBe(12)
    expect(evaluateNativeExpression(
      createNativeExpressionScale(createNativeExpressionLiteral(lengthDomain, 3), 2),
      state(),
    )).toBe(6)
    expect(evaluateNativeExpression(
      createNativeExpressionClamp(createNativeExpressionLiteral(lengthDomain, 30), 0, 20),
      state(),
    )).toBe(20)
    expect(evaluateNativeExpression(
      createNativeExpressionAdd(
        createNativeExpressionLiteral(numberDomain, 8),
        createNativeExpressionLiteral(numberDomain, 4),
      ),
      state(),
    )).toBe(12)
    expect(evaluateNativeExpression(
      createNativeExpressionScale(
        createNativeExpressionLiteral(
          createNativeExpressionDomain({kind: "opacity", unit: "fraction"}),
          0.4,
        ),
        2,
      ),
      state(),
    )).toBe(0.8)

    const fallback = createNativeExpressionFallback(
      token,
      createNativeExpressionLiteral(lengthDomain, 8),
    )
    expect(evaluateNativeExpression(fallback, state())).toBe(8)
    expect(() => evaluateNativeExpression(token, state({"space.md": "bad"}))).toThrow(
      "token space.md did not provide a valid length value",
    )
    expect(() => evaluateNativeExpression(fallback, state({"space.md": -1}))).toThrow(
      "token space.md did not provide a valid length value",
    )
  })

  it("uses left-to-right last-winner composition and finite condition matching", () => {
    const composed = createNativeExpressionCompose([
      createNativeExpressionLiteral(numberDomain, 1),
      createNativeExpressionLiteral(numberDomain, 2),
    ])
    expect(evaluateNativeExpression(composed, state())).toBe(2)

    const matched = createNativeExpressionMatch({
      condition: "widthBucket",
      cases: [
        {value: "compact", expression: createNativeExpressionLiteral(numberDomain, 1)},
        {value: "medium", expression: createNativeExpressionLiteral(numberDomain, 2)},
        {value: "expanded", expression: createNativeExpressionLiteral(numberDomain, 3)},
      ],
    })
    expect(evaluateNativeExpression(matched, state())).toBe(1)
    expect(evaluateNativeExpression(matched, state({}, {widthBucket: "expanded"}))).toBe(3)
    expect(evaluateNativeExpression(createNativeExpressionConditionReference("widthBucket"), state())).toBe(
      "compact",
    )
    const conditionReference = createNativeExpressionMatch({
      condition: "widthBucket",
      cases: [
        {value: "compact", expression: createNativeExpressionLiteral(numberDomain, 1)},
        {value: "medium", expression: createNativeExpressionLiteral(numberDomain, 2)},
        {value: "expanded", expression: createNativeExpressionLiteral(numberDomain, 3)},
      ],
      fallback: createNativeExpressionLiteral(numberDomain, 0),
    })
    expect(evaluateNativeExpression(conditionReference, state({}, {widthBucket: "medium"}))).toBe(2)
  })

  it("folds dependency-free programs to literals and preserves dynamic dependencies", () => {
    const staticExpression = createNativeExpressionCompose([
      createNativeExpressionAdd(
        createNativeExpressionLiteral(numberDomain, 2),
        createNativeExpressionScale(createNativeExpressionLiteral(numberDomain, 3), 2),
      ),
      createNativeExpressionClamp(createNativeExpressionLiteral(numberDomain, 9), 0, 20),
    ])
    const foldedStatic = foldNativeExpression(staticExpression)
    expect(foldedStatic.kind).toBe("literal")
    if (foldedStatic.kind === "literal") expect(foldedStatic.value).toBe(9)
    expect(evaluateNativeExpression(foldedStatic, state())).toBe(
      evaluateNativeExpression(staticExpression, state()),
    )
    expect(Object.isFrozen(foldedStatic)).toBe(true)

    const dynamic = createNativeExpressionAdd(
      createNativeExpressionTokenReference("space.md", lengthDomain),
      createNativeExpressionLiteral(lengthDomain, 4),
    )
    const foldedDynamic = foldNativeExpression(dynamic)
    expect(foldedDynamic.kind).toBe("add")
    expect(foldedDynamic.dependencies).toEqual(dynamic.dependencies)
  })

  it("keeps static folding equivalent for generated number expressions", () => {
    fc.assert(
      fc.property(
        fc.integer({min: -100, max: 100}),
        fc.integer({min: -100, max: 100}),
        (left, right) => {
          const expression = createNativeExpressionAdd(
            createNativeExpressionLiteral(numberDomain, left),
            createNativeExpressionLiteral(numberDomain, right),
          )
          const folded = foldNativeExpression(expression)
          expect(folded.kind).toBe("literal")
          expect(evaluateNativeExpression(folded, state())).toBe(left + right)
          expect(evaluateNativeExpression(expression, state())).toBe(left + right)
        },
      ),
    )
  })
})

describe("native expression dependency-aware runtime", () => {
  it("recomputes only when a declared token or condition changes", () => {
    const expression = createNativeExpressionAdd(
      createNativeExpressionTokenReference("space.md", lengthDomain),
      createNativeExpressionLiteral(lengthDomain, 4),
    )
    const runtime = createNativeExpressionRuntime(
      createNativeExpressionProgram(expression),
      state({"space.md": 8, unrelated: 1}),
    )

    expect(runtime.getValue()).toBe(12)
    expect(runtime.getStats()).toMatchObject({evaluations: 1, skipped: 0})
    expect(runtime.update(state({"space.md": 8, unrelated: 2}))).toBe(false)
    expect(runtime.getValue()).toBe(12)
    expect(runtime.getStats()).toMatchObject({evaluations: 1, skipped: 1})
    expect(runtime.update(state({"space.md": 10, unrelated: 2}))).toBe(true)
    expect(runtime.getValue()).toBe(14)
    expect(runtime.getStats()).toMatchObject({evaluations: 2, skipped: 1})
    expect(runtime.update(state({"space.md": 10, unrelated: 3}, {widthBucket: "expanded"}))).toBe(false)
    expect(runtime.getStats()).toMatchObject({evaluations: 2, skipped: 2})
    runtime.dispose()
    expect(runtime.getStats().disposed).toBe(true)
    expect(() => runtime.update(state({"space.md": 12}))).toThrow("runtime has been disposed")
  })

  it("tracks condition dependencies separately from unrelated native axes", () => {
    const matched = createNativeExpressionMatch({
      condition: "widthBucket",
      cases: [
        {
          value: "compact",
          expression: createNativeExpressionTokenReference("space.compact", lengthDomain),
        },
        {
          value: "medium",
          expression: createNativeExpressionTokenReference("space.medium", lengthDomain),
        },
        {
          value: "expanded",
          expression: createNativeExpressionTokenReference("space.expanded", lengthDomain),
        },
      ],
    })
    const runtime = createNativeExpressionRuntime(
      createNativeExpressionProgram(matched),
      state({"space.compact": 8, "space.medium": 12, "space.expanded": 16}),
    )

    expect(runtime.getValue()).toBe(8)
    expect(runtime.update(state(
      {"space.compact": 8, "space.medium": 12, "space.expanded": 16},
      {direction: "rtl"},
    ))).toBe(false)
    expect(runtime.update(state(
      {"space.compact": 8, "space.medium": 12, "space.expanded": 16},
      {widthBucket: "expanded"},
    ))).toBe(true)
    expect(runtime.getValue()).toBe(16)
    expect(runtime.getStats()).toMatchObject({evaluations: 2, skipped: 1})
  })

  it("does not trust a forged program dependency list", () => {
    const expression = createNativeExpressionTokenReference("space.md", lengthDomain)
    const forged = {
      ...createNativeExpressionProgram(expression),
      dependencies: Object.freeze([]),
    } as unknown as NativeExpressionProgram<typeof lengthDomain>

    expect(() => createNativeExpressionRuntime(forged, state({"space.md": 8}))).toThrow(
      "program dependencies do not match its root",
    )
  })

  it("does not create a runtime closure in the portable program", () => {
    const program = createNativeExpressionProgram(createNativeExpressionLiteral(numberDomain, 4))
    expect(Object.values(program).some((value) => typeof value === "function")).toBe(false)
  })
})
