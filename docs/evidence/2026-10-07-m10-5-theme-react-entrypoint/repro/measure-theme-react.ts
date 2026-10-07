import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath, pathToFileURL } from "node:url"
import { readEmittedGraph } from "../../../../packages/css/bench/effect-boundary-audit.ts"

const scriptRoot = resolve(fileURLToPath(new URL(".", import.meta.url)))
const repoRoot = resolve(scriptRoot, "../../../../")
const packageRoot = resolve(repoRoot, "packages/css")
const entries = {
  compatibility: { esm: `${packageRoot}/dist/theme.mjs`, cjs: `${packageRoot}/dist/theme.cjs` },
  core: { esm: `${packageRoot}/dist/theme-core.mjs`, cjs: `${packageRoot}/dist/theme-core.cjs` },
  react: { esm: `${packageRoot}/dist/theme-react.mjs`, cjs: `${packageRoot}/dist/theme-react.cjs` },
}
const floorNode = process.env.CRUMBS_AUDIT_NODE_FLOOR
if (!floorNode) throw new Error("CRUMBS_AUDIT_NODE_FLOOR required")
const currentNode = process.env.CRUMBS_AUDIT_NODE_CURRENT ?? spawnSync("node", ["-p", "process.execPath"], { encoding: "utf8" }).stdout.trim()
const nodePaths = { node22: floorNode, node24: currentNode }
const nodeVersions = Object.fromEntries(Object.entries(nodePaths).map(([key, node]) => [key, spawnSync(node, ["-p", "process.version"], { encoding: "utf8" }).stdout.trim()]))
const officialGraph = JSON.parse(readFileSync(resolve(repoRoot, "docs/evidence/2026-10-07-m10-5-final-host-budget-gate/host-budgets/runtime-graph.json"), "utf8"))
const graph = Object.fromEntries(Object.entries(entries).map(([entry, formats]) => [entry,
  Object.fromEntries(Object.entries(formats).map(([format, file]) => {
    const scans = Array.from({ length: 5 }, () => readEmittedGraph(file))
    if (scans.some(scan => scan.bytes !== scans[0]!.bytes || JSON.stringify(scan.artifacts) !== JSON.stringify(scans[0]!.artifacts))) throw new Error(`Non-deterministic graph: ${entry}/${format}`)
    return [format, { bytes: scans[0]!.bytes, externals: scans[0]!.externals, nonliteralLoads: scans[0]!.nonliteralLoads,
      artifacts: scans[0]!.artifacts.map(item => ({ file: item.file.replace(`${packageRoot}/dist/`, ""), bytes: item.bytes, sha256: item.sha256 })) }]
  }))
]))
const approvedGraphMatches = Object.fromEntries([["compatibility", "theme"], ["core", "theme-core"]].map(([candidateName, officialName]) => [candidateName,
  Object.fromEntries(["esm", "cjs"].map((format) => {
    const actual = (graph[candidateName] as Record<string, { bytes: number; artifacts: { file: string; bytes: number; sha256: string }[] }>)[format]!
    const baseline = officialGraph.currentGraphs[officialName][format]
    const matches = actual.bytes === baseline.graphBytes && JSON.stringify(actual.artifacts) === JSON.stringify(baseline.artifacts)
    return [format, { matches, approvedBytes: baseline.graphBytes, actualBytes: actual.bytes }]
  }))
]))

function probe(node: string, file: string, format: "esm" | "cjs") {
  const importCode = format === "esm"
    ? `await import(${JSON.stringify(pathToFileURL(file).href)})`
    : `require(${JSON.stringify(file)})`
  const performanceImport = format === "esm" ? `import {performance} from 'node:perf_hooks';` : `const {performance}=require('node:perf_hooks');`
  const script = `${performanceImport} (async()=>{global.gc();const before=process.memoryUsage();const start=performance.now();const api=${importCode};const loadMs=performance.now()-start;global.gc();const after=process.memoryUsage();if(typeof api.ThemeProvider!=='function'||typeof api.useThemedStyles!=='function')throw Error('Missing focused theme API');console.log(JSON.stringify({node:process.version,loadMs,heapDeltaBytes:after.heapUsed-before.heapUsed,rssDeltaBytes:after.rss-before.rss,receipt:'passed',exports:Object.keys(api).sort()}))})().catch(error=>{console.error(error);process.exitCode=1})`
  const result = spawnSync(node, ["--expose-gc", ...(format === "esm" ? ["--input-type=module"] : []), "-e", script], { encoding: "utf8", cwd: packageRoot })
  if (result.status !== 0) throw new Error(`${node} ${file}: ${result.stderr}`)
  return JSON.parse(result.stdout.trim()) as { node: string; loadMs: number; heapDeltaBytes: number; rssDeltaBytes: number; receipt: string; exports: string[] }
}
const initialization: Record<string, unknown> = {}
for (const [runtime, node] of Object.entries(nodePaths)) for (const format of ["esm", "cjs"] as const) for (const entry of ["core", "react"] as const) {
  const file = entries[entry][format]
  const warmup = probe(node, file, format)
  const samples = Array.from({ length: 15 }, () => probe(node, file, format))
  const sorted = samples.map(sample => sample.loadMs).sort((a, b) => a - b)
  initialization[`${runtime}-${format}-${entry}`] = {
    node: samples[0]!.node,
    entrySha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
    warmup: { excluded: true, ...warmup },
    samples,
    summary: { minMs: sorted[0], medianMs: sorted[Math.floor(sorted.length / 2)], maxMs: sorted.at(-1) },
  }
}
const result = {
  formatVersion: 1,
  sourceRevision: spawnSync("git", ["rev-parse", "--short=7", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).stdout.trim() || "897f372",
  baseSourceContentDigest: "23b89158a7642af4a4f7c8693cd79b2a21a34b74bdf52be967c2efd1049bfebd",
  candidate: "Additive ./theme/react entrypoint that re-exports ThemeProvider and common theme hooks from theme-runtime; legacy ./theme/core unchanged",
  environment: { bun: Bun.version, nodePaths, nodeVersions, platform: process.platform, architecture: process.arch },
  protocol: { graph: "five deterministic readEmittedGraph scans of freshly built ESM/CJS artifacts", initialization: "one excluded warmup plus 15 fresh Node processes per entry/runtime/format; --expose-gc, measure dynamic import/require only; assert ThemeProvider and useThemedStyles exports" },
  graph,
  approvedGraphMatches,
  initialization,
}
const output = resolve(process.argv[2] ?? resolve(scriptRoot, "../theme-react-measurements.json"))
await Bun.write(output, JSON.stringify(result, null, 2) + "\n")
console.log(JSON.stringify({ output, graph: Object.fromEntries(Object.entries(graph).map(([key, formats]) => [key, Object.fromEntries(Object.entries(formats as Record<string, { bytes: number }>).map(([format, value]) => [format, value.bytes]))])), initialization: Object.fromEntries(Object.entries(initialization).map(([key, value]) => [key, (value as { summary: unknown }).summary])) }, null, 2))
