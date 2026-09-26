import { createHash } from "node:crypto"
import { cp, mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { isAbsolute, join, relative, sep } from "node:path"
import {
  assertNoWorkspaceOrLinkDependencies,
  assertPrecompiledComponentFiles,
  verifyInstalledArtifact,
  type PackageIdentity,
  type PackageManifest,
} from "./packed-distribution-contract"

export type PackedArtifact = Readonly<{
  name: string
  version: string
  tarball: string
  sha256: string
}>

export type PackedDistributionArtifacts = Readonly<{
  buildRoot: string
  crumbs: PackedArtifact
  tokens: PackedArtifact
  ui: PackedArtifact
}>

type PackageJson = PackageIdentity & PackageManifest & Readonly<{
  files?: ReadonlyArray<string>
  [key: string]: unknown
}>

type NpmPackRecord = Readonly<{
  name: string
  version: string
  filename: string
  files?: ReadonlyArray<Readonly<{ path: string }>>
}>

type PackedPackage = Readonly<{
  artifact: PackedArtifact
  files: ReadonlyArray<string>
}>

const CRUMBS_PACKAGE = "@opsydyn/crumbs-css"
const TOKEN_PACKAGE = "@acme/design-tokens"
const UI_PACKAGE = "@acme/ui"

function isPathInside(parent: string, candidate: string): boolean {
  const pathFromParent = relative(parent, candidate)
  return pathFromParent !== "" &&
    !isAbsolute(pathFromParent) &&
    pathFromParent !== ".." &&
    !pathFromParent.startsWith(`..${sep}`)
}

async function run(
  command: ReadonlyArray<string>,
  cwd: string,
  logPath: string,
): Promise<string> {
  const child = Bun.spawn([...command], {
    cwd,
    env: { ...process.env, CI: "1", npm_config_audit: "false", npm_config_fund: "false" },
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

async function readPackageJson(packageRoot: string): Promise<PackageJson> {
  return JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as PackageJson
}

async function writePackageJson(packageRoot: string, manifest: PackageJson): Promise<void> {
  await writeFile(join(packageRoot, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`)
}

async function packPackage(packageRoot: string, destination: string, buildRoot: string): Promise<PackedPackage> {
  await mkdir(destination, { recursive: true })
  const manifest = await readPackageJson(packageRoot)
  const output = await run(
    ["npm", "pack", "--ignore-scripts", "--json", "--pack-destination", destination],
    packageRoot,
    join(buildRoot, `logs/pack-${manifest.name.replaceAll("/", "-")}.log`),
  )

  let records: ReadonlyArray<NpmPackRecord>
  try {
    records = JSON.parse(output) as ReadonlyArray<NpmPackRecord>
  } catch (error) {
    throw new Error(`npm pack returned invalid JSON for ${manifest.name}: ${String(error)}`, { cause: error })
  }
  const packed = records[0]
  if (records.length !== 1 || packed === undefined) {
    throw new Error(`npm pack produced ${records.length} package records for ${manifest.name}`)
  }
  if (packed.name !== manifest.name || packed.version !== manifest.version) {
    throw new Error(
      `Packed identity mismatch: expected ${manifest.name}@${manifest.version}, got ${packed.name}@${packed.version}`,
    )
  }

  const tarball = await realpath(join(destination, packed.filename))
  const sha256 = createHash("sha256").update(await readFile(tarball)).digest("hex")
  return {
    artifact: { name: packed.name, version: packed.version, tarball, sha256 },
    files: (packed.files ?? []).map((file) => file.path),
  }
}

async function installFixtureDependencies(
  packageRoot: string,
  dependencies: Readonly<Record<string, PackedArtifact>>,
  buildRoot: string,
): Promise<PackageJson> {
  const manifest = await readPackageJson(packageRoot)
  assertNoWorkspaceOrLinkDependencies(manifest)
  const installManifest = {
    ...manifest,
    dependencies: {
      ...(manifest.dependencies ?? {}),
      ...Object.fromEntries(Object.values(dependencies).map((artifact) => [artifact.name, `file:${artifact.tarball}`])),
    },
  }
  await writePackageJson(packageRoot, installManifest)
  await run(
    ["npm", "install", "--no-audit", "--no-fund"],
    packageRoot,
    join(buildRoot, `logs/install-${manifest.name.replaceAll("/", "-")}.log`),
  )
  return manifest
}

async function assertDependencyResolvesToArtifact(
  fromPackageRoot: string,
  specifier: string,
  artifact: Readonly<PackageIdentity & { packageRoot: string }>,
): Promise<void> {
  const requireFromPackage = createRequire(join(fromPackageRoot, "package.json"))
  let resolvedEntry: string
  try {
    resolvedEntry = await realpath(requireFromPackage.resolve(specifier))
  } catch (error) {
    throw new Error(
      `Dependency ${specifier} could not be resolved from ${fromPackageRoot}: ${String(error)}`,
      { cause: error },
    )
  }
  if (!isPathInside(artifact.packageRoot, resolvedEntry)) {
    throw new Error(
      `Dependency ${specifier} from ${fromPackageRoot} resolved to ${resolvedEntry}, outside ${artifact.name}@${artifact.version} at ${artifact.packageRoot}`,
    )
  }
}

async function assertInstalledArtifactManifest(
  installed: Readonly<PackageIdentity & { packageRoot: string }>,
): Promise<void> {
  assertNoWorkspaceOrLinkDependencies(await readPackageJson(installed.packageRoot))
}

async function buildAndPackFixture({
  fixtureRoot,
  packageRoot,
  artifacts,
  buildRoot,
  packedDirectory,
}: Readonly<{
  fixtureRoot: string
  packageRoot: string
  artifacts: Readonly<Record<string, PackedArtifact>>
  buildRoot: string
  packedDirectory: string
}>): Promise<PackedPackage> {
  await mkdir(join(packageRoot, ".."), { recursive: true })
  await cp(fixtureRoot, packageRoot, { recursive: true })
  const sourceManifest = await installFixtureDependencies(packageRoot, artifacts, buildRoot)

  for (const artifact of Object.values(artifacts)) {
    const installed = await verifyInstalledArtifact(packageRoot, artifact)
    await assertInstalledArtifactManifest(installed)
    const entrySpecifier = artifact.name === CRUMBS_PACKAGE ? `${CRUMBS_PACKAGE}/tokens` : artifact.name
    await assertDependencyResolvesToArtifact(packageRoot, entrySpecifier, installed)
  }

  await run(
    ["npm", "run", "build"],
    packageRoot,
    join(buildRoot, `logs/build-${sourceManifest.name.replaceAll("/", "-")}.log`),
  )
  await writePackageJson(packageRoot, sourceManifest)
  assertNoWorkspaceOrLinkDependencies(sourceManifest)
  return await packPackage(packageRoot, packedDirectory, buildRoot)
}

export async function buildPackedDistributionArtifacts(
  repositoryRoot: string,
  tempParent = tmpdir(),
): Promise<PackedDistributionArtifacts> {
  const canonicalRepositoryRoot = await realpath(repositoryRoot)
  await mkdir(tempParent, { recursive: true })
  const buildRoot = await realpath(await mkdtemp(join(tempParent, "crumbs-packed-distribution-")))
  const logsRoot = join(buildRoot, "logs")
  const artifactsRoot = join(buildRoot, "artifacts")
  await mkdir(logsRoot, { recursive: true })
  await mkdir(artifactsRoot, { recursive: true })

  const crumbsPackageRoot = join(canonicalRepositoryRoot, "packages/css")
  const crumbsManifest = await readPackageJson(crumbsPackageRoot)
  assertNoWorkspaceOrLinkDependencies(crumbsManifest)
  await run(
    ["bun", "run", "build"],
    crumbsPackageRoot,
    join(logsRoot, "build-crumbs.log"),
  )
  const crumbs = await packPackage(
    crumbsPackageRoot,
    join(artifactsRoot, "crumbs"),
    buildRoot,
  )
  if (crumbs.artifact.name !== CRUMBS_PACKAGE) {
    throw new Error(`Expected ${CRUMBS_PACKAGE}, packed ${crumbs.artifact.name}`)
  }

  const fixturesRoot = join(canonicalRepositoryRoot, "packages/css/fixtures/packed-distribution")
  const tokenPackageRoot = join(buildRoot, "build/tokens")
  const tokens = await buildAndPackFixture({
    fixtureRoot: join(fixturesRoot, "tokens"),
    packageRoot: tokenPackageRoot,
    artifacts: { crumbs: crumbs.artifact },
    buildRoot,
    packedDirectory: join(artifactsRoot, "tokens"),
  })
  if (tokens.artifact.name !== TOKEN_PACKAGE) {
    throw new Error(`Expected ${TOKEN_PACKAGE}, packed ${tokens.artifact.name}`)
  }

  const uiPackageRoot = join(buildRoot, "build/ui")
  const ui = await buildAndPackFixture({
    fixtureRoot: join(fixturesRoot, "ui"),
    packageRoot: uiPackageRoot,
    artifacts: { crumbs: crumbs.artifact, tokens: tokens.artifact },
    buildRoot,
    packedDirectory: join(artifactsRoot, "ui"),
  })
  if (ui.artifact.name !== UI_PACKAGE) {
    throw new Error(`Expected ${UI_PACKAGE}, packed ${ui.artifact.name}`)
  }
  assertPrecompiledComponentFiles(ui.files)

  return {
    buildRoot,
    crumbs: crumbs.artifact,
    tokens: tokens.artifact,
    ui: ui.artifact,
  }
}
