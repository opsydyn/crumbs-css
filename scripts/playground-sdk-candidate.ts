import { createHash } from "node:crypto"
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { verifyInstalledArtifact } from "./packed-distribution-contract"
import { verifyRuntimeBundles } from "./runtime-bundle-contract"
import { packageName, stage } from "./playground"

type Manifest = {
  readonly name: string
  readonly dependencies: Readonly<Record<string, string>>
  readonly devDependencies?: Readonly<Record<string, string>>
  readonly [key: string]: unknown
}

export type SdkCandidate = {
  readonly schemaVersion: 1
  readonly observedAt: string
  readonly observed: {
    readonly expoTag: "latest"
    readonly expoVersion: string
    readonly templateVersion: string
  }
  readonly dependencies: Readonly<Record<string, string>> & {
    readonly expo: string
    readonly react: string
    readonly "react-native": string
  }
  readonly devDependencies: Readonly<Record<string, string>>
  readonly expectedOutcome: {
    readonly kind: "peer-blocked" | "qualified"
    readonly packagePeer: string
  }
}

const repoRoot = resolve(import.meta.dir, "..")
const candidatePath = join(repoRoot, "apps/playground/upgrade/expo-57.json")
const packageRoot = join(repoRoot, "packages/css")

function exactVersion(value: string, label: string) {
  if (!/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(`${label} must be one exact stable version`)
  }
}

export function candidateManifest(base: Manifest, candidate: SdkCandidate, crumbsSpecifier: string): Manifest {
  if (!crumbsSpecifier.startsWith("file:") || !crumbsSpecifier.endsWith(".tgz")) {
    throw new Error("SDK candidates must consume a packed artifact")
  }
  for (const [name, version] of Object.entries({ ...candidate.dependencies, ...candidate.devDependencies })) {
    exactVersion(version, name)
  }
  return {
    ...base,
    dependencies: { ...candidate.dependencies, [packageName]: crumbsSpecifier },
    devDependencies: { ...candidate.devDependencies },
  }
}

function tuple(version: string) {
  if (!/^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`React Native candidate must be a version boundary, received: ${version}`)
  }
  return version.split("-", 1)[0]!.split(".").map(Number)
}

function compare(left: number[], right: number[]) {
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return Math.sign(difference)
  }
  return 0
}

export function assessPeerCompatibility(candidate: SdkCandidate, peerRange: string) {
  const match = /^>=(\d+\.\d+(?:\.\d+)?)\s+<(\d+\.\d+(?:\.\d+)?)$/.exec(peerRange)
  if (!match) throw new Error(`Expected one bounded peer range, received: ${peerRange}`)
  const reactNative = candidate.dependencies["react-native"]
  const version = tuple(reactNative)
  return {
    compatible: compare(version, tuple(match[1]!)) >= 0 && compare(version, tuple(match[2]!)) < 0,
    reactNative,
    peerRange,
  }
}

async function command(args: string[], cwd: string, env = process.env) {
  const child = Bun.spawn(args, { cwd, env, stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() }
}

type OfficialSdkTemplate = {
  readonly version: string
  readonly dependencies: { readonly expo: string; readonly react: string; readonly "react-native": string }
}

export function assertOfficialSdkTemplate(candidate: SdkCandidate, template: OfficialSdkTemplate) {
  for (const name of ["expo", "react", "react-native"] as const) exactVersion(candidate.dependencies[name], name)
  const react = tuple(candidate.dependencies.react)
  const templateReact = tuple(template.dependencies.react)
  if (candidate.observed.expoVersion !== candidate.dependencies.expo ||
    template.version !== candidate.observed.templateVersion ||
    template.dependencies.expo.replace(/^~/, "") !== candidate.dependencies.expo ||
    template.dependencies["react-native"] !== candidate.dependencies["react-native"] ||
    react[0] !== templateReact[0] || react[1] !== templateReact[1] || compare(react, templateReact) < 0) {
    throw new Error("Recorded SDK candidate does not match the official template SDK/React line")
  }
}

export function assertSdkNodeVersion(version: string) {
  if (!/^v\d+\.\d+\.\d+$/.test(version) || compare(tuple(version.slice(1)), [22, 13, 0]) < 0) {
    throw new Error(`SDK 57 requires Node >=22.13.0; received ${version}`)
  }
}

export function assertCandidateExpectation(candidate: SdkCandidate, peerRange: string) {
  const compatibility = assessPeerCompatibility(candidate, peerRange)
  if (candidate.expectedOutcome.packagePeer !== peerRange ||
    (candidate.expectedOutcome.kind === "qualified") !== compatibility.compatible ||
    !["peer-blocked", "qualified"].includes(candidate.expectedOutcome.kind)) {
    throw new Error("Candidate expectation no longer matches the package peer contract")
  }
  return compatibility
}

export function parseSdkCandidateArgs(args: readonly string[]) {
  const options: { pinned: boolean; tarball?: string; output?: string } = { pinned: false }
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!
    if (arg === "--pinned" && !options.pinned) options.pinned = true
    else if (arg === "--tarball") {
      const value = args[++index]
      if (!value || value.startsWith("--") || !value.endsWith(".tgz") || options.tarball) {
        throw new Error("--tarball requires one .tgz artifact")
      }
      options.tarball = value
    } else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`)
    else if (options.output) throw new Error("Specify only one output receipt")
    else options.output = arg
  }
  return options
}

type FileHash = { readonly path: string; readonly sha256: string }
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex")

async function packageFiles(root: string): Promise<FileHash[]> {
  const files: FileHash[] = []
  async function visit(relativeRoot: string) {
    for (const item of await readdir(join(root, relativeRoot), { withFileTypes: true })) {
      const path = relativeRoot ? relativeRoot + "/" + item.name : item.name
      if (item.isSymbolicLink()) throw new Error(`Installed package contains a symlink: ${path}`)
      if (item.isDirectory()) await visit(path)
      else if (item.isFile()) files.push({ path, sha256: sha256(await readFile(join(root, path))) })
      else throw new Error(`Installed package contains a non-file: ${path}`)
    }
  }
  await visit("")
  return files.sort((a, b) => a.path.localeCompare(b.path))
}

export async function verifyCandidatePackageFiles(root: string, expected: readonly FileHash[]) {
  const actual = await packageFiles(root)
  const sorted = [...expected].sort((a, b) => a.path.localeCompare(b.path))
  if (JSON.stringify(actual.map(file => file.path)) !== JSON.stringify(sorted.map(file => file.path))) {
    throw new Error("Installed package inventory differs from the packed artifact")
  }
  for (let index = 0; index < actual.length; index++) {
    if (actual[index]!.sha256 !== sorted[index]!.sha256) {
      throw new Error(`Installed package bytes differ: ${actual[index]!.path}`)
    }
  }
  return actual
}

export async function stagePureMotionProbe(consumer: string, installedRoot: string, parent: string) {
  const probe = await mkdtemp(join(parent, "pure-motion-"))
  await mkdir(join(probe, "test"))
  await cp(join(consumer, "test/motion.node.mjs"), join(probe, "test/motion.node.mjs"))
  for (const name of ["crumbs-css", "crumbs-css-copy"]) {
    await cp(installedRoot, join(probe, "node_modules/@opsydyn", name), { recursive: true })
  }
  return probe
}

async function main() {
  const options = parseSdkCandidateArgs(process.argv.slice(2))
  const outputPath = options.output ? resolve(options.output) : undefined
  const candidate = JSON.parse(await readFile(candidatePath, "utf8")) as SdkCandidate
  const packageManifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as {
    readonly name: string
    readonly version: string
    readonly peerDependencies: { readonly "react-native": string }
  }
  const artifacts = await mkdtemp(join(tmpdir(), "crumbs-sdk-candidate-artifacts-"))
  const logsRoot = outputPath ? join(dirname(outputPath), "sdk-57-logs") : join(artifacts, "logs")
  await mkdir(logsRoot, { recursive: true })
  const npmCache = join(artifacts, "npm-cache")
  const env = {
    ...process.env,
    npm_config_cache: npmCache,
    npm_config_fetch_retries: "1",
    npm_config_fetch_timeout: "20000",
    npm_config_legacy_peer_deps: "false",
    npm_config_force: "false",
    npm_config_strict_peer_deps: "true",
    EXPO_NO_METRO_WORKSPACE_ROOT: "1",
    EXPO_NO_TELEMETRY: "1",
    CI: "1",
  }
  const commands: Array<{ name: string; command: string[]; exitCode: number; log: string }> = []
  async function run(name: string, args: string[], cwd: string, extra: Record<string, string> = {}, allowFailure = false) {
    console.log(`SDK 57: ${name}`)
    const result = await command(args, cwd, { ...env, ...extra })
    const log = join(logsRoot, name + ".log")
    await writeFile(log, result.stdout + "\n" + result.stderr + "\n")
    commands.push({ name, command: args, exitCode: result.exitCode, log })
    if (result.exitCode !== 0 && !allowFailure) throw new Error(`${name} failed (${result.exitCode}); see ${log}`)
    return result
  }
  const checks = { npmResolution: "not-run", installedBytes: "not-run", types: "not-run", motion: "not-run", exports: "not-run", runtimeGraph: "not-run" }
  const report: Record<string, unknown> = {
    schemaVersion: 2, slice: "M1.9b", recordedAt: new Date().toISOString(),
    freshness: options.pinned ? "pinned official template" : "live latest and official template",
    candidate: { ...candidate.observed, react: candidate.dependencies.react, reactNative: candidate.dependencies["react-native"] },
    checks, commands, sdkSupported: false, supportBroadened: false, contractPassed: false,
    nativeDeviceAcceptance: "not-run", performanceQualification: "not-run",
  }
  async function save() {
    if (outputPath) {
      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n")
    }
  }
  try {
    const nodeVersion = (await run("node-version", ["node", "--version"], repoRoot)).stdout
    assertSdkNodeVersion(nodeVersion)
    report.host = { node: nodeVersion, bun: Bun.version }
    const templateSelector = options.pinned ? candidate.observed.templateVersion : "latest"
    const template = JSON.parse((await run("official-template", ["npm", "view", `expo-template-blank@${templateSelector}`, "version", "dependencies", "--json"], repoRoot)).stdout) as {
      readonly version: string
      readonly dependencies: { readonly expo: string; readonly react: string; readonly "react-native": string }
    }
    if (!options.pinned) {
      const tags = JSON.parse((await run("expo-tags", ["npm", "view", "expo", "dist-tags", "--json"], repoRoot)).stdout) as { readonly latest: string }
      if (tags.latest !== candidate.observed.expoVersion) {
        throw new Error(`Recorded SDK candidate is stale: npm latest is Expo ${tags.latest}`)
      }
    }
    assertOfficialSdkTemplate(candidate, template)
    const compatibility = assertCandidateExpectation(candidate, packageManifest.peerDependencies["react-native"])
    if (!options.tarball) await run("build", ["bun", "run", "build"], packageRoot)
    type PackResult = { readonly filename: string; readonly files: readonly { readonly path: string }[] }
    const pack = JSON.parse((await run("pack", ["npm", "pack", ...(options.tarball ? ["--dry-run"] : []), "--ignore-scripts", "--json", "--pack-destination", artifacts], packageRoot)).stdout) as [PackResult]
    const tarball = options.tarball ? resolve(options.tarball) : join(artifacts, pack[0].filename)
    const bytes = await readFile(tarball)
    const expectedFiles = await Promise.all(pack[0].files.map(async ({ path }) => ({ path, sha256: sha256(await readFile(join(packageRoot, path))) })))
    report.crumbs = { mode: "packed", version: packageManifest.version, tarballSha256: sha256(bytes), reactNativePeer: compatibility.peerRange, files: expectedFiles }
    report.source = {
      revision: (await run("source-revision", ["git", "rev-parse", "HEAD"], repoRoot)).stdout,
      dirty: (await run("source-status", ["git", "status", "--porcelain", "--untracked-files=no"], repoRoot)).stdout.length > 0,
    }
    const consumer = await stage(`file:${tarball}`, artifacts)
    // Stage owns the app's self exports; retain its name and runtime import contract.
    const staged = JSON.parse(await readFile(join(consumer, "package.json"), "utf8")) as Manifest
    const manifest = candidateManifest(staged, candidate, `file:${tarball}`)
    await writeFile(join(consumer, "package.json"), JSON.stringify(manifest, null, 2) + "\n")
    const resolution = await run("npm-resolution", ["npm", "install", "--package-lock-only", "--strict-peer-deps", "--ignore-scripts", "--no-audit", "--no-fund"], consumer, {}, true)
    report.npmResolution = { exitCode: resolution.exitCode, outcome: candidate.expectedOutcome.kind }
    if (!compatibility.compatible) {
      const diagnostic = resolution.stdout + "\n" + resolution.stderr
      if (resolution.exitCode === 0 || !diagnostic.includes("ERESOLVE") || !diagnostic.includes(packageName)) {
        throw new Error("Expo SDK candidate did not produce the expected Crumbs peer-resolution block")
      }
      checks.npmResolution = "expected peer block"
      report.contractPassed = true
      await save()
      console.log(`SDK candidate peer block verified${outputPath ? ": " + outputPath : ""}`)
      return
    }
    if (resolution.exitCode !== 0) throw new Error("Supported SDK candidate failed strict npm peer resolution")
    checks.npmResolution = "passed"
    await run("install", ["npm", "ci", "--strict-peer-deps", "--no-audit", "--no-fund"], consumer)
    const installed = await verifyInstalledArtifact(consumer, packageManifest)
    const files = await verifyCandidatePackageFiles(installed.packageRoot, expectedFiles)
    const lockBytes = await readFile(join(consumer, "package-lock.json"))
    const lock = JSON.parse(lockBytes.toString()) as { packages: Record<string, { integrity?: string }> }
    const integrity = "sha512-" + createHash("sha512").update(bytes).digest("base64")
    if (lock.packages["node_modules/" + packageName]?.integrity !== integrity) throw new Error("Installed lock integrity differs from the packed artifact")
    const versions: Record<string, string> = {}
    for (const [name, expected] of Object.entries({ ...candidate.dependencies, ...candidate.devDependencies })) {
      const actual = JSON.parse(await readFile(join(consumer, "node_modules", name, "package.json"), "utf8")).version
      if (actual !== expected) throw new Error(`Installed ${name} version differs: ${actual}`)
      versions[name] = actual
    }
    report.installed = { ...installed, integrity, lockSha256: sha256(lockBytes), fileCount: files.length, versions }
    checks.installedBytes = "passed"
    const motionRoot = join(repoRoot, "packages/css/fixtures/packed-distribution/app")
    await mkdir(join(consumer, "test"))
    for (const name of ["motion.integration.tsx", "motion-peer.cjs", "motion.node.mjs", "motion-control-values.json"]) {
      await cp(join(motionRoot, "test", name), join(consumer, "test", name))
    }
    await cp(join(motionRoot, "src/motion.types.tsx"), join(consumer, "src/motion.types.tsx"))
    await cp(installed.packageRoot, join(dirname(installed.packageRoot), "crumbs-css-copy"), { recursive: true })
    const typeConfig = JSON.parse((await run("installed-type-config", [join(consumer, "node_modules/.bin/tsc"), "--showConfig"], consumer)).stdout)
    if (typeConfig.compilerOptions?.strict !== true) throw new Error("SDK consumer must use strict TypeScript")
    report.typeBoundary = { strict: true, skipLibCheck: typeConfig.compilerOptions.skipLibCheck === true, scope: "consumer code and motion fixtures against installed declarations" }
    await run("installed-types", [join(consumer, "node_modules/.bin/tsc"), "--noEmit"], consumer)
    checks.types = "passed"
    for (const order of ["esm-first", "cjs-first"]) {
      await run("motion-" + order, ["bun", "test", "./test/motion.integration.tsx"], consumer, { CRUMBS_IMPORT_ORDER: order })
    }
    const pureProbe = await stagePureMotionProbe(consumer, installed.packageRoot, artifacts)
    for (const format of ["esm", "cjs"]) await run("motion-pure-" + format, ["node", "test/motion.node.mjs", format], pureProbe)
    checks.motion = "passed"
    report.motionBoundary = "real React; controlled public Animated peer; not native/device acceptance"
    await run("expo-all-platforms", [join(consumer, "node_modules/.bin/expo"), "export", "--platform", "all", "--source-maps"], consumer)
    checks.exports = "passed"
    report.runtimeBundles = await verifyRuntimeBundles(join(consumer, "dist"))
    checks.runtimeGraph = "passed"
    await verifyCandidatePackageFiles(installed.packageRoot, expectedFiles)
    if (sha256(await readFile(tarball)) !== sha256(bytes)) throw new Error("Packed artifact changed during SDK qualification")
    for (const file of expectedFiles) {
      if (sha256(await readFile(join(packageRoot, file.path))) !== file.sha256) throw new Error(`Package source changed during SDK qualification: ${file.path}`)
    }
    report.sdkSupported = true
    report.supportBroadened = true
    report.contractPassed = true
    await save()
    console.log(`SDK 57 types, motion contracts and iOS/Android/web exports passed${outputPath ? ": " + outputPath : ""}`)
  } catch (error) {
    report.failure = error instanceof Error ? error.message : String(error)
    await save()
    throw error
  } finally {
    await rm(artifacts, { recursive: true, force: true })
  }
}

if (import.meta.main) main().catch(error => { console.error(error); process.exitCode = 1 })
