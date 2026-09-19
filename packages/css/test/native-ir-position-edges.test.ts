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
  sourceId: "styles/position.css.ts",
  className: "position_class",
}
const properties = ["top", "right", "bottom", "left", "start", "end"] as const

async function compile(source: string, useStyleSheet = false): Promise<Record<string, unknown>> {
  const dir = mkdtempSync(path.join(root, "fixtures/.native-ir-position-"))
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

describe("production native IR position-edge DimensionValue family", () => {
  it("captures physical and logical edge fields independently before CSS", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({
      top: 10,
      right: "25%",
      bottom: -0,
      left: "auto",
      start: "1e2%",
      end: "var(--crumbs-edge-end)",
      position: "absolute",
    }, ["view", "text", "image"]), context)
    expect(captured.cssRule).toEqual({})
    expect(captured.block?.declarations.map(({ property, value }) => [property, value])).toEqual([
      ["top", 10],
      ["right", "25%"],
      ["bottom", -0],
      ["left", "auto"],
      ["start", "1e2%"],
      ["end", { _tag: "LegacyTokenReference", varName: "--crumbs-edge-end" }],
      ["position", "absolute"],
    ])
    expect(lowerScalarBlock(captured.block!)).toEqual({
      top: 10,
      right: "25%",
      bottom: -0,
      left: "auto",
      start: "1e2%",
      end: { $$type: "crumbs.css.theme-token", varName: "--crumbs-edge-end" },
      position: "absolute",
    })
  })

  it("admits every edge for every FlexStyle primitive", () => {
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

  it("enforces edge value domains and provenance at schema decode", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ start: "25%" }, ["view"]), context).block!
    expect(decodeScalarBlock(block, context.sourceId).declarations[0].value).toBe("25%")
    expect(() => decodeScalarBlock({
      ...block,
      declarations: [{ ...block.declarations[0], value: "25px" }],
    }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({
      ...block,
      declarations: [{
        ...block.declarations[0],
        provenance: { ...block.declarations[0].provenance, canonicalProperty: "left" },
      }],
    }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent per-field last-winner evaluation without physical/logical collapse", () => {
    const value = fc.oneof(
      fc.double({ noNaN: true, noDefaultInfinity: true }),
      fc.integer({ min: -1000, max: 1000 }).map(number => `${number}%` as const),
      fc.constant("auto" as const),
    )
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom(...properties), value), { minLength: 1, maxLength: 30 }), entries => {
      const blocks = entries.map(([property, scalar], index) => captureScalarIntoNativeIr(
        markNativeCaptureRule({ [property]: scalar }, ["view"]),
        { ...context, className: `edge_${index}` },
      ).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(
        Object.fromEntries(entries.map(([property, scalar]) => [property, scalar])),
      )
    }), { seed: 20260923, numRuns: 100 })
  })

  for (const useStyleSheet of [true, false]) {
    it(`preserves edges across helpers and composition with useStyleSheet=${useStyleSheet}`, async () => {
      const exports = await compile(`
        import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe, createThemeContract } from '@opsydyn/crumbs-css/style'
        const vars = createThemeContract({ edge: null })
        const base = viewStyle({ position: 'absolute', top: 10, right: '25%', start: 5 })
        export const composed = viewStyle([base, { top: vars.edge, left: 'auto', end: 8 }])
        export const generic = style({ bottom: '50%' })
        export const text = textStyle({ right: -0 })
        export const image = imageStyle({ start: 12 })
        export const states = styleVariants({ active: { end: '75%' } })
        export const card = recipe({ variants: { placement: { floating: { top: 20, bottom: 'auto' } } } })
      `, useStyleSheet)
      expect(exports.composed).toEqual({
        position: "absolute",
        top: { $$type: "crumbs.css.theme-token", varName: "--crumbs-edge" },
        right: "25%",
        start: 5,
        left: "auto",
        end: 8,
      })
      expect(exports.generic).toEqual({ bottom: "50%" })
      expect(Object.is((exports.text as { right: number }).right, -0)).toBe(true)
      expect(exports.image).toEqual({ start: 12 })
      expect((exports.states as { active: unknown }).active).toEqual({ end: "75%" })
      expect((exports.card as { variants: { placement: { floating: unknown } } }).variants.placement.floating)
        .toEqual({ top: 20, bottom: "auto" })
    })
  }

  it("keeps unmarked vanilla-extract position edges on the compatibility route", async () => {
    const exports = await compile(`
      import { style as vanillaStyle } from '@vanilla-extract/css'
      export const legacy = vanillaStyle({ top: 10, start: '25%' })
    `)
    expect(exports.legacy).toEqual({ top: 10, start: "25%" })
  })
})
