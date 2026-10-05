"use strict"
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")
const root = path.resolve(__dirname, "../../..")
const sha = value => crypto.createHash("sha256").update(value).digest("hex")
const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, name)))
const trace = read("captured-trace.json")
const raw = read("raw-replay.json")
const controls = read("controls.json")
assert.equal(trace.records.length, 7)
assert.equal(trace.bundleBytes, null)
assert(trace.serializationError.startsWith("Unexpected module with full source map found:"))
assert.equal(raw.runs.length, 9)
const median = values => { const sorted = values.slice().sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2 }
for (const summary of raw.summary) {
  const selected = raw.runs.filter(run => `${run.mode}:${run.capacity}` === summary.variant)
  assert.equal(selected.length, 3)
  const warmMedians = selected.map(run => median(run.records.filter(r => r.kind === "transform").slice(7).map(r => r.elapsedMs)))
  assert.equal(summary.medianWarmTransformMs, median(warmMedians))
  assert.equal(summary.medianTotalMs, median(selected.map(run => run.totalMs)))
}
function expanded(data, record) {
  const receipts = new Map(data.inputReceipts.map(x => [x.sha256, x.inputs]))
  for (const receipt of data.inputReceipts) assert.equal(sha(JSON.stringify(receipt.inputs)), receipt.sha256)
  assert(receipts.has(record.compile.inputSha256))
  return { sourceSha256: record.compile.sourceSha256, inputs: receipts.get(record.compile.inputSha256) }
}
const base = raw.runs.find(run => run.mode === "fresh")
let comparisons = 0, created = 0, disposed = 0, evictions = 0, teardowns = 0
for (const run of raw.runs) {
  assert.equal(run.requests.length, 63)
  assert.equal(run.restored, true)
  assert.deepEqual(run.liveAfterShutdown, [])
  const records = run.records.filter(r => r.kind === "transform")
  assert.equal(records.length, 63)
  for (let i = 0; i < 63; i++) {
    assert.equal(run.requests[i].resultSha256, base.requests[i].resultSha256)
    assert.equal(run.requests[i].entrySha1, base.requests[i].entrySha1)
    assert.equal(records[i].resultSha256, run.requests[i].resultSha256)
    assert(Number.isFinite(records[i].elapsedMs) && records[i].elapsedMs >= 0)
    assert.deepEqual(expanded(raw, records[i]), expanded(raw, base.records.filter(r => r.kind === "transform")[i]))
    comparisons++
  }
  for (const closing of run.records.filter(r => r.kind === "teardown")) {
    assert.equal(closing.counts.created, closing.counts.disposed)
    assert.equal(closing.retained, 0)
    assert.deepEqual(closing.afterStop.services, [])
    created += closing.counts.created; disposed += closing.counts.disposed; evictions += closing.counts.evictions; teardowns++
  }
}
assert.equal(created, 210); assert.equal(disposed, 210); assert.equal(evictions, 177); assert.equal(teardowns, 18)
for (let i = 0; i < 7; i++) {
  assert.equal(base.requests[i].resultSha256, trace.records[i].resultSha256)
  assert.notEqual(base.requests[49 + i].resultSha256, base.requests[i].resultSha256)
  assert.equal(base.requests[56 + i].resultSha256, base.requests[i].resultSha256)
  const absolute = path.resolve(trace.records[i].projectRoot, trace.records[i].file)
  assert.equal(sha(fs.readFileSync(absolute)), trace.records[i].sourceSha256)
}
assert.equal(controls.summary.stockTeardownCallbacks, 0)
assert.equal(controls.runs[0].requests.length, 63)
assert.deepEqual(controls.runs[0].liveAfterShutdown, [])
assert.equal(controls.runs[0].records.filter(r => r.kind === "teardown").length, 0)
assert.equal(controls.runs[0].records.filter(r => r.kind === "transform").at(-1).counts.disposed, 0)
const mismatches = controls.runs.map(run => run.requests.map((r, i) => r.resultSha256 !== base.requests[i].resultSha256 ? i : null).filter(i => i !== null))
assert.deepEqual(mismatches[0], [])
assert.deepEqual(mismatches[1], Array.from({ length: 56 }, (_, i) => i + 7))
for (const data of [raw, controls]) for (const run of data.runs) for (const record of run.records.filter(r => r.kind === "transform")) expanded(data, record)
for (const run of controls.runs) run.records.filter(r => r.kind === "transform").forEach((record, i) => {
  assert.deepEqual(expanded(controls, record), expanded(raw, base.records.filter(r => r.kind === "transform")[i]))
})
const inventory = [
  "packages/css/package.json", "apps/storybook/package.json", "apps/storybook/metro.config.js", "apps/storybook/src/styles/theme.ts",
  ...trace.records.map(r => path.relative(root, path.resolve(r.projectRoot, r.file))),
  ...fs.readdirSync(path.join(root, "packages/css/dist")).filter(name => fs.statSync(path.join(root, "packages/css/dist", name)).isFile()).sort().map(name => "packages/css/dist/" + name),
  ...["full-transform.cjs", "verify.cjs", "captured-trace.json", "raw-replay.json", "controls.json"].map(name => path.relative(root, path.join(__dirname, name))),
].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(root, file))) }))
if (process.argv[2] === "--write-qualification") {
  const result = { formatVersion: 1, roadmap: "M10.5", sourceRevision: trace.sourceRevision, status: "evidence-only; production admission open", environment: { node: raw.node, platform: process.platform, architecture: process.arch, esbuild: "0.27.7", vanillaExtractIntegration: "8.0.10", expo: "56.0.23", expoMetro: "56.0.0" }, checks: { fullResultAndCompileReceiptComparisons: comparisons, cacheVariantRequests: 378, capturedColdResultsMatched: 7, sharedThemeChangesAndRestoration: true, contextsCreated: created, contextsDisposed: disposed, evictions, awaitedWorkerTeardowns: teardowns, processSurvivors: 0, staleCaptureDivergences: 56, stockExplicitDisposals: 0, sourceRestorationVerified: true }, limits: ["Serial replay, one active CSS worker in a two-worker farm", "Final app serialization failed; no bundle or device acceptance", "Telemetry outside transform timer; total durations include instrumentation", "No full-transform concurrency, import-graph/config or error-recovery qualification", "No production cache, capacity selection or performance-budget change; Android last"], inventory }
  fs.writeFileSync(path.join(__dirname, "qualification.json"), JSON.stringify(result, null, 2) + "\n")
} else {
  const qualification = read("qualification.json")
  assert.deepEqual(qualification.inventory, inventory)
}
console.log(JSON.stringify({ comparisons, created, disposed, evictions, teardowns, captureMatched: 7, staleDivergences: 56, inventoryFiles: inventory.length, verified: true }))
