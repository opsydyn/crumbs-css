import { describe, expect, it } from "bun:test"
import {
  assertBenchmarkBudget,
  formatMetric,
  measureAsync,
  summarizeSamples,
} from "../bench/perf-harness"

describe("native-styles perf harness", () => {
  it("summarizes sample durations into per-iteration metrics", () => {
    const metric = summarizeSamples({
      iterationsPerSample: 10,
      name: "resolver",
      sampleDurations: [10, 20, 30, 40],
      warmupIterations: 5,
    })

    expect(metric).toMatchObject({
      hz: 400,
      iterations: 40,
      maxMs: 4,
      meanMs: 2.5,
      minMs: 1,
      name: "resolver",
      p50Ms: 2,
      p95Ms: 4,
      samples: 4,
      totalMs: 100,
      warmupIterations: 5,
    })
  })

  it("formats metrics for human-readable benchmark output", () => {
    const metric = summarizeSamples({
      budget: {
        maxP95Ms: 1,
      },
      iterationsPerSample: 10,
      name: "resolver",
      sampleDurations: [10],
      warmupIterations: 1,
    })

    expect(formatMetric(metric)).toContain("resolver hz=1,000ops/s mean=1.000000ms")
    expect(formatMetric(metric)).toContain("budget=maxP95Ms:1")
  })

  it("fails when a benchmark exceeds its p95 budget", () => {
    const metric = summarizeSamples({
      budget: {
        maxP95Ms: 1,
      },
      iterationsPerSample: 1,
      name: "slow resolver",
      sampleDurations: [2],
      warmupIterations: 1,
    })

    expect(() => assertBenchmarkBudget(metric)).toThrow(
      "slow resolver p95 2.000000ms exceeded budget 1.000000ms",
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
