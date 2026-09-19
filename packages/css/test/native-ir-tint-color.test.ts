import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/tint-color.css.ts", className: "tint_color" }

describe("production native IR image tintColor", () => {
  it("captures literal and token colours with exact provenance", () => {
    const literal = captureScalarIntoNativeIr(markNativeCaptureRule({ tintColor: "rgba(1,2,3,0.5)" }, ["image"]), context).block!
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ tintColor: "var(--crumbs-icon)" }, ["image"]), context).block!
    expect(lowerScalarBlock(literal)).toEqual({ tintColor: "rgba(1,2,3,0.5)" })
    expect(lowerScalarBlock(token)).toEqual({ tintColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-icon" } })
    expect(literal.declarations[0]?.provenance).toMatchObject({ authoredProperty: "tintColor", canonicalProperty: "tintColor" })
  })

  it("admits image only and rejects other primitives and non-colour shapes", () => {
    expect(captureScalarIntoNativeIr(markNativeCaptureRule({ tintColor: "transparent" }, ["image"]), context).block?.primitiveDomain).toEqual(["image"])
    for (const primitive of ["view", "text"] as const) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ tintColor: "red" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
    for (const value of [0, NaN, null, "", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ tintColor: value }, ["image"]), context)).toThrow(NativeIrAdmissionError)
  })

  it("rejects forged tint provenance and primitive domains", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ tintColor: "red" }, ["image"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "backgroundColor" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, primitiveDomain: ["text"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field last-winner ordering", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom("red", "blue", "#123456", "transparent"), { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((tintColor, index) => captureScalarIntoNativeIr(markNativeCaptureRule({ tintColor }, ["image"]), { ...context, className: `tint_color_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ tintColor: values[values.length - 1]! })
    }), { seed: 20261005, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ tintColor: "red" }, context)).toEqual({ cssRule: { tintColor: "red" } })
  })
})
