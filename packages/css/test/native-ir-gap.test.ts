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
const context: ScalarCaptureContext = { packageOwner: "@fixture/app", sourceId: "styles/gap.css.ts", className: "gap_class" }

async function compile(source: string, useStyleSheet: boolean): Promise<Record<string, unknown>> {
  const dir = mkdtempSync(path.join(root, "fixtures/.native-ir-gap-"))
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

describe("production native IR gap family", () => {
  it("captures broad and axis gaps before CSS with exact provenance", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ gap: "25%", rowGap: 8, columnGap: "var(--crumbs-gap)" }, ["view"]), context)
    expect(captured.cssRule).toEqual({})
    expect(captured.block?.declarations.map(({ property, value, provenance }) => ({
      property, value, authored: provenance.authoredProperty, path: provenance.shorthandExpansionPath,
    }))).toEqual([
      { property: "rowGap", value: "25%", authored: "gap", path: ["gap", "rowGap"] },
      { property: "columnGap", value: "25%", authored: "gap", path: ["gap", "columnGap"] },
      { property: "rowGap", value: 8, authored: "rowGap", path: [] },
      { property: "columnGap", value: { _tag: "LegacyTokenReference", varName: "--crumbs-gap" }, authored: "columnGap", path: [] },
    ])
  })

  it("admits every gap field for every FlexStyle primitive", () => {
    for (const property of ["gap", "rowGap", "columnGap"] as const) for (const primitive of ["view", "text", "image"] as const) {
      expect(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: 4 }, [primitive]), context).block?.primitiveDomain).toEqual([primitive])
    }
  })

  it("rejects values outside the static gap subset without fallback", () => {
    for (const property of ["gap", "rowGap", "columnGap"] as const) for (const value of [
      NaN, Infinity, -Infinity, null, "auto", "10", "10px", "normal", "calc(1px)", "NaN%", {}, [],
    ]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
  })

  it("rejects forged broad-gap provenance and expansion paths", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ gap: 4 }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{
      ...block.declarations[0], property: "top", provenance: { ...block.declarations[0].provenance, canonicalProperty: "top", shorthandExpansionPath: ["gap", "top"] },
    }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, declarations: [{
      ...block.declarations[0], provenance: { ...block.declarations[0].provenance, shorthandExpansionPath: ["gap", "columnGap"] },
    }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent broad/axis last-winner evaluation", () => {
    const property = fc.constantFrom("gap", "rowGap", "columnGap")
    const value = fc.oneof(fc.double({ noNaN: true, noDefaultInfinity: true }), fc.integer({ min: 0, max: 100 }).map(number => `${number}%` as const))
    fc.assert(fc.property(fc.array(fc.tuple(property, value), { minLength: 1, maxLength: 30 }), entries => {
      const expected: Record<string, number | string> = {}
      const blocks = entries.map(([authored, scalar], index) => {
        if (authored === "gap") { expected.rowGap = scalar; expected.columnGap = scalar } else expected[authored] = scalar
        return captureScalarIntoNativeIr(markNativeCaptureRule({ [authored]: scalar }, ["view"]), { ...context, className: `gap_${index}` }).block!
      })
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(expected)
    }), { seed: 20260924, numRuns: 100 })
  })

  for (const useStyleSheet of [true, false]) it(`preserves gap helpers and composition with useStyleSheet=${useStyleSheet}`, async () => {
    const exports = await compile(`
      import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe, createThemeContract } from '@opsydyn/crumbs-css/style'
      const vars = createThemeContract({ gap: null })
      const base = viewStyle({ gap: 8, rowGap: 3 })
      export const composed = viewStyle([base, { columnGap: vars.gap }])
      export const generic = style({ gap: '25%' })
      export const text = textStyle({ rowGap: 4 })
      export const image = imageStyle({ columnGap: 5 })
      export const states = styleVariants({ active: { gap: 6 } })
      export const card = recipe({ variants: { density: { tight: { gap: 2, rowGap: 1 } } } })
    `, useStyleSheet)
    expect(exports.composed).toEqual({ rowGap: 3, columnGap: { $$type: "crumbs.css.theme-token", varName: "--crumbs-gap" } })
    expect(exports.generic).toEqual({ rowGap: "25%", columnGap: "25%" })
    expect(exports.text).toEqual({ rowGap: 4 })
    expect(exports.image).toEqual({ columnGap: 5 })
    expect((exports.states as { active: unknown }).active).toEqual({ rowGap: 6, columnGap: 6 })
    expect((exports.card as { variants: { density: { tight: unknown } } }).variants.density.tight).toEqual({ columnGap: 2, rowGap: 1 })
  })

  it("keeps unmarked vanilla-extract gap records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ gap: 8, rowGap: 3 }, context)).toEqual({ cssRule: { gap: 8, rowGap: 3 } })
  })
})
