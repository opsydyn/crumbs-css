import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/typography-metrics.css.ts", className: "typography_metrics" }
const properties = ["fontSize", "letterSpacing", "lineHeight"] as const

describe("production native IR typography metrics", () => {
  it("captures all metrics independently with literal and token identity", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ fontSize: 16, letterSpacing: -0.25, lineHeight: "var(--crumbs-line-height)" }, ["text"]), context)
    expect(captured.cssRule).toEqual({})
    expect(lowerScalarBlock(captured.block!)).toEqual({ fontSize: 16, letterSpacing: -0.25, lineHeight: { $$type: "crumbs.css.theme-token", varName: "--crumbs-line-height" } })
  })

  it("admits text only and rejects nonnumeric literals", () => {
    for (const property of properties) {
      expect(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: -0 }, ["text"]), context).block?.primitiveDomain).toEqual(["text"])
      for (const primitive of ["view", "image"] as const) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: 1 }, [primitive]), context)).toThrow(NativeIrAdmissionError)
      for (const value of [NaN, Infinity, null, "auto", "10px", "125%", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["text"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged metric provenance and primitive domains", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ fontSize: 16 }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "lineHeight" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, primitiveDomain: ["view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field ordering", () => {
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom(...properties), fc.double({ noNaN: true, noDefaultInfinity: true })), { minLength: 1, maxLength: 30 }), entries => {
      const blocks = entries.map(([property, value], index) => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["text"]), { ...context, className: `typography_metrics_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(Object.fromEntries(entries))
    }), { seed: 20261011, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ fontSize: 16, letterSpacing: 0.5, lineHeight: 24 }, context)).toEqual({ cssRule: { fontSize: 16, letterSpacing: 0.5, lineHeight: 24 } })
  })
})
