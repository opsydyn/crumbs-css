import { readFile, realpath } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, isAbsolute, join, relative, sep } from "node:path"

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
