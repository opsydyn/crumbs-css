"use strict"

const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const crypto = require("node:crypto")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { performance } = require("node:perf_hooks")

function findRepoRoot(start) {
  let current = start
  while (true) {
    if (
      fs.existsSync(path.join(current, "packages/css/package.json"))
      && fs.existsSync(path.join(current, "docs/roadmap.md"))
    ) return current
    const parent = path.dirname(current)
    if (parent === current) throw new Error("Cannot locate Crumbs repository root")
    current = parent
  }
}

const repoRoot = findRepoRoot(__dirname)
const packageRoot = path.join(repoRoot, "packages/css")
const fixtureSource = fs.readFileSync(path.join(packageRoot, "examples/recipe.css.ts"), "utf8")
const themeSource = fs.readFileSync(path.join(packageRoot, "examples/theme.ts"), "utf8")
const integrationEntry = require.resolve("@vanilla-extract/integration", { paths: [packageRoot] })
const integration = require(integrationEntry)
const esbuildEntry = require.resolve("esbuild", { paths: [integrationEntry] })
const esbuild = require(esbuildEntry)
const integrationVersion = JSON.parse(
  fs.readFileSync(path.join(path.dirname(path.dirname(integrationEntry)), "package.json"), "utf8"),
).version
const esbuildVersion = JSON.parse(
  fs.readFileSync(path.join(path.dirname(path.dirname(esbuildEntry)), "package.json"), "utf8"),
).version

const COUNT_MATRIX = [1, 8, 32]
const CAPACITY_MATRIX = [1, 4, 8, 16, 32]
const PROCESS_REPETITIONS = 3
const HOT_PATTERN = [0, 1, 0, 2, 0, 1, 3]
const HOT_PATTERN_REPETITIONS = 8

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function updateSource(value) {
  const source = fixtureSource.replace("borderRadius: 8,", `borderRadius: ${value},`)
  if (value !== "8") assert.notEqual(source, fixtureSource, `fixture mutation for ${value} did not change the source`)
  return source
}

function buildOptions(entryPath, cwd) {
  return {
    entryPoints: [entryPath],
    metafile: true,
    bundle: true,
    external: ["@vanilla-extract"],
    platform: "node",
    write: false,
    plugins: [integration.vanillaExtractTransformPlugin({})],
    absWorkingDir: cwd,
  }
}

function normalizedInput(cwd, fixtureRoot, filePath) {
  const absolute = fs.realpathSync(path.resolve(cwd, filePath))
  const physicalFixtureRoot = fs.realpathSync(fixtureRoot)
  const relativeToRepo = path.relative(repoRoot, absolute)
  if (relativeToRepo && !relativeToRepo.startsWith(".." + path.sep) && relativeToRepo !== "..") {
    return relativeToRepo.split(path.sep).join("/")
  }
  const relativeToFixture = path.relative(physicalFixtureRoot, absolute)
  if (relativeToFixture && !relativeToFixture.startsWith(".." + path.sep) && relativeToFixture !== "..") {
    return `fixture/${relativeToFixture.split(path.sep).join("/")}`
  }
  const normalized = absolute.split(path.sep).join("/")
  const nodeModules = "/node_modules/"
  const index = normalized.lastIndexOf(nodeModules)
  if (index >= 0) return `external/${normalized.slice(index + nodeModules.length)}`
  return `external/${path.basename(absolute)}`
}

function normalizedInputs(cwd, fixtureRoot, filePaths) {
  return filePaths.map((filePath) => normalizedInput(cwd, fixtureRoot, filePath)).sort()
}

class BoundedContextCache {
  constructor(capacity) {
    assert(Number.isInteger(capacity) && capacity > 0)
    this.capacity = capacity
    this.entries = new Map()
    this.closed = false
    this.hits = 0
    this.misses = 0
    this.evictions = 0
    this.created = 0
    this.disposals = 0
  }

  async acquire(key, create) {
    if (this.closed) throw new Error("context cache is closed")
    const existing = this.entries.get(key)
    if (existing) {
      this.entries.delete(key)
      this.entries.set(key, existing)
      this.hits += 1
      return { context: existing, hit: true }
    }

    this.misses += 1
    const context = await create()
    this.created += 1
    this.entries.set(key, context)
    if (this.entries.size > this.capacity) {
      const oldestKey = this.entries.keys().next().value
      const oldest = this.entries.get(oldestKey)
      this.entries.delete(oldestKey)
      await oldest.dispose()
      this.evictions += 1
      this.disposals += 1
    }
    assert(this.entries.size <= this.capacity, "context cache exceeded its configured capacity")
    return { context, hit: false }
  }

  async close() {
    if (this.closed) return
    this.closed = true
    const retained = [...this.entries.values()]
    this.entries.clear()
    for (const context of retained) {
      await context.dispose()
      this.disposals += 1
    }
  }

  snapshot() {
    return {
      capacity: this.capacity,
      retained: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      created: this.created,
      disposals: this.disposals,
      closed: this.closed,
    }
  }
}

async function exerciseLruControl() {
  const disposed = []
  const cache = new BoundedContextCache(2)
  async function touch(key) {
    return cache.acquire(key, async () => ({ dispose: async () => disposed.push(key) }))
  }
  const results = []
  for (const key of ["A", "B", "A", "C", "B"]) {
    results.push({ key, hit: (await touch(key)).hit })
  }
  assert.deepEqual(results.map(({ hit }) => hit), [false, false, true, false, false])
  assert.deepEqual(disposed, ["B", "A"])
  assert.deepEqual(cache.snapshot(), {
    capacity: 2,
    retained: 2,
    hits: 1,
    misses: 4,
    evictions: 2,
    created: 4,
    disposals: 2,
    closed: false,
  })
  await cache.close()
  await cache.close()
  assert.deepEqual(disposed, ["B", "A", "C", "B"])
  assert.equal(cache.snapshot().retained, 0)
  assert.equal(cache.snapshot().disposals, cache.snapshot().created)
  await assert.rejects(cache.acquire("D", async () => ({})), /context cache is closed/)
  return { status: "passed", accessSequence: ["A", "B", "A", "C", "B"], capacity: 2 }
}

function serviceProcesses() {
  const result = spawnSync("ps", ["-axo", "pid=,ppid=,rss=,comm="], { encoding: "utf8" })
  if (result.error || result.status !== 0) {
    return { available: false, error: result.error?.message ?? result.stderr.trim() }
  }
  const matches = result.stdout.split("\n").flatMap((line) => {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/)
    if (!match || Number(match[2]) !== process.pid) return []
    const executable = path.basename(match[4])
    if (!executable.includes("esbuild")) return []
    return [{ rssBytes: Number(match[3]) * 1024 }]
  })
  return {
    available: true,
    processCount: matches.length,
    rssBytes: matches.reduce((total, process) => total + process.rssBytes, 0),
  }
}

function memorySnapshot(label) {
  const memory = process.memoryUsage()
  return {
    label,
    node: {
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      externalBytes: memory.external,
      maxRssKilobytes: process.resourceUsage().maxRSS,
    },
    esbuildService: serviceProcesses(),
  }
}

function createFixtureRoot(entryCount) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "crumbs-m10-5-context-cache-"))
  const sourceDir = path.join(root, "src")
  fs.mkdirSync(sourceDir, { recursive: true })
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "m10-5-context-cache-fixture" }))
  fs.writeFileSync(path.join(sourceDir, "theme.ts"), themeSource)
  const packageLink = path.join(root, "node_modules/@opsydyn/crumbs-css")
  fs.mkdirSync(path.dirname(packageLink), { recursive: true })
  fs.symlinkSync(packageRoot, packageLink, "dir")
  const entries = Array.from({ length: entryCount }, (_, index) => {
    const name = `entry-${String(index).padStart(3, "0")}.css.ts`
    const entryPath = path.join(sourceDir, name)
    fs.writeFileSync(entryPath, fixtureSource)
    return { id: index, name, entryPath }
  })
  return { root, entries }
}

async function compileFresh(entryPath, cwd) {
  return integration.compile({ filePath: entryPath, cwd })
}

async function runWorker(entryCount, capacity, repetition) {
  const fixture = createFixtureRoot(entryCount)
  const { root, entries } = fixture
  const cache = new BoundedContextCache(capacity)
  const expected = new Map()
  const cacheTimings = []
  const memory = [memorySnapshot("before-context-start")]
  const hotCount = Math.min(entryCount, 4)
  const hotStart = entryCount - hotCount
  const hotSequence = Array.from({ length: HOT_PATTERN_REPETITIONS }, () => HOT_PATTERN)
    .flatMap((pattern) => pattern.map((index) => hotStart + (index % hotCount)))
  const values = new Map(entries.map(({ id }) => [id, "8"]))

  try {
    for (const entry of entries) {
      const source = updateSource("8")
      fs.writeFileSync(entry.entryPath, source)
      const started = performance.now()
      const acquired = await cache.acquire(entry.entryPath, () => esbuild.context(buildOptions(entry.entryPath, root)))
      const built = await acquired.context.rebuild()
      const elapsedMs = performance.now() - started
      assert.equal(built.outputFiles.length, 1)
      const output = built.outputFiles[0].text
      const receipt = {
        entryId: entry.id,
        value: "8",
        outputHash: sha256(output),
        inputs: normalizedInputs(root, root, Object.keys(built.metafile.inputs)),
      }
      const key = `${entry.id}:8`
      expected.set(key, receipt)
      cacheTimings.push({ phase: "cold-scan", hit: acquired.hit, elapsedMs })
      assert(cache.entries.size <= capacity)
    }
    const cacheAfterColdScan = cache.snapshot()
    memory.push(memorySnapshot("after-cold-scan"))

    for (const entryId of hotSequence) {
      const entry = entries[entryId]
      const value = values.get(entryId) === "8" ? "128" : "8"
      values.set(entryId, value)
      fs.writeFileSync(entry.entryPath, updateSource(value))
      const started = performance.now()
      const acquired = await cache.acquire(entry.entryPath, () => esbuild.context(buildOptions(entry.entryPath, root)))
      const built = await acquired.context.rebuild()
      const elapsedMs = performance.now() - started
      assert.equal(built.outputFiles.length, 1)
      const receipt = {
        entryId,
        value,
        outputHash: sha256(built.outputFiles[0].text),
        inputs: normalizedInputs(root, root, Object.keys(built.metafile.inputs)),
      }
      const key = `${entryId}:${value}`
      const previous = expected.get(key)
      if (previous) {
        assert.equal(receipt.outputHash, previous.outputHash, `context output changed for ${key}`)
        assert.deepEqual(receipt.inputs, previous.inputs, `context input receipt changed for ${key}`)
      } else {
        expected.set(key, receipt)
      }
      cacheTimings.push({ phase: "hot-workload", hit: acquired.hit, elapsedMs })
      assert(cache.entries.size <= capacity)
    }

    memory.push(memorySnapshot("after-hot-workload"))
    const beforeClose = cache.snapshot()
    assert.equal(beforeClose.misses, beforeClose.created)
    assert.equal(beforeClose.created, beforeClose.evictions + beforeClose.retained)
    assert.equal(beforeClose.disposals, beforeClose.evictions)
    assert.equal(beforeClose.retained, Math.min(capacity, beforeClose.created))

    await cache.close()
    await cache.close()
    assert.equal(cache.snapshot().retained, 0)
    assert.equal(cache.snapshot().disposals, cache.snapshot().created)
    const cacheAfterClose = cache.snapshot()
    if (global.gc) global.gc()
    await new Promise((resolve) => setTimeout(resolve, 50))
    memory.push(memorySnapshot("after-context-disposal"))

    const parityChecks = []
    for (const [key, expectedReceipt] of expected) {
      const entry = entries[expectedReceipt.entryId]
      fs.writeFileSync(entry.entryPath, updateSource(expectedReceipt.value))
      const fresh = await compileFresh(entry.entryPath, root)
      const receipt = {
        entryId: entry.id,
        value: expectedReceipt.value,
        outputHash: sha256(fresh.source),
        inputs: normalizedInputs(root, root, fresh.watchFiles),
      }
      assert.equal(receipt.outputHash, expectedReceipt.outputHash, `fresh output mismatch for ${key}`)
      assert.deepEqual(receipt.inputs, expectedReceipt.inputs, `fresh input receipt mismatch for ${key}`)
      parityChecks.push(key)
    }

    if (global.gc) global.gc()
    await esbuild.stop()
    await new Promise((resolve) => setTimeout(resolve, 50))
    memory.push(memorySnapshot("after-esbuild-service-stop"))

    const outputReceipts = [...expected.entries()].map(([key, receipt]) => ({ key, ...receipt }))
    return {
      entryCount,
      capacity,
      repetition,
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      service: { esbuildVersion, integrationVersion },
      cacheAfterColdScan,
      cacheAfterClose,
      lru: beforeClose,
      requestCount: cacheTimings.length,
      hotRequestCount: hotSequence.length,
      hitRate: beforeClose.hits / cacheTimings.length,
      timing: {
        coldBuildMs: cacheTimings.filter((sample) => sample.phase === "cold-scan").map((sample) => sample.elapsedMs),
        hotHitRebuildMs: cacheTimings.filter((sample) => sample.phase === "hot-workload" && sample.hit).map((sample) => sample.elapsedMs),
        hotMissCreateAndRebuildMs: cacheTimings.filter((sample) => sample.phase === "hot-workload" && !sample.hit).map((sample) => sample.elapsedMs),
      },
      memory,
      outputParity: {
        status: "passed",
        freshComparisonCount: parityChecks.length,
        receiptSetSha256: sha256(JSON.stringify(outputReceipts)),
      },
      outputReceipts,
    }
  } finally {
    await cache.close()
    await esbuild.stop()
    fs.rmSync(root, { recursive: true, force: true })
  }
}

function runProcess(entryCount, capacity, repetition) {
  const result = spawnSync(process.execPath, ["--expose-gc", __filename, "--worker", String(entryCount), String(capacity), String(repetition)], {
    cwd: packageRoot,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  })
  if (result.status !== 0) {
    throw new Error(`worker failed for count=${entryCount}, capacity=${capacity}, repetition=${repetition}:\n${result.stderr}\n${result.stdout}`)
  }
  return JSON.parse(result.stdout)
}

function summarize(records) {
  const memoryValues = (record, label, key) => {
    const sample = record.memory.find(({ label: sampleLabel }) => sampleLabel === label)
    return key === "serviceRssBytes"
      ? sample.esbuildService.rssBytes
      : sample.node[key]
  }
  const aggregate = []
  for (const entryCount of COUNT_MATRIX) {
    const capacities = CAPACITY_MATRIX.filter((capacity) => capacity <= entryCount)
    for (const capacity of capacities) {
      const selected = records.filter((record) => record.entryCount === entryCount && record.capacity === capacity)
      const timings = selected.flatMap((record) => record.timing.hotHitRebuildMs)
      const misses = selected.flatMap((record) => record.timing.hotMissCreateAndRebuildMs)
      const hotHitCount = selected.reduce((sum, record) => sum + record.timing.hotHitRebuildMs.length, 0)
      const hotMissCount = selected.reduce((sum, record) => sum + record.timing.hotMissCreateAndRebuildMs.length, 0)
      const coldInitialTimings = selected.map((record) => record.timing.coldBuildMs[0])
      const coldSubsequentTimings = selected.flatMap((record) => record.timing.coldBuildMs.slice(1))
      const retained = selected.flatMap((record) => record.memory
        .filter(({ label }) => label === "after-cold-scan")
        .map(({ node, esbuildService }) => ({ node, esbuildService })))
      const disposed = selected.map((record) => ({
        node: memoryValues(record, "after-context-disposal", "rssBytes"),
        serviceRssBytes: memoryValues(record, "after-context-disposal", "serviceRssBytes"),
      }))
      const stopped = selected.map((record) => record.memory.find(({ label }) => label === "after-esbuild-service-stop").esbuildService)
      aggregate.push({
        entryCount,
        capacity,
        repetitions: selected.length,
        meanOverallHitRate: selected.reduce((sum, record) => sum + record.hitRate, 0) / selected.length,
        hotWorkloadHitRate: hotHitCount / (hotHitCount + hotMissCount),
        meanEvictions: selected.reduce((sum, record) => sum + record.lru.evictions, 0) / selected.length,
        meanRetainedContextsAfterColdScan: selected.reduce((sum, record) => sum + record.cacheAfterColdScan.retained, 0) / selected.length,
        coldInitialCreateAndBuildMedianMs: median(coldInitialTimings),
        coldSubsequentCreateAndBuildMedianMs: coldSubsequentTimings.length === 0 ? null : median(coldSubsequentTimings),
        warmHitRebuildMedianMs: timings.length === 0 ? null : median(timings),
        missCreateAndRebuildMedianMs: misses.length === 0 ? null : median(misses),
        retainedMemoryMedian: {
          nodeRssBytes: median(retained.map(({ node }) => node.rssBytes)),
          nodeHeapUsedBytes: median(retained.map(({ node }) => node.heapUsedBytes)),
          esbuildServiceRssBytes: retained.every(({ esbuildService }) => esbuildService.available)
            ? median(retained.map(({ esbuildService }) => esbuildService.rssBytes))
            : null,
        },
        peakMemoryMedian: {
          nodeRssBytes: median(selected.map((record) => Math.max(...record.memory
            .filter(({ label }) => label === "after-cold-scan" || label === "after-hot-workload")
            .map(({ node }) => node.rssBytes)))),
          esbuildServiceRssBytes: selected.every((record) => record.memory
            .filter(({ label }) => label === "after-cold-scan" || label === "after-hot-workload")
            .every(({ esbuildService }) => esbuildService.available))
            ? median(selected.map((record) => Math.max(...record.memory
              .filter(({ label }) => label === "after-cold-scan" || label === "after-hot-workload")
              .map(({ esbuildService }) => esbuildService.rssBytes))))
            : null,
        },
        afterDisposeMemoryMedian: {
          nodeRssBytes: median(disposed.map(({ node }) => node)),
          esbuildServiceRssBytes: disposed.every(({ serviceRssBytes }) => serviceRssBytes !== null)
            ? median(disposed.map(({ serviceRssBytes }) => serviceRssBytes))
            : null,
        },
        afterServiceStopMedian: {
          esbuildServiceProcessCount: stopped.every(({ available }) => available)
            ? median(stopped.map(({ processCount }) => processCount))
            : null,
          esbuildServiceRssBytes: stopped.every(({ available }) => available)
            ? median(stopped.map(({ rssBytes }) => rssBytes))
            : null,
        },
        lifecycle: selected.map((record) => ({
          created: record.lru.created,
          evictions: record.lru.evictions,
          disposalsAfterClose: record.cacheAfterClose.disposals,
          retainedAfterClose: record.cacheAfterClose.retained,
        })),
        parityChecks: selected.reduce((sum, record) => sum + record.outputParity.freshComparisonCount, 0),
      })
    }
  }
  return aggregate
}

function compactRecord(record) {
  if (Array.isArray(record.requests)) {
    const receipts = new Map()
    for (const request of record.requests) {
      const key = `${request.entryId}:${request.value}`
      const receipt = {
        key,
        entryId: request.entryId,
        value: request.value,
        outputHash: request.outputHash,
        inputs: request.inputs,
      }
      const previous = receipts.get(key)
      if (previous) {
        assert.equal(receipt.outputHash, previous.outputHash, `duplicate output receipt changed for ${key}`)
        assert.deepEqual(receipt.inputs, previous.inputs, `duplicate input receipt changed for ${key}`)
      } else {
        receipts.set(key, receipt)
      }
    }
    record.outputReceipts = [...receipts.values()]
    delete record.requests
  }
  if (Array.isArray(record.outputReceipts)) {
    assert.equal(record.outputReceipts.length, record.outputParity.freshComparisonCount)
    const receiptHash = sha256(JSON.stringify(record.outputReceipts))
    if (record.outputParity.receiptSetSha256) assert.equal(record.outputParity.receiptSetSha256, receiptHash)
    record.outputParity.receiptSetSha256 = receiptHash
    delete record.outputParity.checks
  }
  return record
}

function compactMatrixRecords(records, previousInputReceipts = []) {
  const references = new Map(previousInputReceipts.map((receipt) => [`${receipt.entryCount}:${receipt.entryId}`, receipt]))
  for (const record of records) {
    if (!Array.isArray(record.outputReceipts)) continue
    const receipts = record.outputReceipts
    for (const receipt of receipts) {
      const key = `${record.entryCount}:${receipt.entryId}`
      const inputReceipt = { entryCount: record.entryCount, entryId: receipt.entryId, inputs: receipt.inputs }
      const current = references.get(key)
      if (current) assert.deepEqual(inputReceipt.inputs, current.inputs, `normalized inputs changed for ${key}`)
      else references.set(key, inputReceipt)
    }
    const completeReceipts = receipts.map((receipt) => ({
      ...receipt,
      inputs: references.get(`${record.entryCount}:${receipt.entryId}`).inputs,
    }))
    assert.equal(
      sha256(JSON.stringify(completeReceipts)),
      record.outputParity.receiptSetSha256,
      `output/input receipt hash changed for ${record.entryCount} entries, capacity ${record.capacity}, repetition ${record.repetition}`,
    )
    record.outputReceipts = receipts.map(({ key, entryId, value, outputHash }) => ({ key, entryId, value, outputHash }))
  }
  return {
    records,
    referenceInputReceipts: [...references.values()].sort((a, b) => a.entryCount - b.entryCount || a.entryId - b.entryId),
  }
}

async function main() {
  if (process.argv[2] === "--compact-raw") {
    const outputPath = path.join(__dirname, "raw-context-cache.json")
    const existing = JSON.parse(fs.readFileSync(outputPath, "utf8"))
    if (!Array.isArray(existing.referenceInputReceipts)) {
      existing.records = existing.records.map(compactRecord)
      const compacted = compactMatrixRecords(existing.records)
      existing.records = compacted.records
      existing.referenceInputReceipts = compacted.referenceInputReceipts
    }
    existing.protocol.rawRecordCompaction = "Per-process output hashes and a receipt-set SHA-256 are retained; normalized input lists are stored once per entry-count and entry. Inputs are cross-checked exactly across processes. Output hashes remain per-process because Vanilla Extract embeds each unique temporary fixture path. Per-request timing arrays and lifecycle/memory samples remain intact."
    fs.writeFileSync(outputPath, JSON.stringify(existing, null, 2) + "\n")
    process.stdout.write(JSON.stringify({
      records: existing.records.length,
      referenceInputReceiptCount: existing.referenceInputReceipts.length,
      rawFile: path.relative(repoRoot, outputPath),
    }) + "\n")
    return
  }
  if (process.argv[2] === "--summarize") {
    const outputPath = path.join(__dirname, "raw-context-cache.json")
    const existing = JSON.parse(fs.readFileSync(outputPath, "utf8"))
    existing.aggregates = summarize(existing.records)
    fs.writeFileSync(outputPath, JSON.stringify(existing, null, 2) + "\n")
    process.stdout.write(JSON.stringify(existing.aggregates, null, 2) + "\n")
    return
  }
  if (process.argv[2] === "--lru-test") {
    process.stdout.write(JSON.stringify(await exerciseLruControl()) + "\n")
    return
  }
  if (process.argv[2] === "--worker") {
    const [, , , entryCount, capacity, repetition] = process.argv
    const result = await runWorker(Number(entryCount), Number(capacity), Number(repetition))
    process.stdout.write(JSON.stringify(result) + "\n")
    return
  }
  if (process.argv[2] === "--worker-summary") {
    const [, , , entryCount, capacity, repetition] = process.argv
    const result = await runWorker(Number(entryCount), Number(capacity), Number(repetition))
    process.stdout.write(JSON.stringify({
      entryCount: result.entryCount,
      capacity: result.capacity,
      lru: result.lru,
      cacheAfterClose: result.cacheAfterClose,
      outputParity: { status: result.outputParity.status, freshComparisonCount: result.outputParity.freshComparisonCount },
      outputReceiptCount: result.outputReceipts.length,
      receiptSetSha256: result.outputParity.receiptSetSha256,
      memory: result.memory,
    }, null, 2) + "\n")
    return
  }

  const lruControl = await exerciseLruControl()
  const records = []
  for (const entryCount of COUNT_MATRIX) {
    for (const capacity of CAPACITY_MATRIX.filter((candidate) => candidate <= entryCount)) {
      for (let repetition = 0; repetition < PROCESS_REPETITIONS; repetition++) {
        records.push(runProcess(entryCount, capacity, repetition))
      }
    }
  }
  const compacted = compactMatrixRecords(records)
  const summary = {
    formatVersion: 1,
    roadmapItem: "M10.5",
    method: "A scratch-only LRU over real esbuild contexts; synthetic cloned Crumbs recipe entries share one theme dependency; retained Node and esbuild-service RSS are sampled before and after explicit disposal.",
    protocol: {
      stylesheetEntryCounts: COUNT_MATRIX,
      capacities: CAPACITY_MATRIX,
      freshProcessesPerMatrixCell: PROCESS_REPETITIONS,
      hotEntryWorkingSet: "up to four most-recently scanned entries",
      hotAccessPattern: HOT_PATTERN.map((index) => `entry-${index}`).join(", "),
      hotPatternRepetitions: HOT_PATTERN_REPETITIONS,
      memorySampling: "Node process.memoryUsage() plus read-only ps RSS for esbuild service children of the worker; RSS values are snapshots, not per-context allocation measurements.",
      outputParity: "Every distinct cached entry/value result is compared after cache disposal to a fresh @vanilla-extract/integration compile by exact generated JavaScript SHA-256 and normalized input receipt.",
      cache: "Scratch-only Map-based LRU; all hits still call context.rebuild(); misses create a context; eviction and close await context.dispose().",
      rawRecordCompaction: "Per-process output hashes and a receipt-set SHA-256 are retained; normalized input lists are stored once per entry-count and entry. Inputs are cross-checked exactly across processes. Output hashes remain per-process because Vanilla Extract embeds each unique temporary fixture path. Per-request timing arrays and lifecycle/memory samples remain intact.",
    },
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      esbuildVersion,
      integrationVersion,
    },
    lruControl,
    aggregates: summarize(records),
    referenceInputReceipts: compacted.referenceInputReceipts,
    records: compacted.records,
    limits: [
      "The stylesheet-count workload clones one small recipe fixture and a shared theme; it is synthetic and is not a Metro transform trace from a production application.",
      "The scratch LRU is not production code and does not prove Crumbs full-transform, Metro worker shutdown, Node 22 host-budget, Hermes, device, or Android behavior.",
      "RSS snapshots include the esbuild service process and allocator high-water effects; they do not isolate bytes retained by each live context.",
    ],
  }
  const outputPath = path.join(__dirname, "raw-context-cache.json")
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2) + "\n")
  process.stdout.write(JSON.stringify({
    outputPath: path.relative(repoRoot, outputPath),
    lruControl,
    aggregates: summary.aggregates,
    completedWorkers: records.length,
    serviceRssAvailable: records.every((record) => record.memory.every((sample) => sample.esbuildService.available)),
    allFreshParityChecksPassed: records.every((record) => record.outputParity.status === "passed"),
  }, null, 2) + "\n")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
