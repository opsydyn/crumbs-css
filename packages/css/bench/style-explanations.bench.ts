import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { resolve } from "node:path"
import { explainStyle } from "../src/devtools"
import { resolveThemeTokens } from "../src/theme-runtime"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { formatMetric, measureSync } from "./perf-harness"

const packageRoot = resolve(import.meta.dir, "..")
const fixturePath = resolve(packageRoot, "fixtures/m9-3-style-explanations.css.ts")
const compiled = await transformCssTsToStyleSheet(fixturePath, packageRoot, {
  dev: true,
  useStyleSheet: false,
})
const exports: Record<string, unknown> = Object.create(null)
runInNewContext(compiled.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), {
  exports,
  StyleSheet: { create: (styles: unknown) => styles },
})
// Move VM-created plain data back into this realm for Effect Schema's plain-record checks.
const moduleNamespace = structuredClone(exports) as Readonly<Record<string, unknown>>
const theme = { contract: {}, values: {}, tokens: { "--crumbs-space-small": 8 } }
const ordinary = () => resolveThemeTokens(moduleNamespace.card, theme)
const explained = () => explainStyle({ module: moduleNamespace, exportPath: ["card"], current: { theme } })

const ordinaryResult = ordinary() as Readonly<Record<string, unknown>>
const explanationResult = explained()
const explainedPadding = (explanationResult.resolution.value as Readonly<Record<string, unknown>>).paddingLeft as
  Readonly<Record<string, unknown>>
if (ordinaryResult.paddingLeft !== 8 || explainedPadding.resolvedValue !== 8) {
  throw new Error("Ordinary resolution and explanation benchmark fixtures disagree on the resolved token")
}

const iterationsPerSample = 1_000
const samples = 8
const ordinaryMetric = measureSync({
  iterationsPerSample,
  name: "ordinary resolveThemeTokens for one compiled export",
  run: ordinary,
  samples,
})
const explanationMetric = measureSync({
  iterationsPerSample,
  name: "explainStyle for the same compiled export",
  run: explained,
  samples,
})
const sourceRevision = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
  cwd: packageRoot,
  stdout: "pipe",
}).stdout.toString().trim()
const report = {
  formatVersion: 1,
  recordedAt: new Date().toISOString(),
  sourceRevision,
  sourceState: "Working tree; benchmark source hash identifies the pre-commit run",
  benchmarkSourceSha256: createHash("sha256").update(readFileSync(resolve(import.meta.dir, "style-explanations.bench.ts"))).digest("hex"),
  fixtureSha256: createHash("sha256").update(readFileSync(fixturePath)).digest("hex"),
  runtime: { bun: Bun.version, platform: process.platform, architecture: process.arch },
  protocol: {
    fixture: "One compiler-produced card export with token reference, declaration provenance, and dependency sidecar",
    comparison: "Direct ordinary theme-token resolution and full on-demand explanation use the same export and theme",
    samples: `${samples} batches of ${iterationsPerSample} operations after equal warmup`,
    interpretation: "Diagnostic host measurement only; no pass/fail threshold and no React Native device or frame-time claim",
  },
  explanationToOrdinaryMeanRatio: explanationMetric.meanOperationMs / ordinaryMetric.meanOperationMs,
  metrics: [ordinaryMetric, explanationMetric],
}

console.log(JSON.stringify(report, null, 2))
console.log(formatMetric(ordinaryMetric))
console.log(formatMetric(explanationMetric))
