import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/border-color.css.ts", className: "border_color" }
const sides = ["borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"] as const

describe("production native IR physical border-color family", () => {
  it("expands literal and token-backed broad colors with exact provenance", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ borderColor: "#123456", borderLeftColor: "var(--crumbs-border-color)" }, ["view"]), context)
    expect(captured.cssRule).toEqual({})
    expect(lowerScalarBlock(captured.block!)).toEqual({
      borderTopColor: "#123456", borderRightColor: "#123456", borderBottomColor: "#123456",
      borderLeftColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-border-color" },
    })
    expect(captured.block?.declarations.slice(0, 4).map(d => d.provenance.shorthandExpansionPath)).toEqual(sides.map(side => ["borderColor", side]))
  })

  it("admits native color strings for every primitive and rejects non-color shapes", () => {
    for (const property of ["borderColor", ...sides] as const) {
      for (const primitive of ["view", "text", "image"] as const) expect(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: "rgba(1, 2, 3, 0.5)" }, [primitive]), context).block?.primitiveDomain).toEqual([primitive])
      for (const value of [0, NaN, null, "", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged borderColor provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ borderColor: "red" }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], property: "color", provenance: { ...block.declarations[0].provenance, canonicalProperty: "color", shorthandExpansionPath: ["borderColor", "color"] } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const width = captureScalarIntoNativeIr(markNativeCaptureRule({ width: "25%" }, ["view"]), context).block!
    expect(() => decodeScalarBlock({ ...width, declarations: [{ ...width.declarations[0], value: "red" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent broad/side last-winner evaluation", () => {
    const color = fc.constantFrom("red", "transparent", "#123456", "rgba(1,2,3,0.5)")
    fc.assert(fc.property(fc.array(fc.tuple(fc.constantFrom("borderColor", ...sides), color), { minLength: 1, maxLength: 30 }), entries => {
      const expected: Record<string, string> = {}
      const blocks = entries.map(([property, value], index) => {
        for (const target of property === "borderColor" ? sides : [property]) expected[target] = value
        return captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), { ...context, className: `color_${index}` }).block!
      })
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(expected)
    }), { seed: 20260929, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ borderColor: "red" }, context)).toEqual({ cssRule: { borderColor: "red" } })
  })
})
