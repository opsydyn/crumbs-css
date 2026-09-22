import { createHash } from "node:crypto"
import { cpus, release } from "node:os"
import { performance } from "node:perf_hooks"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  createSprinklesOutputStrategy,
  flattenStyleArray,
  sprinklesOutputFixture,
  sprinklesOutputStrategies,
  strategyArtifactBytes,
  type SprinklesOutputRuntime,
  type SprinklesOutputStrategy,
} from "./sprinkles-output-workload"

const packageRoot = resolve(import.meta.dir, "..")
const setupSamples = 7
const selectionSamples = 7
const selectionIterations = 20_000
const selectionWarmupIterations = 2_000

type SetupMeasurement = {
  readonly sampleDurationsMs: ReadonlyArray<number>
  readonly medianMs: number
  readonly minimumMs: number
  readonly maximumMs: number
}

type SelectionMeasurement = {
  readonly sampleDurationsMs: ReadonlyArray<number>
  readonly medianOperationMs: number
  readonly meanOperationMs: number
  readonly operationsPerSecond: number
  readonly iterations: number
  readonly samples: number
  readonly warmupIterations: number
  readonly averageArrayLength: number
  readonly maximumArrayLength: number
  readonly averageAllocationUnits: number
  readonly strategyHits: Readonly<Record<"atomic" | "fused", number>>
  readonly checksum: number
}

type StrategyMeasurement = {
  readonly strategy: SprinklesOutputStrategy
  readonly serializedArtifactBytes: number
  readonly setup: SetupMeasurement
  readonly setupAllocations: SprinklesOutputRuntime["setup"]
  readonly selection: SelectionMeasurement
}

function median(values: ReadonlyArray<number>): number {
  const ordered = [...values].sort((left, right) => left - right)
  return ordered[Math.floor((ordered.length - 1) / 2)]!
}

function sourceRevision(): string {
  return Bun.spawnSync(["git", "rev-parse", "HEAD"], {
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  }).stdout.toString().trim()
}

function sha256(relative: string): string {
  return createHash("sha256")
    .update(readFileSync(resolve(packageRoot, relative)))
    .digest("hex")
}

function measureSetup(strategy: SprinklesOutputStrategy): { runtime: SprinklesOutputRuntime; measurement: SetupMeasurement } {
  let runtime: SprinklesOutputRuntime | undefined
  for (let sample = 0; sample < 2; sample++) createSprinklesOutputStrategy(strategy, sprinklesOutputFixture)

  const sampleDurationsMs: number[] = []
  for (let sample = 0; sample < setupSamples; sample++) {
    const startedAt = performance.now()
    runtime = createSprinklesOutputStrategy(strategy, sprinklesOutputFixture)
    sampleDurationsMs.push(performance.now() - startedAt)
  }
  if (runtime === undefined) throw new Error(`No setup runtime recorded for ${strategy}`)
  return {
    runtime,
    measurement: {
      sampleDurationsMs,
      medianMs: median(sampleDurationsMs),
      minimumMs: Math.min(...sampleDurationsMs),
      maximumMs: Math.max(...sampleDurationsMs),
    },
  }
}

function measureSelection(runtime: SprinklesOutputRuntime): SelectionMeasurement {
  for (let iteration = 0; iteration < selectionWarmupIterations; iteration++) {
    runtime.select(sprinklesOutputFixture.workload[iteration % sprinklesOutputFixture.workload.length]!)
  }

  const sampleDurationsMs: number[] = []
  let totalArrayLength = 0
  let maximumArrayLength = 0
  let totalAllocationUnits = 0
  let totalIterations = 0
  let checksum = 0
  let atomicHits = 0
  let fusedHits = 0

  for (let sample = 0; sample < selectionSamples; sample++) {
    const startedAt = performance.now()
    for (let iteration = 0; iteration < selectionIterations; iteration++) {
      const selection = sprinklesOutputFixture.workload[iteration % sprinklesOutputFixture.workload.length]!
      const result = runtime.select(selection)
      totalArrayLength += result.arrayLength
      maximumArrayLength = Math.max(maximumArrayLength, result.arrayLength)
      totalAllocationUnits += result.allocationUnits
      totalIterations++
      checksum = (checksum + result.arrayLength + (result.strategyUsed === "fused" ? 1 : 0)) % 1_000_000_007
      if (result.strategyUsed === "fused") fusedHits++
      else atomicHits++
    }
    sampleDurationsMs.push(performance.now() - startedAt)
  }

  const medianOperationMs = median(sampleDurationsMs) / selectionIterations
  const meanOperationMs = sampleDurationsMs.reduce((total, value) => total + value, 0)
    / (sampleDurationsMs.length * selectionIterations)
  return {
    sampleDurationsMs,
    medianOperationMs,
    meanOperationMs,
    operationsPerSecond: 1_000 / Math.max(medianOperationMs, Number.EPSILON),
    iterations: totalIterations,
    samples: selectionSamples,
    warmupIterations: selectionWarmupIterations,
    averageArrayLength: totalArrayLength / totalIterations,
    maximumArrayLength,
    averageAllocationUnits: totalAllocationUnits / totalIterations,
    strategyHits: { atomic: atomicHits, fused: fusedHits },
    checksum,
  }
}

function measureStrategy(strategy: SprinklesOutputStrategy): StrategyMeasurement {
  const { runtime, measurement } = measureSetup(strategy)
  return {
    strategy,
    serializedArtifactBytes: strategyArtifactBytes(runtime.artifact),
    setup: measurement,
    setupAllocations: runtime.setup,
    selection: measureSelection(runtime),
  }
}

function assertSemanticParity(): void {
  const runtimes = sprinklesOutputStrategies.map(strategy => createSprinklesOutputStrategy(strategy, sprinklesOutputFixture))
  const [atomic, ...alternatives] = runtimes
  for (const selection of sprinklesOutputFixture.selectionSpace) {
    const expected = JSON.stringify(flattenStyleArray(atomic!.select(selection).styles))
    for (const alternative of alternatives) {
      const actual = JSON.stringify(flattenStyleArray(alternative!.select(selection).styles))
      if (expected !== actual) throw new Error(`Output strategy semantic mismatch for ${selection}`)
    }
  }
}

function chooseDefault(measurements: ReadonlyArray<StrategyMeasurement>) {
  const atomic = measurements.find(measurement => measurement.strategy === "atomic")!
  const fused = measurements.find(measurement => measurement.strategy === "fused")!
  const hybrid = measurements.find(measurement => measurement.strategy === "hybrid")!
  const criteria = {
    hybridReducesAverageArrayLength: hybrid.selection.averageArrayLength < atomic.selection.averageArrayLength,
    hybridReducesSelectionAllocations: hybrid.selection.averageAllocationUnits < atomic.selection.averageAllocationUnits,
    hybridAvoidsFusedCartesianArtifact: hybrid.serializedArtifactBytes < fused.serializedArtifactBytes
      && hybrid.setupAllocations.mergedStyleObjects < fused.setupAllocations.mergedStyleObjects,
  }
  const strategy = Object.values(criteria).every(Boolean) ? "hybrid" : "atomic"
  return {
    strategy,
    criteria,
    rationale: strategy === "hybrid"
      ? "Hybrid keeps atomic fallback coverage, fuses only the measured hot selections, and avoids the fused Cartesian artifact."
      : "The measured hybrid did not reduce both selection work measures while avoiding fused expansion; retain atomic output pending a new fixture or native evidence.",
  } as const
}

assertSemanticParity()
const measurements = sprinklesOutputStrategies.map(measureStrategy)
const recommendation = chooseDefault(measurements)
const report = {
  formatVersion: 1,
  recordedAt: new Date().toISOString(),
  sourceRevision: sourceRevision(),
  sourceState: "Working tree; source hashes identify the benchmark and workload inputs",
  sourceFiles: [
    "bench/sprinkles-output.bench.ts",
    "bench/sprinkles-output-workload.ts",
    "test/sprinkles-output-benchmark.test.ts",
  ].map(relative => ({ relative, sha256: sha256(relative) })),
  environment: {
    bun: Bun.version,
    platform: process.platform,
    architecture: process.arch,
    osRelease: release(),
    cpu: cpus()[0]?.model,
    nodeEnv: process.env.NODE_ENV ?? "unset",
  },
  fixture: {
    name: sprinklesOutputFixture.name,
    propertyCount: Object.keys(sprinklesOutputFixture.properties).length,
    atomicStyleEntries: Object.values(sprinklesOutputFixture.properties)
      .reduce((total, scales) => total + Object.keys(scales).length, 0),
    shorthandCount: Object.keys(sprinklesOutputFixture.shorthands).length,
    fullSelectionCount: sprinklesOutputFixture.selectionSpace.length,
    hotSelectionCount: sprinklesOutputFixture.hotSelections.length,
    workloadSelectionCount: sprinklesOutputFixture.workload.length,
  },
  protocol: {
    artifactBytes: "UTF-8 byte length of canonical JSON for the emitted strategy artifact; this is not a Metro/Hermes bundle size",
    setup: "Same-process construction after two warmup constructions; seven sequential samples per strategy; median/minimum/maximum reported",
    selection: `Same ${selectionIterations}-operation workload per sample after ${selectionWarmupIterations} warmup operations; seven sequential samples; selection timing excludes setup`,
    allocationModel: "allocationUnits = returned style-array header plus returned style-reference slots; setup allocations count retained atomic entries, fused entries, lookup containers and merged style objects",
    semantics: "Every full finite selection is compared before timing; later styles win when flattened in authored axis order",
  },
  measurements,
  recommendation,
  capabilities: {
    nativeFrames: {
      status: "not-run",
      reason: "No release Hermes React Native device harness is available in this checkout; frame timing requires the same fixture in the Expo dog-food app.",
      android: "backlogged-until-device-enabled-final-move",
    },
    nativeHeapAllocations: {
      status: "not-run",
      reason: "The allocation field is a deterministic model count, not a native heap trace; device allocation qualification remains separate.",
    },
  },
}

const reportJson = `${JSON.stringify(report, null, 2)}\n`
console.log(reportJson.trimEnd())
const outputPath = process.env.CRUMBS_SPRINKLES_OUTPUT_JSON
if (outputPath !== undefined) await Bun.write(outputPath, reportJson)
for (const measurement of measurements) {
  console.log([
    measurement.strategy,
    `bytes=${measurement.serializedArtifactBytes}`,
    `setupMedianMs=${measurement.setup.medianMs.toFixed(4)}`,
    `selectionMedianUs=${(measurement.selection.medianOperationMs * 1_000).toFixed(3)}`,
    `arrayMean=${measurement.selection.averageArrayLength.toFixed(3)}`,
    `allocationMean=${measurement.selection.averageAllocationUnits.toFixed(3)}`,
  ].join(" "))
}
console.log(`recommendedDefault=${recommendation.strategy}`)
