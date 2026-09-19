import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/shadow-numeric.css.ts", className: "shadow_numeric" }
const properties = ["shadowOpacity", "shadowRadius"] as const

describe("production native IR numeric shadow fields", () => {
  it("captures both fields independently with literal and token identity", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ shadowOpacity: 0.25, shadowRadius: "var(--crumbs-shadow-radius)" }, ["view"]), context)
    expect(captured.cssRule).toEqual({})
    expect(lowerScalarBlock(captured.block!)).toEqual({ shadowOpacity: 0.25, shadowRadius: { $$type: "crumbs.css.theme-token", varName: "--crumbs-shadow-radius" } })
  })

  it("admits every inherited primitive and rejects nonnumeric literals", () => {
    for (const property of properties) {
      for (const primitive of ["view", "text", "image"] as const) expect(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: -0 }, [primitive]), context).block?.primitiveDomain).toEqual([primitive])
      for (const value of [NaN, Infinity, null, "auto", "10px", "25%", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged shadow provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ shadowOpacity: 0.5 }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "shadowRadius" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field ordering", () => {
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom(...properties), fc.double({ noNaN: true, noDefaultInfinity: true })), { minLength: 1, maxLength: 30 }), entries => {
      const blocks = entries.map(([property, value], index) => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), { ...context, className: `shadow_numeric_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(Object.fromEntries(entries))
    }), { seed: 20261008, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ shadowOpacity: 0.5, shadowRadius: 8 }, context)).toEqual({ cssRule: { shadowOpacity: 0.5, shadowRadius: 8 } })
  })
})
