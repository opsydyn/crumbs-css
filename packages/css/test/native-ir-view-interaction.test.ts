import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/view-interaction.css.ts", className: "view_interaction" }
const borderCurveValues = ["circular", "continuous"] as const
const pointerEventsValues = ["box-none", "none", "box-only", "auto"] as const
const primitives = ["view", "text"] as const

describe("production native IR view interaction controls", () => {
  it("captures every installed literal and tokens across view and text", () => {
    for (const primitive of primitives) {
      for (const borderCurve of borderCurveValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ borderCurve }, [primitive]), context).block!)).toEqual({ borderCurve })
      for (const pointerEvents of pointerEventsValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ pointerEvents }, [primitive]), context).block!)).toEqual({ pointerEvents })
    }
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ borderCurve: "var(--crumbs-border-curve)", pointerEvents: "var(--crumbs-pointer-events)" }, primitives), context).block!
    expect(lowerScalarBlock(block)).toEqual({
      borderCurve: { $$type: "crumbs.css.theme-token", varName: "--crumbs-border-curve" },
      pointerEvents: { $$type: "crumbs.css.theme-token", varName: "--crumbs-pointer-events" },
    })
  })

  it("rejects image use and values outside each installed domain", () => {
    for (const property of ["borderCurve", "pointerEvents"] as const) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: property === "borderCurve" ? "circular" : "auto" }, ["image"]), context)).toThrow(NativeIrAdmissionError)
    }
    for (const [property, values] of [["borderCurve", ["", "round", "smooth", 1, true, null, {}, []]], ["pointerEvents", ["", "all", "visible", "inherit", 1, true, null, {}, []]]] as const) {
      for (const value of values) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, primitives), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged primitive domains, provenance and cross-property literals", () => {
    const curve = captureScalarIntoNativeIr(markNativeCaptureRule({ borderCurve: "circular" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...curve, primitiveDomain: ["image"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...curve, declarations: [{ ...curve.declarations[0], value: "box-only" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const events = captureScalarIntoNativeIr(markNativeCaptureRule({ pointerEvents: "auto" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...events, declarations: [{ ...events.declarations[0], provenance: { ...events.declarations[0].provenance, canonicalProperty: "borderCurve" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering for both exact fields", () => {
    const declaration = fc.record({ borderCurve: fc.constantFrom(...borderCurveValues), pointerEvents: fc.constantFrom(...pointerEventsValues) })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, primitives), { ...context, className: `view_interaction_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values.at(-1)!)
    }), { seed: 20261024, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { borderCurve: "continuous", pointerEvents: "box-none" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
