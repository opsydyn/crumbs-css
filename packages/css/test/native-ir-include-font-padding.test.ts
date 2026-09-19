import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/include-font-padding.css.ts", className: "include_font_padding" }

describe("production native IR includeFontPadding", () => {
  it("captures both boolean literals and token identity", () => {
    for (const includeFontPadding of [false, true]) {
      expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ includeFontPadding }, ["text"]), context).block!)).toEqual({ includeFontPadding })
    }
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ includeFontPadding: "var(--crumbs-include-font-padding)" }, ["text"]), context).block!
    expect(lowerScalarBlock(token)).toEqual({ includeFontPadding: { $$type: "crumbs.css.theme-token", varName: "--crumbs-include-font-padding" } })
  })

  it("admits text only and rejects non-boolean literals", () => {
    for (const primitive of ["view", "image"] as const) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ includeFontPadding: true }, [primitive]), context)).toThrow(NativeIrAdmissionError)
    for (const includeFontPadding of [0, 1, "", "true", "false", null, {}, []]) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ includeFontPadding }, ["text"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged provenance, primitive domains and boolean widening", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ includeFontPadding: true }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...block, primitiveDomain: ["view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "opacity" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const opacity = captureScalarIntoNativeIr(markNativeCaptureRule({ opacity: 1 }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...opacity, declarations: [{ ...opacity.declarations[0], value: true }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const family = captureScalarIntoNativeIr(markNativeCaptureRule({ fontFamily: "System" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...family, declarations: [{ ...family.declarations[0], value: false }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field last-winner ordering", () => {
    fc.assert(fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((includeFontPadding, index) => captureScalarIntoNativeIr(markNativeCaptureRule({ includeFontPadding }, ["text"]), { ...context, className: `include_font_padding_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ includeFontPadding: values[values.length - 1]! })
    }), { seed: 20261017, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ includeFontPadding: true }, context)).toEqual({ cssRule: { includeFontPadding: true } })
  })
})
