import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

export type PackageIdentity = Readonly<{
  name: string
  version: string
}>

export type PackageManifest = Readonly<{
  dependencies?: Readonly<Record<string, string>>
  optionalDependencies?: Readonly<Record<string, string>>
  peerDependencies?: Readonly<Record<string, string>>
}>

export type InstalledPackage = PackageIdentity & Readonly<{
  entryPath: string
  packageRoot: string
}>

type InstalledManifest = PackageIdentity & PackageManifest
type ParsedManifest = Readonly<Record<string, unknown>>

function pathIsInside(parent: string, candidate: string): boolean {
  const pathFromParent = relative(parent, candidate)
  return pathFromParent !== "" &&
    !isAbsolute(pathFromParent) &&
    pathFromParent !== ".." &&
    !pathFromParent.startsWith(`..${sep}`)
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function assertNoWorkspaceOrLinkDependencies(manifest: PackageManifest): void {
  const dependencyGroups = [
    ["dependencies", manifest.dependencies],
    ["optionalDependencies", manifest.optionalDependencies],
    ["peerDependencies", manifest.peerDependencies],
  ] as const

  for (const [group, dependencies] of dependencyGroups) {
    for (const [name, specifier] of Object.entries(dependencies ?? {})) {
      const normalizedSpecifier = specifier.trim()
      if (normalizedSpecifier.startsWith("workspace:") || normalizedSpecifier.startsWith("link:")) {
        const protocol = normalizedSpecifier.slice(0, normalizedSpecifier.indexOf(":") + 1)
        throw new Error(
          `Dependency ${name} in ${group} uses unsupported ${protocol} protocol (${specifier})`,
        )
      }
    }
  }
}


export function assertPrecompiledComponentFiles(files: ReadonlyArray<string>): void {
  const normalizedFiles = files.map((file) => file.replaceAll("\\", "/"))
  const requiredFiles = [
    { path: "dist/ActionCard.styles.native.js", description: "native style module" },
    { path: "dist/ActionCard.styles.web.js", description: "web style module" },
    { path: "dist/ActionCard.styles.d.ts", description: "style declaration" },
    { path: "dist/ActionCard.js", description: "component module" },
    { path: "dist/ActionCard.d.ts", description: "component declaration" },
    { path: "dist/index.js", description: "index JavaScript entrypoint" },
    { path: "dist/index.d.ts", description: "index declaration entrypoint" },
  ] as const

  for (const required of requiredFiles) {
    const present = normalizedFiles.some((file) =>
      file === required.path || file.endsWith(`/${required.path}`),
    )
    if (!present) {
      throw new Error(`Missing required component ${required.description}: ${required.path}`)
    }
  }

  const authoredStyleSource = normalizedFiles.find((file) => /\.css\.ts(?:\.map)?$/i.test(file))
  if (authoredStyleSource !== undefined) {
    throw new Error(`Packed component includes authored Crumbs stylesheet source: ${authoredStyleSource}`)
  }

  const sourceMap = normalizedFiles.find((file) => /\.map$/i.test(file))
  if (sourceMap !== undefined) {
    throw new Error(`Packed component includes a source map: ${sourceMap}`)
  }
}


export type ExpoBundleTarget = Readonly<{
  platform: "ios" | "web"
  directory: string
}>

export type BundleInventory = Readonly<{
  platform: "ios" | "web"
  sourceMapFiles: ReadonlyArray<string>
  packageSources: Readonly<Record<string, ReadonlyArray<string>>>
}>

type SourceMapState = {
  bundleRoot: string
  consumerRoot: string
  repositoryRoots: ReadonlyArray<string>
  packageRoots: Readonly<Record<string, string>>
  sourceMapFiles: Set<string>
  packageSources: Record<string, Set<string>>
  activeMaps: Set<string>
  completedMaps: Set<string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function pathIsWithinOrEqual(parent: string, candidate: string): boolean {
  return parent === candidate || pathIsInside(parent, candidate)
}

function hasUrlScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value)
}

function stripSourceSuffix(source: string): string {
  return source.replace(/[?#].*$/, "")
}

function resolveSourcePath(
  mapPath: string,
  sourceRoot: string,
  source: string,
  consumerRoot: string,
): string | undefined {
  if (source.includes("\0") || sourceRoot.includes("\0") || source === "__prelude__") return undefined
  const cleanSource = stripSourceSuffix(source.replaceAll("\\", "/"))
  const cleanRoot = stripSourceSuffix(sourceRoot.replaceAll("\\", "/"))
  if (cleanSource.startsWith("file://")) {
    const url = new URL(cleanSource)
    url.search = ""
    url.hash = ""
    return fileURLToPath(url)
  }
  if (hasUrlScheme(cleanSource)) return undefined

  if (cleanRoot.startsWith("file://")) {
    const base = new URL(cleanRoot.endsWith("/") ? cleanRoot : `${cleanRoot}/`)
    return fileURLToPath(new URL(cleanSource, base))
  }
  if (hasUrlScheme(cleanRoot)) return undefined

  const metroRootRelativeSource = [cleanRoot, cleanSource]
    .filter(Boolean)
    .join("/")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "")
  if (
    metroRootRelativeSource === "index.js" ||
    metroRootRelativeSource === "AppEntry.js" ||
    metroRootRelativeSource.startsWith("node_modules/") ||
    metroRootRelativeSource.startsWith("src/") ||
    metroRootRelativeSource.startsWith("assets/")
  ) {
    return resolve(consumerRoot, metroRootRelativeSource)
  }
  return resolve(dirname(mapPath), cleanRoot, cleanSource)
}

async function canonicalizeSourcePath(sourcePath: string, mapPath: string): Promise<string> {
  let canonicalSourcePath: string
  try {
    canonicalSourcePath = await realpath(sourcePath)
  } catch (error) {
    throw new Error(`Cannot canonicalize source ${sourcePath} from ${mapPath}: ${messageOf(error)}`, { cause: error })
  }
  let sourceInfo: Awaited<ReturnType<typeof stat>>
  try {
    sourceInfo = await stat(canonicalSourcePath)
  } catch (error) {
    throw new Error(`Could not inspect source ${canonicalSourcePath} from ${mapPath}: ${messageOf(error)}`, { cause: error })
  }
  if (!sourceInfo.isFile()) {
    throw new Error(`Source map reference is not a regular file: ${sourcePath} in ${mapPath}`)
  }
  return canonicalSourcePath
}

async function assertNoSymlinkPathComponents(root: string, packagePath: string, packageName: string): Promise<void> {
  if (!pathIsInside(root, packagePath)) {
    throw new Error(`Packed package ${packageName} path is outside consumer node_modules: ${packagePath}`)
  }

  let currentPath = root
  for (const component of relative(root, packagePath).split(sep)) {
    currentPath = join(currentPath, component)
    let pathInfo: Awaited<ReturnType<typeof lstat>>
    try {
      pathInfo = await lstat(currentPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(`Packed package ${packageName} was not found at ${currentPath}`, { cause: error })
      }
      throw new Error(`Cannot inspect packed package ${packageName} at ${currentPath}: ${messageOf(error)}`, { cause: error })
    }
    if (pathInfo.isSymbolicLink()) {
      throw new Error(`Packed package ${packageName} resolves through a symlink at ${currentPath}`)
    }
  }
}

async function inspectSourcePath(
  source: string,
  sourceRoot: string,
  mapPath: string,
  state: SourceMapState,
): Promise<void> {
  const rawSourceReference = `${sourceRoot}/${source}`.replaceAll("\\", "/")
  let decodedSourceReference = rawSourceReference
  try {
    decodedSourceReference = decodeURIComponent(rawSourceReference)
  } catch {
    // Keep the raw reference so malformed escapes still receive path inspection.
  }
  if (
    state.repositoryRoots.some((root) =>
      rawSourceReference.includes(root) || decodedSourceReference.includes(root),
    )
  ) {
    throw new Error(`Expo source map includes repository/worktree source ${source} in ${mapPath}`)
  }

  const lexicalSourcePath = resolveSourcePath(mapPath, sourceRoot, source, state.consumerRoot)
  const authoredSource = /\.css\.ts(?:$|[?#])/i.test(source) ||
    (lexicalSourcePath !== undefined && /\.css\.ts$/i.test(lexicalSourcePath))
  if (authoredSource) {
    throw new Error(`Expo source map includes authored .css.ts source ${source} in ${mapPath}`)
  }
  if (lexicalSourcePath === undefined) return

  const canonicalSourcePath = await canonicalizeSourcePath(lexicalSourcePath, mapPath)
  if (
    state.repositoryRoots.some((root) =>
      pathIsWithinOrEqual(root, lexicalSourcePath) || pathIsWithinOrEqual(root, canonicalSourcePath),
    )
  ) {
    throw new Error(`Expo source map includes repository/worktree source ${source} at ${canonicalSourcePath}`)
  }
  if (!pathIsWithinOrEqual(state.consumerRoot, canonicalSourcePath)) {
    throw new Error(`Expo source map includes filesystem source outside the staged consumer: ${source} at ${canonicalSourcePath}`)
  }

  for (const [packageName, packageRoot] of Object.entries(state.packageRoots)) {
    if (pathIsInside(packageRoot, canonicalSourcePath)) {
      state.packageSources[packageName]!.add(canonicalSourcePath)
    }
  }
}

async function inspectSourceMapDocument(
  value: unknown,
  mapPath: string,
  state: SourceMapState,
): Promise<void> {
  if (!isRecord(value) || value.version !== 3) {
    throw new Error(`Could not decode source map ${mapPath}: expected a version 3 map`)
  }

  if ("sections" in value) {
    if (!Array.isArray(value.sections)) {
      throw new Error(`Could not decode source map ${mapPath}: sections must be an array`)
    }
    for (const section of value.sections) {
      if (!isRecord(section)) {
        throw new Error(`Could not decode source map ${mapPath}: invalid indexed-map section`)
      }
      if (isRecord(section.map)) {
        await inspectSourceMapDocument(section.map, mapPath, state)
        continue
      }
      if (typeof section.url === "string" && section.url !== "") {
        if (isAbsolute(section.url) || hasUrlScheme(section.url)) {
          throw new Error(`Could not decode source map ${mapPath}: indexed section URL must stay inside the bundle output`)
        }
        const childMapPath = resolve(dirname(mapPath), stripSourceSuffix(section.url))
        if (!pathIsWithinOrEqual(state.bundleRoot, childMapPath)) {
          throw new Error(`Could not decode source map ${mapPath}: indexed section escapes bundle output`)
        }
        await inspectSourceMapFile(childMapPath, state)
        continue
      }
      throw new Error(`Could not decode source map ${mapPath}: indexed section has no map or URL`)
    }
    return
  }

  if (!Array.isArray(value.sources) || !value.sources.every((source) => typeof source === "string")) {
    throw new Error(`Could not decode source map ${mapPath}: sources must be an array of paths`)
  }
  if (typeof value.mappings !== "string") {
    throw new Error(`Could not decode source map ${mapPath}: mappings must be a string`)
  }
  const sourceRoot = value.sourceRoot
  if (sourceRoot !== undefined && typeof sourceRoot !== "string") {
    throw new Error(`Could not decode source map ${mapPath}: sourceRoot must be a string`)
  }
  for (const source of value.sources) {
    await inspectSourcePath(source, sourceRoot ?? "", mapPath, state)
  }
}

async function inspectSourceMapFile(mapPath: string, state: SourceMapState): Promise<void> {
  let canonicalMapPath: string
  try {
    canonicalMapPath = await realpath(mapPath)
  } catch (error) {
    throw new Error(`Could not decode source map ${mapPath}: ${messageOf(error)}`, { cause: error })
  }
  if (!pathIsWithinOrEqual(state.bundleRoot, canonicalMapPath)) {
    throw new Error(`Source map resolves outside its supplied bundle directory: ${mapPath} -> ${canonicalMapPath}`)
  }
  if (state.activeMaps.has(canonicalMapPath)) {
    throw new Error(`Could not decode source map ${mapPath}: indexed maps contain a cycle`)
  }
  if (state.completedMaps.has(canonicalMapPath)) return

  state.activeMaps.add(canonicalMapPath)
  state.sourceMapFiles.add(canonicalMapPath)
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(canonicalMapPath, "utf8"))
  } catch (error) {
    throw new Error(`Could not decode source map ${canonicalMapPath}: ${messageOf(error)}`, { cause: error })
  }
  await inspectSourceMapDocument(parsed, canonicalMapPath, state)
  state.activeMaps.delete(canonicalMapPath)
  state.completedMaps.add(canonicalMapPath)
}

async function findSourceMapFiles(directory: string, consumerRoot: string): Promise<ReadonlyArray<string>> {
  let canonicalDirectory: string
  try {
    canonicalDirectory = await realpath(directory)
  } catch (error) {
    throw new Error(`Cannot inspect Expo bundle directory ${directory}: ${messageOf(error)}`, { cause: error })
  }
  if (!pathIsInside(consumerRoot, canonicalDirectory)) {
    throw new Error(`Expo bundle directory is outside the staged consumer: ${directory} -> ${canonicalDirectory}`)
  }

  const files: string[] = []
  const pending = [canonicalDirectory]
  while (pending.length > 0) {
    const current = pending.pop()!
    let entries: ReadonlyArray<Readonly<{
      name: string
      isSymbolicLink(): boolean
      isDirectory(): boolean
      isFile(): boolean
    }>>
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch (error) {
      throw new Error(`Cannot inspect Expo bundle directory ${current}: ${messageOf(error)}`, { cause: error })
    }
    for (const entry of entries) {
      const entryPath = join(current, entry.name)
      if (entry.isSymbolicLink()) {
        throw new Error(`Expo bundle output contains a symlink that cannot be audited: ${entryPath}`)
      }
      if (entry.isDirectory()) {
        pending.push(entryPath)
      } else if (entry.isFile() && /\.map$/i.test(entry.name)) {
        files.push(entryPath)
      }
    }
  }
  return files.sort()
}

async function resolveInstalledBundlePackages(
  consumerRoot: string,
  expectedPackages: ReadonlyArray<string>,
): Promise<Readonly<Record<string, string>>> {
  const nodeModulesPath = join(consumerRoot, "node_modules")
  let canonicalNodeModules: string
  try {
    canonicalNodeModules = await realpath(nodeModulesPath)
  } catch (error) {
    throw new Error(`Cannot inspect packed consumer node_modules at ${nodeModulesPath}: ${messageOf(error)}`, { cause: error })
  }
  if (canonicalNodeModules !== nodeModulesPath || !pathIsInside(consumerRoot, canonicalNodeModules)) {
    throw new Error(`Packed consumer node_modules escapes or is symlinked: ${nodeModulesPath} -> ${canonicalNodeModules}`)
  }

  const packageRoots: Record<string, string> = {}
  for (const packageName of expectedPackages) {
    const packagePath = join(canonicalNodeModules, ...packageName.split("/"))
    await assertNoSymlinkPathComponents(canonicalNodeModules, packagePath, packageName)
    let packageRoot: string
    try {
      packageRoot = await realpath(packagePath)
    } catch (error) {
      throw new Error(`Required packed package ${packageName} is missing from consumer node_modules`, { cause: error })
    }
    if (!pathIsInside(canonicalNodeModules, packageRoot)) {
      throw new Error(`Packed package ${packageName} resolves outside consumer node_modules: ${packageRoot}`)
    }
    let manifest: ParsedManifest
    try {
      manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as ParsedManifest
    } catch (error) {
      throw new Error(`Cannot read installed package identity for ${packageName} at ${packageRoot}: ${messageOf(error)}`, { cause: error })
    }
    if (manifest.name !== packageName) {
      throw new Error(`Packed package identity mismatch: expected ${packageName}, found ${String(manifest.name)} at ${packageRoot}`)
    }
    packageRoots[packageName] = packageRoot
  }
  return packageRoots
}

export async function verifyExpoBundleInventory(
  targets: ReadonlyArray<ExpoBundleTarget>,
  consumerRoot: string,
  repositoryRoot: string,
  expectedPackages: ReadonlyArray<string>,
): Promise<ReadonlyArray<BundleInventory>> {
  let canonicalConsumerRoot: string
  let canonicalRepositoryRoot: string
  const repositoryRoots = new Set<string>([resolve(repositoryRoot)])
  try {
    canonicalConsumerRoot = await realpath(consumerRoot)
    canonicalRepositoryRoot = await realpath(repositoryRoot)
    repositoryRoots.add(canonicalRepositoryRoot)
  } catch (error) {
    throw new Error(`Cannot resolve Expo inventory roots: ${messageOf(error)}`, { cause: error })
  }

  const targetsByPlatform: Record<"ios" | "web", ExpoBundleTarget[]> = { ios: [], web: [] }
  for (const target of targets) targetsByPlatform[target.platform].push(target)
  for (const platform of ["ios", "web"] as const) {
    if (targetsByPlatform[platform].length === 0) {
      throw new Error(`Missing ${platform} source map target for packed Expo qualification`)
    }
  }

  const packageRoots = await resolveInstalledBundlePackages(canonicalConsumerRoot, expectedPackages)
  const inventories: BundleInventory[] = []
  for (const platform of ["ios", "web"] as const) {
    const sourceMapFiles = new Set<string>()
    const packageSources: Record<string, Set<string>> = Object.fromEntries(
      expectedPackages.map((packageName) => [packageName, new Set<string>()]),
    )
    for (const target of targetsByPlatform[platform]) {
      const bundleDirectories = await findSourceMapFiles(target.directory, canonicalConsumerRoot)
      if (bundleDirectories.length === 0) {
        throw new Error(`Missing ${platform} source map in bundle output ${target.directory}`)
      }
      for (const sourceMapPath of bundleDirectories) {
        const state: SourceMapState = {
          bundleRoot: await realpath(target.directory),
          consumerRoot: canonicalConsumerRoot,
          repositoryRoots: [...repositoryRoots],
          packageRoots,
          sourceMapFiles,
          packageSources,
          activeMaps: new Set(),
          completedMaps: new Set(),
        }
        await inspectSourceMapFile(sourceMapPath, state)
      }
    }

    for (const packageName of expectedPackages) {
      if (packageSources[packageName]!.size === 0) {
        throw new Error(`No ${platform} source map includes installed package source ${packageName}`)
      }
    }
    inventories.push({
      platform,
      sourceMapFiles: [...sourceMapFiles].sort(),
      packageSources: Object.fromEntries(
        expectedPackages.map((packageName) => [packageName, [...packageSources[packageName]!].sort()]),
      ),
    })
  }
  return inventories
}

async function findPackageManifest(
  entryPath: string,
  expected: PackageIdentity,
): Promise<Readonly<{ packageRoot: string; manifest: InstalledManifest }>> {
  let directory = dirname(entryPath)
  let nearestManifest: Readonly<{ packageRoot: string; manifest: ParsedManifest }> | undefined

  while (true) {
    const manifestPath = join(directory, "package.json")
    let source: string | undefined
    try {
      source = await readFile(manifestPath, "utf8")
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new Error(
          `Could not read package manifest for ${expected.name}@${expected.version} at ${manifestPath}: ${messageOf(error)}`,
          { cause: error },
        )
      }
    }

    if (source !== undefined) {
      let parsed: unknown
      try {
        parsed = JSON.parse(source)
      } catch (error) {
        throw new Error(
          `Could not parse package manifest for ${expected.name}@${expected.version} at ${manifestPath}: ${messageOf(error)}`,
          { cause: error },
        )
      }

      if (typeof parsed === "object" && parsed !== null) {
        const manifest = parsed as ParsedManifest
        const packageRoot = await realpath(directory)
        if (nearestManifest === undefined) {
          nearestManifest = { packageRoot, manifest }
        }
        if (manifest.name === expected.name) {
          return {
            packageRoot,
            manifest: manifest as InstalledManifest,
          }
        }
      }
    }

    const parent = dirname(directory)
    if (parent === directory) break
    directory = parent
  }

  if (nearestManifest !== undefined) {
    throw new Error(
      `Package identity mismatch: expected ${expected.name}@${expected.version}, but resolved entry at ${entryPath} belongs to ${String(nearestManifest.manifest.name)}@${String(nearestManifest.manifest.version)} at ${nearestManifest.packageRoot}`,
    )
  }

  throw new Error(
    `Resolved entry for ${expected.name}@${expected.version} at ${entryPath} has no matching package.json`,
  )
}

export async function verifyInstalledArtifact(
  consumerRoot: string,
  expected: PackageIdentity,
): Promise<InstalledPackage> {
  let canonicalConsumerRoot: string
  try {
    canonicalConsumerRoot = await realpath(consumerRoot)
  } catch (error) {
    throw new Error(
      `Cannot resolve consumer root for ${expected.name}@${expected.version} at ${consumerRoot}: ${messageOf(error)}`,
      { cause: error },
    )
  }

  const consumerNodeModules = join(canonicalConsumerRoot, "node_modules")
  let canonicalNodeModules: string
  try {
    canonicalNodeModules = await realpath(consumerNodeModules)
  } catch (error) {
    throw new Error(
      `Cannot verify ${expected.name}@${expected.version}: consumer node_modules is missing or unreadable at ${consumerNodeModules}: ${messageOf(error)}`,
      { cause: error },
    )
  }
  if (canonicalNodeModules !== consumerNodeModules || !pathIsInside(canonicalConsumerRoot, canonicalNodeModules)) {
    throw new Error(
      `Cannot verify ${expected.name}@${expected.version}: consumer node_modules resolves outside the consumer root or through a symlink: ${consumerNodeModules} -> ${canonicalNodeModules}`,
    )
  }

  const consumerManifest = join(canonicalConsumerRoot, "package.json")
  const requestedPackagePath = join(canonicalNodeModules, ...expected.name.split("/"))
  await assertNoSymlinkPathComponents(canonicalNodeModules, requestedPackagePath, `${expected.name}@${expected.version}`)
  const requireFromConsumer = createRequire(consumerManifest)
  let entryPath: string
  try {
    entryPath = await realpath(requireFromConsumer.resolve(expected.name))
  } catch (error) {
    throw new Error(
      `Package ${expected.name}@${expected.version} was not found when resolving from ${consumerManifest}: ${messageOf(error)}`,
      { cause: error },
    )
  }

  const { packageRoot, manifest } = await findPackageManifest(entryPath, expected)
  if (manifest.version !== expected.version) {
    throw new Error(
      `Package ${expected.name} version mismatch: requested ${expected.version}, installed ${String(manifest.version)} at ${packageRoot}`,
    )
  }

  if (!pathIsInside(canonicalNodeModules, packageRoot)) {
    throw new Error(
      `Package ${expected.name}@${expected.version} resolved to ${packageRoot}, outside consumer node_modules at ${canonicalNodeModules}`,
    )
  }

  return {
    name: manifest.name,
    version: manifest.version,
    entryPath,
    packageRoot,
  }
}
