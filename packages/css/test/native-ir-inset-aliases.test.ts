import { describe, expect, it } from "bun:test"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/inset.css.ts", className: "inset_class" }

describe("production native IR inset aliases", () => {
  it("expands every alias to ordered canonical declarations with authored provenance", () => {
    const aliases = {
      inset: ["top", "right", "bottom", "left"], insetInline: ["left", "right"], insetBlock: ["top", "bottom"],
      insetInlineStart: ["start"], insetInlineEnd: ["end"], insetBlockStart: ["top"], insetBlockEnd: ["bottom"],
    } as const
    for (const authoredProperty of Object.keys(aliases) as Array<keyof typeof aliases>) {
      const expected = aliases[authoredProperty]
      const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ [authoredProperty]: "25%" }, ["view"]), context)
      expect(captured.cssRule).toEqual({})
      expect(captured.block?.declarations.map(declaration => declaration.property)).toEqual([...expected])
      for (const declaration of captured.block!.declarations) {
        expect(declaration.provenance.authoredProperty).toBe(authoredProperty)
        expect(declaration.provenance.canonicalProperty).toBe(declaration.property)
        expect(declaration.provenance.shorthandExpansionPath).toEqual([authoredProperty, declaration.property])
      }
    }
  })

  it("normalizes aliases and exact longhands by canonical last-winner order", () => {
    const blocks = [
      { inset: 1 }, { insetInline: 2 }, { top: 3 }, { insetInlineStart: 4 }, { left: 5 },
    ].map((rule, index) => captureScalarIntoNativeIr(markNativeCaptureRule(rule, ["view"]), { ...context, className: `inset_${index}` }).block!)
    expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ right: 2, bottom: 1, top: 3, start: 4, left: 5 })
  })

  it("rejects forged alias-to-canonical provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ insetInline: 1 }, ["view"]), context).block!
    expect(() => decodeScalarBlock({
      ...block,
      declarations: [{ ...block.declarations[0], property: "top", provenance: { ...block.declarations[0].provenance, canonicalProperty: "top" } }],
    }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({
      ...block,
      declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, shorthandExpansionPath: ["insetInline", "top"] } }],
    }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("does not migrate unmarked vanilla-extract-shaped records", () => {
    expect(captureScalarIntoNativeIr({ inset: 1, insetInline: 2 }, context)).toEqual({ cssRule: { inset: 1, insetInline: 2 } })
  })
})
