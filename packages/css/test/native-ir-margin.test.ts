import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/margin.css.ts", className: "margin_class" }
const expansions = {
  margin: ["marginTop", "marginRight", "marginBottom", "marginLeft"],
  marginHorizontal: ["marginLeft", "marginRight"],
  marginVertical: ["marginTop", "marginBottom"],
} as const

describe("production native IR physical margin family", () => {
  it("captures broad, pair and side declarations with exact provenance", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ margin: "25%", marginHorizontal: 8, marginTop: "var(--crumbs-pad)" }, ["view"]), context)
    expect(captured.cssRule).toEqual({})
    expect(captured.block?.declarations.map(({ property, provenance }) => [property, provenance.authoredProperty, provenance.shorthandExpansionPath])).toEqual([
      ["marginTop", "margin", ["margin", "marginTop"]], ["marginRight", "margin", ["margin", "marginRight"]],
      ["marginBottom", "margin", ["margin", "marginBottom"]], ["marginLeft", "margin", ["margin", "marginLeft"]],
      ["marginLeft", "marginHorizontal", ["marginHorizontal", "marginLeft"]], ["marginRight", "marginHorizontal", ["marginHorizontal", "marginRight"]],
      ["marginTop", "marginTop", []],
    ])
  })

  it("admits every field for every FlexStyle primitive and rejects unsupported values", () => {
    for (const property of [...Object.keys(expansions), "marginTop", "marginRight", "marginBottom", "marginLeft"]) {
      for (const primitive of ["view", "text", "image"] as const) expect(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: 4 }, [primitive]), context).block?.primitiveDomain).toEqual([primitive])
      for (const value of [NaN, Infinity, null, "10", "10px", "normal", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged margin provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ marginHorizontal: 4 }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], property: "marginTop", provenance: { ...block.declarations[0].provenance, canonicalProperty: "marginTop", shorthandExpansionPath: ["marginHorizontal", "marginTop"] } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent broad, pair and side last-winner evaluation", () => {
    const properties = [...Object.keys(expansions), "marginTop", "marginRight", "marginBottom", "marginLeft"] as const
    const value = fc.oneof(fc.integer({ min: -100, max: 100 }), fc.integer({ min: -100, max: 100 }).map(n => `${n}%` as const))
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom(...properties), value), { minLength: 1, maxLength: 30 }), entries => {
      const expected: Record<string, number | string> = {}
      const blocks = entries.map(([authored, scalar], index) => {
        const targets = authored in expansions ? expansions[authored as keyof typeof expansions] : [authored]
        for (const target of targets) expected[target] = scalar
        return captureScalarIntoNativeIr(markNativeCaptureRule({ [authored]: scalar }, ["view"]), { ...context, className: `margin_${index}` }).block!
      })
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(expected)
    }), { seed: 20260925, numRuns: 100 })
  })

  it("keeps unmarked vanilla-extract margin records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ margin: 8, marginLeft: 3 }, context)).toEqual({ cssRule: { margin: 8, marginLeft: 3 } })
  })
})
