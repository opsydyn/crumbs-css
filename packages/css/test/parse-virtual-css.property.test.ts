import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { parseCssClassRules } from "../src/parse-virtual-css"

type CssRuleInput = {
  readonly className: string
  readonly prop: string
  readonly value: string
}

const PROPERTY_RUNS = 100
const PROPERTY_SEED = 20260512

const classNameArbitrary = fc.constantFrom("button__a1", "panel-title__b2", "row_item__c3")
const declarationArbitrary = fc.record({
  className: classNameArbitrary,
  prop: fc.constantFrom("color", "font-size", "padding-top"),
  value: fc.constantFrom("red", "16px", "#ffffff", "8px"),
})
const declarationListArbitrary = fc.array(declarationArbitrary, { maxLength: 12, minLength: 1 })

describe("virtual CSS parser properties", () => {
  it("parses generated plain class rules and preserves duplicate declaration order", () => {
    fc.assert(
      fc.property(declarationListArbitrary, (rules) => {
        const css = rules.map(ruleToCss).join("\n")
        const result = parseCssClassRules(css)
        const expected = expectedDeclarationsByClassName(rules)

        for (const [className, declarations] of expected) {
          expect(result.get(className)).toEqual(declarations)
        }
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })

  it("ignores comments around generated declarations", () => {
    fc.assert(
      fc.property(declarationListArbitrary, (rules) => {
        const plainCss = rules.map(ruleToCss).join("\n")
        const commentedCss = rules
          .map((rule) => `/* before */ ${ruleToCss(rule)} /* after */`)
          .join("\n")

        expect(parseCssClassRules(commentedCss)).toEqual(parseCssClassRules(plainCss))
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })

  it("does not leak declarations from generated at-rules or pseudo selectors", () => {
    fc.assert(
      fc.property(declarationArbitrary, (rule) => {
        const css = [
          ruleToCss(rule),
          `@media (min-width: 800px) { .${rule.className} { color: blue; } }`,
          `.${rule.className}:hover { color: green; }`,
          `.${rule.className}::before { color: yellow; }`,
        ].join("\n")

        expect(parseCssClassRules(css).get(rule.className)).toEqual([[rule.prop, rule.value]])
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })
})

function ruleToCss(rule: CssRuleInput): string {
  return `.${rule.className} { ${rule.prop}: ${rule.value}; }`
}

function expectedDeclarationsByClassName(
  rules: ReadonlyArray<CssRuleInput>,
): Map<string, ReadonlyArray<readonly [string, string]>> {
  const expected = new Map<string, Array<readonly [string, string]>>()
  for (const rule of rules) {
    const declarations = expected.get(rule.className) ?? []
    declarations.push([rule.prop, rule.value])
    expected.set(rule.className, declarations)
  }
  return expected
}
