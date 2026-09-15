import * as Schema from "effect/Schema"
import { readFileSync } from "node:fs"
import { resolve, sep } from "node:path"
import { makeDataCodec } from "../src/contracts/data-codec"

export const BudgetRegistryVersion = 1 as const
export const requiredBudgetDomains = [
  "js-frames",
  "ui-frames",
  "allocations",
  "retained-memory",
  "runtime-footprint",
  "cold-transform",
  "warm-transform",
  "incremental-rebuild",
  "editor",
] as const

const FiniteNonNegative = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))
const PositiveInteger = Schema.Int.check(Schema.isGreaterThan(0))
const Id = Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9-]*$/))
const BaselineSelectorSchema = Schema.Literals([
  "effect.runtime.cjs.graph-bytes",
  "runtime-init.floor.esm.load-ms.median",
  "runtime-init.floor.cjs.load-ms.median",
  "runtime-init.current.esm.load-ms.median",
  "runtime-init.current.cjs.load-ms.median",
  "benchmark.cold-transform.max-median-ms",
  "benchmark.warm-transform.max-median-ms",
  "editor.tsc.10000.wall-ms.median",
  "editor.tsgo.10000.wall-ms.median",
  "editor.tsc.10000.memory-kib.median",
  "editor.tsgo.10000.memory-kib.median",
  "editor.tsc.10000.instantiations",
  "editor.tsgo.10000.instantiations",
  "editor.10000.first-completion-ms.median",
  "editor.10000.warm-completion-ms.median",
])
const commonMetricFields = {
  id: Id,
  domain: Schema.Literals(requiredBudgetDomains),
  scenario: Schema.NonEmptyString,
  measure: Schema.NonEmptyString,
  unit: Schema.Literals(["ms", "bytes", "KiB", "count"]),
  direction: Schema.Literal("lower-is-better"),
  environmentClass: Schema.NonEmptyString,
}
const MissingBaselineSchema = Schema.Struct({ status: Schema.Literal("missing"), reason: Schema.NonEmptyString })
const DiagnosticBaselineSchema = Schema.Struct({
  status: Schema.Literal("diagnostic"), evidence: Schema.NonEmptyString,
  reason: Schema.NonEmptyString, repetitions: PositiveInteger,
})
const RecordedBaselineSchema = Schema.Struct({
  status: Schema.Literal("recorded"), evidence: Schema.NonEmptyString,
  selector: BaselineSelectorSchema, value: Schema.Finite, repetitions: PositiveInteger,
})
const PendingThresholdSchema = Schema.Struct({
  status: Schema.Literal("pending-review"), absoluteMax: Schema.Null, maxRegressionPercent: Schema.Null,
})
const ApprovedThresholdSchema = Schema.Struct({
  status: Schema.Literal("approved"), absoluteMax: FiniteNonNegative,
  maxRegressionPercent: FiniteNonNegative, approvedBy: Schema.NonEmptyString,
  approvedAt: Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/)),
  evidence: Schema.NonEmptyString,
})
const BudgetMetricSchema = Schema.Union([
  Schema.Struct({ ...commonMetricFields, baseline: MissingBaselineSchema, threshold: PendingThresholdSchema }),
  Schema.Struct({ ...commonMetricFields, baseline: DiagnosticBaselineSchema, threshold: PendingThresholdSchema }),
  Schema.Struct({ ...commonMetricFields, baseline: RecordedBaselineSchema, threshold: PendingThresholdSchema }),
  Schema.Struct({ ...commonMetricFields, baseline: RecordedBaselineSchema, threshold: ApprovedThresholdSchema }),
])
export const BudgetRegistrySchema = Schema.Struct({
  _tag: Schema.Literal("CrumbsPerformanceBudgetRegistry"),
  version: Schema.Literal(BudgetRegistryVersion),
  status: Schema.Literals(["thresholds-pending-review", "active"]),
  protocol: Schema.Struct({
    minimumIndependentRepetitions: PositiveInteger,
    comparisonStatistic: Schema.Literal("median"),
    noiseEnvelope: Schema.Literal("min-median-max"),
    environmentPolicy: Schema.Literal("exact-or-explicit-equivalence"),
    approvalPolicy: Schema.Literal("reviewer-recorded"),
    unapprovedBehavior: Schema.Literal("incomplete"),
    regressionRule: Schema.Literal("absolute-and-relative-must-pass"),
  }),
  metrics: Schema.Array(BudgetMetricSchema),
}).check(Schema.makeFilter(registry => {
  const issues: Array<{ path: Array<string | number>; issue: string }> = []
  const seen = new Set<string>()
  registry.metrics.forEach((metric, index) => {
    if (seen.has(metric.id)) issues.push({ path: ["metrics", index, "id"], issue: `Duplicate metric id: ${metric.id}` })
    seen.add(metric.id)
    if (metric.baseline.status === "recorded" && metric.baseline.repetitions < registry.protocol.minimumIndependentRepetitions) {
      issues.push({ path: ["metrics", index, "baseline", "repetitions"], issue: "Recorded baseline has fewer repetitions than the protocol minimum" })
    }
  })
  for (const domain of requiredBudgetDomains) {
    if (!registry.metrics.some(metric => metric.domain === domain)) issues.push({ path: ["metrics"], issue: `Missing required domain: ${domain}` })
  }
  const incomplete = registry.metrics.some(metric => metric.baseline.status !== "recorded" || metric.threshold.status !== "approved")
  if (registry.status === "active" && incomplete) issues.push({ path: ["status"], issue: "Active registry requires recorded baselines and approved thresholds" })
  if (registry.status === "thresholds-pending-review" && !incomplete) issues.push({ path: ["status"], issue: "Fully approved registry must be active" })
  return issues
}))
export type BudgetRegistry = typeof BudgetRegistrySchema.Type
export const budgetRegistryCodec = makeDataCodec("performance-budget-registry", BudgetRegistrySchema)

export function assessBudgetRegistry(registry: BudgetRegistry) {
  const pendingThresholds = registry.metrics.filter(metric => metric.threshold.status === "pending-review").map(metric => metric.id)
  const missingBaselines = registry.metrics.filter(metric => metric.baseline.status === "missing").map(metric => metric.id)
  const diagnosticBaselines = registry.metrics.filter(metric => metric.baseline.status === "diagnostic").map(metric => metric.id)
  return {
    ready: registry.status === "active" && pendingThresholds.length === 0 && missingBaselines.length === 0 && diagnosticBaselines.length === 0,
    pendingThresholds,
    missingBaselines,
    diagnosticBaselines,
  }
}

export type BaselineVerificationIssue = {
  readonly id: string
  readonly code: "invalid-evidence-path" | "unreadable-evidence" | "baseline-value-mismatch"
  readonly message: string
}

export function verifyRecordedBaselines(registry: BudgetRegistry, repoRoot: string): BaselineVerificationIssue[] {
  const evidenceRoot = resolve(repoRoot, "docs/evidence") + sep
  const issues: BaselineVerificationIssue[] = []
  for (const metric of registry.metrics) {
    if (metric.baseline.status !== "recorded") continue
    const file = resolve(repoRoot, metric.baseline.evidence)
    if (!file.startsWith(evidenceRoot)) {
      issues.push({ id: metric.id, code: "invalid-evidence-path", message: "Recorded evidence must stay under docs/evidence" })
      continue
    }
    try {
      const evidence: unknown = JSON.parse(readFileSync(file, "utf8"))
      const actual = median(extractBaselineSamples(metric.baseline.selector, evidence))
      if (!Object.is(actual, metric.baseline.value)) {
        issues.push({ id: metric.id, code: "baseline-value-mismatch", message: `Recorded ${metric.baseline.value}; evidence resolves to ${actual}` })
      }
    } catch (error) {
      issues.push({ id: metric.id, code: "unreadable-evidence", message: error instanceof Error ? error.message : "Evidence could not be read" })
    }
  }
  return issues
}

type BaselineSelector = typeof BaselineSelectorSchema.Type
type EvidenceBundle = { readonly effect: unknown; readonly runtimeInit: unknown; readonly benchmark: unknown; readonly editor: unknown }

export function summarizeBenchmarkReports(inputs: unknown[]) {
  if (inputs.length === 0) throw Error("At least one benchmark report is required")
  const reports = inputs as BenchmarkRunEvidence[]
  const environment = JSON.stringify(reports[0]!.environment)
  const protocol = JSON.stringify(reports[0]!.protocol)
  const fixtures = JSON.stringify(reports[0]!.fixtures)
  const names = reports[0]!.metrics.map(metric => metric.name)
  for (const report of reports) {
    if (JSON.stringify(report.environment) !== environment) throw Error("Benchmark environments differ")
    if (JSON.stringify(report.protocol) !== protocol || JSON.stringify(report.fixtures) !== fixtures) throw Error("Benchmark protocols or fixtures differ")
    if (JSON.stringify(report.metrics.map(metric => metric.name)) !== JSON.stringify(names)) throw Error("Benchmark scenarios differ")
  }
  return {
    formatVersion: 1,
    environment: reports[0]!.environment,
    protocol: reports[0]!.protocol,
    fixtures: reports[0]!.fixtures,
    sourceRevisions: [...new Set(reports.map(report => report.sourceRevision))],
    results: names.map((name, index) => ({
      name,
      sampleKind: reports[0]!.metrics[index]!.sampleKind,
      iterationsPerSample: reports[0]!.metrics[index]!.iterationsPerSample,
      warmupIterations: reports[0]!.metrics[index]!.warmupIterations,
      samplesPerRun: reports[0]!.metrics[index]!.samples,
      runBatchMeanP50Ms: numbers(reports.map(report => report.metrics[index]!.batchMeanP50Ms)),
    })),
  }
}

export function createThresholdReviewPacket(registry: BudgetRegistry, repoRoot: string) {
  const recorded = registry.metrics.flatMap(metric => {
    if (metric.baseline.status !== "recorded") return []
    const evidence = JSON.parse(readFileSync(resolve(repoRoot, metric.baseline.evidence), "utf8")) as unknown
    const samples = extractBaselineSamples(metric.baseline.selector, evidence)
    const envelope = summarizeEnvelope(samples)
    return [{ metric, baseline: metric.baseline, samples, envelope }]
  })
  const candidates = recorded.flatMap(({ metric, baseline, samples, envelope }) => {
    if (metric.threshold.status !== "pending-review") return []
    const maxRegressionPercent = roundUpToFive(Math.max(10, envelope.maxDeviationPercent * 2))
    const unroundedAbsolute = Math.max(envelope.max, envelope.median * (1 + maxRegressionPercent / 100))
    const absoluteMax = metric.unit === "ms" ? Math.ceil(unroundedAbsolute * 1000) / 1000 : Math.ceil(unroundedAbsolute)
    return [{
      id: metric.id, unit: metric.unit, samples: samples.length, baseline: baseline.value, envelope,
      proposal: { status: "candidate-not-approved" as const, absoluteMax, maxRegressionPercent,
        formula: "max(observed max, median plus twice observed deviation or 10 percent); rounded upward" },
    }]
  })
  const approved = recorded.flatMap(({ metric, baseline, samples, envelope }) => metric.threshold.status === "approved" ? [{
    id: metric.id, unit: metric.unit, samples: samples.length, baseline: baseline.value, envelope,
    decision: metric.threshold,
  }] : [])
  return {
    status: candidates.length === 0 ? "recorded-thresholds-approved" as const : "review-required" as const,
    registryStatus: registry.status,
    candidates,
    approved,
    reviewAttention: {
      highNoise: recorded.filter(({ envelope }) => envelope.maxDeviationPercent >= 20).map(({ metric }) => metric.id),
      zeroGrowthPolicy: approved.filter(entry => entry.decision.maxRegressionPercent === 0).map(entry => entry.id),
    },
    blockers: assessBudgetRegistry(registry),
    limits: [
      "Candidates are mechanical review inputs; approved entries preserve reviewer decisions; neither qualifies current performance",
      "High-noise metrics should be isolated or remeasured before approval",
      "Deterministic byte/count metrics need an explicit allowed-growth policy",
    ],
  }
}

export function compareRecordedMetrics(registry: BudgetRegistry, repoRoot: string, current: EvidenceBundle) {
  const metrics = registry.metrics.flatMap(metric => {
    if (metric.baseline.status !== "recorded") return []
    const baselineEvidence = JSON.parse(readFileSync(resolve(repoRoot, metric.baseline.evidence), "utf8")) as unknown
    const currentEvidence = evidenceForSelector(metric.baseline.selector, current)
    const samples = extractBaselineSamples(metric.baseline.selector, currentEvidence)
    const currentEnvelope = summarizeEnvelope(samples)
    const delta = currentEnvelope.median - metric.baseline.value
    const deltaPercent = metric.baseline.value === 0 ? (delta === 0 ? 0 : null) : delta / metric.baseline.value * 100
    const environment = JSON.stringify(environmentFingerprint(metric.baseline.selector, baselineEvidence)) ===
      JSON.stringify(environmentFingerprint(metric.baseline.selector, currentEvidence)) ? "exact" as const : "mismatch" as const
    let result: "incomplete-environment-mismatch" | "incomplete-insufficient-repetitions" | "incomplete-threshold-pending" | "pass" | "fail"
    if (environment === "mismatch") result = "incomplete-environment-mismatch"
    else if (samples.length < registry.protocol.minimumIndependentRepetitions) result = "incomplete-insufficient-repetitions"
    else if (metric.threshold.status === "pending-review") result = "incomplete-threshold-pending"
    else result = currentEnvelope.median <= metric.threshold.absoluteMax && deltaPercent !== null && deltaPercent <= metric.threshold.maxRegressionPercent ? "pass" : "fail"
    return [{ id: metric.id, unit: metric.unit, baseline: metric.baseline.value, current: currentEnvelope,
      delta, deltaPercent, environment, thresholdStatus: metric.threshold.status, result }]
  })
  return {
    performanceQualified: assessBudgetRegistry(registry).ready && metrics.length > 0 && metrics.every(metric => metric.result === "pass"),
    metrics,
    reviewAttention: { highNoise: metrics.filter(metric => metric.current.maxDeviationPercent >= 20).map(metric => metric.id) },
    limits: ["Only recorded host/editor metrics are adapted; missing and diagnostic domains remain blockers"],
  }
}

function extractBaselineSamples(selector: BaselineSelector, evidence: unknown): number[] {
  if (selector === "effect.runtime.cjs.graph-bytes") {
    const data = evidence as EffectBoundaryEvidence
    const entries = data.results.filter(entry => entry.scenario === "runtime" && entry.format === "cjs")
    const value = unique(entries.map(entry => entry.graph.bytes))
    return Array.from({ length: Math.max(...entries.map(entry => entry.samples.length)) }, () => value)
  }
  const runtimeInit = selector.match(/^runtime-init\.(floor|current)\.(esm|cjs)\.load-ms\.median$/)
  if (runtimeInit) {
    const data = evidence as RuntimeInitializationEvidence
    const scenario = data.scenarios.find(entry => entry.runtime === runtimeInit[1] && entry.format === runtimeInit[2])
    if (!scenario) throw Error(`Missing runtime initialization scenario: ${selector}`)
    return numbers(scenario.samples.map(sample => sample.loadMs))
  }
  if (selector === "benchmark.cold-transform.max-median-ms" || selector === "benchmark.warm-transform.max-median-ms") {
    const data = evidence as BenchmarkSummaryEvidence
    const prefix = selector.includes(".cold-") ? "first transform " : "warm transform "
    return maximaByRepetition(data.results.filter(entry => entry.name.startsWith(prefix)).map(entry => entry.runBatchMeanP50Ms))
  }
  const data = evidence as EditorScaleEvidence
  const compiler = selector.match(/^editor\.(tsc|tsgo)\.10000\.(wall-ms|memory-kib|instantiations)(?:\.median)?$/)
  if (compiler) {
    const runs = data.compilerRuns.filter(entry => entry.engine === compiler[1] && entry.scale === 10000)
    const values = runs.map(entry => compiler[2] === "wall-ms" ? entry.wallMs
      : compiler[2] === "memory-kib" ? entry.diagnostics.memoryKiB : entry.diagnostics.instantiations)
    return numbers(values)
  }
  const completion = selector.match(/^editor\.10000\.(first|warm)-completion-ms\.median$/)
  if (completion) {
    const key = completion[1] === "first" ? "firstCompletionMs" : "warmCompletionMs"
    return numbers(data.completionRuns.filter(entry => entry.scale === 10000).map(entry => entry[key]))
  }
  throw Error(`Unsupported baseline selector: ${selector}`)
}

function evidenceForSelector(selector: BaselineSelector, evidence: EvidenceBundle): unknown {
  if (selector.startsWith("effect.")) return evidence.effect
  if (selector.startsWith("runtime-init.")) return evidence.runtimeInit
  if (selector.startsWith("benchmark.")) return evidence.benchmark
  return evidence.editor
}

function environmentFingerprint(selector: BaselineSelector, evidence: unknown): unknown {
  if (selector.startsWith("effect.")) {
    const data = evidence as EffectBoundaryEvidence
    return { effect: data.effect, build: data.build, protocol: data.protocol, environment: { platform: data.environment.platform, architecture: data.environment.architecture },
      nodes: [...new Set(data.results.flatMap(entry => entry.samples.map(sample => sample.node)))].sort() }
  }
  if (selector.startsWith("runtime-init.")) {
    const data = evidence as RuntimeInitializationEvidence
    return { environment: { platform: data.environment.platform, architecture: data.environment.architecture,
      osRelease: data.environment.osRelease, cpu: data.environment.cpu, repetitions: data.environment.repetitions },
      protocol: data.protocol, nodes: data.scenarios.map(scenario => ({ runtime: scenario.runtime, format: scenario.format, node: scenario.node })) }
  }
  if (selector.startsWith("benchmark.")) {
    const data = evidence as BenchmarkSummaryEvidence
    return { environment: data.environment, protocol: data.protocol, fixtures: data.fixtures,
      scenarios: data.results.map(({ name, sampleKind, iterationsPerSample, warmupIterations, samplesPerRun }) =>
        ({ name, sampleKind, iterationsPerSample, warmupIterations, samplesPerRun })) }
  }
  const identity = (evidence as EditorScaleEvidence).identity
  return { bun: identity.bun, node: identity.node, platform: identity.platform, arch: identity.arch, osRelease: identity.osRelease,
    cpuModel: identity.cpuModel, logicalCpus: identity.logicalCpus, totalMemoryBytes: identity.totalMemoryBytes,
    typescript: identity.typescript, tsgo: identity.tsgo, manifest: (evidence as EditorScaleEvidence).manifest }
}

type EffectBoundaryEvidence = {
  effect: string
  build: unknown
  protocol: unknown
  environment: { platform: string; architecture: string }
  results: Array<{ scenario: string; format: string; graph: { bytes: number }; samples: Array<{ loadMs: number; node: string }> }>
}
type BenchmarkSummaryEvidence = {
  environment: unknown
  protocol: unknown
  fixtures: unknown
  results: Array<{ name: string; sampleKind: string; iterationsPerSample: number; warmupIterations: number; samplesPerRun: number; runBatchMeanP50Ms: number[] }>
}
type RuntimeInitializationEvidence = {
  environment: { platform: string; architecture: string; osRelease: string; cpu: string; repetitions: number }
  protocol: string
  scenarios: Array<{ runtime: string; format: string; node: string; samples: Array<{ loadMs: number }> }>
}
type BenchmarkRunEvidence = {
  sourceRevision: string
  environment: unknown
  protocol: unknown
  fixtures: unknown
  metrics: Array<{ name: string; sampleKind: string; iterationsPerSample: number; warmupIterations: number; samples: number; batchMeanP50Ms: number }>
}
type EditorScaleEvidence = {
  identity: { bun: string; node: string; platform: string; arch: string; osRelease: string; cpuModel: string; logicalCpus: number; totalMemoryBytes: number; typescript: string; tsgo: string }
  manifest: unknown
  compilerRuns: Array<{ engine: string; scale: number; wallMs: number; diagnostics: { memoryKiB: number; instantiations: number } }>
  completionRuns: Array<{ scale: number; firstCompletionMs: number; warmCompletionMs: number }>
}

function numbers(values: unknown[]): number[] {
  if (values.length === 0 || values.some(value => typeof value !== "number" || !Number.isFinite(value))) throw Error("Evidence selector did not produce finite numbers")
  return values as number[]
}
function median(values: unknown[]): number {
  const sorted = numbers(values).sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]!
}
function maximaByRepetition(series: number[][]): number[] {
  if (series.length === 0 || new Set(series.map(values => values.length)).size !== 1) throw Error("Evidence series are absent or have unequal repetition counts")
  return series[0]!.map((_, index) => Math.max(...series.map(values => values[index]!)))
}
function summarizeEnvelope(values: number[]) {
  const valid = numbers(values), middle = median(valid), min = Math.min(...valid), max = Math.max(...valid)
  const maxDeviationPercent = middle === 0 ? 0 : Math.max(Math.abs(min - middle), Math.abs(max - middle)) / Math.abs(middle) * 100
  return { min, median: middle, max, maxDeviationPercent }
}
function roundUpToFive(value: number): number { return Math.ceil(value / 5) * 5 }
function unique(values: unknown[]): number {
  const valid = numbers(values)
  if (new Set(valid).size !== 1) throw Error("Evidence selector did not produce one stable value")
  return valid[0]!
}
