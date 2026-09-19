import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import * as path from "node:path"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import {
  captureNumericIntoNativeIr,
  decodeNumericBlock,
  lowerNumericBlock,
  NativeIrAdmissionError,
  normalizeNumericBlocks,
  type NumericCaptureContext,
} from "../src/compiler/native-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"
import { transformCssTsToStyleSheet } from "../src/transformer"
import {
  evaluateStyle,
  type DeclarationValue,
  type SourceProvenance as OracleProvenance,
  type StyleExpression,
} from "./oracles/native-ir-v1"

const root = path.resolve(import.meta.dir, "..")
const context: NumericCaptureContext = {
  packageOwner: "@fixture/app",
  sourceId: "styles/layout.css.ts",
  className: "layout_class",
}
const properties = ["zIndex", "elevation", "flexGrow", "flexShrink"] as const
const oracleProvenance: OracleProvenance = {
  sourceId: context.sourceId,
  exportPath: ["result"],
  propertyPath: [],
  line: 1,
  column: 1,
  origin: "crumbs-native",
}

async function compile(source: string, useStyleSheet = false): Promise<Record<string, unknown>> {
  const dir = mkdtempSync(path.join(root, "fixtures/.native-ir-unitless-"))
  const file = path.join(dir, "case.css.ts")
  try {
    writeFileSync(file, source)
    const code = await transformCssTsToStyleSheet(file, root, { useStyleSheet, strictDiagnostics: false })
    const exports: Record<string, unknown> = {}
    const StyleSheet = { create: (styles: unknown) => styles }
    runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), { exports, StyleSheet })
    return exports
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function oracleBlock(property: string, value: DeclarationValue): StyleExpression {
  return {
    _tag: "DeclarationBlock",
    primitive: "view",
    declarations: [{
      _tag: "Declaration",
      property,
      value,
      provenance: { ...oracleProvenance, propertyPath: [property], originalProperty: property },
    }],
    provenance: oracleProvenance,
  }
}

describe("production native IR unitless numeric layout family", () => {
  it("captures the exact family before CSS and retains unmigrated properties", () => {
    const captured = captureNumericIntoNativeIr(markNativeCaptureRule({
      zIndex: -3,
      elevation: 2.5,
      flexGrow: -0,
      flexShrink: "var(--crumbs-layout-shrink)",
      width: 40,
    }, ["view", "text", "image"]), context)
    expect(captured.cssRule).toEqual({ width: 40 })
    expect(captured.block?.primitiveDomain).toEqual(["view", "text"])
    expect(captured.block?.declarations.map(declaration => [declaration.property, declaration.value])).toEqual([
      ["zIndex", -3],
      ["elevation", 2.5],
      ["flexGrow", -0],
      ["flexShrink", { _tag: "LegacyTokenReference", varName: "--crumbs-layout-shrink" }],
    ])
    const lowered = lowerNumericBlock(captured.block!)
    expect(Object.is(lowered.flexGrow, -0)).toBe(true)
    expect(lowered.flexShrink).toEqual({ $$type: "crumbs.css.theme-token", varName: "--crumbs-layout-shrink" })
  })

  it("uses the installed React Native primitive domains", () => {
    for (const property of ["zIndex", "flexGrow", "flexShrink"] as const) {
      const block = captureNumericIntoNativeIr(markNativeCaptureRule({ [property]: 1 }, ["image"]), context).block!
      expect(block.primitiveDomain).toEqual(["image"])
    }
    expect(captureNumericIntoNativeIr(markNativeCaptureRule({ elevation: 1 }, ["text"]), context).block?.primitiveDomain)
      .toEqual(["text"])
    expect(() => captureNumericIntoNativeIr(markNativeCaptureRule({ elevation: 1 }, ["image"]), context))
      .toThrow("CRUMBS_IR_INVALID_PROPERTY")
  })

  it("rejects non-finite, non-numeric and accessor values without fallback", () => {
    for (const property of properties) {
      for (const value of [NaN, Infinity, -Infinity, "1", "var(--other-value)", {}, []]) {
        expect(() => captureNumericIntoNativeIr(markNativeCaptureRule({ [property]: value }, ["view"]), context))
          .toThrow(NativeIrAdmissionError)
      }
      const accessor = Object.defineProperty({}, property, { enumerable: true, get: () => { throw new Error("EXECUTED") } })
      expect(() => captureNumericIntoNativeIr(markNativeCaptureRule(accessor, ["view"]), context))
        .toThrow("CRUMBS_IR_INVALID_VALUE")
    }
  })

  it("enforces exact Effect Schema fields and property names", () => {
    const block = captureNumericIntoNativeIr(markNativeCaptureRule({ zIndex: 1 }, ["view"]), context).block!
    expect(() => decodeNumericBlock({ ...block, unexpected: true }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeNumericBlock({
      ...block,
      declarations: [{ ...block.declarations[0], property: "width" }],
    }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    expect(() => decodeNumericBlock({
      ...block,
      declarations: [{ ...block.declarations[0], provenance: { ...block.declarations[0].provenance, canonicalProperty: "opacity" } }],
    }, context.sourceId)).toThrow("CRUMBS_IR_INVALID_NODE")
    const elevation = captureNumericIntoNativeIr(markNativeCaptureRule({ elevation: 1 }, ["view"]), context).block!
    expect(() => decodeNumericBlock({ ...elevation, primitiveDomain: ["image"] }, context.sourceId))
      .toThrow("CRUMBS_IR_INVALID_NODE")
  })

  it("matches the independent oracle for generated order and legacy tokens", () => {
    const entry = fc.tuple(
      fc.constantFrom(...properties),
      fc.oneof(fc.double({ noNaN: true, noDefaultInfinity: true }), fc.constant("var(--crumbs-layout-value)")),
    )
    fc.assert(fc.property(fc.array(entry, { minLength: 1, maxLength: 24 }), entries => {
      const blocks = entries.map(([property, value], index) => captureNumericIntoNativeIr(
        markNativeCaptureRule({ [property]: value }, ["view"]),
        { ...context, className: `class_${index}` },
      ).block!)
      const actual = lowerNumericBlock(normalizeNumericBlocks(blocks))
      const oracleItems = entries.map(([property, value]) => oracleBlock(property, value === "var(--crumbs-layout-value)"
        ? { _tag: "TokenReference", contract: { owner: "legacy", name: "unqualified", version: 1 }, path: ["--crumbs-layout-value"] }
        : value))
      const expected = evaluateStyle({ _tag: "Composition", primitive: "view", items: oracleItems, provenance: oracleProvenance }, {
        definitions: [],
        tokens: { "legacy\u0000unqualified\u00001\u0000--crumbs-layout-value": 0.37 },
      })
      expect(expected.ok).toBe(true)
      if (expected.ok) {
        const resolvedActual = Object.fromEntries(Object.entries(actual).map(([property, value]) => [
          property,
          typeof value === "object" ? 0.37 : value,
        ]))
        expect(resolvedActual).toEqual(expected.value as Readonly<Record<string, number>>)
      }
    }), { seed: 20260919, numRuns: 100 })
  })

  for (const useStyleSheet of [true, false]) {
    it(`preserves helpers, tokens and composition with useStyleSheet=${useStyleSheet}`, async () => {
      const exports = await compile(`
        import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe, createThemeContract } from '@opsydyn/crumbs-css/style'
        const vars = createThemeContract({ layout: null })
        const base = viewStyle({ zIndex: 1, elevation: vars.layout, flexGrow: 2, flexShrink: 3, width: 40 })
        export const composed = viewStyle([base, { zIndex: -4, flexGrow: -0 }])
        export const generic = style({ zIndex: 5, flexShrink: 6 })
        export const text = textStyle({ elevation: 7 })
        export const image = imageStyle({ zIndex: 8, flexGrow: 9 })
        export const variants = styleVariants({ active: { flexShrink: 10 } })
        export const button = recipe({ variants: { tone: { raised: { elevation: 11 } } } })
      `, useStyleSheet)
      expect(exports.composed).toMatchObject({ zIndex: -4, elevation: { $$type: "crumbs.css.theme-token", varName: "--crumbs-layout" }, flexShrink: 3, width: 40 })
      expect(Object.is((exports.composed as { flexGrow: number }).flexGrow, -0)).toBe(true)
      expect(exports.generic).toEqual({ zIndex: 5, flexShrink: 6 })
      expect(exports.text).toEqual({ elevation: 7 })
      expect(exports.image).toEqual({ zIndex: 8, flexGrow: 9 })
      expect((exports.variants as { active: unknown }).active).toEqual({ flexShrink: 10 })
      expect((exports.button as { variants: { tone: { raised: unknown } } }).variants.tone.raised).toEqual({ elevation: 11 })
    })
  }

  it("keeps unmarked vanilla-extract values on the legacy route and rejects invalid Crumbs domains", async () => {
    const legacy = await compile(`
      import { style as vanillaStyle } from '@vanilla-extract/css'
      export const value = vanillaStyle({ zIndex: 2, flexGrow: 3 })
    `)
    expect(legacy.value).toEqual({ zIndex: 2, flexGrow: 3 })
    await expect(compile(`
      import { imageStyle } from '@opsydyn/crumbs-css/style'
      export const invalid = imageStyle({ elevation: 1 } as any)
    `)).rejects.toThrow("CRUMBS_IR_INVALID_PROPERTY")
  })
})
