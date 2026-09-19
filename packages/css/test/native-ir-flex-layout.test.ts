import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/flex-layout.css.ts", className: "flex_layout" }
const domains = {
  flexDirection: ["row", "column", "row-reverse", "column-reverse"],
  flexWrap: ["wrap", "nowrap", "wrap-reverse"],
  alignContent: ["flex-start", "flex-end", "center", "stretch", "space-between", "space-around", "space-evenly"],
  alignItems: ["flex-start", "flex-end", "center", "stretch", "baseline"],
  alignSelf: ["auto", "flex-start", "flex-end", "center", "stretch", "baseline"],
  justifyContent: ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"],
} as const
const primitives = ["view", "text", "image"] as const

describe("production native IR flex layout controls", () => {
  it("captures every installed literal and tokens across every FlexStyle primitive", () => {
    for (const primitive of primitives) for (const [property, values] of Object.entries(domains)) for (const value of values) {
      expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, [primitive]), context).block!)).toEqual({ [property]: value })
    }
    const authored = Object.fromEntries(Object.keys(domains).map(property => [property, `var(--crumbs-${property})`]))
    const lowered = lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule(authored, primitives), context).block!)
    expect(lowered).toEqual(Object.fromEntries(Object.keys(domains).map(property => [property, { $$type: "crumbs.css.theme-token", varName: `--crumbs-${property}` }])))
  })

  it("rejects values outside each exact installed domain", () => {
    for (const [property, values] of Object.entries(domains)) for (const value of ["", "normal", "inherit", 1, true, null, {}, []]) {
      if (!values.includes(value as never)) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, primitives), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged provenance and cross-property literals", () => {
    const direction = captureScalarIntoNativeIr(markNativeCaptureRule({ flexDirection: "row" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...direction, declarations: [{ ...direction.declarations[0], value: "wrap" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const align = captureScalarIntoNativeIr(markNativeCaptureRule({ alignItems: "baseline" }, primitives), context).block!
    expect(() => decodeScalarBlock({ ...align, declarations: [{ ...align.declarations[0], provenance: { ...align.declarations[0].provenance, canonicalProperty: "alignSelf" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering for all exact fields", () => {
    const declaration = fc.record({
      flexDirection: fc.constantFrom(...domains.flexDirection), flexWrap: fc.constantFrom(...domains.flexWrap),
      alignContent: fc.constantFrom(...domains.alignContent), alignItems: fc.constantFrom(...domains.alignItems),
      alignSelf: fc.constantFrom(...domains.alignSelf), justifyContent: fc.constantFrom(...domains.justifyContent),
    })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, primitives), { ...context, className: `flex_layout_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values.at(-1)!)
    }), { seed: 20261020, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { flexDirection: "row", flexWrap: "wrap", alignContent: "center", alignItems: "stretch", alignSelf: "auto", justifyContent: "space-between" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
