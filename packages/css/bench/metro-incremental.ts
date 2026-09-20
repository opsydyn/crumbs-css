import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { cpus, release } from "node:os"
import { join, resolve } from "node:path"
import { createRequire } from "node:module"

const repoRoot = resolve(process.env.CRUMBS_INCREMENTAL_REPO_ROOT ?? resolve(import.meta.dir, "../../.."))
const appRoot = resolve(process.env.CRUMBS_INCREMENTAL_APP_ROOT ?? join(repoRoot, "apps/playground"))
const tokenFile = join(appRoot, "src/incremental-token.ts")
const baseStyleFile = join(appRoot, "src/incremental-base.css.ts")
const workspaceTokenFile = join(repoRoot, "packages/css/fixtures/m2-7-workspace-token.ts")
const entryFile = join(appRoot, "src/incremental-entry.ts")
const styleFile = join(appRoot, "src/incremental.css.ts")
const requireFromApp = createRequire(join(appRoot, "package.json"))

type IncrementalRun = {
  repetition: number
  previousCompiledValue: number
  compiledValue: number
  editToReceiptMs: number
  attempts: number
  bundleSha256: string
  bytes: number
  receipt: { compiledValuePresent: boolean; previousCompiledValueAbsent: boolean }
}

export type DependencyControl = {
  kind: "plain-token" | "nested-css" | "workspace-source"
  previousCompiledValue: number
  compiledValue: number
  editToReceiptMs: number
  attempts: number
  bundleSha256: string
  receipt: { compiledValuePresent: boolean; previousCompiledValueAbsent: boolean }
}

type MetroIncrementalEvidence = {
  formatVersion: number
  status: string
  environment: { platform: string; architecture: string; osRelease: string; cpu: string; expo: string; metro: string; reactNative: string }
  protocol: { requestUrl: string; repetitions: number; editKind: string; cacheState: string }
  fixture: { entrySha256: string; originalStyleSha256: string; restoredStyleSha256: string; originalTokenSha256: string; restoredTokenSha256: string; originalBaseStyleSha256?: string; restoredBaseStyleSha256?: string; originalWorkspaceTokenSha256?: string; restoredWorkspaceTokenSha256?: string }
  initial: { compiledValue: number; bundleSha256: string; bytes: number }
  warmup: IncrementalRun & { excluded: boolean }
  runs: IncrementalRun[]
  dependencyControls?: DependencyControl[]
}

export function incrementalCompiledValue(addend: number): number {
  if (!Number.isSafeInteger(addend) || addend < 1 || addend > 999) throw Error("Incremental fixture addend must be an integer from 1 through 999")
  return 30000 + addend
}

export function createIncrementalTokenSource(addend: number): string {
  incrementalCompiledValue(addend)
  return `// Rewritten by the Metro incremental measurement and restored after the run.\nexport const incrementalPadding = 30000 + ${addend}\n`
}

export function createIncrementalBaseStyleSource(addend: number): string {
  incrementalCompiledValue(addend)
  return `import { viewStyle } from "@opsydyn/crumbs-css/style"\n\nexport const incrementalBase = viewStyle({ margin: 31000 + ${addend} })\n`
}

export function createWorkspaceTokenSource(addend: number): string {
  incrementalCompiledValue(addend)
  return `// Rewritten by the Metro incremental measurement and restored after the run.\nexport const workspaceBorderWidth = 32000 + ${addend}\n`
}

export function createIncrementalStyleSource(addend: number): string {
  incrementalCompiledValue(addend)
  return `import { viewStyle } from "@opsydyn/crumbs-css/style"\nimport { incrementalPadding } from "./incremental-token"\nimport { incrementalBase } from "./incremental-base.css"\nimport { workspaceBorderWidth } from "../../../packages/css/fixtures/m2-7-workspace-token"\n\nconst directIncrementalPadding = incrementalPadding + ${addend} - 1\nexport const incrementalProbe = viewStyle([incrementalBase, { padding: directIncrementalPadding, borderWidth: workspaceBorderWidth }])\n`
}

export function admitDependencyControls(input: unknown): DependencyControl[] {
  if (!Array.isArray(input) || input.length !== 3) throw Error("Dependency invalidation evidence requires three control receipts")
  const controls = input as DependencyControl[]
  const kinds = controls.map(control => control.kind)
  const requiredKinds: ReadonlyArray<DependencyControl["kind"]> = [
    "plain-token",
    "nested-css",
    "workspace-source",
  ]
  if (new Set(kinds).size !== 3 || !requiredKinds.every(kind => kinds.includes(kind))) {
    throw Error("Dependency invalidation evidence is missing a dependency family")
  }
  for (const control of controls) {
    if (!Number.isFinite(control.previousCompiledValue) || !Number.isFinite(control.compiledValue) || control.previousCompiledValue === control.compiledValue) {
      throw Error("Dependency invalidation values did not change")
    }
    if (!Number.isFinite(control.editToReceiptMs) || control.editToReceiptMs < 0 || !Number.isSafeInteger(control.attempts) || control.attempts < 1 || !control.bundleSha256) {
      throw Error("Dependency invalidation timing receipt is invalid")
    }
    if (!control.receipt?.compiledValuePresent || !control.receipt.previousCompiledValueAbsent) {
      throw Error(`Dependency invalidation output does not prove the ${control.kind} parent rebuilt (new=${control.receipt?.compiledValuePresent}, oldAbsent=${control.receipt?.previousCompiledValueAbsent})`)
    }
  }
  return controls
}

export function admitMetroIncrementalReport(input: unknown, minimumRepetitions = 5): number[] {
  const report = input as MetroIncrementalEvidence
  if (report?.formatVersion !== 1 || report.status !== "complete") throw Error("Metro incremental evidence is incomplete or has an unsupported version")
  if (report.dependencyControls !== undefined) admitDependencyControls(report.dependencyControls)
  if (!Number.isSafeInteger(minimumRepetitions) || minimumRepetitions < 1 || report.protocol?.editKind !== "direct-css-source" || report.protocol.repetitions !== report.runs?.length || report.runs.length < minimumRepetitions) {
    throw Error("Metro incremental evidence has insufficient repetitions")
  }
  if (!report.fixture?.originalTokenSha256 || report.fixture.originalTokenSha256 !== report.fixture.restoredTokenSha256 ||
    !report.fixture.originalStyleSha256 || report.fixture.originalStyleSha256 !== report.fixture.restoredStyleSha256) throw Error("Metro incremental fixture was not restored")
  if (report.warmup?.excluded !== true || report.warmup.previousCompiledValue !== report.initial?.compiledValue ||
    report.warmup.compiledValue === report.initial.compiledValue || !Number.isFinite(report.warmup.editToReceiptMs) || report.warmup.editToReceiptMs < 0 ||
    !Number.isSafeInteger(report.warmup.attempts) || report.warmup.attempts < 1 || !Number.isSafeInteger(report.warmup.bytes) || report.warmup.bytes < 1 ||
    !report.warmup.receipt?.compiledValuePresent || !report.warmup.receipt.previousCompiledValueAbsent || report.warmup.bundleSha256 === report.initial.bundleSha256) {
    throw Error("Metro incremental warmup receipt is invalid")
  }
  let previousValue = report.warmup.compiledValue
  let previousBundle = report.warmup.bundleSha256
  if (!Number.isFinite(previousValue) || !previousBundle) throw Error("Metro incremental initial receipt is missing")
  const samples = report.runs.map((run, index) => {
    if (run.repetition !== index + 1 || run.previousCompiledValue !== previousValue || run.compiledValue === previousValue) throw Error("Metro incremental edit sequence is invalid")
    if (!Number.isFinite(run.editToReceiptMs) || run.editToReceiptMs < 0 || !Number.isSafeInteger(run.attempts) || run.attempts < 1) throw Error("Metro incremental timing receipt is invalid")
    if (!run.receipt?.compiledValuePresent || !run.receipt.previousCompiledValueAbsent || !run.bundleSha256 || run.bundleSha256 === previousBundle || !Number.isSafeInteger(run.bytes) || run.bytes < 1) {
      throw Error("Metro incremental output does not prove dependency invalidation")
    }
    previousValue = run.compiledValue
    previousBundle = run.bundleSha256
    return run.editToReceiptMs
  })
  return samples
}

export async function measureMetroIncremental(outputFile: string, repetitions = 5, port = 8093) {
  if (!Number.isSafeInteger(repetitions) || repetitions < 5) throw Error("At least five actual edit repetitions are required")
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw Error("Metro measurement port is invalid")
  const originalToken = await readFile(tokenFile, "utf8")
  const originalBaseStyle = await readFile(baseStyleFile, "utf8")
  const originalWorkspaceToken = await readFile(workspaceTokenFile, "utf8")
  const originalStyle = await readFile(styleFile, "utf8")
  const originalTokenSha256 = sha256(originalToken)
  const originalBaseStyleSha256 = sha256(originalBaseStyle)
  const originalWorkspaceTokenSha256 = sha256(originalWorkspaceToken)
  const originalStyleSha256 = sha256(originalStyle)
  const requestPath = "/src/incremental-entry.bundle?platform=ios&dev=true&minify=false&modulesOnly=false&runModule=true"
  const requestUrl = `http://127.0.0.1:${port}${requestPath}`
  const expoBin = join(appRoot, "node_modules/.bin/expo")
  const logs: string[] = []
  let restoredTokenSha256 = "not-restored"
  let restoredBaseStyleSha256 = "not-restored"
  let restoredWorkspaceTokenSha256 = "not-restored"
  let child: ReturnType<typeof Bun.spawn> | undefined
  try {
    await assertPortUnused(port)
    const startupStarted = performance.now()
    const metroEnvironment: Record<string, string | undefined> = { ...process.env, EXPO_NO_INTERACTIVE: "1", EXPO_NO_METRO_WORKSPACE_ROOT: "1", CRUMBS_INCREMENTAL_BENCH: "1" }
    delete metroEnvironment.CI
    child = Bun.spawn([expoBin, "start", "--offline", "--port", String(port), "--clear", "--max-workers", "1"], {
      cwd: appRoot,
      env: metroEnvironment,
      stdout: "pipe",
      stderr: "pipe",
    })
    capture(child.stdout, logs)
    capture(child.stderr, logs)
    await waitForMetro(port, child, logs, 120_000)
    const startupMs = performance.now() - startupStarted
    const initialBundle = await fetchBundle(requestUrl, 120_000)
    const initialValue = incrementalCompiledValue(1)
    if (!hasCompiledValue(initialBundle, initialValue)) throw Error("Initial Metro bundle lacks the compiled fixture value")
    const initial = { compiledValue: initialValue, bundleSha256: sha256(initialBundle), bytes: Buffer.byteLength(initialBundle) }
    const dependencyControls: DependencyControl[] = []
    const dependencyStarted = performance.now()
    await writeFile(tokenFile, createIncrementalTokenSource(2))
    const dependencyReceipt = await waitForBundle(requestUrl, bundle => hasDependencyExpression(bundle, 2) && hasCompiledValue(bundle, incrementalCompiledValue(2)) && !hasCompiledValue(bundle, initialValue), dependencyStarted)
    dependencyControls.push(makeDependencyControl("plain-token", initialValue, incrementalCompiledValue(2), dependencyStarted, dependencyReceipt))
    await writeFile(tokenFile, originalToken)
    await waitForBundle(requestUrl, bundle => hasDependencyExpression(bundle, 1) && hasCompiledValue(bundle, initialValue) && !hasCompiledValue(bundle, incrementalCompiledValue(2)), performance.now())

    const nestedStarted = performance.now()
    await writeFile(baseStyleFile, createIncrementalBaseStyleSource(3))
    const nestedReceipt = await waitForBundle(requestUrl, bundle => hasMarginValue(bundle, 31003) && !hasMarginValue(bundle, 31001), nestedStarted)
    dependencyControls.push(makeDependencyControl("nested-css", 31001, 31003, nestedStarted, nestedReceipt, hasMarginValue))
    await writeFile(baseStyleFile, originalBaseStyle)
    await waitForBundle(requestUrl, bundle => hasMarginValue(bundle, 31001) && !hasMarginValue(bundle, 31003), performance.now())

    const workspaceStarted = performance.now()
    await writeFile(workspaceTokenFile, createWorkspaceTokenSource(4))
    const workspaceReceipt = await waitForBundle(requestUrl, bundle => hasBorderWidthValue(bundle, 32004) && !hasBorderWidthValue(bundle, 32001), workspaceStarted)
    dependencyControls.push(makeDependencyControl("workspace-source", 32001, 32004, workspaceStarted, workspaceReceipt, hasBorderWidthValue))
    await writeFile(workspaceTokenFile, originalWorkspaceToken)
    await waitForBundle(requestUrl, bundle => hasBorderWidthValue(bundle, 32001) && !hasBorderWidthValue(bundle, 32004), performance.now())
    const warmupStarted = performance.now()
    await writeFile(styleFile, createIncrementalStyleSource(100))
    await delay(75)
    const warmupBundle = await waitForBundle(requestUrl, bundle => hasCompiledValue(bundle, incrementalCompiledValue(100)) && !hasCompiledValue(bundle, initialValue), warmupStarted)
    const warmup = makeRun(0, initialValue, incrementalCompiledValue(100), warmupStarted, warmupBundle)
    if (!warmup.receipt.compiledValuePresent || !warmup.receipt.previousCompiledValueAbsent) throw Error("Metro did not emit the excluded direct-edit warmup")
    const runs: IncrementalRun[] = []
    let previousValue = warmup.compiledValue
    for (let index = 0; index < repetitions; index += 1) {
      const addend = index + 101
      const compiledValue = incrementalCompiledValue(addend)
      const started = performance.now()
      await writeFile(styleFile, createIncrementalStyleSource(addend))
      await delay(75)
      const updated = await waitForBundle(requestUrl, bundle => hasCompiledValue(bundle, compiledValue) && !hasCompiledValue(bundle, previousValue), started)
      const { attempts, bundle } = updated
      const run = makeRun(index + 1, previousValue, compiledValue, started, { attempts, bundle })
      const receipt = run.receipt
      runs.push(run)
      if (!receipt.compiledValuePresent || !receipt.previousCompiledValueAbsent) throw Error(`Metro did not emit dependency edit ${index + 1}`)
      previousValue = compiledValue
    }
    await writeFile(styleFile, originalStyle)
    await writeFile(tokenFile, originalToken)
    await writeFile(baseStyleFile, originalBaseStyle)
    await writeFile(workspaceTokenFile, originalWorkspaceToken)
    restoredTokenSha256 = sha256(await readFile(tokenFile, "utf8"))
    restoredBaseStyleSha256 = sha256(await readFile(baseStyleFile, "utf8"))
    restoredWorkspaceTokenSha256 = sha256(await readFile(workspaceTokenFile, "utf8"))
    const restoredStyleSha256 = sha256(await readFile(styleFile, "utf8"))
    const report = {
      formatVersion: 1,
      status: "complete",
      recordedAt: new Date().toISOString(),
      sourceRevision: Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: repoRoot }).stdout.toString().trim(),
      environment: { platform: process.platform, architecture: process.arch, osRelease: release(), cpu: cpus()[0]?.model ?? "unknown",
        expo: requireFromApp("expo/package.json").version as string, metro: requireFromApp("metro/package.json").version as string,
        reactNative: requireFromApp("react-native/package.json").version as string },
      protocol: { requestUrl: requestPath, repetitions, editKind: "direct-css-source", cacheState: "One cleared Metro server and warm initial graph; three dependency-only controls (plain token, nested .css.ts and workspace source) prove parent rebuilds before one excluded direct-edit warmup and five retained direct .css.ts edits; dependency receipts require the new baked value and absence of the old value" },
      fixture: { entrySha256: sha256(await readFile(entryFile)), originalStyleSha256, restoredStyleSha256, originalTokenSha256, restoredTokenSha256, originalBaseStyleSha256, restoredBaseStyleSha256, originalWorkspaceTokenSha256, restoredWorkspaceTokenSha256 },
      server: { startupMs, logs },
      initial,
      dependencyControls,
      warmup: { ...warmup, excluded: true },
      runs,
    }
    admitMetroIncrementalReport(report)
    await writeFile(outputFile, JSON.stringify(report, null, 2) + "\n")
    return report
  } finally {
    if (sha256(await readFile(tokenFile)) !== originalTokenSha256) await writeFile(tokenFile, originalToken)
    if (sha256(await readFile(baseStyleFile)) !== originalBaseStyleSha256) await writeFile(baseStyleFile, originalBaseStyle)
    if (sha256(await readFile(workspaceTokenFile)) !== originalWorkspaceTokenSha256) await writeFile(workspaceTokenFile, originalWorkspaceToken)
    if (sha256(await readFile(styleFile)) !== originalStyleSha256) await writeFile(styleFile, originalStyle)
    if (child) await stop(child)
  }
}

function hasCompiledValue(bundle: string, value: number) {
  return ["Top", "Right", "Bottom", "Left"].every(side => new RegExp(`padding${side}["']?\\s*:\\s*${value}\\b`).test(bundle))
}
function hasMarginValue(bundle: string, value: number) {
  return ["Top", "Right", "Bottom", "Left"].every(side => new RegExp(`margin${side}["']?\\s*:\\s*${value}\\b`).test(bundle))
}
function hasBorderWidthValue(bundle: string, value: number) {
  return new RegExp(`borderWidth["']?\\s*:\\s*${value}\\b`).test(bundle) || ["Top", "Right", "Bottom", "Left"].every(side => new RegExp(`border${side}Width["']?\\s*:\\s*${value}\\b`).test(bundle))
}
function hasDependencyExpression(bundle: string, addend: number) {
  return new RegExp(`incrementalPadding\\s*=\\s*30000\\s*\\+\\s*${addend}\\b`).test(bundle)
}
async function waitForBundle(url: string, predicate: (bundle: string) => boolean, started: number) {
  let attempts = 0
  let bundle = ""
  while (performance.now() - started < 30_000) {
    attempts += 1
    bundle = await fetchBundle(url, 30_000)
    if (predicate(bundle)) return { attempts, bundle }
    await delay(10)
  }
  return { attempts, bundle }
}
function makeRun(repetition: number, previousCompiledValue: number, compiledValue: number, started: number, update: { attempts: number; bundle: string }): IncrementalRun {
  return { repetition, previousCompiledValue, compiledValue, editToReceiptMs: performance.now() - started,
    attempts: update.attempts, bundleSha256: sha256(update.bundle), bytes: Buffer.byteLength(update.bundle),
    receipt: { compiledValuePresent: hasCompiledValue(update.bundle, compiledValue), previousCompiledValueAbsent: !hasCompiledValue(update.bundle, previousCompiledValue) } }
}
function makeDependencyControl(
  kind: DependencyControl["kind"],
  previousCompiledValue: number,
  compiledValue: number,
  started: number,
  update: { attempts: number; bundle: string },
  receiptPredicate: (bundle: string, value: number) => boolean = hasCompiledValue,
): DependencyControl {
  return {
    kind,
    previousCompiledValue,
    compiledValue,
    editToReceiptMs: performance.now() - started,
    attempts: update.attempts,
    bundleSha256: sha256(update.bundle),
    receipt: {
      compiledValuePresent: receiptPredicate(update.bundle, compiledValue),
      previousCompiledValueAbsent: !receiptPredicate(update.bundle, previousCompiledValue),
    },
  }
}
function sha256(value: string | Buffer) { return createHash("sha256").update(value).digest("hex") }
function delay(ms: number) { return new Promise(resolveDelay => setTimeout(resolveDelay, ms)) }
async function fetchBundle(url: string, timeout: number) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { Accept: "application/javascript" } })
  const body = await response.text()
  if (!response.ok) throw Error(`Metro bundle request failed (${response.status}): ${body.slice(0, 500)}`)
  return body
}
async function assertPortUnused(port: number) {
  try { await fetch(`http://127.0.0.1:${port}/status`, { signal: AbortSignal.timeout(300) }) }
  catch { return }
  throw Error(`Metro measurement port ${port} is already in use`)
}
async function waitForMetro(port: number, child: ReturnType<typeof Bun.spawn>, logs: string[], timeout: number) {
  const started = performance.now()
  while (performance.now() - started < timeout) {
    if (child.exitCode !== null) throw Error(`Metro exited before readiness with code ${child.exitCode}: ${logs.join("").slice(-2000)}`)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`, { signal: AbortSignal.timeout(500) })
      if (response.ok) return
    } catch {}
    await delay(100)
  }
  throw Error("Metro did not become ready before the startup deadline")
}
function capture(stream: number | ReadableStream<Uint8Array> | undefined, logs: string[]) {
  if (!(stream instanceof ReadableStream)) return
  void (async () => {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const next = await reader.read()
      if (next.done) break
      logs.push(decoder.decode(next.value))
    }
  })()
}
async function stop(child: ReturnType<typeof Bun.spawn>) {
  if (child.exitCode !== null) return
  child.kill("SIGTERM")
  const exited = await Promise.race([child.exited.then(() => true), delay(5_000).then(() => false)])
  if (!exited) { child.kill("SIGKILL"); await child.exited }
}

if (import.meta.main) {
  const output = process.argv[2]
  if (!output) throw Error("Output JSON path is required")
  await measureMetroIncremental(output, Number(process.argv[3] ?? 5), Number(process.env.CRUMBS_METRO_PORT ?? 8093))
  console.log(`METRO_INCREMENTAL_REPORT ${output}`)
}
