import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  npmDistTagForVersion,
  validatePublishTarget,
} from "../../../scripts/release-preflight"

const repoRoot = resolve(import.meta.dir, "../../..")
const releaseWorkflow = readFileSync(
  resolve(repoRoot, ".github/workflows/release-please.yml"),
  "utf8",
)
const publishWorkflow = readFileSync(
  resolve(repoRoot, ".github/workflows/publish.yml"),
  "utf8",
)
const readme = readFileSync(resolve(repoRoot, "README.md"), "utf8")
const packageCompatibility = readFileSync(
  resolve(repoRoot, "packages/css/COMPATIBILITY.md"),
  "utf8",
)
const publicCompatibility = readFileSync(
  resolve(repoRoot, "docs/src/content/docs/reference/compatibility.mdx"),
  "utf8",
)
const roadmap = readFileSync(resolve(repoRoot, "docs/roadmap.md"), "utf8")

const commit = "0123456789abcdef0123456789abcdef01234567"

function jobBlock(name: string, nextName?: string): string {
  const start = publishWorkflow.indexOf(`  ${name}:\n`)
  if (start === -1) return ""
  const end = nextName ? publishWorkflow.indexOf(`  ${nextName}:\n`, start + 1) : -1
  return publishWorkflow.slice(start, end === -1 ? undefined : end)
}

const qualifyJob = jobBlock("qualify", "publish")
const publishJob = jobBlock("publish")

function publishStep(): string {
  const start = publishJob.indexOf("      - name: Publish to npm\n")
  if (start === -1) return ""
  const next = publishJob.indexOf("\n      - name: ", start + 1)
  return publishJob.slice(start, next === -1 ? undefined : next)
}

describe("M10.5 release policy", () => {
  it("routes prereleases to their channel and stable versions to latest", () => {
    expect(npmDistTagForVersion("0.1.1-alpha.1")).toBe("alpha")
    expect(npmDistTagForVersion("2.0.0-beta.3")).toBe("beta")
    expect(npmDistTagForVersion("1.0.0")).toBe("latest")
  })

  it("rejects malformed or numeric prerelease channels", () => {
    expect(() => npmDistTagForVersion("not-semver")).toThrow(/valid semantic version/i)
    expect(() => npmDistTagForVersion("1.0.0-123")).toThrow(/prerelease channel/i)
    expect(() => npmDistTagForVersion("1.0.0-latest.1")).toThrow(/prerelease channel/i)
  })

  it("requires the release tag to match the package version and checked-out commit", () => {
    expect(validatePublishTarget({
      version: "0.1.1-alpha.1",
      tag: "v0.1.1-alpha.1",
      tagCommit: commit,
      headCommit: commit,
    })).toEqual({
      version: "0.1.1-alpha.1",
      tag: "v0.1.1-alpha.1",
      commit,
      npmTag: "alpha",
    })

    expect(() => validatePublishTarget({
      version: "0.1.1-alpha.1",
      tag: "feature/release",
      tagCommit: commit,
      headCommit: commit,
    })).toThrow(/must match v0\.1\.1-alpha\.1/i)

    expect(() => validatePublishTarget({
      version: "0.1.1-alpha.1",
      tag: "v0.1.1-alpha.2",
      tagCommit: commit,
      headCommit: commit,
    })).toThrow(/must match v0\.1\.1-alpha\.1/i)

    expect(() => validatePublishTarget({
      version: "0.1.1-alpha.1",
      tag: commit,
      tagCommit: commit,
      headCommit: commit,
    })).toThrow(/must match v0\.1\.1-alpha\.1/i)

    expect(() => validatePublishTarget({
      version: "0.1.1-alpha.1",
      tag: "v0.1.1-alpha.1",
      tagCommit: commit,
      headCommit: "abcdef0123456789abcdef0123456789abcdef01",
    })).toThrow(/does not point at the checked-out commit/i)
  })

  it("keeps npm publication out of release-please automation", () => {
    expect(releaseWorkflow).toContain("googleapis/release-please-action@v4")
    expect(releaseWorkflow).not.toMatch(/npm publish|NPM_TOKEN|NODE_AUTH_TOKEN/i)
  })

  it("qualifies on the approved M4 Pro host and records a matched full report", () => {
    expect(qualifyJob).not.toBe("")
    for (const required of [
      "runs-on: [self-hosted, macOS, ARM64, crumbs-m4-pro]",
      "bun-version: 1.4.2",
      "node-version: 22.0.0",
      "node-version: 24.15.0",
      "bun install --frozen-lockfile",
      "bun run release:preflight --tag",
      "bun scripts/prepare-matched-metro-scaffold.ts",
      "43c5ece39360cf321fdb074d82cee41d5daaba23",
      "bun run measure:host-budgets \"$CRUMBS_HOST_BUDGET_REPORT\"",
      "bun run release:check",
      "CRUMBS_AUDIT_NODE_FLOOR:",
      "CRUMBS_INCREMENTAL_REPO_ROOT:",
      "CRUMBS_INCREMENTAL_APP_ROOT:",
      "CRUMBS_HOST_BUDGET_REPORT:",
      "CRUMBS_RELEASE_SOURCE_REVISION:",
      "npm pack --ignore-scripts --json",
      "scripts/release-qualification-artifact.ts create",
      "if: always()",
      "actions/upload-artifact@v4",
    ]) {
      expect(qualifyJob).toContain(required)
    }
    expect(qualifyJob).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|id-token:\s*write/)
  })

  it("passes the explicit Node 22 floor into the report-sealing command", () => {
    const sealStart = qualifyJob.indexOf("      - name: Seal report and exact tarball\n")
    const sealEnd = qualifyJob.indexOf("\n      - name: ", sealStart + 1)
    const sealStep = qualifyJob.slice(sealStart, sealEnd === -1 ? undefined : sealEnd)
    expect(sealStep).toContain("CRUMBS_AUDIT_NODE_FLOOR: ${{ steps.node-floor.outputs.binary }}")
    expect(sealStep).toContain("scripts/release-qualification-artifact.ts create")
  })

  it("publishes only the qualified tarball after checking the tag SHA and release", () => {
    expect(publishJob).not.toBe("")
    expect(publishJob).toContain("needs: qualify")
    expect(publishJob).toContain("runs-on: ubuntu-latest")
    expect(publishJob).toContain("actions/download-artifact@v4")
    expect(publishJob).toContain("git rev-parse HEAD")
    expect(publishJob).toContain("sourceRevision")
    expect(publishJob).toContain("gh release view")
    expect(publishJob).toContain("scripts/release-qualification-artifact.ts verify")
    expect(publishJob).toContain("npm publish \"$PACKAGE_TARBALL\"")
    expect(publishJob).not.toMatch(/bun run build|release:check|npm pack/i)
    expect(publishJob).not.toContain("bun install\n")
  })

  it("scopes OIDC and the npm token to the final publish step", () => {
    expect(publishWorkflow).toContain("permissions:\n  contents: read")
    expect(publishWorkflow).not.toMatch(/^  id-token: write$/m)
    expect(publishJob).toContain("permissions:\n      contents: read\n      id-token: write")
    expect(publishWorkflow.match(/secrets\.NPM_TOKEN/g)).toHaveLength(1)
    const finalPublishStep = publishStep()
    expect(finalPublishStep).toContain("NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}")
    expect(finalPublishStep).toContain("npm publish \"$PACKAGE_TARBALL\"")
    expect(publishJob.slice(0, publishJob.indexOf("      - name: Publish to npm"))).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/)
  })

  it("documents consumer enforcement without claiming every numerical budget passed", () => {
    const protocol = readFileSync(resolve(repoRoot, "packages/css/bench/PERFORMANCE_BUDGETS.md"), "utf8")
    expect(protocol).toContain("11 blocking")
    expect(protocol).toContain("10 advisory")
    expect(protocol).not.toContain("requires all 21 approved host-budget rows to pass")
    expect(readme).toContain("11 blocking")
    expect(readme).toContain("10 advisory")
    expect(readme).toContain("releasePolicyQualified")
    expect(readme).toContain("comparison format 3")
    expect(readme).toContain("manifest format 2")
    expect(readme).not.toContain("requires every approved row to pass")
  })

  it("documents the host gate, current blockers, and device deferral", () => {
    for (const requiredPolicy of [
      "pre-1.0 alpha",
      "breaking changes",
      "migration guidance",
      "SemVer",
      "one minor release",
      "major release",
      "release:preflight",
    ]) {
      expect(packageCompatibility).toContain(requiredPolicy)
    }
    expect(readme).toContain("release-please never publishes to npm")
    expect(readme).toContain("bun run release:preflight --tag")
    expect(publicCompatibility).toContain("deprecation")
    expect(publicCompatibility).toContain("packages/css/COMPATIBILITY.md")
    expect(roadmap).toContain("[x] M8.5")
    expect(roadmap).toContain("2026-09-27-m8-5-release-policy.md")
    expect(roadmap).toContain("M10.5 host-budget release gate")
    expect(roadmap).toContain("nine failures")
    expect(roadmap).toContain("physical-device work remains deferred")
  })
})
