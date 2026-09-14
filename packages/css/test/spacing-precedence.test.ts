import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { cssDeclarationsToRN } from "../src/css-to-rn"
import { resolveThemeTokens } from "../src/theme-runtime"

const token = "var(--crumbs-spacing-regression-wide)"
const theme = { contract: {}, values: {}, tokens: { "--crumbs-spacing-regression-wide": 24 } }
// Independently specified semantic sides, not the production normalization map.
const cases = [
  { prop: "padding", sides: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"], longhand: "padding-left" },
  { prop: "padding-horizontal", sides: ["paddingLeft", "paddingRight"], longhand: "padding-left" },
  { prop: "padding-vertical", sides: ["paddingTop", "paddingBottom"], longhand: "padding-top" },
  { prop: "margin", sides: ["marginTop", "marginRight", "marginBottom", "marginLeft"], longhand: "margin-left" },
  { prop: "margin-horizontal", sides: ["marginLeft", "marginRight"], longhand: "margin-left" },
  { prop: "margin-vertical", sides: ["marginTop", "marginBottom"], longhand: "margin-top" },
  { prop: "gap", sides: ["rowGap", "columnGap"], longhand: "row-gap" },
] as const

describe("canonical spacing precedence", () => {
  for (const { prop, sides, longhand } of cases) {
    it(`${prop} tokens and literals compete on canonical longhands in both orders`, () => {
      for (const [wide, wideValue, narrow, narrowValue] of [
        [token, 24, "3px", 3], ["8px", 8, token, 24],
      ] as const) {
        const nativeLonghand = longhand.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
        const expanded = Object.fromEntries(sides.map((side) => [side, wideValue]))
        for (const reverse of [false, true]) {
          const declarations: Array<readonly [string, string]> = [[prop, wide], [longhand, narrow]]
          if (reverse) declarations.reverse()
          const expected = reverse ? expanded : { ...expanded, [nativeLonghand]: narrowValue }
          expect(resolveThemeTokens(cssDeclarationsToRN(declarations, { strictDiagnostics: true }), theme)).toEqual(expected)
        }
      }
    })
  }

  it("preserves multi-value literals and negative margins beside tokens", () => {
    const result = cssDeclarationsToRN([["margin", "1px 2px 3px 4px"], ["margin-horizontal", token], ["margin-left", "-5px"]], { strictDiagnostics: true })
    expect(resolveThemeTokens(result, theme)).toEqual({ marginTop: 1, marginRight: 24, marginBottom: 3, marginLeft: -5 })
  })

  it("does not resolve a completely overridden missing shorthand token", () => {
    const result = cssDeclarationsToRN([["padding-horizontal", token], ["padding-left", "3px"], ["padding-right", "4px"]])
    expect(resolveThemeTokens(result, { ...theme, tokens: {} })).toEqual({ paddingLeft: 3, paddingRight: 4 })
    expect(() => resolveThemeTokens(cssDeclarationsToRN([["padding", token], ["padding-left", "3px"]]), { ...theme, tokens: {} })).toThrow("--crumbs-spacing-regression-wide")
  })

  it("matches independent evaluation of generated spacing declaration sequences", () => {
    const entries = cases.flatMap(({ prop, sides, longhand }) => [
      { prop, sides: [...sides] },
      { prop: longhand, sides: [longhand.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] },
    ])
    const entry = fc.tuple(fc.constantFrom(...entries), fc.oneof(fc.constant(token), fc.integer({ min: 0, max: 100 }).map((value) => `${value}px`)))
    fc.assert(fc.property(fc.array(entry, { minLength: 1, maxLength: 40 }), (sequence) => {
      const expected: Record<string, number> = {}
      for (const [{ sides }, value] of sequence) for (const side of sides) expected[side] = value === token ? 24 : Number(value.slice(0, -2))
      const result = cssDeclarationsToRN(sequence.map(([{ prop }, value]) => [prop, value] as const), { strictDiagnostics: true })
      expect(resolveThemeTokens(result, theme)).toEqual(expected)
    }), { seed: 20260915, numRuns: 100 })
  })
})
