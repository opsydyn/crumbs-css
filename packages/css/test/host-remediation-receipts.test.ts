import { expect, it } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { captureRuntimeOutcome, compareRuntimeOutcomes } from "../bench/host-remediation/receipts"
import { captureControlInventory, verifyControlInventory } from "../bench/host-remediation/control"

it("detects diagnostic punctuation and operation order differences", () => {
  const run = (message: string, steps: string[]) => captureRuntimeOutcome(trace => {
    trace.push(...steps)
    throw new TypeError(message)
  })
  const base = run("Invalid.", ["keys", "descriptor"])
  expect(compareRuntimeOutcomes(base, run("Invalid.", ["keys", "descriptor"]))).toEqual([])
  expect(compareRuntimeOutcomes(base, run("Invalid", ["keys", "descriptor"]))).toContain("error")
  expect(compareRuntimeOutcomes(base, run("Invalid.", ["descriptor", "keys"]))).toContain("trace")
})

it("distinguishes sparse arrays, freezing and within-run aliases", () => {
  const outcome = (value: unknown) => captureRuntimeOutcome(() => value)
  expect(compareRuntimeOutcomes(outcome([undefined]), outcome(new Array(1)))).toContain("graph")
  expect(compareRuntimeOutcomes(outcome({ x: 1 }), outcome(Object.freeze({ x: 1 })))).toContain("graph")
  const shared = { x: 1 }
  expect(compareRuntimeOutcomes(outcome([shared, shared]), outcome([{ x: 1 }, { x: 1 }]))).toContain("graph")
  const other = { x: 1 }
  expect(compareRuntimeOutcomes(outcome([shared, shared]), outcome([other, other]))).toEqual([])
})

it("preserves special primitives, cycles, descriptors and property order", () => {
  const snapshot = (value: unknown) => captureRuntimeOutcome(() => value)
  expect(compareRuntimeOutcomes(snapshot(-0), snapshot(0))).toContain("graph")
  expect(compareRuntimeOutcomes(snapshot(NaN), snapshot(null))).toContain("graph")
  expect(compareRuntimeOutcomes(snapshot(1n), snapshot("1"))).toContain("graph")
  expect(compareRuntimeOutcomes(snapshot({ a: 1, b: 2 }), snapshot({ b: 2, a: 1 }))).toContain("graph")
  const left: Record<string, unknown> = {}, right: Record<string, unknown> = {}
  left.self = left; right.self = right
  expect(compareRuntimeOutcomes(snapshot(left), snapshot(right))).toEqual([])
  expect(compareRuntimeOutcomes(snapshot(new Map([["a", 1]])), snapshot(new Map([["a", 2]])))).toContain("graph")
})

it("records accessor descriptors without invoking getters", () => {
  let calls = 0
  const value = Object.defineProperty({}, "x", { enumerable: true, get() { calls++; return 1 } })
  const result = captureRuntimeOutcome(() => value)
  expect(result.kind).toBe("value")
  expect(calls).toBe(0)
  expect(JSON.stringify(result.graph)).toContain("accessor")
})

it("does not confuse different prototype or symbol alias relationships", () => {
  const outcome = (value: unknown) => captureRuntimeOutcome(() => value)
  expect(compareRuntimeOutcomes(outcome({}), outcome(Object.create(null)))).toContain("graph")
  const symbol = Symbol("x")
  expect(compareRuntimeOutcomes(outcome([symbol, symbol]), outcome([Symbol("x"), Symbol("x")]))).toContain("graph")
})

it("rejects changed, missing and forged control inventory", () => {
  const root = mkdtempSync(join(tmpdir(), "crumbs-control-receipts-"))
  try {
    mkdirSync(join(root, "src")); mkdirSync(join(root, "dist"))
    writeFileSync(join(root, "package.json"), '{"name":"@fixture/control"}')
    writeFileSync(join(root, "src/control.ts"), "export const x = 1")
    writeFileSync(join(root, "dist/control.mjs"), "export const x = 1")
    const inventory = captureControlInventory(root, "control-revision")
    expect(verifyControlInventory(root, inventory, "control-revision")).toEqual([])
    expect(verifyControlInventory(root, { ...inventory, sourceRevision: "forged" }, "control-revision")).toContain("source revision")
    expect(verifyControlInventory(root, { ...inventory, artifacts: [] }, "control-revision")).toContain("artifact inventory")
    writeFileSync(join(root, "src/control.ts"), "export const x = 2")
    expect(verifyControlInventory(root, inventory, "control-revision")).toContain("source inventory")
    rmSync(join(root, "dist/control.mjs"))
    expect(verifyControlInventory(root, inventory, "control-revision")).toContain("artifact inventory")
  } finally { rmSync(root, { recursive: true, force: true }) }
})

it("never treats failed snapshots as parity", () => {
  const outcome = captureRuntimeOutcome(() => new Proxy({}, {
    ownKeys() { throw new Error("uninspectable") },
  }))
  expect(compareRuntimeOutcomes(outcome, outcome)).toContain("snapshot failure")
})

for (const collection of ["Map", "Set"] as const) {
  it(`snapshots ${collection} contents without invoking an overridden iterator getter`, () => {
    let calls = 0
    const value = (entry: number) => {
      const instance = collection === "Map" ? new Map([["key", entry]]) : new Set([entry])
      Object.defineProperty(instance, Symbol.iterator, { get() {
        calls++
        return function* () { yield collection === "Map" ? ["fabricated", 0] : 0 }
      } })
      return instance
    }
    const left = captureRuntimeOutcome(() => value(1)), right = captureRuntimeOutcome(() => value(2))
    expect(calls).toBe(0)
    expect(compareRuntimeOutcomes(left, right)).toContain("graph")
  })
}
