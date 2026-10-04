import { consumerFixtures } from "../test-support/consumer-fixtures"
import { relative, resolve } from "node:path"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { cpus, release } from "node:os"
import type { NativeTheme } from "../src/native-style"
import { resolveRecipeStyle, resolveThemeStyles } from "../src/theme-runtime"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { recipe, rawStyleSelection, selections, styleModule, theme, resolveButton, resolveThemedButton, themedRecipeModule, makeSelectionRun } from "./selection-workload"
import { measureFirstTransform } from "./first-transform"
import { parseWarmTransformCwdMode, resolveWarmTransformCwd, verifyTransformOutputParity, withWorkingDirectory } from "./benchmark-protocol"
import { assertBenchmarkBudget, type BenchmarkMetric, formatMetric, measureAsync, measureSync, summarizeSamples } from "./perf-harness"

const activeTheme = theme as NativeTheme<Record<string, unknown>>
const packageRoot = resolve(import.meta.dir, "..")
const warmTransformCwdMode = parseWarmTransformCwdMode(process.env.CRUMBS_BENCH_WARM_TRANSFORM_CWD)
const consumer = consumerFixtures()
const metrics: BenchmarkMetric[] = []
const scenarios: Array<{ name: string; phase: string; work: string }> = []

// Fail before timing if the handwritten baseline loses default/compound/filter work.
for (const selection of selections) {
  const raw = rawStyleSelection(selection), resolved = resolveRecipeStyle(recipe, selection)
  if (raw.length !== resolved.length || raw.some((style, index) => style !== resolved[index])) throw Error("Raw/recipe benchmark workload mismatch")
}

for (const [name, select, budget] of [
  ["raw equivalent recipe selection", rawStyleSelection, { maxBatchMeanP95Ms: 0.0025, minHz: 400_000 }],
  ["resolveRecipeStyle uncached selection", (selection: Parameters<typeof rawStyleSelection>[0]) => resolveRecipeStyle(recipe, selection), { maxBatchMeanP95Ms: 0.006, minHz: 150_000 }],
  ["createRecipeResolver uncached selection", resolveButton, { maxBatchMeanP95Ms: 0.006, minHz: 150_000 }],
  ["pre-resolved theme recipe uncached selection", resolveThemedButton, { maxBatchMeanP95Ms: 0.0075, minHz: 125_000 }],
] as const) {
  metrics.push(measureSync({ name, run: makeSelectionRun(select), budget, iterationsPerSample: 25_000, samples: 12 }))
  scenarios.push({ name, phase: "warm-runtime", work: "Same independent 52-input cycle; defaults/partial/full selections, ordered variants, compound checks and output filtering; no recipe-result cache" })
}

const ingressName = "resolve theme module plus recipe selection per call"
metrics.push(measureSync({ name: ingressName, run: makeSelectionRun(selection => resolveRecipeStyle(resolveThemeStyles(themedRecipeModule, activeTheme).button, selection)), iterationsPerSample: 5_000, samples: 12 }))
scenarios.push({ name: ingressName, phase: "warm-runtime-uncached", work: "Recompute one themed recipe module and select on every operation; differs deliberately from pre-resolved selection" })

metrics.push(measureSync({ budget: { maxBatchMeanP95Ms: 1.5 }, iterationsPerSample: 20, name: "resolveThemeStyles 240 exports uncached", run: () => resolveThemeStyles(styleModule, activeTheme), samples: 12 }))
scenarios.push({ name: "resolveThemeStyles 240 exports uncached", phase: "warm-runtime-uncached", work: "Traverse/allocate/resolve all 240 style exports each call; no provider or React memoization" })

const transformReceipts: Array<{ name: string; cold: Awaited<ReturnType<typeof measureFirstTransform>>[]; warmedOutputSha256: string; coldWarmOutputParity: boolean }> = []
for (const [label, fixture, root, ceiling] of [
  ["README recipe fixture", resolve(packageRoot, "examples/recipe.css.ts"), packageRoot, 100],
  ["package-owned consumer button fixture", consumer.button, consumer.root, 150],
] as const) {
  const cold = []
  for (let sample = 0; sample < 6; sample++) cold.push(await measureFirstTransform(fixture, root))
  const coldName = `first transform ${label}`
  metrics.push(summarizeSamples({ name: coldName, iterationsPerSample: 1, sampleDurations: cold.map(sample => sample.durationMs), warmupIterations: 0 }))
  scenarios.push({ name: coldName, phase: "fresh-process-first-transform", work: "One transform per fresh Bun process; imports/startup excluded, lazy compiler initialization included; OS caches uncontrolled; no cold budget calibrated" })
  const warmCwd = resolveWarmTransformCwd(warmTransformCwdMode, packageRoot, root)
  const output = await withWorkingDirectory(warmCwd, () =>
    transformCssTsToStyleSheet(fixture, root, { strictDiagnostics: true }),
  )
  const warmedOutputSha256 = createHash("sha256").update(output).digest("hex")
  const coldWarmOutputParity = verifyTransformOutputParity(cold, warmedOutputSha256, warmCwd === root)
  transformReceipts.push({ name: label, cold, warmedOutputSha256, coldWarmOutputParity })
  const warmName = `warm transform ${label}`
  metrics.push(await withWorkingDirectory(warmCwd, () => measureAsync({ name: warmName, budget: { maxBatchMeanP95Ms: ceiling }, iterationsPerSample: 1, run: () => transformCssTsToStyleSheet(fixture, root, { strictDiagnostics: true }), samples: 6, warmupIterations: 1 })))
  scenarios.push({ name: warmName, phase: "same-process-warm-transform", work: `Repeated full transform calls after setup/warmup; process cwd is ${warmTransformCwdMode}; package-info/esbuild state may be warm; no transform-result cache` })
}

// Preserve measurements even if a legacy smoke ceiling fails. These are not M1.8 budgets.
const report = {
  formatVersion: 2, recordedAt: new Date().toISOString(),
  sourceRevision: Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: packageRoot, stdout: "pipe" }).stdout.toString().trim(),
  sourceState: "Working tree; source/fixture hashes identify this pre-commit benchmark",
  sourceFiles: ["bench/native-styles.bench.ts", "bench/benchmark-protocol.ts", "bench/selection-workload.ts", "bench/first-transform.ts", "bench/perf-harness.ts", "src/theme-runtime.ts", "src/transformer.ts"].map(relative => ({ relative, sha256: createHash("sha256").update(readFileSync(resolve(packageRoot, relative))).digest("hex") })),
  environment: { bun: Bun.version, platform: process.platform, architecture: process.arch, osRelease: release(), cpu: cpus()[0]?.model, nodeEnv: process.env.NODE_ENV ?? "unset" },
  fixtures: [resolve(packageRoot, "examples/recipe.css.ts"), consumer.button, consumer.shared, consumer.theme].map(file => ({ file: relative(packageRoot, file).replaceAll("\\", "/"), sha256: createHash("sha256").update(readFileSync(file)).digest("hex") })),
  protocol: { quantiles: "Nearest-rank quantiles of batch-average milliseconds per operation, never individual operation/GC tails; one-iteration transform samples are individual transform observations", ordering: warmTransformCwdMode === "package-root"
    ? "Sequential scenarios in listed order; warmup excluded; cold transforms use fixture-root cwd; warm transforms use package-root cwd; fixture paths are package-relative; filesystem caches uncontrolled"
    : "Sequential scenarios in listed order; warmup excluded; cold and warm transforms use the same fixture-root process cwd; fixture paths are package-relative; filesystem caches uncontrolled",
  warmTransformCwd: warmTransformCwdMode, budgets: "Existing host smoke ceilings retained with corrected names; new ingress/cold scenarios have no calibrated budget; M1.8 remains open", runtimeCaching: "createRecipeResolver is an uncached closure. Pre-resolved theme selection amortizes earlier resolution, not a recipe cache hit. React useMemo reuse/invalidation is not measured by this pure host harness." },
  selectionsPerCycle: selections.length, metrics, scenarios, transformReceipts,
  capabilities: [
    { name: "recipe result cache", status: "not-implemented", reason: "Current createRecipeResolver delegates to resolveRecipeStyle on every call; M4 owns future caches." },
    { name: "React theme memo cache hits/invalidation", status: "not-run", reason: "useThemedStyles uses React useMemo; this host harness times pure resolution and pre-resolved selection, not render/provider lifecycle." },
    { name: "native-device performance", status: "not-run", reason: "This host Bun harness does not measure Hermes, rendering or device frame times; native qualification is separate." },
  ],
}
const reportJson = JSON.stringify(report, null, 2) + "\n"
console.log(reportJson.trimEnd())
if (process.env.CRUMBS_BENCH_JSON_OUTPUT) await Bun.write(process.env.CRUMBS_BENCH_JSON_OUTPUT, reportJson)
for (const metric of metrics) { console.log(formatMetric(metric)); assertBenchmarkBudget(metric) }
