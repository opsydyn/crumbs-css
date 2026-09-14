import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import { cssDeclarationsToRN } from "../src/css-to-rn"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { resolveThemeStyles, resolveThemeTokens } from "../src/theme-runtime"

const token = "var(--crumbs-radius-regression-wide)"
const theme = { contract: {}, values: {}, tokens: { "--crumbs-radius-regression-wide": 18 } }
const corners = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"] as const
const root = path.resolve(import.meta.dir, "..")
type Rule = Record<string, string | number>

// Independent physical-corner semantics; no production expansion map is used.
function reference(rules: ReadonlyArray<Rule>) {
  const result: Rule = {}
  for (const rule of rules) for (const [prop, raw] of Object.entries(rule)) {
    const value = raw === token ? 18 : raw
    if (prop === "borderRadius") for (const corner of corners) result[`border${corner}Radius`] = value
    else result[prop] = value
  }
  return result
}
function convert(declarations: ReadonlyArray<readonly [string, string]>) {
  return resolveThemeTokens(cssDeclarationsToRN(declarations, { strictDiagnostics: true }), theme)
}
function evaluate(code: string) {
  const exports: Record<string, unknown> = {}
  runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), {
    exports, StyleSheet: { create: (styles: unknown) => styles },
  })
  return exports
}
async function compile(source: string) {
  const dir = mkdtempSync(path.join(root, "fixtures/.radius-"))
  try {
    const file = path.join(dir, "case.css.ts")
    writeFileSync(file, `import { viewStyle, createThemeContract } from '@opsydyn/crumbs-css/style';
      const vars = createThemeContract({ radiusRegression: { wide: null } }); ${source}`)
    return evaluate(await transformCssTsToStyleSheet(file, root, { strictDiagnostics: true, useStyleSheet: false }))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
const generatedRule = fc.tuple(
  fc.constantFrom("borderRadius", ...corners.map(corner => `border${corner}Radius`)),
  fc.oneof(fc.integer({ min: 0, max: 40 }), fc.constant(token)),
).map(([prop, value]) => ({ [prop]: value }))

describe("canonical physical border-radius precedence", () => {
  it("preserves broad/corner token and literal order for all corners", () => {
    for (const corner of corners) for (const tokenBroad of [true, false]) for (const reverse of [true, false]) {
      const rules = [{ borderRadius: tokenBroad ? token : 8 }, { [`border${corner}Radius`]: tokenBroad ? 3 : token }]
      const declarations: Array<readonly [string, string]> = [
        ["border-radius", tokenBroad ? token : "8px"],
        [`border${corner}Radius`.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), tokenBroad ? "3px" : token],
      ]
      if (reverse) { rules.reverse(); declarations.reverse() }
      expect(convert(declarations)).toEqual(reference(rules))
    }
  })

  it("retains multi-value, percentage and zero literals beside tokens", () => {
    expect(convert([["border-radius", "1px 2px 3px 4px"], ["border-top-right-radius", token]])).toEqual({
      borderTopLeftRadius: 1, borderTopRightRadius: 18, borderBottomRightRadius: 3, borderBottomLeftRadius: 4,
    })
    expect(convert([["border-radius", "25%"], ["border-bottom-left-radius", token]])).toEqual({
      borderTopLeftRadius: "25%", borderTopRightRadius: "25%", borderBottomRightRadius: "25%", borderBottomLeftRadius: 18,
    })
    expect(convert([["border-radius", token], ["border-top-left-radius", "0px"]])).toEqual({ ...reference([{ borderRadius: token }]), borderTopLeftRadius: 0 })
  })

  it("resolves only surviving tokens after complete and partial overrides", () => {
    const declarations: Array<readonly [string, string]> = [["border-radius", token]]
    for (const corner of corners) declarations.push([`border${corner}Radius`.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), "2px"])
    expect(resolveThemeTokens(cssDeclarationsToRN(declarations), { ...theme, tokens: {} })).toEqual(reference([{ borderRadius: 2 }]))
    declarations.pop()
    expect(() => resolveThemeTokens(cssDeclarationsToRN(declarations), { ...theme, tokens: {} })).toThrow("CRUMBS_CSS_MISSING_THEME_TOKEN")
  })

  it("retains strict rejection of elliptical and embedded-token CSS expressions", () => {
    expect(() => cssDeclarationsToRN([["border-radius", "8px / 4px"]], { strictDiagnostics: true })).toThrow("CRUMBS_CSS_DROPPED_DECLARATION")
    expect(() => cssDeclarationsToRN([["border-radius", `8px ${token}`]], { strictDiagnostics: true })).toThrow("CRUMBS_CSS_VARIABLE_DROPPED")
  })

  it("matches independent generated declaration evaluation", () => {
    fc.assert(fc.property(fc.array(generatedRule, { minLength: 1, maxLength: 40 }), rules => {
      const declarations = rules.flatMap(rule => Object.entries(rule).map(([prop, value]) => [
        prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), typeof value === "number" ? `${value}px` : value,
      ] as const))
      expect(convert(declarations)).toEqual(reference(rules))
    }), { seed: 20260924, numRuns: 100 })
  })

  it("matches independent generated nested/repeated-base compositions", async () => {
    function author(rule: Rule) { return JSON.stringify(rule).replaceAll(JSON.stringify(token), "vars.radiusRegression.wide") }
    await fc.assert(fc.asyncProperty(fc.array(generatedRule, { minLength: 2, maxLength: 8 }), async rules => {
      const result = await compile(`const first = viewStyle(${author(rules[0]!)});
        export const result = viewStyle([first, [${rules.slice(1).map(author).join(",")}], first]);`)
      expect(resolveThemeTokens(result.result, theme)).toEqual(reference([...rules, rules[0]!]))
    }), { seed: 20260925, numRuns: 100 })
  })

  it("preserves rules, primitive helpers, variants and recipes in both emitters", async () => {
    const broad = reference([{ borderRadius: token }])
    const corner = { ...broad, borderTopLeftRadius: 3 }
    for (const useStyleSheet of [true, false]) {
      const code = await transformCssTsToStyleSheet(path.join(root, "fixtures/radius-precedence.css.ts"), root, { strictDiagnostics: true, useStyleSheet })
      const result = resolveThemeStyles(evaluate(code), theme) as Record<string, unknown> & {
        states: { broad: unknown; corner: unknown }
        button: { base: unknown; variants: { selected: { true: unknown } } }
      }
      expect(result.broadWins).toEqual(broad)
      expect(result.cornerWins).toEqual(corner)
      expect(result.repeated).toEqual(broad)
      expect(result.sameRule).toEqual(broad)
      expect(result.text).toEqual(corner)
      expect(result.image).toEqual(broad)
      expect(Object.keys(result.states)).toEqual(["broad", "corner"])
      expect(result.states.broad).toEqual(broad)
      expect(result.states.corner).toEqual(corner)
      expect(result.button.base).toEqual(broad)
      expect(result.button.variants.selected.true).toEqual({ ...broad, borderBottomRightRadius: 0 })
    }
  })
})
