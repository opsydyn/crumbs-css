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

export function resolveExpoMetroVersion(appRoot: string): string {
  const requireFromAppRoot = createRequire(join(appRoot, "package.json"))
  const requireFromExpo = createRequire(requireFromAppRoot.resolve("expo/package.json"))
  const requireFromExpoCli = createRequire(requireFromExpo.resolve("@expo/cli/package.json"))
  const requireFromExpoMetroConfig = createRequire(requireFromExpoCli.resolve("@expo/metro-config/package.json"))
  return requireFromExpoMetroConfig("metro/package.json").version as string
}

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

export type ConfigurationControl = {
  setting: "strictDiagnostics"
  cacheState: "persistent-across-restarts"
  serverStarts: Array<{ strictDiagnostics: boolean; clearCache: boolean }>
  previousCompiledValue: number
  compiledValue: number
  permissive: {
    status: number
    bundleSha256: string
    compiledValuePresent: boolean
    previousCompiledValueAbsent: boolean
  }
  strict: {
    status: number
    responseSha256: string
    diagnosticPresent: boolean
  }
  restored: {
    status: number
    bundleSha256: string
    compiledValuePresent: boolean
    previousCompiledValueAbsent: boolean
  }
}

type MetroIncrementalEvidence = {
  formatVersion: number
  status: string
  environment: { platform: string; architecture: string; osRelease: string; cpu: string; expo: string; metro: string; reactNative: string }
  packageProvenance?: { expoMetroRuntime: string; react: string; reactDom: string; babelPresetExpo: string }
  protocol: { requestUrl: string; repetitions: number; editKind: string; cacheState: string }
  fixture: { entrySha256: string; originalStyleSha256: string; restoredStyleSha256: string; originalTokenSha256: string; restoredTokenSha256: string; originalBaseStyleSha256?: string; restoredBaseStyleSha256?: string; originalWorkspaceTokenSha256?: string; restoredWorkspaceTokenSha256?: string }
  measurementFixture?: { entrySha256: string; styleSha256: string; tokenSha256: string; baseStyleSha256: string; workspaceTokenSha256: string }
  initial: { compiledValue: number; bundleSha256: string; bytes: number }
  warmup: IncrementalRun & { excluded: boolean }
  runs: IncrementalRun[]
  dependencyControls?: DependencyControl[]
  configurationControl?: ConfigurationControl
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
  return `// Shared workspace theme configuration; rewritten by the Metro measurement and restored after the run.\nexport const sharedThemeTokens = { borderWidth: 32000 + ${addend} }\n`
}

export function createIncrementalStyleSource(
  addend: number,
  options: { readonly includeDroppedDeclaration?: boolean } = {},
): string {
  incrementalCompiledValue(addend)
  const unsupported = options.includeDroppedDeclaration ? ', transition: "all 0.3s"' : ""
  return `import { viewStyle } from "@opsydyn/crumbs-css/style"\nimport { incrementalPadding } from "./incremental-token"\nimport { incrementalBase } from "./incremental-base.css"\nimport { sharedThemeTokens } from "../../../packages/css/fixtures/m2-7-workspace-token"\n\nconst directIncrementalPadding = incrementalPadding + ${addend} - 1\nexport const incrementalProbe = viewStyle([incrementalBase, { padding: directIncrementalPadding, borderWidth: sharedThemeTokens.borderWidth${unsupported} }])\n`
}

export function createHistoricalWorkspaceTokenSource(addend: number): string {
  incrementalCompiledValue(addend)
  return `// Rewritten by the Metro incremental measurement and restored after the run.\nexport const workspaceBorderWidth = 32000 + ${addend}\n`
}

export function createHistoricalIncrementalStyleSource(addend: number): string {
  incrementalCompiledValue(addend)
  return `import { viewStyle } from "@opsydyn/crumbs-css/style"\nimport { incrementalPadding } from "./incremental-token"\nimport { incrementalBase } from "./incremental-base.css"\nimport { workspaceBorderWidth } from "../../../packages/css/fixtures/m2-7-workspace-token"\n\nconst directIncrementalPadding = incrementalPadding + ${addend} - 1\nexport const incrementalProbe = viewStyle([incrementalBase, { padding: directIncrementalPadding, borderWidth: workspaceBorderWidth }])\n`
}

export function createHistoricalMetroFixture() {
  return {
    token: `// The measurement runner rewrites the addend, then restores this exact source.\n// Keeping the result out of the source as one literal distinguishes compiled\n// .css.ts output from the ordinary dependency module in the Metro bundle.\nexport const incrementalPadding = 30000 + 1\n`,
    baseStyle: `import { viewStyle } from "@opsydyn/crumbs-css/style"\n\nexport const incrementalBase = viewStyle({ margin: 31000 + 1 })\n`,
    workspaceToken: `export const workspaceBorderWidth = 32000 + 1\n`,
    style: `import { viewStyle } from "@opsydyn/crumbs-css/style"\nimport { incrementalPadding } from "./incremental-token"\nimport { incrementalBase } from "./incremental-base.css"\nimport { workspaceBorderWidth } from "../../../packages/css/fixtures/m2-7-workspace-token"\n\nexport const incrementalProbe = viewStyle([incrementalBase, { padding: incrementalPadding, borderWidth: workspaceBorderWidth }])\n`,
  }
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

export function admitConfigurationControl(input: unknown): ConfigurationControl {
  if (typeof input !== "object" || input === null) throw Error("strictDiagnostics configuration evidence is missing")
  const control = input as ConfigurationControl
  if (control.setting !== "strictDiagnostics" || control.cacheState !== "persistent-across-restarts") {
    throw Error("strictDiagnostics configuration evidence did not reuse the persistent Metro cache")
  }
  const expectedServerStarts = [true, false, true, false]
  if (!Array.isArray(control.serverStarts) || control.serverStarts.length !== expectedServerStarts.length ||
    control.serverStarts.some((server, index) => server.strictDiagnostics !== expectedServerStarts[index] || server.clearCache !== (index === 0))) {
    throw Error("strictDiagnostics configuration evidence did not preserve the persistent Metro cache across restarts")
  }
  if (!Number.isSafeInteger(control.previousCompiledValue) || !Number.isSafeInteger(control.compiledValue) || control.previousCompiledValue === control.compiledValue) {
    throw Error("strictDiagnostics configuration output values are invalid")
  }
  const admitsBundle = (receipt: ConfigurationControl["permissive"] | ConfigurationControl["restored"]) =>
    Number.isSafeInteger(receipt.status) && receipt.status >= 200 && receipt.status < 300 &&
    /^[a-f0-9]{64}$/.test(receipt.bundleSha256) && receipt.compiledValuePresent && receipt.previousCompiledValueAbsent
  if (!admitsBundle(control.permissive) || !admitsBundle(control.restored) ||
    control.permissive.bundleSha256 !== control.restored.bundleSha256 ||
    !Number.isSafeInteger(control.strict?.status) || control.strict.status < 400 || control.strict.status > 599 ||
    !/^[a-f0-9]{64}$/.test(control.strict.responseSha256) || !control.strict.diagnosticPresent) {
    throw Error("strictDiagnostics configuration receipts do not prove changed output and the expected diagnostic")
  }
  return control
}

export function admitMetroIncrementalReport(input: unknown, minimumRepetitions = 5, requireConfigurationControl = false): number[] {
  const report = input as MetroIncrementalEvidence
  if (report?.formatVersion !== 1 || report.status !== "complete") throw Error("Metro incremental evidence is incomplete or has an unsupported version")
  const hasMeasurementFixture = Object.prototype.hasOwnProperty.call(report, "measurementFixture")
  if (hasMeasurementFixture) {
    const measurementFixture = report.measurementFixture
    const expectedFields = ["baseStyleSha256", "entrySha256", "styleSha256", "tokenSha256", "workspaceTokenSha256"]
    if (typeof measurementFixture !== "object" || measurementFixture === null || Array.isArray(measurementFixture) ||
      Object.keys(measurementFixture).sort().join(",") !== expectedFields.join(",") ||
      Object.values(measurementFixture).some(value => typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value))) {
      throw Error("Metro measurement fixture identity is invalid")
    }
    if (measurementFixture.entrySha256 !== report.fixture?.entrySha256) {
      throw Error("Metro measurement entry identity does not match the requested bundle entry")
    }
  }
  if (report.dependencyControls !== undefined) admitDependencyControls(report.dependencyControls)
  if (requireConfigurationControl && report.configurationControl === undefined) throw Error("M8.4 Metro evidence is missing its configuration invalidation control")
  if (report.configurationControl !== undefined) admitConfigurationControl(report.configurationControl)
  if (!Number.isSafeInteger(minimumRepetitions) || minimumRepetitions < 1 || report.protocol?.editKind !== "direct-css-source" || report.protocol.repetitions !== report.runs?.length || report.runs.length < minimumRepetitions) {
    throw Error("Metro incremental evidence has insufficient repetitions")
  }
  const fixtureRestoration = [
    ["token", report.fixture?.originalTokenSha256, report.fixture?.restoredTokenSha256],
    ["style", report.fixture?.originalStyleSha256, report.fixture?.restoredStyleSha256],
    ["base style", report.fixture?.originalBaseStyleSha256, report.fixture?.restoredBaseStyleSha256],
    ["workspace token", report.fixture?.originalWorkspaceTokenSha256, report.fixture?.restoredWorkspaceTokenSha256],
  ] as const
  for (const [name, original, restored] of fixtureRestoration) {
    const required = hasMeasurementFixture || name === "token" || name === "style"
    if (original === undefined || restored === undefined) {
      if (required) throw Error(`Metro incremental ${name} fixture restoration hashes are missing`)
      continue
    }
    if (!/^[a-f0-9]{64}$/.test(original) || original !== restored) throw Error(`Metro incremental ${name} fixture was not restored`)
  }
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
  const worktreeFixture = {
    token: await readFile(tokenFile, "utf8"),
    baseStyle: await readFile(baseStyleFile, "utf8"),
    workspaceToken: await readFile(workspaceTokenFile, "utf8"),
    style: await readFile(styleFile, "utf8"),
  }
  const worktreeHashes = {
    token: sha256(worktreeFixture.token),
    baseStyle: sha256(worktreeFixture.baseStyle),
    workspaceToken: sha256(worktreeFixture.workspaceToken),
    style: sha256(worktreeFixture.style),
  }
  const measurementFixture = createHistoricalMetroFixture()
  const measurementHashes = {
    entry: sha256(await readFile(entryFile, "utf8")),
    style: sha256(measurementFixture.style),
    token: sha256(measurementFixture.token),
    baseStyle: sha256(measurementFixture.baseStyle),
    workspaceToken: sha256(measurementFixture.workspaceToken),
  }
  const requestPath = "/src/incremental-entry.bundle?platform=ios&dev=true&minify=false&modulesOnly=false&runModule=true"
  const requestUrl = `http://127.0.0.1:${port}${requestPath}`
  const expoBin = join(appRoot, "node_modules/.bin/expo")
  const logs: string[] = []
  let restoredTokenSha256 = "not-restored"
  let restoredBaseStyleSha256 = "not-restored"
  let restoredWorkspaceTokenSha256 = "not-restored"
  let child: ReturnType<typeof Bun.spawn> | undefined
  let configurationControl: ConfigurationControl | undefined
  const serverStarts: ConfigurationControl["serverStarts"] = []
  try {
    await writeFile(tokenFile, measurementFixture.token)
    await writeFile(baseStyleFile, measurementFixture.baseStyle)
    await writeFile(workspaceTokenFile, measurementFixture.workspaceToken)
    await writeFile(styleFile, measurementFixture.style)
    await assertPortUnused(port)
    const firstServer = await startMetro({ expoBin, appRoot, port, logs, strictDiagnostics: true, clearCache: true })
    child = firstServer.child
    serverStarts.push({ strictDiagnostics: firstServer.strictDiagnostics, clearCache: firstServer.clearCache })
    const startupMs = firstServer.startupMs
    const initialBundle = await fetchBundle(requestUrl, 120_000)
    const initialValue = incrementalCompiledValue(1)
    if (!hasCompiledValue(initialBundle, initialValue)) throw Error("Initial Metro bundle lacks the compiled fixture value")
    const initial = { compiledValue: initialValue, bundleSha256: sha256(initialBundle), bytes: Buffer.byteLength(initialBundle) }
    const dependencyControls: DependencyControl[] = []
    const dependencyStarted = performance.now()
    await writeFile(tokenFile, createIncrementalTokenSource(2))
    const dependencyReceipt = await waitForBundle(requestUrl, bundle => hasDependencyExpression(bundle, 2) && hasCompiledValue(bundle, incrementalCompiledValue(2)) && !hasCompiledValue(bundle, initialValue), dependencyStarted)
    dependencyControls.push(makeDependencyControl("plain-token", initialValue, incrementalCompiledValue(2), dependencyStarted, dependencyReceipt))
    await writeFile(tokenFile, measurementFixture.token)
    await waitForBundle(requestUrl, bundle => hasDependencyExpression(bundle, 1) && hasCompiledValue(bundle, initialValue) && !hasCompiledValue(bundle, incrementalCompiledValue(2)), performance.now())

    const nestedStarted = performance.now()
    await writeFile(baseStyleFile, createIncrementalBaseStyleSource(3))
    const nestedReceipt = await waitForBundle(requestUrl, bundle => hasMarginValue(bundle, 31003) && !hasMarginValue(bundle, 31001), nestedStarted)
    dependencyControls.push(makeDependencyControl("nested-css", 31001, 31003, nestedStarted, nestedReceipt, hasMarginValue))
    await writeFile(baseStyleFile, measurementFixture.baseStyle)
    await waitForBundle(requestUrl, bundle => hasMarginValue(bundle, 31001) && !hasMarginValue(bundle, 31003), performance.now())

    const workspaceStarted = performance.now()
    await writeFile(workspaceTokenFile, createHistoricalWorkspaceTokenSource(4))
    const workspaceReceipt = await waitForBundle(requestUrl, bundle => hasBorderWidthValue(bundle, 32004) && !hasBorderWidthValue(bundle, 32001), workspaceStarted)
    dependencyControls.push(makeDependencyControl("workspace-source", 32001, 32004, workspaceStarted, workspaceReceipt, hasBorderWidthValue))
    await writeFile(workspaceTokenFile, measurementFixture.workspaceToken)
    await waitForBundle(requestUrl, bundle => hasBorderWidthValue(bundle, 32001) && !hasBorderWidthValue(bundle, 32004), performance.now())

    const warmupStarted = performance.now()
    await writeFile(styleFile, createHistoricalIncrementalStyleSource(100))
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
      await writeFile(styleFile, createHistoricalIncrementalStyleSource(addend))
      await delay(75)
      const updated = await waitForBundle(requestUrl, bundle => hasCompiledValue(bundle, compiledValue) && !hasCompiledValue(bundle, previousValue), started)
      const { attempts, bundle } = updated
      const run = makeRun(index + 1, previousValue, compiledValue, started, { attempts, bundle })
      const receipt = run.receipt
      runs.push(run)
      if (!receipt.compiledValuePresent || !receipt.previousCompiledValueAbsent) throw Error(`Metro did not emit dependency edit ${index + 1}`)
      previousValue = compiledValue
    }

    // M8.4 remains covered, but runs after the timed sequence so config-restart
    // cache activity cannot change the baseline incremental-edit workload.
    await stop(child)
    await writeFile(tokenFile, worktreeFixture.token)
    await writeFile(baseStyleFile, worktreeFixture.baseStyle)
    await writeFile(workspaceTokenFile, worktreeFixture.workspaceToken)
    await writeFile(styleFile, worktreeFixture.style)
    const permissiveServer = await startMetro({ expoBin, appRoot, port, logs, strictDiagnostics: false, clearCache: false })
    child = permissiveServer.child
    serverStarts.push({ strictDiagnostics: permissiveServer.strictDiagnostics, clearCache: permissiveServer.clearCache })
    const configurationValue = incrementalCompiledValue(901)
    await writeFile(styleFile, createIncrementalStyleSource(901, { includeDroppedDeclaration: true }))
    const permissiveUpdate = await waitForBundle(requestUrl, bundle => hasCompiledValue(bundle, configurationValue) && !hasCompiledValue(bundle, initialValue), performance.now())

    await stop(child)
    const strictServer = await startMetro({ expoBin, appRoot, port, logs, strictDiagnostics: true, clearCache: false })
    child = strictServer.child
    serverStarts.push({ strictDiagnostics: strictServer.strictDiagnostics, clearCache: strictServer.clearCache })
    const strictResponse = await fetchBundleResult(requestUrl, 120_000)
    configurationControl = {
      setting: "strictDiagnostics",
      cacheState: "persistent-across-restarts",
      serverStarts,
      previousCompiledValue: initialValue,
      compiledValue: configurationValue,
      permissive: {
        status: 200,
        bundleSha256: sha256(permissiveUpdate.bundle),
        compiledValuePresent: hasCompiledValue(permissiveUpdate.bundle, configurationValue),
        previousCompiledValueAbsent: !hasCompiledValue(permissiveUpdate.bundle, initialValue),
      },
      strict: {
        status: strictResponse.status,
        responseSha256: sha256(strictResponse.body),
        diagnosticPresent: strictResponse.body.includes("CRUMBS_CSS_DROPPED_DECLARATION"),
      },
      restored: {
        status: 0,
        bundleSha256: "",
        compiledValuePresent: false,
        previousCompiledValueAbsent: false,
      },
    }

    await stop(child)
    const restoredConfigServer = await startMetro({ expoBin, appRoot, port, logs, strictDiagnostics: false, clearCache: false })
    child = restoredConfigServer.child
    serverStarts.push({ strictDiagnostics: restoredConfigServer.strictDiagnostics, clearCache: restoredConfigServer.clearCache })
    const restoredConfigResponse = await fetchBundleResult(requestUrl, 120_000)
    configurationControl.restored = {
      status: restoredConfigResponse.status,
      bundleSha256: sha256(restoredConfigResponse.body),
      compiledValuePresent: hasCompiledValue(restoredConfigResponse.body, configurationValue),
      previousCompiledValueAbsent: !hasCompiledValue(restoredConfigResponse.body, initialValue),
    }
    admitConfigurationControl(configurationControl)

    await writeFile(styleFile, worktreeFixture.style)
    await writeFile(tokenFile, worktreeFixture.token)
    await writeFile(baseStyleFile, worktreeFixture.baseStyle)
    await writeFile(workspaceTokenFile, worktreeFixture.workspaceToken)
    restoredTokenSha256 = sha256(await readFile(tokenFile, "utf8"))
    restoredBaseStyleSha256 = sha256(await readFile(baseStyleFile, "utf8"))
    restoredWorkspaceTokenSha256 = sha256(await readFile(workspaceTokenFile, "utf8"))
    const restoredStyleSha256 = sha256(await readFile(styleFile, "utf8"))
    const report = {
      formatVersion: 1,
      status: "complete",
      recordedAt: new Date().toISOString(),
      sourceRevision: Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: repoRoot }).stdout.toString().trim(),
      sourceTreeDirty: Bun.spawnSync(["git", "diff", "--quiet"], { cwd: repoRoot }).exitCode !== 0 ||
        Bun.spawnSync(["git", "diff", "--cached", "--quiet"], { cwd: repoRoot }).exitCode !== 0,
      environment: { platform: process.platform, architecture: process.arch, osRelease: release(), cpu: cpus()[0]?.model ?? "unknown",
        expo: requireFromApp("expo/package.json").version as string, metro: resolveExpoMetroVersion(appRoot),
        reactNative: requireFromApp("react-native/package.json").version as string },
      packageProvenance: { expoMetroRuntime: requireFromApp("@expo/metro-runtime/package.json").version as string,
        react: requireFromApp("react/package.json").version as string, reactDom: requireFromApp("react-dom/package.json").version as string,
        babelPresetExpo: requireFromApp("babel-preset-expo/package.json").version as string },
      protocol: { requestUrl: requestPath, repetitions, editKind: "direct-css-source", cacheState: "One cleared Metro server and warm initial graph; three dependency-only controls (plain token, nested .css.ts and workspace source) prove parent rebuilds before one excluded direct-edit warmup and five retained direct .css.ts edits; dependency receipts require the new baked value and absence of the old value" },
      fixture: { entrySha256: measurementHashes.entry, originalStyleSha256: worktreeHashes.style, restoredStyleSha256: restoredStyleSha256, originalTokenSha256: worktreeHashes.token, restoredTokenSha256, originalBaseStyleSha256: worktreeHashes.baseStyle, restoredBaseStyleSha256, originalWorkspaceTokenSha256: worktreeHashes.workspaceToken, restoredWorkspaceTokenSha256 },
      measurementFixture: { entrySha256: measurementHashes.entry, styleSha256: measurementHashes.style, tokenSha256: measurementHashes.token, baseStyleSha256: measurementHashes.baseStyle, workspaceTokenSha256: measurementHashes.workspaceToken },
      server: { startupMs, logs },
      initial,
      dependencyControls,
      configurationControl,
      warmup: { ...warmup, excluded: true },
      runs,
    }
    admitMetroIncrementalReport(report, 5, true)
    await writeFile(outputFile, JSON.stringify(report, null, 2) + "\n")
    return report
  } finally {
    if (sha256(await readFile(tokenFile)) !== worktreeHashes.token) await writeFile(tokenFile, worktreeFixture.token)
    if (sha256(await readFile(baseStyleFile)) !== worktreeHashes.baseStyle) await writeFile(baseStyleFile, worktreeFixture.baseStyle)
    if (sha256(await readFile(workspaceTokenFile)) !== worktreeHashes.workspaceToken) await writeFile(workspaceTokenFile, worktreeFixture.workspaceToken)
    if (sha256(await readFile(styleFile)) !== worktreeHashes.style) await writeFile(styleFile, worktreeFixture.style)
    if (child) await stop(child)
  }
}

async function startMetro(input: {
  expoBin: string
  appRoot: string
  port: number
  logs: string[]
  strictDiagnostics: boolean
  clearCache: boolean
}) {
  const started = performance.now()
  const metroEnvironment: Record<string, string | undefined> = {
    ...process.env,
    EXPO_NO_INTERACTIVE: "1",
    EXPO_NO_METRO_WORKSPACE_ROOT: "1",
    CRUMBS_INCREMENTAL_BENCH: "1",
    CRUMBS_INCREMENTAL_STRICT_DIAGNOSTICS: input.strictDiagnostics ? "1" : "0",
  }
  delete metroEnvironment.CI
  const args = [input.expoBin, "start", "--offline", "--port", String(input.port)]
  if (input.clearCache) args.push("--clear")
  args.push("--max-workers", "1")
  const child = Bun.spawn(args, {
    cwd: input.appRoot,
    env: metroEnvironment,
    stdout: "pipe",
    stderr: "pipe",
  })
  capture(child.stdout, input.logs)
  capture(child.stderr, input.logs)
  await waitForMetro(input.port, child, input.logs, 120_000)
  return {
    child,
    startupMs: performance.now() - started,
    strictDiagnostics: input.strictDiagnostics,
    clearCache: input.clearCache,
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
  const response = await fetchBundleResult(url, timeout)
  if (response.status < 200 || response.status >= 300) throw Error(`Metro bundle request failed (${response.status}): ${response.body.slice(0, 500)}`)
  return response.body
}
async function fetchBundleResult(url: string, timeout: number) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { Accept: "application/javascript" } })
  return { status: response.status, body: await response.text() }
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
