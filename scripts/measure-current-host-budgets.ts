import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import {
  budgetRegistryCodec,
  compareDiagnosticMetrics,
  compareRecordedMetrics,
  createThresholdReviewPacket,
  summarizeBenchmarkReports,
  verifyDiagnosticBaselines,
  verifyRecordedBaselines,
} from "../packages/css/bench/budget-contract"
import { runEffectBoundaryAudit } from "../packages/css/bench/effect-boundary-audit"
import { scanRuntimeGraphEvidence } from "../packages/css/bench/runtime-graph-budget"
import { measureRuntimeInitialization } from "../packages/css/bench/runtime-initialization"
import { measureMetroIncremental } from "../packages/css/bench/metro-incremental"

import { captureGuaranteesSourceIdentity } from "./guarantees-matrix/source-identity"
import { readdirSync, readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { acceptBenchmarkProcessReport } from "./host-budget-report-collection"

const repoRoot = resolve(import.meta.dir, "..")
const output = resolve(process.argv[2] ?? "docs/evidence/current-host-budgets")
const floorNode = process.env.CRUMBS_AUDIT_NODE_FLOOR
if (!floorNode) throw Error("CRUMBS_AUDIT_NODE_FLOOR is required")
await mkdir(output, { recursive: true })

const sourceBefore = captureGuaranteesSourceIdentity(repoRoot)
function artifactIdentity(){ const root=join(repoRoot,"packages/css/dist"); return readdirSync(root).sort().filter(name=>!name.endsWith(".map")).map(path=>({path,sha256:createHash("sha256").update(readFileSync(join(root,path))).digest("hex")})) }
const artifactsBefore = artifactIdentity()
await writeFile(join(output,"input-identity.json"),JSON.stringify({sourceBefore,artifactsBefore},null,2)+"\n")
const sourceRevision = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: repoRoot }).stdout.toString().trim()
const effect = (await runEffectBoundaryAudit(floorNode, 5)).result
await writeFile(join(output, "effect.json"), JSON.stringify(effect, null, 2) + "\n")
const runtimeGraph = scanRuntimeGraphEvidence(join(repoRoot, "packages/css"), 5)
await writeFile(join(output, "runtime-graph.json"), JSON.stringify(runtimeGraph, null, 2) + "\n")
const runtimeInit = measureRuntimeInitialization(floorNode, 15)
await writeFile(join(output, "runtime-initialization.json"), JSON.stringify(runtimeInit, null, 2) + "\n")
const incremental = await measureMetroIncremental(join(output, "metro-incremental.json"), 5, Number(process.env.CRUMBS_METRO_PORT ?? 8093))

const benchmarkRuns: unknown[] = []
const smokeResults: unknown[] = []
for (let repetition = 1; repetition <= 5; repetition += 1) {
  const file = join(output, `benchmark-${repetition}.json`)
  await import("node:fs/promises").then(fs=>fs.rm(file,{force:true}))
  const child = Bun.spawn([process.execPath, "packages/css/bench/native-styles.bench.ts"], {
    cwd: repoRoot,
    env: { ...process.env, CRUMBS_BENCH_JSON_OUTPUT: file, CRUMBS_BENCH_WARM_TRANSFORM_CWD: "package-root" },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
  ])
  const report = JSON.parse(await readFile(file, "utf8"))
  const printedReport=stdout.slice(stdout.indexOf("{\n"),stdout.lastIndexOf("\n}")+2)
  if(JSON.stringify(JSON.parse(printedReport))!==JSON.stringify(report)) throw Error("Retained benchmark report differs from this process stdout")
  smokeResults.push({ repetition, ...acceptBenchmarkProcessReport(report, exitCode, stderr) })
  await writeFile(join(output, `benchmark-${repetition}.log`), stdout + "\n" + stderr)
  benchmarkRuns.push(report)
}
await writeFile(join(output, "legacy-smoke-results.json"), JSON.stringify(smokeResults, null, 2) + "\n")
const benchmark = summarizeBenchmarkReports(benchmarkRuns)
await writeFile(join(output, "benchmark-summary.json"), JSON.stringify(benchmark, null, 2) + "\n")

const editorFile = join(output, "editor.json")
const editorChild = Bun.spawn([process.execPath, "scripts/editor-scale.ts", "measure", editorFile, "5"], {
  cwd: repoRoot,
  env: { ...process.env, CRUMBS_SOURCE_REVISION: `${sourceRevision} M10.5 working tree` },
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
const baselineIssues = [...verifyRecordedBaselines(registryResult.value, repoRoot), ...verifyDiagnosticBaselines(registryResult.value, repoRoot)]
if (baselineIssues.length > 0) throw Error(`Budget baseline evidence is invalid: ${JSON.stringify(baselineIssues)}`)
const comparison = compareRecordedMetrics(registryResult.value, repoRoot, { effect, runtimeInit, benchmark, incremental, editor, runtimeGraph })
const diagnostic = compareDiagnosticMetrics(registryResult.value, repoRoot, { effect, runtimeInit, benchmark, incremental, editor, runtimeGraph })
const review = createThresholdReviewPacket(registryResult.value, repoRoot)
await writeFile(join(output, "comparison.json"), JSON.stringify({
  formatVersion: 2,
  recordedAt: new Date().toISOString(),
  sourceRevision,
  sourceState: "Working tree based on sourceRevision; retained reports carry detailed source and environment identity",
  diagnostic,
  ...comparison,
}, null, 2) + "\n")
await writeFile(join(output, "threshold-review.json"), JSON.stringify(review, null, 2) + "\n")
const sourceAfter=captureGuaranteesSourceIdentity(repoRoot), artifactsAfter=artifactIdentity()
if(sourceBefore.sha256!==sourceAfter.sha256 || JSON.stringify(artifactsBefore)!==JSON.stringify(artifactsAfter)) throw Error("Host measurement input drift")
await writeFile(join(output,"input-identity.json"),JSON.stringify({sourceBefore,sourceAfter,artifactsBefore,artifactsAfter},null,2)+"\n")
console.log(`HOST_BUDGET_REPORT ${output}`)
