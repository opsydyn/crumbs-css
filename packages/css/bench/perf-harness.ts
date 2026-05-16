export type BenchmarkBudget = {
  readonly maxP95Ms?: number
  readonly minHz?: number
}

export type BenchmarkMetric = {
  readonly budget?: BenchmarkBudget
  readonly hz: number
  readonly iterations: number
  readonly maxMs: number
  readonly meanMs: number
  readonly minMs: number
  readonly name: string
  readonly p50Ms: number
  readonly p95Ms: number
  readonly samples: number
  readonly totalMs: number
  readonly warmupIterations: number
}

export type SyncBenchmarkOptions = {
  readonly budget?: BenchmarkBudget
  readonly iterationsPerSample: number
  readonly name: string
  readonly run: () => unknown
  readonly samples: number
  readonly warmupIterations?: number
}

export type AsyncBenchmarkOptions = {
  readonly budget?: BenchmarkBudget
  readonly iterationsPerSample: number
  readonly name: string
  readonly run: () => Promise<unknown>
  readonly samples: number
  readonly warmupIterations?: number
}

let blackhole: unknown

export function consumeBenchmarkValue(value: unknown): void {
  blackhole = value
}

export function readBenchmarkValue(): unknown {
  return blackhole
}

export function measureSync({
  budget,
  iterationsPerSample,
  name,
  run,
  samples,
  warmupIterations = iterationsPerSample,
}: SyncBenchmarkOptions): BenchmarkMetric {
  for (let iteration = 0; iteration < warmupIterations; iteration += 1) {
    consumeBenchmarkValue(run())
  }

  const sampleDurations: number[] = []
  for (let sample = 0; sample < samples; sample += 1) {
    const startedAt = performance.now()
    for (let iteration = 0; iteration < iterationsPerSample; iteration += 1) {
      consumeBenchmarkValue(run())
    }
    sampleDurations.push(performance.now() - startedAt)
  }

  return summarizeSamples({
    ...(budget === undefined ? {} : { budget }),
    iterationsPerSample,
    name,
    sampleDurations,
    warmupIterations,
  })
}

export async function measureAsync({
  budget,
  iterationsPerSample,
  name,
  run,
  samples,
  warmupIterations = iterationsPerSample,
}: AsyncBenchmarkOptions): Promise<BenchmarkMetric> {
  for (let iteration = 0; iteration < warmupIterations; iteration += 1) {
    consumeBenchmarkValue(await run())
  }

  const sampleDurations: number[] = []
  for (let sample = 0; sample < samples; sample += 1) {
    const startedAt = performance.now()
    for (let iteration = 0; iteration < iterationsPerSample; iteration += 1) {
      consumeBenchmarkValue(await run())
    }
    sampleDurations.push(performance.now() - startedAt)
  }

  return summarizeSamples({
    ...(budget === undefined ? {} : { budget }),
    iterationsPerSample,
    name,
    sampleDurations,
    warmupIterations,
  })
}

export function summarizeSamples({
  budget,
  iterationsPerSample,
  name,
  sampleDurations,
  warmupIterations,
}: {
  readonly budget?: BenchmarkBudget
  readonly iterationsPerSample: number
  readonly name: string
  readonly sampleDurations: ReadonlyArray<number>
  readonly warmupIterations: number
}): BenchmarkMetric {
  if (sampleDurations.length === 0) {
    throw new Error("Benchmark must include at least one sample")
  }

  const iterations = iterationsPerSample * sampleDurations.length
  const totalMs = sampleDurations.reduce((sum, value) => sum + value, 0)
  const sortedDurations = [...sampleDurations].sort((a, b) => a - b)
  const perIteration = sortedDurations.map((duration) => duration / iterationsPerSample)
  const meanMs = totalMs / iterations

  return {
    ...(budget === undefined ? {} : { budget }),
    hz: iterations / (totalMs / 1000),
    iterations,
    maxMs: lastValue(sortedDurations) / iterationsPerSample,
    meanMs,
    minMs: firstValue(sortedDurations) / iterationsPerSample,
    name,
    p50Ms: percentile(perIteration, 0.5),
    p95Ms: percentile(perIteration, 0.95),
    samples: sampleDurations.length,
    totalMs,
    warmupIterations,
  }
}

export function assertBenchmarkBudget(metric: BenchmarkMetric): void {
  if (metric.budget?.maxP95Ms !== undefined && metric.p95Ms > metric.budget.maxP95Ms) {
    throw new Error(
      `${metric.name} p95 ${formatMs(metric.p95Ms)} exceeded budget ${formatMs(
        metric.budget.maxP95Ms,
      )}`,
    )
  }

  if (metric.budget?.minHz !== undefined && metric.hz < metric.budget.minHz) {
    throw new Error(
      `${metric.name} throughput ${formatHz(metric.hz)} fell below budget ${formatHz(
        metric.budget.minHz,
      )}`,
    )
  }
}

export function formatMetric(metric: BenchmarkMetric): string {
  const budget = metric.budget === undefined ? "" : `budget=${formatBudget(metric.budget)}`
  return [
    metric.name,
    `hz=${formatHz(metric.hz)}`,
    `mean=${formatMs(metric.meanMs)}`,
    `p50=${formatMs(metric.p50Ms)}`,
    `p95=${formatMs(metric.p95Ms)}`,
    `samples=${metric.samples}`,
    `iterations=${metric.iterations}`,
    budget,
  ]
    .filter(Boolean)
    .join(" ")
}

function percentile(sortedValues: ReadonlyArray<number>, percentileRank: number): number {
  if (sortedValues.length === 1) return firstValue(sortedValues)
  const index = Math.ceil(sortedValues.length * percentileRank) - 1
  return sortedValues[Math.max(0, Math.min(sortedValues.length - 1, index))] ?? 0
}

function firstValue(values: ReadonlyArray<number>): number {
  const value = values[0]
  if (value === undefined) throw new Error("Benchmark must include at least one sample")
  return value
}

function lastValue(values: ReadonlyArray<number>): number {
  const value = values[values.length - 1]
  if (value === undefined) throw new Error("Benchmark must include at least one sample")
  return value
}

function formatBudget(budget: BenchmarkBudget): string {
  return Object.entries(budget)
    .map(([key, value]) => `${key}:${typeof value === "number" ? value.toString() : value}`)
    .join(",")
}

function formatHz(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")}ops/s`
}

function formatMs(value: number): string {
  return `${value.toFixed(6)}ms`
}
