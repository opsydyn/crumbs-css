import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import * as path from "node:path"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import {
  captureScalarIntoNativeIr,
  decodeScalarBlock,
  lowerScalarBlock,
  NativeIrAdmissionError,
  normalizeScalarBlocks,
  type ScalarCaptureContext,
} from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"
import { transformCssTsToStyleSheet } from "../src/transformer"

const root = path.resolve(import.meta.dir, "..")
const context: ScalarCaptureContext = {
  packageOwner: "@fixture/app",
  sourceId: "styles/dimensions.css.ts",
  className: "dimensions_class",
}
const properties = ["width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight"] as const

async function compile(source: string, useStyleSheet = false): Promise<Record<string, unknown>> {
  const dir = mkdtempSync(path.join(root, "fixtures/.native-ir-dimensions-"))
  const file = path.join(dir, "case.css.ts")
  try {
    writeFileSync(file, source)
    const code = await transformCssTsToStyleSheet(file, root, { useStyleSheet, strictDiagnostics: false })
    const exports: Record<string, unknown> = {}
    const StyleSheet = { create: (styles: unknown) => styles }
    runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), { exports, StyleSheet })
    return exports
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe("production native IR DimensionValue size family", () => {
  it("captures every size property before CSS with native point, auto, percentage and token values", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({
      width: 120,
      height: "50%",
      minWidth: -0,
      minHeight: "auto",
      maxWidth: "1e2%",
      maxHeight: "var(--crumbs-max-height)",
      padding: 8,
    }, ["view", "text", "image"]), context)
    expect(captured.cssRule).toEqual({ padding: 8 })
    expect(captured.block?.declarations.map(({ property, value }) => [property, value])).toEqual([
      ["width", 120],
      ["height", "50%"],
      ["minWidth", -0],
      ["minHeight", "auto"],
      ["maxWidth", "1e2%"],
      ["maxHeight", { _tag: "LegacyTokenReference", varName: "--crumbs-max-height" }],
    ])
    expect(lowerScalarBlock(captured.block!)).toEqual({
      width: 120,
      height: "50%",
      minWidth: -0,
      minHeight: "auto",
      maxWidth: "1e2%",
      maxHeight: { $$type: "crumbs.css.theme-token", varName: "--crumbs-max-height" },
    })
  })

  it("admits the installed FlexStyle domain for every property", () => {
    for (const property of properties) for (const primitive of ["view", "text", "image"] as const) {
      expect(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: "25%" }, [primitive]), context).block?.primitiveDomain)
        .toEqual([primitive])
    }
  })

  it("rejects values outside the static DimensionValue subset without fallback", () => {
    for (const property of properties) for (const value of [
      NaN, Infinity, -Infinity, null, "10", "10px", "none", "calc(1px)", "NaN%", "Infinity%", {}, [],
    ]) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), context))
        .toThrow(NativeIrAdmissionError)
    }
  })

  it("enforces size value domains and property provenance at schema decode", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ width: "25%" }, ["view"]), context).block!
    expect(decodeScalarBlock(block, context.sourceId).declarations[0].value).toBe("25%")
    expect(() => decodeScalarBlock({
      ...block,
      declarations: [{ ...block.declarations[0], value: "25px" }],
    }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({
      ...block,
      declarations: [{
        ...block.declarations[0],
        provenance: { ...block.declarations[0].provenance, authoredProperty: "height" },
      }],
    }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent per-property last-winner evaluation", () => {
    const value = fc.oneof(
      fc.double({ noNaN: true, noDefaultInfinity: true }),
      fc.integer({ min: -1000, max: 1000 }).map(number => `${number}%` as const),
      fc.constant("auto" as const),
    )
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom(...properties), value), { minLength: 1, maxLength: 30 }), entries => {
      const blocks = entries.map(([property, scalar], index) => captureScalarIntoNativeIr(
        markNativeCaptureRule({ [property]: scalar }, ["view"]),
        { ...context, className: `size_${index}` },
      ).block!)
      const actual = lowerScalarBlock(normalizeScalarBlocks(blocks))
      const expected = Object.fromEntries(entries.map(([property, scalar]) => [property, scalar]))
      expect(actual).toEqual(expected)
    }), { seed: 20260922, numRuns: 100 })
  })

  for (const useStyleSheet of [true, false]) {
    it(`preserves sizes across helpers and composition with useStyleSheet=${useStyleSheet}`, async () => {
      const exports = await compile(`
        import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe, createThemeContract } from '@opsydyn/crumbs-css/style'
        const vars = createThemeContract({ size: null })
        const base = viewStyle({ width: 100, height: '50%', minWidth: 20, maxHeight: 'auto' })
        export const composed = viewStyle([base, { width: vars.size, minHeight: 30 }])
        export const generic = style({ maxWidth: '75%' })
        export const text = textStyle({ width: 'auto' })
        export const image = imageStyle({ height: 80 })
        export const states = styleVariants({ active: { minWidth: '25%' } })
        export const card = recipe({ variants: { size: { large: { maxWidth: 640 } } } })
      `, useStyleSheet)
      expect(exports.composed).toEqual({
        width: { $$type: "crumbs.css.theme-token", varName: "--crumbs-size" },
        height: "50%",
        minWidth: 20,
        minHeight: 30,
        maxHeight: "auto",
      })
      expect(exports.generic).toEqual({ maxWidth: "75%" })
      expect(exports.text).toEqual({ width: "auto" })
      expect(exports.image).toEqual({ height: 80 })
      expect((exports.states as { active: unknown }).active).toEqual({ minWidth: "25%" })
      expect((exports.card as { variants: { size: { large: unknown } } }).variants.size.large).toEqual({ maxWidth: 640 })
    })
  }

  it("keeps unmarked vanilla-extract sizes on the compatibility route", async () => {
    const exports = await compile(`
      import { style as vanillaStyle } from '@vanilla-extract/css'
      export const legacy = vanillaStyle({ width: 120, maxHeight: '50%' })
    `)
    expect(exports.legacy).toEqual({ width: 120, maxHeight: "50%" })
  })
})
