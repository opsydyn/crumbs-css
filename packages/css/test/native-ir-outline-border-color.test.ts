import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/outline-border-color.css.ts", className: "outline_border_color" }
const primitives = ["view", "text"] as const
const colorValues = ["#123456", "rgba(10, 20, 30, 0.5)", "transparent"] as const
const scalarProperties = ["outlineColor", "outlineOffset", "outlineWidth", "borderBlockColor", "borderBlockStartColor", "borderBlockEndColor"] as const

const finiteNumber = fc.double({ noNaN: true }).filter(value => Number.isFinite(value) && !Object.is(value, -0))

describe("production native IR outline and border colour scalars", () => {
  it("captures every installed field and tokens across view and text", () => {
    for (const primitive of primitives) {
      for (const outlineColor of colorValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ outlineColor }, [primitive]), context).block!)).toEqual({ outlineColor })
      for (const outlineOffset of [-2.5, 0, 4] as const) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ outlineOffset }, [primitive]), context).block!)).toEqual({ outlineOffset })
      for (const outlineWidth of [0, 1.5, 8] as const) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ outlineWidth }, [primitive]), context).block!)).toEqual({ outlineWidth })
      for (const property of ["borderBlockColor", "borderBlockStartColor", "borderBlockEndColor"] as const) {
        for (const value of colorValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, [primitive]), context).block!)).toEqual({ [property]: value })
      }
    }
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({
      outlineColor: "var(--crumbs-outline-color)",
      outlineOffset: "var(--crumbs-outline-offset)",
      outlineWidth: "var(--crumbs-outline-width)",
      borderBlockColor: "var(--crumbs-border-block-color)",
      borderBlockStartColor: "var(--crumbs-border-block-start-color)",
      borderBlockEndColor: "var(--crumbs-border-block-end-color)",
    }, primitives), context).block!
    expect(lowerScalarBlock(block)).toEqual({
      outlineColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-outline-color" },
      outlineOffset: { $$type: "crumbs.css.theme-token", varName: "--crumbs-outline-offset" },
      outlineWidth: { $$type: "crumbs.css.theme-token", varName: "--crumbs-outline-width" },
      borderBlockColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-border-block-color" },
      borderBlockStartColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-border-block-start-color" },
      borderBlockEndColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-border-block-end-color" },
    })
  })

  it("rejects image use and values outside each installed domain", () => {
    for (const property of scalarProperties) {
      const value = property === "outlineColor" || property.startsWith("borderBlock") ? "#123456" : 1
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["image"]), context)).toThrow(NativeIrAdmissionError)
    }
    const invalidColors = ["", 1, true, null, {}, []] as const
    for (const property of ["outlineColor", "borderBlockColor", "borderBlockStartColor", "borderBlockEndColor"] as const) {
      for (const value of invalidColors) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, primitives), context)).toThrow(NativeIrAdmissionError)
    }
    const invalidNumbers = [NaN, Infinity, -Infinity, "", "12px", true, null, {}, []] as const
    for (const property of ["outlineOffset", "outlineWidth"] as const) {
      for (const value of invalidNumbers) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, primitives), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged primitive domains, provenance and cross-property values", () => {
    const color = captureScalarIntoNativeIr(markNativeCaptureRule({ outlineColor: "#123456" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...color, primitiveDomain: ["image"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...color, declarations: [{ ...color.declarations[0], value: 1 }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const offset = captureScalarIntoNativeIr(markNativeCaptureRule({ outlineOffset: 2 }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...offset, declarations: [{ ...offset.declarations[0], value: "#123456" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...offset, declarations: [{ ...offset.declarations[0], provenance: { ...offset.declarations[0].provenance, canonicalProperty: "outlineWidth" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering for all exact fields", () => {
    const declaration = fc.record({
      outlineColor: fc.constantFrom(...colorValues),
      outlineOffset: finiteNumber,
      outlineWidth: finiteNumber,
      borderBlockColor: fc.constantFrom(...colorValues),
      borderBlockStartColor: fc.constantFrom(...colorValues),
      borderBlockEndColor: fc.constantFrom(...colorValues),
    })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, primitives), { ...context, className: `outline_border_color_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values.at(-1)!)
    }), { seed: 20261027, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { outlineColor: "#123456", outlineOffset: 2, outlineWidth: 1, borderBlockColor: "transparent" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
