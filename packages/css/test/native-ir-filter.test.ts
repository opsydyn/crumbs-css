import { describe, expect, it } from "bun:test"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import {
  captureStructuredIntoNativeIr,
  decodeStructuredBlock,
  type DropShadowItem,
  type FilterFunction,
  lowerStructuredBlock,
  normalizeStructuredBlocks,
  StructuredIrAdmissionError,
} from "../src/compiler/structured-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/filter.css.ts", className: "effects" }

describe("production native IR filters", () => {
  it("captures the complete static filter union for view and text primitives", () => {
    const value: readonly FilterFunction[] = [
      { brightness: 1.2 },
      { blur: "2px" },
      { contrast: "50%" },
      { grayscale: "0.25" },
      { hueRotate: "-45deg" },
      { invert: 0 },
      { opacity: "75%" },
      { saturate: "1.5" },
      { sepia: "0px" },
      { dropShadow: { offsetX: -2, offsetY: "3px", standardDeviation: "4px", color: "#123456" } },
    ]
    for (const primitive of ["view", "text"] as const) {
      const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ filter: value }, [primitive]), context)
      expect(captured.cssRule).toEqual({})
      expect(captured.block?.primitiveDomain).toEqual([primitive])
      expect(lowerStructuredBlock(captured.block!)).toEqual({ filter: value })
    }
  })

  it("keeps filter strings on the compatibility route and freezes admitted values", () => {
    const stringRule = markNativeCaptureRule({ filter: "blur(2px) brightness(50%)" }, ["view"])
    expect(captureStructuredIntoNativeIr(stringRule, context)).toEqual({ cssRule: stringRule })

    const input = [{ brightness: 0.8 }, { dropShadow: { offsetX: 1, offsetY: "2px", color: "black" } }] as const
    const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ filter: input }, ["view"]), context)
    const admitted = captured.block?.declarations[0]?.value as readonly unknown[]
    expect(admitted).not.toBe(input)
    expect(Object.isFrozen(admitted)).toBe(true)
    expect(Object.isFrozen(admitted[0])).toBe(true)
    expect(Object.isFrozen((admitted[1] as { dropShadow: object }).dropShadow)).toBe(true)
    expect(lowerStructuredBlock(captured.block!)).toEqual({ filter: input })
    expect(input).toEqual([{ brightness: 0.8 }, { dropShadow: { offsetX: 1, offsetY: "2px", color: "black" } }])
  })

  it("keeps filters view/text-only and rejects malformed, dynamic and decorated values", () => {
    expect(() => captureStructuredIntoNativeIr(
      markNativeCaptureRule({ filter: [{ brightness: 1 }] }, ["image"]),
      context,
    )).toThrow("CRUMBS_STRUCTURED_IR_PRIMITIVE_MISMATCH")

    const decoratedOperation = { brightness: 1 }
    Object.defineProperty(decoratedOperation, "extra", { value: true, enumerable: false })
    const accessorOperation = {}
    Object.defineProperty(accessorOperation, "blur", { enumerable: true, get: () => "2px" })
    const decoratedFilters = [{ brightness: 1 }]
    Object.defineProperty(decoratedFilters, "extra", { value: true, enumerable: false })
    const sparseFilters = new Array(1)
    class FilterList extends Array<unknown> {}
    const invalid: unknown[] = [
      [{ brightness: -1 }],
      [{ brightness: "2em" }],
      [{ blur: -1 }],
      [{ blur: "2%" }],
      [{ contrast: "-1%" }],
      [{ hueRotate: 2 }],
      [{ hueRotate: "1turn" }],
      [{ dropShadow: "0 1px 2px black" }],
      [{ dropShadow: { offsetX: 1, offsetY: "2" } }],
      [{ dropShadow: { offsetX: "2%", offsetY: 1 } }],
      [{ dropShadow: { offsetX: 1, offsetY: 2, standardDeviation: "1%" } }],
      [{ dropShadow: { offsetX: 1, offsetY: 2, standardDeviation: -1 } }],
      [{ dropShadow: { offsetX: 1, offsetY: 2, color: "" } }],
      [{ dropShadow: { offsetX: 1, offsetY: 2, color: "var(--crumbs-shadow)" } }],
      [{ brightness: 1, blur: 2 }],
      [{ unknown: 1 }],
      [decoratedOperation],
      [accessorOperation],
      sparseFilters,
      decoratedFilters,
      new FilterList({ brightness: 1 }),
    ]
    for (const value of invalid) {
      expect(() => captureStructuredIntoNativeIr(markNativeCaptureRule({ filter: value }, ["view"]), context))
        .toThrow(StructuredIrAdmissionError)
    }

    const accessorRule = {}
    Object.defineProperty(accessorRule, "filter", { enumerable: true, get: () => [{ brightness: 1 }] })
    expect(() => captureStructuredIntoNativeIr(markNativeCaptureRule(accessorRule, ["view"]), context))
      .toThrow(StructuredIrAdmissionError)
  })

  it("accepts cross-realm values and rejects forged structured nodes", () => {
    const crossRealm = runInNewContext(`[
      { brightness: "50%" },
      { dropShadow: { offsetX: -1, offsetY: "2px", standardDeviation: 3, color: "black" } },
    ]`) as unknown
    const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ filter: crossRealm }, ["view"]), context)
    expect(lowerStructuredBlock(captured.block!)).toEqual({
      filter: [
        { brightness: "50%" },
        { dropShadow: { offsetX: -1, offsetY: "2px", standardDeviation: 3, color: "black" } },
      ],
    })

    const block = captured.block!
    expect(() => decodeStructuredBlock({
      ...block,
      declarations: [{ ...block.declarations[0], value: [{ brightness: 1, blur: 2 }] }],
    }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    expect(() => decodeStructuredBlock({ ...block, primitiveDomain: ["image"] }, context.sourceId))
      .toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
  })

  it("replaces the complete filter list as one property during composition", () => {
    const first = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ filter: [{ brightness: 1 }] }, ["view"]),
      { ...context, className: "first" },
    ).block!
    const last = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ filter: [] }, ["view"]),
      { ...context, className: "last" },
    ).block!
    expect(lowerStructuredBlock(normalizeStructuredBlocks([first, last]))).toEqual({ filter: [] })
  })

  it("matches property-based whole-value capture and last-winner laws", () => {
    const amount = fc.oneof(
      fc.integer({ min: 0, max: 100 }),
      fc.integer({ min: 0, max: 100 }).map(value => `${value}%` as const),
      fc.integer({ min: 0, max: 100 }).map(value => `${value}px` as const),
    )
    const operation = fc.oneof(
      amount.map(brightness => ({ brightness })),
      amount.map(contrast => ({ contrast })),
      amount.map(opacity => ({ opacity })),
      fc.integer({ min: 0, max: 100 }).map(value => ({ blur: `${value}px` as const })),
      fc.integer({ min: -100, max: 100 }).map(value => ({ hueRotate: `${value}deg` as const })),
      fc.record({
        offsetX: fc.integer({ min: -20, max: 20 }),
        offsetY: fc.integer({ min: -20, max: 20 }),
      }).map((dropShadow): { dropShadow: DropShadowItem } => ({ dropShadow })),
    ) as fc.Arbitrary<FilterFunction>
    fc.assert(fc.property(fc.array(operation, { maxLength: 20 }), value => {
      const captured = captureStructuredIntoNativeIr(markNativeCaptureRule({ filter: value }, ["view"]), context)
      expect(lowerStructuredBlock(captured.block!)).toEqual({ filter: value })
    }), { seed: 20261037, numRuns: 100 })

    fc.assert(fc.property(
      fc.array(fc.array(operation, { maxLength: 12 }), { minLength: 1, maxLength: 20 }),
      values => {
        const blocks = values.map((filter, index) => captureStructuredIntoNativeIr(
          markNativeCaptureRule({ filter }, ["view"]),
          { ...context, className: `filter_${index}` },
        ).block!)
        expect(lowerStructuredBlock(normalizeStructuredBlocks(blocks))).toEqual({ filter: values.at(-1)! })
      },
    ), { seed: 20261038, numRuns: 100 })
  })
})
