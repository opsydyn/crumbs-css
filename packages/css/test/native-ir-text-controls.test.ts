import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/text-controls.css.ts", className: "text_controls" }
const transformValues = ["none", "capitalize", "uppercase", "lowercase"] as const
const directionValues = ["auto", "ltr", "rtl"] as const
const selectionValues = ["auto", "none", "text", "contain", "all"] as const

describe("production native IR text controls", () => {
  it("captures every installed literal and tokens", () => {
    for (const textTransform of transformValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ textTransform }, ["text"]), context).block!)).toEqual({ textTransform })
    for (const writingDirection of directionValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ writingDirection }, ["text"]), context).block!)).toEqual({ writingDirection })
    for (const userSelect of selectionValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ userSelect }, ["text"]), context).block!)).toEqual({ userSelect })
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ textTransform: "var(--crumbs-transform)", writingDirection: "var(--crumbs-direction)", userSelect: "var(--crumbs-selection)" }, ["text"]), context).block!
    expect(lowerScalarBlock(block)).toEqual({
      textTransform: { $$type: "crumbs.css.theme-token", varName: "--crumbs-transform" },
      writingDirection: { $$type: "crumbs.css.theme-token", varName: "--crumbs-direction" },
      userSelect: { $$type: "crumbs.css.theme-token", varName: "--crumbs-selection" },
    })
  })

  it("admits text only and rejects values outside each installed domain", () => {
    for (const primitive of ["view", "image"] as const) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textTransform: "uppercase" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ writingDirection: "rtl" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ userSelect: "text" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
    }
    for (const [property, values] of [
      ["textTransform", ["", "full-width", "rtl", 1, null, {}, []]],
      ["writingDirection", ["", "inherit", "left-to-right", 1, null, {}, []]],
      ["userSelect", ["", "element", "toggle", 1, null, {}, []]],
    ] as const) for (const value of values) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["text"]), context)).toThrow(NativeIrAdmissionError)
  })

  it("rejects forged primitive domains, provenance and cross-property literals", () => {
    const transform = captureScalarIntoNativeIr(markNativeCaptureRule({ textTransform: "uppercase" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...transform, primitiveDomain: ["view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...transform, declarations: [{ ...transform.declarations[0], value: "rtl" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const direction = captureScalarIntoNativeIr(markNativeCaptureRule({ writingDirection: "ltr" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...direction, declarations: [{ ...direction.declarations[0], value: "contain" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...direction, declarations: [{ ...direction.declarations[0], provenance: { ...direction.declarations[0].provenance, canonicalProperty: "userSelect" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering for all exact fields", () => {
    const declaration = fc.record({ textTransform: fc.constantFrom(...transformValues), writingDirection: fc.constantFrom(...directionValues), userSelect: fc.constantFrom(...selectionValues) })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, ["text"]), { ...context, className: `text_controls_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values[values.length - 1]!)
    }), { seed: 20261016, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { textTransform: "uppercase", writingDirection: "rtl", userSelect: "text" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
