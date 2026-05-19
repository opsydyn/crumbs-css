import { describe, expect, it } from "bun:test"
import { cssDeclarationsToRN, NativeStylesDeclarationError } from "../src/css-to-rn"
import { NativeStylesDiagnosticCode } from "../src/diagnostics"
import {
  assertNativeCssCompatibility,
  NativeStylesCompatibilityError,
} from "../src/native-compatibility"

function captureWarnings(run: () => void): ReadonlyArray<string> {
  const originalWarn = console.warn
  const warnings: string[] = []
  console.warn = (...args: unknown[]) => {
    warnings.push(args.join(" "))
  }
  try {
    run()
  } finally {
    console.warn = originalWarn
  }
  return warnings
}

describe("@opsydyn/crumbs-css diagnostics", () => {
  it("codes unsupported media compatibility errors", () => {
    expect(() =>
      assertNativeCssCompatibility("@media (min-width: 600px) { .a { flex: 1; } }"),
    ).toThrow(NativeStylesCompatibilityError)

    try {
      assertNativeCssCompatibility("@media (min-width: 600px) { .a { flex: 1; } }")
    } catch (error) {
      expect(error).toBeInstanceOf(NativeStylesCompatibilityError)
      expect((error as NativeStylesCompatibilityError).code).toBe(
        NativeStylesDiagnosticCode.UnsupportedMedia,
      )
    }
  })

  it("codes unsupported selector compatibility errors", () => {
    try {
      assertNativeCssCompatibility(".button:hover { opacity: 0.8; }")
    } catch (error) {
      expect(error).toBeInstanceOf(NativeStylesCompatibilityError)
      expect((error as NativeStylesCompatibilityError).code).toBe(
        NativeStylesDiagnosticCode.UnsupportedSelector,
      )
    }
  })

  it("codes strict dropped declaration errors", () => {
    try {
      cssDeclarationsToRN([["transition", "all 0.3s"]], { strictDiagnostics: true })
    } catch (error) {
      expect(error).toBeInstanceOf(NativeStylesDeclarationError)
      expect((error as NativeStylesDeclarationError).code).toBe(
        NativeStylesDiagnosticCode.DroppedDeclaration,
      )
    }
  })

  it("includes a stable code in recoverable CSS variable warnings", () => {
    const warnings = captureWarnings(() => {
      cssDeclarationsToRN([["color", "var(--brand-color)"]])
    })

    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain(NativeStylesDiagnosticCode.CssVariableDropped)
  })
})
