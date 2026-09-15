import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import {
  budgetRegistryCodec,
  compareRecordedMetrics,
  createThresholdReviewPacket,
  summarizeBenchmarkReports,
} from "../packages/css/bench/budget-contract"
import { runEffectBoundaryAudit } from "../packages/css/bench/effect-boundary-audit"
import { measureRuntimeInitialization } from "../packages/css/bench/runtime-initialization"
import { measureMetroIncremental } from "../packages/css/bench/metro-incremental"

const repoRoot = resolve(import.meta.dir, "..")
const output = resolve(process.argv[2] ?? "docs/evidence/current-host-budgets")
const floorNode = process.env.CRUMBS_AUDIT_NODE_FLOOR
if (!floorNode) throw Error("CRUMBS_AUDIT_NODE_FLOOR is required")
await mkdir(output, { recursive: true })

const sourceRevision = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: repoRoot }).stdout.toString().trim()
const effect = (await runEffectBoundaryAudit(floorNode, 5)).result
await writeFile(join(output, "effect.json"), JSON.stringify(effect, null, 2) + "\n")
const runtimeInit = measureRuntimeInitialization(floorNode, 15)
await writeFile(join(output, "runtime-initialization.json"), JSON.stringify(runtimeInit, null, 2) + "\n")
const incremental = await measureMetroIncremental(join(output, "metro-incremental.json"), 5, Number(process.env.CRUMBS_METRO_PORT ?? 8093))

const benchmarkRuns: unknown[] = []
for (let repetition = 1; repetition <= 5; repetition += 1) {
  const file = join(output, `benchmark-${repetition}.json`)
  const child = Bun.spawn([process.execPath, "packages/css/bench/native-styles.bench.ts"], {
    cwd: repoRoot,
    env: { ...process.env, CRUMBS_BENCH_JSON_OUTPUT: file },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
  ])
  if (exitCode !== 0) throw Error(`Benchmark repetition ${repetition} failed: ${stdout}\n${stderr}`)
  benchmarkRuns.push(JSON.parse(await readFile(file, "utf8")))
}
const benchmark = summarizeBenchmarkReports(benchmarkRuns)
await writeFile(join(output, "benchmark-summary.json"), JSON.stringify(benchmark, null, 2) + "\n")

const editorFile = join(output, "editor.json")
const editorChild = Bun.spawn([process.execPath, "scripts/editor-scale.ts", "measure", editorFile, "5"], {
  cwd: repoRoot,
  env: { ...process.env, CRUMBS_SOURCE_REVISION: `${sourceRevision} M1.8b working tree` },
  stdout: "pipe",
  stderr: "pipe",
})
const [editorExit, editorStdout, editorStderr] = await Promise.all([
  editorChild.exited, new Response(editorChild.stdout).text(), new Response(editorChild.stderr).text(),
])
if (editorExit !== 0) throw Error(`Editor measurement failed: ${editorStdout}\n${editorStderr}`)
const editor = JSON.parse(await readFile(editorFile, "utf8")) as unknown

const registryResult = budgetRegistryCodec.decodeJson(await readFile(join(repoRoot, "packages/css/bench/budgets.json"), "utf8"))
if (!registryResult.ok) throw Error(`Budget registry invalid: ${JSON.stringify(registryResult.issues)}`)
const comparison = compareRecordedMetrics(registryResult.value, repoRoot, { effect, runtimeInit, benchmark, incremental, editor })
const review = createThresholdReviewPacket(registryResult.value, repoRoot)
await writeFile(join(output, "comparison.json"), JSON.stringify({
  formatVersion: 1,
  recordedAt: new Date().toISOString(),
  sourceRevision,
  sourceState: "M1.8b working tree; retained reports carry detailed source and environment identity",
  ...comparison,
}, null, 2) + "\n")
await writeFile(join(output, "threshold-review.json"), JSON.stringify(review, null, 2) + "\n")
console.log(`HOST_BUDGET_REPORT ${output}`)
