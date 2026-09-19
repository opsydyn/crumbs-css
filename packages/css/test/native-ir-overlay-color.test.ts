import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/overlay-color.css.ts", className: "overlay_color" }

describe("production native IR image overlayColor", () => {
  it("captures literal and token colours with exact provenance", () => {
    const literal = captureScalarIntoNativeIr(markNativeCaptureRule({ overlayColor: "rgba(1,2,3,0.5)" }, ["image"]), context).block!
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ overlayColor: "var(--crumbs-overlay)" }, ["image"]), context).block!
    expect(lowerScalarBlock(literal)).toEqual({ overlayColor: "rgba(1,2,3,0.5)" })
    expect(lowerScalarBlock(token)).toEqual({ overlayColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-overlay" } })
    expect(literal.declarations[0]?.provenance).toMatchObject({ authoredProperty: "overlayColor", canonicalProperty: "overlayColor" })
  })

  it("admits image only and rejects other primitives and non-colour shapes", () => {
    expect(captureScalarIntoNativeIr(markNativeCaptureRule({ overlayColor: "transparent" }, ["image"]), context).block?.primitiveDomain).toEqual(["image"])
    for (const primitive of ["view", "text"] as const) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ overlayColor: "red" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
    for (const value of [0, NaN, null, "", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ overlayColor: value }, ["image"]), context)).toThrow(NativeIrAdmissionError)
  })

  it("rejects forged overlay provenance and primitive domains", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ overlayColor: "red" }, ["image"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "tintColor" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, primitiveDomain: ["view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field last-winner ordering", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom("red", "blue", "#123456", "transparent"), { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((overlayColor, index) => captureScalarIntoNativeIr(markNativeCaptureRule({ overlayColor }, ["image"]), { ...context, className: `overlay_color_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ overlayColor: values[values.length - 1]! })
    }), { seed: 20261006, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ overlayColor: "red" }, context)).toEqual({ cssRule: { overlayColor: "red" } })
  })
})
