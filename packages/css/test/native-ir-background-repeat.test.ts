import { describe, expect, it } from "bun:test"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import {
  captureStructuredIntoNativeIr,
  decodeStructuredBlock,
  type BackgroundRepeatValue,
  lowerStructuredBlock,
  normalizeStructuredBlocks,
  StructuredIrAdmissionError,
} from "../src/compiler/structured-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/background-repeat.css.ts", className: "surface" }
const keywords = ["repeat", "space", "round", "no-repeat"] as const

describe("production native IR experimental_backgroundRepeat", () => {
  it("captures the installed closed repeat record for view and text primitives", () => {
    const value: readonly BackgroundRepeatValue[] = [
      { x: "repeat", y: "no-repeat" },
      { x: "space", y: "round" },
    ]
    for (const primitive of ["view", "text"] as const) {
      const captured = captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundRepeat: value }, [primitive]),
        context,
      )
      expect(captured.cssRule).toEqual({})
      expect(captured.block?.primitiveDomain).toEqual([primitive])
      expect(lowerStructuredBlock(captured.block!)).toEqual({ experimental_backgroundRepeat: value })
    }
  })

  it("keeps compatibility strings and freezes admitted repeat values", () => {
    const stringRule = markNativeCaptureRule({ experimental_backgroundRepeat: "repeat-x" }, ["view"])
    expect(captureStructuredIntoNativeIr(stringRule, context)).toEqual({ cssRule: stringRule })

    const input = [{ x: "repeat", y: "space" }] as const
    const captured = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundRepeat: input }, ["view"]),
      context,
    )
    const admitted = captured.block?.declarations[0]?.value as readonly unknown[]
    expect(admitted).not.toBe(input)
    expect(Object.isFrozen(admitted)).toBe(true)
    expect(Object.isFrozen(admitted[0])).toBe(true)
    expect(lowerStructuredBlock(captured.block!)).toEqual({ experimental_backgroundRepeat: input })
    expect(input).toEqual([{ x: "repeat", y: "space" }])
  })

  it("keeps repeat view/text-only and rejects malformed, dynamic and decorated values", () => {
    expect(() => captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundRepeat: [{ x: "repeat", y: "space" }] }, ["image"]),
      context,
    )).toThrow("CRUMBS_STRUCTURED_IR_PRIMITIVE_MISMATCH")

    const decoratedItem = { x: "repeat", y: "space" }
    Object.defineProperty(decoratedItem, "extra", { value: true, enumerable: false })
    const accessorItem = { x: "repeat", y: "space" }
    Object.defineProperty(accessorItem, "x", { enumerable: true, get: () => "repeat" })
    const symbolItem = { x: "repeat", y: "space", [Symbol("extra")]: true }
    const decoratedRepeats = [{ x: "repeat", y: "space" }]
    Object.defineProperty(decoratedRepeats, "extra", { value: true, enumerable: false })
    const sparseRepeats = new Array(1)
    class RepeatList extends Array<unknown> {}
    const invalid: unknown[] = [
      [{ x: "repeat" }],
      [{ y: "space" }],
      [{ x: "repeat", y: "space", extra: true }],
      [{ x: "repeat", y: "repeat-x" }],
      [{ x: 1, y: "repeat" }],
      [{ x: "repeat", y: null }],
      [decoratedItem],
      [accessorItem],
      [symbolItem],
      sparseRepeats,
      decoratedRepeats,
      new RepeatList({ x: "repeat", y: "space" }),
      [{ x: "repeat", y: "space" }, "repeat"],
    ]
    for (const value of invalid) {
      expect(() => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundRepeat: value }, ["view"]),
        context,
      )).toThrow(StructuredIrAdmissionError)
    }

    const accessorRule = {}
    Object.defineProperty(accessorRule, "experimental_backgroundRepeat", {
      enumerable: true,
      get: () => [{ x: "repeat", y: "space" }],
    })
    expect(() => captureStructuredIntoNativeIr(markNativeCaptureRule(accessorRule, ["view"]), context))
      .toThrow(StructuredIrAdmissionError)
  })

  it("accepts cross-realm plain values and rejects forged structured nodes", () => {
    const crossRealm = runInNewContext(`[
      { x: "repeat", y: "no-repeat" },
      { x: "round", y: "space" },
    ]`) as unknown
    const captured = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundRepeat: crossRealm }, ["text"]),
      context,
    )
    expect(lowerStructuredBlock(captured.block!)).toEqual({
      experimental_backgroundRepeat: [
        { x: "repeat", y: "no-repeat" },
        { x: "round", y: "space" },
      ],
    })

    const block = captured.block!
    expect(() => decodeStructuredBlock({
      ...block,
      declarations: [{ ...block.declarations[0], value: [{ x: "repeat", y: "space", extra: true }] }],
    }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    expect(() => decodeStructuredBlock({ ...block, primitiveDomain: ["image"] }, context.sourceId))
      .toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
  })

  it("replaces the complete repeat list as one property during composition", () => {
    const first = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundRepeat: [{ x: "repeat", y: "space" }] }, ["view"]),
      { ...context, className: "first" },
    ).block!
    const last = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundRepeat: [] }, ["view"]),
      { ...context, className: "last" },
    ).block!
    expect(lowerStructuredBlock(normalizeStructuredBlocks([first, last]))).toEqual({ experimental_backgroundRepeat: [] })
  })

  it("matches property-based whole-value capture and last-winner laws", () => {
    const keyword = fc.constantFrom(...keywords)
    const item = fc.record({ x: keyword, y: keyword }) as fc.Arbitrary<BackgroundRepeatValue>
    fc.assert(fc.property(fc.array(item, { maxLength: 20 }), value => {
      const captured = captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundRepeat: value }, ["view"]),
        context,
      )
      expect(lowerStructuredBlock(captured.block!)).toEqual({ experimental_backgroundRepeat: value })
    }), { seed: 20261039, numRuns: 100 })

    fc.assert(fc.property(
      fc.array(fc.array(item, { maxLength: 12 }), { minLength: 1, maxLength: 20 }),
      values => {
        const blocks = values.map((experimental_backgroundRepeat, index) => captureStructuredIntoNativeIr(
          markNativeCaptureRule({ experimental_backgroundRepeat }, ["view"]),
          { ...context, className: `repeat_${index}` },
        ).block!)
        expect(lowerStructuredBlock(normalizeStructuredBlocks(blocks))).toEqual({
          experimental_backgroundRepeat: values.at(-1)!,
        })
      },
    ), { seed: 20261040, numRuns: 100 })
  })
})
