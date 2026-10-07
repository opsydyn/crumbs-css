import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { budgetRegistryCodec } from "../bench/budget-contract"
import {
  evaluateReleaseHostBudgetRows,
  releaseHostBudgetMetricContracts,
  verifyReleaseHostBudgetRegistry,
} from "../../../scripts/release-host-budget-policy"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const registryPath = resolve(repositoryRoot, "packages/css/bench/budgets.json")
const approvedContracts = [
  ["runtime-initialization-node22-esm", "runtime-init.floor.esm.load-ms.median"],
  ["runtime-initialization-node22-cjs", "runtime-init.floor.cjs.load-ms.median"],
  ["runtime-initialization-current-esm", "runtime-init.current.esm.load-ms.median"],
  ["runtime-initialization-current-cjs", "runtime-init.current.cjs.load-ms.median"],
  ["cold-transform-ms", "benchmark.cold-transform.max-median-ms"],
  ["warm-transform-ms", "benchmark.warm-transform.max-median-ms"],
  ["incremental-rebuild", "metro-incremental.direct-css-edit-ms.median"],
  ["editor-tsc-wall-10000", "editor.tsc.10000.wall-ms.median"],
  ["editor-tsgo-wall-10000", "editor.tsgo.10000.wall-ms.median"],
  ["editor-tsc-memory-10000", "editor.tsc.10000.memory-kib.median"],
  ["editor-tsgo-memory-10000", "editor.tsgo.10000.memory-kib.median"],
  ["editor-tsc-instantiations-10000", "editor.tsc.10000.instantiations"],
  ["editor-tsgo-instantiations-10000", "editor.tsgo.10000.instantiations"],
  ["editor-first-completion-10000", "editor.10000.first-completion-ms.median"],
  ["editor-warm-completion-10000", "editor.10000.warm-completion-ms.median"],
  ["runtime-theme-core-esm-graph-bytes", "runtime.theme-core.esm.graph-bytes"],
  ["runtime-theme-core-cjs-graph-bytes", "runtime.theme-core.cjs.graph-bytes"],
  ["runtime-tokens-esm-graph-bytes", "runtime.tokens.esm.graph-bytes"],
  ["runtime-tokens-cjs-graph-bytes", "runtime.tokens.cjs.graph-bytes"],
  ["runtime-theme-compatibility-esm-graph-bytes", "runtime.theme-compatibility.esm.graph-bytes"],
  ["runtime-theme-compatibility-cjs-graph-bytes", "runtime.theme-compatibility.cjs.graph-bytes"],
] as const

function readRegistry() {
  const decoded = budgetRegistryCodec.decodeJson(readFileSync(registryPath, "utf8"))
  if (!decoded.ok) throw new Error(JSON.stringify(decoded.issues))
  return decoded.value
}

const passingRows = approvedContracts.map(([id]) => ({ id, result: "pass" }))

describe("M10.5 release host-budget policy", () => {
  it("pins the exact 21 reviewed host IDs to their approved selectors", () => {
    expect(releaseHostBudgetMetricContracts).toEqual(
      approvedContracts.map(([id, selector]) => ({ id, selector })),
    )
  })

  it("matches the approved host rows in the decoded registry", () => {
    const registry = readRegistry()
    expect(verifyReleaseHostBudgetRegistry(registry)).toEqual([])
    const approvedRegistryRows = registry.metrics
      .flatMap(metric => metric.baseline.status === "recorded" && metric.threshold.status === "approved"
        ? [{ id: metric.id, selector: metric.baseline.selector }]
        : [])
      .sort((left, right) => left.id.localeCompare(right.id))
    expect([...releaseHostBudgetMetricContracts].sort((left, right) => left.id.localeCompare(right.id)))
      .toEqual(approvedRegistryRows)
  })

  it("qualifies the 21 passing host rows without using whole-registry readiness", () => {
    const comparison = { performanceQualified: false, metrics: passingRows }
    expect(evaluateReleaseHostBudgetRows(comparison.metrics)).toEqual({
      qualified: true,
      blockers: [],
    })
  })

  it("names missing, duplicate, and unexpected rows as blockers", () => {
    const missing = evaluateReleaseHostBudgetRows(passingRows.slice(1))
    expect(missing.qualified).toBe(false)
    expect(missing.blockers.join("\n")).toContain(approvedContracts[0]![0])

    const duplicate = evaluateReleaseHostBudgetRows([
      ...passingRows,
      passingRows[0]!,
    ])
    expect(duplicate.qualified).toBe(false)
    expect(duplicate.blockers.join("\n")).toMatch(/duplicate/i)

    const extra = evaluateReleaseHostBudgetRows([
      ...passingRows,
      { id: "unapproved-host-row", result: "pass" },
    ])
    expect(extra.qualified).toBe(false)
    expect(extra.blockers.join("\n")).toContain("unapproved-host-row")
  })

  it("names every failed or incomplete row in blockers", () => {
    const rows = passingRows.map(row => row.id === "warm-transform-ms"
      ? { ...row, result: "fail" }
      : row.id === "incremental-rebuild"
        ? { ...row, result: "incomplete-environment-mismatch" }
        : row)
    const result = evaluateReleaseHostBudgetRows(rows)
    expect(result.qualified).toBe(false)
    expect(result.blockers.join("\n")).toContain("warm-transform-ms")
    expect(result.blockers.join("\n")).toContain("fail")
    expect(result.blockers.join("\n")).toContain("incremental-rebuild")
    expect(result.blockers.join("\n")).toContain("incomplete-environment-mismatch")
  })

  it("rejects a changed selector, non-approved threshold, or new approved host row", () => {
    const reclassified = structuredClone(readRegistry()) as any
    const warmTransform = reclassified.metrics.find((metric: any) => metric.id === "warm-transform-ms")
    warmTransform.baseline.selector = "benchmark.cold-transform.max-median-ms"
    warmTransform.threshold.status = "pending-review"
    const copiedMetric = structuredClone(reclassified.metrics.find((metric: any) => metric.id === "cold-transform-ms"))
    copiedMetric.id = "unapproved-host-row"
    reclassified.metrics.push(copiedMetric)

    const blockers = verifyReleaseHostBudgetRegistry(reclassified).join("\n")
    expect(blockers).toMatch(/warm-transform-ms/i)
    expect(blockers).toMatch(/unapproved-host-row/i)
  })
})
