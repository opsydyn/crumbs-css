import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import { cssDeclarationsToRN } from "../src/css-to-rn"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { resolveThemeStyles, resolveThemeTokens } from "../src/theme-runtime"

const token = "var(--crumbs-logical-regression-value)"
const theme = { contract: {}, values: {}, tokens: { "--crumbs-logical-regression-value": 8 } }
const root = path.resolve(import.meta.dir, "..")
type Rule = Record<string, string | number>
const equivalents: Record<string, string[]> = {
  padding: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
  margin: ["marginTop", "marginRight", "marginBottom", "marginLeft"],
}
for (const family of ["padding", "margin"]) {
  equivalents[family + "Inline"] = [family + "Left", family + "Right"]
  equivalents[family + "Block"] = [family + "Top", family + "Bottom"]
  equivalents[family + "InlineStart"] = [family + "Start"]
  equivalents[family + "InlineEnd"] = [family + "End"]
  equivalents[family + "BlockStart"] = [family + "Top"]
  equivalents[family + "BlockEnd"] = [family + "Bottom"]
}
// Independently specified authoring aliases; direction-dependent fields stay distinct.
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
  const dir = mkdtempSync(path.join(root, "fixtures/.logical-"))
  try {
    const file = path.join(dir, "case.css.ts")
    writeFileSync(file, `import { viewStyle, createThemeContract } from '@opsydyn/crumbs-css/style';
      const vars = createThemeContract({ logicalRegression: { value: null } }); ${source}`)
    return evaluate(await transformCssTsToStyleSheet(file, root, { strictDiagnostics: true, useStyleSheet: false }))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
const generatedRule = fc.tuple(
  fc.constantFrom(...Object.keys(equivalents), "paddingStart", "paddingEnd", "paddingLeft", "paddingTop", "marginEnd", "marginRight", "marginBottom", "borderStartWidth", "borderLeftWidth", "borderEndStartRadius", "borderTopLeftRadius"),
  fc.oneof(fc.integer({ min: 0, max: 40 }), fc.constant(token)),
).map(([prop, value]) => ({ [prop]: value }))
function declarations(rules: Rule[]) {
  return rules.flatMap(rule => Object.entries(rule).map(([prop, value]) => [
    prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), typeof value === "number" ? `${value}px` : value,
  ] as const))
}
describe("logical and physical authoring overlaps", () => {
  it("normalizes all spacing aliases identically for tokens and literals in either order", () => {
    for (const family of ["padding", "margin"]) for (const suffix of ["Inline", "Block", "InlineStart", "InlineEnd", "BlockStart", "BlockEnd"]) {
      const prop = family + suffix, canonical = equivalents[prop]![0]!
      for (const raw of [token, 3]) for (const reverse of [true, false]) {
        const rules = [{ [prop]: raw }, { [canonical]: 2 }]
        if (reverse) rules.reverse()
        expect(convert(declarations(rules))).toEqual(reference(rules))
      }
    }
  })
  it("lets later inline/block aliases replace earlier expanded broad sides", () => {
    expect(convert([["padding", "1px"], ["padding-inline", token], ["padding-block-start", "0px"]])).toEqual({ paddingTop: 0, paddingRight: 8, paddingBottom: 1, paddingLeft: 8 })
    expect(convert([["margin", token], ["margin-block", "25%"], ["margin-inline-end", "auto"]])).toEqual({ marginTop: "25%", marginRight: 8, marginBottom: "25%", marginLeft: 8, marginEnd: "auto" })
  })
  it("preserves native start/end border and spacing fields beside physical broad overrides", () => {
    const result = convert([["padding-start", token], ["padding", "2px"], ["border-start-width", "3px"], ["border-width", "1px"], ["border-end-color", "red"], ["border-color", "blue"], ["border-top-start-radius", "4px"], ["border-radius", "2px"]])!
    expect(result.paddingStart).toBe(8); expect(result.paddingLeft).toBe(2); expect(result.paddingRight).toBe(2)
    expect(result.borderStartWidth).toBe(3); expect(result.borderLeftWidth).toBe(1)
    expect(result.borderEndColor).toBe("red"); expect(result.borderRightColor).toBe("blue")
    expect(result.borderTopStartRadius).toBe(4); expect(result.borderTopLeftRadius).toBe(2)
    // Source-grounded Yoga precedence oracle, not a device/layout-engine test.
    const selected = (direction: "ltr" | "rtl") => direction === "ltr" ? { left: result.paddingStart, right: result.paddingRight } : { left: result.paddingLeft, right: result.paddingStart }
    expect(selected("ltr")).toEqual({ left: 8, right: 2 }); expect(selected("rtl")).toEqual({ left: 2, right: 8 })
  })
  it("admits the four already-typed logical corner radius fields for tokens and literals", () => {
    for (const prop of ["borderStartStartRadius", "borderStartEndRadius", "borderEndStartRadius", "borderEndEndRadius"]) {
      expect(convert(declarations([{ [prop]: 3 }]))).toEqual({ [prop]: 3 })
      expect(convert(declarations([{ [prop]: token }]))).toEqual({ [prop]: 8 })
    }
  })
  it("retains border fields for the renderer-specific precedence contract", () => {
    const result = convert([["border-start-color", "red"], ["border-left-color", "blue"], ["border-start-start-radius", "3px"], ["border-top-left-radius", "2px"]])!
    expect(result).toEqual({ borderStartColor: "red", borderLeftColor: "blue", borderStartStartRadius: 3, borderTopLeftRadius: 2 })
    // Installed Fabric CascadedRectangleEdges/Corners prefer physical fields.
    const color = (direction: "ltr" | "rtl") => direction === "ltr" ? { left: result.borderLeftColor, right: undefined } : { left: result.borderLeftColor, right: result.borderStartColor }
    const radius = (direction: "ltr" | "rtl") => direction === "ltr" ? { topLeft: result.borderTopLeftRadius, topRight: undefined } : { topLeft: result.borderTopLeftRadius, topRight: result.borderStartStartRadius }
    expect(color("ltr")).toEqual({ left: "blue", right: undefined }); expect(color("rtl")).toEqual({ left: "blue", right: "red" })
    expect(radius("ltr")).toEqual({ topLeft: 2, topRight: undefined }); expect(radius("rtl")).toEqual({ topLeft: 2, topRight: 3 })
  })
  it("resolves only surviving alias tokens, retaining direction-dependent tokens", () => {
    const empty = { ...theme, tokens: {} }
    expect(resolveThemeTokens(cssDeclarationsToRN([["padding-inline-start", token], ["padding-start", "2px"]]), empty)).toEqual({ paddingStart: 2 })
    expect(() => resolveThemeTokens(cssDeclarationsToRN([["padding-start", token], ["padding", "2px"]]), empty)).toThrow("CRUMBS_CSS_MISSING_THEME_TOKEN")
  })
  it("rejects multi-value spacing aliases instead of passing native string payloads", () => {
    for (const prop of ["padding-inline", "margin-block", "padding-inline-start", "paddingInline", "marginBlock"]) {
      expect(() => cssDeclarationsToRN([[prop, "1px 2px"]], { strictDiagnostics: true })).toThrow("CRUMBS_CSS_DROPPED_DECLARATION")
      expect(cssDeclarationsToRN([[prop, "1px 2px"]])).toEqual({})
    }
  })
  it("matches independent ordered alias declarations", () => {
    fc.assert(fc.property(fc.array(generatedRule, { minLength: 1, maxLength: 40 }), rules => {
      expect(convert(declarations(rules))).toEqual(reference(rules))
    }), { seed: 20260928, numRuns: 100 })
  })
  it("matches independent nested and repeated-base alias compositions", async () => {
    function author(rule: Rule) { return JSON.stringify(rule).replaceAll(JSON.stringify(token), "vars.logicalRegression.value") }
    await fc.assert(fc.asyncProperty(fc.array(generatedRule, { minLength: 2, maxLength: 8 }), async rules => {
      const result = await compile(`const first = viewStyle(${author(rules[0]!)}); export const result = viewStyle([first, [${rules.slice(1).map(author).join(",")}], first]);`)
      expect(resolveThemeTokens(result.result, theme)).toEqual(reference([...rules, rules[0]!]))
    }), { seed: 20260929, numRuns: 100 })
  })
  it("preserves the tracked typed fixture in both emitters", async () => {
    for (const useStyleSheet of [true, false]) {
      const code = await transformCssTsToStyleSheet(path.join(root, "fixtures/logical-precedence.css.ts"), root, { strictDiagnostics: true, useStyleSheet })
      const result = JSON.parse(JSON.stringify(resolveThemeStyles(evaluate(code), theme)))
      const broad = { paddingTop: 1, paddingRight: 8, paddingBottom: 1, paddingLeft: 8, paddingStart: 3 }
      expect(result.broad).toEqual(broad); expect(result.reverse).toEqual({ ...broad, paddingRight: 1, paddingLeft: 1 })
      expect(result.text).toEqual({ paddingStart: 8 }); expect(result.image).toEqual({ marginBottom: 8 })
      expect(result.states).toEqual({ logical: { borderStartStartRadius: 8 }, physical: { borderTopLeftRadius: 3 } })
      expect(result.button.base).toEqual({ paddingStart: 8, paddingLeft: 2 })
      expect(result.button.variants.selected.true).toEqual({ borderEndEndRadius: 8 })
    }
  })
})
