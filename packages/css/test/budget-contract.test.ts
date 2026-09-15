import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  BudgetRegistryVersion,
  assessBudgetRegistry,
  budgetRegistryCodec,
  requiredBudgetDomains,
  verifyRecordedBaselines,
} from "../bench/budget-contract"

const registryFile = resolve(import.meta.dir, "../bench/budgets.json")

describe("performance budget registry", () => {
  it("admits the committed versioned registry with every required domain exactly once or more", () => {
    const decoded = budgetRegistryCodec.decodeJson(readFileSync(registryFile, "utf8"))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value.version).toBe(BudgetRegistryVersion)
    expect(new Set(decoded.value.metrics.map(metric => metric.id)).size).toBe(decoded.value.metrics.length)
    for (const domain of requiredBudgetDomains) {
      expect(decoded.value.metrics.some(metric => metric.domain === domain)).toBe(true)
    }
  })

  it("reports pending and missing work without manufacturing qualification", () => {
    const decoded = budgetRegistryCodec.decodeJson(readFileSync(registryFile, "utf8"))
    if (!decoded.ok) throw Error("Committed budget registry must decode")
    const assessment = assessBudgetRegistry(decoded.value)
    expect(assessment.ready).toBe(false)
    expect(assessment.pendingThresholds.length).toBeGreaterThan(0)
    expect(assessment.missingBaselines).toEqual(expect.arrayContaining([
      "js-frame-time", "ui-frame-time", "allocation-bytes", "incremental-rebuild",
    ]))
  })

  it("re-derives every recorded baseline from retained evidence", () => {
    const decoded = budgetRegistryCodec.decodeJson(readFileSync(registryFile, "utf8"))
    if (!decoded.ok) throw Error("Committed budget registry must decode")
    expect(verifyRecordedBaselines(decoded.value, resolve(import.meta.dir, "../../.."))).toEqual([])
    const metric = decoded.value.metrics.find(candidate => candidate.baseline.status === "recorded")
    if (!metric || metric.baseline.status !== "recorded") throw Error("Expected a recorded baseline")
    const drifted = {
      ...decoded.value,
      metrics: decoded.value.metrics.map(candidate => candidate.id === metric.id && candidate.baseline.status === "recorded"
        ? { ...candidate, baseline: { ...candidate.baseline, value: candidate.baseline.value + 1 } }
        : candidate),
    }
    expect(verifyRecordedBaselines(drifted, resolve(import.meta.dir, "../../.."))).toEqual([
      expect.objectContaining({ id: metric.id, code: "baseline-value-mismatch" }),
    ])
  })

  it("fails closed on unknown versions, fields, invalid repetition counts and duplicate ids", () => {
    const valid = JSON.parse(readFileSync(registryFile, "utf8"))
    for (const mutation of [
      { ...valid, version: BudgetRegistryVersion + 1 },
      { ...valid, unknown: true },
      { ...valid, protocol: { ...valid.protocol, minimumIndependentRepetitions: 0 } },
      { ...valid, metrics: [...valid.metrics, valid.metrics[0]] },
      { ...valid, metrics: valid.metrics.map((metric: { baseline: { status: string } }, index: number) => index === 4
        ? { ...metric, baseline: { ...metric.baseline, repetitions: 4 } } : metric) },
    ]) expect(budgetRegistryCodec.decode(mutation).ok).toBe(false)
  })

  it("requires recorded baselines and concrete limits before a threshold can be approved", () => {
    const valid = JSON.parse(readFileSync(registryFile, "utf8"))
    const metric = valid.metrics.find((candidate: { id: string }) => candidate.id === "editor-first-completion-10000")
    expect(metric).toBeDefined()
    for (const replacement of [
      { ...metric, threshold: { status: "approved", absoluteMax: null, maxRegressionPercent: null } },
      { ...metric, baseline: { status: "missing", reason: "removed for test" }, threshold: { status: "approved", absoluteMax: 50, maxRegressionPercent: 15 } },
    ]) {
      const mutated = { ...valid, metrics: valid.metrics.map((candidate: { id: string }) => candidate.id === metric.id ? replacement : candidate) }
      expect(budgetRegistryCodec.decode(mutated).ok).toBe(false)
    }
  })

  it("admits an active registry only when every baseline and threshold is qualified", () => {
    const valid = JSON.parse(readFileSync(registryFile, "utf8"))
    const active = {
      ...valid,
      status: "active",
      metrics: valid.metrics.map((metric: { baseline: { status: string }; threshold: unknown }) => ({
        ...metric,
        baseline: metric.baseline.status === "recorded" ? metric.baseline : {
          status: "recorded", evidence: "docs/evidence/test.json", selector: "effect.runtime.cjs.graph-bytes", value: 1, repetitions: 5,
        },
        threshold: {
          status: "approved", absoluteMax: 2, maxRegressionPercent: 10,
          approvedBy: "test reviewer", approvedAt: "2026-09-15T09:00:00Z", evidence: "test/review.md",
        },
      })),
    }
    const decoded = budgetRegistryCodec.decode(active)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(assessBudgetRegistry(decoded.value).ready).toBe(true)
    active.metrics[0].threshold = { status: "pending-review", absoluteMax: null, maxRegressionPercent: null }
    expect(budgetRegistryCodec.decode(active).ok).toBe(false)
  })

  it("separates registry validation from activation readiness at the CLI boundary", () => {
    const repoRoot = resolve(import.meta.dir, "../../..")
    const script = resolve(repoRoot, "scripts/performance-budgets.ts")
    const validate = Bun.spawnSync([process.execPath, script, "validate"], { cwd: repoRoot })
    expect(validate.exitCode).toBe(0)
    expect(JSON.parse(validate.stdout.toString())).toMatchObject({ valid: true, registryReady: false, performanceQualification: "not-run" })
    const readiness = Bun.spawnSync([process.execPath, script, "readiness"], { cwd: repoRoot })
    expect(readiness.exitCode).toBe(1)
    expect(JSON.parse(readiness.stdout.toString())).toMatchObject({ valid: true, registryReady: false, performanceQualification: "not-run" })
  })
})
