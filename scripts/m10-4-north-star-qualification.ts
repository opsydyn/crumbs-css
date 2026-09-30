import { createHash } from "node:crypto"
import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { cpus, release, tmpdir } from "node:os"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { pathToFileURL } from "node:url"
import { verifyExpoBundleInventory, type BundleInventory } from "./packed-distribution-contract"
import { auditPackedRuntimeEntrypoints } from "./packed-runtime-graph"

type PackedArtifact = Readonly<{
  name: string
  version: string
  tarball: string
  sha256: string
}>
type InstalledArtifact = Readonly<{
  name: string
  version: string
  packageRoot: string
  entryPath: string
}>
type PreparedConsumer = Readonly<{
  buildRoot: string
  consumerRoot: string
  artifacts: Readonly<Record<string, PackedArtifact>>
  installedPackages: Readonly<Record<string, InstalledArtifact>>
}>
type RunResult = Readonly<{ stdout: string; stderr: string; exitCode: number }>
type PackageLock = Readonly<{
  packages?: Readonly<Record<string, Readonly<{ version?: string }>>>
}>

const repositoryRoot = resolve(import.meta.dir, "..")
const evidenceRelativePath = "docs/evidence/2026-09-30-m10-4-north-star"
const packageNames = ["@opsydyn/crumbs-css", "@acme/design-tokens", "@acme/ui"] as const
const runtimePackageNames = ["expo", "react", "react-native", "react-native-web", "@rn-primitives/portal", "react-test-renderer"] as const
const fixtureRoot = "packages/css/fixtures/m10-4-north-star"
const consumerSourcePath = "src/ActionCard.css.ts"
const unlistedSourcePath = "src/not-listed.ts"
const sourceFiles = [
  "package.json",
  "packages/css/bench/native-styles.bench.ts",
  "docs/superpowers/plans/2026-09-30-m10-4-north-star-journeys.md",
  "docs/assessments/2026-09-30-m10-4-north-star-journeys.md",
  "docs/roadmap.md",
  "packages/css/fixtures/packed-distribution/app/package.json",
  "packages/css/fixtures/packed-distribution/app/src/App.tsx",
  "packages/css/fixtures/packed-distribution/app/test/north-star-journeys.integration.tsx",
  "packages/css/fixtures/packed-distribution/tokens/src/index.ts",
  "packages/css/fixtures/m10-4-north-star/baseline.json",
  "packages/css/fixtures/m10-4-north-star/current.json",
  "packages/css/fixtures/m10-4-north-star/consumer.json",
  "packages/css/fixtures/m10-4-north-star/migration.json",
  "packages/css/fixtures/m10-4-north-star/src/ActionCard.css.ts",
  "packages/css/fixtures/m10-4-north-star/css-modules.d.ts",
  "packages/css/fixtures/m10-4-north-star/src/not-listed.ts",
  "packages/css/src/tooling/manifest/comparison-report-model.ts",
  "packages/css/src/tooling/manifest/comparison-report-schema.ts",
  "packages/css/src/tooling/manifest/comparison.ts",
  "packages/css/test/manifest-comparison-schema.test.ts",
  "packages/css/test/manifest-comparison-canonical-json.property.test.ts",
  "packages/css/test/manifest-comparison-export.test.ts",
  "packages/css/test/north-star-qualification.test.ts",
  "packages/css/test/ownership-cli.test.ts",
  "packages/css/test/ownership-qualification.test.ts",
  "packages/css/test/ownership-reports.test.ts",
  "packages/css/fixtures/m9-7-ownership/compatibility.json",
  "scripts/m9-7-ownership-qualification.ts",
  "scripts/m10-4-north-star-qualification.ts",
] as const

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

function isPathInside(parent: string, candidate: string): boolean {
  const pathFromParent = relative(parent, candidate)
  return pathFromParent !== "" &&
    pathFromParent !== ".." &&
    !pathFromParent.startsWith(".." + sep) &&
    !isAbsolute(pathFromParent)
}

function parseJson(text: string, source: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    throw new Error("Could not decode JSON from " + source + ": " + String(error), { cause: error })
  }
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return parseJson(await readFile(path, "utf8"), path) as Record<string, unknown>
}

async function runCommand(
  command: ReadonlyArray<string>,
  cwd: string,
  logPath: string,
  env: Readonly<Record<string, string>> = {},
  allowNonZero = false,
): Promise<RunResult> {
  await mkdir(dirname(logPath), { recursive: true })
  const child = Bun.spawn([...command], {
    cwd,
    env: { ...process.env, ...env, CI: "1", npm_config_audit: "false", npm_config_fund: "false" },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n")
  await writeFile(logPath, output + "\n")
  if (exitCode !== 0 && !allowNonZero) {
    throw new Error("$ " + command.join(" ") + " (exit " + exitCode + ") in " + cwd + "; output retained at " + logPath + "\n" + output)
  }
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode }
}

async function fileHashes(paths: ReadonlyArray<string>): Promise<ReadonlyArray<{ path: string; sha256: string }>> {
  return Promise.all(paths.map(async path => ({
    path,
    sha256: sha256(await readFile(resolve(repositoryRoot, path))),
  })))
}

async function materializeInventory(
  inventories: ReadonlyArray<BundleInventory>,
  appRoot: string,
  packageRoots: Readonly<Record<string, string>>,
): Promise<ReadonlyArray<unknown>> {
  const result = []
  for (const inventory of inventories) {
    const sourceMaps = []
    for (const path of inventory.sourceMapFiles) {
      sourceMaps.push({
        path: relative(appRoot, path).replaceAll("\\", "/"),
        sha256: sha256(await readFile(path)),
      })
    }
    const packageSources = Object.fromEntries(Object.entries(inventory.packageSources).map(([name, paths]) => [
      name,
      paths.map(path => relative(packageRoots[name]!, path).replaceAll("\\", "/")).sort(),
    ]))
    result.push({ platform: inventory.platform, sourceMaps, packageSources })
  }
  return result
}

async function copyLogs(sourceDirectory: string, destinationDirectory: string): Promise<void> {
  await mkdir(destinationDirectory, { recursive: true })
  for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".log")) continue
    await copyFile(join(sourceDirectory, entry.name), join(destinationDirectory, entry.name))
  }
}

async function qualify(): Promise<Readonly<{ status: string; evidencePath: string }>> {
  const workRoot = await realpath(await mkdtemp(join(tmpdir(), "crumbs-m10-4-")))
  const prepareLog = join(workRoot, "packed-consumer-prepare.log")
  let prepared: PreparedConsumer | undefined
  let evidenceWritten = false
  try {
    const prepareResult = await runCommand(
      ["bun", "scripts/playground-distribution.ts", "--prepare-only"],
      repositoryRoot,
      prepareLog,
    )
    prepared = parseJson(prepareResult.stdout, "packed-distribution prepare-only output") as PreparedConsumer
    if (typeof prepared.buildRoot !== "string" || typeof prepared.consumerRoot !== "string") {
      throw new Error("Packed-distribution preparation omitted buildRoot or consumerRoot.")
    }
    const buildRoot = await realpath(prepared.buildRoot)
    const appRoot = await realpath(prepared.consumerRoot)
    const consumerRequire = createRequire(join(appRoot, "package.json"))

    const packageRoots: Record<string, string> = {}
    const artifactRecords: Record<string, unknown> = {}
    for (const name of packageNames) {
      const artifact = prepared.artifacts[name]
      const installed = prepared.installedPackages[name]
      if (artifact === undefined || installed === undefined) throw new Error("Missing packed artifact identity for " + name)
      const packageRoot = await realpath(installed.packageRoot)
      const expectedRoot = await realpath(join(appRoot, "node_modules", ...name.split("/")))
      if (packageRoot !== expectedRoot || !isPathInside(join(appRoot, "node_modules"), packageRoot)) {
        throw new Error("Packed package " + name + " did not install directly beneath the staged consumer node_modules.")
      }
      const manifest = await readJson(join(packageRoot, "package.json"))
      if (manifest.name !== name || manifest.version !== artifact.version || installed.version !== artifact.version) {
        throw new Error("Packed package identity mismatch for " + name + ".")
      }
      const packedBytes = await readFile(artifact.tarball)
      const actualHash = sha256(packedBytes)
      if (actualHash !== artifact.sha256) throw new Error("Packed tarball hash mismatch for " + name + ".")
      packageRoots[name] = packageRoot
      artifactRecords[name] = {
        name,
        version: artifact.version,
        tarballSha256: actualHash,
        installedPackageRoot: relative(appRoot, packageRoot).replaceAll("\\", "/"),
      }
    }

    const crumbsRoot = packageRoots["@opsydyn/crumbs-css"]!
    const tokensRoot = packageRoots["@acme/design-tokens"]!
    const resolvePacked = async (specifier: string, packageRoot: string): Promise<string> => {
      const entry = await realpath(consumerRequire.resolve(specifier))
      if (!isPathInside(packageRoot, entry)) {
        throw new Error(specifier + " resolved outside its exact packed package: " + entry)
      }
      return entry
    }
    const publicEntryResolutions = {
      manifest: await resolvePacked("@opsydyn/crumbs-css/tooling/manifest", crumbsRoot),
      migrations: await resolvePacked("@opsydyn/crumbs-css/tooling/migrations", crumbsRoot),
      tokens: await resolvePacked("@opsydyn/crumbs-css/tokens", crumbsRoot),
      designTokens: await resolvePacked("@acme/design-tokens", tokensRoot),
    }
    const manifestTools = consumerRequire("@opsydyn/crumbs-css/tooling/manifest") as Record<string, any>
    const migrationTools = consumerRequire("@opsydyn/crumbs-css/tooling/migrations") as Record<string, any>
    const tokensCommonJs = consumerRequire("@opsydyn/crumbs-css/tokens") as Record<string, any>
    if (typeof manifestTools.compareManifests !== "function" ||
      typeof manifestTools.encodeCanonicalManifestCompatibilityReport !== "function" ||
      typeof migrationTools.planSourceMigration !== "function" ||
      typeof migrationTools.encodeCanonicalSourceMigrationReport !== "function" ||
      typeof tokensCommonJs.createTokenThemeSnapshot !== "function") {
      throw new Error("A required packed public tooling or token API is missing.")
    }
    const crumbsManifest = await readJson(join(crumbsRoot, "package.json"))
    const tokenExport = (crumbsManifest.exports as Record<string, Record<string, string>>) ["./tokens"]
    if (tokenExport?.import === undefined) throw new Error("Packed tokens subpath is missing its ESM export.")
    const tokenEsmEntry = await realpath(resolve(crumbsRoot, tokenExport.import))
    if (!isPathInside(crumbsRoot, tokenEsmEntry)) throw new Error("Packed ESM token entry resolves outside Crumbs.")
    const tokenRuntime = await import(pathToFileURL(publicEntryResolutions.designTokens).href) as Record<string, any>
    const tokenApiEsm = await import(pathToFileURL(tokenEsmEntry).href) as Record<string, any>
    if (typeof tokenApiEsm.createTokenThemeSnapshot !== "function") {
      throw new Error("Packed ESM token API does not expose createTokenThemeSnapshot.")
    }

    const fixtureRootPath = resolve(repositoryRoot, fixtureRoot)
    const baseline = await readJson(join(fixtureRootPath, "baseline.json"))
    const current = await readJson(join(fixtureRootPath, "current.json"))
    const consumer = await readJson(join(fixtureRootPath, "consumer.json"))
    const migrationInput = await readJson(join(fixtureRootPath, "migration.json"))
    const compatibility = manifestTools.compareManifests({ baseline, current, consumers: [consumer] })
    const aliasFinding = compatibility.findings.find((finding: Record<string, any>) =>
      finding.code === "token.alias-changed" && finding.entityId === "@acme/design-system#token:color.action")
    const removedFinding = compatibility.findings.find((finding: Record<string, any>) =>
      finding.code === "token.removed" && finding.entityId === "@acme/design-system#token:color.legacy")
    if (compatibility.schemaVersion !== 2 ||
      compatibility.findings.length !== 2 ||
      aliasFinding?.level !== "warning" ||
      aliasFinding?.before?.targetId !== "@acme/design-system#token:color.blue" ||
      aliasFinding?.after?.targetId !== "@acme/design-system#token:color.brand" ||
      aliasFinding?.affectedConsumers?.length !== 1 ||
      aliasFinding.affectedConsumers[0]?.package?.name !== "@acme/mobile-app" ||
      aliasFinding.affectedConsumers[0]?.dependency?.to !== aliasFinding.entityId ||
      removedFinding?.level !== "error" ||
      removedFinding.affectedConsumers.length !== 1 ||
      removedFinding.affectedConsumers[0]?.dependency?.to !== removedFinding.entityId) {
      throw new Error("Packed manifest comparison did not report the alias change and removed-token impact precisely.")
    }
    manifestTools.decodeManifestCompatibilityReport(compatibility)
    const compatibilityJson = manifestTools.encodeCanonicalManifestCompatibilityReport(compatibility)
    const compatibilitySummary = {
      schemaVersion: compatibility.schemaVersion,
      suppliedConsumers: compatibility.suppliedConsumers,
      findings: compatibility.findings.map((finding: Record<string, any>) => ({
        code: finding.code,
        level: finding.level,
        entityId: finding.entityId,
        fieldPath: finding.fieldPath,
        affectedConsumerCount: finding.affectedConsumers.length,
      })),
      analysisLimits: compatibility.analysisLimits,
    }

    const migrationStage = join(buildRoot, "north-star-migration-stage")
    const migrationSourcePath = join(migrationStage, consumerSourcePath)
    const unlistedPath = join(migrationStage, unlistedSourcePath)
    await mkdir(dirname(migrationSourcePath), { recursive: true })
    await copyFile(join(fixtureRootPath, consumerSourcePath), migrationSourcePath)
    await copyFile(join(fixtureRootPath, unlistedSourcePath), unlistedPath)
    const sourceBefore = await readFile(migrationSourcePath)
    const unlistedBefore = await readFile(unlistedPath)
    const migration = migrationTools.decodeSourceMigration(migrationInput)
    const firstPlan = migrationTools.planSourceMigration({
      migration,
      baseline,
      current,
      files: [{ path: consumerSourcePath, source: sourceBefore.toString("utf8") }],
    })
    if (firstPlan.report.diagnostics.length !== 0 ||
      firstPlan.outputs.length !== 1 ||
      firstPlan.outputs[0]?.path !== consumerSourcePath ||
      firstPlan.outputs[0]?.changed !== true) {
      throw new Error("Packed source migration did not produce one safe explicit-file update.")
    }
    const plannedOutput = firstPlan.outputs[0].source
    const destination = resolve(migrationStage, firstPlan.outputs[0].path)
    if (!isPathInside(migrationStage, destination)) throw new Error("Migration output escaped its explicit temporary source root.")
    await writeFile(destination, plannedOutput)
    const sourceAfter = await readFile(migrationSourcePath)
    const unlistedAfter = await readFile(unlistedPath)
    if (sourceAfter.toString("utf8") !== plannedOutput || !unlistedBefore.equals(unlistedAfter)) {
      throw new Error("Applying the packed migration changed an unlisted source file or missed its explicit output.")
    }
    const secondPlan = migrationTools.planSourceMigration({
      migration,
      baseline,
      current,
      files: [{ path: consumerSourcePath, source: sourceAfter.toString("utf8") }],
    })
    if (secondPlan.report.diagnostics.length !== 0 ||
      secondPlan.outputs.length !== 1 ||
      secondPlan.outputs[0]?.changed !== false ||
      secondPlan.outputs[0]?.source !== sourceAfter.toString("utf8")) {
      throw new Error("Repeated packed source migration was not unchanged.")
    }
    const migrationJson = migrationTools.encodeCanonicalSourceMigrationReport(firstPlan.report)
    const migrationRepeatJson = migrationTools.encodeCanonicalSourceMigrationReport(secondPlan.report)

    const oldTheme = tokenRuntime.theme
    const oldValuesBefore = JSON.stringify(oldTheme.values)
    const newBase = structuredClone(oldTheme.values) as Record<string, any>
    newBase.color.accent = "#8b4ecb"
    const updatedTheme = tokenApiEsm.createTokenThemeSnapshot(tokenRuntime.vars, {
      base: newBase,
      contexts: {},
    })
    const oldValuesAfter = JSON.stringify(oldTheme.values)
    if (oldValuesBefore !== oldValuesAfter ||
      oldTheme.values.color.accent !== "#2457d6" ||
      updatedTheme.values.color.accent !== "#8b4ecb" ||
      updatedTheme === oldTheme) {
      throw new Error("Constructing the changed packed token snapshot mutated the previous snapshot.")
    }
    const snapshotEvidence = {
      previousAccent: oldTheme.values.color.accent,
      updatedAccent: updatedTheme.values.color.accent,
      previousValuesSha256Before: sha256(oldValuesBefore),
      previousValuesSha256After: sha256(oldValuesAfter),
      snapshotsAreDistinct: updatedTheme !== oldTheme,
    }

    const runtimeGraphs = await auditPackedRuntimeEntrypoints(crumbsRoot)
    const ordinaryRuntimeGraphs = runtimeGraphs.filter(graph => graph.classification === "ordinary-runtime")
    if (ordinaryRuntimeGraphs.length === 0) throw new Error("Packed Crumbs runtime graph audit found no ordinary runtime entrypoints.")

    await runCommand(
      ["bun", "test", "./test/north-star-journeys.integration.tsx"],
      appRoot,
      join(buildRoot, "logs/north-star-consumer-test.log"),
      { EXPO_NO_METRO_WORKSPACE_ROOT: "1" },
    )
    const tsc = join(appRoot, "node_modules/.bin/tsc")
    await runCommand(
      [tsc, "--project", "tsconfig.json", "--noEmit"],
      appRoot,
      join(buildRoot, "logs/typecheck-north-star-consumer.log"),
      { EXPO_NO_METRO_WORKSPACE_ROOT: "1" },
    )

    const expo = join(appRoot, "node_modules/.bin/expo")
    const outputDirectories: Record<"ios" | "web", string> = {
      ios: join(appRoot, "dist", "m10-4", "ios"),
      web: join(appRoot, "dist", "m10-4", "web"),
    }
    for (const platform of ["ios", "web"] as const) {
      await mkdir(outputDirectories[platform], { recursive: true })
      await runCommand(
        [expo, "export", "--platform", platform, "--source-maps", "--output-dir", outputDirectories[platform]],
        appRoot,
        join(buildRoot, "logs/export-north-star-" + platform + ".log"),
        { EXPO_NO_METRO_WORKSPACE_ROOT: "1" },
      )
    }
    const inventories = await verifyExpoBundleInventory(
      [
        { platform: "ios", directory: outputDirectories.ios },
        { platform: "web", directory: outputDirectories.web },
      ],
      appRoot,
      repositoryRoot,
      packageNames,
    )
    const bundleInventory = await materializeInventory(inventories, appRoot, packageRoots)

    const benchmarkPath = join(buildRoot, "host-smoke-performance.json")
    const benchmarkResult = await runCommand(
      ["bun", "packages/css/bench/native-styles.bench.ts"],
      repositoryRoot,
      join(buildRoot, "logs/host-smoke-performance.log"),
      { CRUMBS_BENCH_JSON_OUTPUT: benchmarkPath },
      true,
    )
    let benchmark: Record<string, unknown>
    try {
      benchmark = await readJson(benchmarkPath)
    } catch (error) {
      throw new Error("Host smoke benchmark did not retain its JSON report.", { cause: error })
    }
    const benchmarkFixtures = benchmark.fixtures
    if (!Array.isArray(benchmarkFixtures) || benchmarkFixtures.some(fixture => {
      if (typeof fixture !== "object" || fixture === null) return true
      const file = (fixture as { readonly file?: unknown }).file
      return typeof file !== "string" || isAbsolute(file) || file.startsWith("../") || file.includes("\\")
    })) {
      throw new Error("Host smoke benchmark fixture paths must be package-relative for portable evidence.")
    }
    const benchmarkStatus = benchmarkResult.exitCode === 0 ? "passed" : "failed"
    const nodeVersion = await runCommand(["node", "--version"], appRoot, join(buildRoot, "logs/node-version.log"))
    const npmVersion = await runCommand(["npm", "--version"], appRoot, join(buildRoot, "logs/npm-version.log"))
    const sourceRevision = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      stdout: "pipe",
      stderr: "pipe",
    }).stdout.toString().trim()
    const packageLock = await readJson(join(appRoot, "package-lock.json")) as PackageLock
    const installedVersions = Object.fromEntries(runtimePackageNames.map(name => {
      const installed = packageLock.packages?.["node_modules/" + name]?.version
      if (installed === undefined) throw new Error("No exact package-lock version recorded for " + name)
      return [name, installed]
    }))
    const sourceEvidence = await fileHashes(sourceFiles)

    const evidenceRoot = resolve(repositoryRoot, evidenceRelativePath)
    const logsRoot = join(evidenceRoot, "logs")
    await mkdir(evidenceRoot, { recursive: true })
    await rm(logsRoot, { recursive: true, force: true })
    await mkdir(logsRoot, { recursive: true })
    const compatibilityPath = "manifest-compatibility-report-v2.json"
    const migrationPath = "source-migration-report-v1.json"
    const migrationRepeatPath = "source-migration-repeat-report-v1.json"
    const bundlePath = "bundle-inventory.json"
    const diagnosticsPath = "diagnostics.json"
    const benchmarkEvidencePath = "host-smoke-performance.json"
    const compatibilityBytes = compatibilityJson.endsWith("\n") ? compatibilityJson : compatibilityJson + "\n"
    const migrationBytes = migrationJson.endsWith("\n") ? migrationJson : migrationJson + "\n"
    const migrationRepeatBytes = migrationRepeatJson.endsWith("\n") ? migrationRepeatJson : migrationRepeatJson + "\n"
    const bundleBytes = JSON.stringify(bundleInventory, null, 2) + "\n"
    const diagnostics = {
      format: "crumbs.north-star-diagnostics",
      schemaVersion: 1,
      roadmapItem: "M10.4",
      accessibility: {
        disabledStateAndStyle: "passed-in-packed-consumer-test",
        screenReaderAcceptance: "not-run",
        reason: "The host-side React Native Web interaction test is not screen-reader or native-device evidence.",
      },
      platforms: {
        iosBundleExport: "passed",
        webBundleExport: "passed",
        androidBundleExport: "not-run",
        reason: "Android remains parked by the user.",
      },
      nativeDevice: {
        iosRendering: "not-run",
        devicePerformance: "not-run",
        reason: "No physical device is available; native acceptance remains backlogged.",
      },
      publishing: "not-run",
      analysisScope: "Only the explicitly supplied provider and consumer manifests and migration source file were analyzed.",
      hostPerformance: benchmarkStatus,
    }
    const diagnosticsBytes = JSON.stringify(diagnostics, null, 2) + "\n"
    const benchmarkBytes = JSON.stringify(benchmark, null, 2) + "\n"
    const runtimeGraphPath = "runtime-graph.json"
    const runtimeGraphSummary = runtimeGraphs.map(graph => ({
      subpath: graph.subpath,
      classification: graph.classification,
      format: graph.format,
      entry: graph.entry,
      files: graph.files,
      externalSpecifiers: graph.externalSpecifiers,
      dynamicLoaderExceptions: graph.dynamicLoaderExceptions,
    }))
    const runtimeGraphBytes = JSON.stringify(runtimeGraphSummary, null, 2) + "\n"
    const reportArtifacts = [
      { path: compatibilityPath, sha256: sha256(compatibilityBytes) },
      { path: migrationPath, sha256: sha256(migrationBytes) },
      { path: migrationRepeatPath, sha256: sha256(migrationRepeatBytes) },
      { path: bundlePath, sha256: sha256(bundleBytes) },
      { path: diagnosticsPath, sha256: sha256(diagnosticsBytes) },
      { path: benchmarkEvidencePath, sha256: sha256(benchmarkBytes) },
      { path: runtimeGraphPath, sha256: sha256(runtimeGraphBytes) },
    ]
    const receipt = {
      format: "crumbs.north-star-qualification",
      schemaVersion: 1,
      roadmapItem: "M10.4",
      status: benchmarkStatus === "passed" ? "qualified-packed-ios-web-and-host" : "incomplete-host-performance",
      generatedAt: new Date().toISOString(),
      source: {
        revision: sourceRevision,
        state: "working-tree; selected source and fixture hashes bind this run",
        files: sourceEvidence,
      },
      toolchain: {
        bun: Bun.version,
        node: nodeVersion.stdout,
        npm: npmVersion.stdout,
        host: {
          platform: process.platform,
          architecture: process.arch,
          release: release(),
          cpu: cpus()[0]?.model,
        },
      },
      packages: {
        artifacts: artifactRecords,
        installedVersions,
        packageLockSha256: sha256(await readFile(join(appRoot, "package-lock.json"))),
        installedExports: Object.fromEntries(Object.entries(publicEntryResolutions).map(([name, path]) => [
          name,
          relative(appRoot, path).replaceAll("\\", "/"),
        ])),
        compatibilityReportVersion: compatibility.schemaVersion,
        compatibilitySummary,
        runtimeGraphAudit: {
          status: "passed",
          graphCount: runtimeGraphs.length,
          ordinaryRuntimeGraphCount: ordinaryRuntimeGraphs.length,
          classifications: [...new Set(runtimeGraphs.map(graph => graph.classification))].sort(),
          evidencePath: runtimeGraphPath,
        },
      },
      consumer: {
        name: "crumbs-packed-design-system-consumer",
        expoSdk: installedVersions.expo,
        react: installedVersions.react,
        reactNative: installedVersions["react-native"],
        supportedSurface: ["iOS bundle export", "web bundle export", "host interaction test"],
        results: {
          integrationTest: "passed",
          typecheck: "passed",
          iosExport: "passed",
          webExport: "passed",
          sourceMapInventory: "passed",
        },
        bundleInventory: bundlePath,
      },
      journeys: {
        A: "passed",
        B: {
          compatibilityReport: compatibilityPath,
          migrationReport: migrationPath,
          repeatReport: migrationRepeatPath,
          selectiveMigration: "passed",
          unlistedSourceSha256Before: sha256(unlistedBefore),
          unlistedSourceSha256After: sha256(unlistedAfter),
        },
        C: {
          secondBrand: "passed",
          portalScope: "passed",
          disabledAccessibilityState: "passed",
        },
      },
      previousThemeSnapshot: snapshotEvidence,
      performance: {
        hostSmokeStatus: benchmarkStatus,
        hostEvidence: benchmarkEvidencePath,
        nativeDeviceStatus: "not-run",
      },
      diagnostics: diagnosticsPath,
      evidenceArtifacts: reportArtifacts,
      limitations: [
        "The package, Expo, React, and React Native matrix is limited to the exact versions recorded above.",
        "iOS and web exports prove packed JavaScript bundle provenance, not native rendering, native accessibility, or device performance.",
        "Android export and device acceptance remain parked; publishing and broader consumer compatibility are not covered.",
      ],
    }

    await writeFile(join(evidenceRoot, compatibilityPath), compatibilityBytes)
    await writeFile(join(evidenceRoot, migrationPath), migrationBytes)
    await writeFile(join(evidenceRoot, migrationRepeatPath), migrationRepeatBytes)
    await writeFile(join(evidenceRoot, bundlePath), bundleBytes)
    await writeFile(join(evidenceRoot, diagnosticsPath), diagnosticsBytes)
    await writeFile(join(evidenceRoot, benchmarkEvidencePath), benchmarkBytes)
    await writeFile(join(evidenceRoot, runtimeGraphPath), runtimeGraphBytes)
    await writeFile(join(evidenceRoot, "qualification.json"), JSON.stringify(receipt, null, 2) + "\n")
    await writeFile(join(evidenceRoot, "compatibility-summary.json"), JSON.stringify(compatibilitySummary, null, 2) + "\n")
    await writeFile(join(evidenceRoot, "theme-snapshot-check.json"), JSON.stringify(snapshotEvidence, null, 2) + "\n")
    await copyLogs(join(buildRoot, "logs"), logsRoot)
    await copyFile(prepareLog, join(logsRoot, "packed-consumer-prepare.log"))
    evidenceWritten = true
    console.log(JSON.stringify({
      status: receipt.status,
      evidencePath: resolve(evidenceRoot, "qualification.json"),
      sourceRevision,
      packages: artifactRecords,
      compatibilitySummary,
      themeSnapshot: snapshotEvidence,
      bundlePlatforms: inventories.map(inventory => inventory.platform),
      hostPerformanceStatus: benchmarkStatus,
      limitations: diagnostics,
    }, null, 2))

    if (benchmarkStatus !== "passed") process.exitCode = 1
    return { status: String(receipt.status), evidencePath: resolve(evidenceRoot, "qualification.json") }
  } finally {
    if (evidenceWritten && prepared !== undefined) {
      await rm(prepared.buildRoot, { recursive: true, force: true })
      await rm(workRoot, { recursive: true, force: true })
    }
  }
}

if (import.meta.main) {
  qualify().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
