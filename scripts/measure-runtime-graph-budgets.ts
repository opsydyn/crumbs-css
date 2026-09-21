import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import {
  assessBudgetRegistry,
  budgetRegistryCodec,
  compareRuntimeGraphMetrics,
  verifyRecordedBaselines,
} from "../packages/css/bench/budget-contract"
import { scanRuntimeGraphEvidence } from "../packages/css/bench/runtime-graph-budget"

const repoRoot = resolve(import.meta.dir, "..")
const output = resolve(process.argv[2] ?? "docs/evidence/2026-09-21-m4-6-runtime-byte-comparison")
await mkdir(output, { recursive: true })

const registryResult = budgetRegistryCodec.decodeJson(await readFile(join(repoRoot, "packages/css/bench/budgets.json"), "utf8"))
if (!registryResult.ok) throw Error(`Budget registry invalid: ${JSON.stringify(registryResult.issues)}`)
const baselineIssues = verifyRecordedBaselines(registryResult.value, repoRoot)
if (baselineIssues.length > 0) throw Error(`Recorded budget baselines are invalid: ${JSON.stringify(baselineIssues)}`)

const runtimeGraph = scanRuntimeGraphEvidence(join(repoRoot, "packages/css"), 5)
await writeFile(join(output, "runtime-graph.json"), JSON.stringify(runtimeGraph, null, 2) + "\n")
const splitComparison = compareRuntimeGraphMetrics(registryResult.value, repoRoot, runtimeGraph)

const historicalMetric = registryResult.value.metrics.find(metric => metric.id === "runtime-emitted-bytes")
if (!historicalMetric || historicalMetric.baseline.status !== "recorded" || historicalMetric.threshold.status !== "approved") {
  throw Error("The retained runtime-emitted-bytes metric must remain recorded and approved")
}
const historicalSamples = runtimeGraph.currentGraphs.theme.cjs.samples
const historicalCurrent = summarizeEnvelope(historicalSamples)
const historicalDelta = historicalCurrent.median - historicalMetric.baseline.value
const historicalDeltaPercent = historicalMetric.baseline.value === 0
  ? historicalDelta === 0 ? 0 : null
  : historicalDelta / historicalMetric.baseline.value * 100
const historicalResult = historicalCurrent.median <= historicalMetric.threshold.absoluteMax &&
  historicalDeltaPercent !== null && historicalDeltaPercent <= historicalMetric.threshold.maxRegressionPercent ? "pass" : "fail"
const registryAssessment = assessBudgetRegistry(registryResult.value)
const report = {
  formatVersion: 1,
  recordedAt: new Date().toISOString(),
  sourceRevision: runtimeGraph.sourceRevision,
  sourceState: "Current checkout after package build; split graphs are compared against the retained M4.6 admission evidence",
  registry: {
    status: registryResult.value.status,
    registryReady: registryAssessment.ready,
    performanceQualification: "not-run" as const,
  },
  splitComparison,
  historicalCompatibilityMetric: {
    id: historicalMetric.id,
    selector: historicalMetric.baseline.selector,
    baseline: historicalMetric.baseline.value,
    current: historicalCurrent,
    delta: historicalDelta,
    deltaPercent: historicalDeltaPercent,
    environment: "graph-only-current-checkout",
    thresholdStatus: historicalMetric.threshold.status,
    result: historicalResult,
    qualification: "Retained historical compatibility comparison; it remains separate from the admitted split graph budgets and is expected to stay fail-closed until the compatibility policy changes.",
  },
  protocol: runtimeGraph.protocol,
  currentGraphs: runtimeGraph.currentGraphs,
  limits: [
    "The adapter scans emitted package graphs after a completed package build; it does not measure device or Hermes performance",
    "The historical runtime-emitted-bytes result remains visible and does not gate the admitted split graph comparison",
    "Whole-registry readiness remains blocked by pending device, UI-frame, allocation and retained-memory domains",
  ],
}
await writeFile(join(output, "comparison.json"), JSON.stringify(report, null, 2) + "\n")
console.log(JSON.stringify({
  output,
  splitGraphBudgets: splitComparison.allPassed ? "pass" : "fail",
  historicalCompatibility: historicalResult,
  registryReady: registryAssessment.ready,
}, null, 2))
if (!splitComparison.allPassed) process.exitCode = 1

function summarizeEnvelope(values: number[]) {
  if (values.length === 0 || values.some(value => !Number.isFinite(value))) throw Error("Runtime graph samples must be finite")
  const sorted = [...values].sort((left, right) => left - right)
  const median = sorted[Math.floor(sorted.length / 2)]!
  const min = sorted[0]!
  const max = sorted.at(-1)!
  return { min, median, max, maxDeviationPercent: median === 0 ? 0 : Math.max(Math.abs(min - median), Math.abs(max - median)) / Math.abs(median) * 100 }
}
