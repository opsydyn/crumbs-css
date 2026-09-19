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
  sourceId: "styles/flex-basis.css.ts",
  className: "basis_class",
}

async function compile(source: string, useStyleSheet = false): Promise<Record<string, unknown>> {
  const dir = mkdtempSync(path.join(root, "fixtures/.native-ir-flex-basis-"))
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

describe("production native IR flexBasis scalar family", () => {
  it("captures native points, auto, percentages and tokens before CSS serialization", () => {
    for (const value of [12, -0, "auto", "25%", "-12.5%", "1e2%", "var(--crumbs-basis)"] as const) {
      const captured = captureScalarIntoNativeIr(
        markNativeCaptureRule({ flexBasis: value, width: 40 }, ["view", "text", "image"]),
        context,
      )
      expect(captured.cssRule).toEqual({})
      expect(captured.block?.declarations[0].property).toBe("flexBasis")
      expect(captured.block?.declarations[0].value).toEqual(value === "var(--crumbs-basis)"
        ? { _tag: "LegacyTokenReference", varName: "--crumbs-basis" }
        : value)
      const lowered = lowerScalarBlock(captured.block!)
      if (value === "var(--crumbs-basis)") {
        expect(lowered.flexBasis).toEqual({ $$type: "crumbs.css.theme-token", varName: "--crumbs-basis" })
      } else {
        expect(Object.is(lowered.flexBasis, value)).toBe(true)
      }
      expect(lowered.width).toBe(40)
    }
  })

  it("admits every static FlexStyle primitive and rejects unsupported values", () => {
    for (const primitive of ["view", "text", "image"] as const) {
      expect(captureScalarIntoNativeIr(markNativeCaptureRule({ flexBasis: "50%" }, [primitive]), context).block?.primitiveDomain)
        .toEqual([primitive])
    }
    for (const value of [NaN, Infinity, -Infinity, null, "10", "10px", "none", "calc(1px)", "Infinity%", {}, []]) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ flexBasis: value }, ["view"]), context))
        .toThrow(NativeIrAdmissionError)
    }
  })

  it("enforces the flexBasis value domain and provenance at schema decode", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ flexBasis: "auto" }, ["view"]), context).block!
    expect(decodeScalarBlock(block, context.sourceId).declarations[0].value).toBe("auto")
    expect(() => decodeScalarBlock({
      ...block,
      declarations: [{ ...block.declarations[0], value: "20px" }],
    }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({
      ...block,
      declarations: [{
        ...block.declarations[0],
        provenance: { ...block.declarations[0].provenance, canonicalProperty: "flex" },
      }],
    }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("applies last-winner order independently from flex, grow and shrink", () => {
    fc.assert(fc.property(
      fc.array(fc.oneof(
        fc.double({ noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: -1000, max: 1000 }).map(value => `${value}%` as const),
        fc.constant("auto" as const),
      ), { minLength: 1, maxLength: 20 }),
      values => {
        const blocks = values.map((flexBasis, index) => captureScalarIntoNativeIr(markNativeCaptureRule({
          flexBasis,
          flex: index,
          flexGrow: index + 1,
          flexShrink: index + 2,
        }, ["view"]), { ...context, className: `basis_${index}` }).block!)
        const lowered = lowerScalarBlock(normalizeScalarBlocks(blocks))
        expect(Object.is(lowered.flexBasis, values.at(-1))).toBe(true)
        expect(lowered).toMatchObject({ flex: values.length - 1, flexGrow: values.length, flexShrink: values.length + 1 })
      },
    ), { seed: 20260921, numRuns: 100 })
  })

  for (const useStyleSheet of [true, false]) {
    it(`preserves flexBasis across helpers and composition with useStyleSheet=${useStyleSheet}`, async () => {
      const exports = await compile(`
        import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe, createThemeContract } from '@opsydyn/crumbs-css/style'
        const vars = createThemeContract({ basis: null })
        const base = viewStyle({ flex: 1, flexBasis: 12, flexGrow: 2 })
        export const composed = viewStyle([base, { flexBasis: vars.basis, flexShrink: 3 }])
        export const generic = style({ flexBasis: '25%' })
        export const text = textStyle({ flexBasis: 'auto' })
        export const image = imageStyle({ flexBasis: -0 })
        export const states = styleVariants({ active: { flexBasis: '50%' } })
        export const button = recipe({ variants: { size: { fill: { flexBasis: 40 } } } })
      `, useStyleSheet)
      expect(exports.composed).toEqual({
        flex: 1,
        flexBasis: { $$type: "crumbs.css.theme-token", varName: "--crumbs-basis" },
        flexGrow: 2,
        flexShrink: 3,
      })
      expect(exports.generic).toEqual({ flexBasis: "25%" })
      expect(exports.text).toEqual({ flexBasis: "auto" })
      expect(Object.is((exports.image as { flexBasis: number }).flexBasis, -0)).toBe(true)
      expect((exports.states as { active: unknown }).active).toEqual({ flexBasis: "50%" })
      expect((exports.button as { variants: { size: { fill: unknown } } }).variants.size.fill).toEqual({ flexBasis: 40 })
    })
  }

  it("keeps unmarked vanilla-extract flexBasis on the compatibility route", async () => {
    const exports = await compile(`
      import { style as vanillaStyle } from '@vanilla-extract/css'
      export const legacy = vanillaStyle({ flexBasis: '25%' })
    `)
    expect(exports.legacy).toEqual({ flexBasis: "25%" })
  })
})
