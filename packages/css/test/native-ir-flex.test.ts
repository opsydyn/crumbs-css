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
  sourceId: "styles/flex.css.ts",
  className: "flex_class",
}

async function compile(source: string, useStyleSheet = false): Promise<Record<string, unknown>> {
  const dir = mkdtempSync(path.join(root, "fixtures/.native-ir-flex-"))
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

describe("production native IR scalar flex family", () => {
  it("captures scalar flex before CSS without expanding browser shorthand fields", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({
      flex: -0,
      flexGrow: 2,
      flexShrink: 3,
      flexBasis: "25%",
    }, ["view", "text", "image"]), context)
    expect(captured.cssRule).toEqual({})
    expect(captured.block?.declarations.map(({ property, value }) => [property, value])).toEqual([
      ["flex", -0],
      ["flexGrow", 2],
      ["flexShrink", 3],
      ["flexBasis", "25%"],
    ])
    const lowered = lowerScalarBlock(captured.block!)
    expect(Object.is(lowered.flex, -0)).toBe(true)
    expect(lowered).toEqual({ flex: -0, flexGrow: 2, flexShrink: 3, flexBasis: "25%" })
  })

  it("admits flex on every React Native style primitive and rejects non-scalar values", () => {
    for (const primitive of ["view", "text", "image"] as const) {
      expect(captureScalarIntoNativeIr(markNativeCaptureRule({ flex: -1.5 }, [primitive]), context).block?.primitiveDomain)
        .toEqual([primitive])
    }
    for (const value of [NaN, Infinity, -Infinity, "1", "auto", "1 0 auto", {}, []]) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ flex: value }, ["view"]), context))
        .toThrow(NativeIrAdmissionError)
    }
  })

  it("enforces flex provenance at the Effect Schema boundary", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ flex: 1 }, ["view"]), context).block!
    expect(decodeScalarBlock(block, context.sourceId).declarations[0].property).toBe("flex")
    expect(() => decodeScalarBlock({
      ...block,
      declarations: [{
        ...block.declarations[0],
        provenance: { ...block.declarations[0].provenance, canonicalProperty: "flexGrow" },
      }],
    }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("retains independent flex siblings and applies only same-field last-winner order", () => {
    fc.assert(fc.property(
      fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), { minLength: 1, maxLength: 20 }),
      values => {
        const blocks = values.map((flex, index) => captureScalarIntoNativeIr(
          markNativeCaptureRule({ flex, flexGrow: index + 1, flexShrink: index }, ["view"]),
          { ...context, className: `flex_${index}` },
        ).block!)
        const lowered = lowerScalarBlock(normalizeScalarBlocks(blocks))
        expect(Object.is(lowered.flex, values.at(-1))).toBe(true)
        expect(lowered.flexGrow).toBe(values.length)
        expect(lowered.flexShrink).toBe(values.length - 1)
      },
    ), { seed: 20260920, numRuns: 100 })
  })

  for (const useStyleSheet of [true, false]) {
    it(`preserves scalar flex, tokens and explicit siblings with useStyleSheet=${useStyleSheet}`, async () => {
      const exports = await compile(`
        import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe, createThemeContract } from '@opsydyn/crumbs-css/style'
        const vars = createThemeContract({ flex: null })
        const base = viewStyle({ flex: 1, flexGrow: 2, flexShrink: 3, flexBasis: '25%' })
        export const composed = viewStyle([base, { flex: vars.flex, flexGrow: 4 }])
        export const generic = style({ flex: -1 })
        export const text = textStyle({ flex: 0 })
        export const image = imageStyle({ flex: 0.5 })
        export const states = styleVariants({ active: { flex: 2, flexBasis: 'auto' } })
        export const button = recipe({ base: { flexShrink: 0 }, variants: { size: { fill: { flex: 3 } } } })
      `, useStyleSheet)
      expect(exports.composed).toEqual({
        flex: { $$type: "crumbs.css.theme-token", varName: "--crumbs-flex" },
        flexGrow: 4,
        flexShrink: 3,
        flexBasis: "25%",
      })
      expect(exports.generic).toEqual({ flex: -1 })
      expect(exports.text).toEqual({ flex: 0 })
      expect(exports.image).toEqual({ flex: 0.5 })
      expect((exports.states as { active: unknown }).active).toEqual({ flex: 2, flexBasis: "auto" })
      expect((exports.button as { base: unknown; variants: { size: { fill: unknown } } }).base).toEqual({ flexShrink: 0 })
      expect((exports.button as { base: unknown; variants: { size: { fill: unknown } } }).variants.size.fill).toEqual({ flex: 3 })
    })
  }
})
