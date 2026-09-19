import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/text-alignment.css.ts", className: "text_alignment" }
const textAlignValues = ["auto", "left", "right", "center", "justify"] as const
const textAlignVerticalValues = ["auto", "top", "bottom", "center"] as const
const verticalAlignValues = ["auto", "top", "bottom", "middle"] as const

describe("production native IR text alignment", () => {
  it("captures every installed alignment literal and tokens", () => {
    for (const textAlign of textAlignValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ textAlign }, ["text"]), context).block!)).toEqual({ textAlign })
    for (const textAlignVertical of textAlignVerticalValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ textAlignVertical }, ["text"]), context).block!)).toEqual({ textAlignVertical })
    for (const verticalAlign of verticalAlignValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ verticalAlign }, ["text"]), context).block!)).toEqual({ verticalAlign })
    const token = captureScalarIntoNativeIr(markNativeCaptureRule({
      textAlign: "var(--crumbs-text-align)",
      textAlignVertical: "var(--crumbs-text-align-vertical)",
      verticalAlign: "var(--crumbs-vertical-align)",
    }, ["text"]), context).block!
    expect(lowerScalarBlock(token)).toEqual({
      textAlign: { $$type: "crumbs.css.theme-token", varName: "--crumbs-text-align" },
      textAlignVertical: { $$type: "crumbs.css.theme-token", varName: "--crumbs-text-align-vertical" },
      verticalAlign: { $$type: "crumbs.css.theme-token", varName: "--crumbs-vertical-align" },
    })
  })

  it("admits text only and rejects values outside each installed domain", () => {
    for (const primitive of ["view", "image"] as const) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textAlign: "left" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textAlignVertical: "top" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ verticalAlign: "middle" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
    }
    for (const [property, values] of [
      ["textAlign", ["", "start", "middle", 1, null, {}, []]],
      ["textAlignVertical", ["", "left", "middle", 1, null, {}, []]],
      ["verticalAlign", ["", "left", "center", 1, null, {}, []]],
    ] as const) {
      for (const value of values) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["text"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged primitive domains, provenance and cross-property literals", () => {
    const horizontal = captureScalarIntoNativeIr(markNativeCaptureRule({ textAlign: "justify" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...horizontal, primitiveDomain: ["view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...horizontal, declarations: [{ ...horizontal.declarations[0], value: "top" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const vertical = captureScalarIntoNativeIr(markNativeCaptureRule({ verticalAlign: "middle" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...vertical, declarations: [{ ...vertical.declarations[0], value: "center" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...vertical, declarations: [{ ...vertical.declarations[0], provenance: { ...vertical.declarations[0].provenance, canonicalProperty: "textAlignVertical" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering for all exact fields", () => {
    const declaration = fc.record({
      textAlign: fc.constantFrom(...textAlignValues),
      textAlignVertical: fc.constantFrom(...textAlignVerticalValues),
      verticalAlign: fc.constantFrom(...verticalAlignValues),
    })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, ["text"]), { ...context, className: `text_alignment_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values[values.length - 1]!)
    }), { seed: 20261014, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { textAlign: "left", textAlignVertical: "top", verticalAlign: "middle" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
