import { describe, expect, it } from "bun:test"
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import * as policyApi from "../../../scripts/release-host-budget-policy"
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

const advisoryIds = approvedContracts.filter(([id]) => id.startsWith("runtime-")).map(([id]) => id)
const policy = {
  formatVersion: 1,
  policyId: "crumbs-host-budgets-2026-10-18-v12-baseline-v1",
  registrySha256: "f2c9c98ff841c679e80af43e251020e7461e665e4c2ae1f07b34bef615d2fa68",
  metrics: approvedContracts.map(([id, selector]) => ({ id, selector, enforcement: advisoryIds.includes(id as any) ? "advisory" : "blocking" })),
  baselineFiles: JSON.parse(readFileSync(resolve(repositoryRoot, "docs/evidence/2026-10-18-m10-5-v12-rebaseline/baseline-files.json"), "utf8")),
} as any
const passingRows = approvedContracts.map(([id]) => ({ id, result: "pass" }))

describe("M10.5 release host-budget policy", () => {
  it("pins the exact 21 reviewed host IDs to their approved selectors", () => {
    expect(releaseHostBudgetMetricContracts).toEqual(
      approvedContracts.map(([id, selector]) => ({ id, selector })),
    )
  })

  it("matches the approved host rows in the decoded registry", () => {
    const registry = readRegistry()
    expect(verifyReleaseHostBudgetRegistry(registry, policy)).toEqual([])
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
    expect(evaluateReleaseHostBudgetRows(comparison.metrics, policy).releasePolicyQualified).toBe(true)
  })

  it("names missing, duplicate, and unexpected rows as blockers", () => {
    const missing = evaluateReleaseHostBudgetRows(passingRows.slice(1), policy)
    expect(missing.releasePolicyQualified).toBe(false)
    expect(missing.blockers.join("\n")).toContain(approvedContracts[0]![0])

    const duplicate = evaluateReleaseHostBudgetRows([
      ...passingRows,
      passingRows[0]!,
    ], policy)
    expect(duplicate.releasePolicyQualified).toBe(false)
    expect(duplicate.blockers.join("\n")).toMatch(/duplicate/i)

    const extra = evaluateReleaseHostBudgetRows([
      ...passingRows,
      { id: "unapproved-host-row", result: "pass" },
    ], policy)
    expect(extra.releasePolicyQualified).toBe(false)
    expect(extra.blockers.join("\n")).toContain("unapproved-host-row")
  })

  it("names every failed or incomplete row in blockers", () => {
    const rows = passingRows.map(row => row.id === "warm-transform-ms"
      ? { ...row, result: "fail" }
      : row.id === "incremental-rebuild"
        ? { ...row, result: "incomplete-environment-mismatch" }
        : row)
    const result = evaluateReleaseHostBudgetRows(rows, policy)
    expect(result.releasePolicyQualified).toBe(false)
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

    const blockers = verifyReleaseHostBudgetRegistry(reclassified, policy).join("\n")
    expect(blockers).toMatch(/warm-transform-ms/i)
    expect(blockers).toMatch(/unapproved-host-row/i)
  })
})

describe("approved consumer policy enforcement", () => {
  it("retains all ten advisory failures while admitting eleven passing blocking rows", () => {
    expect(advisoryIds).toHaveLength(10)
    const result = evaluateReleaseHostBudgetRows(passingRows.map(row => ({ ...row, result: advisoryIds.includes(row.id as any) ? "fail" : "pass" })), policy)
    expect(result.releasePolicyQualified).toBe(true)
    expect(result.blockers).toEqual([])
    expect(result.blocking.passIds).toHaveLength(11)
    expect(result.advisory.failIds).toEqual(advisoryIds)
  })
  it("rejects each failed blocking row and each missing or duplicated contract", () => {
    for (const row of passingRows) {
      if (!advisoryIds.includes(row.id as any)) expect(evaluateReleaseHostBudgetRows(passingRows.map(other => other.id === row.id ? { ...other, result: "fail" } : other), policy).releasePolicyQualified).toBe(false)
      expect(evaluateReleaseHostBudgetRows(passingRows.filter(other => other !== row), policy).releasePolicyQualified).toBe(false)
      expect(evaluateReleaseHostBudgetRows([...passingRows, row], policy).releasePolicyQualified).toBe(false)
    }
  })
  it("rejects every incomplete or unsupported advisory status", () => {
    for (const id of advisoryIds) for (const status of ["incomplete-environment-mismatch", "incomplete-measurement", "unknown", "", null]) {
      const result = evaluateReleaseHostBudgetRows(passingRows.map(row => row.id === id ? { ...row, result: status as any } : row), policy)
      expect(result.releasePolicyQualified).toBe(false)
      expect(result.advisory.incompleteIds).toContain(id)
    }
  })
  it("pins roles, selectors, registry and evidence inventory independently of caller data", () => {
    const mutations = [
      (p: any) => { p.metrics[4].enforcement = "advisory" },
      (p: any) => { p.metrics[0].enforcement = "blocking" },
      (p: any) => { p.metrics[0].selector = "other" },
      (p: any) => { p.metrics.push(p.metrics[0]) },
      (p: any) => { p.registrySha256 = "0".repeat(64) },
      (p: any) => { p.baselineFiles[0].path = "../elsewhere" },
      (p: any) => { p.baselineFiles[0].sha256 = "0".repeat(64) },
      (p: any) => { p.policyId = "other" },
    ]
    for (const mutate of mutations) {
      const altered = structuredClone(policy)
      mutate(altered)
      expect(evaluateReleaseHostBudgetRows(passingRows, altered).releasePolicyQualified).toBe(false)
    }
  })
  it("rejects missing and drifting bindings, and baseline byte edits even with unchanged medians", () => {
    const api = policyApi as any
    const binding = api.captureHostBudgetPolicyBinding(repositoryRoot)
    expect(api.verifyHostBudgetPolicyBinding(binding, repositoryRoot)).toEqual([])
    for (const bad of [undefined, {}, { ...binding, policyId: "other" }, { ...binding, policySha256: "0".repeat(64) }, { ...binding, registrySha256: "0".repeat(64) }]) expect(api.verifyHostBudgetPolicyBinding(bad, repositoryRoot).length).toBeGreaterThan(0)
    const root = mkdtempSync(resolve(tmpdir(), "crumbs-policy-"))
    try {
      for (const path of ["scripts/release-host-budget-policy.json", "packages/css/bench/budgets.json", ...policy.baselineFiles.map((f: any) => f.path)]) {
        mkdirSync(resolve(root, path, ".."), { recursive: true })
        cpSync(resolve(repositoryRoot, path), resolve(root, path))
      }
      expect(api.captureHostBudgetPolicyBinding(root)).toEqual(binding)
      const path = resolve(root, policy.baselineFiles[0].path)
      writeFileSync(path, readFileSync(path, "utf8") + "\n")
      expect(() => api.loadHostBudgetPolicy(root)).toThrow(/baseline|evidence/i)
      const changed = structuredClone(policy)
      changed.metrics[4].enforcement = "advisory"
      writeFileSync(resolve(root, "scripts/release-host-budget-policy.json"), JSON.stringify(changed))
      expect(() => api.loadHostBudgetPolicy(root)).toThrow(/policy|role/i)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
})
