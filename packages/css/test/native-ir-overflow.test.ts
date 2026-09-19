import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/overflow.css.ts", className: "overflow" }
const broadValues = ["visible", "hidden", "scroll"] as const
const imageValues = ["visible", "hidden"] as const

describe("production native IR primitive-aware overflow", () => {
  it("admits the installed literal domain for each primitive", () => {
    for (const primitive of ["view", "text"] as const) for (const overflow of broadValues) {
      expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ overflow }, [primitive]), context).block!)).toEqual({ overflow })
    }
    for (const overflow of imageValues) {
      expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ overflow }, ["image"]), context).block!)).toEqual({ overflow })
    }
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ overflow: "var(--crumbs-overflow)" }, ["view", "text", "image"]), context).block!
    expect(lowerScalarBlock(token)).toEqual({ overflow: { $$type: "crumbs.css.theme-token", varName: "--crumbs-overflow" } })
  })

  it("rejects image scroll and values outside every installed domain", () => {
    expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ overflow: "scroll" }, ["image"]), context)).toThrow(NativeIrAdmissionError)
    expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ overflow: "scroll" }, ["view", "image"]), context)).toThrow(NativeIrAdmissionError)
    for (const value of ["", "auto", "clip", 1, true, null, {}, []]) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ overflow: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged image scroll while retaining exact provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ overflow: "hidden" }, ["image"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], value: "scroll" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(block.declarations[0]?.provenance).toMatchObject({ authoredProperty: "overflow", canonicalProperty: "overflow", logicalPath: ["overflow", "overflow"] })
  })

  it("matches independent last-winner ordering within each primitive domain", () => {
    for (const [primitive, values] of [["view", broadValues], ["text", broadValues], ["image", imageValues]] as const) {
      fc.assert(fc.property(fc.array(fc.constantFrom(...values), { minLength: 1, maxLength: 30 }), sequence => {
        const blocks = sequence.map((overflow, index) => captureScalarIntoNativeIr(markNativeCaptureRule({ overflow }, [primitive]), { ...context, className: `overflow_${index}` }).block!)
        expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ overflow: sequence.at(-1)! })
      }), { seed: 20261019, numRuns: 100 })
    }
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { overflow: "scroll" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
