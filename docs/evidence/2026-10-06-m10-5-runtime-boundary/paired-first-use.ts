import {createHash} from "node:crypto"
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync} from "node:fs"
import {cpus, release} from "node:os"
import {dirname, join, resolve} from "node:path"
import {tmpdir} from "node:os"
import {execFileSync} from "node:child_process"
import {readEmittedGraph} from "../../../packages/css/bench/effect-boundary-audit"

const repoRoot = resolve(import.meta.dir, "../../..")
const packageRoot = join(repoRoot, "packages/css")
const evidenceRoot = import.meta.dir
const controlArchive = join(evidenceRoot, "control-package.tar.gz")
const nodeFloor = process.env.CRUMBS_AUDIT_NODE_FLOOR
if (!nodeFloor) throw Error("CRUMBS_AUDIT_NODE_FLOOR must point to the exact Node v22.0.0 executable")
const floorVersion = Bun.spawnSync([nodeFloor, "-p", "process.version"], {stdout: "pipe", stderr: "pipe"})
if (floorVersion.exitCode !== 0 || floorVersion.stdout.toString().trim() !== "v22.0.0") {
  throw Error("Paired runtime boundary measurement requires exact Node v22.0.0")
}
const currentNode = Bun.spawnSync(["node", "-p", "process.execPath"], {stdout: "pipe", stderr: "pipe"})
if (currentNode.exitCode !== 0) throw Error("Configured current Node executable is unavailable")
const nodeCurrent = currentNode.stdout.toString().trim()
const outputPath = resolve(process.argv[2] ?? join(evidenceRoot, "paired-first-use.json"))
const probeRoot = mkdtempSync(join(tmpdir(), "crumbs-m10-5-runtime-pair-"))
const workspaceModules = realpathSync(join(repoRoot, "node_modules"))

function stagePackage(kind: "control" | "candidate"): string {
  const fixtureRoot = join(probeRoot, kind)
  const packageDir = join(fixtureRoot, "node_modules/@opsydyn/crumbs-css")
  mkdirSync(packageDir, {recursive: true})
  if (kind === "control") {
    execFileSync("tar", ["-xzf", controlArchive, "-C", packageDir])
  } else {
    cpSync(join(packageRoot, "package.json"), join(packageDir, "package.json"))
    cpSync(join(packageRoot, "dist"), join(packageDir, "dist"), {recursive: true})
  }
  for (const peer of ["react", "react-dom"]) {
    const peerPath = join(workspaceModules, peer)
    if (!existsSync(peerPath)) throw Error(`Missing workspace peer package: ${peer}`)
    symlinkSync(realpathSync(peerPath), join(fixtureRoot, "node_modules", peer), "dir")
  }
  return fixtureRoot
}

const fixtures = {
  control: stagePackage("control"),
  candidate: stagePackage("candidate"),
}

const cases = ["token", "component", "extension", "scope"] as const
type CaseName = typeof cases[number]
type Format = "esm" | "cjs"
type Runtime = "node-22.0.0" | "current-node"
type Sample = {readonly importMs: number; readonly firstUseMs: number; readonly importPlusFirstUseMs: number}

function probeSource(format: Format, scenario: CaseName): string {
  const prelude = format === "esm"
    ? `import {performance} from "node:perf_hooks";
      ${scenario === "scope" ? `const React = await import("react");
      const server = await import("react-dom/server");
      const tokens = await import("@opsydyn/crumbs-css/tokens");` : ""}`
    : `const {performance} = require("node:perf_hooks");
      ${scenario === "scope" ? `const React = require("react");
      const server = require("react-dom/server");
      const tokens = require("@opsydyn/crumbs-css/tokens");` : ""}`
  const load = format === "esm"
    ? `await import("@opsydyn/crumbs-css/theme")`
    : `require("@opsydyn/crumbs-css/theme")`
  const setupScope = scenario === "scope"
    ? `const contract = tokens.createTokenContract({color: {accent: tokens.defineToken("color")}}, {owner: "@acme/tokens", name: "m10-5-scope", version: 1});
      const baseTheme = tokens.createTokenTheme(contract, {color: {accent: "#111111"}});`
    : ""
  let operation: string
  switch (scenario) {
    case "token":
      operation = `const reference = api.createThemeTokenReference("--crumbs-m10-5-probe");
        const result = api.resolveThemeTokens({width: reference}, theme);
        if (result?.width !== 24) throw Error("plain token first-use receipt failed");`
      break
    case "component":
      operation = `const token = api.createThemeTokenReference("--crumbs-m10-5-probe");
        const recipe = {$$type: "crumbs.css.component-recipe", version: 1, slots: {root: "view"}, base: {root: {width: token}}, variants: {}, defaultVariants: {}, compoundVariants: []};
        const result = api.resolveThemeTokens(recipe, theme);
        if (result?.base?.root?.width !== 24) throw Error("component first-use receipt failed");`
      break
    case "extension":
      operation = `const token = api.createThemeTokenReference("--crumbs-m10-5-probe");
        const extension = {$$type: "crumbs.css.component-recipe-extension", version: 1,
          identity: {owner: "@acme/brand", name: "M105Extension", version: 1},
          componentIdentity: {owner: "@acme/ui", name: "M105Button", version: 1},
          defaultVariants: {tone: "accent"}, variants: {tone: {accent: {root: {width: token}}}},
          compoundVariants: [], slotOverrides: {}};
        const result = api.resolveThemeTokens(extension, theme);
        if (result?.variants?.tone?.accent?.root?.width !== 24) throw Error("extension first-use receipt failed");`
      break
    case "scope":
      operation = `const tree = React.createElement(api.TokenThemeProvider, {contract, theme: baseTheme},
          React.createElement(api.TokenThemeScopeProvider, {contract, context: "mode", values: {color: {accent: "#222222"}}},
            React.createElement("span", null, "scope-ready")));
        const result = server.renderToStaticMarkup(tree);
        if (result !== "<span>scope-ready</span>") throw Error("scope first-use receipt failed: " + result);`
      break
  }
  return `${prelude}
    ${setupScope}
    if (global.gc) global.gc();
    const importStarted = performance.now();
    const api = ${load};
    const importMs = performance.now() - importStarted;
    const theme = {contract: {}, values: {}, tokens: {"--crumbs-m10-5-probe": 24}};
    const firstUseStarted = performance.now();
    ${operation}
    const firstUseMs = performance.now() - firstUseStarted;
    process.stdout.write(JSON.stringify({node: process.version, importMs, firstUseMs, importPlusFirstUseMs: importMs + firstUseMs}));`
}

function runProbe(node: string, fixtureRoot: string, format: Format, scenario: CaseName): Sample & {readonly node: string} {
  const args = ["--expose-gc", ...(format === "esm" ? ["--input-type=module"] : []), "-e", probeSource(format, scenario)]
  const result = Bun.spawnSync([node, ...args], {cwd: fixtureRoot, stdout: "pipe", stderr: "pipe"})
  if (result.exitCode !== 0) throw Error(`Paired ${scenario}/${format} probe failed: ${result.stderr.toString()}`)
  const sample = JSON.parse(result.stdout.toString()) as Sample & {readonly node: string}
  if (!Number.isFinite(sample.importMs) || !Number.isFinite(sample.firstUseMs) || !Number.isFinite(sample.importPlusFirstUseMs)) {
    throw Error(`Paired ${scenario}/${format} probe returned an invalid timing sample`)
  }
  return sample
}

function summarize(values: ReadonlyArray<number>) {
  if (values.length !== 15) throw Error(`Expected 15 paired measurements; received ${values.length}`)
  const sorted = [...values].sort((a, b) => a - b)
  return {min: sorted[0]!, median: sorted[Math.floor(sorted.length / 2)]!, max: sorted.at(-1)!}
}

const results = []
for (const [runtime, node] of [["node-22.0.0", nodeFloor], ["current-node", nodeCurrent]] as const) {
  for (const format of ["esm", "cjs"] as const) {
    for (const scenario of cases) {
      const controlSamples: Sample[] = []
      const candidateSamples: Sample[] = []
      const pairs = []
      for (let index = 0; index < 15; index += 1) {
        const order = index % 2 === 0 ? ["control", "candidate"] as const : ["candidate", "control"] as const
        const pair: Partial<Record<"control" | "candidate", Sample>> = {}
        for (const kind of order) pair[kind] = runProbe(node, fixtures[kind], format, scenario)
        controlSamples.push(pair.control!)
        candidateSamples.push(pair.candidate!)
        pairs.push({sample: index + 1, order, control: pair.control, candidate: pair.candidate})
      }
      const controlCombined = summarize(controlSamples.map(sample => sample.importPlusFirstUseMs))
      const candidateCombined = summarize(candidateSamples.map(sample => sample.importPlusFirstUseMs))
      const controlImport = summarize(controlSamples.map(sample => sample.importMs))
      const candidateImport = summarize(candidateSamples.map(sample => sample.importMs))
      const controlFirstUse = summarize(controlSamples.map(sample => sample.firstUseMs))
      const candidateFirstUse = summarize(candidateSamples.map(sample => sample.firstUseMs))
      const allowedFirstUseDelta = controlCombined.max - controlCombined.min
      results.push({
        runtime,
        format,
        scenario,
        sampleCount: pairs.length,
        control: {importMs: controlImport, firstUseMs: controlFirstUse, importPlusFirstUseMs: controlCombined},
        candidate: {importMs: candidateImport, firstUseMs: candidateFirstUse, importPlusFirstUseMs: candidateCombined},
        pairedMedianDeltaMs: candidateCombined.median - controlCombined.median,
        controlRangeMs: allowedFirstUseDelta,
        diagnosticScreen: candidateCombined.median <= controlCombined.median + allowedFirstUseDelta ? "within-control-range" : "exceeds-control-range",
        pairs,
      })
    }
  }
}

function artifactReceipt(packageDir: string) {
  const dist = join(packageDir, "dist")
  return ["theme.mjs", "theme.cjs", "theme-core.mjs", "theme-core.cjs"].map(file => {
    const entry = join(dist, file)
    const graph = readEmittedGraph(entry)
    return {entry: file, entrySha256: createHash("sha256").update(readFileSync(entry)).digest("hex"), graph}
  })
}

const controlPackage = join(fixtures.control, "node_modules/@opsydyn/crumbs-css")
const candidatePackage = join(fixtures.candidate, "node_modules/@opsydyn/crumbs-css")
const report = {
  formatVersion: 1,
  recordedAt: new Date().toISOString(),
  sourceRevision: Bun.spawnSync(["git", "rev-parse", "HEAD"], {cwd: repoRoot, stdout: "pipe"}).stdout.toString().trim(),
  environment: {platform: process.platform, architecture: process.arch, osRelease: release(), cpu: cpus()[0]?.model ?? "unknown", nodeFloor, nodeCurrent: nodeCurrent, samplePairsPerCase: 15},
  protocol: "Each retained sample uses a fresh exact-Node process and a package-shaped install. For each runtime/format/scenario, control and candidate order alternates within 15 adjacent pairs. Process startup is outside the timers; theme entry import and one validated first use are timed separately and together. GC is requested before timing. OS caches are warm and uncontrolled.",
  fixtureRoot: dirname(controlPackage),
  control: {archiveSha256: createHash("sha256").update(readFileSync(controlArchive)).digest("hex"), artifacts: artifactReceipt(controlPackage)},
  candidate: {packageJsonSha256: createHash("sha256").update(readFileSync(join(candidatePackage, "package.json"))).digest("hex"), artifacts: artifactReceipt(candidatePackage)},
  results,
}
mkdirSync(dirname(outputPath), {recursive: true})
await Bun.write(outputPath, JSON.stringify(report, null, 2) + "\n")
console.log(`PAIRED_RUNTIME_FIRST_USE_REPORT ${outputPath}`)
