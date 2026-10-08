import { afterAll, describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { captureGuaranteesSourceIdentity } from "../../../scripts/guarantees-matrix/source-identity"
import { verifyReleaseHostBudgetReport } from "../../../scripts/release-host-budget-report"

import { captureHostBudgetPolicyBinding, evaluateReleaseHostBudgetRows, loadHostBudgetPolicy } from "../../../scripts/release-host-budget-policy"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const retainedReportDirectory = resolve(
  repositoryRoot,
  "docs/evidence/2026-10-07-m10-5-current-host-budget-requalification/host-budgets",
)
const requiredFiles = [
  "comparison.json",
  "input-identity.json",
  "effect.json",
  "runtime-graph.json",
  "runtime-initialization.json",
  "benchmark-summary.json",
  "metro-incremental.json",
  "editor.json",
] as const
const expectedRevision = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).trim()
const currentSourceIdentity = captureGuaranteesSourceIdentity(repositoryRoot)
const currentArtifacts = readdirSync(resolve(repositoryRoot, "packages/css/dist"))
  .sort()
  .filter(path => !path.endsWith(".map"))
  .map(path => ({
    path,
    sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, "packages/css/dist", path))).digest("hex"),
  }))
const temporaryRoots: string[] = []

afterAll(() => {
  for (const path of temporaryRoots) rmSync(path, { recursive: true, force: true })
})

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n")
}

function copyRetainedReport(normalizeIdentity = false): string {
  const root = mkdtempSync(join(tmpdir(), "crumbs-release-host-report-"))
  temporaryRoots.push(root)
  for (const file of requiredFiles) {
    cpSync(join(retainedReportDirectory, file), join(root, file))
  }

  if (normalizeIdentity) {
    const comparison = readJson(join(root, "comparison.json"))
    comparison.sourceRevision = expectedRevision
    comparison.formatVersion = 3
    comparison.policy = captureHostBudgetPolicyBinding(repositoryRoot)
    Object.assign(comparison, evaluateReleaseHostBudgetRows(comparison.metrics, loadHostBudgetPolicy(repositoryRoot)))
    writeJson(join(root, "comparison.json"), comparison)

    const identity = readJson(join(root, "input-identity.json"))
    identity.policyBefore = captureHostBudgetPolicyBinding(repositoryRoot)
    identity.policyAfter = identity.policyBefore
    identity.sourceBefore = currentSourceIdentity
    identity.sourceAfter = currentSourceIdentity
    identity.artifactsBefore = currentArtifacts
    identity.artifactsAfter = currentArtifacts
    writeJson(join(root, "input-identity.json"), identity)
  }

  return root
}

describe("M10.5 release host-budget report verification", () => {
  it("requires an explicit report and every raw measurement", () => {
    const missing = verifyReleaseHostBudgetReport({
      reportDirectory: join(tmpdir(), "crumbs-host-report-does-not-exist"),
      repositoryRoot,
      expectedRevision,
    })
    expect(missing.releasePolicyQualified).toBe(false)
    expect(missing.blockers.join("\n")).toMatch(/comparison\.json/i)

    const incompleteDirectory = copyRetainedReport(true)
    rmSync(join(incompleteDirectory, "editor.json"))
    const incomplete = verifyReleaseHostBudgetReport({
      reportDirectory: incompleteDirectory,
      repositoryRoot,
      expectedRevision,
      expectedArtifacts: currentArtifacts,
    })
    expect(incomplete.releasePolicyQualified).toBe(false)
    expect(incomplete.blockers.join("\n")).toMatch(/editor\.json/i)
  })

  it("rederives the retained comparison and names its nine failures and incomplete row", () => {
    const comparison = readJson(join(retainedReportDirectory, "comparison.json"))
    const result = verifyReleaseHostBudgetReport({
      reportDirectory: retainedReportDirectory,
      repositoryRoot,
      expectedRevision: comparison.sourceRevision,
    })

    expect(result.releasePolicyQualified).toBe(false)
    expect(result.sourceRevision).toBe(comparison.sourceRevision)
    expect(result.blockers.join("\n")).toMatch(/formatVersion must be 3/)
    expect(result.blockers.join("\n")).not.toMatch(/stored metric rows differ from rederived rows/i)
    for (const row of comparison.metrics.filter((metric: { id: string; result: string }) => metric.result !== "pass" && !metric.id.startsWith("runtime-"))) {
      expect(result.blockers.join("\n")).toContain(row.id)
    }
    expect(comparison.metrics.filter((metric: { result: string }) => metric.result === "fail")).toHaveLength(9)
    expect(comparison.metrics.some((metric: { result: string }) => metric.result.startsWith("incomplete-"))).toBe(true)
  })

  it("rejects a raw measurement edit even when the identity fields are otherwise current", () => {
    const reportDirectory = copyRetainedReport(true)
    const runtimeInitialization = readJson(join(reportDirectory, "runtime-initialization.json"))
    runtimeInitialization.scenarios[0].samples[0].loadMs += 3
    writeJson(join(reportDirectory, "runtime-initialization.json"), runtimeInitialization)

    const result = verifyReleaseHostBudgetReport({
      reportDirectory,
      repositoryRoot,
      expectedRevision,
      expectedArtifacts: currentArtifacts,
    })
    expect(result.releasePolicyQualified).toBe(false)
    expect(result.blockers.join("\n")).toMatch(/stored metric rows differ from rederived rows/i)
  })

  it("rejects the wrong release revision and source digest", () => {
    const wrongRevisionDirectory = copyRetainedReport(true)
    const wrongRevision = verifyReleaseHostBudgetReport({
      reportDirectory: wrongRevisionDirectory,
      repositoryRoot,
      expectedRevision: "f".repeat(40),
      expectedArtifacts: currentArtifacts,
    })
    expect(wrongRevision.blockers.join("\n")).toMatch(/source revision/i)

    const wrongDigestDirectory = copyRetainedReport(true)
    const wrongIdentity = readJson(join(wrongDigestDirectory, "input-identity.json"))
    wrongIdentity.sourceBefore.sha256 = "0".repeat(64)
    wrongIdentity.sourceAfter.sha256 = "0".repeat(64)
    wrongIdentity.sourceBefore.files = []
    wrongIdentity.sourceAfter.files = []
    writeJson(join(wrongDigestDirectory, "input-identity.json"), wrongIdentity)
    const wrongDigest = verifyReleaseHostBudgetReport({
      reportDirectory: wrongDigestDirectory,
      repositoryRoot,
      expectedRevision,
      expectedArtifacts: currentArtifacts,
    })
    expect(wrongDigest.blockers.join("\n")).toMatch(/source digest/i)
  })

  it("rejects unstable before-and-after source or artifact identity", () => {
    const sourceDriftDirectory = copyRetainedReport(true)
    const sourceDrift = readJson(join(sourceDriftDirectory, "input-identity.json"))
    sourceDrift.sourceAfter.sha256 = "1".repeat(64)
    writeJson(join(sourceDriftDirectory, "input-identity.json"), sourceDrift)
    const sourceResult = verifyReleaseHostBudgetReport({
      reportDirectory: sourceDriftDirectory,
      repositoryRoot,
      expectedRevision,
      expectedArtifacts: currentArtifacts,
    })
    expect(sourceResult.blockers.join("\n")).toMatch(/source.*drift|before.*after/i)

    const artifactDriftDirectory = copyRetainedReport(true)
    const artifactDrift = readJson(join(artifactDriftDirectory, "input-identity.json"))
    artifactDrift.artifactsAfter[0] = { ...artifactDrift.artifactsAfter[0], sha256: "2".repeat(64) }
    writeJson(join(artifactDriftDirectory, "input-identity.json"), artifactDrift)
    const artifactResult = verifyReleaseHostBudgetReport({
      reportDirectory: artifactDriftDirectory,
      repositoryRoot,
      expectedRevision,
      expectedArtifacts: currentArtifacts,
    })
    expect(artifactResult.blockers.join("\n")).toMatch(/artifact.*drift|before.*after|artifact inventory/i)
  })

  it("rejects stable but changed package artifact hashes", () => {
    const reportDirectory = copyRetainedReport(true)
    const identity = readJson(join(reportDirectory, "input-identity.json"))
    const changed = { ...identity.artifactsAfter[0], sha256: "3".repeat(64) }
    identity.artifactsBefore[0] = changed
    identity.artifactsAfter[0] = changed
    writeJson(join(reportDirectory, "input-identity.json"), identity)

    const result = verifyReleaseHostBudgetReport({
      reportDirectory,
      repositoryRoot,
      expectedRevision,
      expectedArtifacts: currentArtifacts,
    })
    expect(result.blockers.join("\n")).toMatch(/package artifact|artifact inventory/i)
  })

  it("requires a report path at the release-check command boundary", () => {
    const result = Bun.spawnSync(
      [process.execPath, resolve(repositoryRoot, "scripts/check-release-host-budgets.ts")],
      { cwd: repositoryRoot, env: { PATH: process.env.PATH ?? "", CRUMBS_HOST_BUDGET_REPORT: "" } },
    )
    expect(result.exitCode).toBe(1)
    expect(result.stderr.toString() + result.stdout.toString()).toMatch(/CRUMBS_HOST_BUDGET_REPORT/i)
  })
})
