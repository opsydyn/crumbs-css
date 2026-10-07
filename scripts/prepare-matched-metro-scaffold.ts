import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import {
  cpSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { resolveExpoMetroVersion } from "../packages/css/bench/metro-incremental"

export const matchedMetroBaselineRevision = "43c5ece39360cf321fdb074d82cee41d5daaba23" as const

export type PrepareMatchedMetroScaffoldOptions = Readonly<{
  baselineRoot: string
  baselineRevision: typeof matchedMetroBaselineRevision
  sourceRoot: string
  outputRoot: string
}>
export type MatchedMetroScaffold = Readonly<{
  appRoot: string
  fixtureHashes: readonly Readonly<{ path: string; sha256: string }>[]
  resolvedVersions: Readonly<Record<string, string>>
}>

const fixturePaths = [
  "apps/playground/src/incremental-entry.ts",
  "apps/playground/src/incremental.css.ts",
  "apps/playground/src/incremental-token.ts",
  "apps/playground/src/incremental-base.css.ts",
  "packages/css/fixtures/m2-7-workspace-token.ts",
] as const
const expectedVersions: Readonly<Record<string, string>> = {
  expo: "56.0.4",
  metro: "0.84.4",
  reactNative: "0.85.3",
  expoMetroRuntime: "56.0.12",
  react: "19.2.5",
  reactDom: "19.2.5",
  babelPresetExpo: "56.0.12",
  vanillaExtractCss: "1.20.1",
}

function readPackageManifest(path: string): Record<string, any> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, any>
}

function resolvePackageVersion(appRoot: string, packageName: string): string {
  const requireFromApp = createRequire(join(appRoot, "package.json"))
  let manifestPath: string | undefined
  try {
    manifestPath = requireFromApp.resolve(`${packageName}/package.json`)
  } catch {
    let directory = dirname(requireFromApp.resolve(packageName))
    while (true) {
      const candidate = join(directory, "package.json")
      if (existsSync(candidate)) {
        const manifest = readPackageManifest(candidate)
        if (manifest.name === packageName && typeof manifest.version === "string") {
          manifestPath = candidate
          break
        }
      }
      const parent = dirname(directory)
      if (parent === directory) break
      directory = parent
    }
  }
  if (!manifestPath) throw Error(`Could not resolve installed package version for ${packageName}`)
  const version = readPackageManifest(manifestPath).version
  if (typeof version !== "string") throw Error(`Installed package ${packageName} has no version`)
  return version
}

function linkDependency(source: string, destination: string): void {
  if (lstatSync(source).isSymbolicLink()) {
    const resolved = realpathSync(source)
    symlinkSync(resolved, destination, statSync(resolved).isDirectory() ? "dir" : "file")
    return
  }
  if (lstatSync(source).isDirectory()) {
    symlinkSync(realpathSync(source), destination, "dir")
    return
  }
  copyFileSync(source, destination)
}

function prepareAppNodeModules(source: string, destination: string, currentPackageRoot: string): void {
  if (!existsSync(source)) throw Error(`Baseline Playground dependencies are missing: ${source}`)
  mkdirSync(destination, { recursive: true })

  for (const entry of readdirSync(source)) {
    const sourceEntry = join(source, entry)
    const destinationEntry = join(destination, entry)
    if (entry === "@opsydyn" && lstatSync(sourceEntry).isDirectory()) {
      mkdirSync(destinationEntry, { recursive: true })
      for (const scopedEntry of readdirSync(sourceEntry)) {
        if (scopedEntry === "crumbs-css") continue
        linkDependency(join(sourceEntry, scopedEntry), join(destinationEntry, scopedEntry))
      }
      continue
    }
    linkDependency(sourceEntry, destinationEntry)
  }

  const scopeRoot = join(destination, "@opsydyn")
  mkdirSync(scopeRoot, { recursive: true })
  const crumbsLink = join(scopeRoot, "crumbs-css")
  if (existsSync(crumbsLink) || lstatMaybe(crumbsLink)) rmSync(crumbsLink, { recursive: true, force: true })
  symlinkSync(relative(scopeRoot, currentPackageRoot), crumbsLink, "dir")
}

function lstatMaybe(path: string): boolean {
  try { lstatSync(path); return true } catch { return false }
}

function installedVersions(appRoot: string, appManifest: Record<string, any>): Readonly<Record<string, string>> {
  const dependencies = { ...appManifest.dependencies, ...appManifest.devDependencies }
  if (typeof dependencies["@vanilla-extract/css"] !== "string") {
    throw Error("The matched baseline app must declare @vanilla-extract/css as a direct dependency")
  }

  return {
    expo: resolvePackageVersion(appRoot, "expo"),
    metro: resolveExpoMetroVersion(appRoot),
    reactNative: resolvePackageVersion(appRoot, "react-native"),
    expoMetroRuntime: resolvePackageVersion(appRoot, "@expo/metro-runtime"),
    react: resolvePackageVersion(appRoot, "react"),
    reactDom: resolvePackageVersion(appRoot, "react-dom"),
    babelPresetExpo: resolvePackageVersion(appRoot, "babel-preset-expo"),
    vanillaExtractCss: resolvePackageVersion(appRoot, "@vanilla-extract/css"),
  }
}

function verifyVersions(versions: Readonly<Record<string, string>>): void {
  const mismatches = Object.entries(expectedVersions)
    .filter(([name, expected]) => versions[name] !== expected)
    .map(([name, expected]) => `${name} must resolve to ${expected}; received ${versions[name] ?? "missing"}`)
  if (mismatches.length > 0) throw Error(`Matched Metro package versions differ:\n${mismatches.join("\n")}`)
}

export async function prepareMatchedMetroScaffold(
  options: PrepareMatchedMetroScaffoldOptions,
): Promise<MatchedMetroScaffold> {
  const baselineRoot = resolve(options.baselineRoot)
  const sourceRoot = resolve(options.sourceRoot)
  const outputRoot = resolve(options.outputRoot)
  if (options.baselineRevision !== matchedMetroBaselineRevision) {
    throw Error(`Approved baseline revision must be ${matchedMetroBaselineRevision}`)
  }
  if (baselineRoot === sourceRoot || baselineRoot === outputRoot || sourceRoot === outputRoot) {
    throw Error("Baseline, source, and output roots must be separate directories")
  }
  if (existsSync(outputRoot)) throw Error(`Scaffold output already exists: ${outputRoot}`)

  const checkedOutRevision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: baselineRoot,
    encoding: "utf8",
  }).trim()
  if (checkedOutRevision !== options.baselineRevision) {
    throw Error(`Matched Metro baseline revision must be ${options.baselineRevision}; received ${checkedOutRevision}`)
  }

  const baselineLock = join(baselineRoot, "bun.lock")
  const baselineManifest = join(baselineRoot, "package.json")
  const baselineAppRoot = join(baselineRoot, "apps/playground")
  const baselinePackageRoot = join(baselineRoot, "packages/css")
  const sourceAppRoot = join(sourceRoot, "apps/playground")
  const sourcePackageRoot = join(sourceRoot, "packages/css")
  const baselineAppManifestPath = join(baselineAppRoot, "package.json")
  const sourceAppManifestPath = join(sourceAppRoot, "package.json")
  const sourcePackageManifestPath = join(sourcePackageRoot, "package.json")
  const sourceMetroConfigPath = join(sourceAppRoot, "metro.config.js")
  const baselineNodeModules = join(baselineRoot, "node_modules")
  const baselinePackageNodeModules = join(baselinePackageRoot, "node_modules")
  const sourceDist = join(sourcePackageRoot, "dist")
  const currentPackageRoot = join(outputRoot, "packages/css")
  const appRoot = join(outputRoot, "apps/playground")

  for (const path of [
    baselineLock,
    baselineManifest,
    baselineAppManifestPath,
    sourceAppManifestPath,
    join(baselinePackageRoot, "tsdown.config.ts"),
    sourcePackageManifestPath,
    sourceMetroConfigPath,
    sourceDist,
    baselineNodeModules,
    baselinePackageNodeModules,
    ...fixturePaths.map(path => join(sourceRoot, path)),
  ]) {
    if (!existsSync(path)) throw Error(`Matched Metro scaffold input is missing: ${path}`)
  }
  if (readdirSync(sourceDist).length === 0) throw Error("Current package dist must contain built artifacts")

  const sourceAppManifest = readPackageManifest(sourceAppManifestPath)
  const sourceVanillaExtract = sourceAppManifest.dependencies?.["@vanilla-extract/css"] ??
    sourceAppManifest.devDependencies?.["@vanilla-extract/css"]
  if (typeof sourceVanillaExtract !== "string" || !/^\^?~?1\.20\.1$/u.test(sourceVanillaExtract)) {
    throw Error(`The current source app @vanilla-extract/css range must resolve to 1.20.1; received ${sourceVanillaExtract ?? "missing"}`)
  }

  try {
    mkdirSync(outputRoot, { recursive: true })
    cpSync(baselineManifest, join(outputRoot, "package.json"))
    cpSync(baselineLock, join(outputRoot, "bun.lock"))
    cpSync(baselineAppRoot, appRoot, {
      recursive: true,
      filter: source => {
        const path = relative(baselineAppRoot, source)
        const segments = path.split(sep)
        return path === "" || !segments.some(segment => segment === "node_modules" || segment === "ios" || segment === "android")
      },
    })
    // The approved baseline lock supplies Vanilla Extract 1.20.1 transitively,
    // but its Playground manifest lacks the direct resolver edge used by the
    // retained matched-Metro measurement. Mirror only that current-source edge
    // in the disposable app; keep every baseline consumer version unchanged.
    const scaffoldAppManifestPath = join(appRoot, "package.json")
    const scaffoldAppManifest = readPackageManifest(scaffoldAppManifestPath)
    scaffoldAppManifest.dependencies ??= {}
    scaffoldAppManifest.dependencies["@vanilla-extract/css"] = sourceVanillaExtract
    writeFileSync(scaffoldAppManifestPath, `${JSON.stringify(scaffoldAppManifest, null, 2)}\n`)

    const baselineNodeModulesStat = lstatSync(baselineNodeModules)
    if (baselineNodeModulesStat.isSymbolicLink()) {
      symlinkSync(realpathSync(baselineNodeModules), join(outputRoot, "node_modules"), "dir")
    } else {
      symlinkSync(baselineNodeModules, join(outputRoot, "node_modules"), "dir")
    }

    const sourceAppNodeModules = join(baselineAppRoot, "node_modules")
    prepareAppNodeModules(sourceAppNodeModules, join(appRoot, "node_modules"), currentPackageRoot)

    mkdirSync(currentPackageRoot, { recursive: true })
    copyFileSync(sourcePackageManifestPath, join(currentPackageRoot, "package.json"))
    copyFileSync(join(baselinePackageRoot, "tsdown.config.ts"), join(currentPackageRoot, "tsdown.config.ts"))
    cpSync(sourceDist, join(currentPackageRoot, "dist"), { recursive: true })
    const baselinePackageNodeModulesStat = lstatSync(baselinePackageNodeModules)
    const packageDependenciesRoot = baselinePackageNodeModulesStat.isSymbolicLink()
      ? realpathSync(baselinePackageNodeModules)
      : baselinePackageNodeModules
    symlinkSync(packageDependenciesRoot, join(currentPackageRoot, "node_modules"), "dir")
    const packageVanillaExtractVersion = resolvePackageVersion(currentPackageRoot, "@vanilla-extract/css")
    if (packageVanillaExtractVersion !== expectedVersions.vanillaExtractCss) {
      throw Error(`The matched package runtime @vanilla-extract/css must resolve to ${expectedVersions.vanillaExtractCss}; received ${packageVanillaExtractVersion}`)
    }
    const fixtureDestination = join(currentPackageRoot, "fixtures")
    mkdirSync(fixtureDestination, { recursive: true })
    copyFileSync(
      join(sourcePackageRoot, "fixtures/m2-7-workspace-token.ts"),
      join(fixtureDestination, "m2-7-workspace-token.ts"),
    )

    const fixtureHashes: Array<{ path: string; sha256: string }> = []
    const metroDestination = join(appRoot, "metro.config.js")
    copyFileSync(sourceMetroConfigPath, metroDestination)
    fixtureHashes.push({
      path: "apps/playground/metro.config.js",
      sha256: createHash("sha256").update(readFileSync(metroDestination)).digest("hex"),
    })
    for (const path of fixturePaths) {
      const sourcePath = join(sourceRoot, path)
      const destinationPath = join(outputRoot, path)
      mkdirSync(dirname(destinationPath), { recursive: true })
      copyFileSync(sourcePath, destinationPath)
      fixtureHashes.push({
        path,
        sha256: createHash("sha256").update(readFileSync(destinationPath)).digest("hex"),
      })
    }

    const versions = installedVersions(appRoot, scaffoldAppManifest)
    verifyVersions(versions)
    return { appRoot, fixtureHashes, resolvedVersions: versions }
  } catch (error) {
    rmSync(outputRoot, { recursive: true, force: true })
    throw error
  }
}

if (import.meta.main) {
  const [baselineRoot, outputRoot] = process.argv.slice(2)
  if (!baselineRoot || !outputRoot) {
    console.error("Usage: bun scripts/prepare-matched-metro-scaffold.ts <baseline-root> <output-root>")
    process.exitCode = 1
  } else {
    try {
      const result = await prepareMatchedMetroScaffold({
        baselineRoot,
        baselineRevision: matchedMetroBaselineRevision,
        sourceRoot: resolve(import.meta.dir, ".."),
        outputRoot,
      })
      console.log(JSON.stringify(result, null, 2))
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    }
  }
}
