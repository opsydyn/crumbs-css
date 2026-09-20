import { describe, expect, it } from "bun:test"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import {
  captureStructuredIntoNativeIr,
  decodeStructuredBlock,
  type BackgroundSizeValue,
  lowerStructuredBlock,
  normalizeStructuredBlocks,
  StructuredIrAdmissionError,
} from "../src/compiler/structured-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/background-size.css.ts", className: "surface" }

describe("production native IR experimental_backgroundSize", () => {
  it("captures the installed keyword and length record union for view and text primitives", () => {
    const value: readonly BackgroundSizeValue[] = [
      { x: "25%", y: 20 },
      "cover",
      { x: "auto", y: "0px" },
      "contain",
    ]
    for (const primitive of ["view", "text"] as const) {
      const captured = captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundSize: value }, [primitive]),
        context,
      )
      expect(captured.cssRule).toEqual({})
      expect(captured.block?.primitiveDomain).toEqual([primitive])
      expect(lowerStructuredBlock(captured.block!)).toEqual({ experimental_backgroundSize: value })
    }
  })

  it("keeps compatibility strings and freezes admitted size values", () => {
    const stringRule = markNativeCaptureRule({ experimental_backgroundSize: "25% auto, cover" }, ["view"])
    expect(captureStructuredIntoNativeIr(stringRule, context)).toEqual({ cssRule: stringRule })

    const input = [{ x: 0, y: "10%" }, "contain"] as const
    const captured = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundSize: input }, ["view"]),
      context,
    )
    const admitted = captured.block?.declarations[0]?.value as readonly unknown[]
    expect(admitted).not.toBe(input)
    expect(Object.isFrozen(admitted)).toBe(true)
    expect(Object.isFrozen(admitted[0])).toBe(true)
    expect(lowerStructuredBlock(captured.block!)).toEqual({ experimental_backgroundSize: input })
    expect(input).toEqual([{ x: 0, y: "10%" }, "contain"])
  })

  it("keeps size view/text-only and rejects malformed, dynamic and decorated values", () => {
    expect(() => captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundSize: [{ x: 1, y: 2 }] }, ["image"]),
      context,
    )).toThrow("CRUMBS_STRUCTURED_IR_PRIMITIVE_MISMATCH")

    const decoratedItem = { x: 1, y: 2 }
    Object.defineProperty(decoratedItem, "extra", { value: true, enumerable: false })
    const accessorItem = { x: 1, y: 2 }
    Object.defineProperty(accessorItem, "x", { enumerable: true, get: () => 1 })
    const symbolItem = { x: 1, y: 2, [Symbol("extra")]: true }
    const decoratedSizes = [{ x: 1, y: 2 }]
    Object.defineProperty(decoratedSizes, "extra", { value: true, enumerable: false })
    const sparseSizes = new Array(1)
    class SizeList extends Array<unknown> {}
    const invalid: unknown[] = [
      [{ x: 1 }],
      [{ y: 2 }],
      [{ x: 1, y: 2, extra: true }],
      [{ x: -1, y: 2 }],
      [{ x: "-1px", y: 2 }],
      [{ x: "-1%", y: 2 }],
      [{ x: "1em", y: 2 }],
      [{ x: "0", y: 2 }],
      [{ x: "cover", y: 2 }],
      ["auto"],
      ["cover 10px"],
      [decoratedItem],
      [accessorItem],
      [symbolItem],
      sparseSizes,
      decoratedSizes,
      new SizeList({ x: 1, y: 2 }),
      [{ x: 1, y: 2 }, { x: "2rem", y: "auto" }],
    ]
    for (const value of invalid) {
      expect(() => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundSize: value }, ["view"]),
        context,
      )).toThrow(StructuredIrAdmissionError)
    }

    const accessorRule = {}
    Object.defineProperty(accessorRule, "experimental_backgroundSize", {
      enumerable: true,
      get: () => [{ x: 1, y: 2 }],
    })
    expect(() => captureStructuredIntoNativeIr(markNativeCaptureRule(accessorRule, ["view"]), context))
      .toThrow(StructuredIrAdmissionError)
  })

  it("accepts cross-realm plain values and rejects forged structured nodes", () => {
    const crossRealm = runInNewContext(`[
      { x: "25%", y: 20 },
      "cover",
      { x: "auto", y: "0px" },
    ]`) as unknown
    const captured = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundSize: crossRealm }, ["text"]),
      context,
    )
    expect(lowerStructuredBlock(captured.block!)).toEqual({
      experimental_backgroundSize: [
        { x: "25%", y: 20 },
        "cover",
        { x: "auto", y: "0px" },
      ],
    })

    const block = captured.block!
    expect(() => decodeStructuredBlock({
      ...block,
      declarations: [{ ...block.declarations[0], value: [{ x: 1, y: 2, extra: true }] }],
    }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    expect(() => decodeStructuredBlock({ ...block, primitiveDomain: ["image"] }, context.sourceId))
      .toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
  })

  it("replaces the complete size list as one property during composition", () => {
    const first = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundSize: [{ x: 10, y: "20%" }] }, ["view"]),
      { ...context, className: "first" },
    ).block!
    const last = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundSize: [] }, ["view"]),
      { ...context, className: "last" },
    ).block!
    expect(lowerStructuredBlock(normalizeStructuredBlocks([first, last]))).toEqual({ experimental_backgroundSize: [] })
  })

  it("matches property-based whole-value capture and last-winner laws", () => {
    const nonNegative = fc.integer({ min: 0, max: 100 })
    const length = fc.oneof(
      nonNegative,
      nonNegative.map(value => `${value}px` as const),
      nonNegative.map(value => `${value}%` as const),
      fc.constant("auto" as const),
    )
    const item = fc.oneof(
      fc.constantFrom("cover", "contain"),
      fc.record({ x: length, y: length }),
    ) as fc.Arbitrary<BackgroundSizeValue>
    fc.assert(fc.property(fc.array(item, { maxLength: 20 }), value => {
      const captured = captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundSize: value }, ["view"]),
        context,
      )
      expect(lowerStructuredBlock(captured.block!)).toEqual({ experimental_backgroundSize: value })
    }), { seed: 20261041, numRuns: 100 })

    fc.assert(fc.property(
      fc.array(fc.array(item, { maxLength: 12 }), { minLength: 1, maxLength: 20 }),
      values => {
        const blocks = values.map((experimental_backgroundSize, index) => captureStructuredIntoNativeIr(
          markNativeCaptureRule({ experimental_backgroundSize }, ["view"]),
          { ...context, className: `size_${index}` },
        ).block!)
        expect(lowerStructuredBlock(normalizeStructuredBlocks(blocks))).toEqual({
          experimental_backgroundSize: values.at(-1)!,
        })
      },
    ), { seed: 20261042, numRuns: 100 })
  })
})
