import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/text-shadow.css.ts", className: "text_shadow" }

describe("production native IR text-shadow scalars", () => {
  it("captures colour and radius independently from structured offset", () => {
    const captured = captureScalarIntoNativeIr(markNativeCaptureRule({ textShadowColor: "var(--crumbs-text-shadow)", textShadowRadius: 4, textShadowOffset: { width: 1, height: 2 } }, ["text"]), context)
    expect(captured.cssRule).toEqual({ textShadowOffset: { width: 1, height: 2 } })
    expect(lowerScalarBlock(captured.block!)).toEqual({ textShadowColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-text-shadow" }, textShadowRadius: 4 })
  })

  it("admits text only with property-specific values", () => {
    expect(captureScalarIntoNativeIr(markNativeCaptureRule({ textShadowColor: "transparent", textShadowRadius: "var(--crumbs-radius)" }, ["text"]), context).block?.primitiveDomain).toEqual(["text"])
    for (const primitive of ["view", "image"] as const) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textShadowColor: "red" }, [primitive]), context)).toThrow(NativeIrAdmissionError)
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textShadowRadius: 2 }, [primitive]), context)).toThrow(NativeIrAdmissionError)
    }
    for (const value of [0, NaN, null, "", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textShadowColor: value }, ["text"]), context)).toThrow(NativeIrAdmissionError)
    for (const value of [NaN, Infinity, null, "auto", "10px", "25%", {}, []]) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ textShadowRadius: value }, ["text"]), context)).toThrow(NativeIrAdmissionError)
  })

  it("rejects forged text-shadow provenance and primitive domains", () => {
    const block = captureScalarIntoNativeIr(markNativeCaptureRule({ textShadowColor: "red" }, ["text"]), context).block!
    expect(() => decodeScalarBlock({ ...block, declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "textShadowRadius" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...block, primitiveDomain: ["view"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent exact-field ordering", () => {
    const entry = fc.oneof(
      fc.constantFrom("red", "blue", "#123456", "transparent").map(value => ["textShadowColor", value] as const),
      fc.double({ noNaN: true, noDefaultInfinity: true }).map(value => ["textShadowRadius", value] as const),
    )
    fc.assert(fc.property(fc.array(entry, { minLength: 1, maxLength: 30 }), entries => {
      const blocks = entries.map(([property, value], index) => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["text"]), { ...context, className: `text_shadow_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(Object.fromEntries(entries))
    }), { seed: 20261009, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    expect(captureScalarIntoNativeIr({ textShadowColor: "red", textShadowRadius: 4 }, context)).toEqual({ cssRule: { textShadowColor: "red", textShadowRadius: 4 } })
  })
})
