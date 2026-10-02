import { describe, expect, it } from "bun:test"
import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { compilerDependencies, runtimeDependencies } from "../build-policy"
import { readEmittedGraph, summarizeLoadSamples, buildContractCandidate, probeBoundary } from "../bench/effect-boundary-audit"

describe("Effect boundary build and audit contract", () => {
  it("bundles exact Effect subpaths for tooling and leaves runtime guarded by denial tests", () => {
    for (const name of ["effect", "effect/Schema", "effect/unstable/schema"]) expect(compilerDependencies.alwaysBundle.some(pattern => pattern.test(name))).toBe(true)
    expect(compilerDependencies.alwaysBundle.some(pattern => pattern.test("effectful"))).toBe(false)
    expect(runtimeDependencies.neverBundle.some(pattern => typeof pattern !== "string" && pattern.test("effect/Schema"))).toBe(true)
    expect(compilerDependencies.neverBundle).toContain("react")
  })
  it("reads reachable emitted modules, excludes comments and fails missing local dependencies", () => {
    const root = mkdtempSync(path.join(tmpdir(), "crumbs-emitted-graph-"))
    try {
      writeFileSync(path.join(root, "entry.mjs"), '/* import bad from "effect/Schema" */\nimport "./data.mjs"; export { value } from "./data.mjs";')
      writeFileSync(path.join(root, "data.mjs"), 'import React from "react"; export const value = React;')
      const graph = readEmittedGraph(path.join(root, "entry.mjs"))
      expect(graph.files.length).toBe(2)
      expect(graph.externals).toEqual(["react"])
      expect(graph.bytes).toBeGreaterThan(0)
      rmSync(path.join(root, "data.mjs"))
      expect(() => readEmittedGraph(path.join(root, "entry.mjs"))).toThrow(/Missing emitted/)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
  it("reports nonliteral loading sites without claiming full vendor closure", () => {
    const root = mkdtempSync(path.join(tmpdir(), "crumbs-emitted-dynamic-"))
    try {
      writeFileSync(path.join(root, "entry.cjs"), 'require("effect/Schema"); import("react"); require(variable);')
      const graph = readEmittedGraph(path.join(root, "entry.cjs"))
      expect(graph.externals).toEqual(["effect/Schema", "react"])
      expect(graph.nonliteralLoads).toBe(1)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
  it("follows static template-literal paths and reports interpolated loads", () => {
    const root = mkdtempSync(path.join(tmpdir(), "crumbs-emitted-template-"))
    try {
      writeFileSync(path.join(root, "entry.cjs"), [
        "__require(`./child.cjs`)",
        "__require(`react`)",
        "import(`./dynamic-child.mjs`)",
        "__require(`./${part}.cjs`)",
      ].join("\n"))
      writeFileSync(path.join(root, "child.cjs"), "module.exports = 1")
      writeFileSync(path.join(root, "dynamic-child.mjs"), "export const value = 1")

      const graph = readEmittedGraph(path.join(root, "entry.cjs"))

      expect(graph.files.map(file => path.basename(file))).toEqual(["child.cjs", "dynamic-child.mjs", "entry.cjs"])
      expect(graph.externals).toEqual(["react"])
      expect(graph.nonliteralLoads).toBe(1)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
  it("emits bundled contract candidates using the production tooling policy in both formats", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "crumbs-effect-build-contract-"))
    try {
      const entries = await buildContractCandidate(root)
      for (const format of ["esm", "cjs"] as const) {
        expect(readEmittedGraph(entries[format]).externals).toEqual([])
        expect(probeBoundary("node", entries[format], format, "internal-contract").receipt).toBe("passed")
      }
    } finally { rmSync(root, { recursive: true, force: true }) }
  }, 30000)
  it("summarizes individual fresh-process module load samples without clamping memory deltas", () => {
    const summary = summarizeLoadSamples([
      { loadMs: 4, heapDeltaBytes: -10, rssDeltaBytes: 20 },
      { loadMs: 1, heapDeltaBytes: 2, rssDeltaBytes: 30 },
      { loadMs: 3, heapDeltaBytes: 8, rssDeltaBytes: 10 },
      { loadMs: 2, heapDeltaBytes: 4, rssDeltaBytes: 40 },
      { loadMs: 5, heapDeltaBytes: 6, rssDeltaBytes: 50 },
    ])
    expect(summary.loadMs).toEqual({ min: 1, median: 3, max: 5 })
    expect(summary.heapDeltaBytes).toEqual({ min: -10, median: 4, max: 8 })
    expect(() => summarizeLoadSamples([])).toThrow(/samples/)
    expect(() => summarizeLoadSamples([{ loadMs: NaN, heapDeltaBytes: 0, rssDeltaBytes: 0 }])).toThrow(/finite/)
  })
})
