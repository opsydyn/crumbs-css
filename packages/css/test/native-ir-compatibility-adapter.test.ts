import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  captureScalarIntoNativeIr,
  decodeScalarBlock,
  lowerScalarBlock,
} from "../src/compiler/native-ir"
import { captureStructuredIntoNativeIr, lowerStructuredBlock } from "../src/compiler/structured-ir"
import {
  captureCompatibilityIntoNativeIr,
  type CompatibilityCaptureContext,
} from "../src/compiler/compatibility-adapter"
import { getNativeCaptureMetadata, markNativeCaptureRule } from "../src/compiler/native-capture"

const context: CompatibilityCaptureContext = {
  packageOwner: "@fixture/app",
  sourceId: "styles/compatibility.css.ts",
  className: "legacy",
}

describe("vanilla-extract compatibility adapter IR", () => {
  it("records adapter provenance in scalar and structured blocks", () => {
    const marked = markNativeCaptureRule({ opacity: 0.5 }, ["view"], "vanilla-extract-adapter")
    expect(getNativeCaptureMetadata(marked)?.origin).toBe("vanilla-extract-adapter")

    const scalar = captureScalarIntoNativeIr(marked, context).block!
    expect(scalar.provenance.origin).toBe("vanilla-extract-adapter")
    expect(scalar.declarations[0]?.provenance.origin).toBe("vanilla-extract-adapter")
    expect(decodeScalarBlock(scalar, context.sourceId).provenance.origin).toBe("vanilla-extract-adapter")

    const structured = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ transform: [{ scale: 2 }] }, ["view"], "vanilla-extract-adapter"),
      context,
    ).block!
    expect(structured.provenance.origin).toBe("vanilla-extract-adapter")
    expect(structured.declarations[0]?.provenance.origin).toBe("vanilla-extract-adapter")
    expect(lowerStructuredBlock(structured)).toEqual({ transform: [{ scale: 2 }] })
  })

  it("captures lossless canonical values while retaining browser-only forms", () => {
    const captured = captureCompatibilityIntoNativeIr({
      opacity: 0.5,
      fontSize: "24px",
      lineHeight: "var(--crumbs-line-height)",
      padding: "1px 2px",
      transform: [{ scale: 2 }],
    }, context)

    expect(captured.cssRule).toEqual({ padding: "1px 2px" })
    expect(lowerScalarBlock(captured.scalarBlock!)).toEqual({
      opacity: 0.5,
      fontSize: 24,
      lineHeight: { $$type: "crumbs.css.theme-token", varName: "--crumbs-line-height" },
    })
    expect(captured.scalarBlock?.provenance.origin).toBe("vanilla-extract-adapter")
    expect(lowerStructuredBlock(captured.structuredBlock!)).toEqual({ transform: [{ scale: 2 }] })
    expect(captured.structuredBlock?.provenance.origin).toBe("vanilla-extract-adapter")
  })

  it("preserves generated finite scalar and ordered structured values", () => {
    fc.assert(fc.property(
      fc.double({ noNaN: true, noDefaultInfinity: true }),
      fc.double({ noNaN: true, noDefaultInfinity: true }),
      fc.double({ noNaN: true, noDefaultInfinity: true }),
      (opacity, fontSize, scale) => {
        const captured = captureCompatibilityIntoNativeIr({
          opacity,
          fontSize,
          transform: [{ scale }],
        }, context)
        expect(lowerScalarBlock(captured.scalarBlock!)).toEqual({ opacity, fontSize })
        expect(lowerStructuredBlock(captured.structuredBlock!)).toEqual({ transform: [{ scale }] })
      },
    ), { seed: 20260920, numRuns: 100 })
  })

  it("fails malformed static structured syntax with source and property context", () => {
    expect(() => captureCompatibilityIntoNativeIr({
      transform: [{ scale: { value: 2 } }],
    }, context)).toThrow(/CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE.*styles\/compatibility\.css\.ts.*legacy\.transform/)
  })
})
