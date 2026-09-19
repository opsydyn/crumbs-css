import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/text-decoration-color.css.ts", className: "text_decoration_color" }

describe("production native IR textDecorationColor", () => {
  it("captures literal and token colours with exact provenance", () => {
    const literal = captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationColor: "rgba(1,2,3,0.5)" }, ["text"]), context).block!
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationColor: "var(--crumbs-decoration)" }, ["text"]), context).block!
    expect(lowerScalarBlock(literal)).toEqual({ textDecorationColor: "rgba(1,2,3,0.5)" })
    expect(lowerScalarBlock(token)).toEqual({ textDecorationColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-decoration" } })
    expect(literal.declarations[0]?.provenance).toMatchObject({ authoredProperty: "textDecorationColor", canonicalProperty: "textDecorationColor" })
  })

  it("admits text only and rejects other primitives and non-colour shapes", () => {
    expect(captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationColor: "transparent" }, ["text"]), context).block?.primitiveDomain).toEqual(["text"])
    for (const primitive of ["view", "image"] as const) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationColor: "red" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
    for (const value of [0, NaN, null, "", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationColor: value }, ["text"]), context)).toThrow(NativeIrAdmissionError)
  })

  it("rejects forged decoration provenance and primitive domains", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationColor: "red" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "textShadowColor" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, primitiveDomain: ["view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field last-winner ordering", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom("red", "blue", "#123456", "transparent"), { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((textDecorationColor, index) => captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationColor }, ["text"]), { ...context, className: `text_decoration_color_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ textDecorationColor: values[values.length - 1]! })
    }), { seed: 20261010, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ textDecorationColor: "red" }, context)).toEqual({ cssRule: { textDecorationColor: "red" } })
  })
})
