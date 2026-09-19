import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/box-sizing.css.ts", className: "box_sizing" }
const values = ["border-box", "content-box"] as const
const primitives = ["view", "text", "image"] as const

describe("production native IR boxSizing", () => {
  it("captures every installed literal and tokens across every FlexStyle primitive", () => {
    for (const primitive of primitives) for (const boxSizing of values) {
      expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ boxSizing }, [primitive]), context).block!)).toEqual({ boxSizing })
    }
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ boxSizing: "var(--crumbs-box-sizing)" }, primitives), context).block!
    expect(lowerScalarBlock(token)).toEqual({ boxSizing: { $$type: "crumbs.css.theme-token", varName: "--crumbs-box-sizing" } })
  })

  it("rejects values outside the installed domain", () => {
    for (const value of ["", "padding-box", "inherit", 1, true, null, {}, []]) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ boxSizing: value }, primitives), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged values and provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ boxSizing: "border-box" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], value: "padding-box" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "display" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom(...values), { minLength: 1, maxLength: 30 }), sequence => {
      const blocks = sequence.map((boxSizing, index) => captureScalarIntoNativeIr(markNativeCaptureRule({ boxSizing }, primitives), { ...context, className: `box_sizing_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ boxSizing: sequence.at(-1)! })
    }), { seed: 20261021, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { boxSizing: "border-box" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
