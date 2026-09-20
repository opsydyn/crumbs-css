import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  captureStructuredIntoNativeIr,
  decodeStructuredBlock,
  lowerStructuredBlock,
  normalizeStructuredBlocks,
  StructuredIrAdmissionError,
} from "../src/compiler/structured-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/structured-arrays.css.ts", className: "structured" }
const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 3, 0, 1]

describe("production native IR structured arrays", () => {
  it("captures and lowers a fixed transform matrix across all style primitives", () => {
    const captured = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ transformMatrix: matrix }, ["view", "text", "image"]),
      context,
    )
    expect(captured.cssRule).toEqual({})
    expect(captured.block?.primitiveDomain).toEqual(["view", "text", "image"])
    expect(lowerStructuredBlock(captured.block!)).toEqual({ transformMatrix: matrix })
  })

  it("captures and lowers two and three entry transform origins", () => {
    const two = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ transformOrigin: ["25%", 10] }, ["view"]),
      context,
    )
    const three = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ transformOrigin: [10, "50%", -2] }, ["text", "image"]),
      context,
    )
    expect(lowerStructuredBlock(two.block!)).toEqual({ transformOrigin: ["25%", 10] })
    expect(three.block?.primitiveDomain).toEqual(["text", "image"])
    expect(lowerStructuredBlock(three.block!)).toEqual({ transformOrigin: [10, "50%", -2] })
  })

  it("captures and lowers text-only font variants", () => {
    const captured = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ fontVariant: ["small-caps", "tabular-nums"] }, ["text"]),
      context,
    )
    expect(captured.cssRule).toEqual({})
    expect(captured.block?.primitiveDomain).toEqual(["text"])
    expect(lowerStructuredBlock(captured.block!)).toEqual({ fontVariant: ["small-caps", "tabular-nums"] })
  })

  it("rejects malformed, tokenised, sparse and decorated structured arrays", () => {
    const decoratedOrigin = [1, 2]
    Object.defineProperty(decoratedOrigin, "extra", { value: true, enumerable: false })
    const sparseMatrix = new Array(16)
    sparseMatrix[15] = 1
    const accessorVariants = ["small-caps"]
    Object.defineProperty(accessorVariants, "0", { get: () => "small-caps", enumerable: true })
    const invalid: Array<[string, unknown]> = [
      ["transformOrigin", []], ["transformOrigin", [1]], ["transformOrigin", [1, 2, 3, 4]],
      ["transformOrigin", ["50px", 0]], ["transformOrigin", ["var(--crumbs-origin)", 0]], ["transformOrigin", decoratedOrigin],
      ["transformMatrix", [1, 2]], ["transformMatrix", sparseMatrix], ["transformMatrix", [1, ...new Array(15).fill(0), Infinity]],
      ["fontVariant", ["unsupported"]], ["fontVariant", ["small-caps", "var(--crumbs-variant)"]], ["fontVariant", accessorVariants],
    ]
    for (const [property, value] of invalid) {
      expect(() => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ [property]: value }, ["view", "text", "image"]),
        context,
      )).toThrow(StructuredIrAdmissionError)
    }
  })

  it("enforces the text-only font-variant domain and composes the batch in text styles", () => {
    for (const primitive of ["view", "image"] as const) {
      expect(() => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ fontVariant: ["small-caps"] }, [primitive]),
        context,
      )).toThrow("CRUMBS_STRUCTURED_IR_PRIMITIVE_MISMATCH")
    }
    const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({
      transformOrigin: [10, "50%", 0],
      transformMatrix: matrix,
      fontVariant: ["small-caps"],
    }, ["text"]), context)
    expect(captured.block?.primitiveDomain).toEqual(["text"])
    expect(lowerStructuredBlock(captured.block!)).toEqual({
      transformOrigin: [10, "50%", 0],
      transformMatrix: matrix,
      fontVariant: ["small-caps"],
    })
  })

  it("rejects forged array values, cross-property provenance and primitive domains", () => {
    const matrixBlock = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ transformMatrix: matrix }, ["view", "text", "image"]),
      context,
    ).block!
    expect(() => decodeStructuredBlock({
      ...matrixBlock,
      declarations: [{ ...matrixBlock.declarations[0], property: "fontVariant", provenance: { ...matrixBlock.declarations[0].provenance, property: "fontVariant" } }],
    }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    expect(() => decodeStructuredBlock({
      ...matrixBlock,
      declarations: [{ ...matrixBlock.declarations[0], value: [1, 2] }],
    }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    const variants = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ fontVariant: ["small-caps"] }, ["text"]),
      context,
    ).block!
    expect(() => decodeStructuredBlock({ ...variants, primitiveDomain: ["view"] }, context.sourceId))
      .toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
  })

  it("retains each structured array family as an independent last whole value", () => {
    const origins = fc.oneof(
      fc.tuple(fc.integer({ min: -100, max: 100 }), fc.integer({ min: -100, max: 100 })),
      fc.tuple(fc.integer({ min: -100, max: 100 }), fc.integer({ min: -100, max: 100 }), fc.integer({ min: -100, max: 100 })),
    )
    fc.assert(fc.property(fc.array(origins, { minLength: 1, maxLength: 20 }), values => {
      const blocks = values.map((transformOrigin, index) => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ transformOrigin }, ["view", "text", "image"]),
        { ...context, className: `origin_${index}` },
      ).block!)
      expect(lowerStructuredBlock(normalizeStructuredBlocks(blocks))).toEqual({ transformOrigin: values.at(-1)! })
    }), { seed: 20261030, numRuns: 100 })

    fc.assert(fc.property(fc.array(fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 16, maxLength: 16 }), { minLength: 1, maxLength: 20 }), values => {
      const blocks = values.map((transformMatrix, index) => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ transformMatrix }, ["view", "text", "image"]),
        { ...context, className: `matrix_${index}` },
      ).block!)
      expect(lowerStructuredBlock(normalizeStructuredBlocks(blocks))).toEqual({ transformMatrix: values.at(-1)! })
    }), { seed: 20261031, numRuns: 100 })

    const variantArbitrary = fc.array(fc.constantFrom("small-caps", "tabular-nums", "oldstyle-nums"), { maxLength: 20 })
    fc.assert(fc.property(fc.array(variantArbitrary, { minLength: 1, maxLength: 20 }), values => {
      const blocks = values.map((fontVariant, index) => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ fontVariant }, ["text"]),
        { ...context, className: `variant_${index}` },
      ).block!)
      expect(lowerStructuredBlock(normalizeStructuredBlocks(blocks))).toEqual({ fontVariant: values.at(-1)! })
    }), { seed: 20261032, numRuns: 100 })
  })
})
