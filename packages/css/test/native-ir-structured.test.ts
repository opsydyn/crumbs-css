import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  captureStructuredIntoNativeIr,
  decodeStructuredBlock,
  lowerStructuredBlock,
  normalizeStructuredBlocks,
  StructuredIrAdmissionError,
} from "../src/compiler/structured-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"
import { captureScalarIntoNativeIr } from "../src/compiler/native-ir"

const context = { packageOwner: "@fixture/app", sourceId: "styles/structured.css.ts", className: "structured" }
const primitives = ["view", "text", "image"] as const

describe("production native IR structured values", () => {
  it("captures and lowers a complete shadow offset without changing its whole-value shape", () => {
    const value = { width: 2, height: -3 }
    const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ shadowOffset: value }, primitives), context)
    expect(captured.cssRule).toEqual({})
    expect(captured.block?.primitiveDomain).toEqual(primitives)
    expect(lowerStructuredBlock(captured.block!)).toEqual({ shadowOffset: value })
  })

  it("rejects malformed, tokenised and decorated shadow offsets", () => {
    for (const value of [
      { width: 2 }, { height: 3 }, { width: 2, height: Infinity },
      { width: 2, height: -3, extra: 1 }, [2, 3], "var(--crumbs-shadow-offset)", 4, null,
    ]) {
      expect(() => captureStructuredIntoNativeIr(markNativeCaptureRule({ shadowOffset: value }, primitives), context)).toThrow(StructuredIrAdmissionError)
    }
  })

  it("rejects forged structured nodes at the Effect Schema boundary", () => {
    const block = captureStructuredIntoNativeIr(markNativeCaptureRule({ shadowOffset: { width: 2, height: 3 } }, primitives), context).block!
    expect(() => decodeStructuredBlock({ ...block, primitiveDomain: ["view", "view"] }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    expect(() => decodeStructuredBlock({ ...block, declarations: [{ ...block.declarations[0], value: { width: 2, height: 3, extra: 1 } }] }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    expect(() => decodeStructuredBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, property: "transform" } }] }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
  })

  it("retains the last complete shadow offset with shared primitive domains", () => {
    const offsets = fc.record({ width: fc.integer({ min: -100, max: 100 }), height: fc.integer({ min: -100, max: 100 }) })
    fc.assert(fc.property(fc.array(offsets, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((shadowOffset, index) => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ shadowOffset }, primitives),
        { ...context, className: `structured_${index}` },
      ).block!)
      expect(lowerStructuredBlock(normalizeStructuredBlocks(blocks))).toEqual({ shadowOffset: values.at(-1)! })
    }), { seed: 20261028, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { shadowOffset: { width: 2, height: 3 } }
    expect(captureStructuredIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })

  it("chains structured capture into scalar capture without leaking the structured field", () => {
    const marked = markNativeCaptureRule({ shadowOffset: { width: 2, height: 3 }, opacity: 0.5 }, primitives)
    const structured = captureStructuredIntoNativeIr(marked, context)
    const scalar = captureScalarIntoNativeIr(structured.cssRule, context)
    expect(scalar.cssRule).toEqual({})
    expect(lowerStructuredBlock(structured.block!)).toEqual({ shadowOffset: { width: 2, height: 3 } })
    expect(scalar.block?.declarations.map(declaration => declaration.property)).toEqual(["opacity"])
  })
})
