import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/border-radius.css.ts", className: "border_radius" }
const sides = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"] as const

describe("production native IR physical border-radius family", () => {
  it("expands broad borderRadius with exact provenance", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ borderRadius: 4, borderBottomLeftRadius: "var(--crumbs-border)" }, ["view"]), context)
    expect(captured.cssRule).toEqual({})
    expect(JSON.stringify(captured.block?.declarations.map(d => [d.property, d.provenance.authoredProperty, d.provenance.shorthandExpansionPath]))).toBe(JSON.stringify([
      ...sides.map(side => [side, "borderRadius", ["borderRadius", side]]), ["borderBottomLeftRadius", "borderBottomLeftRadius", []],
    ]))
  })

  it("admits every side for every primitive and rejects nonnumeric literals", () => {
    for (const property of ["borderRadius", ...sides] as const) {
      for (const primitive of ["view", "text", "image"] as const) expect(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: -0 }, [primitive]), context).block?.primitiveDomain).toEqual([primitive])
      for (const value of [NaN, Infinity, null, "auto", "10", "10px", "25%", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged borderRadius provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ borderRadius: 4 }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], property: "borderStartStartRadius", provenance: { ...block.declarations[0].provenance, canonicalProperty: "borderStartStartRadius", shorthandExpansionPath: ["borderRadius", "borderStartStartRadius"] } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent broad/side last-winner evaluation", () => {
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom("borderRadius", ...sides), fc.double({ noNaN: true, noDefaultInfinity: true })), { minLength: 1, maxLength: 30 }), entries => {
      const expected: Record<string, number> = {}
      const blocks = entries.map(([property, value], index) => {
        for (const target of property === "borderRadius" ? sides : [property]) expected[target] = value
        return captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), { ...context, className: `border_${index}` }).block!
      })
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(expected)
    }), { seed: 20260930, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ borderRadius: 4, borderBottomLeftRadius: 2 }, context)).toEqual({ cssRule: { borderRadius: 4, borderBottomLeftRadius: 2 } })
  })
})
