import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { appendFileSync, chmodSync, copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { budgetRegistryCodec, compareRecordedMetrics } from "../bench/budget-contract"
import { captureGuaranteesSourceIdentity } from "../../../scripts/guarantees-matrix/source-identity"
import { approvedReleaseHostEnvironment } from "../../../scripts/release-host-environment"
import {
  createReleaseQualificationManifest,
  verifyReleaseQualificationBundle,
} from "../../../scripts/release-qualification-artifact"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const packageRoot = resolve(repositoryRoot, "packages/css")
const retainedReportDirectory = resolve(
  repositoryRoot,
  "docs/evidence/2026-10-07-m10-5-current-host-budget-requalification/host-budgets",
)
const incrementalBaselinePath = resolve(
  repositoryRoot,
  "docs/evidence/2026-09-21-m4-6-incremental-baseline/metro-incremental.json",
)
const reportFiles = [
  "comparison.json",
  "input-identity.json",
  "effect.json",
  "runtime-graph.json",
  "runtime-initialization.json",
  "benchmark-summary.json",
  "metro-incremental.json",
  "editor.json",
] as const
const expectedTag = `v${readJson(join(packageRoot, "package.json")).version}`
const expectedRevision = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: repositoryRoot }).stdout.toString().trim()
const sourceIdentity = captureGuaranteesSourceIdentity(repositoryRoot)
const temporaryRoots: string[] = []
let validBundleDirectory: string
let validTarballPath: string
let validReportDirectory: string

afterAll(() => {
  for (const path of temporaryRoots) rmSync(path, { recursive: true, force: true })
})

function hash(bytes: string | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n")
}

function distInventory(root: string) {
  const dist = join(root, "dist")
  return readdirSync(dist).sort().filter(path => !path.endsWith(".map")).map(path => ({
    path,
    sha256: hash(readFileSync(join(dist, path))),
  }))
}

function rederiveComparison(reportDirectory: string): void {
  const comparison = readJson(join(reportDirectory, "comparison.json"))
  const registry = budgetRegistryCodec.decodeJson(readFileSync(join(repositoryRoot, "packages/css/bench/budgets.json"), "utf8"))
  if (!registry.ok) throw Error("Could not decode the checked-in budget registry")
  const result = compareRecordedMetrics(registry.value, repositoryRoot, {
    effect: readJson(join(reportDirectory, "effect.json")),
    runtimeGraph: readJson(join(reportDirectory, "runtime-graph.json")),
    runtimeInit: readJson(join(reportDirectory, "runtime-initialization.json")),
    benchmark: readJson(join(reportDirectory, "benchmark-summary.json")),
    incremental: readJson(join(reportDirectory, "metro-incremental.json")),
    editor: readJson(join(reportDirectory, "editor.json")),
  })
  comparison.metrics = result.metrics
  writeJson(join(reportDirectory, "comparison.json"), comparison)
}

function makePassingSyntheticReport(reportDirectory: string): void {
  const comparison = readJson(join(reportDirectory, "comparison.json"))
  comparison.sourceRevision = expectedRevision
  writeJson(join(reportDirectory, "comparison.json"), comparison)

  const runtimeInitialization = readJson(join(reportDirectory, "runtime-initialization.json"))
  for (const scenario of runtimeInitialization.scenarios) {
    for (const sample of scenario.samples) sample.loadMs = 0.1
  }
  writeJson(join(reportDirectory, "runtime-initialization.json"), runtimeInitialization)

  const runtimeGraph = readJson(join(reportDirectory, "runtime-graph.json"))
  for (const entrypoint of ["theme-core", "tokens", "theme"]) {
    for (const format of ["esm", "cjs"]) {
      runtimeGraph.currentGraphs[entrypoint][format].samples = runtimeGraph.currentGraphs[entrypoint][format].samples.map(() => 1)
    }
  }
  writeJson(join(reportDirectory, "runtime-graph.json"), runtimeGraph)

  const benchmark = readJson(join(reportDirectory, "benchmark-summary.json"))
  for (const result of benchmark.results) {
    if (result.name.startsWith("warm transform ")) result.runBatchMeanP50Ms = result.runBatchMeanP50Ms.map(() => 0.1)
  }
  writeJson(join(reportDirectory, "benchmark-summary.json"), benchmark)

  cpSync(incrementalBaselinePath, join(reportDirectory, "metro-incremental.json"))
  rederiveComparison(reportDirectory)
  const resultingComparison = readJson(join(reportDirectory, "comparison.json"))
  expect(resultingComparison.metrics).toHaveLength(21)
  expect(resultingComparison.metrics.every((metric: { result: string }) => metric.result === "pass")).toBe(true)
}

function resealReportHashes(bundleDirectory: string): void {
  const manifestPath = join(bundleDirectory, "manifest.json")
  const manifest = readJson(manifestPath)
  manifest.reportFiles = reportFiles.map(path => ({
    path,
    sha256: hash(readFileSync(join(bundleDirectory, "host-report", path))),
  })).sort((left: { path: string }, right: { path: string }) => left.path.localeCompare(right.path))
  manifest.reportDigest = hash(JSON.stringify(manifest.reportFiles))
  writeJson(manifestPath, manifest)
}

function mirrorTrackedRepositoryWithoutDist(): string {
  const root = mkdtempSync(join(tmpdir(), "crumbs-publisher-no-dist-"))
  temporaryRoots.push(root)
  symlinkSync(resolve(repositoryRoot, ".git"), join(root, ".git"))
  const trackedPaths = execFileSync("git", ["ls-files", "--cached", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).split("\0").filter(Boolean)
  for (const path of trackedPaths) {
    const source = join(repositoryRoot, path)
    const destination = join(root, path)
    const stat = lstatSync(source)
    mkdirSync(join(destination, ".."), { recursive: true })
    if (stat.isSymbolicLink()) {
      symlinkSync(readlinkSync(source), destination)
    } else {
      copyFileSync(source, destination)
      chmodSync(destination, stat.mode & 0o777)
    }
  }
  return root
}

async function makeValidBundle(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "crumbs-release-qualification-"))
  temporaryRoots.push(root)
  validBundleDirectory = join(root, "bundle")
  const reportDirectory = join(validBundleDirectory, "host-report")
  validReportDirectory = reportDirectory
  const testPackageRoot = join(root, "package")
  mkdirSync(reportDirectory, { recursive: true })
  mkdirSync(testPackageRoot, { recursive: true })

  for (const file of reportFiles) cpSync(join(retainedReportDirectory, file), join(reportDirectory, file))
  makePassingSyntheticReport(reportDirectory)

  const identity = readJson(join(reportDirectory, "input-identity.json"))
  const artifacts = distInventory(packageRoot)
  identity.sourceBefore = sourceIdentity
  identity.sourceAfter = sourceIdentity
  identity.artifactsBefore = artifacts
  identity.artifactsAfter = artifacts
  writeJson(join(reportDirectory, "input-identity.json"), identity)

  const packageManifest = readJson(join(packageRoot, "package.json"))
  packageManifest.scripts = {
    ...packageManifest.scripts,
    prepack: "node -e \"require('node:fs').writeFileSync('PREPACK_RAN', 'yes')\"",
  }
  writeJson(join(testPackageRoot, "package.json"), packageManifest)
  for (const file of ["COMPATIBILITY.md", "LICENSE", "README.md"]) {
    cpSync(join(packageRoot, file), join(testPackageRoot, file))
  }
  cpSync(join(packageRoot, "dist"), join(testPackageRoot, "dist"), { recursive: true })
  const beforePack = distInventory(testPackageRoot)

  const npmCache = join(root, "npm-cache")
  const npmUserConfig = join(root, "npmrc-user")
  const npmGlobalConfig = join(root, "npmrc-global")
  writeFileSync(npmUserConfig, "")
  writeFileSync(npmGlobalConfig, "")
  const pack = Bun.spawnSync(
    ["npm", "pack", "--ignore-scripts", "--json", "--pack-destination", validBundleDirectory],
    {
      cwd: testPackageRoot,
      env: {
        PATH: process.env.PATH ?? "",
        HOME: root,
        npm_config_cache: npmCache,
        npm_config_userconfig: npmUserConfig,
        npm_config_globalconfig: npmGlobalConfig,
      },
    },
  )
  if (pack.exitCode !== 0) throw Error(pack.stderr.toString() || pack.stdout.toString())
  const packed = JSON.parse(pack.stdout.toString()) as Array<{ filename: string }>
  validTarballPath = join(validBundleDirectory, packed[0]!.filename)
  expect(existsSync(join(testPackageRoot, "PREPACK_RAN"))).toBe(false)
  expect(distInventory(testPackageRoot)).toEqual(beforePack)

  const manifest = createReleaseQualificationManifest({
    releaseTag: expectedTag,
    sourceRevision: expectedRevision,
    sourceDigest: sourceIdentity.sha256,
    host: approvedReleaseHostEnvironment,
    reportDirectory,
    packageRoot: testPackageRoot,
    tarballPath: validTarballPath,
  })
  writeJson(join(validBundleDirectory, "manifest.json"), manifest)
}

function copyBundle(): string {
  const root = mkdtempSync(join(tmpdir(), "crumbs-release-qualification-mutation-"))
  temporaryRoots.push(root)
  const destination = join(root, "bundle")
  cpSync(validBundleDirectory, destination, { recursive: true })
  return destination
}

beforeAll(makeValidBundle)

describe("M10.5 release qualification artifact", () => {
  it("accepts a complete report and exact package tarball without running package lifecycle scripts", () => {
    const result = verifyReleaseQualificationBundle({
      bundleDirectory: validBundleDirectory,
      repositoryRoot,
      expectedTag,
      expectedRevision,
    })
    expect(result).toEqual({ valid: true, blockers: [] })
  })

  it("accepts the qualified bundle from a publisher checkout that has no built dist directory", () => {
    const publisherRepository = mirrorTrackedRepositoryWithoutDist()
    expect(existsSync(join(publisherRepository, "packages/css/dist"))).toBe(false)
    const result = verifyReleaseQualificationBundle({
      bundleDirectory: validBundleDirectory,
      repositoryRoot: publisherRepository,
      expectedTag,
      expectedRevision,
    })
    expect(result).toEqual({ valid: true, blockers: [] })
  })

  it("refuses to seal a report whose raw host measurements exceed an approved budget", () => {
    const root = mkdtempSync(join(tmpdir(), "crumbs-release-qualification-failed-report-"))
    temporaryRoots.push(root)
    const reportDirectory = join(root, "host-report")
    cpSync(validReportDirectory, reportDirectory, { recursive: true })
    const runtimeInitialization = readJson(join(reportDirectory, "runtime-initialization.json"))
    for (const sample of runtimeInitialization.scenarios[0].samples) sample.loadMs = 100
    writeJson(join(reportDirectory, "runtime-initialization.json"), runtimeInitialization)
    rederiveComparison(reportDirectory)

    expect(() => createReleaseQualificationManifest({
      releaseTag: expectedTag,
      sourceRevision: expectedRevision,
      sourceDigest: sourceIdentity.sha256,
      host: approvedReleaseHostEnvironment,
      reportDirectory,
      packageRoot,
      tarballPath: validTarballPath,
    })).toThrow(/runtime-initialization-node22-esm.*fail|not release-qualified/i)
  })

  it("rejects consistently hashed failed measurements and forged comparison rows", () => {
    const failedBundle = copyBundle()
    const failedReport = join(failedBundle, "host-report")
    const runtimeInitialization = readJson(join(failedReport, "runtime-initialization.json"))
    for (const sample of runtimeInitialization.scenarios[0].samples) sample.loadMs = 100
    writeJson(join(failedReport, "runtime-initialization.json"), runtimeInitialization)
    rederiveComparison(failedReport)
    resealReportHashes(failedBundle)
    const failed = verifyReleaseQualificationBundle({
      bundleDirectory: failedBundle,
      repositoryRoot,
      expectedTag,
      expectedRevision,
    })
    expect(failed.valid).toBe(false)
    expect(failed.blockers.join("\n")).toMatch(/runtime-initialization-node22-esm is fail/i)

    const forgedBundle = copyBundle()
    const forgedComparisonPath = join(forgedBundle, "host-report/comparison.json")
    const forgedComparison = readJson(forgedComparisonPath)
    forgedComparison.metrics[0].result = "fail"
    writeJson(forgedComparisonPath, forgedComparison)
    resealReportHashes(forgedBundle)
    const forged = verifyReleaseQualificationBundle({
      bundleDirectory: forgedBundle,
      repositoryRoot,
      expectedTag,
      expectedRevision,
    })
    expect(forged.valid).toBe(false)
    expect(forged.blockers.join("\n")).toMatch(/stored metric rows differ from rederived rows/i)
  })

  it("exposes the same verification through the publisher CLI", () => {
    const result = Bun.spawnSync([
      process.execPath,
      "scripts/release-qualification-artifact.ts",
      "verify",
      "--bundle",
      validBundleDirectory,
      "--tag",
      expectedTag,
      "--revision",
      expectedRevision,
    ], { cwd: repositoryRoot })
    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toContain("Release qualification bundle verified")
  })

  it("requires the explicit Node floor when sealing through the create CLI", () => {
    const root = mkdtempSync(join(tmpdir(), "crumbs-release-qualification-cli-floor-"))
    temporaryRoots.push(root)
    const bundleDirectory = join(root, "bundle")
    const reportDirectory = join(root, "report")
    mkdirSync(bundleDirectory, { recursive: true })
    cpSync(validReportDirectory, reportDirectory, { recursive: true })
    const tarballPath = join(bundleDirectory, "fixture.tgz")
    writeFileSync(tarballPath, "unused because host collection must fail first")

    const result = Bun.spawnSync([
      process.execPath,
      "scripts/release-qualification-artifact.ts",
      "create",
      "--tag",
      expectedTag,
      "--revision",
      expectedRevision,
      "--report",
      reportDirectory,
      "--tarball",
      tarballPath,
      "--bundle",
      bundleDirectory,
    ], {
      cwd: repositoryRoot,
      env: { ...process.env, CRUMBS_AUDIT_NODE_FLOOR: "" },
    })
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString() + result.stdout.toString()).toMatch(/CRUMBS_AUDIT_NODE_FLOOR.*explicit Node 22\.0\.0/i)
  })

  it("rejects changed report files and tarball bytes", () => {
    const changedReportDirectory = copyBundle()
    appendFileSync(join(changedReportDirectory, "host-report/editor.json"), "\n")
    const changedReport = verifyReleaseQualificationBundle({
      bundleDirectory: changedReportDirectory,
      repositoryRoot,
      expectedTag,
      expectedRevision,
    })
    expect(changedReport.valid).toBe(false)
    expect(changedReport.blockers.join("\n")).toMatch(/report.*(hash|digest|inventory)/i)

    const changedTarballDirectory = copyBundle()
    const tarballName = readJson(join(changedTarballDirectory, "manifest.json")).tarballName
    appendFileSync(join(changedTarballDirectory, tarballName), "changed")
    const changedTarball = verifyReleaseQualificationBundle({
      bundleDirectory: changedTarballDirectory,
      repositoryRoot,
      expectedTag,
      expectedRevision,
    })
    expect(changedTarball.valid).toBe(false)
    expect(changedTarball.blockers.join("\n")).toMatch(/tarball.*(hash|digest)/i)
  })

  it("rejects a tag, commit, or source digest that differs from the verified bundle", () => {
    expect(verifyReleaseQualificationBundle({
      bundleDirectory: validBundleDirectory,
      repositoryRoot,
      expectedTag: "v0.1.1-alpha.2",
      expectedRevision,
    }).blockers.join("\n")).toMatch(/tag/i)

    expect(verifyReleaseQualificationBundle({
      bundleDirectory: validBundleDirectory,
      repositoryRoot,
      expectedTag,
      expectedRevision: "f".repeat(40),
    }).blockers.join("\n")).toMatch(/revision|commit/i)

    const changedSourceDigestDirectory = copyBundle()
    const manifest = readJson(join(changedSourceDigestDirectory, "manifest.json"))
    manifest.sourceDigest = "0".repeat(64)
    writeJson(join(changedSourceDigestDirectory, "manifest.json"), manifest)
    expect(verifyReleaseQualificationBundle({
      bundleDirectory: changedSourceDigestDirectory,
      repositoryRoot,
      expectedTag,
      expectedRevision,
    }).blockers.join("\n")).toMatch(/source digest/i)
  })

  it("rejects package name and version drift", () => {
    const wrongNameDirectory = copyBundle()
    const wrongName = readJson(join(wrongNameDirectory, "manifest.json"))
    wrongName.packageName = "other-package"
    writeJson(join(wrongNameDirectory, "manifest.json"), wrongName)
    expect(verifyReleaseQualificationBundle({
      bundleDirectory: wrongNameDirectory,
      repositoryRoot,
      expectedTag,
      expectedRevision,
    }).blockers.join("\n")).toMatch(/package name/i)

    const wrongVersionDirectory = copyBundle()
    const wrongVersion = readJson(join(wrongVersionDirectory, "manifest.json"))
    wrongVersion.packageVersion = "99.0.0"
    writeJson(join(wrongVersionDirectory, "manifest.json"), wrongVersion)
    expect(verifyReleaseQualificationBundle({
      bundleDirectory: wrongVersionDirectory,
      repositoryRoot,
      expectedTag,
      expectedRevision,
    }).blockers.join("\n")).toMatch(/package version/i)
  })
})
