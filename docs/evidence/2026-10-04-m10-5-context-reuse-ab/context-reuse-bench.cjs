"use strict"
const assert = require("node:assert/strict")
const { spawnSync } = require("node:child_process")
const crypto = require("node:crypto")
const fs = require("node:fs")
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
const scratchRoot = path.join(packageRoot, ".m10-5-context-reuse")
const originalPackage = require(path.join(packageRoot, "package.json"))
const integrationEntry = require.resolve("@vanilla-extract/integration", { paths: [packageRoot] })
const integration = require(integrationEntry)
const esbuildEntry = require.resolve("esbuild", { paths: [integrationEntry] })
const esbuild = require(esbuildEntry)
const integrationVersion = JSON.parse(fs.readFileSync(path.join(path.dirname(path.dirname(integrationEntry)), "package.json"), "utf8")).version
const esbuildVersion = JSON.parse(fs.readFileSync(path.join(path.dirname(path.dirname(esbuildEntry)), "package.json"), "utf8")).version
const fixtureSpecs = {
  recipe: {
    entry: "recipe.css.ts",
    source: fs.readFileSync(path.join(packageRoot, "examples/recipe.css.ts"), "utf8"),
    dependencies: {
      "theme.ts": fs.readFileSync(path.join(packageRoot, "examples/theme.ts"), "utf8"),
    },
    base: "8",
    next: "128",
    update(source, value) {
      return source.replace("borderRadius: 8,", `borderRadius: ${value},`)
    },
  },
  consumer: {
    entry: "button.css.ts",
    source: fs.readFileSync(path.join(packageRoot, "fixtures/consumer/styles/button.css.ts"), "utf8"),
    dependencies: {
      "theme.css.ts": fs.readFileSync(path.join(packageRoot, "fixtures/consumer/styles/theme.css.ts"), "utf8"),
    },
    base: "48",
    next: "128",
    update(source, value) {
      return source.replaceAll("minHeight: 48", `minHeight: ${value}`)
    },
  },
}

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
function fixtureRoot(name) {
  return path.join(scratchRoot, `benchmark-fixture-${name}`)
}
function prepare(name) {
  const spec = fixtureSpecs[name]
  const root = fixtureRoot(name)
  const sourceDir = path.join(root, "src")
  fs.rmSync(root, { recursive: true, force: true })
  fs.mkdirSync(sourceDir, { recursive: true })
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: originalPackage.name }))
  const workspacePackageLink = path.join(root, "node_modules", "@opsydyn", "crumbs-css")
  fs.mkdirSync(path.dirname(workspacePackageLink), { recursive: true })
  fs.symlinkSync(packageRoot, workspacePackageLink, "dir")
  for (const [fileName, contents] of Object.entries(spec.dependencies)) {
    fs.writeFileSync(path.join(sourceDir, fileName), contents)
  }
  return {
    root,
    entryPath: path.join(sourceDir, spec.entry),
    initialSource: spec.source,
    spec,
  }
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
function normalizedInput(cwd, filePath) {
  const absolute = fs.realpathSync(path.resolve(cwd, filePath))
  const relative = path.relative(repoRoot, absolute)
  if (relative && !relative.startsWith(".." + path.sep) && relative !== "..") {
    return relative.split(path.sep).join("/")
  }
  const normalized = absolute.split(path.sep).join("/")
  const nodeModules = "/node_modules/"
  const index = normalized.lastIndexOf(nodeModules)
  if (index >= 0) return "external/" + normalized.slice(index + nodeModules.length)
  return "external/" + path.basename(absolute)
}
function normalizedInputs(cwd, filePaths) {
  return filePaths.map((filePath) => normalizedInput(cwd, filePath)).sort()
}
async function runWorker(mode, fixture, processIndex) {
  const spec = fixtureSpecs[fixture]
  const prepared = prepare(fixture)
  const opts = buildOptions(prepared.entryPath, prepared.root)
  const results = []
  const writes = []

  async function compileVariant(value, label) {
    const updated = spec.update(prepared.initialSource, value)
    if (value !== spec.base) assert.notEqual(updated, prepared.initialSource, `${fixture} mutation for ${value} did not alter the entry`)
    fs.writeFileSync(prepared.entryPath, updated)
    writes.push({ value, label })
    const started = performance.now()
    let compiled
    let receipt
    if (mode === "baseline") {
      compiled = await integration.compile({
        filePath: prepared.entryPath,
        cwd: prepared.root,
      })
      receipt = normalizedInputs(prepared.root, compiled.watchFiles)
    } else {
      const built = await context.rebuild()
      assert.equal(built.outputFiles.length, 1)
      compiled = { source: built.outputFiles[0].text }
      receipt = normalizedInputs(prepared.root, Object.keys(built.metafile.inputs))
    }
    const elapsedMs = performance.now() - started
    return {
      label,
      value,
      elapsedMs,
      outputHash: sha256(compiled.source),
      inputs: receipt,
    }
  }

  let context
  let contextSetupMs = 0
  try {
    if (mode === "context") {
      const started = performance.now()
      context = await esbuild.context(opts)
      contextSetupMs = performance.now() - started
      results.push(await compileVariant(spec.base, "initial-build"))
    } else {
      results.push(await compileVariant(spec.base, "initial-build"))
    }
    results.push(await compileVariant(spec.next, "warmup"))
    for (let i = 0; i < 6; i++) {
      const value = i % 2 === 0 ? spec.base : spec.next
      results.push(await compileVariant(value, `sample-${i + 1}`))
    }
    return {
      fixture,
      mode,
      processIndex,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      contextSetupMs,
      initialMs: results[0].elapsedMs,
      warmupMs: results[1].elapsedMs,
      samples: results.slice(2),
      totalMs: contextSetupMs + results.reduce((total, result) => total + result.elapsedMs, 0),
      outputHashes: results.map(({ label, value, outputHash, inputs }) => ({ label, value, outputHash, inputs })),
    }
  } finally {
    if (context) await context.dispose()
  }
}

async function worker() {
  const [, , , mode, fixture, processIndexText] = process.argv
  assert(["baseline", "context"].includes(mode))
  assert(Object.hasOwn(fixtureSpecs, fixture))
  process.stdout.write(JSON.stringify(await runWorker(mode, fixture, Number(processIndexText))) + "\n")
}
function runProcess(mode, fixture, processIndex) {
  const result = spawnSync(process.execPath, [__filename, "--worker", mode, fixture, String(processIndex)], {
    cwd: packageRoot,
    encoding: "utf8",
  })
  if (result.status !== 0) {
    throw new Error(`worker failed for ${fixture}/${mode}/${processIndex}:\n${result.stderr}\n${result.stdout}`)
  }
  return JSON.parse(result.stdout)
}
function assertParity(runs) {
  const groups = new Map()
  for (const run of runs) {
    for (const item of run.outputHashes) {
      const key = `${run.fixture}:${item.value}:${item.label}`
      const list = groups.get(key) ?? []
      list.push({ mode: run.mode, outputHash: item.outputHash, inputs: item.inputs })
      groups.set(key, list)
    }
  }
  for (const [key, records] of groups) {
    const baseline = records.filter((record) => record.mode === "baseline")
    const context = records.filter((record) => record.mode === "context")
    assert.equal(baseline.length, 5, `${key} baseline process count`)
    assert.equal(context.length, 5, `${key} context process count`)
    for (const record of [...baseline, ...context]) {
      assert.equal(record.outputHash, baseline[0].outputHash, `${key} output mismatch`)
      assert.deepEqual(record.inputs, baseline[0].inputs, `${key} dependency receipt mismatch`)
    }
  }
}
async function main() {
  if (process.argv[2] === "--worker") return worker()
  const runs = []
  for (let processIndex = 0; processIndex < 5; processIndex++) {
    const fixtureOrder = processIndex % 2 === 0 ? ["recipe", "consumer"] : ["consumer", "recipe"]
    for (let fixtureIndex = 0; fixtureIndex < fixtureOrder.length; fixtureIndex++) {
      const fixture = fixtureOrder[fixtureIndex]
      const modeOrder = (processIndex + fixtureIndex) % 2 === 0
        ? ["baseline", "context"]
        : ["context", "baseline"]
      for (const mode of modeOrder) {
        runs.push(runProcess(mode, fixture, processIndex))
      }
    }
  }
  assertParity(runs)
  const fixtures = {}
  for (const fixture of Object.keys(fixtureSpecs)) {
    fixtures[fixture] = {}
    for (const mode of ["baseline", "context"]) {
      const selected = runs.filter((run) => run.fixture === fixture && run.mode === mode)
      assert.equal(selected.length, 5)
      fixtures[fixture][mode] = {
        processTotalMediansMs: selected.map((run) => run.totalMs),
        medianProcessTotalMs: median(selected.map((run) => run.totalMs)),
        contextSetupMsPerProcess: selected.map((run) => run.contextSetupMs),
        firstBuildMsPerProcess: selected.map((run) => run.initialMs),
        warmupMsPerProcess: selected.map((run) => run.warmupMs),
        sampleProcessMediansMs: selected.map((run) => median(run.samples.map((sample) => sample.elapsedMs))),
        warmRebuildMedianMs: median(selected.flatMap((run) => run.samples.map((sample) => sample.elapsedMs))),
        sampleRangeMs: [
          Math.min(...selected.flatMap((run) => run.samples.map((sample) => sample.elapsedMs))),
          Math.max(...selected.flatMap((run) => run.samples.map((sample) => sample.elapsedMs))),
        ],
        retainedSampleCount: selected.reduce((total, run) => total + run.samples.length, 0),
        outputHashes: [...new Set(selected.flatMap((run) => run.samples.map((sample) => sample.outputHash)))],
      }
    }
    const baseline = fixtures[fixture].baseline
    const context = fixtures[fixture].context
    fixtures[fixture].warmChangeDeltaPercent = (
      (context.warmRebuildMedianMs / baseline.warmRebuildMedianMs) - 1
    ) * 100
    fixtures[fixture].processTotalDeltaPercent = (
      (context.medianProcessTotalMs / baseline.medianProcessTotalMs) - 1
    ) * 100
  }
  const summary = {
    formatVersion: 1,
    method: "esbuild integration compile() fresh-build baseline versus one retained esbuild context rebuilt after alternating CSS entry edits",
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      esbuildVersion,
      integrationVersion,
    },
    protocol: {
      transformsPerProcess: 8,
      sourceChangesAfterInitialTransform: 7,
      warmupEditsPerProcess: 2,
      retainedEditsPerProcess: 6,
      freshProcessesPerFixtureAndVariant: 5,
      order: "fixture and variant order alternated by process",
      fixtureInputs: Object.keys(fixtureSpecs),
      controlledChanges: {
        recipe: "borderRadius 8 <-> 128",
        consumer: "minHeight 48 <-> 128",
      },
      outputParity: "all eight builds per fresh process matched across variants by exact generated source SHA-256 and normalized metafile/watch input list",
    },
    fixtures,
    candidate: {
      contextDisposedAfterProcess: true,
      retainedContextsPerProcess: 1,
      sourceChangesDetected: true,
      invalidation: "see context-invalidation.json",
      caveat: "one context per entry is the best-case warm path; this measurement does not establish safe global cache bounds, resident esbuild-service memory under many entry contexts, Metro transformer worker lifecycle disposal, or React Native runtime/device performance",
    },
    runs,
  }
  fs.writeFileSync(path.join(scratchRoot, "context-ab-results.json"), JSON.stringify(summary, null, 2) + "\n")
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n")
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
