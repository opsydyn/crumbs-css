import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/logical-margin.css.ts", className: "logical_margin" }
const aliases = {
  marginInline: ["marginLeft", "marginRight"], marginBlock: ["marginTop", "marginBottom"],
  marginInlineStart: ["marginStart"], marginInlineEnd: ["marginEnd"],
  marginBlockStart: ["marginTop"], marginBlockEnd: ["marginBottom"],
} as const

describe("production native IR logical margin aliases", () => {
  it("expands every alias with authored and canonical provenance", () => {
    for (const authored of Object.keys(aliases) as Array<keyof typeof aliases>) {
      const block = captureScalarIntoNativeIr(markNativeCaptureRule({ [authored]: "25%" }, ["view"]), context).block!
      expect(block.declarations.map(d => d.property)).toEqual([...aliases[authored]])
      for (const declaration of block.declarations) expect(declaration.provenance.shorthandExpansionPath).toEqual([authored, declaration.property])
    }
  })

  it("retains logical start/end independently from physical sides", () => {
    const blocks = [{ marginInline: 1 }, { marginInlineStart: 2 }, { marginLeft: 3 }, { marginInlineEnd: 4 }]
      .map((rule, index) => captureScalarIntoNativeIr(markNativeCaptureRule(rule, ["view"]), { ...context, className: `logical_${index}` }).block!)
    expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ marginRight: 1, marginStart: 2, marginLeft: 3, marginEnd: 4 })
  })

  it("rejects forged logical alias provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ marginInlineStart: 1 }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], property: "marginLeft", provenance: { ...block.declarations[0].provenance, canonicalProperty: "marginLeft", shorthandExpansionPath: ["marginInlineStart", "marginLeft"] } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent alias and longhand ordering", () => {
    const authored = [...Object.keys(aliases), "marginTop", "marginRight", "marginBottom", "marginLeft", "marginStart", "marginEnd"] as const
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom(...authored), fc.integer()), { minLength: 1, maxLength: 30 }), entries => {
      const expected: Record<string, number> = {}
      const blocks = entries.map(([property, value], index) => {
        const targets = property in aliases ? aliases[property as keyof typeof aliases] : [property]
        for (const target of targets) expected[target] = value
        return captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), { ...context, className: `logical_${index}` }).block!
      })
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(expected)
    }), { seed: 20260926, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ marginInline: 1, marginStart: 2 }, context)).toEqual({ cssRule: { marginInline: 1, marginStart: 2 } })
  })
})
