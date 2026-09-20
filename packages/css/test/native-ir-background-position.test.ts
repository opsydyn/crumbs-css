import { describe, expect, it } from "bun:test"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import {
  captureStructuredIntoNativeIr,
  decodeStructuredBlock,
  type BackgroundPositionValue,
  lowerStructuredBlock,
  normalizeStructuredBlocks,
  StructuredIrAdmissionError,
} from "../src/compiler/structured-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/background-position.css.ts", className: "surface" }

describe("production native IR experimental_backgroundPosition", () => {
  it("captures all installed positional record shapes for view and text primitives", () => {
    const value: readonly BackgroundPositionValue[] = [
      { top: "0%", left: 10 },
      { top: "50%", right: "-20px" },
      { bottom: -3, left: "25%" },
      { bottom: "0", right: 0 },
    ]
    for (const primitive of ["view", "text"] as const) {
      const captured = captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundPosition: value }, [primitive]),
        context,
      )
      expect(captured.cssRule).toEqual({})
      expect(captured.block?.primitiveDomain).toEqual([primitive])
      expect(lowerStructuredBlock(captured.block!)).toEqual({ experimental_backgroundPosition: value })
    }
  })

  it("keeps compatibility strings and freezes admitted position values", () => {
    const stringRule = markNativeCaptureRule({ experimental_backgroundPosition: "center bottom 20%" }, ["view"])
    expect(captureStructuredIntoNativeIr(stringRule, context)).toEqual({ cssRule: stringRule })

    const input = [{ top: "10px", left: "0" }, { bottom: -2, right: "25%" }] as const
    const captured = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundPosition: input }, ["view"]),
      context,
    )
    const admitted = captured.block?.declarations[0]?.value as readonly unknown[]
    expect(admitted).not.toBe(input)
    expect(Object.isFrozen(admitted)).toBe(true)
    expect(Object.isFrozen(admitted[0])).toBe(true)
    expect(lowerStructuredBlock(captured.block!)).toEqual({ experimental_backgroundPosition: input })
    expect(input).toEqual([{ top: "10px", left: "0" }, { bottom: -2, right: "25%" }])
  })

  it("keeps position view/text-only and rejects malformed, dynamic and decorated values", () => {
    expect(() => captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundPosition: [{ top: 1, left: 2 }] }, ["image"]),
      context,
    )).toThrow("CRUMBS_STRUCTURED_IR_PRIMITIVE_MISMATCH")

    const decoratedItem = { top: 1, left: 2 }
    Object.defineProperty(decoratedItem, "extra", { value: true, enumerable: false })
    const accessorItem = { top: 1, left: 2 }
    Object.defineProperty(accessorItem, "top", { enumerable: true, get: () => 1 })
    const symbolItem = { top: 1, left: 2, [Symbol("extra")]: true }
    const decoratedPositions = [{ top: 1, left: 2 }]
    Object.defineProperty(decoratedPositions, "extra", { value: true, enumerable: false })
    const sparsePositions = new Array(1)
    class PositionList extends Array<unknown> {}
    const invalid: unknown[] = [
      [{ top: 1 }],
      [{ left: 2 }],
      [{ top: 1, left: 2, extra: true }],
      [{ top: 1, bottom: 2 }],
      [{ top: "auto", left: 2 }],
      [{ top: "1em", left: 2 }],
      [{ top: "Infinity%", left: 2 }],
      [{ top: Infinity, left: 2 }],
      [{ top: 1, left: "1" }],
      ["center"],
      [decoratedItem],
      [accessorItem],
      [symbolItem],
      sparsePositions,
      decoratedPositions,
      new PositionList({ top: 1, left: 2 }),
      [{ top: 1, left: 2 }, { bottom: 3, right: "2rem" }],
    ]
    for (const value of invalid) {
      expect(() => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundPosition: value }, ["view"]),
        context,
      )).toThrow(StructuredIrAdmissionError)
    }

    const accessorRule = {}
    Object.defineProperty(accessorRule, "experimental_backgroundPosition", {
      enumerable: true,
      get: () => [{ top: 1, left: 2 }],
    })
    expect(() => captureStructuredIntoNativeIr(markNativeCaptureRule(accessorRule, ["view"]), context))
      .toThrow(StructuredIrAdmissionError)
  })

  it("accepts cross-realm plain values and rejects forged structured nodes", () => {
    const crossRealm = runInNewContext(`[
      { top: "0%", left: 10 },
      { top: "50%", right: "-20px" },
      { bottom: -3, left: "25%" },
      { bottom: "0", right: 0 },
    ]`) as unknown
    const captured = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundPosition: crossRealm }, ["text"]),
      context,
    )
    expect(lowerStructuredBlock(captured.block!)).toEqual({
      experimental_backgroundPosition: [
        { top: "0%", left: 10 },
        { top: "50%", right: "-20px" },
        { bottom: -3, left: "25%" },
        { bottom: "0", right: 0 },
      ],
    })

    const block = captured.block!
    expect(() => decodeStructuredBlock({
      ...block,
      declarations: [{ ...block.declarations[0], value: [{ top: 1, left: 2, extra: true }] }],
    }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    expect(() => decodeStructuredBlock({ ...block, primitiveDomain: ["image"] }, context.sourceId))
      .toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
  })

  it("replaces the complete position list as one property during composition", () => {
    const first = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundPosition: [{ top: 10, left: "20%" }] }, ["view"]),
      { ...context, className: "first" },
    ).block!
    const last = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundPosition: [] }, ["view"]),
      { ...context, className: "last" },
    ).block!
    expect(lowerStructuredBlock(normalizeStructuredBlocks([first, last]))).toEqual({ experimental_backgroundPosition: [] })
  })

  it("matches property-based whole-value capture and last-winner laws", () => {
    const length = fc.oneof(
      fc.integer({ min: -100, max: 100 }),
      fc.integer({ min: -100, max: 100 }).map(value => `${value}px` as const),
      fc.integer({ min: -100, max: 100 }).map(value => `${value}%` as const),
      fc.constant("0" as const),
    )
    const item = fc.oneof(
      fc.record({ top: length, left: length }),
      fc.record({ top: length, right: length }),
      fc.record({ bottom: length, left: length }),
      fc.record({ bottom: length, right: length }),
    ) as fc.Arbitrary<BackgroundPositionValue>
    fc.assert(fc.property(fc.array(item, { maxLength: 20 }), value => {
      const captured = captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundPosition: value }, ["view"]),
        context,
      )
      expect(lowerStructuredBlock(captured.block!)).toEqual({ experimental_backgroundPosition: value })
    }), { seed: 20261043, numRuns: 100 })

    fc.assert(fc.property(
      fc.array(fc.array(item, { maxLength: 12 }), { minLength: 1, maxLength: 20 }),
      values => {
        const blocks = values.map((experimental_backgroundPosition, index) => captureStructuredIntoNativeIr(
          markNativeCaptureRule({ experimental_backgroundPosition }, ["view"]),
          { ...context, className: `position_${index}` },
        ).block!)
        expect(lowerStructuredBlock(normalizeStructuredBlocks(blocks))).toEqual({
          experimental_backgroundPosition: values.at(-1)!,
        })
      },
    ), { seed: 20261044, numRuns: 100 })
  })
})
