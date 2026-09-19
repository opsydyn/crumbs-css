import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/font-family.css.ts", className: "font_family" }

describe("production native IR fontFamily", () => {
  it("captures literal and token families with exact provenance", () => {
    const literal = captureScalarIntoNativeIr(markNativeCaptureRule({ fontFamily: "Inter Variable" }, ["text"]), context).block!
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ fontFamily: "var(--crumbs-font-body)" }, ["text"]), context).block!
    expect(lowerScalarBlock(literal)).toEqual({ fontFamily: "Inter Variable" })
    expect(lowerScalarBlock(token)).toEqual({ fontFamily: { $$type: "crumbs.css.theme-token", varName: "--crumbs-font-body" } })
    expect(literal.declarations[0]?.provenance).toMatchObject({ authoredProperty: "fontFamily", canonicalProperty: "fontFamily" })
  })

  it("admits text only and rejects empty or non-string values", () => {
    expect(captureScalarIntoNativeIr(markNativeCaptureRule({ fontFamily: "System" }, ["text"]), context).block?.primitiveDomain).toEqual(["text"])
    for (const primitive of ["view", "image"] as const) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ fontFamily: "System" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
    for (const value of [0, NaN, null, "", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ fontFamily: value }, ["text"]), context)).toThrow(NativeIrAdmissionError)
  })

  it("rejects forged font provenance, primitive domains and string widening", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ fontFamily: "System" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "fontSize" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, primitiveDomain: ["view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const fontSize = captureScalarIntoNativeIr(markNativeCaptureRule({ fontSize: 16 }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...fontSize, declarations: [{ ...fontSize.declarations[0], value: "System" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field last-winner ordering", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom("System", "Inter Variable", "serif", "monospace"), { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((fontFamily, index) => captureScalarIntoNativeIr(markNativeCaptureRule({ fontFamily }, ["text"]), { ...context, className: `font_family_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ fontFamily: values[values.length - 1]! })
    }), { seed: 20261012, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ fontFamily: "System" }, context)).toEqual({ cssRule: { fontFamily: "System" } })
  })
})
