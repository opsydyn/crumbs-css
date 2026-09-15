import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  evaluateStyle,
  semanticStyleEqual,
  selectRecipe,
  type DeclarationValue,
  type NativeIrRecipe,
  type SourceProvenance,
  type StyleExpression,
} from "./oracles/native-ir-v1"

const source = (line: number, origin: SourceProvenance["origin"] = "crumbs-native"): SourceProvenance => ({
  sourceId: "packages/button/src/button.css.ts",
  exportPath: ["button"],
  propertyPath: [],
  line,
  column: 1,
  origin,
})
const block = (declarations: ReadonlyArray<readonly [string, DeclarationValue]>, line = 1): StyleExpression => ({
  _tag: "DeclarationBlock",
  primitive: "view",
  declarations: declarations.map(([property, value], index) => ({
    _tag: "Declaration",
    property,
    value,
    provenance: { ...source(line + index), propertyPath: [property], originalProperty: property },
  })),
  provenance: source(line),
})
const compose = (...items: ReadonlyArray<StyleExpression>): StyleExpression => ({
  _tag: "Composition",
  primitive: "view",
  items,
  provenance: source(1),
})
const environment = { definitions: [], tokens: {} } as const

describe("native IR v1 semantic reference", () => {
  it("makes ordered composition associative with an empty identity and later winners", () => {
    fc.assert(fc.property(
      fc.array(fc.tuple(fc.constantFrom("opacity", "width", "height"), fc.integer()), { maxLength: 20 }),
      fc.integer({ min: 0, max: 20 }),
      fc.integer({ min: 0, max: 20 }),
      (entries, firstCut, secondCut) => {
        const first = Math.min(firstCut, entries.length)
        const second = Math.max(first, Math.min(secondCut, entries.length))
        const parts = [entries.slice(0, first), entries.slice(first, second), entries.slice(second)]
          .map((part, index) => block(part, index * 100 + 1))
        const [a, b, c] = [parts[0]!, parts[1]!, parts[2]!]
        expect(semanticStyleEqual(compose(a, compose(b, c)), compose(compose(a, b), c), environment)).toBe(true)
        expect(semanticStyleEqual(compose(block([]), a), a, environment)).toBe(true)
        expect(semanticStyleEqual(compose(a, block([])), a, environment)).toBe(true)
      },
    ), { seed: 2191, numRuns: 200 })

    const early = block([["opacity", 0.25]])
    const late = block([["opacity", 0.75]])
    expect(semanticStyleEqual(compose(early, late), compose(late, early), environment)).toBe(false)
    expect(evaluateStyle(compose(early, late), environment)).toEqual({ ok: true, value: { opacity: 0.75 } })
  })

  it("drops overridden dependencies before token resolution", () => {
    const missing = {
      _tag: "TokenReference",
      contract: { owner: "@acme/tokens", name: "foundation", version: 1 },
      path: ["opacity"],
    } as const
    expect(evaluateStyle(compose(block([["opacity", missing]]), block([["opacity", 1]])), environment)).toEqual({
      ok: true,
      value: { opacity: 1 },
    })
    const result = evaluateStyle(block([["opacity", missing], ["width", missing]]), environment)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toHaveLength(2)
      expect(result.errors.every(error => error.code === "CRUMBS_IR_MISSING_TOKEN")).toBe(true)
      expect(result.errors.map(error => error.provenance.propertyPath)).toEqual([["opacity"], ["width"]])
    }
  })

  it("separates semantic value equality from provenance and object key order", () => {
    const left = block([["shadowOffset", { width: 2, height: 3 }], ["transform", [{ scale: 2 }, { translateX: 4 }]]])
    const right = block([["transform", [{ scale: 2 }, { translateX: 4 }]], ["shadowOffset", { height: 3, width: 2 }]], 99)
    expect(semanticStyleEqual(left, right, environment)).toBe(true)
    expect(semanticStyleEqual(block([["transform", [{ scale: 2 }, { translateX: 4 }]]]), block([["transform", [{ translateX: 4 }, { scale: 2 }]]]), environment)).toBe(false)
    expect(semanticStyleEqual(block([["translateX", -0]]), block([["translateX", 0]]), environment)).toBe(false)
    const foundation = { _tag: "TokenReference", contract: { owner: "@acme/tokens", name: "foundation", version: 1 }, path: ["opacity"] } as const
    const component = { ...foundation, contract: { ...foundation.contract, name: "component" } } as const
    const equalRuntimeValues = {
      definitions: [],
      tokens: {
        "@acme/tokens\u0000foundation\u00001\u0000opacity": 0.5,
        "@acme/tokens\u0000component\u00001\u0000opacity": 0.5,
      },
    }
    expect(evaluateStyle(block([["opacity", foundation]]), equalRuntimeValues)).toEqual({ ok: true, value: { opacity: 0.5 } })
    expect(evaluateStyle(block([["opacity", component]]), equalRuntimeValues)).toEqual({ ok: true, value: { opacity: 0.5 } })
    expect(semanticStyleEqual(block([["opacity", foundation]]), block([["opacity", component]]), equalRuntimeValues)).toBe(false)
  })

  it("resolves owned references and accumulates reference failures without recursion", () => {
    const identity = (name: string) => ({ owner: "@acme/components", module: "button.css.ts", name })
    const reference = (target: string): StyleExpression => ({ _tag: "StyleReference", primitive: "view", target: identity(target), provenance: source(1) })
    const definitions = [
      { identity: identity("base"), expression: block([["paddingTop", 4]]) },
      { identity: identity("cycleA"), expression: reference("cycleB") },
      { identity: identity("cycleB"), expression: reference("cycleA") },
    ]
    expect(evaluateStyle(compose(reference("base"), block([["paddingTop", 8]])), { ...environment, definitions })).toEqual({ ok: true, value: { paddingTop: 8 } })
    const result = evaluateStyle(compose(reference("missing"), reference("cycleA")), { ...environment, definitions })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.map(error => error.code)).toEqual(["CRUMBS_IR_MISSING_REFERENCE", "CRUMBS_IR_REFERENCE_CYCLE"])
  })

  it("selects recipes in base, variant-definition and compound-array order", () => {
    const recipe: NativeIrRecipe = {
      _tag: "Recipe",
      primitive: "view",
      base: block([["opacity", 0.1], ["paddingTop", 1]]),
      variants: [
        { name: "tone", defaultValue: "neutral", values: { neutral: block([["opacity", 0.2]]), brand: block([["opacity", 0.3]]) } },
        { name: "size", values: { small: block([["paddingTop", 2]]), large: block([["paddingTop", 3]]) } },
      ],
      compounds: [
        { when: { tone: "brand", size: "large" }, style: block([["opacity", 0.4]]) },
        { when: { tone: "brand" }, style: block([["opacity", 0.5]]) },
      ],
      provenance: source(1),
    }
    expect(selectRecipe(recipe, { tone: "brand", size: "large" }, environment)).toEqual({ ok: true, value: { opacity: 0.5, paddingTop: 3 } })
    expect(selectRecipe(recipe, { size: "small" }, environment)).toEqual({ ok: true, value: { opacity: 0.2, paddingTop: 2 } })
    const invalid = selectRecipe(recipe, { tone: undefined }, environment)
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) expect(invalid.errors[0]?.code).toBe("CRUMBS_IR_INVALID_RECIPE_SELECTION")
  })
})
