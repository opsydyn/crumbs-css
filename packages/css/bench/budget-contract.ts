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
  "effect.runtime.max-median-load-ms",
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
      const actual = extractBaseline(metric.baseline.selector, evidence)
      if (!Object.is(actual, metric.baseline.value)) {
        issues.push({ id: metric.id, code: "baseline-value-mismatch", message: `Recorded ${metric.baseline.value}; evidence resolves to ${actual}` })
      }
    } catch (error) {
      issues.push({ id: metric.id, code: "unreadable-evidence", message: error instanceof Error ? error.message : "Evidence could not be read" })
    }
  }
  return issues
}

function extractBaseline(selector: typeof BaselineSelectorSchema.Type, evidence: unknown): number {
  if (selector === "effect.runtime.cjs.graph-bytes") {
    const data = evidence as EffectBoundaryEvidence
    return unique(data.results.filter(entry => entry.scenario === "runtime" && entry.format === "cjs").map(entry => entry.graph.bytes))
  }
  if (selector === "effect.runtime.max-median-load-ms") {
    const data = evidence as EffectBoundaryEvidence
    return maximum(data.results.filter(entry => entry.scenario === "runtime").map(entry => entry.summary.loadMs.median))
  }
  if (selector === "benchmark.cold-transform.max-median-ms" || selector === "benchmark.warm-transform.max-median-ms") {
    const data = evidence as BenchmarkSummaryEvidence
    const prefix = selector.includes(".cold-") ? "first transform " : "warm transform "
    return maximum(data.results.filter(entry => entry.name.startsWith(prefix)).map(entry => entry.medianOfRunBatchMeanP50Ms))
  }
  const data = evidence as EditorScaleEvidence
  const compiler = selector.match(/^editor\.(tsc|tsgo)\.10000\.(wall-ms|memory-kib|instantiations)(?:\.median)?$/)
  if (compiler) {
    const runs = data.compilerRuns.filter(entry => entry.engine === compiler[1] && entry.scale === 10000)
    const values = runs.map(entry => compiler[2] === "wall-ms" ? entry.wallMs
      : compiler[2] === "memory-kib" ? entry.diagnostics.memoryKiB : entry.diagnostics.instantiations)
    return compiler[2] === "instantiations" ? unique(values) : median(values)
  }
  const completion = selector.match(/^editor\.10000\.(first|warm)-completion-ms\.median$/)
  if (completion) {
    const key = completion[1] === "first" ? "firstCompletionMs" : "warmCompletionMs"
    return median(data.completionRuns.filter(entry => entry.scale === 10000).map(entry => entry[key]))
  }
  throw Error(`Unsupported baseline selector: ${selector}`)
}

type EffectBoundaryEvidence = { results: Array<{ scenario: string; format: string; graph: { bytes: number }; summary: { loadMs: { median: number } } }> }
type BenchmarkSummaryEvidence = { results: Array<{ name: string; medianOfRunBatchMeanP50Ms: number }> }
type EditorScaleEvidence = {
  compilerRuns: Array<{ engine: string; scale: number; wallMs: number; diagnostics: { memoryKiB: number; instantiations: number } }>
  completionRuns: Array<{ scale: number; firstCompletionMs: number; warmCompletionMs: number }>
}

function numbers(values: unknown[]): number[] {
  if (values.length === 0 || values.some(value => typeof value !== "number" || !Number.isFinite(value))) throw Error("Evidence selector did not produce finite numbers")
  return values as number[]
}
function maximum(values: unknown[]): number { return Math.max(...numbers(values)) }
function median(values: unknown[]): number {
  const sorted = numbers(values).sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]!
}
function unique(values: unknown[]): number {
  const valid = numbers(values)
  if (new Set(valid).size !== 1) throw Error("Evidence selector did not produce one stable value")
  return valid[0]!
}
