import { createHash } from "node:crypto"
import { cp, lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises"
import { builtinModules } from "node:module"
import { tmpdir } from "node:os"
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path"
import {
  assertNoWorkspaceOrLinkDependencies,
  verifyExpoBundleInventory,
  verifyInstalledArtifact,
  verifySharedReactRuntime,
  type BundleInventory,
  type PackageIdentity,
  type PackageManifest,
} from "./packed-distribution-contract"
import { verifyPackedExportMap, type PackedExportResolution } from "./packed-export-contract"
import { auditPackedRuntimeEntrypoints, type PackedRuntimeGraph } from "./packed-runtime-graph"
import { verifyTreeShakingCanary, type MetroJavaScriptBundle } from "./metro-tree-shaking-contract"
import {
  buildPackedDistributionArtifacts,
  type PackedArtifact,
  type PackedDistributionArtifacts,
} from "./packed-distribution-build"

const packageNames = ["@opsydyn/crumbs-css", "@acme/design-tokens", "@acme/ui"] as const
const appTemplateName = "packages/css/fixtures/packed-distribution/app"
const evidenceRelativePath = "docs/evidence/2026-09-26-m8-1-packed-design-system/qualification.json"
const m8_2EvidenceRelativePath = "docs/evidence/2026-09-26-m8-2-compatibility-matrix/qualification.json"
const m8_3EvidenceRelativePath = "docs/evidence/2026-09-26-m8-3-runtime-resolution/qualification.json"
const m8_3Canary = "external-token-theme"
const m8_3RuntimeSurfaces = ["ordinary", "schema-decoder", "schema-positive-control"] as const
type PackageName = typeof packageNames[number]
type M8_3RuntimeSurface = typeof m8_3RuntimeSurfaces[number]
type DistributionMode = "--artifacts-only" | "--prepare-only" | "--check" | "--m8-2-check" | "--m8-3-check"
type LegacyDistributionMode = Exclude<DistributionMode, "--m8-2-check" | "--m8-3-check">
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
type GeneratedBundle = MetroJavaScriptBundle & Readonly<{sha256: string; bytes: number}>
type RuntimeSurfaceInventory = Readonly<{
  surface: M8_3RuntimeSurface
  bundles: ReadonlyArray<Readonly<{platform: "ios" | "web"; path: string; sha256: string; bytes: number}>>
  inventory: ReadonlyArray<Readonly<{
    platform: "ios" | "web"
    sourceMapFiles: ReadonlyArray<string>
    packageSources: Readonly<Record<string, ReadonlyArray<string>>>
  }>>
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
  crumbsReactPaths: ReadonlyArray<string>
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

async function findJavascriptBundleFiles(directory: string): Promise<ReadonlyArray<string>> {
  const files: Array<string> = []
  const visit = async (current: string): Promise<void> => {
    for (const entry of await readdir(current, {withFileTypes: true})) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile() && [".js", ".jsbundle"].includes(extname(entry.name).toLowerCase())) {
        files.push(path)
      }
    }
  }
  await visit(directory)
  return files.sort()
}

async function readJavascriptBundles(
  appRoot: string,
  platform: "ios" | "web",
  directory: string,
): Promise<ReadonlyArray<GeneratedBundle>> {
  const files = await findJavascriptBundleFiles(directory)
  if (files.length === 0) throw new Error("No generated " + platform + " JavaScript bundles found in " + directory)
  return Promise.all(files.map(async path => {
    const javascript = await readFile(path, "utf8")
    return {
      platform,
      path: relative(appRoot, path).split(sep).join("/"),
      javascript,
      sha256: sha256(Buffer.from(javascript, "utf8")),
      bytes: Buffer.byteLength(javascript),
    }
  }))
}

function toAppRelative(appRoot: string, path: string): string {
  const relativePath = relative(appRoot, path)
  if (isAbsolute(relativePath) || relativePath === ".." || relativePath.startsWith(".." + sep)) {
    throw new Error("Expected an Expo artifact within " + appRoot + ", received " + path)
  }
  return relativePath.split(sep).join("/")
}

function sourceMapReferences(value: unknown): ReadonlyArray<string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return []
  const record = value as Readonly<Record<string, unknown>>
  const references: Array<string> = []
  if (Array.isArray(record.sources)) {
    for (const source of record.sources) if (typeof source === "string") references.push(source)
  }
  if (Array.isArray(record.sections)) {
    for (const section of record.sections) {
      if (typeof section === "object" && section !== null && !Array.isArray(section)) {
        references.push(...sourceMapReferences((section as Readonly<Record<string, unknown>>).map))
      }
    }
  }
  return references
}

const builtinSourceNames = new Set(builtinModules.map(specifier => specifier.replace(/^node:/, "")))
const compilerSourcePattern = /(?:^|\/)node_modules\/(?:@vanilla-extract|css-to-react-native|metro|metro-transform-worker|typescript|tsdown)(?:\/|$)/i

async function assertM8_3SurfaceInventory(
  surface: M8_3RuntimeSurface,
  inventories: ReadonlyArray<BundleInventory>,
  appRoot: string,
  installedCrumbsRoot: string,
): Promise<ReadonlyArray<Readonly<{
  platform: "ios" | "web"
  sourceMapFiles: ReadonlyArray<string>
  packageSources: Readonly<Record<string, ReadonlyArray<string>>>
}>>> {
  const byPlatform = new Map(inventories.map(inventory => [inventory.platform, inventory]))
  const required = surface === "ordinary"
    ? ["dist/theme-core.mjs", "dist/tokens.mjs"]
    : [surface === "schema-decoder" ? "dist/tokens-schema-value.mjs" : "dist/tokens-schema.mjs"]
  const forbiddenCrumbsSource = surface === "ordinary"
    ? /(?:^|\/)(?:tokens-(?:schema(?:-value)?|optic)|(?:Struct|Schema)-[^/]+|transformer|metro-plugin|style|native-style[^/]*)|(?:^|\/)effect(?:\/|$)/i
    : /(?:^|\/)(?:transformer|metro-plugin|style|native-style[^/]*)(?:[.-]|$)/i
  const summarized: Array<Readonly<{
    platform: "ios" | "web"
    sourceMapFiles: ReadonlyArray<string>
    packageSources: Readonly<Record<string, ReadonlyArray<string>>>
  }>> = []

  for (const platform of ["ios", "web"] as const) {
    const inventory = byPlatform.get(platform)
    if (inventory === undefined) throw new Error("Missing " + platform + " source-map inventory for " + surface)
    const crumbsSources = inventory.packageSources["@opsydyn/crumbs-css"] ?? []
    if (crumbsSources.length === 0) {
      throw new Error("No " + platform + " source map includes installed Crumbs source for " + surface)
    }
    const relativeSources = crumbsSources.map(source => {
      const sourceRelative = relative(installedCrumbsRoot, source)
      if (isAbsolute(sourceRelative) || sourceRelative === ".." || sourceRelative.startsWith(".." + sep)) {
        throw new Error(surface + " source inventory escaped the installed Crumbs package: " + source)
      }
      return sourceRelative.split(sep).join("/")
    }).sort()
    for (const expected of required) {
      if (!relativeSources.some(source => source === expected || source.endsWith("/" + expected))) {
        throw new Error(surface + " " + platform + " inventory is missing packed Crumbs entry " + expected)
      }
    }
    if (surface === "schema-decoder" &&
        relativeSources.some(source => source === "dist/tokens-schema.mjs" || source.endsWith("/dist/tokens-schema.mjs"))) {
      throw new Error(surface + " " + platform + " inventory reached the combined tokens/schema entry")
    }
    for (const source of relativeSources) {
      if (forbiddenCrumbsSource.test(source)) {
        throw new Error(surface + " " + platform + " inventory includes a forbidden Crumbs source " + source)
      }
    }

    for (const sourceMapPath of inventory.sourceMapFiles) {
      const sourceMap = JSON.parse(await readFile(sourceMapPath, "utf8")) as unknown
      for (const rawSource of sourceMapReferences(sourceMap)) {
        const source = rawSource.replaceAll("\\", "/")
        const cleanSource = source.replace(/[?#].*$/, "")
        if (cleanSource.startsWith("node:") || builtinSourceNames.has(cleanSource) ||
            (cleanSource.startsWith("node_modules/") && builtinSourceNames.has(cleanSource.split("/")[1] ?? ""))) {
          throw new Error(surface + " " + platform + " source map includes a Node built-in source " + rawSource)
        }
        if (compilerSourcePattern.test(cleanSource)) {
          throw new Error(surface + " " + platform + " source map includes compiler source " + rawSource)
        }
        if (surface === "ordinary" &&
            (/(?:^|\/)node_modules\/effect(?:\/|$)/i.test(cleanSource) ||
              /(?:^|\/)effect\/dist\//i.test(cleanSource))) {
          throw new Error(surface + " " + platform + " source map includes Effect source " + rawSource)
        }
      }
    }

    summarized.push({
      platform,
      sourceMapFiles: inventory.sourceMapFiles.map(path => toAppRelative(appRoot, path)),
      packageSources: {
        "@opsydyn/crumbs-css": relativeSources.map(source => "node_modules/@opsydyn/crumbs-css/" + source),
      },
    })
  }
  return summarized
}

async function buildM8_3RuntimeSurface(
  prepared: Awaited<ReturnType<typeof preparePackedConsumer>>,
  repositoryRoot: string,
  surface: M8_3RuntimeSurface,
  buildRoot: string,
): Promise<Readonly<{
  surface: RuntimeSurfaceInventory
  javascriptBundles: ReadonlyArray<GeneratedBundle>
}>> {
  const appRoot = prepared.appRoot
  await writeFile(join(appRoot, "index.js"), [
    'import { registerRootComponent } from "expo"',
    'import Surface from "./src/runtime-surfaces/' + surface + '"',
    "registerRootComponent(Surface)",
    "",
  ].join("\n"))
  const env = {
    EXPO_NO_METRO_WORKSPACE_ROOT: "1",
    EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH: "1",
    EXPO_UNSTABLE_TREE_SHAKING: "1",
  }
  const expo = join(appRoot, "node_modules/.bin/expo")
  const platformDirectories = {} as Record<"ios" | "web", string>
  for (const platform of ["ios", "web"] as const) {
    const outputDirectory = join(appRoot, "dist", "m8-3", surface, platform)
    await mkdir(outputDirectory, {recursive: true})
    platformDirectories[platform] = outputDirectory
    await run(
      [expo, "export", "--platform", platform, "--source-maps", "--no-bytecode", "--output-dir", outputDirectory],
      appRoot,
      join(buildRoot, "logs/export-" + surface + "-" + platform + ".log"),
      env,
    )
  }

  const bundleSets = await Promise.all((["ios", "web"] as const).map(platform =>
    readJavascriptBundles(appRoot, platform, platformDirectories[platform])))
  const javascriptBundles = bundleSets.flat()
  const inventory = await verifyExpoBundleInventory(
    [
      {platform: "ios", directory: platformDirectories.ios},
      {platform: "web", directory: platformDirectories.web},
    ],
    appRoot,
    repositoryRoot,
    ["@opsydyn/crumbs-css"],
  )
  const crumbsRoot = prepared.installedPackages["@opsydyn/crumbs-css"].packageRoot
  const summarizedInventory = await assertM8_3SurfaceInventory(surface, inventory, appRoot, crumbsRoot)
  return {
    surface: {
      surface,
      bundles: javascriptBundles.map(({platform, path, sha256: digest, bytes}) => ({
        platform,
        path,
        sha256: digest,
        bytes,
      })),
      inventory: summarizedInventory,
    },
    javascriptBundles,
  }
}

async function qualifyM8_3Consumer(repositoryRoot: string): Promise<void> {
  const artifacts = await buildPackedDistributionArtifacts(repositoryRoot)
  const prepared = await preparePackedConsumer(repositoryRoot, artifacts)
  const crumbsPackageRoot = prepared.installedPackages["@opsydyn/crumbs-css"].packageRoot
  const exportResolutions: ReadonlyArray<PackedExportResolution> =
    await verifyPackedExportMap(crumbsPackageRoot, prepared.appRoot)
  const runtimeGraphs: ReadonlyArray<PackedRuntimeGraph> =
    await auditPackedRuntimeEntrypoints(crumbsPackageRoot)

  const tsc = join(prepared.appRoot, "node_modules/.bin/tsc")
  await run(
    [tsc, "--project", "tsconfig.json", "--noEmit"],
    prepared.appRoot,
    join(artifacts.buildRoot, "logs/typecheck-m8-3-consumer.log"),
    {EXPO_NO_METRO_WORKSPACE_ROOT: "1"},
  )

  const surfaceResults = new Map<M8_3RuntimeSurface, RuntimeSurfaceInventory>()
  const bundleResults = new Map<M8_3RuntimeSurface, ReadonlyArray<GeneratedBundle>>()
  for (const surface of m8_3RuntimeSurfaces) {
    const result = await buildM8_3RuntimeSurface(prepared, repositoryRoot, surface, artifacts.buildRoot)
    surfaceResults.set(surface, result.surface)
    bundleResults.set(surface, result.javascriptBundles)
  }

  for (const bundle of bundleResults.get("ordinary")!) {
    if (bundle.javascript.includes(m8_3Canary)) {
      throw new Error("Ordinary runtime bundle " + bundle.platform + " " + bundle.path + " retained " + m8_3Canary)
    }
  }
  const canary = verifyTreeShakingCanary(
    bundleResults.get("schema-decoder")!,
    bundleResults.get("schema-positive-control")!,
    m8_3Canary,
  )
  const directDependencyVersions = await installedDirectDependencyVersions(prepared.appRoot, prepared.installManifest)
  const npmVersion = await run(
    ["npm", "--version"],
    prepared.appRoot,
    join(artifacts.buildRoot, "logs/npm-version.log"),
  )
  const nodeVersion = await run(
    ["node", "--version"],
    prepared.appRoot,
    join(artifacts.buildRoot, "logs/node-version.log"),
  )
  const source = await sourceRevision(repositoryRoot, artifacts.buildRoot)
  const sourceSurfaces = Object.fromEntries(
    [...surfaceResults.entries()].map(([surface, result]) => [surface, result]),
  )
  const qualification = {
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    source,
    app: {
      name: prepared.sourceManifest.name,
      version: prepared.sourceManifest.version,
      declaredDependencyRanges: prepared.sourceManifest.dependencies,
      resolvedDependencyVersions: directDependencyVersions,
      packageLockSha256: sha256(await readFile(join(prepared.appRoot, "package-lock.json"))),
    },
    crumbsArtifact: {
      name: artifacts.crumbs.name,
      version: artifacts.crumbs.version,
      tarballSha256: artifacts.crumbs.sha256,
      exportResolutions,
      runtimeGraphs,
    },
    toolchain: {node: nodeVersion, bun: Bun.version, npm: npmVersion},
    treeShaking: {
      mode: "Expo production export",
      environment: {
        EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH: "1",
        EXPO_UNSTABLE_TREE_SHAKING: "1",
      },
      hermesBytecode: "disabled for JavaScript inspection",
      platforms: ["ios", "web"],
      surfaces: sourceSurfaces,
      canary: {
        literal: m8_3Canary,
        ordinary: "omitted",
        decoder: canary.decoder,
        positiveControl: canary.positiveControl,
      },
    },
    results: {
      packedExports: "passed",
      packedRuntimeGraphs: "passed",
      consumerTypecheck: "passed",
      productionExports: {ios: "passed", web: "passed", android: "not-run"},
      pairedTreeShakingCanary: "passed",
    },
    limitations: [
      "This qualification covers packed ESM/CommonJS resolution and production Metro JavaScript/source-map inventories for the exact recorded package and Expo versions.",
      "The iOS export is a bundle qualification, not iOS device acceptance; Android export and all physical-device acceptance remain deferred.",
      "Publishing and consumer behavior outside the recorded Node, Expo, React Native and React versions are not qualified by this receipt.",
    ],
  }
  const receiptPath = source.dirty
    ? join(artifacts.buildRoot, "m8-3-interim-qualification.json")
    : join(repositoryRoot, m8_3EvidenceRelativePath)
  if (!source.dirty) await mkdir(dirname(receiptPath), {recursive: true})
  await writeFile(receiptPath, JSON.stringify(qualification, null, 2) + "\n")
  console.log(JSON.stringify({
    mode: "qualified-m8.3",
    buildRoot: artifacts.buildRoot,
    consumerRoot: prepared.appRoot,
    qualification: receiptPath,
    source,
    packageHash: artifacts.crumbs.sha256,
    exportTargetCount: exportResolutions.length,
    runtimeGraphCount: runtimeGraphs.length,
    treeShaking: qualification.treeShaking,
    results: qualification.results,
  }, null, 2))
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
  const sharedReactPath = await verifySharedReactRuntime(directCrumbsPackageRoot, nestedCrumbsPath)
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
      !Array.isArray(runtimeProbe.crumbsReactPaths) ||
      runtimeProbe.crumbsReactPaths.length !== 2 ||
      runtimeProbe.crumbsReactPaths[0] !== sharedReactPath ||
      runtimeProbe.crumbsReactPaths[1] !== sharedReactPath ||
      runtimeProbe.sharedReact !== sharedReactPath ||
      JSON.stringify(runtimeProbe.lazyThemeValues) !== JSON.stringify(["#2457d6", "#c42f73"]) ||
      JSON.stringify(runtimeProbe.rejectedFutureVersions) !== JSON.stringify(expectedFutureVersions) ||
      runtimeProbe.rejectedIdentityShapeCollision !== true) {
    throw new Error(`M8.2 runtime probe result did not match the qualified contract: ${runtimeProbeOutput}`)
  }
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
  if (args.length !== 1 || !["--artifacts-only", "--prepare-only", "--check", "--m8-2-check", "--m8-3-check"].includes(args[0]!)) {
    throw new Error("Usage: bun run playground:distribution --artifacts-only|--prepare-only|--check|--m8-2-check|--m8-3-check")
  }
  const repositoryRoot = await realpath(resolve(import.meta.dir, ".."))
  if (args[0] === "--m8-2-check") {
    await qualifyM8_2Consumer(repositoryRoot)
  } else if (args[0] === "--m8-3-check") {
    await qualifyM8_3Consumer(repositoryRoot)
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
