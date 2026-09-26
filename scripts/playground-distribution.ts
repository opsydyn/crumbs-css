import { createHash } from "node:crypto"
import { cp, mkdir, readFile, realpath, writeFile } from "node:fs/promises"
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
type PackageName = typeof packageNames[number]
type DistributionMode = "--artifacts-only" | "--prepare-only" | "--check"
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

async function qualifyConsumer(
  repositoryRoot: string,
  mode: DistributionMode,
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
  if (args.length !== 1 || !["--artifacts-only", "--prepare-only", "--check"].includes(args[0]!)) {
    throw new Error("Usage: bun run playground:distribution --artifacts-only|--prepare-only|--check")
  }
  const repositoryRoot = await realpath(resolve(import.meta.dir, ".."))
  await qualifyConsumer(repositoryRoot, args[0] as DistributionMode)
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
