import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { NativeStylesDiagnosticCode } from "../src/diagnostics"
import {
  assertNativeCssCompatibility,
  NativeStylesCompatibilityError,
} from "../src/native-compatibility"

const PROPERTY_RUNS = 100
const PROPERTY_SEED = 20260512

const plainClassSelectorArbitrary = fc.constantFrom(".button__a1", ".panel-title__b2")
const unsupportedSelectorArbitrary = fc.constantFrom(
  ".button__a1:hover",
  ".button__a1::before",
  ".button__a1 .label__b2",
  ".button__a1, .label__b2",
  "body",
)
const unsupportedAtRuleArbitrary = fc.constantFrom("font-face", "keyframes", "layer", "supports")

describe("native CSS compatibility properties", () => {
  it("accepts generated plain class selectors", () => {
    fc.assert(
      fc.property(plainClassSelectorArbitrary, (selector) => {
        expect(() => assertNativeCssCompatibility(`${selector} { color: red; }`)).not.toThrow()
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })

  it("codes generated unsupported selectors as selector diagnostics", () => {
    fc.assert(
      fc.property(unsupportedSelectorArbitrary, (selector) => {
        expectCompatibilityCode(
          `${selector} { color: red; }`,
          NativeStylesDiagnosticCode.UnsupportedSelector,
        )
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })

  it("codes media separately from other generated unsupported at-rules", () => {
    fc.assert(
      fc.property(unsupportedAtRuleArbitrary, (atRuleName) => {
        expectCompatibilityCode(
          `@${atRuleName} { .button__a1 { color: red; } }`,
          NativeStylesDiagnosticCode.UnsupportedAtRule,
        )
        expectCompatibilityCode(
          "@media (min-width: 800px) { .button__a1 { color: red; } }",
          NativeStylesDiagnosticCode.UnsupportedMedia,
        )
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })
})

function expectCompatibilityCode(css: string, code: NativeStylesDiagnosticCode): void {
  try {
    assertNativeCssCompatibility(css)
  } catch (error) {
    expect(error).toBeInstanceOf(NativeStylesCompatibilityError)
    expect((error as NativeStylesCompatibilityError).code).toBe(code)
    return
  }
  throw new Error(`Expected native compatibility check to throw ${code}`)
}
