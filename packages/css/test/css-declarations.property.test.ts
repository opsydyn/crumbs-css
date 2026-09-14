import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { cssDeclarationsToRN, NativeStylesDeclarationError } from "../src/css-to-rn"
import { NativeStylesDiagnosticCode } from "../src/diagnostics"
import { createThemeTokenReference, isThemeTokenReference } from "../src/theme-token"

type ValidDeclaration = {
  readonly expectedProp: string
  readonly expectedValue: string
  readonly prop: string
  readonly value: string
}

const PROPERTY_RUNS = 100
const PROPERTY_SEED = 20260512

const validDeclarationArbitrary = fc.constantFrom<ValidDeclaration>(
  {
    expectedProp: "color",
    expectedValue: "red",
    prop: "color",
    value: "red",
  },
  {
    expectedProp: "backgroundColor",
    expectedValue: "#ffffff",
    prop: "background-color",
    value: "#ffffff",
  },
)
const unsupportedDeclarationArbitrary = fc.constantFrom(
  ["transition", "all 0.3s"] as const,
  ["animation", "spin 1s linear"] as const,
)
const themeTokenPropArbitrary = fc.constantFrom(
  ["background-color", "backgroundColor"] as const,
  ["color", "color"] as const,
)

describe("css declaration conversion properties", () => {
  it("preserves declaration order for generated mixtures of tokens and literals", () => {
    const entry = fc.oneof(
      fc.constantFrom(
        { prop: "color", nativeProp: "color", value: "red", expected: "red" },
        { prop: "background-color", nativeProp: "backgroundColor", value: "blue", expected: "blue" },
        { prop: "opacity", nativeProp: "opacity", value: "0.5", expected: 0.5 },
      ),
      fc.constantFrom(
        { prop: "color", nativeProp: "color", value: "var(--crumbs-color-accent)", expected: createThemeTokenReference("--crumbs-color-accent") },
        { prop: "background-color", nativeProp: "backgroundColor", value: "var(--crumbs-color-canvas)", expected: createThemeTokenReference("--crumbs-color-canvas") },
        { prop: "opacity", nativeProp: "opacity", value: "var(--crumbs-opacity-disabled)", expected: createThemeTokenReference("--crumbs-opacity-disabled") },
      ),
    )
    fc.assert(fc.property(fc.array(entry, { minLength: 1, maxLength: 30 }), (entries) => {
      const expected: Record<string, unknown> = {}
      for (const item of entries) expected[item.nativeProp] = item.expected
      expect(cssDeclarationsToRN(entries.map(({ prop, value }) => [prop, value] as const), {
        strictDiagnostics: true,
      })).toEqual(expected)
    }), { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED })
  })

  it("rejects generated unknown properties even when their value is a native token", () => {
    fc.assert(fc.property(fc.nat(), (suffix) => {
      expect(() => cssDeclarationsToRN([
        [`unknown-native-property-${suffix}`, "var(--crumbs-color-accent)"],
      ], { strictDiagnostics: true })).toThrow(NativeStylesDeclarationError)
    }), { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED })
  })

  it("keeps valid declarations beside unsupported declarations in non-strict mode", () => {
    fc.assert(
      fc.property(
        validDeclarationArbitrary,
        unsupportedDeclarationArbitrary,
        (validDeclaration, unsupportedDeclaration) => {
          const result = cssDeclarationsToRN([
            unsupportedDeclaration,
            [validDeclaration.prop, validDeclaration.value],
          ])

          expect(result[validDeclaration.expectedProp]).toBe(validDeclaration.expectedValue)
          expect(result).not.toHaveProperty(unsupportedDeclaration[0])
        },
      ),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })

  it("turns unsupported declarations into coded errors in strict mode", () => {
    fc.assert(
      fc.property(unsupportedDeclarationArbitrary, (unsupportedDeclaration) => {
        try {
          cssDeclarationsToRN([unsupportedDeclaration], { strictDiagnostics: true })
        } catch (error) {
          expect(error).toBeInstanceOf(NativeStylesDeclarationError)
          expect((error as NativeStylesDeclarationError).code).toBe(
            NativeStylesDiagnosticCode.DroppedDeclaration,
          )
          return
        }
        throw new Error("Expected strict declaration conversion to throw")
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })

  it("drops browser CSS variables while preserving native theme token references", () => {
    fc.assert(
      fc.property(themeTokenPropArbitrary, ([cssProp, nativeProp]) => {
        const browserVarResult = withCapturedWarnings(() =>
          cssDeclarationsToRN([[cssProp, "var(--brand-color)"]]),
        )
        const nativeVarResult = cssDeclarationsToRN([[cssProp, "var(--crumbs-color-canvas)"]])
        const tokenReference = nativeVarResult[nativeProp]

        expect(browserVarResult.result).toEqual({})
        expect(browserVarResult.warnings).toHaveLength(1)
        expect(browserVarResult.warnings[0]).toContain(
          NativeStylesDiagnosticCode.CssVariableDropped,
        )
        expect(isThemeTokenReference(tokenReference)).toBe(true)
        expect(isThemeTokenReference(tokenReference) ? tokenReference.varName : undefined).toBe(
          "--crumbs-color-canvas",
        )
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })
})

function withCapturedWarnings<T>(run: () => T): {
  readonly result: T
  readonly warnings: ReadonlyArray<string>
} {
  const originalWarn = console.warn
  const warnings: string[] = []
  console.warn = (...args: ReadonlyArray<unknown>) => {
    warnings.push(args.map(String).join(" "))
  }
  try {
    return { result: run(), warnings }
  } finally {
    console.warn = originalWarn
  }
}
