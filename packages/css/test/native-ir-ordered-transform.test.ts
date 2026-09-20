import { describe, expect, it } from "bun:test"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import {
  captureStructuredIntoNativeIr,
  decodeStructuredBlock,
  lowerStructuredBlock,
  normalizeStructuredBlocks,
  StructuredIrAdmissionError,
  type TransformOperation,
} from "../src/compiler/structured-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/ordered-transform.css.ts", className: "ordered" }
const primitives = ["view", "text", "image"] as const
const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 3, 0, 1]

describe("production native IR ordered transforms", () => {
  it("captures every static operation and preserves authored order across primitives", () => {
    const value: readonly TransformOperation[] = [
      { perspective: 800 },
      { rotate: "-45deg" },
      { rotateX: ".5rad" },
      { rotateY: "1rad" },
      { rotateZ: "90deg" },
      { scale: 2 },
      { scaleX: 0.5 },
      { scaleY: 3 },
      { translateX: "25%" },
      { translateY: -4 },
      { skewX: "10deg" },
      { skewY: "-.5rad" },
      { matrix },
    ]
    for (const primitive of primitives) {
      const captured = captureStructuredIntoNativeIr(
        markNativeCaptureRule({ transform: value }, [primitive]),
        { ...context, className: `ordered_${primitive}` },
      )
      expect(captured.cssRule).toEqual({})
      expect(captured.block?.primitiveDomain).toEqual([primitive])
      expect(lowerStructuredBlock(captured.block!)).toEqual({ transform: value })
    }
  })

  it("keeps string transforms on the compatibility route and freezes admitted nested values", () => {
    const stringRule = markNativeCaptureRule({ transform: "scale(2)" }, primitives)
    expect(captureStructuredIntoNativeIr(stringRule, context)).toEqual({ cssRule: stringRule })

    const input = [{ matrix: [...matrix] }, { translateX: "10%" }] as const
    const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ transform: input }, primitives), context)
    const admitted = captured.block?.declarations[0]?.value as readonly unknown[]
    expect(admitted).not.toBe(input)
    expect(Object.isFrozen(admitted)).toBe(true)
    expect(Object.isFrozen(admitted[0])).toBe(true)
    expect(Object.isFrozen((admitted[0] as { matrix: readonly number[] }).matrix)).toBe(true)
    expect(lowerStructuredBlock(captured.block!)).toEqual({ transform: input })
    expect(input).toEqual([{ matrix }, { translateX: "10%" }])
  })

  it("rejects multi-key, dynamic, malformed, sparse and decorated operations", () => {
    const decoratedOperation = { scale: 2 }
    Object.defineProperty(decoratedOperation, "extra", { value: true, enumerable: false })
    const accessorOperation = {}
    Object.defineProperty(accessorOperation, "scale", { enumerable: true, get: () => 2 })
    const sparseMatrix = new Array(16)
    sparseMatrix[15] = 1
    const decoratedTransforms = [{ scale: 2 }]
    Object.defineProperty(decoratedTransforms, "extra", { value: true, enumerable: false })
    class TransformList extends Array<unknown> {}
    const invalid: unknown[] = [
      [{ scale: 2, rotate: "1deg" }],
      [{ unknown: 2 }],
      [{ scale: Infinity }],
      [{ rotate: "20px" }],
      [{ rotate: "9".repeat(400) + "deg" }],
      [{ translateX: "auto" }],
      [{ translateY: "9".repeat(400) + "%" }],
      [{ matrix: [1, 2] }],
      [{ matrix: sparseMatrix }],
      [decoratedOperation],
      [accessorOperation],
      new Array(1),
      decoratedTransforms,
      new TransformList({ scale: 2 }),
    ]
    for (const value of invalid) {
      expect(() => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ transform: value }, primitives),
        context,
      )).toThrow(StructuredIrAdmissionError)
    }

    const accessorRule = {}
    Object.defineProperty(accessorRule, "transform", { enumerable: true, get: () => [{ scale: 2 }] })
    expect(() => captureStructuredIntoNativeIr(markNativeCaptureRule(accessorRule, primitives), context))
      .toThrow(StructuredIrAdmissionError)
  })

  it("accepts cross-realm plain arrays and rejects forged structured nodes", () => {
    const crossRealm = runInNewContext(`[
      { translateX: "25%" },
      { matrix: [${matrix.join(",")}] },
    ]`) as unknown
    const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ transform: crossRealm }, primitives), context)
    expect(lowerStructuredBlock(captured.block!)).toEqual({ transform: [{ translateX: "25%" }, { matrix }] })

    const block = captured.block!
    expect(() => decodeStructuredBlock({
      ...block,
      declarations: [{
        ...block.declarations[0],
        value: [{ scale: 2, rotate: "1deg" }],
      }],
    }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    expect(() => decodeStructuredBlock({
      ...block,
      declarations: [{
        ...block.declarations[0],
        property: "transformMatrix",
        provenance: { ...block.declarations[0].provenance, property: "transformMatrix" },
      }],
    }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    expect(() => decodeStructuredBlock({ ...block, primitiveDomain: ["view", "view"] }, context.sourceId))
      .toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
  })

  it("replaces the complete ordered value as one property during composition", () => {
    const first = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ transform: [{ scale: 2 }, { translateX: 4 }] }, primitives),
      { ...context, className: "first" },
    ).block!
    const last = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ transform: [{ translateY: "10%" }, { rotate: "45deg" }] }, primitives),
      { ...context, className: "last" },
    ).block!
    expect(lowerStructuredBlock(normalizeStructuredBlocks([first, last]))).toEqual({
      transform: [{ translateY: "10%" }, { rotate: "45deg" }],
    })
  })

  it("matches independent property-based authored-order and last-winner evaluation", () => {
    const integers = fc.integer({ min: -100, max: 100 })
    const angles = fc.oneof(
      integers.map(value => `${value}deg` as const),
      integers.map(value => `${value}.5rad` as const),
    )
    const translations = fc.oneof(
      integers,
      integers.map(value => `${value}%` as const),
    )
    const matrices = fc.array(integers, { minLength: 16, maxLength: 16 })
    const operation = fc.oneof(
      integers.map(perspective => ({ perspective }) as TransformOperation),
      angles.map(rotate => ({ rotate }) as TransformOperation),
      angles.map(rotateX => ({ rotateX }) as TransformOperation),
      angles.map(rotateY => ({ rotateY }) as TransformOperation),
      angles.map(rotateZ => ({ rotateZ }) as TransformOperation),
      integers.map(scale => ({ scale }) as TransformOperation),
      integers.map(scaleX => ({ scaleX }) as TransformOperation),
      integers.map(scaleY => ({ scaleY }) as TransformOperation),
      translations.map(translateX => ({ translateX }) as TransformOperation),
      translations.map(translateY => ({ translateY }) as TransformOperation),
      angles.map(skewX => ({ skewX }) as TransformOperation),
      angles.map(skewY => ({ skewY }) as TransformOperation),
      matrices.map(matrixValue => ({ matrix: matrixValue }) as TransformOperation),
    )

    fc.assert(fc.property(fc.array(operation, { maxLength: 20 }), value => {
      const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ transform: value }, primitives), context)
      expect(lowerStructuredBlock(captured.block!)).toEqual({ transform: value })
    }), { seed: 20261033, numRuns: 100 })

    fc.assert(fc.property(
      fc.array(fc.array(operation, { maxLength: 12 }), { minLength: 1, maxLength: 20 }),
      values => {
        const blocks = values.map((transform, index) => captureStructuredIntoNativeIr(
          markNativeCaptureRule({ transform }, primitives),
          { ...context, className: `ordered_${index}` },
        ).block!)
        expect(lowerStructuredBlock(normalizeStructuredBlocks(blocks))).toEqual({ transform: values.at(-1)! })
      },
    ), { seed: 20261034, numRuns: 100 })
  })
})
