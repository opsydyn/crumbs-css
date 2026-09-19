import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/logical-border-width.css.ts", className: "logical_border" }
const properties = ["borderStartWidth", "borderEndWidth"] as const

describe("production native IR logical border-width fields", () => {
  it("captures exact logical fields independently from physical sides", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ borderStartWidth: 4, borderEndWidth: "var(--crumbs-border)", borderLeftWidth: 2 }, ["view"]), context)
    expect(captured.cssRule).toEqual({})
    expect(lowerScalarBlock(captured.block!)).toEqual({ borderStartWidth: 4, borderEndWidth: { $$type: "crumbs.css.theme-token", varName: "--crumbs-border" }, borderLeftWidth: 2 })
  })

  it("admits both fields for every primitive and rejects nonnumeric literals", () => {
    for (const property of properties) {
      for (const primitive of ["view", "text", "image"] as const) expect(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: -0 }, [primitive]), context).block?.primitiveDomain).toEqual([primitive])
      for (const value of [NaN, Infinity, null, "auto", "10px", "25%", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged physical/logical provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ borderStartWidth: 4 }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "borderLeftWidth" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field ordering", () => {
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom(...properties), fc.double({ noNaN: true, noDefaultInfinity: true })), { minLength: 1, maxLength: 30 }), entries => {
      const blocks = entries.map(([property, value], index) => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), { ...context, className: `logical_border_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(Object.fromEntries(entries))
    }), { seed: 20260928, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ borderStartWidth: 4 }, context)).toEqual({ cssRule: { borderStartWidth: 4 } })
  })
})
