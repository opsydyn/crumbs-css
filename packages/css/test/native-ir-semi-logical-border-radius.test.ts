import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/semi-logical-border-radius.css.ts", className: "semi_logical_radius" }
const properties = ["borderTopStartRadius", "borderTopEndRadius", "borderBottomStartRadius", "borderBottomEndRadius"] as const

describe("production native IR semi-logical corner-radius fields", () => {
  it("captures all four fields independently from physical and fully logical corners", () => {
    const rule = Object.fromEntries(properties.map((property, index) => [property, index + 1]))
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ ...rule, borderTopLeftRadius: 8, borderStartStartRadius: 9 }, ["view"]), context)
    expect(captured.cssRule).toEqual({})
    expect(lowerScalarBlock(captured.block!)).toEqual({ ...rule, borderTopLeftRadius: 8, borderStartStartRadius: 9 })
  })

  it("admits every field for every primitive and rejects nonnumeric literals", () => {
    for (const property of properties) {
      for (const primitive of ["view", "text", "image"] as const) expect(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: "var(--crumbs-radius)" }, [primitive]), context).block?.primitiveDomain).toEqual([primitive])
      for (const value of [NaN, Infinity, null, "auto", "10px", "25%", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged semi-logical provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ borderTopStartRadius: 4 }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "borderStartStartRadius" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field ordering", () => {
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom(...properties), fc.double({ noNaN: true, noDefaultInfinity: true })), { minLength: 1, maxLength: 30 }), entries => {
      const blocks = entries.map(([property, value], index) => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), { ...context, className: `semi_logical_radius_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(Object.fromEntries(entries))
    }), { seed: 20261002, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ borderTopStartRadius: 4 }, context)).toEqual({ cssRule: { borderTopStartRadius: 4 } })
  })
})
