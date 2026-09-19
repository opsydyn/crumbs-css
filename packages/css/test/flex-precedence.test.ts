import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import { cssDeclarationsToRN } from "../src/css-to-rn"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { resolveThemeStyles, resolveThemeTokens } from "../src/theme-runtime"

const token = "var(--crumbs-flex-regression-value)"
const theme = { contract: {}, values: {}, tokens: { "--crumbs-flex-regression-value": 2 } }
const root = path.resolve(import.meta.dir, "..")
type Rule = Record<string, string | number>

// Native fields remain independent. Expand neither flex nor its siblings.
function reference(rules: ReadonlyArray<Rule>) {
  const result: Rule = {}
  for (const rule of rules) for (const [prop, raw] of Object.entries(rule)) result[prop] = raw === token ? 2 : raw
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
  const dir = mkdtempSync(path.join(root, "fixtures/.flex-"))
  try {
    const file = path.join(dir, "case.css.ts")
    writeFileSync(file, `import { viewStyle, createThemeContract } from '@opsydyn/crumbs-css/style';
      const vars = createThemeContract({ flexRegression: { value: null } }); ${source}`)
    return evaluate(await transformCssTsToStyleSheet(file, root, { strictDiagnostics: true, useStyleSheet: false }))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
const generatedRule = fc.tuple(
  fc.constantFrom("flex", "flexGrow", "flexShrink", "flexBasis"),
  fc.oneof(fc.integer({ min: 0, max: 40 }), fc.constant(token)),
).map(([prop, value]) => ({ [prop]: value }))

describe("native numeric flex semantics", () => {
  it("retains numeric flex instead of creating CSS longhands", () => {
    for (const value of ["2", "0", "-1", "0.25", "1e2", "1e-7", "-0"]) {
      const result = convert([["flex", value]])!
      expect(result).toEqual({ flex: Number(value) })
      expect(Object.is(result.flex, Number(value))).toBe(true)
    }
  })
  it("preserves explicit native siblings regardless of flex order or representation", () => {
    for (const raw of ["2", "0", "-1", token]) for (const reverse of [true, false]) {
      const declarations: Array<readonly [string, string]> = [["flex", raw], ["flex-grow", "3"], ["flex-shrink", "0"], ["flex-basis", "25%"]]
      if (reverse) declarations.reverse()
      expect(convert(declarations)).toEqual({ flex: raw === token ? 2 : Number(raw), flexGrow: 3, flexShrink: 0, flexBasis: "25%" })
    }
  })
  it("resolves only surviving same-property tokens without deleting sibling fields", () => {
    const empty = { ...theme, tokens: {} }
    expect(resolveThemeTokens(cssDeclarationsToRN([["flex", token], ["flex", "0"]]), empty)).toEqual({ flex: 0 })
    expect(() => resolveThemeTokens(cssDeclarationsToRN([["flex", token], ["flex-grow", "3"]]), empty)).toThrow("CRUMBS_CSS_MISSING_THEME_TOKEN")
    expect(convert([["flex", "-1"], ["flex", token]])).toEqual({ flex: 2 })
  })
  it("rejects CSS flex forms and nonfinite values instead of emitting different semantics", () => {
    for (const value of ["none", "auto", "initial", "1 0 auto", "1 2", "20px", "25%", "NaN", "Infinity", "1e999", ""]) {
      expect(() => cssDeclarationsToRN([["flex", value]], { strictDiagnostics: true })).toThrow("CRUMBS_CSS_DROPPED_DECLARATION")
      expect(cssDeclarationsToRN([["flex", value]])).toEqual({})
    }
  })
  it("rejects unsupported JavaScript/CSS flex during compilation", async () => {
    for (const value of ["auto", "1 0 auto"]) {
      await expect(compile(`export const invalid = viewStyle({ flex: ${JSON.stringify(value)} });`)).rejects.toThrow("CRUMBS_IR_INVALID_VALUE")
    }
  })
  it("matches independent native declaration merging", () => {
    fc.assert(fc.property(fc.array(generatedRule, { minLength: 1, maxLength: 40 }), rules => {
      const declarations = rules.flatMap(rule => Object.entries(rule).map(([prop, value]) => [
        prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), prop === "flexBasis" && typeof value === "number" ? `${value}px` : String(value),
      ] as const))
      expect(convert(declarations)).toEqual(reference(rules))
    }), { seed: 20260926, numRuns: 100 })
  })
  it("matches independent compiled nested/repeated-base merging", async () => {
    function author(rule: Rule) { return JSON.stringify(rule).replaceAll(JSON.stringify(token), "vars.flexRegression.value") }
    await fc.assert(fc.asyncProperty(fc.array(generatedRule, { minLength: 2, maxLength: 8 }), async rules => {
      const result = await compile(`const first = viewStyle(${author(rules[0]!)});
        export const result = viewStyle([first, [${rules.slice(1).map(author).join(",")}], first]);`)
      expect(resolveThemeTokens(result.result, theme)).toEqual(reference([...rules, rules[0]!]))
    }), { seed: 20260927, numRuns: 100 })
  })
  it("preserves helpers, variants and recipes in both emitters", async () => {
    for (const useStyleSheet of [true, false]) {
      const code = await transformCssTsToStyleSheet(path.join(root, "fixtures/flex-precedence.css.ts"), root, { strictDiagnostics: true, useStyleSheet })
      const result = JSON.parse(JSON.stringify(resolveThemeStyles(evaluate(code), theme)))
      expect(result.broad).toEqual({ flex: 2, flexGrow: 3, flexShrink: 0, flexBasis: "25%" })
      expect(result.reverse).toEqual(result.broad)
      expect(result.repeated).toEqual({ flex: 2 })
      expect(result.text).toEqual({ flex: -1 })
      expect(result.image).toEqual({ flex: 0 })
      expect(result.states).toEqual({ positive: { flex: 2 }, zero: { flex: 0 } })
      expect(result.button.base).toEqual({ flex: 2, flexShrink: 0 })
      expect(result.button.variants.selected.true).toEqual({ flex: -1, flexBasis: "auto" })
    }
  })
})
