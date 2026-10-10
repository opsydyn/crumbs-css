import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { appendFileSync, chmodSync, copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import {scanRuntimeGraphEvidence} from "../bench/runtime-graph-budget"
import { summarizeLoadSamples } from "../bench/effect-boundary-audit"
import { budgetRegistryCodec, compareRecordedMetrics } from "../bench/budget-contract"
import { captureGuaranteesSourceIdentity } from "../../../scripts/guarantees-matrix/source-identity"
import { approvedReleaseHostEnvironment } from "../../../scripts/release-host-environment"
import {
  createReleaseQualificationManifest,
  verifyReleaseQualificationBundle,
} from "../../../scripts/release-qualification-artifact"

import { captureHostBudgetPolicyBinding, evaluateReleaseHostBudgetRows, loadHostBudgetPolicy } from "../../../scripts/release-host-budget-policy"
import { verifyReleaseHostBudgetReport } from "../../../scripts/release-host-budget-report"

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
  comparison.formatVersion = 3
  comparison.policy = captureHostBudgetPolicyBinding(repositoryRoot)
  comparison.performanceQualified = result.performanceQualified
  comparison.metrics = result.metrics
  Object.assign(comparison, evaluateReleaseHostBudgetRows(result.metrics, loadHostBudgetPolicy(repositoryRoot)))
  writeJson(join(reportDirectory, "comparison.json"), comparison)
}

function makePassingSyntheticReport(reportDirectory: string): void {
  const comparison = readJson(join(reportDirectory, "comparison.json"))
  comparison.sourceRevision = expectedRevision
  writeJson(join(reportDirectory, "comparison.json"), comparison)

  const runtimeInitialization = readJson(join(reportDirectory, "runtime-initialization.json"))
  runtimeInitialization.sourceRevision = expectedRevision
  for (const scenario of runtimeInitialization.scenarios) {
    // This fixture is deliberately synthetic; bind it to the package under test.
    scenario.entrySha256 = hash(readFileSync(join(packageRoot,"dist",`theme.${scenario.format === "esm" ? "mjs" : "cjs"}`)))
    for (const sample of scenario.samples) sample.loadMs = 1000000
    scenario.summary = summarizeLoadSamples(scenario.samples)
  }
  writeJson(join(reportDirectory, "runtime-initialization.json"), runtimeInitialization)

  const runtimeGraph = scanRuntimeGraphEvidence(packageRoot, 5)
  runtimeGraph.sourceRevision = expectedRevision
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
  expect(resultingComparison.releasePolicyQualified).toBe(true)
  expect(resultingComparison.advisory.failIds).toHaveLength(8)
  expect(resultingComparison.performanceQualified).toBe(false)
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
  const registry = budgetRegistryCodec.decodeJson(readFileSync(join(repositoryRoot, "packages/css/bench/budgets.json"), "utf8"))
  if (!registry.ok) throw Error("Could not decode the checked-in budget registry")
  const evidencePaths = [...registry.value.metrics, ...registry.value.diagnostics]
    .flatMap(metric => "evidence" in metric.baseline ? [metric.baseline.evidence] : [])
  const approvalPaths = loadHostBudgetPolicy(repositoryRoot).baselineFiles.map(file => file.path)
  // Mirror every source-identity input plus every measured/approval baseline.
  // Unrelated archived docs are not release inputs and need not be copied.
  for (const path of new Set([...sourceIdentity.files.map(file => file.path), ...evidencePaths, ...approvalPaths])) {
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
  identity.policyBefore = captureHostBudgetPolicyBinding(repositoryRoot)
  identity.policyAfter = identity.policyBefore
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

  it("refuses to seal a report whose blocking host measurements exceed an approved budget", () => {
    const root = mkdtempSync(join(tmpdir(), "crumbs-release-qualification-failed-report-"))
    temporaryRoots.push(root)
    const reportDirectory = join(root, "host-report")
    cpSync(validReportDirectory, reportDirectory, { recursive: true })
    const benchmark = readJson(join(reportDirectory, "benchmark-summary.json"))
    for (const row of benchmark.results) if (row.name.startsWith("warm transform ")) row.runBatchMeanP50Ms = row.runBatchMeanP50Ms.map(() => 100)
    writeJson(join(reportDirectory, "benchmark-summary.json"), benchmark)
    rederiveComparison(reportDirectory)

    expect(() => createReleaseQualificationManifest({
      releaseTag: expectedTag,
      sourceRevision: expectedRevision,
      sourceDigest: sourceIdentity.sha256,
      host: approvedReleaseHostEnvironment,
      reportDirectory,
      packageRoot,
      tarballPath: validTarballPath,
    })).toThrow(/warm-transform-ms.*fail|not release-qualified/i)
  })

  it("rejects consistently hashed failed measurements and forged comparison rows", () => {
    const failedBundle = copyBundle()
    const failedReport = join(failedBundle, "host-report")
    const benchmark = readJson(join(failedReport, "benchmark-summary.json"))
    for (const row of benchmark.results) if (row.name.startsWith("warm transform ")) row.runBatchMeanP50Ms = row.runBatchMeanP50Ms.map(() => 100)
    writeJson(join(failedReport, "benchmark-summary.json"), benchmark)
    rederiveComparison(failedReport)
    resealReportHashes(failedBundle)
    const failed = verifyReleaseQualificationBundle({
      bundleDirectory: failedBundle,
      repositoryRoot,
      expectedTag,
      expectedRevision,
    })
    expect(failed.valid).toBe(false)
    expect(failed.blockers.join("\n")).toMatch(/warm-transform-ms is fail/i)

    const forgedBundle = copyBundle()
    const forgedComparisonPath = join(forgedBundle, "host-report/comparison.json")
    const forgedComparison = readJson(forgedComparisonPath)
    forgedComparison.metrics[0].result = "pass"
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

describe("consumer policy handoff integrity", () => {
  it("uses comparison 3 and manifest 2 without erasing advisory numerical failures", () => {
    const comparison = readJson(join(validReportDirectory, "comparison.json"))
    const manifest = readJson(join(validBundleDirectory, "manifest.json"))
    expect(comparison.formatVersion).toBe(3)
    expect(manifest.formatVersion).toBe(2)
    expect(manifest.policy).toEqual(comparison.policy)
    expect(comparison.advisory.failIds).toHaveLength(8)
    expect(comparison.performanceQualified).toBe(false)
    expect(verifyReleaseHostBudgetReport({ reportDirectory: validReportDirectory, repositoryRoot, expectedRevision }).releasePolicyQualified).toBe(true)
  })
  it("rejects resealed summaries, rows, legacy formats and bindings at report and publisher boundaries", () => {
    const mutations: Array<(comparison: any, identity: any) => void> = [
      c => { c.formatVersion = 2 },
      c => { delete c.policy },
      c => { c.policy.policySha256 = "0".repeat(64) },
      c => { c.policy.registrySha256 = "0".repeat(64) },
      c => { c.policy.policyId = "other" },
      c => { c.releasePolicyQualified = false },
      c => { c.advisory.failIds = [] },
      c => { c.blocking.passIds = [] },
      c => { c.blockers = ["fabricated"] },
      c => { c.metrics[0].enforcement = "blocking" },
      c => { c.metrics[0].result = "incomplete-environment-mismatch" },
      c => { c.metrics.shift() },
      c => { c.metrics.push(c.metrics[0]) },
      c => { c.metrics.push({ id: "unknown", result: "pass" }) },
      (_, i) => { delete i.policyBefore },
      (_, i) => { i.policyAfter.policySha256 = "1".repeat(64) },
    ]
    for (const mutate of mutations) {
      const bundle = copyBundle()
      const report = join(bundle, "host-report")
      const comparison = readJson(join(report, "comparison.json")), identity = readJson(join(report, "input-identity.json"))
      mutate(comparison, identity)
      writeJson(join(report, "comparison.json"), comparison)
      writeJson(join(report, "input-identity.json"), identity)
      resealReportHashes(bundle)
      expect(verifyReleaseHostBudgetReport({ reportDirectory: report, repositoryRoot, expectedRevision }).releasePolicyQualified).toBe(false)
      expect(verifyReleaseQualificationBundle({ bundleDirectory: bundle, repositoryRoot, expectedTag, expectedRevision }).valid).toBe(false)
    }
  })
  it("rejects resealed missing or unmatched advisory raw evidence", () => {
    for (const file of ["runtime-initialization.json", "runtime-graph.json"]) {
      for (const mode of ["missing", "malformed", "unmatched"]) {
        const bundle = copyBundle(), report = join(bundle, "host-report")
        if (mode === "missing") rmSync(join(report, file))
        else if (mode === "malformed") writeJson(join(report, file), {})
        else {
          const raw = readJson(join(report, file))
          raw.environment = { ...raw.environment, architecture: "unmatched" }
          writeJson(join(report, file), raw)
        }
        if (mode !== "missing") resealReportHashes(bundle)
        else {
          const manifest = readJson(join(bundle, "manifest.json"))
          manifest.reportFiles = manifest.reportFiles.filter((row: any) => row.path !== file)
          manifest.reportDigest = hash(JSON.stringify(manifest.reportFiles))
          writeJson(join(bundle, "manifest.json"), manifest)
        }
        expect(verifyReleaseHostBudgetReport({ reportDirectory: report, repositoryRoot, expectedRevision }).releasePolicyQualified).toBe(false)
        expect(verifyReleaseQualificationBundle({ bundleDirectory: bundle, repositoryRoot, expectedTag, expectedRevision }).valid).toBe(false)
      }
    }
  })
  it("rejects old manifests and a manifest binding different from the report", () => {
    for (const mutate of [(m: any) => { m.formatVersion = 1 }, (m: any) => { delete m.policy }, (m: any) => { m.policy.policySha256 = "0".repeat(64) }]) {
      const bundle = copyBundle(), manifest = readJson(join(bundle, "manifest.json"))
      mutate(manifest)
      writeJson(join(bundle, "manifest.json"), manifest)
      expect(verifyReleaseQualificationBundle({ bundleDirectory: bundle, repositoryRoot, expectedTag, expectedRevision }).valid).toBe(false)
    }
  })
})

describe("consumer policy CLI diagnostics", () => {
  it("shows the valid advisory failures and a distinct release-policy status", () => {
    const result = Bun.spawnSync([process.execPath, "scripts/check-release-host-budgets.ts"], {
      cwd: repositoryRoot, env: { ...process.env, CRUMBS_HOST_BUDGET_REPORT: validReportDirectory },
    })
    expect(result.exitCode).toBe(0)
    const output = result.stdout.toString() + result.stderr.toString()
    expect(output).toContain("releasePolicyQualified=true")
    expect(output).toContain("Blocking: 11 pass, 0 fail, 0 incomplete")
    expect(output).toContain("Advisory: 2 pass, 8 fail, 0 incomplete")
    for (const id of readJson(join(validReportDirectory, "comparison.json")).advisory.failIds) expect(output).toContain(id)
    expect(output).not.toMatch(/all budgets passed/i)
  })
})

describe("checked-out approval pins at both job boundaries", () => {
  it("rejects a changed policy role even after resealing every binding and source identity", () => {
    const root = mirrorTrackedRepositoryWithoutDist(), bundle = copyBundle(), report = join(bundle, "host-report")
    const policyPath = join(root, "scripts/release-host-budget-policy.json")
    const policy = readJson(policyPath)
    policy.metrics.find((row: any) => row.id === "warm-transform-ms").enforcement = "advisory"
    writeJson(policyPath, policy)
    const binding = { policyId: policy.policyId, policySha256: hash(readFileSync(policyPath)), registrySha256: policy.registrySha256 }
    const source = captureGuaranteesSourceIdentity(root)
    const comparison = readJson(join(report, "comparison.json")), identity = readJson(join(report, "input-identity.json")), manifest = readJson(join(bundle, "manifest.json"))
    comparison.policy = binding
    identity.policyBefore = binding; identity.policyAfter = binding
    identity.sourceBefore = source; identity.sourceAfter = source
    manifest.policy = binding; manifest.sourceDigest = source.sha256
    writeJson(join(report, "comparison.json"), comparison); writeJson(join(report, "input-identity.json"), identity); writeJson(join(bundle, "manifest.json"), manifest)
    resealReportHashes(bundle)
    const checked = verifyReleaseHostBudgetReport({ reportDirectory: report, repositoryRoot: root, expectedRevision, checkCurrentArtifacts: false, artifactDirectory: join(packageRoot, "dist"), expectedArtifacts: manifest.packageArtifacts })
    expect(checked.releasePolicyQualified).toBe(false)
    expect(checked.blockers.join("\n")).toMatch(/approved partition/)
    const published = verifyReleaseQualificationBundle({ bundleDirectory: bundle, repositoryRoot: root, expectedTag, expectedRevision })
    expect(published.valid).toBe(false)
    expect(published.blockers.join("\n")).toMatch(/approved partition/)
  })
  it("rejects baseline whitespace edits with unchanged numerical medians", () => {
    const root = mirrorTrackedRepositoryWithoutDist()
    appendFileSync(join(root, "docs/evidence/2026-09-15-runtime-initialization/baseline.json"), "\n")
    const manifest = readJson(join(validBundleDirectory, "manifest.json"))
    const checked = verifyReleaseHostBudgetReport({ reportDirectory: validReportDirectory, repositoryRoot: root, expectedRevision, checkCurrentArtifacts: false, artifactDirectory: join(packageRoot, "dist"), expectedArtifacts: manifest.packageArtifacts })
    expect(checked.releasePolicyQualified).toBe(false)
    expect(checked.blockers.join("\n")).toMatch(/baseline evidence bytes changed/)
    const published = verifyReleaseQualificationBundle({ bundleDirectory: validBundleDirectory, repositoryRoot: root, expectedTag, expectedRevision })
    expect(published.valid).toBe(false)
    expect(published.blockers.join("\n")).toMatch(/baseline evidence bytes changed/)
  })
  it("uses the transferred tarball when the publisher has a different local dist", () => {
    const root = mirrorTrackedRepositoryWithoutDist()
    mkdirSync(join(root, "packages/css/dist"))
    writeFileSync(join(root, "packages/css/dist/theme.mjs"), "different local build")
    expect(verifyReleaseQualificationBundle({ bundleDirectory: validBundleDirectory, repositoryRoot: root, expectedTag, expectedRevision })).toEqual({ valid: true, blockers: [] })
  })
})

describe("runtime raw evidence integrity at both release jobs", () => {
  it("rejects rederived and resealed malformed runtime evidence", () => {
    const mutations: Array<[string, (raw: any) => void]> = [
      ["runtime-graph.json", r => { delete r.currentGraphs["theme-core"].esm.graphBytes; delete r.currentGraphs["theme-core"].esm.artifacts }],
      ["runtime-graph.json", r => { r.currentGraphs["theme-core"].esm.artifacts.push(r.currentGraphs["theme-core"].esm.artifacts[0]) }],
      ["runtime-graph.json", r => { r.currentGraphs["theme-core"].esm.samples[0] += 1 }],
      ["runtime-graph.json", r => { r.currentGraphs["theme-core"].esm.samples = [-1.5, -1.5, -1.5, -1.5, -1.5]; r.currentGraphs["theme-core"].esm.graphBytes = -1.5 }],
      ["runtime-graph.json", r => { r.currentGraphs.extra = r.currentGraphs.tokens }],
      ["runtime-graph.json", r => { r.currentGraphs["theme-core"].esm.artifacts[0].sha256 = "0".repeat(64) }],
      ["runtime-graph.json", r => { const g = r.currentGraphs["theme-core"].esm; g.graphBytes += 1; g.samples = g.samples.map(() => g.graphBytes); g.artifacts[0].bytes += 1 }],
      ["runtime-initialization.json", r => { r.scenarios[0].samples.forEach((s: any) => { s.loadMs = -1 }); r.scenarios[0].summary = summarizeLoadSamples(r.scenarios[0].samples) }],
      ["runtime-initialization.json", r => { r.scenarios[0].entrySha256 = "0".repeat(64) }],
      ["runtime-initialization.json", r => { r.scenarios[0].samples[0].receipt = "failed" }],
      ["runtime-initialization.json", r => { r.scenarios[0].samples[0].node = "v0.0.0" }],
      ["runtime-initialization.json", r => { r.scenarios[0].summary.loadMs.median = 0 }],
      ["runtime-initialization.json", r => { r.scenarios[0].warmup.excluded = false }],
    ]
    for (const [file, mutate] of mutations) {
      const bundle = copyBundle(), report = join(bundle, "host-report"), raw = readJson(join(report, file))
      mutate(raw)
      writeJson(join(report, file), raw)
      rederiveComparison(report)
      resealReportHashes(bundle)
      const checked = verifyReleaseHostBudgetReport({ reportDirectory: report, repositoryRoot, expectedRevision })
      expect(checked.releasePolicyQualified, file).toBe(false)
      expect(checked.blockers.join("\n")).toMatch(/runtime.*evidence|runtime.*artifact|runtime.*summary/i)
      const published = verifyReleaseQualificationBundle({ bundleDirectory: bundle, repositoryRoot, expectedTag, expectedRevision })
      expect(published.valid).toBe(false)
      expect(published.blockers.join("\n")).toMatch(/runtime.*evidence|runtime.*artifact|runtime.*summary/i)
    }
  })
})
