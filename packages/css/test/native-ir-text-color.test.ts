import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/text-color.css.ts", className: "text_color" }

describe("production native IR text color", () => {
  it("captures literal and token colours with exact provenance", () => {
    const literal = captureScalarIntoNativeIr(markNativeCaptureRule({ color: "rgba(1,2,3,0.5)" }, ["text"]), context).block!
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ color: "var(--crumbs-foreground)" }, ["text"]), context).block!
    expect(lowerScalarBlock(literal)).toEqual({ color: "rgba(1,2,3,0.5)" })
    expect(lowerScalarBlock(token)).toEqual({ color: { $$type: "crumbs.css.theme-token", varName: "--crumbs-foreground" } })
    expect(literal.declarations[0]?.provenance).toMatchObject({ authoredProperty: "color", canonicalProperty: "color" })
  })

  it("admits text only and rejects other primitives and non-colour shapes", () => {
    expect(captureScalarIntoNativeIr(markNativeCaptureRule({ color: "transparent" }, ["text"]), context).block?.primitiveDomain).toEqual(["text"])
    for (const primitive of ["view", "image"] as const) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ color: "red" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
    for (const value of [0, NaN, null, "", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ color: value }, ["text"]), context)).toThrow(NativeIrAdmissionError)
  })

  it("rejects forged colour provenance and primitive domains", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ color: "red" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "backgroundColor" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, primitiveDomain: ["view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field last-winner ordering", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom("red", "blue", "#123456", "transparent"), { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((color, index) => captureScalarIntoNativeIr(markNativeCaptureRule({ color }, ["text"]), { ...context, className: `text_color_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ color: values[values.length - 1]! })
    }), { seed: 20261004, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ color: "red" }, context)).toEqual({ cssRule: { color: "red" } })
  })
})
