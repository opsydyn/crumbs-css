import {describe, expect, it} from "bun:test"
import fc from "fast-check"
import {
  createNativeExpressionAdd,
  createNativeExpressionAlias,
  createNativeExpressionClamp,
  createNativeExpressionCompose,
  createNativeExpressionConditionReference,
  createNativeExpressionDomain,
  createNativeExpressionFallback,
  createNativeExpressionLiteral,
  createNativeExpressionMatch,
  createNativeExpressionProgram,
  createNativeExpressionScale,
  createNativeExpressionSubtract,
  createNativeExpressionTokenReference,
  nativeExpressionDependencyKey,
  type NativeExpression,
} from "../src/expressions"

const numberDomain = createNativeExpressionDomain({
  kind: "number",
  unit: "unitless",
})
const lengthDomain = createNativeExpressionDomain({
  kind: "length",
  unit: "px",
  allowNegative: false,
})
const durationDomain = createNativeExpressionDomain({
  kind: "duration",
  unit: "ms",
})
const opacityDomain = createNativeExpressionDomain({
  kind: "opacity",
  unit: "fraction",
})

describe("native expression domains and dependency sets", () => {
  it("canonicalises finite domains and rejects malformed units", () => {
    const enumDomain = createNativeExpressionDomain({
      kind: "enum",
      values: ["expanded", "compact", "medium"],
    })

    expect(enumDomain.kind).toBe("enum")
    expect(Array.from(enumDomain.values)).toEqual(["compact", "expanded", "medium"])
    expect(Object.isFrozen(enumDomain)).toBe(true)
    expect(Object.isFrozen(enumDomain.values)).toBe(true)
    expect(() =>
      createNativeExpressionDomain({
        kind: "enum",
        values: ["expanded", "compact", "medium", "compact"],
      }),
    ).toThrow("enum domain values must be unique")
    expect(() =>
      createNativeExpressionDomain({
        kind: "length",
        unit: "rem" as "px",
        allowNegative: false,
      }),
    ).toThrow("length domains use px")
    expect(() =>
      createNativeExpressionDomain({kind: "enum", values: [] as unknown as [string, ...string[]]}),
    ).toThrow("enum domains need at least one value")
  })

  it("derives sorted, deduplicated dependencies without executable closures", () => {
    const token = createNativeExpressionTokenReference("space.md", lengthDomain)
    const condition = createNativeExpressionMatch({
      condition: "widthBucket",
      cases: [
        {value: "compact", expression: createNativeExpressionLiteral(lengthDomain, 1)},
        {value: "medium", expression: createNativeExpressionLiteral(lengthDomain, 2)},
        {value: "expanded", expression: createNativeExpressionLiteral(lengthDomain, 3)},
      ],
    })
    const fallback = createNativeExpressionFallback(
      createNativeExpressionAlias("spaceAlias", token),
      createNativeExpressionLiteral(lengthDomain, 8),
    )
    const program = createNativeExpressionProgram(
      createNativeExpressionCompose([fallback, condition]),
    )

    expect(program.dependencies.map(nativeExpressionDependencyKey)).toEqual([
      "condition:widthBucket",
      "token:space.md",
    ])
    expect(program.root.dependencies.map(nativeExpressionDependencyKey)).toEqual(
      program.dependencies.map(nativeExpressionDependencyKey),
    )
    expect(Object.isFrozen(program)).toBe(true)
    expect(Object.isFrozen(program.dependencies)).toBe(true)
    expect(Object.values(program.root).some((value) => typeof value === "function")).toBe(false)
  })

  it("keeps dependency identity independent of composition order", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom("space.sm", "space.md", "space.lg"), {
          minLength: 1,
          maxLength: 3,
        }),
        (names) => {
          const references = names.map((name) =>
            createNativeExpressionTokenReference(name, lengthDomain),
          ) as unknown as readonly [
            NativeExpression<typeof lengthDomain>,
            ...ReadonlyArray<NativeExpression<typeof lengthDomain>>,
          ]
          const reversed = [...references].reverse() as unknown as readonly [
            NativeExpression<typeof lengthDomain>,
            ...ReadonlyArray<NativeExpression<typeof lengthDomain>>,
          ]
          const forward = createNativeExpressionCompose(references)
          const backward = createNativeExpressionCompose(reversed)
          expect(forward.dependencies.map(nativeExpressionDependencyKey)).toEqual(
            backward.dependencies.map(nativeExpressionDependencyKey),
          )
        },
      ),
    )
  })
})

describe("native expression scalar operators", () => {
  it("admits only compatible typed scalar operations", () => {
    const left = createNativeExpressionLiteral(lengthDomain, 8)
    const right = createNativeExpressionLiteral(lengthDomain, 4)
    const sum = createNativeExpressionAdd(left, right)
    const difference = createNativeExpressionSubtract(left, right)
    const scaled = createNativeExpressionScale(left, 1.5)
    const clamped = createNativeExpressionClamp(left, 0, 24)

    expect(sum.kind).toBe("add")
    expect(difference.kind).toBe("subtract")
    expect(scaled.kind).toBe("scale")
    expect(clamped.kind).toBe("clamp")
    expect(sum.domain).toEqual(lengthDomain)
    expect(() => createNativeExpressionAdd(
      left,
      createNativeExpressionLiteral(durationDomain, 4) as unknown as NativeExpression<typeof lengthDomain>,
    )).toThrow(
      "expression domains must match",
    )
    expect(() => createNativeExpressionAdd(
      createNativeExpressionLiteral(opacityDomain, 0.2) as unknown as NativeExpression<typeof numberDomain>,
      createNativeExpressionLiteral(opacityDomain, 0.1) as unknown as NativeExpression<typeof numberDomain>,
    )).toThrow("add only supports number, length, and duration domains")
    expect(() => createNativeExpressionScale(left, Number.NaN)).toThrow("scale factor must be finite")
    expect(() => createNativeExpressionClamp(left, 12, 4)).toThrow("clamp minimum must not exceed maximum")
    expect(() => createNativeExpressionClamp(
      createNativeExpressionLiteral(opacityDomain, 0.5),
      -0.1,
      1,
    )).toThrow("opacity clamp bounds must be between 0 and 1")
  })

  it("allows aliases, fallbacks and ordered composition only within one domain", () => {
    const first = createNativeExpressionLiteral(numberDomain, 1)
    const second = createNativeExpressionLiteral(numberDomain, 2)
    const alias = createNativeExpressionAlias("first", first)
    const fallback = createNativeExpressionFallback(alias, second)
    const composition = createNativeExpressionCompose([alias, fallback])

    expect(alias.name).toBe("first")
    expect(fallback.onMissing).toBe("use-fallback")
    expect(composition.order).toBe("left-to-right")
    expect(composition.expressions).toEqual([alias, fallback])
    expect(() => createNativeExpressionCompose(
      [] as unknown as readonly [NativeExpression<typeof numberDomain>],
    )).toThrow("composition needs at least one expression")
    expect(() => createNativeExpressionFallback(
      first,
      createNativeExpressionLiteral(lengthDomain, 2) as unknown as NativeExpression<typeof numberDomain>,
    )).toThrow("expression domains must match")
    expect(() => createNativeExpressionAlias("  ", first)).toThrow("alias name must be non-empty")
  })
})

describe("native expression exhaustive matching", () => {
  it("sorts finite cases and requires coverage or an explicit fallback", () => {
    const compact = createNativeExpressionLiteral(numberDomain, 1)
    const medium = createNativeExpressionLiteral(numberDomain, 2)
    const expanded = createNativeExpressionLiteral(numberDomain, 3)
    const match = createNativeExpressionMatch({
      condition: "widthBucket",
      cases: [
        {value: "expanded", expression: expanded},
        {value: "compact", expression: compact},
        {value: "medium", expression: medium},
      ],
    })

    expect(match.exhaustive).toBe(true)
    expect(match.cases.map((entry) => entry.value)).toEqual(["compact", "medium", "expanded"])
    expect(match.dependencies.map(nativeExpressionDependencyKey)).toEqual(["condition:widthBucket"])
    expect(() => createNativeExpressionMatch({
      condition: "widthBucket",
      cases: [{value: "compact", expression: compact}],
    })).toThrow("exhaustive match is missing cases")

    const withFallback = createNativeExpressionMatch({
      condition: "widthBucket",
      cases: [{value: "compact", expression: compact}],
      fallback: medium,
    })
    expect(withFallback.fallback).toBe(medium)
    expect(() => createNativeExpressionMatch({
      condition: "widthBucket",
      cases: [
        {value: "compact", expression: compact},
        {value: "compact", expression: medium},
      ],
      fallback: expanded,
    })).toThrow("duplicate exhaustive match case")
    expect(() => createNativeExpressionMatch({
      condition: "widthBucket",
      cases: [{value: "tablet" as "compact", expression: compact}],
      fallback: medium,
    })).toThrow("invalid exhaustive match case")
  })

  it("creates condition references with a finite enum domain", () => {
    const reference = createNativeExpressionConditionReference("contrast")

    expect(reference.kind).toBe("condition-reference")
    expect(reference.domain).toEqual({
      kind: "enum",
      values: ["less", "more", "normal"],
    })
    expect(reference.dependencies.map(nativeExpressionDependencyKey)).toEqual(["condition:contrast"])
  })
})
