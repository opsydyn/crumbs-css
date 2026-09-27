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

describe("M8.5 release policy", () => {
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

  it("limits manual publishing to a completed, version-matched tag with reproducible checks", () => {
    for (const requiredContract of [
      "release_tag:",
      "required: true",
      "refs/heads/main",
      'if [[ -z "$NPM_TOKEN" ]]',
      "gh release view",
      ".isDraft == false and .publishedAt != null",
      "bun run release:preflight",
      "bun install --frozen-lockfile",
      "bun run release:check",
      "npm publish --access public --provenance",
      "secrets.NPM_TOKEN",
    ]) {
      expect(publishWorkflow).toContain(requiredContract)
    }
    const publishCommandIndex = publishWorkflow.indexOf("run: npm publish")
    expect(publishCommandIndex).toBeGreaterThan(0)
    for (const gate of [
      "Require workflow dispatch from main",
      'if [[ -z "$NPM_TOKEN" ]]',
      ".isDraft == false and .publishedAt != null",
      "bun run release:preflight",
      "bun run release:check",
    ]) {
      const gateIndex = publishWorkflow.indexOf(gate)
      expect(gateIndex).toBeGreaterThanOrEqual(0)
      expect(gateIndex).toBeLessThan(publishCommandIndex)
    }
    expect(publishWorkflow).not.toContain("inputs.ref")
    expect(publishWorkflow).not.toContain("bun install\n")
  })

  it("documents alpha breaks, stable SemVer, migration, and the deprecation window", () => {
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
  })
})
