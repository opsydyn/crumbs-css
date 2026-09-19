import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/text-decoration.css.ts", className: "text_decoration" }
const lineValues = ["none", "underline", "line-through", "underline line-through"] as const
const styleValues = ["solid", "double", "dotted", "dashed"] as const

describe("production native IR text decoration", () => {
  it("captures every installed line/style literal and tokens independently from colour", () => {
    for (const textDecorationLine of lineValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationLine }, ["text"]), context).block!)).toEqual({ textDecorationLine })
    for (const textDecorationStyle of styleValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationStyle }, ["text"]), context).block!)).toEqual({ textDecorationStyle })
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({
      textDecorationLine: "var(--crumbs-decoration-line)",
      textDecorationStyle: "var(--crumbs-decoration-style)",
      textDecorationColor: "rebeccapurple",
    }, ["text"]), context).block!
    expect(lowerScalarBlock(block)).toEqual({
      textDecorationLine: { $$type: "crumbs.css.theme-token", varName: "--crumbs-decoration-line" },
      textDecorationStyle: { $$type: "crumbs.css.theme-token", varName: "--crumbs-decoration-style" },
      textDecorationColor: "rebeccapurple",
    })
  })

  it("admits text only and rejects values outside each installed domain", () => {
    for (const primitive of ["view", "image"] as const) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationLine: "underline" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationStyle: "solid" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
    }
    for (const textDecorationLine of ["", "overline", "underline overline", 1, null, {}, []]) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationLine }, ["text"]), context)).toThrow(NativeIrAdmissionError)
    }
    for (const textDecorationStyle of ["", "wavy", "none", 1, null, {}, []]) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationStyle }, ["text"]), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged primitive domains, provenance and cross-property values", () => {
    const line = captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationLine: "underline" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...line, primitiveDomain: ["view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...line, declarations: [{ ...line.declarations[0], value: "solid" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const style = captureScalarIntoNativeIr(markNativeCaptureRule({ textDecorationStyle: "dotted" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...style, declarations: [{ ...style.declarations[0], value: "underline" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...style, declarations: [{ ...style.declarations[0], provenance: { ...style.declarations[0].provenance, canonicalProperty: "textDecorationColor" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering for line and style", () => {
    const declaration = fc.record({
      textDecorationLine: fc.constantFrom(...lineValues),
      textDecorationStyle: fc.constantFrom(...styleValues),
    })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, ["text"]), { ...context, className: `text_decoration_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values[values.length - 1]!)
    }), { seed: 20261015, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { textDecorationLine: "underline", textDecorationStyle: "solid" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
