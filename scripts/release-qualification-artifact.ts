import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join, relative, resolve, sep } from "node:path"
import { isDeepStrictEqual } from "node:util"
import {
  verifyReleaseHostBudgetReport,
  type ReleaseHostBudgetArtifact,
} from "./release-host-budget-report"
import { captureGuaranteesSourceIdentity } from "./guarantees-matrix/source-identity"
import { collectReleaseHostEnvironment } from "./release-host-environment"
import {
  approvedReleaseHostEnvironment,
  verifyReleaseHostEnvironment,
  type ReleaseHostEnvironment,
} from "./release-host-environment"

export type ReleaseQualificationInput = Readonly<{
  releaseTag: string
  sourceRevision: string
  sourceDigest: string
  host: ReleaseHostEnvironment
  reportDirectory: string
  packageRoot: string
  tarballPath: string
}>

import {
  releaseQualificationManifestCodec,
  type ReleaseQualificationManifest,
} from "../packages/css/bench/release-qualification-manifest"
const sha256 = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex")

function decodeManifest(input: unknown): ReleaseQualificationManifest {
  const decoded = releaseQualificationManifestCodec.decode(input)
  if (!decoded.ok) {
    throw Error(decoded.issues.map(issue => issue.message).join("; ") || "Invalid release qualification manifest")
  }
  return decoded.value
}

function collectDirectoryFiles(root: string, directory = root): readonly ReleaseHostBudgetArtifact[] {
  const files: ReleaseHostBudgetArtifact[] = []
  for (const name of readdirSync(directory).sort()) {
    const absolute = join(directory, name)
    const stat = lstatSync(absolute)
    if (stat.isSymbolicLink()) throw Error(`Symlink is not allowed in release report: ${relative(root, absolute)}`)
    if (stat.isDirectory()) {
      files.push(...collectDirectoryFiles(root, absolute))
    } else if (stat.isFile()) {
      files.push({
        path: relative(root, absolute).split(sep).join("/"),
        sha256: sha256(readFileSync(absolute)),
      })
    } else {
      throw Error(`Unsupported release report entry: ${relative(root, absolute)}`)
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path))
}

function reportDigest(files: readonly ReleaseHostBudgetArtifact[]): string {
  return sha256(JSON.stringify(files))
}

function readJson(path: string): Record<string, any> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, any>
}

function readPackageIdentity(packageRoot: string): { name: string; version: string } {
  const manifest = readJson(join(packageRoot, "package.json"))
  if (typeof manifest.name !== "string" || typeof manifest.version !== "string") {
    throw Error("Package manifest must contain name and version")
  }
  return { name: manifest.name, version: manifest.version }
}

function packageArtifactInventory(packageRoot: string): readonly ReleaseHostBudgetArtifact[] {
  const distRoot = join(packageRoot, "dist")
  return readdirSync(distRoot).sort().filter(path => !path.endsWith(".map")).map(path => ({
    path,
    sha256: sha256(readFileSync(join(distRoot, path))),
  }))
}

export function createReleaseQualificationManifest(input: ReleaseQualificationInput): ReleaseQualificationManifest {
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(input.sourceRevision)) {
    throw Error("Release source revision must be a full Git commit SHA")
  }
  if (!/^[a-f0-9]{64}$/u.test(input.sourceDigest)) throw Error("Release source digest must be a SHA-256 value")
  if (input.releaseTag !== `v${readPackageIdentity(input.packageRoot).version}`) {
    throw Error("Release tag must match v<package version>")
  }

  const hostBlockers = verifyReleaseHostEnvironment(input.host)
  if (hostBlockers.length > 0) throw Error(hostBlockers.join("\n"))

  const repositoryRoot = resolve(import.meta.dir, "..")
  const checkedOutRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim()
  if (input.sourceRevision !== checkedOutRevision) throw Error("Release source revision does not match the checked-out commit")

  const reportDirectory = resolve(input.reportDirectory)
  const packageRoot = resolve(input.packageRoot)
  const tarballPath = resolve(input.tarballPath)
  const packageIdentity = readPackageIdentity(packageRoot)
  const artifacts = packageArtifactInventory(packageRoot)
  const reportVerification = verifyReleaseHostBudgetReport({
    reportDirectory,
    repositoryRoot,
    expectedRevision: input.sourceRevision,
    expectedArtifacts: artifacts,
  })
  if (reportVerification.sourceDigest !== input.sourceDigest) {
    throw Error("Host-budget report source digest does not match the requested release source digest")
  }
  if (!reportVerification.qualified) {
    throw Error(`Host-budget report is not release-qualified:\n${reportVerification.blockers.map(blocker => `- ${blocker}`).join("\n")}`)
  }

  const files = collectDirectoryFiles(reportDirectory)
  const manifest = decodeManifest({
    formatVersion: 1,
    releaseTag: input.releaseTag,
    sourceRevision: input.sourceRevision,
    sourceDigest: input.sourceDigest,
    host: input.host,
    reportDirectory: "host-report",
    reportFiles: files,
    reportDigest: reportDigest(files),
    packageName: packageIdentity.name,
    packageVersion: packageIdentity.version,
    packageArtifacts: artifacts,
    tarballName: basename(tarballPath),
    tarballSha256: sha256(readFileSync(tarballPath)),
  })
  return manifest
}

function addBlocker(blockers: string[], message: string): void {
  blockers.push(message)
}

export function verifyReleaseQualificationBundle(options: Readonly<{
  bundleDirectory: string
  repositoryRoot: string
  expectedTag: string
  expectedRevision: string
}>): { valid: boolean; blockers: readonly string[] } {
  const blockers: string[] = []
  const bundleDirectory = resolve(options.bundleDirectory)
  const repositoryRoot = resolve(options.repositoryRoot)
  const manifestPath = join(bundleDirectory, "manifest.json")
  if (!existsSync(manifestPath)) {
    return { valid: false, blockers: ["Release qualification manifest.json is missing"] }
  }

  let manifest: ReleaseQualificationManifest
  try {
    manifest = decodeManifest(readJson(manifestPath))
  } catch (error) {
    return { valid: false, blockers: [`Invalid release qualification manifest: ${error instanceof Error ? error.message : String(error)}`] }
  }

  if (manifest.releaseTag !== options.expectedTag) addBlocker(blockers, "Release tag does not match the qualified manifest")
  if (manifest.sourceRevision !== options.expectedRevision) addBlocker(blockers, "Release source revision or commit does not match the qualified manifest")
  blockers.push(...verifyReleaseHostEnvironment(manifest.host))

  const packageRoot = resolve(repositoryRoot, "packages/css")
  const packageIdentity = readPackageIdentity(packageRoot)
  if (manifest.packageName !== packageIdentity.name) addBlocker(blockers, "Package name does not match the checked-out package")
  if (manifest.packageVersion !== packageIdentity.version) addBlocker(blockers, "Package version does not match the checked-out package")
  if (manifest.releaseTag !== `v${packageIdentity.version}`) addBlocker(blockers, "Release tag does not match v<package version>")

  const reportRoot = join(bundleDirectory, manifest.reportDirectory)
  try {
    const currentSource = captureGuaranteesSourceIdentity(repositoryRoot)
    if (manifest.sourceDigest !== currentSource.sha256) {
      addBlocker(blockers, "Release source digest does not match the checked-out source")
    }
    const actualReportFiles = collectDirectoryFiles(reportRoot)
    if (!isDeepStrictEqual(actualReportFiles, manifest.reportFiles)) {
      addBlocker(blockers, "Report file inventory or hashes do not match the manifest")
    }
    if (reportDigest(manifest.reportFiles) !== manifest.reportDigest) {
      addBlocker(blockers, "Report digest does not match the manifest report file hashes")
    }

    const comparison = readJson(join(reportRoot, "comparison.json"))
    const identity = readJson(join(reportRoot, "input-identity.json"))
    if (comparison.formatVersion !== 2 || comparison.sourceRevision !== manifest.sourceRevision) {
      addBlocker(blockers, "Report source revision or format does not match the manifest")
    }
    if (!identity.sourceBefore || !identity.sourceAfter ||
        !isDeepStrictEqual(identity.sourceBefore, identity.sourceAfter) ||
        !isDeepStrictEqual(identity.sourceAfter, currentSource) ||
        identity.sourceAfter.sha256 !== manifest.sourceDigest) {
      addBlocker(blockers, "Report source identity or digest does not match the manifest and checked-out source")
    }
    if (!Array.isArray(identity.artifactsBefore) || !Array.isArray(identity.artifactsAfter) ||
        !isDeepStrictEqual(identity.artifactsBefore, identity.artifactsAfter) ||
        !isDeepStrictEqual(identity.artifactsAfter, manifest.packageArtifacts)) {
      addBlocker(blockers, "Report package artifact inventory does not match the manifest")
    }
  } catch (error) {
    addBlocker(blockers, `Could not verify report or package source identity: ${error instanceof Error ? error.message : String(error)}`)
  }

  const tarballPath = join(bundleDirectory, manifest.tarballName)
  let extractionRoot: string | undefined
  try {
    if (!existsSync(tarballPath)) throw Error(`Tarball ${manifest.tarballName} is missing`)
    if (sha256(readFileSync(tarballPath)) !== manifest.tarballSha256) throw Error("Tarball SHA-256 hash does not match the manifest")

    const archiveEntries = execFileSync("tar", ["-tzf", tarballPath], { encoding: "utf8" })
      .split(/\r?\n/u).filter(Boolean)
    if (archiveEntries.some(path => path.startsWith("/") || path.split("/").some(segment => segment === "..") || !path.startsWith("package/"))) {
      throw Error("Tarball contains a path outside the package root")
    }

    extractionRoot = mkdtempSync(join(tmpdir(), "crumbs-release-tarball-"))
    execFileSync("tar", ["-xzf", tarballPath, "-C", extractionRoot], { stdio: "ignore" })
    const unpackedPackageRoot = join(extractionRoot, "package")
    const tarballIdentity = readPackageIdentity(unpackedPackageRoot)
    if (tarballIdentity.name !== manifest.packageName) addBlocker(blockers, "Tarball package name does not match the manifest")
    if (tarballIdentity.version !== manifest.packageVersion) addBlocker(blockers, "Tarball package version does not match the manifest")
    const unpackedArtifacts = packageArtifactInventory(unpackedPackageRoot)
    if (!isDeepStrictEqual(unpackedArtifacts, manifest.packageArtifacts)) {
      addBlocker(blockers, "Tarball package/dist inventory does not match the measured report artifacts")
    }
    const reportVerification = verifyReleaseHostBudgetReport({
      reportDirectory: reportRoot,
      repositoryRoot,
      expectedRevision: manifest.sourceRevision,
      expectedArtifacts: unpackedArtifacts,
      checkCurrentArtifacts: false,
    })
    if (reportVerification.sourceDigest !== manifest.sourceDigest) {
      addBlocker(blockers, "Host-budget report source digest does not match the qualification manifest")
    }
    blockers.push(...reportVerification.blockers.map(blocker => `Host-budget report is not release-qualified: ${blocker}`))
  } catch (error) {
    addBlocker(blockers, `Could not verify package tarball: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    if (extractionRoot) rmSync(extractionRoot, { recursive: true, force: true })
  }

  return { valid: blockers.length === 0, blockers }
}


function parseCliOptions(args: readonly string[], allowed: readonly string[]): Record<string, string> {
  const options: Record<string, string> = {}
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]
    const value = args[index + 1]
    if (!key || !allowed.includes(key) || !value || value.startsWith("--") || options[key]) {
      throw Error(`Expected unique flag/value pairs from: ${allowed.join(", ")}`)
    }
    options[key] = value
  }
  for (const key of allowed) if (!options[key]) throw Error(`Required option ${key} is missing`)
  return options
}

function runQualificationArtifactCli(): void {
  const repositoryRoot = resolve(import.meta.dir, "..")
  const [command, ...args] = process.argv.slice(2)
  if (command === "create") {
    const options = parseCliOptions(args, ["--tag", "--revision", "--report", "--tarball", "--bundle"])
    const bundleDirectory = resolve(options["--bundle"]!)
    const reportSource = resolve(options["--report"]!)
    const reportDirectory = join(bundleDirectory, "host-report")
    const tarballPath = resolve(options["--tarball"]!)
    if (dirname(tarballPath) !== bundleDirectory) throw Error("Qualified tarball must be in the qualification bundle directory")
    mkdirSync(bundleDirectory, { recursive: true })
    if (existsSync(join(bundleDirectory, "manifest.json"))) throw Error("Refusing to replace an existing qualification manifest")
    if (existsSync(reportDirectory)) {
      if (!isDeepStrictEqual(collectDirectoryFiles(reportSource), collectDirectoryFiles(reportDirectory))) {
        throw Error("Staged host report does not match the measured report directory")
      }
    } else {
      cpSync(reportSource, reportDirectory, { recursive: true, errorOnExist: true })
    }
    const sourceRevision = options["--revision"]!
    const sourceDigest = captureGuaranteesSourceIdentity(repositoryRoot).sha256
    const manifest = createReleaseQualificationManifest({
      releaseTag: options["--tag"]!,
      sourceRevision,
      sourceDigest,
      host: collectReleaseHostEnvironment(repositoryRoot),
      reportDirectory,
      packageRoot: join(repositoryRoot, "packages/css"),
      tarballPath,
    })
    writeFileSync(join(bundleDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
    console.log(`Created qualification manifest for ${manifest.releaseTag} at ${manifest.sourceRevision}`)
    return
  }

  if (command === "verify") {
    const options = parseCliOptions(args, ["--bundle", "--tag", "--revision"])
    const result = verifyReleaseQualificationBundle({
      bundleDirectory: resolve(options["--bundle"]!),
      repositoryRoot,
      expectedTag: options["--tag"]!,
      expectedRevision: options["--revision"]!,
    })
    console.log(result.valid ? "Release qualification bundle verified" : "Release qualification bundle is blocked")
    for (const blocker of result.blockers) console.error(`- ${blocker}`)
    if (!result.valid) process.exitCode = 1
    return
  }

  throw Error("Usage: bun scripts/release-qualification-artifact.ts <create|verify> [options]")
}

if (import.meta.main) {
  try {
    runQualificationArtifactCli()
  } catch (error) {
    console.error(`Release qualification artifact failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
