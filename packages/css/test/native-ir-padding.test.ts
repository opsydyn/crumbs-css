import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/padding.css.ts", className: "padding_class" }
const expansions = {
  padding: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
  paddingHorizontal: ["paddingLeft", "paddingRight"],
  paddingVertical: ["paddingTop", "paddingBottom"],
} as const

describe("production native IR physical padding family", () => {
  it("captures broad, pair and side declarations with exact provenance", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ padding: "25%", paddingHorizontal: 8, paddingTop: "var(--crumbs-pad)" }, ["view"]), context)
    expect(captured.cssRule).toEqual({})
    expect(captured.block?.declarations.map(({ property, provenance }) => [property, provenance.authoredProperty, provenance.shorthandExpansionPath])).toEqual([
      ["paddingTop", "padding", ["padding", "paddingTop"]], ["paddingRight", "padding", ["padding", "paddingRight"]],
      ["paddingBottom", "padding", ["padding", "paddingBottom"]], ["paddingLeft", "padding", ["padding", "paddingLeft"]],
      ["paddingLeft", "paddingHorizontal", ["paddingHorizontal", "paddingLeft"]], ["paddingRight", "paddingHorizontal", ["paddingHorizontal", "paddingRight"]],
      ["paddingTop", "paddingTop", []],
    ])
  })

  it("admits every field for every FlexStyle primitive and rejects unsupported values", () => {
    for (const property of [...Object.keys(expansions), "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]) {
      for (const primitive of ["view", "text", "image"] as const) expect(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: 4 }, [primitive]), context).block?.primitiveDomain).toEqual([primitive])
      for (const value of [NaN, Infinity, null, "10", "10px", "normal", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged padding provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ paddingHorizontal: 4 }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], property: "paddingTop", provenance: { ...block.declarations[0].provenance, canonicalProperty: "paddingTop", shorthandExpansionPath: ["paddingHorizontal", "paddingTop"] } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent broad, pair and side last-winner evaluation", () => {
    const properties = [...Object.keys(expansions), "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const
    const value = fc.oneof(fc.integer({ min: -100, max: 100 }), fc.integer({ min: -100, max: 100 }).map(n => `${n}%` as const))
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom(...properties), value), { minLength: 1, maxLength: 30 }), entries => {
      const expected: Record<string, number | string> = {}
      const blocks = entries.map(([authored, scalar], index) => {
        const targets = authored in expansions ? expansions[authored as keyof typeof expansions] : [authored]
        for (const target of targets) expected[target] = scalar
        return captureScalarIntoNativeIr(markNativeCaptureRule({ [authored]: scalar }, ["view"]), { ...context, className: `padding_${index}` }).block!
      })
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(expected)
    }), { seed: 20260925, numRuns: 100 })
  })

  it("keeps unmarked vanilla-extract padding records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ padding: 8, paddingLeft: 3 }, context)).toEqual({ cssRule: { padding: 8, paddingLeft: 3 } })
  })
})
