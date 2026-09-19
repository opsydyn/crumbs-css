import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import * as path from "node:path"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import {
  captureOpacityIntoNativeIr,
  composeOpacityBlocks,
  decodeOpacityBlock,
  lowerOpacityBlock,
  NativeIrAdmissionError,
  type OpacityCaptureContext,
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
const context: OpacityCaptureContext = {
  packageOwner: "@fixture/app",
  sourceId: "styles/case.css.ts",
  className: "case_class",
}
const oracleProvenance: OracleProvenance = {
  sourceId: "styles/case.css.ts",
  exportPath: ["result"],
  propertyPath: ["opacity"],
  line: 1,
  column: 1,
  origin: "crumbs-native",
}

function oracleBlock(value: DeclarationValue): StyleExpression {
  return {
    _tag: "DeclarationBlock",
    primitive: "view",
    declarations: [{ _tag: "Declaration", property: "opacity", value, provenance: oracleProvenance }],
    provenance: oracleProvenance,
  }
}

async function compile(source: string, useStyleSheet: boolean, strictDiagnostics = true): Promise<{ code: string; exports: Record<string, unknown> }> {
  const dir = mkdtempSync(path.join(root, "fixtures/.native-ir-opacity-"))
  const file = path.join(dir, "case.css.ts")
  try {
    writeFileSync(file, source)
    const code = await transformCssTsToStyleSheet(file, root, { useStyleSheet, strictDiagnostics })
    const exports: Record<string, unknown> = {}
    const StyleSheet = { create: (styles: unknown) => styles }
    runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), { exports, StyleSheet })
    return { code, exports }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe("production native IR opacity vertical", () => {
  it("admits finite literals and legacy tokens with exact provenance", () => {
    const literal = captureOpacityIntoNativeIr(markNativeCaptureRule({ opacity: -0, color: "red" }, ["view"]), context)
    expect(literal.cssRule).toEqual({ color: "red" })
    expect(literal.block).toEqual({
      _tag: "DeclarationBlock",
      primitiveDomain: ["view"],
      declarations: [{
        _tag: "NativeDeclaration",
        property: "opacity",
        value: -0,
        provenance: {
          packageOwner: "@fixture/app",
          sourceId: "styles/case.css.ts",
          exportPath: [],
          logicalPath: ["case_class", "opacity"],
          origin: "crumbs-native",
          authoredProperty: "opacity",
          canonicalProperty: "opacity",
          shorthandExpansionPath: [],
        },
      }],
      provenance: {
        packageOwner: "@fixture/app",
        sourceId: "styles/case.css.ts",
        exportPath: [],
        logicalPath: ["case_class"],
        origin: "crumbs-native",
      },
    })
    expect(Object.is((lowerOpacityBlock(literal.block!) as { opacity: number }).opacity, -0)).toBe(true)

    const token = captureOpacityIntoNativeIr(markNativeCaptureRule({ opacity: "var(--crumbs-alpha)" }, ["text"]), {
      ...context,
    })
    expect(token.block?.declarations[0]?.value).toEqual({ _tag: "LegacyTokenReference", varName: "--crumbs-alpha" })
    expect(lowerOpacityBlock(token.block!)).toEqual({
      opacity: { $$type: "crumbs.css.theme-token", varName: "--crumbs-alpha" },
    })
  })

  it("leaves unmarked vanilla-extract rules and every unmigrated property on the legacy path", () => {
    const unmarked = captureOpacityIntoNativeIr({ opacity: 0.5, padding: 4 }, context)
    expect(unmarked).toEqual({ cssRule: { opacity: 0.5, padding: 4 } })
    const marked = captureOpacityIntoNativeIr(markNativeCaptureRule({ opacity: 0.5, padding: 4 }, ["view"]), context)
    expect(marked.cssRule).toEqual({ padding: 4 })
    expect(lowerOpacityBlock(marked.block!)).toEqual({ opacity: 0.5 })
  })

  it("rejects malformed marked opacity without a legacy fallback", () => {
    for (const value of [NaN, Infinity, -Infinity, "0.5", "var(--other-alpha)", {}, []]) {
      expect(() => captureOpacityIntoNativeIr(markNativeCaptureRule({ opacity: value }, ["view"]), context)).toThrow(NativeIrAdmissionError)
      try {
        captureOpacityIntoNativeIr(markNativeCaptureRule({ opacity: value }, ["view"]), context)
      } catch (error) {
        expect(error).toBeInstanceOf(NativeIrAdmissionError)
        expect((error as NativeIrAdmissionError).diagnostics[0]).toMatchObject({
          code: "CRUMBS_IR_INVALID_VALUE",
          phase: "admission",
          property: "opacity",
        })
        expect((error as Error).message).toContain("styles/case.css.ts")
      }
    }
  })

  it("enforces exact production node fields at the Effect Schema boundary", () => {
    const block = captureOpacityIntoNativeIr(markNativeCaptureRule({ opacity: 0.5 }, ["view"]), context).block!
    expect(() => decodeOpacityBlock({ ...block, unexpected: true }, context.sourceId)).toThrow(NativeIrAdmissionError)
    expect(() => decodeOpacityBlock({ ...block, declarations: [{ ...block.declarations[0], value: Infinity }] }, context.sourceId))
      .toThrow(NativeIrAdmissionError)
  })

  it("normalizes ordered blocks to the last value and intersected primitive domain", () => {
    const first = captureOpacityIntoNativeIr(markNativeCaptureRule({ opacity: 0.25 }, ["view", "text"]), {
      ...context,
      className: "first",
    }).block!
    const last = captureOpacityIntoNativeIr(markNativeCaptureRule({ opacity: 0.75 }, ["text", "image"]), {
      ...context,
      className: "last",
    }).block!
    const normalized = composeOpacityBlocks([first, last])
    expect(normalized.primitiveDomain).toEqual(["text"])
    expect(lowerOpacityBlock(normalized)).toEqual({ opacity: 0.75 })
    expect(normalized.declarations[0].provenance.logicalPath).toEqual(["last", "opacity"])
    expect(Object.isFrozen(normalized)).toBe(true)
    expect(() => composeOpacityBlocks([
      captureOpacityIntoNativeIr(markNativeCaptureRule({ opacity: 0.25 }, ["view"]), context).block!,
      captureOpacityIntoNativeIr(markNativeCaptureRule({ opacity: 0.75 }, ["text"]), context).block!,
    ])).toThrow("CRUMBS_IR_PRIMITIVE_MISMATCH")
  })

  it("matches the independent ordered oracle for generated literal and token compositions", () => {
    const value = fc.oneof(
      fc.double({ noNaN: true, noDefaultInfinity: true }),
      fc.constant("var(--crumbs-alpha)"),
    )
    fc.assert(fc.property(fc.array(value, { minLength: 1, maxLength: 20 }), values => {
      const blocks = values.map((opacity, index) => captureOpacityIntoNativeIr(
        markNativeCaptureRule({ opacity }, ["view"]),
        { ...context, className: `class_${index}` },
      ).block!)
      const actual = lowerOpacityBlock(composeOpacityBlocks(blocks))
      const referenceValues = values.map(value => value === "var(--crumbs-alpha)"
        ? ({ _tag: "TokenReference", contract: { owner: "legacy", name: "unqualified", version: 1 }, path: ["--crumbs-alpha"] } as const)
        : value)
      const expected = evaluateStyle({
        _tag: "Composition",
        primitive: "view",
        items: referenceValues.map(value => oracleBlock(value)),
        provenance: oracleProvenance,
      }, {
        definitions: [],
        tokens: { "legacy\u0000unqualified\u00001\u0000--crumbs-alpha": 0.37 },
      })
      expect(expected.ok).toBe(true)
      if (expected.ok) {
        const expectedValue = values.at(-1) === "var(--crumbs-alpha)" ? 0.37 : expected.value.opacity as number
        const lowered = actual.opacity
        expect(typeof lowered === "object" ? 0.37 : Object.is(lowered, -0) ? -0 : lowered).toBe(expectedValue)
      }
    }), { seed: 20260919, numRuns: 100 })
  })

  for (const useStyleSheet of [true, false]) {
    it(`routes Crumbs opacity through capture and preserves output with useStyleSheet=${useStyleSheet}`, async () => {
      const { code, exports } = await compile(`
        import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe, createThemeContract } from '@opsydyn/crumbs-css/style'
        const vars = createThemeContract({ alpha: null })
        const base = viewStyle({ opacity: vars.alpha, padding: 4 })
        export const token = base
        export const composed = viewStyle([base, { opacity: -0 }])
        export const generic = style({ opacity: 0.25 })
        export const text = textStyle({ opacity: 0.5 })
        export const image = imageStyle({ opacity: 0.75 })
        export const variants = styleVariants({ active: { opacity: 0.625 } })
        export const button = recipe({ variants: { tone: { muted: { opacity: 0.875 } } } })
      `, useStyleSheet)
      expect(exports.composed).toMatchObject({ paddingTop: 4, paddingRight: 4, paddingBottom: 4, paddingLeft: 4 })
      expect(exports.token).toMatchObject({ opacity: { $$type: "crumbs.css.theme-token", varName: "--crumbs-alpha" } })
      expect(Object.is((exports.composed as { opacity: number }).opacity, -0)).toBe(true)
      expect(exports.generic).toEqual({ opacity: 0.25 })
      expect(exports.text).toEqual({ opacity: 0.5 })
      expect(exports.image).toEqual({ opacity: 0.75 })
      expect((exports.variants as { active: unknown }).active).toEqual({ opacity: 0.625 })
      expect((exports.button as { variants: { tone: { muted: unknown } } }).variants.tone.muted).toEqual({ opacity: 0.875 })
      expect(code).toContain("opacity")
    })
  }

  it("keeps unmarked vanilla-extract opacity on the qualified legacy route", async () => {
    const { exports } = await compile(`
      import { style as vanillaStyle } from '@vanilla-extract/css'
      export const legacy = vanillaStyle({ opacity: 0.625 })
    `, false)
    expect(exports.legacy).toEqual({ opacity: 0.625 })
  })

  it("fails malformed Crumbs opacity before CSS serialization even with permissive diagnostics", async () => {
    await expect(compile(`
      import { viewStyle } from '@opsydyn/crumbs-css/style'
      export const invalid = viewStyle({ opacity: Number.POSITIVE_INFINITY } as any)
    `, false, false)).rejects.toMatchObject({ name: "NativeIrAdmissionError" })
    await expect(compile(`
      import { viewStyle } from '@opsydyn/crumbs-css/style'
      export const invalid = viewStyle({ opacity: Number.POSITIVE_INFINITY } as any)
    `, false, false)).rejects.toThrow("CRUMBS_IR_INVALID_VALUE")
  })
})
