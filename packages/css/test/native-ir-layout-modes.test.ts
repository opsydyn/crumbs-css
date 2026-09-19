import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/layout-modes.css.ts", className: "layout_modes" }
const displayValues = ["none", "flex", "contents"] as const
const positionValues = ["absolute", "relative", "static"] as const
const directionValues = ["inherit", "ltr", "rtl"] as const
const primitives = ["view", "text", "image"] as const

describe("production native IR layout modes", () => {
  it("captures every installed literal and token across every FlexStyle primitive", () => {
    for (const primitive of primitives) {
      for (const display of displayValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ display }, [primitive]), context).block!)).toEqual({ display })
      for (const position of positionValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ position }, [primitive]), context).block!)).toEqual({ position })
      for (const direction of directionValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ direction }, [primitive]), context).block!)).toEqual({ direction })
    }
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ display: "var(--crumbs-display)", position: "var(--crumbs-position)", direction: "var(--crumbs-direction)" }, primitives), context).block!
    expect(lowerScalarBlock(block)).toEqual({
      display: { $$type: "crumbs.css.theme-token", varName: "--crumbs-display" },
      position: { $$type: "crumbs.css.theme-token", varName: "--crumbs-position" },
      direction: { $$type: "crumbs.css.theme-token", varName: "--crumbs-direction" },
    })
  })

  it("rejects values outside each installed domain", () => {
    for (const [property, values] of [
      ["display", ["", "block", "grid", "inline", 1, true, null, {}, []]],
      ["position", ["", "fixed", "sticky", "inherit", 1, true, null, {}, []]],
      ["direction", ["", "auto", "initial", 1, true, null, {}, []]],
    ] as const) for (const value of values) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, primitives), context)).toThrow(NativeIrAdmissionError)
  })

  it("rejects forged provenance and cross-property literals", () => {
    const display = captureScalarIntoNativeIr(markNativeCaptureRule({ display: "flex" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...display, declarations: [{ ...display.declarations[0], value: "absolute" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const position = captureScalarIntoNativeIr(markNativeCaptureRule({ position: "relative" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...position, declarations: [{ ...position.declarations[0], value: "rtl" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const direction = captureScalarIntoNativeIr(markNativeCaptureRule({ direction: "ltr" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...direction, declarations: [{ ...direction.declarations[0], provenance: { ...direction.declarations[0].provenance, canonicalProperty: "position" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering for all exact fields", () => {
    const declaration = fc.record({ display: fc.constantFrom(...displayValues), position: fc.constantFrom(...positionValues), direction: fc.constantFrom(...directionValues) })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, primitives), { ...context, className: `layout_modes_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values[values.length - 1]!)
    }), { seed: 20261018, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { display: "flex", position: "relative", direction: "ltr" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
