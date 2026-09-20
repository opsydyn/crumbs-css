import { describe, expect, it } from "bun:test"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import {
  captureStructuredIntoNativeIr,
  decodeStructuredBlock,
  type BackgroundImageValue,
  lowerStructuredBlock,
  normalizeStructuredBlocks,
  StructuredIrAdmissionError,
} from "../src/compiler/structured-ir"
import { markNativeCaptureRule } from "../src/compiler/native-capture"

const context = { packageOwner: "@fixture/app", sourceId: "styles/background-image.css.ts", className: "gradient" }
const position = { bottom: "10%", right: 0 } as const
const linear: BackgroundImageValue = {
  type: "linear-gradient",
  direction: "to bottom right",
  colorStops: [
    { color: "#101820", positions: [0, "20%"] },
    { color: null, positions: [50] },
    { color: "rgba(255, 255, 255, 0.8)", positions: ["100%"] },
  ],
}
const radial: BackgroundImageValue = {
  type: "radial-gradient",
  shape: "ellipse",
  size: { x: "40%", y: 30 },
  position,
  colorStops: [
    { color: "#101820" },
    { color: "transparent", positions: ["100%"] },
  ],
}

describe("production native IR experimental_backgroundImage", () => {
  it("captures canonical linear and radial gradients for view and text primitives", () => {
    for (const primitive of ["view", "text"] as const) {
      const value = [linear, radial] as const
      const captured = captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundImage: value }, [primitive]),
        context,
      )
      expect(captured.cssRule).toEqual({})
      expect(captured.block?.primitiveDomain).toEqual([primitive])
      expect(lowerStructuredBlock(captured.block!)).toEqual({ experimental_backgroundImage: value })
      const admitted = captured.block?.declarations[0]?.value as readonly unknown[]
      expect(Object.isFrozen(admitted)).toBe(true)
      expect(Object.isFrozen(admitted[0])).toBe(true)
      expect(Object.isFrozen((admitted[0] as { colorStops: unknown[] }).colorStops)).toBe(true)
    }
  })

  it("keeps compatibility strings and rejects implicit parser defaults", () => {
    const stringRule = markNativeCaptureRule(
      { experimental_backgroundImage: "linear-gradient(red, blue)" },
      ["view"],
    )
    expect(captureStructuredIntoNativeIr(stringRule, context)).toEqual({ cssRule: stringRule })

    const missingDirection = {
      type: "linear-gradient",
      colorStops: [{ color: "red" }, { color: "blue" }],
    }
    const missingRadialDefaults = {
      type: "radial-gradient",
      colorStops: [{ color: "red" }, { color: "blue" }],
    }
    for (const value of [[missingDirection], [missingRadialDefaults]]) {
      expect(() => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundImage: value }, ["view"]),
        context,
      )).toThrow(StructuredIrAdmissionError)
    }
  })

  it("rejects image primitives, opaque colours, invalid directions and malformed stops", () => {
    expect(() => captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundImage: [linear] }, ["image"]),
      context,
    )).toThrow("CRUMBS_STRUCTURED_IR_PRIMITIVE_MISMATCH")

    const invalid: unknown[] = [
      [{ ...linear, direction: "sideways" }],
      [{ ...linear, direction: "180px" }],
      [{ ...linear, colorStops: [{ color: "red" }] }],
      [{ ...linear, colorStops: [{ color: null, positions: [20] }, { color: "blue" }] }],
      [{ ...linear, colorStops: [{ color: "red" }, { color: null, positions: [20] }] }],
      [{ ...linear, colorStops: [{ color: "var(--crumbs-gradient)" }, { color: "blue" }] }],
      [{ ...linear, colorStops: [{ color: "red", positions: ["2px"] }, { color: "blue" }] }],
      [{ ...radial, size: "auto" }],
      [{ ...radial, size: { x: "-1%", y: 20 } }],
      [{ ...radial, position: { top: 1, left: 2, extra: 3 } }],
      [{ ...radial, colorStops: [{ color: Symbol("native") }, { color: "blue" }] }],
      ["linear-gradient(red, blue)"],
    ]
    for (const value of invalid) {
      expect(() => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundImage: value }, ["view"]),
        context,
      )).toThrow(StructuredIrAdmissionError)
    }
  })

  it("rejects decorated, accessor-backed, sparse and forged gradient nodes", () => {
    const decorated = { ...linear }
    Object.defineProperty(decorated, "extra", { enumerable: false, value: true })
    const accessorStops = [{ color: "red" }, { color: "blue" }]
    Object.defineProperty(accessorStops[0], "color", { enumerable: true, get: () => "red" })
    const sparse = new Array(1)
    class GradientList extends Array<unknown> {}
    const invalid: unknown[] = [
      [decorated],
      [{ ...linear, colorStops: accessorStops }],
      sparse,
      new GradientList(linear),
    ]
    for (const value of invalid) {
      expect(() => captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundImage: value }, ["view"]),
        context,
      )).toThrow(StructuredIrAdmissionError)
    }

    const block = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundImage: [linear] }, ["view"]),
      context,
    ).block!
    expect(() => decodeStructuredBlock({
      ...block,
      declarations: [{ ...block.declarations[0], value: [{ ...linear, extra: true }] }],
    }, context.sourceId)).toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
    expect(() => decodeStructuredBlock({ ...block, primitiveDomain: ["image"] }, context.sourceId))
      .toThrow("CRUMBS_STRUCTURED_IR_INVALID_NODE")
  })

  it("accepts cross-realm canonical gradients and replaces the complete list during composition", () => {
    const crossRealm = runInNewContext(`[
      {
        type: "linear-gradient",
        direction: "180deg",
        colorStops: [{ color: "red" }, { color: "blue", positions: ["100%"] }]
      }
    ]`) as unknown
    const captured = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundImage: crossRealm }, ["text"]),
      context,
    )
    expect(lowerStructuredBlock(captured.block!)).toEqual({
      experimental_backgroundImage: [{
        type: "linear-gradient",
        direction: "180deg",
        colorStops: [{ color: "red" }, { color: "blue", positions: ["100%"] }],
      }],
    })

    const first = captured.block!
    const last = captureStructuredIntoNativeIr(
      markNativeCaptureRule({ experimental_backgroundImage: [] }, ["text"]),
      { ...context, className: "empty" },
    ).block!
    expect(lowerStructuredBlock(normalizeStructuredBlocks([first, last]))).toEqual({ experimental_backgroundImage: [] })
  })

  it("matches property-based whole-value capture and last-winner laws", () => {
    const color = fc.constantFrom("red", "blue", "#123456", "rgba(1, 2, 3, 0.5)")
    const stop = fc.tuple(color, color).map(([first, second]) => [
      { color: first },
      { color: second, positions: ["100%"] },
    ] as const)
    const direction = fc.constantFrom("180deg", "0.5turn", "to top", "to bottom right")
    const gradient = fc.oneof(
      fc.record({ type: fc.constant("linear-gradient" as const), direction, colorStops: stop }),
      fc.record({
        type: fc.constant("radial-gradient" as const),
        shape: fc.constantFrom("circle" as const, "ellipse" as const),
        size: fc.constantFrom("closest-side" as const, { x: "40%", y: 20 }),
        position: fc.constantFrom({ top: "50%", left: "50%" }, { bottom: 0, right: "20%" }),
        colorStops: stop,
      }),
    ) as fc.Arbitrary<BackgroundImageValue>

    fc.assert(fc.property(fc.array(gradient, { maxLength: 5 }), value => {
      const captured = captureStructuredIntoNativeIr(
        markNativeCaptureRule({ experimental_backgroundImage: value }, ["view"]),
        context,
      )
      expect(lowerStructuredBlock(captured.block!)).toEqual({ experimental_backgroundImage: value })
    }), { seed: 20261051, numRuns: 100 })

    fc.assert(fc.property(
      fc.array(fc.array(gradient, { maxLength: 4 }), { minLength: 1, maxLength: 10 }),
      values => {
        const blocks = values.map((experimental_backgroundImage, index) => captureStructuredIntoNativeIr(
          markNativeCaptureRule({ experimental_backgroundImage }, ["view"]),
          { ...context, className: `image_${index}` },
        ).block!)
        expect(lowerStructuredBlock(normalizeStructuredBlocks(blocks))).toEqual({
          experimental_backgroundImage: values.at(-1)!,
        })
      },
    ), { seed: 20261052, numRuns: 100 })
  })
})
