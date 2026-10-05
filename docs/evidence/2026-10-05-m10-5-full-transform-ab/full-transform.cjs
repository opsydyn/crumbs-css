"use strict"
// Evidence-only injection into the built CJS transformer. No package source is changed.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")
const { spawnSync } = require("node:child_process")
const { performance } = require("node:perf_hooks")
const { createRequire } = require("node:module")
const root = path.resolve(__dirname, "../../..")
const pkg = path.join(root, "packages/css")
const app = path.join(root, "apps/storybook")
const appRequire = createRequire(path.join(app, "package.json"))
const integration = require(require.resolve("@vanilla-extract/integration", { paths: [pkg] }))
const esbuild = require(require.resolve("esbuild", { paths: [require.resolve("@vanilla-extract/integration", { paths: [pkg] })] }))
const freshCompile = integration.compile
const contexts = new Map()
const counts = { hits: 0, misses: 0, created: 0, evictions: 0, disposed: 0 }
const hash = value => crypto.createHash("sha256").update(value).digest("hex")
const log = record => fs.appendFileSync(process.env.CRUMBS_AB_LOG, JSON.stringify({ pid: process.pid, ...record }) + "\n")
let latestCompile
let queue = Promise.resolve()
function processTree() {
  const result = spawnSync("ps", ["-axo", "pid=,ppid=,rss=,comm="], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  const rows = result.stdout.trim().split("\n").map(line => {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/)
    return { pid: Number(match[1]), ppid: Number(match[2]), rssKiB: Number(match[3]), executable: path.basename(match[4]) }
  })
  return rows
}
function memory() {
  return { nodeRssBytes: process.memoryUsage().rss, services: processTree().filter(r => r.ppid === process.pid && r.executable.includes("esbuild")) }
}
async function cachedCompile(request) {
  assert.deepEqual(Object.keys(request.esbuildOptions), ["plugins"])
  assert.equal(request.esbuildOptions.plugins.length, 1)
  assert.equal(request.esbuildOptions.plugins[0].name, "crumbs-capture-deps")
  const key = JSON.stringify([request.filePath, request.cwd, request.identOption])
  let item = contexts.get(key)
  if (item) { counts.hits++; contexts.delete(key); contexts.set(key, item) }
  else {
    counts.misses++
    item = { request }
    item.context = await esbuild.context({
      entryPoints: [request.filePath], metafile: true, bundle: true,
      external: ["@vanilla-extract"], platform: "node", write: false,
      absWorkingDir: request.cwd,
      plugins: [integration.vanillaExtractTransformPlugin({ identOption: request.identOption }), {
        name: "evidence-current-dependency-capture",
        setup(build) { build.onEnd(result => item.request.esbuildOptions.plugins[0].setup({ onEnd: fn => fn(result) })) },
      }],
    })
    contexts.set(key, item); counts.created++
    if (contexts.size > Number(process.env.CRUMBS_AB_CAPACITY)) {
      const oldestKey = contexts.keys().next().value
      const oldest = contexts.get(oldestKey); contexts.delete(oldestKey)
      await oldest.context.dispose(); counts.evictions++; counts.disposed++
    }
  }
  // The dependency-capture closure belongs to THIS transform, even on a cache hit.
  if (process.env.CRUMBS_AB_STALE_CAPTURE !== "1") item.request = request
  const result = await item.context.rebuild()
  assert.equal(result.outputFiles.length, 1)
  return { source: result.outputFiles[0].text, watchFiles: Object.keys(result.metafile.inputs).map(file => path.join(request.cwd, file)) }
}
integration.compile = async request => {
  const result = process.env.CRUMBS_AB_MODE === "cache" ? await cachedCompile(request) : await freshCompile(request)
  latestCompile = { sourceSha256: hash(result.source), inputs: result.watchFiles.slice().sort() }
  return result
}
const transformer = require(path.join(pkg, "dist/transformer.cjs"))
exports.getCacheKey = transformer.getCacheKey
exports.transform = (...args) => {
  // Serialise experimental access to mutable plugin dispatch and native capture.
  const run = async () => {
    const css = args[2].endsWith(".css.ts")
    const start = performance.now()
    const result = await transformer.transform(...args)
    const elapsedMs = performance.now() - start
    if (css) log({ kind: "transform", file: args[2], config: args[0], projectRoot: args[1], options: args[4], sourceSha256: hash(args[3]), resultSha256: hash(JSON.stringify(result)), compile: latestCompile, elapsedMs, counts: { ...counts }, retained: contexts.size, memory: memory() })
    return result
  }
  const pending = queue.then(run)
  queue = pending.catch(() => {})
  return pending
}
exports.close = async () => {
  await queue
  const before = memory()
  for (const item of contexts.values()) { await item.context.dispose(); counts.disposed++ }
  contexts.clear()
  const afterDispose = memory()
  esbuild.stop()
  // stop() requests service termination; poll boundedly for its child to disappear.
  for (let i = 0; i < 50 && memory().services.length; i++) await new Promise(resolve => setTimeout(resolve, 10))
  log({ kind: "teardown", counts, retained: contexts.size, before, afterDispose, afterStop: memory() })
}
function readLog(file) { return fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line)) }
async function capture(scratch) {
  process.chdir(app)
  process.env.EXPO_PUBLIC_STORYBOOK_ENABLED = "true"
  process.env.STORYBOOK_DISABLE_TELEMETRY = "1"
  process.env.EXPO_NO_METRO_WORKSPACE_ROOT = "1"
  process.env.CRUMBS_AB_LOG = path.join(scratch, "capture.jsonl")
  fs.rmSync(process.env.CRUMBS_AB_LOG, { force: true })
  const generated = path.join(app, ".rnstorybook/storybook.requires.ts")
  const generatedSource = fs.readFileSync(generated)
  const config = await appRequire("@expo/metro/metro-config").loadConfig({ cwd: app, config: path.join(app, "metro.config.js") })
  fs.writeFileSync(generated, generatedSource)
  config.watchFolders = [...new Set([...config.watchFolders, fs.realpathSync(path.join(root, "node_modules"))])]
  config.transformerPath = __filename
  config.maxWorkers = 2
  config.cacheStores = []
  config.resetCache = true
  config.fileMapCacheDirectory = scratch
  config.reporter = { update() {} }
  const started = performance.now()
  let result
  let serializationError
  try { result = await appRequire("@expo/metro/metro").runBuild(config, { entry: "index.js", platform: "ios", dev: true, minify: false }) }
  catch (error) {
    // The requests are useful trace evidence even if the app serializer fails.
    // Admit only this observed source-map failure, and record the limited scope.
    if (!error.message.startsWith("Unexpected module with full source map found:")) throw error
    serializationError = error.message
  }
  finally { fs.writeFileSync(generated, generatedSource) }
  const records = readLog(process.env.CRUMBS_AB_LOG)
  assert(records.length > 0)
  const trace = { formatVersion: 1, node: process.version, sourceRevision: spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(), platform: "ios", dev: true, workers: 2, serializationError, bundleBytes: result ? Buffer.byteLength(result.code) : null, bundleSha256: result ? hash(result.code) : null, buildMs: performance.now() - started, records }
  fs.writeFileSync(path.join(__dirname, "captured-trace.json"), JSON.stringify(trace, null, 2) + "\n")
  console.log(JSON.stringify({ cssRequests: records.length, files: records.map(r => path.relative(root, r.file)), bundleBytes: trace.bundleBytes }))
}
async function replay(scratch, mode, capacity, repetition, lifecycle) {
  process.chdir(app)
  process.env.CRUMBS_AB_MODE = mode
  process.env.CRUMBS_AB_CAPACITY = String(capacity)
  const logFile = path.join(scratch, `replay-${mode}-${capacity}-${repetition}-${lifecycle}.jsonl`)
  process.env.CRUMBS_AB_LOG = logFile
  const trace = JSON.parse(fs.readFileSync(path.join(__dirname, "captured-trace.json")))
  const WorkerFarm = appRequire("@expo/metro/metro/DeltaBundler/WorkerFarm").default
  const workerPath = appRequire.resolve("@expo/metro/metro/DeltaBundler/Worker")
  const bootstrap = path.join(scratch, "worker.cjs")
  fs.writeFileSync(bootstrap, `exports.transform = require(${JSON.stringify(workerPath)}).transform\nexports.teardown = require(${JSON.stringify(__filename)}).close\n`)
  class Farm extends WorkerFarm {
    _makeFarm(worker, methods, count) { return super._makeFarm(lifecycle === "adapter" ? bootstrap : worker, methods, count) }
  }
  const first = trace.records[0]
  const originals = new Map(trace.records.map(record => [record.file, fs.readFileSync(record.file, "utf8")]))
  for (const record of trace.records) assert.equal(hash(originals.get(record.file)), record.sourceSha256)
  const themeFile = path.join(app, "src/styles/theme.ts")
  const themeSource = fs.readFileSync(themeFile, "utf8")
  originals.set(themeFile, themeSource)
  const farm = new Farm({ maxWorkers: 2, projectRoot: first.projectRoot, stickyWorkers: true, transformer: { unstable_workerThreads: false }, reporter: { update() {} } }, { transformerPath: __filename, transformerConfig: first.config })
  const requests = []
  const observedPids = new Set()
  const started = performance.now()
  async function request(record, phase, edit) {
    const start = performance.now()
    const value = await farm.transform(record.file, record.options)
    requests.push({ phase, edit, file: path.relative(root, record.file), elapsedMs: performance.now() - start, resultSha256: hash(JSON.stringify(value.result)), entrySha1: value.sha1 })
    for (const r of readLog(logFile)) { observedPids.add(r.pid); for (const service of r.memory?.services ?? []) observedPids.add(service.pid) }
  }
  try {
    for (const record of trace.records) await request(record, "cold", 0)
    // Replay captured order, alternating actual numeric style edits on each entry.
    for (let edit = 1; edit <= 6; edit++) {
      for (const record of trace.records) {
        const original = originals.get(record.file)
        const changed = original.replace(/(\b(?:borderWidth|fontSize|letterSpacing|padding|gap): )(\d+(?:\.\d+)?)/, (_, prefix, n) => prefix + (Number(n) + 1))
        assert.notEqual(changed, original, "edit must change source on odd repetitions")
        fs.writeFileSync(record.file, edit % 2 ? changed : original)
        await request(record, "entry-edit", edit)
      }
    }
    for (let edit = 1; edit <= 2; edit++) {
      const changed = themeSource.replace("control: { height: 48 }", "control: { height: 49 }")
      assert.notEqual(changed, themeSource)
      fs.writeFileSync(themeFile, edit % 2 ? changed : themeSource)
      for (const record of trace.records) await request(record, "theme-edit", edit)
    }
  } finally {
    for (const [file, contents] of originals) fs.writeFileSync(file, contents)
    await farm.kill()
  }
  // Normal Metro workers may take time to exit; include that in lifecycle evidence.
  for (let i = 0; i < 100 && processTree().some(row => observedPids.has(row.pid)); i++) await new Promise(resolve => setTimeout(resolve, 20))
  const records = readLog(logFile)
  const liveAfterShutdown = processTree().filter(row => observedPids.has(row.pid))
  const result = { mode, capacity, repetition, lifecycle, totalMs: performance.now() - started, requests, records, observedPids: [...observedPids], liveAfterShutdown, restored: [...originals].every(([file, contents]) => fs.readFileSync(file, "utf8") === contents) }
  assert(result.restored)
  assert.equal(liveAfterShutdown.length, 0, "worker or service survived shutdown")
  fs.writeFileSync(path.join(scratch, "worker-result.json"), JSON.stringify(result))
  console.log(JSON.stringify({ mode, capacity, repetition, lifecycle, requests: requests.length, shutdownSurvivors: liveAfterShutdown.length }))
}
const median = values => { const sorted = values.slice().sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2 }
function summarize(runs) {
  return ["fresh:0", "cache:4", "cache:8"].map(key => {
    const selected = runs.filter(r => `${r.mode}:${r.capacity}` === key)
    return { variant: key, processes: selected.length, medianTotalMs: median(selected.map(r => r.totalMs)), medianWarmTransformMs: median(selected.map(r => median(r.records.filter(x => x.kind === "transform").slice(r.requests.filter(q => q.phase === "cold").length).map(x => x.elapsedMs)))), counts: selected.map(r => r.records.filter(x => x.kind === "teardown").map(x => x.counts)) }
  })
}
function compactEvidence(data) {
  if (data.inputReceipts) return data
  const receipts = new Map()
  for (const run of data.runs) for (const record of run.records) {
    if (record.kind !== "transform") continue
    const inputSha256 = hash(JSON.stringify(record.compile.inputs))
    receipts.set(inputSha256, record.compile.inputs)
    record.compile = { sourceSha256: record.compile.sourceSha256, inputSha256 }
    // Argument values are retained in captured-trace.json, keyed by record.file.
    delete record.config; delete record.options; delete record.projectRoot
  }
  return { ...data, capturedTraceFile: "captured-trace.json", inputReceipts: [...receipts].map(([sha256, inputs]) => ({ sha256, inputs })) }
}
async function main() {
  const [command, scratch, mode, capacity, repetition, lifecycle] = process.argv.slice(2)
  if (command === "--resummarize") {
    const file = path.join(__dirname, "raw-replay.json")
    const data = JSON.parse(fs.readFileSync(file))
    data.summary = summarize(data.runs)
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n")
    console.log(JSON.stringify(data.summary.map(({ variant, medianWarmTransformMs }) => ({ variant, medianWarmTransformMs }))))
    return
  }
  if (command === "--compact") {
    const file = path.join(__dirname, "raw-replay.json")
    fs.writeFileSync(file, JSON.stringify(compactEvidence(JSON.parse(fs.readFileSync(file))), null, 2) + "\n")
    return
  }
  if (command === "--controls") {
    const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, "raw-replay.json"))).runs.find(run => run.mode === "fresh")
    const runs = ["stock", "stale"].map(name => JSON.parse(fs.readFileSync(path.join(scratch, name, "worker-result.json"))))
    const mismatches = runs.map(run => run.requests.map((request, i) => request.resultSha256 !== baseline.requests[i].resultSha256 ? i : null).filter(i => i !== null))
    assert.equal(mismatches[0].length, 0)
    assert.equal(runs[0].records.filter(r => r.kind === "teardown").length, 0)
    assert.equal(mismatches[1].length, 56)
    assert.equal(mismatches[1][0], 7)
    const summary = { stockResultParity: true, stockTeardownCallbacks: 0, stockProcessSurvivors: runs[0].liveAfterShutdown.length, staleCaptureMismatchCount: mismatches[1].length, staleCaptureFirstMismatchIndex: mismatches[1][0], staleControl: "CRUMBS_AB_STALE_CAPTURE=1 retains the first transform's dependency-capture closure; all 56 cache-hit native/Metro results diverge despite rebuilt esbuild source" }
    fs.writeFileSync(path.join(__dirname, "controls.json"), JSON.stringify(compactEvidence({ formatVersion: 1, summary, runs }), null, 2) + "\n")
    console.log(JSON.stringify(summary))
    return
  }
  if (command === "--capture") return capture(scratch)
  if (command === "--replay") return replay(scratch, mode, Number(capacity), Number(repetition), lifecycle)
  if (command !== "--matrix") return
  const runs = []
  for (let rep = 0; rep < 3; rep++) {
    const variants = rep % 2 ? [["cache", 8], ["cache", 4], ["fresh", 0]] : [["fresh", 0], ["cache", 4], ["cache", 8]]
    for (const [variant, bound] of variants) {
      const dir = path.join(scratch, `${rep}-${variant}-${bound}`); fs.mkdirSync(dir)
      const worker = spawnSync(process.execPath, [__filename, "--replay", dir, variant, String(bound), String(rep), "adapter"], { cwd: app, encoding: "utf8", timeout: 180000 })
      assert.equal(worker.status, 0, worker.stderr + worker.stdout)
      runs.push(JSON.parse(fs.readFileSync(path.join(dir, "worker-result.json"))))
    }
  }
  for (const run of runs) {
    assert.deepEqual(run.requests.map(({ file, resultSha256, entrySha1 }) => ({ file, resultSha256, entrySha1 })), runs[0].requests.map(({ file, resultSha256, entrySha1 }) => ({ file, resultSha256, entrySha1 })))
    assert.deepEqual(run.records.filter(r => r.kind === "transform").map(r => r.compile), runs[0].records.filter(r => r.kind === "transform").map(r => r.compile))
    const closings = run.records.filter(r => r.kind === "teardown")
    assert(closings.length > 0)
    for (const closing of closings) { assert.equal(closing.retained, 0); assert.equal(closing.counts.created, closing.counts.disposed); assert.equal(closing.afterStop.services.length, 0) }
  }
  const summary = summarize(runs)
  fs.writeFileSync(path.join(__dirname, "raw-replay.json"), JSON.stringify(compactEvidence({ formatVersion: 1, node: process.version, summary, runs }), null, 2) + "\n")
  console.log(JSON.stringify(summary, null, 2))
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1 })
