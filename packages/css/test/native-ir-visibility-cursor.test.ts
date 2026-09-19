import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/visibility-cursor.css.ts", className: "visibility_cursor" }
const backfaceValues = ["visible", "hidden"] as const
const cursorValues = ["auto", "pointer"] as const
const primitives = ["view", "text", "image"] as const

describe("production native IR backface visibility and cursor", () => {
  it("captures every installed literal and tokens across supported primitives", () => {
    for (const primitive of primitives) {
      for (const backfaceVisibility of backfaceValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ backfaceVisibility }, [primitive]), context).block!)).toEqual({ backfaceVisibility })
      for (const cursor of cursorValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ cursor }, [primitive]), context).block!)).toEqual({ cursor })
    }
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ backfaceVisibility: "var(--crumbs-backface)", cursor: "var(--crumbs-cursor)" }, primitives), context).block!
    expect(lowerScalarBlock(block)).toEqual({
      backfaceVisibility: { $$type: "crumbs.css.theme-token", varName: "--crumbs-backface" },
      cursor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-cursor" },
    })
  })

  it("rejects values outside each installed domain", () => {
    for (const [property, values] of [["backfaceVisibility", ["", "auto", "collapse", 1, true, null, {}, []]], ["cursor", ["", "default", "text", "grab", 1, true, null, {}, []]]] as const) {
      for (const value of values) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, primitives), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged provenance and cross-property literals", () => {
    const backface = captureScalarIntoNativeIr(markNativeCaptureRule({ backfaceVisibility: "visible" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...backface, declarations: [{ ...backface.declarations[0], value: "pointer" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const cursor = captureScalarIntoNativeIr(markNativeCaptureRule({ cursor: "auto" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...cursor, declarations: [{ ...cursor.declarations[0], provenance: { ...cursor.declarations[0].provenance, canonicalProperty: "backfaceVisibility" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering for both exact fields", () => {
    const declaration = fc.record({ backfaceVisibility: fc.constantFrom(...backfaceValues), cursor: fc.constantFrom(...cursorValues) })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, primitives), { ...context, className: `visibility_cursor_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values.at(-1)!)
    }), { seed: 20261023, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { backfaceVisibility: "hidden", cursor: "pointer" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
