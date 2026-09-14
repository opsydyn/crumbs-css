import { describe, expect, it } from "bun:test"
import {
  assertBenchmarkBudget,
  formatMetric,
  measureAsync,
  summarizeSamples,
} from "../bench/perf-harness"

describe("native-styles perf harness", () => {
  it("summarizes sample durations into explicit batch-mean metrics with raw samples", () => {
    const metric = summarizeSamples({
      iterationsPerSample: 10,
      name: "resolver",
      sampleDurations: [10, 20, 30, 40],
      warmupIterations: 5,
    })

    expect(metric).toMatchObject({
      hz: 400,
      iterations: 40,
      batchMeanMaxMs: 4,
      meanOperationMs: 2.5,
      batchMeanMinMs: 1,
      name: "resolver",
      batchMeanP50Ms: 2,
      batchMeanP95Ms: 4,
      iterationsPerSample: 10,
      sampleKind: "batch-mean-ms-per-operation",
      sampleDurationsMs: [10, 20, 30, 40],
      samples: 4,
      totalMs: 100,
      warmupIterations: 5,
    })
  })

  it("formats metrics for human-readable benchmark output", () => {
    const metric = summarizeSamples({
      budget: {
        maxBatchMeanP95Ms: 1,
      },
      iterationsPerSample: 10,
      name: "resolver",
      sampleDurations: [10],
      warmupIterations: 1,
    })

    expect(formatMetric(metric)).toContain("resolver hz=1,000ops/s mean-operation=1.000000ms")
    expect(formatMetric(metric)).toContain("batch-mean-p95=1.000000ms");
    expect(formatMetric(metric)).not.toMatch(/(?:^| )p95=/);
    expect(formatMetric(metric)).toContain("budget=maxBatchMeanP95Ms:1")
  })

  it("fails when a benchmark exceeds its p95 budget", () => {
    const metric = summarizeSamples({
      budget: {
        maxBatchMeanP95Ms: 1,
      },
      iterationsPerSample: 1,
      name: "slow resolver",
      sampleDurations: [2],
      warmupIterations: 1,
    })

    expect(() => assertBenchmarkBudget(metric)).toThrow(
      "slow resolver batch-mean-p95 2.000000ms exceeded budget 1.000000ms",
    )
  })

  it("measures async work", async () => {
    const metric = await measureAsync({
      iterationsPerSample: 2,
      name: "async",
      run: async () => "ok",
      samples: 2,
      warmupIterations: 1,
    })

    expect(metric.iterations).toBe(4)
    expect(metric.samples).toBe(2)
    expect(metric.hz).toBeGreaterThan(0)
  })
})

describe("benchmark input integrity", () => {
  it("rejects invalid counts and durations instead of emitting meaningless rates", () => {
    const valid = { iterationsPerSample: 10, name: "integrity", sampleDurations: [10], warmupIterations: 0 }
    for (const iterationsPerSample of [0, -1, 0.5, Infinity]) expect(() => summarizeSamples({ ...valid, iterationsPerSample })).toThrow()
    for (const sampleDurations of [[], [NaN], [Infinity], [-1], [0]]) expect(() => summarizeSamples({ ...valid, sampleDurations })).toThrow()
    expect(() => summarizeSamples({ ...valid, warmupIterations: -1 })).toThrow()
  })
})
