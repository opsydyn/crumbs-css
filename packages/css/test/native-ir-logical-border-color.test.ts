import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/logical-border-color.css.ts", className: "logical_border" }
const properties = ["borderStartColor", "borderEndColor"] as const

describe("production native IR logical border-color fields", () => {
  it("captures exact logical fields independently from physical sides", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ borderStartColor: "red", borderEndColor: "var(--crumbs-border)", borderLeftColor: "blue" }, ["view"]), context)
    expect(captured.cssRule).toEqual({})
    expect(lowerScalarBlock(captured.block!)).toEqual({ borderStartColor: "red", borderEndColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-border" }, borderLeftColor: "blue" })
  })

  it("admits both fields for every primitive and rejects non-color shapes", () => {
    for (const property of properties) {
      for (const primitive of ["view", "text", "image"] as const) expect(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: "rgba(1,2,3,0.5)" }, [primitive]), context).block?.primitiveDomain).toEqual([primitive])
      for (const value of [0, NaN, null, "", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged physical/logical provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ borderStartColor: "red" }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "borderLeftColor" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field ordering", () => {
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom(...properties), fc.constantFrom("red", "blue", "#123456", "transparent")), { minLength: 1, maxLength: 30 }), entries => {
      const blocks = entries.map(([property, value], index) => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), { ...context, className: `logical_border_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(Object.fromEntries(entries))
    }), { seed: 20260928, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ borderStartColor: "red" }, context)).toEqual({ cssRule: { borderStartColor: "red" } })
  })
})
