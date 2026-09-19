import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/aspect-ratio.css.ts", className: "aspect_ratio" }
const primitives = ["view", "text", "image"] as const

describe("production native IR aspectRatio", () => {
  it("captures finite numbers, non-empty strings and tokens across every FlexStyle primitive", () => {
    for (const primitive of primitives) for (const aspectRatio of [0, -1, 1.5, "1", "16/9", "4:3"] as const) {
      expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ aspectRatio }, [primitive]), context).block!)).toEqual({ aspectRatio })
    }
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({ aspectRatio: "var(--crumbs-aspect-ratio)" }, primitives), context).block!
    expect(lowerScalarBlock(token)).toEqual({ aspectRatio: { $$type: "crumbs.css.theme-token", varName: "--crumbs-aspect-ratio" } })
  })

  it("rejects empty, nonfinite and non-scalar values", () => {
    for (const value of ["", Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, true, null, {}, []]) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ aspectRatio: value }, primitives), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("isolates arbitrary strings from numeric scalar families", () => {
    for (const property of ["opacity", "zIndex", "flexGrow", "fontSize"] as const) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: "16/9" }, property === "fontSize" ? ["text"] : primitives), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged values and provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ aspectRatio: "16/9" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], value: "" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "flex" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering across both literal representations", () => {
    const value = fc.oneof(fc.double({ noNaN: true, noDefaultInfinity: true }), fc.string({ minLength: 1 }))
    fc.assert(fc.property(fc.array(value, { minLength: 1, maxLength: 30 }), sequence => {
      const blocks = sequence.map((aspectRatio, index) => captureScalarIntoNativeIr(markNativeCaptureRule({ aspectRatio }, primitives), { ...context, className: `aspect_ratio_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual({ aspectRatio: sequence.at(-1)! })
    }), { seed: 20261022, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { aspectRatio: "16/9" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
