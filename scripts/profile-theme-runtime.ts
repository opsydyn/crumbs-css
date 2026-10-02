import { createHash } from "node:crypto"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire, SourceMap } from "node:module"
import { basename, join, relative, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { aggregateCpuProfiles, attributeProfileFrame, normalizeGeneratedJavaScript, type RuntimeCpuProfile, type RuntimeProfileCallFrame } from "../packages/css/bench/runtime-import-profile"
import { readEmittedGraph } from "../packages/css/bench/effect-boundary-audit"

type BuildConfig = Readonly<{
  entry?: Readonly<Record<string, string>>
  outDir?: string
  target?: string
  format?: ReadonlyArray<string>
  deps?: unknown
  minify?: unknown
  [key: string]: unknown
}>

type MapRecord = {
  sourceMap: SourceMap | undefined
  generatedFilesMatch: boolean
}

type ArtifactGraph = ReturnType<typeof readEmittedGraph>

const packageRoot = resolve(import.meta.dir, "../packages/css")
const repoRoot = resolve(packageRoot, "../..")
const packageRequire = createRequire(join(packageRoot, "package.json"))
const floorNode = process.env.CRUMBS_AUDIT_NODE_FLOOR
if (!floorNode) throw Error("CRUMBS_AUDIT_NODE_FLOOR is required and must point to exact Node v22.0.0")

function command(program: string, args: string[]) {
  const result = Bun.spawnSync([program, ...args], {
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString().trim(),
    stderr: result.stderr.toString().trim(),
  }
}

function requireCommand(program: string, args: string[], label: string) {
  const result = command(program, args)
  if (result.exitCode !== 0) throw Error(label + " failed (" + result.exitCode + "): " + result.stdout + "\n" + result.stderr)
  return result.stdout
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

function hashFile(file: string): string {
  return sha256(readFileSync(file))
}

function packageVersion(name: string): string | null {
  try {
    return String(packageRequire(name + "/package.json").version)
  } catch {
    return null
  }
}

function selectedRuntimeConfig(configs: ReadonlyArray<BuildConfig>, entryName: "theme-core" | "theme"): BuildConfig {
  const config = configs.find(candidate => candidate.entry && Object.hasOwn(candidate.entry, entryName))
  if (!config?.entry) throw Error("No production tsdown configuration owns the " + entryName + " runtime entry")
  if (config.minify) throw Error("The " + entryName + " runtime entry must use the default unminified build")
  return config
}

function buildScript(entryName: "theme-core" | "theme", outDir: string): string {
  const tsdownUrl = pathToFileURL(packageRequire.resolve("tsdown")).href
  const configUrl = pathToFileURL(join(packageRoot, "tsdown.config.ts")).href
  return [
    "import { build } from " + JSON.stringify(tsdownUrl),
    "import configs from " + JSON.stringify(configUrl),
    "const config = configs.find(candidate => candidate.entry && Object.hasOwn(candidate.entry, " + JSON.stringify(entryName) + "))",
    "if (!config) throw Error(" + JSON.stringify("Missing production entry configuration for " + entryName) + ")",
    "await build({ ...config, config: false, cwd: " + JSON.stringify(packageRoot) + ", outDir: " + JSON.stringify(outDir) + ", clean: true, dts: false, sourcemap: true, logLevel: \"error\", report: false })",
  ].join("\n")
}

function runScratchBuild(node: string, entryName: "theme-core" | "theme", outDir: string) {
  const script = buildScript(entryName, outDir)
  const result = Bun.spawnSync([node, "--input-type=module", "-e", script], {
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  if (result.exitCode !== 0) {
    throw Error("Source-map diagnostic build for " + entryName + " failed (" + result.exitCode + "):\n" +
      result.stdout.toString() + "\n" + result.stderr.toString())
  }
}

function graphEntry(root: string, name: "theme-core" | "theme", format: "esm" | "cjs"): string {
  const extension = format === "esm" ? "mjs" : "cjs"
  const entry = join(root, name + "." + extension)
  if (!existsSync(entry)) throw Error("Missing " + entry + "; build the default package before profiling")
  return entry
}

function sourceMapFor(file: string): { sourceMap?: SourceMap; issue?: string; sha256?: string } {
  const mapFile = file + ".map"
  if (!existsSync(mapFile)) return { issue: "source-map-missing" }
  const bytes = readFileSync(mapFile)
  try {
    const parsed = JSON.parse(bytes.toString()) as Record<string, unknown>
    if (typeof parsed.mappings !== "string" || !Array.isArray(parsed.sources) ||
      typeof parsed.version !== "number") {
      return { issue: "source-map-format-unsupported", sha256: sha256(bytes) }
    }
    const sourceMap = new SourceMap({
      version: parsed.version,
      file: typeof parsed.file === "string" ? parsed.file : basename(file),
      sources: parsed.sources.filter((source): source is string => typeof source === "string"),
      sourcesContent: Array.isArray(parsed.sourcesContent)
        ? parsed.sourcesContent.filter((source): source is string => typeof source === "string")
        : [],
      names: Array.isArray(parsed.names)
        ? parsed.names.filter((name): name is string => typeof name === "string")
        : [],
      mappings: parsed.mappings,
      sourceRoot: typeof parsed.sourceRoot === "string" ? parsed.sourceRoot : "",
    })
    return { sourceMap, sha256: sha256(bytes) }
  } catch (error) {
    return {
      issue: "source-map-parse-error: " + (error instanceof Error ? error.message : String(error)),
      sha256: sha256(bytes),
    }
  }
}

function pairGraphs(defaultRoot: string, diagnosticRoot: string, defaultGraph: ArtifactGraph, diagnosticGraph: ArtifactGraph) {
  const defaultFiles = new Map(defaultGraph.artifacts.map(artifact => [relative(defaultRoot, artifact.file), artifact]))
  const diagnosticFiles = new Map(diagnosticGraph.artifacts.map(artifact => [relative(diagnosticRoot, artifact.file), artifact]))
  const mapByDefaultFile = new Map<string, MapRecord>()
  const files = new Set([...defaultFiles.keys(), ...diagnosticFiles.keys()])
  const parity = [...files].sort().map(file => {
    const defaultFile = join(defaultRoot, file)
    const diagnosticFile = join(diagnosticRoot, file)
    const defaultExists = defaultFiles.has(file)
    const diagnosticExists = diagnosticFiles.has(file)
    const defaultHash = defaultExists ? sha256(normalizeGeneratedJavaScript(readFileSync(defaultFile, "utf8"))) : null
    const diagnosticHash = diagnosticExists ? sha256(normalizeGeneratedJavaScript(readFileSync(diagnosticFile, "utf8"))) : null
    const generatedFilesMatch = defaultExists && diagnosticExists && defaultHash === diagnosticHash
    const map = diagnosticExists ? sourceMapFor(diagnosticFile) : { issue: "diagnostic-file-missing" }
    if (defaultExists) {
      mapByDefaultFile.set(resolve(defaultFile), {
        sourceMap: map.sourceMap,
        generatedFilesMatch,
      })
    }
    return {
      file,
      defaultExists,
      diagnosticExists,
      defaultNormalizedSha256: defaultHash,
      diagnosticNormalizedSha256: diagnosticHash,
      generatedFilesMatch,
      sourceMapSha256: map.sha256 ?? null,
      sourceMapIssue: map.issue ?? null,
    }
  })
  return { mapByDefaultFile, parity }
}

function profilePath(frame: RuntimeProfileCallFrame): string | undefined {
  if (!frame.url.startsWith("file:")) return undefined
  try {
    return resolve(fileURLToPath(frame.url))
  } catch {
    return undefined
  }
}

const probeSource = [
  'import inspector from "node:inspector";',
  'import { createRequire } from "node:module";',
  'import { writeFile } from "node:fs/promises";',
  'import { performance } from "node:perf_hooks";',
  'import { pathToFileURL } from "node:url";',
  "",
  "const [format, entry, profileFile] = process.argv.slice(1);",
  "const session = new inspector.Session();",
  "const post = (method, params = {}) => new Promise((resolve, reject) => {",
  "  session.post(method, params, (error, value) => error ? reject(error) : resolve(value));",
  "});",
  "const require = createRequire(import.meta.url);",
  "session.connect();",
  "try {",
  '  await post("Profiler.enable");',
  '  await post("Profiler.setSamplingInterval", { interval: 1000 });',
  '  await post("Profiler.start");',
  "  const start = performance.now();",
  '  const api = format === "esm" ? await import(pathToFileURL(entry).href) : require(entry);',
  "  const loadMs = performance.now() - start;",
  '  const stopped = await post("Profiler.stop");',
  "  session.disconnect();",
  "",
  "  const value = api.resolveThemeTokens(",
  '    { width: api.createThemeTokenReference("--crumbs-width") },',
  '    { contract: {}, values: {}, tokens: { "--crumbs-width": 24 } },',
  "  );",
  '  if (value.width !== 24) throw Error("resolveThemeTokens behavior receipt failed");',
  '  if (!stopped.profile || !Array.isArray(stopped.profile.nodes)) throw Error("Node inspector returned no CPU profile");',
  '  await writeFile(profileFile, JSON.stringify(stopped.profile) + "\\n");',
  "  process.stdout.write(JSON.stringify({",
  "    node: process.version,",
  "    execPath: process.execPath,",
  "    loadMs,",
  '    receipt: "passed",',
  "  }));",
  "} catch (error) {",
  "  try { session.disconnect(); } catch {}",
  "  throw error;",
  "}",
].join("\n")

function runProfile(node: string, format: "esm" | "cjs", entry: string, profileFile: string) {
  const result = Bun.spawnSync([node, "--input-type=module", "-e", probeSource, format, entry, profileFile], {
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  if (result.exitCode !== 0) {
    throw Error("CPU profile probe failed for " + format + " " + entry + " (" + result.exitCode + "):\n" +
      result.stdout.toString() + "\n" + result.stderr.toString())
  }
  return JSON.parse(result.stdout.toString()) as {
    node: string
    execPath: string
    loadMs: number
    receipt: string
  }
}

function trackedSourceHashes(): ReadonlyArray<{ file: string; sha256: string }> {
  const listed = requireCommand("git", [
    "ls-files", "-z", "packages/css/src", "packages/css/tsdown.config.ts", "packages/css/build-policy.ts",
  ], "List profiled source files")
  const files = listed.split("\0").filter(Boolean).sort()
  return files.map(file => ({ file, sha256: hashFile(join(repoRoot, file)) }))
}

async function main() {
  const floorPath = resolve(floorNode!)
  const floorVersion = requireCommand(floorPath, ["-p", "process.version"], "Check Node floor")
  if (floorVersion !== "v22.0.0") throw Error("Expected exact Node v22.0.0, received " + floorVersion)
  const currentNode = requireCommand("node", ["-p", "process.execPath"], "Find current Node executable")
  const currentVersion = requireCommand(currentNode, ["-p", "process.version"], "Check current Node version")
  const runtimes = [
    { name: "floor", executable: floorPath, version: floorVersion },
    { name: "current", executable: currentNode, version: currentVersion },
  ] as const
  const configs = (await import("../packages/css/tsdown.config")).default as unknown as ReadonlyArray<BuildConfig>
  const entries = [
    { name: "theme-core" as const, sourceEntry: "theme-core" as const },
    { name: "theme" as const, sourceEntry: "theme" as const },
  ]
  for (const entry of entries) selectedRuntimeConfig(configs, entry.sourceEntry)
  const sourceRevision = requireCommand("git", ["rev-parse", "HEAD"], "Read source revision")
  const now = new Date().toISOString().replaceAll(":", "-")
  const outputDirectory = mkdtempSync(join("/private/tmp", "crumbs-m10-5-profile-" + now + "-"))
  const rawDirectory = join(outputDirectory, "raw")
  const diagnosticDirectory = join(outputDirectory, "source-map-build")
  mkdirSync(rawDirectory, { recursive: true })
  mkdirSync(diagnosticDirectory, { recursive: true })

  const packageDist = join(packageRoot, "dist")
  const diagnosticRoots = new Map<string, string>()
  for (const entry of entries) {
    const output = join(diagnosticDirectory, entry.name)
    mkdirSync(output, { recursive: true })
    runScratchBuild(currentNode, entry.sourceEntry, output)
    diagnosticRoots.set(entry.name, output)
  }

  const graphs = new Map<string, {
    default: ArtifactGraph
    diagnostic: ArtifactGraph
    maps: Map<string, MapRecord>
    parity: ReturnType<typeof pairGraphs>["parity"]
  }>()
  for (const entry of entries) {
    for (const format of ["esm", "cjs"] as const) {
      const defaultEntry = graphEntry(packageDist, entry.name, format)
      const diagnosticEntry = graphEntry(diagnosticRoots.get(entry.name)!, entry.name, format)
      const defaultGraph = readEmittedGraph(defaultEntry)
      const diagnosticGraph = readEmittedGraph(diagnosticEntry)
      const pair = pairGraphs(packageDist, diagnosticRoots.get(entry.name)!, defaultGraph, diagnosticGraph)
      graphs.set(entry.name + ":" + format, {
        default: defaultGraph,
        diagnostic: diagnosticGraph,
        maps: pair.mapByDefaultFile,
        parity: pair.parity,
      })
    }
  }

  const scenarios = []
  for (const runtime of runtimes) {
    for (const format of ["esm", "cjs"] as const) {
      for (const entry of entries) {
        const key = entry.name + ":" + format
        const graph = graphs.get(key)!
        const defaultEntry = graphEntry(packageDist, entry.name, format)
        const retainedProfiles: RuntimeCpuProfile[] = []
        const samples = []

        for (let repetition = 0; repetition <= 15; repetition += 1) {
          const role = repetition === 0 ? "warmup" : "sample"
          const index = repetition === 0 ? 0 : repetition
          const suffix = repetition === 0 ? "warmup" : "sample-" + String(index).padStart(2, "0")
          const rawFile = join(rawDirectory, runtime.name + "-" + format + "-" + entry.name + "-" + suffix + ".cpuprofile")
          const receipt = runProfile(runtime.executable, format, defaultEntry, rawFile)
          if (receipt.node !== runtime.version || resolve(receipt.execPath) !== resolve(runtime.executable)) {
            throw Error("Child runtime identity mismatch: expected " + runtime.version + " " + runtime.executable +
              ", received " + receipt.node + " " + receipt.execPath)
          }
          const profile = JSON.parse(readFileSync(rawFile, "utf8")) as RuntimeCpuProfile
          const profileRecord = {
            role,
            sample: repetition === 0 ? null : index,
            profileFile: rawFile,
            profileSha256: hashFile(rawFile),
            loadMs: receipt.loadMs,
            node: receipt.node,
            execPath: receipt.execPath,
            behaviorReceipt: receipt.receipt,
            totalSamples: profile.samples?.length ?? 0,
          }
          samples.push(profileRecord)
          if (role === "sample") retainedProfiles.push(profile)
        }

        const attribute = (frame: RuntimeProfileCallFrame) => {
          const path = profilePath(frame)
          const mapping = path ? graph.maps.get(path) : undefined
          return attributeProfileFrame(frame, mapping?.sourceMap, mapping?.generatedFilesMatch ?? true)
        }
        scenarios.push({
          runtime: runtime.name,
          format,
          entry: entry.name,
          executable: runtime.executable,
          node: runtime.version,
          defaultEntry,
          defaultGraph: graph.default,
          diagnosticGraph: graph.diagnostic,
          normalizedGeneratedFileParity: graph.parity,
          sampleProtocol: { excludedWarmupCount: 1, retainedSampleCount: 15, profilerIntervalMicros: 1000 },
          samples,
          summary: aggregateCpuProfiles(retainedProfiles, attribute),
        })
      }
    }
  }

  const report = {
    formatVersion: 1,
    recordedAt: new Date().toISOString(),
    sourceRevision,
    sourceState: "Profiles use the default unminified dist generated from the source files identified by hashes below; all source-map builds and raw profiles are temporary diagnostics.",
    sourceHashes: trackedSourceHashes(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      bun: Bun.version,
      floorNode: { executable: floorPath, version: floorVersion },
      currentNode: { executable: currentNode, version: currentVersion },
      nodeOptions: process.env.NODE_OPTIONS ?? "unset",
    },
    build: {
      package: packageVersion("@opsydyn/crumbs-css"),
      tsdown: packageVersion("tsdown"),
      rolldown: packageVersion("rolldown"),
      target: "node22",
      defaultMinified: false,
      sourceMapBuildNode: { executable: currentNode, version: currentVersion },
      sourceMapBuilds: [...diagnosticRoots].map(([entry, root]) => ({ entry, root })),
    },
    protocol: {
      scope: "CPU profiles start after harness setup and stop immediately after ESM import or CJS require. resolveThemeTokens receipt runs after profiler stop.",
      matrix: "theme-core and compatibility theme; ESM and CJS; exact Node v22.0.0 and current Node",
      warmup: "One fresh-process warmup per matrix cell, excluded from aggregate",
      retainedSamples: "Fifteen fresh processes per matrix cell",
      sampleTime: "Profiler timeDeltas are diagnostic CPU sample intervals in microseconds; loadMs is diagnostic wall time and is never compared with an approved budget.",
      sourceMaps: "Maps come from the same source revision and production entry config. Source attribution is allowed only when normalized default and diagnostic generated JavaScript hashes match.",
    },
    scenarios,
    outputDirectory,
  }
  const reportFile = join(outputDirectory, "profile-manifest.json")
  writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n")
  console.log("PROFILE_THEME_RUNTIME_REPORT " + reportFile)
}

if (import.meta.main) await main()
