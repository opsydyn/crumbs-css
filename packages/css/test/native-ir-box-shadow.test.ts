import { describe, expect, it } from "bun:test"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import {
  captureStructuredIntoNativeIr,
  decodeStructuredBlock,
  type BoxShadowItem,
  lowerStructuredBlock,
  normalizeStructuredBlocks,
  StructuredIrAdmissionError,
} from "../src/compiler/structured-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/box-shadow.css.ts", className: "shadow" }

describe("production native IR box shadows", () => {
  it("captures a complete static box-shadow item for the view primitive", () => {
    const value: readonly BoxShadowItem[] = [{
      offsetX: "25%",
      offsetY: -2,
      color: "rgba(0, 0, 0, 0.2)",
      blurRadius: 4,
      spreadDistance: -1,
      inset: true,
    }]
    const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ boxShadow: value }, ["view"]), context)

    expect(captured.cssRule).toEqual({})
    expect(captured.block?.primitiveDomain).toEqual(["view"])
    expect(lowerStructuredBlock(captured.block!)).toEqual({ boxShadow: value })
  })

  it("keeps string shadows on the compatibility route and freezes admitted items", () => {
    const stringRule = markNativeCaptureRule({ boxShadow: "0 1px 2px black" }, ["view"])
    expect(captureStructuredIntoNativeIr(stringRule, context)).toEqual({ cssRule: stringRule })

    const input = [{ offsetX: 1, offsetY: "10%", color: "black", blurRadius: 2 }] as const
    const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ boxShadow: input }, ["view"]), context)
    const admitted = captured.block?.declarations[0]?.value as readonly unknown[]
    expect(admitted).not.toBe(input)
    expect(Object.isFrozen(admitted)).toBe(true)
    expect(Object.isFrozen(admitted[0])).toBe(true)
    expect(lowerStructuredBlock(captured.block!)).toEqual({ boxShadow: input })
    expect(input).toEqual([{ offsetX: 1, offsetY: "10%", color: "black", blurRadius: 2 }])
  })

  it("keeps box shadows view-only and rejects malformed, dynamic and decorated values", () => {
    expect(() => captureStructuredIntoNativeIr(
      markNativeCaptureRule({ boxShadow: [{ offsetX: 1, offsetY: 2 }] }, ["text"]),
      context,
    )).toThrow("CRUMBS_STRUCTURED_IR_PRIMITIVE_MISMATCH")

    const decoratedItem = { offsetX: 1, offsetY: 2 }
    Object.defineProperty(decoratedItem, "extra", { value: true, enumerable: false })
    const accessorItem = { offsetX: 1, offsetY: 2 }
    Object.defineProperty(accessorItem, "color", { enumerable: true, get: () => "black" })
    const symbolItem = { offsetX: 1, offsetY: 2, [Symbol("extra")]: true }
    const decoratedShadows = [{ offsetX: 1, offsetY: 2 }]
    Object.defineProperty(decoratedShadows, "extra", { value: true, enumerable: false })
    const sparseShadows = new Array(1)
    class ShadowList extends Array<unknown> {}
    const invalid: unknown[] = [
      [{ offsetX: 1 }],
      [{ offsetY: 2 }],
      [{ offsetX: 1, offsetY: 2, extra: true }],
      [{ offsetX: NaN, offsetY: 2 }],
      [{ offsetX: "100px", offsetY: 2 }],
      [{ offsetX: "9".repeat(400) + "%", offsetY: 2 }],
      [{ offsetX: 1, offsetY: 2, color: "" }],
      [{ offsetX: 1, offsetY: 2, color: "var(--crumbs-shadow)" }],
      [{ offsetX: 1, offsetY: 2, blurRadius: -1 }],
      [{ offsetX: 1, offsetY: 2, blurRadius: Infinity }],
      [{ offsetX: 1, offsetY: 2, blurRadius: "2px" }],
      [{ offsetX: 1, offsetY: 2, spreadDistance: Infinity }],
      [{ offsetX: 1, offsetY: 2, inset: 1 }],
      [decoratedItem],
      [accessorItem],
      [symbolItem],
      sparseShadows,
      decoratedShadows,
      new ShadowList({ offsetX: 1, offsetY: 2 }),
    ]
    for (const value of invalid) {
      expect(() => captureStructuredIntoNativeIr(markNativeCaptureRule({ boxShadow: value }, ["view"]), context))
        .toThrow(StructuredIrAdmissionError)
    }

    const accessorRule = {}
    Object.defineProperty(accessorRule, "boxShadow", { enumerable: true, get: () => [{ offsetX: 1, offsetY: 2 }] })
    expect(() => captureStructuredIntoNativeIr(markNativeCaptureRule(accessorRule, ["view"]), context))
      .toThrow(StructuredIrAdmissionError)
  })

  it("accepts cross-realm plain values and rejects forged structured nodes", () => {
    const crossRealm = runInNewContext(`[
      { offsetX: "25%", offsetY: -2, color: "black", blurRadius: 3, spreadDistance: -1, inset: true },
    ]`) as unknown
    const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ boxShadow: crossRealm }, ["view"]), context)
    expect(lowerStructuredBlock(captured.block!)).toEqual({
      boxShadow: [{ offsetX: "25%", offsetY: -2, color: "black", blurRadius: 3, spreadDistance: -1, inset: true }],
    })

    const block = captured.block!
    expect(() => decodeStructuredBlock({
      ...block,
      declarations: [{ ...block.declarations[0], value: [{ offsetX: 1, offsetY: 2, extra: true }] }],
    }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    expect(() => decodeStructuredBlock({ ...block, primitiveDomain: ["text"] }, context.sourceId))
      .toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
  })

  it("replaces the complete shadow list as one property during composition", () => {
    const first = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ boxShadow: [{ offsetX: 1, offsetY: 2 }] }, ["view"]),
      { ...context, className: "first" },
    ).block!
    const last = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ boxShadow: [] }, ["view"]),
      { ...context, className: "last" },
    ).block!
    expect(lowerStructuredBlock(normalizeStructuredBlocks([first, last]))).toEqual({ boxShadow: [] })
  })

  it("matches property-based whole-value capture and last-winner laws", () => {
    const offset = fc.oneof(
      fc.integer({ min: -100, max: 100 }),
      fc.integer({ min: -100, max: 100 }).map(value => `${value}%` as const),
    )
    const item = fc.record({ offsetX: offset, offsetY: offset }) as fc.Arbitrary<BoxShadowItem>
    fc.assert(fc.property(fc.array(item, { maxLength: 20 }), value => {
      const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ boxShadow: value }, ["view"]), context)
      expect(lowerStructuredBlock(captured.block!)).toEqual({ boxShadow: value })
    }), { seed: 20261035, numRuns: 100 })

    fc.assert(fc.property(
      fc.array(fc.array(item, { maxLength: 12 }), { minLength: 1, maxLength: 20 }),
      values => {
        const blocks = values.map((boxShadow, index) => captureStructuredIntoNativeIr(
          markNativeCaptureRule({ boxShadow }, ["view"]),
          { ...context, className: `shadow_${index}` },
        ).block!)
        expect(lowerStructuredBlock(normalizeStructuredBlocks(blocks))).toEqual({ boxShadow: values.at(-1)! })
      },
    ), { seed: 20261036, numRuns: 100 })
  })
})
