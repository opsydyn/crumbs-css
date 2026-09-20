import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  captureScalarIntoNativeIr,
  decodeScalarBlock,
  lowerScalarBlock,
  NativeIrAdmissionError,
  normalizeScalarBlocks,
} from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/transform-companions.css.ts", className: "transform_companions" }
const primitives = ["view", "text", "image"] as const
const scalarProperties = ["rotation", "scaleX", "scaleY", "translateX", "translateY"] as const
const finiteNumber = fc.double({ noNaN: true, noDefaultInfinity: true })

describe("production native IR scalar transform companions", () => {
  it("captures every companion across view, text and image with tokens", () => {
    for (const primitive of primitives) {
      for (const property of scalarProperties) {
        for (const value of [-4, 0, 2.5] as const) {
          expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, [primitive]), context).block!)).toEqual({ [property]: value })
        }
      }
    }
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({
      rotation: "var(--crumbs-rotation)",
      scaleX: "var(--crumbs-scale-x)",
      scaleY: "var(--crumbs-scale-y)",
      translateX: "var(--crumbs-translate-x)",
      translateY: "var(--crumbs-translate-y)",
    }, primitives), context).block!
    expect(lowerScalarBlock(block)).toEqual({
      rotation: { $$type: "crumbs.css.theme-token", varName: "--crumbs-rotation" },
      scaleX: { $$type: "crumbs.css.theme-token", varName: "--crumbs-scale-x" },
      scaleY: { $$type: "crumbs.css.theme-token", varName: "--crumbs-scale-y" },
      translateX: { $$type: "crumbs.css.theme-token", varName: "--crumbs-translate-x" },
      translateY: { $$type: "crumbs.css.theme-token", varName: "--crumbs-translate-y" },
    })
  })

  it("rejects non-finite and non-numeric companion values", () => {
    for (const property of scalarProperties) {
      for (const value of [NaN, Infinity, -Infinity, "", "45deg", "10%", true, null, {}, []]) {
        expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, primitives), context)).toThrow(NativeIrAdmissionError)
      }
    }
  })

  it("rejects forged primitive domains, values and provenance", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ rotation: 45 }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...block, primitiveDomain: ["view", "text", "image", "view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], value: "45deg" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "scaleX" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering for all exact fields", () => {
    const declaration = fc.record({
      rotation: finiteNumber,
      scaleX: finiteNumber,
      scaleY: finiteNumber,
      translateX: finiteNumber,
      translateY: finiteNumber,
    })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, primitives), { ...context, className: `transform_companions_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values.at(-1)!)
    }), { seed: 20261029, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { rotation: 45, scaleX: 1, scaleY: 1, translateX: 2, translateY: -3 }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
