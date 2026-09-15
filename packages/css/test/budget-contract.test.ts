import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  BudgetRegistryVersion,
  assessBudgetRegistry,
  budgetRegistryCodec,
  compareRecordedMetrics,
  createThresholdReviewPacket,
  requiredBudgetDomains,
  summarizeBenchmarkReports,
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
      "js-frame-time", "ui-frame-time", "allocation-bytes",
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

  it("separates approved decisions from pending threshold candidates", () => {
    const decoded = budgetRegistryCodec.decodeJson(readFileSync(registryFile, "utf8"))
    if (!decoded.ok) throw Error("Committed budget registry must decode")
    const packet = createThresholdReviewPacket(decoded.value, resolve(import.meta.dir, "../../.."))
    expect(packet.status).toBe("review-required")
    expect(packet.candidates).toHaveLength(1)
    expect(packet.candidates[0]).toMatchObject({ id: "incremental-rebuild", proposal: { status: "candidate-not-approved", absoluteMax: 137.506, maxRegressionPercent: 10 } })
    expect(packet.approved).toHaveLength(15)
    expect(packet.reviewAttention.highNoise).toContain("runtime-initialization-node22-cjs")
    expect(packet.reviewAttention.zeroGrowthPolicy).toEqual(expect.arrayContaining([
      "runtime-emitted-bytes", "editor-tsc-instantiations-10000", "editor-tsgo-instantiations-10000",
    ]))
    for (const approved of packet.approved) {
      expect(approved.samples).toBeGreaterThanOrEqual(5)
      expect(approved.envelope.median).toBe(approved.baseline)
      expect(approved.decision.status).toBe("approved")
    }
  })

  it("passes approved recorded metrics without manufacturing whole-registry qualification", () => {
    const repoRoot = resolve(import.meta.dir, "../../..")
    const decoded = budgetRegistryCodec.decodeJson(readFileSync(registryFile, "utf8"))
    if (!decoded.ok) throw Error("Committed budget registry must decode")
    const report = compareRecordedMetrics(decoded.value, repoRoot, {
      effect: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-14-effect-boundary-audit/audit.json"), "utf8")),
      runtimeInit: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-15-runtime-initialization/baseline.json"), "utf8")),
      benchmark: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-14-benchmark-repair/adapter-summary.json"), "utf8")),
      incremental: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-15-metro-incremental/baseline.json"), "utf8")),
      editor: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-15-editor-scale/raw.json"), "utf8")),
    })
    expect(report.performanceQualified).toBe(false)
    expect(report.metrics).toHaveLength(16)
    for (const metric of report.metrics) {
      expect(metric.environment).toBe("exact")
      expect(metric.delta).toBe(0)
      expect(metric.result).toBe(metric.id === "incremental-rebuild" ? "incomplete-threshold-pending" : "pass")
    }
  })

  it("adapts independent benchmark reports only when their environments and scenarios agree", () => {
    const repoRoot = resolve(import.meta.dir, "../../..")
    const reports = [1, 2, 3, 4, 5].map(index => JSON.parse(readFileSync(resolve(repoRoot,
      `docs/evidence/2026-09-14-benchmark-repair/run-${index}.json`), "utf8")))
    const summary = summarizeBenchmarkReports(reports)
    expect(summary.environment).toEqual(reports[0].environment)
    expect(summary.results).toHaveLength(10)
    expect(summary.results.every(result => result.runBatchMeanP50Ms.length === 5)).toBe(true)
    expect(() => summarizeBenchmarkReports([reports[0], { ...reports[1], environment: { ...reports[1].environment, bun: "different" } }])).toThrow()
  })

  it("rejects editor comparisons when the generated scenario manifest changes", () => {
    const repoRoot = resolve(import.meta.dir, "../../..")
    const decoded = budgetRegistryCodec.decodeJson(readFileSync(registryFile, "utf8"))
    if (!decoded.ok) throw Error("Committed budget registry must decode")
    const editor = JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-15-editor-scale/raw.json"), "utf8"))
    const report = compareRecordedMetrics(decoded.value, repoRoot, {
      effect: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-14-effect-boundary-audit/audit.json"), "utf8")),
      runtimeInit: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-15-runtime-initialization/baseline.json"), "utf8")),
      benchmark: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-14-benchmark-repair/adapter-summary.json"), "utf8")),
      incremental: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-15-metro-incremental/baseline.json"), "utf8")),
      editor: { ...editor, manifest: { ...editor.manifest, scales: [] } },
    })
    expect(report.metrics.filter(metric => metric.id.startsWith("editor-")).every(metric => metric.environment === "mismatch")).toBe(true)
  })

  it("requires both approved absolute and relative limits to pass", () => {
    const repoRoot = resolve(import.meta.dir, "../../..")
    const valid = JSON.parse(readFileSync(registryFile, "utf8"))
    const approved = { ...valid, metrics: valid.metrics.map((metric: { baseline: { status: string; value?: number } }) =>
      metric.baseline.status === "recorded" ? { ...metric, threshold: {
        status: "approved", absoluteMax: metric.baseline.value, maxRegressionPercent: 0,
        approvedBy: "test reviewer", approvedAt: "2026-09-15T09:00:00Z", evidence: "test/review.md",
      } } : metric) }
    const decoded = budgetRegistryCodec.decode(approved)
    if (!decoded.ok) throw Error("Approved recorded metrics must decode")
    const evidence = {
      effect: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-14-effect-boundary-audit/audit.json"), "utf8")),
      runtimeInit: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-15-runtime-initialization/baseline.json"), "utf8")),
      benchmark: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-14-benchmark-repair/adapter-summary.json"), "utf8")),
      incremental: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-15-metro-incremental/baseline.json"), "utf8")),
      editor: JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-09-15-editor-scale/raw.json"), "utf8")),
    }
    expect(compareRecordedMetrics(decoded.value, repoRoot, evidence).metrics.every(metric => metric.result === "pass")).toBe(true)
    approved.metrics.find((metric: { id: string }) => metric.id === "runtime-emitted-bytes").threshold.absoluteMax = 0
    const failed = budgetRegistryCodec.decode(approved)
    if (!failed.ok) throw Error("Tightened threshold must decode")
    expect(compareRecordedMetrics(failed.value, repoRoot, evidence).metrics.find(metric => metric.id === "runtime-emitted-bytes")?.result).toBe("fail")
  })
})
