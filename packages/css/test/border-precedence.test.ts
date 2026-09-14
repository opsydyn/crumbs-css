import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import { cssDeclarationsToRN } from "../src/css-to-rn"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { resolveThemeStyles, resolveThemeTokens } from "../src/theme-runtime"

const widthToken = "var(--crumbs-border-regression-width)"
const colorToken = "var(--crumbs-border-regression-color)"
const theme = { contract: {}, values: {}, tokens: {
  "--crumbs-border-regression-width": 6,
  "--crumbs-border-regression-color": "purple",
} }
const edges = ["Top", "Right", "Bottom", "Left"] as const
const root = path.resolve(import.meta.dir, "..")

// A semantic evaluator specified independently of the converter's expansion map.
function reference(rules: ReadonlyArray<Record<string, string | number>>) {
  const result: Record<string, string | number> = {}
  for (const rule of rules) for (const [prop, raw] of Object.entries(rule)) {
    const value = raw === widthToken ? 6 : raw === colorToken ? "purple" : raw
    if (prop === "borderWidth" || prop === "borderColor") {
      for (const edge of edges) result[`border${edge}${prop === "borderWidth" ? "Width" : "Color"}`] = value
    } else result[prop] = value
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

async function compile(source: string, useStyleSheet = false) {
  const dir = mkdtempSync(path.join(root, "fixtures/.border-"))
  try {
    const file = path.join(dir, "case.css.ts")
    writeFileSync(file, `import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe, createThemeContract } from '@opsydyn/crumbs-css/style';
      const vars = createThemeContract({ borderRegression: { width: null, color: null } });
      ${source}`)
    const code = await transformCssTsToStyleSheet(file, root, { strictDiagnostics: true, useStyleSheet })
    return evaluate(code)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe("canonical physical border precedence", () => {
  for (const family of ["Width", "Color"] as const) {
    it(`preserves ${family} token/literal overlap in both orders on every side`, () => {
      const token = family === "Width" ? widthToken : colorToken
      const broad = family === "Width" ? "2px" : "red"
      const narrow = family === "Width" ? "3px" : "blue"
      for (const edge of edges) for (const tokenBroad of [false, true]) for (const reverse of [false, true]) {
        const rules = [
          { [`border${family}`]: tokenBroad ? token : family === "Width" ? 2 : "red" },
          { [`border${edge}${family}`]: tokenBroad ? family === "Width" ? 3 : "blue" : token },
        ]
        const declarations: Array<readonly [string, string]> = [
          [`border-${family.toLowerCase()}`, tokenBroad ? token : broad],
          [`border-${edge.toLowerCase()}-${family.toLowerCase()}`, tokenBroad ? narrow : token],
        ]
        if (reverse) { rules.reverse(); declarations.reverse() }
        expect(convert(declarations)).toEqual(reference(rules))
      }
    })
  }

  it("preserves multi-value literals beside token sides", () => {
    expect(convert([["border-width", "1px 2px 3px 4px"], ["border-left-width", widthToken]])).toEqual({
      borderTopWidth: 1, borderRightWidth: 2, borderBottomWidth: 3, borderLeftWidth: 6,
    })
    expect(convert([["border-color", "red green blue yellow"], ["border-top-color", colorToken]])).toEqual({
      borderTopColor: "purple", borderRightColor: "green", borderBottomColor: "blue", borderLeftColor: "yellow",
    })
  })

  it("canonicalizes compound border output before token and side overrides", () => {
    const expected = { ...reference([{ borderWidth: 2, borderColor: "red" }]), borderStyle: "solid" }
    expect(convert([["border-left-width", "4px"], ["border", "2px solid red"]])).toEqual(expected)
    expect(convert([["border", "2px solid red"], ["border-width", widthToken], ["border-left-color", colorToken]])).toEqual({
      ...expected, ...reference([{ borderWidth: widthToken }]), borderLeftColor: "purple",
    })
    expect(convert([["border-color", colorToken], ["border", "2px solid red"]])).toEqual(expected)
  })

  it("resolves only surviving tokens after complete or partial overrides", () => {
    for (const family of ["Width", "Color"] as const) {
      const token = family === "Width" ? widthToken : colorToken
      const declarations: Array<readonly [string, string]> = [[`border-${family.toLowerCase()}`, token]]
      for (const edge of edges) declarations.push([`border-${edge.toLowerCase()}-${family.toLowerCase()}`, family === "Width" ? "2px" : "red"])
      const empty = { ...theme, tokens: {} }
      expect(resolveThemeTokens(cssDeclarationsToRN(declarations), empty)).toEqual(reference([{ [`border${family}`]: family === "Width" ? 2 : "red" }]))
      declarations.pop()
      expect(() => resolveThemeTokens(cssDeclarationsToRN(declarations), empty)).toThrow("CRUMBS_CSS_MISSING_THEME_TOKEN")
    }
  })

  it("retains strict rejection of unsupported compound token and side-style forms", () => {
    expect(() => cssDeclarationsToRN([["border", widthToken]], { strictDiagnostics: true })).toThrow("CRUMBS_CSS_DROPPED_DECLARATION")
    expect(() => cssDeclarationsToRN([["border", `2px solid ${colorToken}`]], { strictDiagnostics: true })).toThrow("CRUMBS_CSS_VARIABLE_DROPPED")
    expect(() => cssDeclarationsToRN([["border-top", "2px solid red"]], { strictDiagnostics: true })).toThrow("CRUMBS_CSS_DROPPED_DECLARATION")
  })

  it("matches independent generated declaration evaluation", () => {
    const width = fc.tuple(fc.constantFrom("borderWidth", ...edges.map(edge => `border${edge}Width`)), fc.oneof(fc.integer({ min: 0, max: 30 }), fc.constant(widthToken)))
    const color = fc.tuple(fc.constantFrom("borderColor", ...edges.map(edge => `border${edge}Color`)), fc.constantFrom("red", "blue", "green", colorToken))
    fc.assert(fc.property(fc.array(fc.oneof(width, color), { minLength: 1, maxLength: 40 }), sequence => {
      const declarations = sequence.map(([prop, value]) => [
        prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`),
        typeof value === "number" ? `${value}px` : value,
      ] as const)
      expect(convert(declarations)).toEqual(reference(sequence.map(([prop, value]) => ({ [prop]: value }))))
    }), { seed: 20260922, numRuns: 100 })
  })

  it("matches independent generated nested and repeated-base compositions", async () => {
    const width = fc.tuple(fc.constantFrom("borderWidth", ...edges.map(edge => `border${edge}Width`)), fc.oneof(fc.integer({ min: 0, max: 30 }), fc.constant(widthToken)))
    const color = fc.tuple(fc.constantFrom("borderColor", ...edges.map(edge => `border${edge}Color`)), fc.constantFrom("red", "blue", "green", colorToken))
    const rule = fc.oneof(width, color).map(([prop, value]) => ({ [prop]: value }))
    function author(rule: Record<string, string | number>) {
      return JSON.stringify(rule).replaceAll(JSON.stringify(widthToken), "vars.borderRegression.width")
        .replaceAll(JSON.stringify(colorToken), "vars.borderRegression.color")
    }
    await fc.assert(fc.asyncProperty(fc.array(rule, { minLength: 2, maxLength: 8 }), async rules => {
      const result = await compile(`
        const first = viewStyle(${author(rules[0]!)});
        const second = viewStyle(${author(rules[1]!)});
        export const result = viewStyle([first, [second, ${rules.slice(2).map(author).join(",")}], first]);
      `)
      expect(resolveThemeTokens(result.result, theme)).toEqual(reference([...rules, rules[0]!]))
    }), { seed: 20260923, numRuns: 100 })
  })

  it("preserves compiled rules, nested/repeated bases, helpers, variants and recipes in both emitters", async () => {
    const broad = reference([{ borderWidth: widthToken, borderColor: colorToken }])
    const narrow = { ...broad, borderLeftWidth: 3, borderTopColor: "blue" }
    for (const useStyleSheet of [false, true]) {
      const code = await transformCssTsToStyleSheet(path.join(root, "fixtures/border-precedence.css.ts"), root, {
        strictDiagnostics: true, useStyleSheet,
      })
      const result = resolveThemeStyles(evaluate(code), theme) as Record<string, unknown> & {
        button: { base: unknown; variants: { selected: { true: unknown } } }
        states: { broad: unknown; narrow: unknown }
      }
      expect(result.compound).toEqual({ ...reference([{ borderWidth: 2, borderColor: "red" }]), borderStyle: "solid" })
      expect(result.broadWins).toEqual(broad)
      expect(result.narrowWins).toEqual(narrow)
      expect(result.repeated).toEqual(broad)
      expect(result.sameRule).toEqual({ ...broad, borderTopColor: "blue" })
      expect(result.text).toEqual(broad)
      expect(result.image).toEqual(narrow)
      expect(Object.keys(result.states)).toEqual(["broad", "narrow"])
      expect(result.states.broad).toEqual(broad)
      expect(result.states.narrow).toEqual(narrow)
      expect(result.button.base).toEqual(broad)
      expect(result.button.variants.selected.true).toEqual({ ...reference([{ borderWidth: widthToken }]), borderTopWidth: 2 })
    }
  })
})
