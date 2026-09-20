import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { captureScalarIntoNativeIr, decodeScalarBlock, lowerScalarBlock, NativeIrAdmissionError, normalizeScalarBlocks } from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/literal-surface.css.ts", className: "literal_surface" }
const viewTextPrimitives = ["view", "text"] as const
const imagePrimitives = ["image"] as const
const borderStyleValues = ["solid", "dotted", "dashed"] as const
const isolationValues = ["auto", "isolate"] as const
const resizeModeValues = ["cover", "contain", "stretch", "repeat", "center", "none"] as const
const objectFitValues = ["cover", "contain", "fill", "scale-down", "none"] as const
const mixBlendModeValues = [
  "normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn",
  "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity",
] as const

describe("production native IR literal surface", () => {
  it("captures every installed literal and token in its supported primitive domain", () => {
    for (const primitive of viewTextPrimitives) {
      for (const borderStyle of borderStyleValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ borderStyle }, [primitive]), context).block!)).toEqual({ borderStyle })
      for (const outlineStyle of borderStyleValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ outlineStyle }, [primitive]), context).block!)).toEqual({ outlineStyle })
      for (const isolation of isolationValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ isolation }, [primitive]), context).block!)).toEqual({ isolation })
      for (const mixBlendMode of mixBlendModeValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ mixBlendMode }, [primitive]), context).block!)).toEqual({ mixBlendMode })
    }
    for (const resizeMode of resizeModeValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ resizeMode }, imagePrimitives), context).block!)).toEqual({ resizeMode })
    for (const objectFit of objectFitValues) expect(lowerScalarBlock(captureScalarIntoNativeIr(markNativeCaptureRule({ objectFit }, imagePrimitives), context).block!)).toEqual({ objectFit })

    const viewTextTokens = captureScalarIntoNativeIr(markNativeCaptureRule({
      borderStyle: "var(--crumbs-border-style)",
      outlineStyle: "var(--crumbs-outline-style)",
      isolation: "var(--crumbs-isolation)",
      mixBlendMode: "var(--crumbs-mix-blend-mode)",
    }, viewTextPrimitives), context).block!
    expect(lowerScalarBlock(viewTextTokens)).toEqual({
      borderStyle: { $$type: "crumbs.css.theme-token", varName: "--crumbs-border-style" },
      outlineStyle: { $$type: "crumbs.css.theme-token", varName: "--crumbs-outline-style" },
      isolation: { $$type: "crumbs.css.theme-token", varName: "--crumbs-isolation" },
      mixBlendMode: { $$type: "crumbs.css.theme-token", varName: "--crumbs-mix-blend-mode" },
    })
    const imageTokens = captureScalarIntoNativeIr(markNativeCaptureRule({
      resizeMode: "var(--crumbs-resize-mode)",
      objectFit: "var(--crumbs-object-fit)",
    }, imagePrimitives), context).block!
    expect(lowerScalarBlock(imageTokens)).toEqual({
      resizeMode: { $$type: "crumbs.css.theme-token", varName: "--crumbs-resize-mode" },
      objectFit: { $$type: "crumbs.css.theme-token", varName: "--crumbs-object-fit" },
    })
  })

  it("rejects unsupported primitive domains and values", () => {
    for (const property of ["borderStyle", "outlineStyle", "isolation", "mixBlendMode"] as const) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: property === "isolation" ? "auto" : property === "mixBlendMode" ? "normal" : "solid" }, ["image"]), context)).toThrow(NativeIrAdmissionError)
    }
    for (const property of ["resizeMode", "objectFit"] as const) {
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: property === "resizeMode" ? "cover" : "fill" }, ["view"]), context)).toThrow(NativeIrAdmissionError)
      expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: property === "resizeMode" ? "cover" : "fill" }, ["text"]), context)).toThrow(NativeIrAdmissionError)
    }
    const invalidValues: Readonly<Record<string, readonly unknown[]>> = {
      borderStyle: ["double", "", 1, true, null, {}, []],
      outlineStyle: ["double", "", 1, true, null, {}, []],
      isolation: ["inherit", "none", "", 1, true, null, {}, []],
      resizeMode: ["fill", "scale-down", "", 1, true, null, {}, []],
      objectFit: ["stretch", "repeat", "", 1, true, null, {}, []],
      mixBlendMode: ["plus-lighter", "normality", "", 1, true, null, {}, []],
    }
    for (const [property, values] of Object.entries(invalidValues)) {
      for (const value of values) expect(() => captureScalarIntoNativeIr(markNativeCaptureRule({ [property]: value }, property === "resizeMode" || property === "objectFit" ? imagePrimitives : viewTextPrimitives), context)).toThrow(NativeIrAdmissionError)
    }
  })

  it("rejects forged primitive domains, provenance and cross-property literals", () => {
    const border = captureScalarIntoNativeIr(markNativeCaptureRule({ borderStyle: "solid" }, viewTextPrimitives), context).block!
    expect(() => decodeScalarBlock({ ...border, primitiveDomain: ["image"] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeScalarBlock({ ...border, declarations: [{ ...border.declarations[0], value: "cover" }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const resize = captureScalarIntoNativeIr(markNativeCaptureRule({ resizeMode: "cover" }, imagePrimitives), context).block!
    expect(() => decodeScalarBlock({ ...resize, declarations: [{ ...resize.declarations[0], provenance: { ...resize.declarations[0].provenance, canonicalProperty: "objectFit" } }] }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches independent last-winner ordering for view-text literals", () => {
    const declaration = fc.record({
      borderStyle: fc.constantFrom(...borderStyleValues),
      outlineStyle: fc.constantFrom(...borderStyleValues),
      isolation: fc.constantFrom(...isolationValues),
      mixBlendMode: fc.constantFrom(...mixBlendModeValues),
    })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, viewTextPrimitives), { ...context, className: `literal_surface_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values.at(-1)!)
    }), { seed: 20261025, numRuns: 100 })
  })

  it("matches independent last-winner ordering for image literals", () => {
    const declaration = fc.record({
      resizeMode: fc.constantFrom(...resizeModeValues),
      objectFit: fc.constantFrom(...objectFitValues),
    })
    fc.assert(fc.property(fc.array(declaration, { minLength: 1, maxLength: 30 }), values => {
      const blocks = values.map((value, index) => captureScalarIntoNativeIr(markNativeCaptureRule(value, imagePrimitives), { ...context, className: `literal_surface_image_${index}` }).block!)
      expect(lowerScalarBlock(normalizeScalarBlocks(blocks))).toEqual(values.at(-1)!)
    }), { seed: 20261026, numRuns: 100 })
  })

  it("keeps unmarked records on the compatibility route", () => {
    const rule = { borderStyle: "dotted", resizeMode: "cover", objectFit: "none", mixBlendMode: "multiply" }
    expect(captureScalarIntoNativeIr(rule, context)).toEqual({ cssRule: rule })
  })
})
