import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/shadow-color.css.ts", className: "shadow_color" }

describe("production native IR shadowColor", () => {
  it("captures literal and token colours with exact provenance", () => {
    const literal = captureScalarIntoNativeIr(markNativeCaptureRule({ shadowColor: "rgba(1,2,3,0.5)" }, ["view"]), context).block!
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ shadowColor: "var(--crumbs-shadow)" }, ["view"]), context).block!
    expect(lowerScalarBlock(literal)).toEqual({ shadowColor: "rgba(1,2,3,0.5)" })
    expect(lowerScalarBlock(token)).toEqual({ shadowColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-shadow" } })
    expect(literal.declarations[0]?.provenance).toMatchObject({ authoredProperty: "shadowColor", canonicalProperty: "shadowColor" })
  })

  it("admits every inherited primitive and rejects non-colour shapes", () => {
    for (const primitive of ["view", "text", "image"] as const) expect(captureScalarIntoNativeIr(markNativeCaptureRule({ shadowColor: "transparent" }, [primitive]), context).block?.primitiveDomain).toEqual([primitive])
    for (const value of [0, NaN, null, "", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ shadowColor: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
  })

  it("rejects forged shadow provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ shadowColor: "red" }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "backgroundColor" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field last-winner ordering", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom("red", "blue", "#123456", "transparent"), { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((shadowColor, index) => captureScalarIntoNativeIr(markNativeCaptureRule({ shadowColor }, ["view"]), { ...context, className: `shadow_color_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ shadowColor: values[values.length - 1]! })
    }), { seed: 20261007, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ shadowColor: "red" }, context)).toEqual({ cssRule: { shadowColor: "red" } })
  })
})
