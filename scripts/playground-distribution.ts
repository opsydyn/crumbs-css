import { createHash } from "node:crypto"
import { cp, lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import {
  assertNoWorkspaceOrLinkDependencies,
  verifyExpoBundleInventory,
  verifyInstalledArtifact,
  type PackageIdentity,
  type PackageManifest,
} from "./packed-distribution-contract"
import {
  buildPackedDistributionArtifacts,
  type PackedArtifact,
  type PackedDistributionArtifacts,
} from "./packed-distribution-build"

const packageNames = ["@opsydyn/crumbs-css", "@acme/design-tokens", "@acme/ui"] as const
const appTemplateName = "packages/css/fixtures/packed-distribution/app"
const evidenceRelativePath = "docs/evidence/2026-09-26-m8-1-packed-design-system/qualification.json"
const m8_2EvidenceRelativePath = "docs/evidence/2026-09-26-m8-2-compatibility-matrix/qualification.json"
type PackageName = typeof packageNames[number]
type DistributionMode = "--artifacts-only" | "--prepare-only" | "--check" | "--m8-2-check"
type LegacyDistributionMode = Exclude<DistributionMode, "--m8-2-check">
type AppManifest = PackageIdentity & PackageManifest & Readonly<{
  dependencies: Readonly<Record<string, string>>
  devDependencies?: Readonly<Record<string, string>>
  [key: string]: unknown
}>
type InstalledArtifact = Readonly<{
  name: string
  version: string
  packageRoot: string
  entryPath: string
}>

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

async function run(
  command: ReadonlyArray<string>,
  cwd: string,
  logPath: string,
  env: Readonly<Record<string, string>> = {},
): Promise<string> {
  await mkdir(dirname(logPath), { recursive: true })
  const child = Bun.spawn([...command], {
    cwd,
    env: {
      ...process.env,
      ...env,
      CI: "1",
      npm_config_audit: "false",
      npm_config_fund: "false",
    },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n")
  await writeFile(logPath, `${output}\n`)
  if (exitCode !== 0) {
    throw new Error(
      `$ ${command.join(" ")} (exit ${exitCode}) in ${cwd}; output retained at ${logPath}\n${output}`,
    )
  }
  return stdout.trim()
}

async function readManifest(packageRoot: string): Promise<AppManifest> {
  return JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as AppManifest
}

async function writeManifest(packageRoot: string, manifest: AppManifest): Promise<void> {
  await writeFile(join(packageRoot, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`)
}

function artifactMap(artifacts: PackedDistributionArtifacts): Readonly<Record<PackageName, PackedArtifact>> {
  return {
    "@opsydyn/crumbs-css": artifacts.crumbs,
    "@acme/design-tokens": artifacts.tokens,
    "@acme/ui": artifacts.ui,
  }
}

async function preparePackedConsumer(
  repositoryRoot: string,
  artifacts: PackedDistributionArtifacts,
): Promise<Readonly<{
  appRoot: string
  sourceManifest: AppManifest
  installManifest: AppManifest
  installedPackages: Readonly<Record<PackageName, InstalledArtifact>>
}>> {
  const appRoot = join(artifacts.buildRoot, "consumer")
  await mkdir(appRoot, { recursive: true })
  await cp(join(repositoryRoot, appTemplateName), appRoot, { recursive: true })

  const sourceManifest = await readManifest(appRoot)
  assertNoWorkspaceOrLinkDependencies(sourceManifest)
  const dependencies: Record<string, string> = { ...sourceManifest.dependencies }
  for (const packageName of packageNames) {
    if (dependencies[packageName] === undefined) {
      throw new Error(`Packed Expo fixture must declare ${packageName} before artifact substitution`)
    }
    dependencies[packageName] = `file:${artifactMap(artifacts)[packageName].tarball}`
  }
  const installManifest: AppManifest = { ...sourceManifest, dependencies }
  assertNoWorkspaceOrLinkDependencies(installManifest)
  await writeManifest(appRoot, installManifest)

  const npmCache = join(artifacts.buildRoot, "npm-cache")
  await run(
    ["npm", "install", "--no-audit", "--no-fund", "--package-lock=true"],
    appRoot,
    join(artifacts.buildRoot, "logs/install-consumer.log"),
    {
      EXPO_NO_METRO_WORKSPACE_ROOT: "1",
      npm_config_cache: npmCache,
      npm_config_fetch_retries: "1",
      npm_config_fetch_timeout: "30000",
    },
  )

  const installedPackages = {} as Record<PackageName, InstalledArtifact>
  for (const packageName of packageNames) {
    const artifact = artifactMap(artifacts)[packageName]
    const installed = await verifyInstalledArtifact(appRoot, artifact)
    const manifest = await readManifest(installed.packageRoot)
    assertNoWorkspaceOrLinkDependencies(manifest)
    installedPackages[packageName] = {
      name: installed.name,
      version: installed.version,
      packageRoot: installed.packageRoot,
      entryPath: installed.entryPath,
    }
  }

  return { appRoot: await realpath(appRoot), sourceManifest, installManifest, installedPackages }
}

async function ensureRegularChildDirectory(parent: string, name: string): Promise<string> {
  const directory = join(parent, name)
  try {
    await mkdir(directory)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
  }
  const info = await lstat(directory)
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new Error(`Expected a regular nested package directory at ${directory}`)
  }
  const canonicalDirectory = await realpath(directory)
  if (canonicalDirectory !== directory) {
    throw new Error(`Nested package directory resolves through a link: ${directory} -> ${canonicalDirectory}`)
  }
  return directory
}

async function installNestedCrumbsArtifact(
  uiPackageRoot: string,
  crumbsArtifact: PackedArtifact,
  buildRoot: string,
): Promise<string> {
  const uiNodeModules = await ensureRegularChildDirectory(uiPackageRoot, "node_modules")
  const scopedNodeModules = await ensureRegularChildDirectory(uiNodeModules, "@opsydyn")
  const nestedPackageRoot = join(scopedNodeModules, "crumbs-css")
  try {
    await lstat(nestedPackageRoot)
    throw new Error(`Nested Crumbs package path already exists: ${nestedPackageRoot}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  await mkdir(nestedPackageRoot)
  await run(
    ["tar", "-xzf", crumbsArtifact.tarball, "--strip-components=1", "-C", nestedPackageRoot],
    uiPackageRoot,
    join(buildRoot, "logs/install-nested-crumbs.log"),
  )
  const canonicalPackageRoot = await realpath(nestedPackageRoot)
  if (canonicalPackageRoot !== nestedPackageRoot) {
    throw new Error(`Nested Crumbs package resolves through a link: ${nestedPackageRoot} -> ${canonicalPackageRoot}`)
  }
  return canonicalPackageRoot
}

async function installedDirectDependencyVersions(
  appRoot: string,
  manifest: AppManifest,
): Promise<Readonly<Record<string, string>>> {
  const nodeModulesRoot = await realpath(join(appRoot, "node_modules"))
  const names = [...new Set([
    ...Object.keys(manifest.dependencies),
    ...Object.keys(manifest.devDependencies ?? {}),
  ])].sort()
  const versions: Record<string, string> = {}
  for (const name of names) {
    const packageRoot = await realpath(join(nodeModulesRoot, ...name.split("/")))
    const installedManifest = await readManifest(packageRoot)
    if (installedManifest.name !== name) {
      throw new Error(`Direct dependency ${name} resolved to mismatched package ${installedManifest.name} at ${packageRoot}`)
    }
    versions[name] = installedManifest.version
  }
  return versions
}

async function sourceRevision(repositoryRoot: string, logRoot: string): Promise<Readonly<{
  revision: string
  dirty: boolean
}>> {
  const revision = await run(
    ["git", "rev-parse", "HEAD"],
    repositoryRoot,
    join(logRoot, "source-revision.log"),
  )
  const changes = await run(
    ["git", "status", "--porcelain", "--untracked-files=all"],
    repositoryRoot,
    join(logRoot, "source-status.log"),
  )
  return { revision, dirty: changes.length > 0 }
}

type RuntimeProbeResult = Readonly<{
  status: "passed"
  crumbsCopies: ReadonlyArray<string>
  sharedReact: string
  lazyThemeValues: ReadonlyArray<string>
  rejectedFutureVersions: ReadonlyArray<string>
  rejectedIdentityShapeCollision: true
}>

async function inspectNativeModuleMetadata(uiPackageRoot: string): Promise<Readonly<{
  path: string
  version: number
  dependencyPlanVersion: number
}>> {
  const path = join(uiPackageRoot, "dist", "ActionCard.styles.native.js")
  const source = await readFile(path, "utf8")
  const metadataLine = source.split(/\r?\n/).find(line => line.startsWith("export const __crumbsModule ="))
  if (metadataLine === undefined) {
    throw new Error(`Packed native style output is missing __crumbsModule metadata: ${path}`)
  }
  const metadataVersion = metadataLine.match(/\$\$type:"crumbs\.css\.native-module",version:(\d+)/)?.[1]
  const dependencyPlanVersion = metadataLine.match(/\$\$type:"crumbs\.css\.theme-dependency-plan",version:(\d+)/)?.[1]
  if (metadataVersion !== "2" || dependencyPlanVersion !== "1") {
    throw new Error(
      `Expected packed native metadata v2 with dependency plan v1 at ${path}; found metadata v${String(metadataVersion)} and dependency plan v${String(dependencyPlanVersion)}`,
    )
  }
  return {path, version: Number(metadataVersion), dependencyPlanVersion: Number(dependencyPlanVersion)}
}

async function qualifyM8_2Consumer(repositoryRoot: string): Promise<void> {
  const artifacts = await buildPackedDistributionArtifacts(repositoryRoot)
  const prepared = await preparePackedConsumer(repositoryRoot, artifacts)
  const uiPackageRoot = prepared.installedPackages["@acme/ui"].packageRoot
  const nestedCrumbsPath = await installNestedCrumbsArtifact(
    uiPackageRoot,
    artifacts.crumbs,
    artifacts.buildRoot,
  )
  const directCrumbsPackageRoot = prepared.installedPackages["@opsydyn/crumbs-css"].packageRoot
  const nestedCrumbsManifest = await readManifest(nestedCrumbsPath)
  if (nestedCrumbsManifest.name !== artifacts.crumbs.name || nestedCrumbsManifest.version !== artifacts.crumbs.version) {
    throw new Error(
      `Nested Crumbs artifact identity mismatch: expected ${artifacts.crumbs.name}@${artifacts.crumbs.version}, found ${String(nestedCrumbsManifest.name)}@${String(nestedCrumbsManifest.version)} at ${nestedCrumbsPath}`,
    )
  }

  const env = {EXPO_NO_METRO_WORKSPACE_ROOT: "1"}
  const runtimeProbeOutput = await run(
    ["node", "verify-m8-2-compatibility.mjs"],
    prepared.appRoot,
    join(artifacts.buildRoot, "logs/runtime-compatibility-probe.log"),
    env,
  )
  let runtimeProbe: RuntimeProbeResult
  try {
    runtimeProbe = JSON.parse(runtimeProbeOutput.split(/\r?\n/).at(-1) ?? "") as RuntimeProbeResult
  } catch (error) {
    throw new Error(`Could not read the M8.2 runtime probe result: ${runtimeProbeOutput}`, {cause: error})
  }
  const expectedFutureVersions = [
    "recipe:4",
    "extension:2",
    "sprinkles:2",
    "theme-dependency-plan:2",
    "external-token-theme:2",
  ]
  if (runtimeProbe.status !== "passed" ||
      !Array.isArray(runtimeProbe.crumbsCopies) ||
      runtimeProbe.crumbsCopies.length !== 2 ||
      runtimeProbe.crumbsCopies[0] !== directCrumbsPackageRoot ||
      runtimeProbe.crumbsCopies[1] !== nestedCrumbsPath ||
      typeof runtimeProbe.sharedReact !== "string" ||
      JSON.stringify(runtimeProbe.lazyThemeValues) !== JSON.stringify(["#2457d6", "#c42f73"]) ||
      JSON.stringify(runtimeProbe.rejectedFutureVersions) !== JSON.stringify(expectedFutureVersions) ||
      runtimeProbe.rejectedIdentityShapeCollision !== true) {
    throw new Error(`M8.2 runtime probe result did not match the qualified contract: ${runtimeProbeOutput}`)
  }
  const sharedReactPath = runtimeProbe.sharedReact
  const nativeModuleMetadata = await inspectNativeModuleMetadata(uiPackageRoot)

  const tsc = join(prepared.appRoot, "node_modules/.bin/tsc")
  await run(
    [tsc, "--project", "tsconfig.json", "--noEmit"],
    prepared.appRoot,
    join(artifacts.buildRoot, "logs/typecheck-consumer.log"),
    env,
  )

  const expo = join(prepared.appRoot, "node_modules/.bin/expo")
  for (const platform of ["ios", "web"] as const) {
    const outputDirectory = join(prepared.appRoot, "dist", platform)
    await mkdir(outputDirectory, {recursive: true})
    await run(
      [expo, "export", "--platform", platform, "--source-maps", "--output-dir", outputDirectory],
      prepared.appRoot,
      join(artifacts.buildRoot, `logs/export-${platform}.log`),
      env,
    )
  }

  const bundleInventory = await verifyExpoBundleInventory(
    [
      {platform: "ios", directory: join(prepared.appRoot, "dist", "ios")},
      {platform: "web", directory: join(prepared.appRoot, "dist", "web")},
    ],
    prepared.appRoot,
    repositoryRoot,
    packageNames,
  )
  const lockfilePath = join(prepared.appRoot, "package-lock.json")
  const lockfileSha256 = sha256(await readFile(lockfilePath))
  const dependencyVersions = await installedDirectDependencyVersions(prepared.appRoot, prepared.installManifest)
  const source = await sourceRevision(repositoryRoot, artifacts.buildRoot)
  const nodeVersion = await run(
    ["node", "--version"],
    prepared.appRoot,
    join(artifacts.buildRoot, "logs/node-version.log"),
  )
  const npmVersion = await run(
    ["npm", "--version"],
    prepared.appRoot,
    join(artifacts.buildRoot, "logs/npm-version.log"),
  )
  const receipt = {
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    source,
    app: {
      name: prepared.sourceManifest.name,
      version: prepared.sourceManifest.version,
      root: prepared.appRoot,
      declaredDependencyRanges: prepared.sourceManifest.dependencies,
      resolvedDependencyVersions: dependencyVersions,
      packageLock: {path: lockfilePath, sha256: lockfileSha256},
    },
    artifacts: Object.fromEntries(
      Object.entries(artifactMap(artifacts)).map(([name, artifact]) => [name, artifact]),
    ),
    installedPackages: prepared.installedPackages,
    compatibility: {
      compilerRuntime: {name: artifacts.crumbs.name, version: artifacts.crumbs.version},
      consumerPackages: {
        tokens: {name: artifacts.tokens.name, version: artifacts.tokens.version},
        components: {name: artifacts.ui.name, version: artifacts.ui.version},
      },
      host: {
        expo: dependencyVersions.expo,
        react: dependencyVersions.react,
        reactNative: dependencyVersions["react-native"],
      },
      artifactFormats: {
        componentRecipes: [1, 2, 3],
        componentRecipeExtensions: [1],
        sprinklesLookupPlans: [1],
        nativeModuleMetadata: 2,
        themeDependencyPlans: [1],
        externalTokenThemes: [1],
      },
    },
    runtime: {
      crumbsCopies: {
        directPackageRoot: directCrumbsPackageRoot,
        nestedPackageRoot: nestedCrumbsPath,
        sharedTarballSha256: artifacts.crumbs.sha256,
      },
      react: {version: dependencyVersions.react, realPath: sharedReactPath},
      lazyThemeProbe: runtimeProbe,
      compilerMetadata: nativeModuleMetadata,
    },
    toolchain: {node: nodeVersion, bun: Bun.version, npm: npmVersion},
    results: {
      packageArtifacts: "passed",
      isolatedInstall: "passed",
      distinctCrumbsCopies: "passed",
      singleReactRuntime: "passed",
      lazyThemeProbe: "passed",
      futureProtocolVersions: "rejected",
      identityShapeCollision: "rejected",
      compilerMetadata: "passed",
      appTypecheck: "passed",
      expoExports: {ios: "passed", web: "passed", android: "not-run"},
      bundleInventory: "passed",
    },
    bundleInventory,
    diagnostics: {
      nestedInstall: join(artifacts.buildRoot, "logs/install-nested-crumbs.log"),
      runtimeProbe: join(artifacts.buildRoot, "logs/runtime-compatibility-probe.log"),
      appTypecheck: join(artifacts.buildRoot, "logs/typecheck-consumer.log"),
      iosExport: join(artifacts.buildRoot, "logs/export-ios.log"),
      webExport: join(artifacts.buildRoot, "logs/export-web.log"),
    },
    limitations: [
      "This qualification proves one exact packed Crumbs compiler/runtime artifact pair with the recorded consumer package and host versions.",
      "Duplicate-copy compatibility applies only to matching identified contracts, one JavaScript realm, and the single recorded React peer instance.",
      "It does not prove native device rendering, native startup, accessibility, Android export, or device performance.",
      "NativeArtifact v1 and Native IR v1 remain internal compiler contracts and are not published package compatibility claims.",
    ],
  }
  const evidencePath = join(repositoryRoot, m8_2EvidenceRelativePath)
  await mkdir(dirname(evidencePath), {recursive: true})
  await writeFile(evidencePath, `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(JSON.stringify({
    mode: "qualified-m8.2",
    buildRoot: artifacts.buildRoot,
    consumerRoot: prepared.appRoot,
    qualification: evidencePath,
    runtime: receipt.runtime,
    bundleInventory,
  }, null, 2))
}

async function qualifyConsumer(
  repositoryRoot: string,
  mode: LegacyDistributionMode,
): Promise<void> {
  const artifacts = await buildPackedDistributionArtifacts(repositoryRoot)
  if (mode === "--artifacts-only") {
    console.log(JSON.stringify(artifacts, null, 2))
    return
  }

  const prepared = await preparePackedConsumer(repositoryRoot, artifacts)
  const summary: Record<string, unknown> = {
    mode: mode === "--prepare-only" ? "prepared" : "qualified",
    buildRoot: artifacts.buildRoot,
    artifactsDirectory: join(artifacts.buildRoot, "artifacts"),
    consumerRoot: prepared.appRoot,
    artifacts: artifactMap(artifacts),
    installedPackages: prepared.installedPackages,
  }

  if (mode === "--prepare-only") {
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  const env = { EXPO_NO_METRO_WORKSPACE_ROOT: "1" }
  const tsc = join(prepared.appRoot, "node_modules/.bin/tsc")
  await run(
    [tsc, "--project", "tsconfig.json", "--noEmit"],
    prepared.appRoot,
    join(artifacts.buildRoot, "logs/typecheck-consumer.log"),
    env,
  )

  const expo = join(prepared.appRoot, "node_modules/.bin/expo")
  for (const platform of ["ios", "web"] as const) {
    const outputDirectory = join(prepared.appRoot, "dist", platform)
    await mkdir(outputDirectory, { recursive: true })
    await run(
      [expo, "export", "--platform", platform, "--source-maps", "--output-dir", outputDirectory],
      prepared.appRoot,
      join(artifacts.buildRoot, `logs/export-${platform}.log`),
      env,
    )
  }

  const bundleInventory = await verifyExpoBundleInventory(
    [
      { platform: "ios", directory: join(prepared.appRoot, "dist", "ios") },
      { platform: "web", directory: join(prepared.appRoot, "dist", "web") },
    ],
    prepared.appRoot,
    repositoryRoot,
    packageNames,
  )
  const lockfilePath = join(prepared.appRoot, "package-lock.json")
  const lockfileSha256 = sha256(await readFile(lockfilePath))
  const dependencyVersions = await installedDirectDependencyVersions(prepared.appRoot, prepared.installManifest)
  const source = await sourceRevision(repositoryRoot, artifacts.buildRoot)
  const npmVersion = await run(
    ["npm", "--version"],
    prepared.appRoot,
    join(artifacts.buildRoot, "logs/npm-version.log"),
  )
  const receipt = {
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    source,
    app: {
      name: prepared.sourceManifest.name,
      version: prepared.sourceManifest.version,
      root: prepared.appRoot,
      declaredDependencyRanges: prepared.sourceManifest.dependencies,
      resolvedDependencyVersions: dependencyVersions,
      packageLock: { path: lockfilePath, sha256: lockfileSha256 },
    },
    artifacts: Object.fromEntries(
      Object.entries(artifactMap(artifacts)).map(([name, artifact]) => [name, artifact]),
    ),
    installedPackages: prepared.installedPackages,
    toolchain: { node: process.version, bun: Bun.version, npm: npmVersion },
    results: {
      packageArtifacts: "passed",
      isolatedInstall: "passed",
      appTypecheck: "passed",
      expoExports: { ios: "passed", web: "passed", android: "not-run" },
      bundleInventory: "passed",
    },
    bundleInventory,
    limitations: [
      "This qualification proves packed artifact installation, TypeScript compatibility, and iOS/web JavaScript bundle provenance on the recorded host.",
      "It does not prove native device rendering, native startup, accessibility, Android export, or device performance.",
    ],
  }
  const evidencePath = join(repositoryRoot, evidenceRelativePath)
  await mkdir(dirname(evidencePath), { recursive: true })
  await writeFile(evidencePath, `${JSON.stringify(receipt, null, 2)}\n`)
  summary.mode = "qualified"
  summary.qualification = evidencePath
  summary.bundleInventory = bundleInventory
  console.log(JSON.stringify(summary, null, 2))
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length !== 1 || !["--artifacts-only", "--prepare-only", "--check", "--m8-2-check"].includes(args[0]!)) {
    throw new Error("Usage: bun run playground:distribution --artifacts-only|--prepare-only|--check|--m8-2-check")
  }
  const repositoryRoot = await realpath(resolve(import.meta.dir, ".."))
  if (args[0] === "--m8-2-check") {
    await qualifyM8_2Consumer(repositoryRoot)
  } else {
    await qualifyConsumer(repositoryRoot, args[0] as LegacyDistributionMode)
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
