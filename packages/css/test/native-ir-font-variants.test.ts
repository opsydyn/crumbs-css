import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/font-variants.css.ts", className: "font_variants" }
const fontWeights = [
  "normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900",
  100, 200, 300, 400, 500, 600, 700, 800, 900,
  "ultralight", "thin", "light", "medium", "regular", "semibold", "condensedBold", "condensed", "heavy", "black",
] as const

describe("production native IR font variants", () => {
  it("captures every installed fontStyle/fontWeight literal and tokens", () => {
    for (const fontStyle of ["normal", "italic"] as const) {
      expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ fontStyle }, ["text"]), context).block!)).toEqual({ fontStyle })
    }
    for (const fontWeight of fontWeights) {
      expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ fontWeight }, ["text"]), context).block!)).toEqual({ fontWeight })
    }
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ fontStyle: "var(--crumbs-font-style)", fontWeight: "var(--crumbs-font-weight)" }, ["text"]), context).block!
    expect(lowerScalarBlock(token)).toEqual({
      fontStyle: { $$type: "crumbs.css.theme-token", varName: "--crumbs-font-style" },
      fontWeight: { $$type: "crumbs.css.theme-token", varName: "--crumbs-font-weight" },
    })
  })

  it("admits text only and rejects values outside the installed literal domains", () => {
    for (const primitive of ["view", "image"] as const) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ fontStyle: "italic" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ fontWeight: "700" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
    }
    for (const fontStyle of ["", "oblique", 1, null, {}, []]) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ fontStyle }, ["text"]), context)).toThrow(NativeIrAdmissionError)
    }
    for (const fontWeight of ["", "bolder", "950", 0, 150, 1000, NaN, null, {}, []]) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ fontWeight }, ["text"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged provenance, primitive domains and cross-property values", () => {
    const style = captureScalarIntoNativeIr(markNativeCaptureRule({ fontStyle: "italic" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...style, primitiveDomain: ["view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...style, declarations: [{ ...style.declarations[0], value: "bold" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const weight = captureScalarIntoNativeIr(markNativeCaptureRule({ fontWeight: 700 }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...weight, declarations: [{ ...weight.declarations[0], value: "italic" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...weight, declarations: [{ ...weight.declarations[0], provenance: { ...weight.declarations[0].provenance, canonicalProperty: "fontStyle" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering for both exact fields", () => {
    const declaration = fc.record({ fontStyle: fc.constantFrom("normal", "italic"), fontWeight: fc.constantFrom(...fontWeights) })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, ["text"]), { ...context, className: `font_variants_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values[values.length - 1]!)
    }), { seed: 20261013, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ fontStyle: "italic", fontWeight: "700" }, context)).toEqual({ cssRule: { fontStyle: "italic", fontWeight: "700" } })
  })
})
