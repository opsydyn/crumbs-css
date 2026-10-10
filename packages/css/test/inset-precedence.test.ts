import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import { cssDeclarationsToRN } from "../src/css-to-rn"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { resolveThemeStyles, resolveThemeTokens } from "../src/theme-runtime"

const token = "var(--crumbs-inset-regression-value)"
const theme = { contract: {}, values: {}, tokens: { "--crumbs-inset-regression-value": 8 } }
const root = path.resolve(import.meta.dir, "..")
type Rule = Record<string, string | number>
const equivalents: Record<string, string[]> = {
  inset: ["top", "right", "bottom", "left"], insetInline: ["left", "right"], insetBlock: ["top", "bottom"],
  insetInlineStart: ["start"], insetInlineEnd: ["end"], insetBlockStart: ["top"], insetBlockEnd: ["bottom"],
}
// Independent ordered-authoring model; start/end remain native fields.
function reference(rules: ReadonlyArray<Rule>) {
  const result: Rule = {}
  for (const rule of rules) for (const [prop, raw] of Object.entries(rule)) {
    for (const key of equivalents[prop] ?? [prop]) result[key] = raw === token ? 8 : raw
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
  const dir = mkdtempSync(path.join(root, "fixtures/.inset-"))
  try {
    const file = path.join(dir, "case.css.ts")
    writeFileSync(file, `import { viewStyle, createThemeContract } from '@opsydyn/crumbs-css/style';
      const vars = createThemeContract({ insetRegression: { value: null } }); ${source}`)
    return evaluate(await transformCssTsToStyleSheet(file, root, { strictDiagnostics: true, useStyleSheet: false }))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
const generatedRule = fc.tuple(
  fc.constantFrom(...Object.keys(equivalents), "top", "right", "bottom", "left", "start", "end"),
  fc.oneof(fc.integer({ min: -40, max: 40 }), fc.constant(token)),
).map(([prop, value]) => ({ [prop]: value }))
function declarations(rules: Rule[]) {
  return rules.flatMap(rule => Object.entries(rule).map(([prop, value]) => [
    prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), typeof value === "number" ? `${value}px` : value,
  ] as const))
}

describe("canonical inset authoring", () => {
  it("normalizes all seven aliases for tokens and literals in either order", () => {
    for (const [prop, sides] of Object.entries(equivalents)) for (const side of sides) for (const raw of [token, 3]) for (const reverse of [true, false]) {
      const rules = [{ [prop]: raw }, { [side]: 2 }]
      if (reverse) rules.reverse()
      expect(convert(declarations(rules))).toEqual(reference(rules))
    }
  })
  it("preserves broad/pair/side ordering and negative, percentage, auto and zero values", () => {
    expect(convert([["inset", "-2px"], ["inset-inline", token], ["inset-block-start", "0px"]])).toEqual({ top: 0, right: 8, bottom: -2, left: 8 })
    expect(convert([["inset", "25%"], ["inset-block", "auto"], ["inset-inline-end", "-3px"]])).toEqual({ top: "auto", right: "25%", bottom: "auto", left: "25%", end: -3 })
    expect(convert([["inset-block-start", "0px"], ["inset", token]])).toEqual({ top: 8, right: 8, bottom: 8, left: 8 })
  })
  it("requires only surviving same-field tokens", () => {
    const empty = { ...theme, tokens: {} }
    const all: Array<readonly [string, string]> = [["inset", token], ["inset-inline", "2px"], ["inset-block", "3px"]]
    expect(resolveThemeTokens(cssDeclarationsToRN(all), empty)).toEqual({ top: 3, right: 2, bottom: 3, left: 2 })
    all.pop()
    expect(() => resolveThemeTokens(cssDeclarationsToRN(all), empty)).toThrow("CRUMBS_CSS_MISSING_THEME_TOKEN")
    expect(resolveThemeTokens(cssDeclarationsToRN([["inset-inline-start", token], ["start", "0px"]]), empty)).toEqual({ start: 0 })
  })
  it("preserves native start/end fields beside physical inset sides", () => {
    const result = convert([["inset-inline-start", token], ["inset", "2px"], ["inset-inline-end", "3px"]])!
    expect(result).toEqual({ start: 8, top: 2, right: 2, bottom: 2, left: 2, end: 3 })
    // Source-grounded Yoga edge selection, not native layout/device acceptance.
    const edges = (direction: "ltr" | "rtl") => direction === "ltr" ? { left: result.start, right: result.end } : { left: result.end, right: result.start }
    expect(edges("ltr")).toEqual({ left: 8, right: 3 }); expect(edges("rtl")).toEqual({ left: 3, right: 8 })
    expect(() => resolveThemeTokens(cssDeclarationsToRN([["start", token], ["inset", "2px"]]), { ...theme, tokens: {} })).toThrow("CRUMBS_CSS_MISSING_THEME_TOKEN")
  })
  it("rejects unsupported CSS forms for kebab and camel aliases", () => {
    for (const prop of Object.keys(equivalents)) for (const name of [prop, prop.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)]) {
      for (const value of ["1px 2px", "calc(100% - 2px)", "1em", "red", "Infinity", "1e999"]) {
        expect(() => cssDeclarationsToRN([[name, value]], { strictDiagnostics: true })).toThrow("CRUMBS_CSS_DROPPED_DECLARATION")
        expect(cssDeclarationsToRN([[name, value]])).toEqual({})
      }
    }
  })
  it("rejects unsupported JavaScript inset forms during compilation", async () => {
    for (const prop of ["inset", "insetInline"]) await expect(compile(`export const invalid = viewStyle({ ${prop}: "1px 2px" });`)).rejects.toThrow("CRUMBS_IR_INVALID_VALUE")
  })
  it("matches independent generated declaration evaluation", () => {
    fc.assert(fc.property(fc.array(generatedRule, { minLength: 1, maxLength: 40 }), rules => {
      expect(convert(declarations(rules))).toEqual(reference(rules))
    }), { seed: 20260930, numRuns: 100 })
  })
  it("matches independent compiled nested/repeated-base evaluation", async () => {
    function author(rule: Rule) { return JSON.stringify(rule).replaceAll(JSON.stringify(token), "vars.insetRegression.value") }
    await fc.assert(fc.asyncProperty(fc.array(generatedRule, { minLength: 2, maxLength: 8 }), async rules => {
      const result = await compile(`const first = viewStyle(${author(rules[0]!)}); export const result = viewStyle([first, [${rules.slice(1).map(author).join(",")}], first]);`)
      expect(resolveThemeTokens(result.result, theme)).toEqual(reference([...rules, rules[0]!]))
    }), { seed: 20260931, numRuns: 100 })
  }, 30000)
  it("preserves the typed fixture through both emitters", async () => {
    for (const useStyleSheet of [true, false]) {
      const code = await transformCssTsToStyleSheet(path.join(root, "fixtures/inset-precedence.css.ts"), root, { strictDiagnostics: true, useStyleSheet })
      const result = JSON.parse(JSON.stringify(resolveThemeStyles(evaluate(code), theme)))
      const broad = { top: 1, right: 8, bottom: 1, left: 8, start: 3 }
      expect(result.broad).toEqual(broad); expect(result.reverse).toEqual({ ...broad, right: 1, left: 1 })
      expect(result.text).toEqual({ start: 8 }); expect(result.image).toEqual({ bottom: 8 })
      expect(result.states).toEqual({ logical: { end: 8 }, physical: { left: 3 } })
      expect(result.button.base).toEqual({ start: 8, left: 2 })
      expect(result.button.variants.selected.true).toEqual({ top: -2, bottom: -2 })
    }
  })
})
