import ts from "typescript"
import { readFileSync, existsSync, statSync, mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import { createHash } from "node:crypto"
import { pathToFileURL } from "node:url"

const packageRoot = path.resolve(import.meta.dir, "..")
const packageRequire = createRequire(path.join(packageRoot, "package.json"))
export type LoadSample = { loadMs: number; heapDeltaBytes: number; rssDeltaBytes: number }
export function summarizeLoadSamples(samples: ReadonlyArray<LoadSample>) {
  if (!samples.length) throw Error("No load samples")
  function summarize(key: keyof LoadSample) {
    const values = samples.map(sample => sample[key]).sort((a, b) => a - b)
    if (values.some(value => !Number.isFinite(value))) throw Error("Load samples must be finite")
    const mid = Math.floor(values.length / 2)
    return { min: values[0]!, median: values.length % 2 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2, max: values.at(-1)! }
  }
  return { loadMs: summarize("loadMs"), heapDeltaBytes: summarize("heapDeltaBytes"), rssDeltaBytes: summarize("rssDeltaBytes") }
}

export function readEmittedGraph(entry: string) {
  const files = new Set<string>(), externals = new Set<string>()
  let bytes = 0, nonliteralLoads = 0
  function visit(file: string) {
    if (files.has(file)) return
    if (!existsSync(file)) throw Error(`Missing emitted dependency: ${file}`)
    files.add(file)
    const source = readFileSync(file, "utf8")
    bytes += Buffer.byteLength(source)
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    function dependency(name: string) {
      if (name.startsWith(".")) visit(path.resolve(path.dirname(file), name))
      else externals.add(name)
    }
    function isStaticSpecifier(node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
      return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    }
    function walk(node: ts.Node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) dependency(node.moduleSpecifier.text)
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && ["require", "__require"].includes(node.expression.text))) {
        const first = node.arguments[0]
        if (first && isStaticSpecifier(first)) dependency(first.text)
        else nonliteralLoads++
      }
      ts.forEachChild(node, walk)
    }
    walk(ast)
  }
  visit(path.resolve(entry))
  return { files: [...files].sort(), artifacts: [...files].sort().map(file => ({ file, bytes: statSync(file).size, sha256: createHash("sha256").update(readFileSync(file)).digest("hex") })), externals: [...externals].sort(), bytes, nonliteralLoads }
}

export async function buildContractCandidate(outDir: string, bundleEffect = true) {
  // Run tsdown in its supported Node host, just like the production CLI.
  // Its in-process native build stalls under the Bun test host on this checkout.
  const script = `
    import { build } from ${JSON.stringify(pathToFileURL(packageRequire.resolve("tsdown")).href)};
    import { compilerDependencies } from ${JSON.stringify(pathToFileURL(path.join(packageRoot, "build-policy.ts")).href)};
    await build({
      config: false, cwd: ${JSON.stringify(packageRoot)}, entry: { contracts: "src/contracts/payloads.ts" },
      outDir: ${JSON.stringify(outDir)}, format: ["esm", "cjs"], target: "node22", shims: true,
      dts: false, sourcemap: true, logLevel: "error", report: false,
      deps: ${bundleEffect ? "compilerDependencies" : "{ neverBundle: [...compilerDependencies.neverBundle, /^effect(?:\\/|$)/] }"},
    });`
  const child = Bun.spawn(["node", "--input-type=module", "-e", script], { cwd: packageRoot, stdout: "pipe", stderr: "pipe" })
  const [exitCode, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
  if (exitCode !== 0) throw Error(`Candidate build failed (${exitCode}): ${stdout}\n${stderr}`)
  return { esm: path.join(outDir, "contracts.mjs"), cjs: path.join(outDir, "contracts.cjs") }
}

function execute(node: string, args: string[]) {
  const result = Bun.spawnSync([node, ...args], { stdout: "pipe", stderr: "pipe", cwd: packageRoot })
  return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() }
}

export function probeBoundary(node: string, entry: string, format: "esm" | "cjs", scenario: "compiler" | "runtime" | "internal-contract") {
  const fixture = { _tag: "NativeArtifact", version: 1, contract: { owner: "@acme/tokens", name: "foundation", version: 1 }, declarations: [{ _tag: "NativeDeclaration", property: "opacity", value: 0.5, source: { file: "probe.css.ts", exportName: "probe", path: ["opacity"] } }] }
  const imports = format === "esm"
    ? 'import {createRequire} from "node:module"; import {performance} from "node:perf_hooks"; import {statSync} from "node:fs"; import {pathToFileURL} from "node:url"; const require = createRequire(import.meta.url);'
    : 'const {performance} = require("node:perf_hooks"); const {statSync} = require("node:fs");'
  const script = `${imports}
    (async () => {
      global.gc(); const before = process.memoryUsage(); const cached = new Set(Object.keys(require.cache));
      const start = performance.now();
      const api = ${format === "esm" ? `await import(pathToFileURL(${JSON.stringify(entry)}).href)` : `require(${JSON.stringify(entry)})`};
      const loadMs = performance.now() - start;
      global.gc(); const after = process.memoryUsage();
      let firstDecodeMs = null;
      if (${JSON.stringify(scenario)} === 'internal-contract') {
        const fixture = ${JSON.stringify(fixture)};
        const startDecode = performance.now(); const result = api.nativeArtifactCodec.decodeJson(JSON.stringify(fixture)); firstDecodeMs = performance.now() - startDecode;
        if (!result.ok || result.value.declarations[0].value !== 0.5 || JSON.parse(api.nativeArtifactCodec.encode(result.value).value).version !== 1) throw Error('Invalid codec receipt');
        if (api.nativeArtifactCodec.decode({...fixture,version:2}).ok) throw Error('Unsupported version admitted');
      } else if (${JSON.stringify(scenario)} === 'runtime') {
        const value = api.resolveThemeTokens({width:api.createThemeTokenReference('--crumbs-width')},{contract:{},values:{},tokens:{'--crumbs-width':24}});
        if (value.width !== 24) throw Error('Invalid runtime receipt');
      } else if (typeof api.transformCssTsToStyleSheet !== 'function') throw Error('Compiler entry missing');
      const cacheFiles = Object.keys(require.cache).filter(file => !cached.has(file));
      console.log(JSON.stringify({node:process.version,execPath:process.execPath,loadMs,heapDeltaBytes:after.heapUsed-before.heapUsed,rssDeltaBytes:after.rss-before.rss,firstDecodeMs,receipt:'passed',cacheFiles,cacheBytes:cacheFiles.reduce((sum,file)=>sum+statSync(file).size,0)}));
    })().catch(error => { console.error(error); process.exitCode=1; });`
  const result = execute(node, ["--expose-gc", ...(format === "esm" ? ["--input-type=module"] : []), "-e", script])
  if (result.exitCode !== 0) throw Error(JSON.stringify(result))
  return JSON.parse(result.stdout) as LoadSample & { node: string; firstDecodeMs: number | null; cacheFiles: string[]; cacheBytes: number; receipt: string }
}

export async function runEffectBoundaryAudit(floorNode: string, repetitions = 5) {
  if (!floorNode) throw Error("CRUMBS_AUDIT_NODE_FLOOR is required; no silent floor qualification skip")
  if (!Number.isInteger(repetitions) || repetitions < 5) throw Error("At least five independent process repetitions required")
  const floor = execute(floorNode, ["-p", "process.version"])
  if (floor.exitCode || floor.stdout.trim() !== "v22.0.0") throw Error("Expected exact Node v22.0.0 floor runtime")
  const current = execute("node", ["-p", "process.execPath"])
  if (current.exitCode) throw Error("Current Node unavailable")
  const currentNode = current.stdout.trim()
  const output = mkdtempSync(path.join(tmpdir(), "crumbs-effect-boundaries-"))
  const bundled = await buildContractCandidate(path.join(output, "bundled"))
  const external = await buildContractCandidate(path.join(output, "external"), false)
  const effectRoot = path.dirname(packageRequire.resolve("effect/package.json"))
  const externalModules = path.join(output, "external/node_modules")
  mkdirSync(externalModules, { recursive: true })
  symlinkSync(effectRoot, path.join(externalModules, "effect"), "junction")
  const control = execute(floorNode, ["-e", `require(${JSON.stringify(external.cjs)})`])
  if (control.exitCode === 0 || !control.stderr.includes("ERR_REQUIRE_ESM")) throw Error("External Effect floor negative control did not demonstrate ERR_REQUIRE_ESM")
  const externalInterop = [
    { runtime: "floor", format: "esm", sample: probeBoundary(floorNode, external.esm, "esm", "internal-contract") },
    { runtime: "current", format: "esm", sample: probeBoundary(currentNode, external.esm, "esm", "internal-contract") },
    { runtime: "current", format: "cjs", sample: probeBoundary(currentNode, external.cjs, "cjs", "internal-contract") },
  ]
  const emittedInventory = ["index", "metro-plugin", "style", "transformer", "theme"].flatMap(name =>
    ["mjs", "cjs"].map(format => ({ name, format, graph: readEmittedGraph(path.join(packageRoot, "dist", `${name}.${format}`)) })),
  )
  const candidateMaps = Object.entries(bundled).map(([format, entry]) => {
    const map = JSON.parse(readFileSync(`${entry}.map`, "utf8")) as { sources: string[] }
    return { format, effectSources: map.sources.filter(source => /(?:^|\/)node_modules\/effect\//.test(source.replaceAll("\\", "/"))), mapSha256: createHash("sha256").update(readFileSync(`${entry}.map`)).digest("hex") }
  })
  if (candidateMaps.some(map => !map.effectSources.length)) throw Error("Bundled candidate map lacks Effect sources")
  const scenarios = [
    { name: "compiler" as const, entries: { esm: path.join(packageRoot, "dist/transformer.mjs"), cjs: path.join(packageRoot, "dist/transformer.cjs") } },
    { name: "runtime" as const, entries: { esm: path.join(packageRoot, "dist/theme.mjs"), cjs: path.join(packageRoot, "dist/theme.cjs") } },
    { name: "internal-contract" as const, entries: bundled },
  ]
  const results = []
  for (const scenario of scenarios) {
    for (const format of ["esm", "cjs"] as const) {
      const entry = scenario.entries[format], graph = readEmittedGraph(entry)
      if (scenario.name === "runtime" && JSON.stringify(graph.externals) !== JSON.stringify(["react"])) throw Error("Ordinary runtime graph must be React-only")
      if (graph.externals.some(name => /^effect(?:\/|$)/.test(name))) throw Error("Unexpected external Effect in selected emitted graph")
      for (const [runtime, node] of [["floor", floorNode], ["current", currentNode]] as const) {
        const samples = Array.from({ length: repetitions }, () => probeBoundary(node, entry, format, scenario.name))
        results.push({ scenario: scenario.name, format, runtime, graph, sha256: createHash("sha256").update(readFileSync(entry)).digest("hex"), samples, summary: summarizeLoadSamples(samples) })
      }
    }
  }
  const result = {
    recordedAt: new Date().toISOString(),
    sourceState: "Working tree based on sourceRevision; retained source and emitted hashes identify this audit before its commit",
    sourceFiles: ["tsdown.config.ts", "build-policy.ts", "bench/effect-boundary-audit.ts", "src/contracts/payloads.ts", "src/contracts/data-codec.ts"].map(relative => ({ relative, sha256: createHash("sha256").update(readFileSync(path.join(packageRoot, relative))).digest("hex") })),
    sourceRevision: Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: packageRoot, stdout: "pipe" }).stdout.toString().trim(),
    effect: packageRequire("effect/package.json").version,
    build: { tool: "tsdown", version: packageRequire("tsdown/package.json").version, target: "node22", minified: false, bundledInternalCandidate: true },
    environment: { platform: process.platform, architecture: process.arch, floorNode, currentNode, floorBinarySha256: createHash("sha256").update(readFileSync(floorNode)).digest("hex"), repetitions, nodeEnv: process.env.NODE_ENV ?? "unset" },
    emittedInventory, candidateMaps, externalInterop,
    externalEffectFloorControl: { expectedFailure: "ERR_REQUIRE_ESM", ...control },
    externalThemeDecoder: { status: "absent", qualification: "deferred until an actual entrypoint exists; internal artifact codec is not an external theme decoder" },
    protocol: { scope: "Fresh Node process module load/evaluation after harness imports; process startup excluded; scenarios/formats/runtimes sampled in recorded order; OS filesystem caches uncontrolled/warm across repetitions", memory: "heapUsed and RSS deltas after forced GC before/after module load; not peak allocations or exclusively Effect-owned memory", firstDecode: "One small prototype artifact immediately after load/GC; not throughput, warmed latency or theme decoding", graph: "AST-scanned emitted local module graph with direct externals/nonliteral loads; cacheFiles inventory observes CJS cache only, not complete ESM/vendor closure", environment: "macOS Node host measurements, not release Hermes/device measurements or calibrated budgets" },
    results,
  }
  writeFileSync(path.join(output, "audit.json"), JSON.stringify(result, null, 2) + "\n")
  return { output, result }
}

if (import.meta.main) {
  const audit = await runEffectBoundaryAudit(process.env.CRUMBS_AUDIT_NODE_FLOOR ?? "")
  console.log(JSON.stringify(audit, null, 2))
}
