import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/background-color.css.ts", className: "background" }

describe("production native IR backgroundColor", () => {
  it("captures literal and token colours with exact provenance", () => {
    const literal = captureScalarIntoNativeIr(markNativeCaptureRule({ backgroundColor: "rgba(1,2,3,0.5)" }, ["view"]), context).block!
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ backgroundColor: "var(--crumbs-surface)" }, ["view"]), context).block!
    expect(lowerScalarBlock(literal)).toEqual({ backgroundColor: "rgba(1,2,3,0.5)" })
    expect(lowerScalarBlock(token)).toEqual({ backgroundColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-surface" } })
    expect(literal.declarations[0]?.provenance).toMatchObject({ authoredProperty: "backgroundColor", canonicalProperty: "backgroundColor" })
  })

  it("admits every installed primitive and rejects non-colour shapes", () => {
    for (const primitive of ["view", "text", "image"] as const) expect(captureScalarIntoNativeIr(markNativeCaptureRule({ backgroundColor: "transparent" }, [primitive]), context).block?.primitiveDomain).toEqual([primitive])
    for (const value of [0, NaN, null, "", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ backgroundColor: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
  })

  it("rejects forged background colour provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ backgroundColor: "red" }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "borderTopColor" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field last-winner ordering", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom("red", "blue", "#123456", "transparent"), { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((backgroundColor, index) => captureScalarIntoNativeIr(markNativeCaptureRule({ backgroundColor }, ["view"]), { ...context, className: `background_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ backgroundColor: values[values.length - 1]! })
    }), { seed: 20261003, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ backgroundColor: "red" }, context)).toEqual({ cssRule: { backgroundColor: "red" } })
  })
})
