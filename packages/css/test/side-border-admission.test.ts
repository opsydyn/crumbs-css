import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { runInNewContext } from "node:vm"
import { cssDeclarationsToRN } from "../src/css-to-rn"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { resolveThemeStyles, resolveThemeTokens } from "../src/theme-runtime"

const token = "var(--crumbs-side-border-regression-value)"
const theme = { contract: {}, values: {}, tokens: { "--crumbs-side-border-regression-value": 3 } }
const root = path.resolve(import.meta.dir, "..")
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
  const dir = mkdtempSync(path.join(root, "fixtures/.side-border-"))
  try {
    const file = path.join(dir, "case.css.ts")
    writeFileSync(file, `import { viewStyle, createThemeContract } from '@opsydyn/crumbs-css/style';
      const vars = createThemeContract({ sideBorderRegression: { value: null } }); ${source}`)
    return evaluate(await transformCssTsToStyleSheet(file, root, { strictDiagnostics: true, useStyleSheet: false }))
  } finally { rmSync(dir, { recursive: true, force: true }) }
}
const sides = ["borderTop", "borderRight", "borderBottom", "borderLeft", "borderInline", "borderBlock", "borderInlineStart", "borderInlineEnd", "borderBlockStart", "borderBlockEnd"]
const unsupported = [...sides, ...sides.map(side => side + "Style")]
describe("side compound border admission", () => {
  it("rejects complete unsupported declarations with actionable contextual diagnostics", () => {
    for (const prop of unsupported) for (const name of [prop, prop.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)]) for (const value of ["2px solid red", token]) {
      let error: unknown
      try { cssDeclarationsToRN([[name, value]], { strictDiagnostics: true, context: { exportName: "card", filePath: "card.css.ts" } }) } catch (caught) { error = caught }
      expect(String(error)).toContain("CRUMBS_CSS_DROPPED_DECLARATION")
      expect(String(error)).toContain("borderStyle")
      expect(String(error)).toContain("card.css.ts")
    }
  })
  it("drops the entire unsupported declaration in permissive mode without losing valid siblings", () => {
    for (const prop of unsupported) for (const value of ["2px solid red", token]) {
      const name = prop.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
      expect(cssDeclarationsToRN([["opacity", "1"], [name, value], ["border-left-width", "3px"]])).toEqual({ opacity: 1, borderLeftWidth: 3 })
    }
  })
  it("keeps broad literal borders and explicit side width/color with global style", () => {
    expect(convert([["border", "2px solid red"], ["border-left-width", token], ["border-top-color", "blue"]])).toEqual({ borderTopWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderLeftWidth: 3, borderTopColor: "blue", borderRightColor: "red", borderBottomColor: "red", borderLeftColor: "red", borderStyle: "solid" })
    expect(convert([["border-top-width", token], ["border-start-color", "red"], ["border-style", "dashed"]])).toEqual({ borderTopWidth: 3, borderStartColor: "red", borderStyle: "dashed" })
  })
  it("rejects side compound and style JavaScript rules during compilation", async () => {
    for (const prop of ["borderTop", "borderLeftStyle", "borderInline"]) {
      await expect(compile(`export const invalid = viewStyle({ ${prop}: ${JSON.stringify(prop.endsWith("Style") ? "solid" : "2px solid red")} });`)).rejects.toThrow("CRUMBS_CSS_DROPPED_DECLARATION")
    }
  })
  it("preserves the supported migration fixture in both emitters", async () => {
    for (const useStyleSheet of [true, false]) {
      const code = await transformCssTsToStyleSheet(path.join(root, "fixtures/side-border-admission.css.ts"), root, { strictDiagnostics: true, useStyleSheet })
      const result = JSON.parse(JSON.stringify(resolveThemeStyles(evaluate(code), theme)))
      expect(result.broad).toEqual({ borderTopWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderLeftWidth: 2, borderTopColor: "red", borderRightColor: "red", borderBottomColor: "red", borderLeftColor: "red", borderStyle: "solid" })
      expect(result.side).toEqual({ borderTopWidth: 3, borderLeftColor: "red", borderStyle: "solid" })
      expect(result.text).toEqual({ borderBottomWidth: 3, borderStyle: "dashed" })
      expect(result.image).toEqual({ borderRightWidth: 3 })
      expect(result.states).toEqual({ side: { borderStartWidth: 3, borderStyle: "dotted" } })
      expect(result.button.base).toEqual({ borderLeftWidth: 3, borderLeftColor: "red", borderStyle: "solid" })
    }
  })
})
