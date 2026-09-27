# M8.5 Release Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Crumbs release automation, package compatibility/deprecation obligations, and local release preparation around the current alpha release policy.

**Architecture:** Release-please creates release PRs, tags, and GitHub Releases without publishing to npm. A manually dispatched workflow publishes only a completed, version-matching release tag; a local preflight command applies the same version/tag and dist-tag rules before dispatch.

**Tech Stack:** Bun 1.3.11, TypeScript, GitHub Actions, Markdown, Bun tests.

**Spec:** `docs/roadmap.md` M8.5; `docs/decisions/adopt-native-design-system-compiler.md` release-policy decision; existing release instructions in `README.md`.

## Global Constraints

- Preserve the current package version `0.1.1-alpha.1`; do not publish or mutate an existing tag/release.
- Keep npm publishing a manual action, separate from release-please.
- Publish only a completed GitHub Release whose tag exactly matches `v<packages/css/package.json version>`.
- Use `bun install --frozen-lockfile`, `bun run release:check`, and npm provenance for publication.
- Prerelease versions publish under the first prerelease identifier (currently `alpha`); stable versions use `latest`.
- Android/device acceptance and publication remain outside M8.5 verification.
- Commit the completed M8.5 slice and merge it locally to `main`; do not push.

## Review Focus

- Branches, SHAs, malformed tags, and tags for a different package version must fail preflight.
- A release tag must point to the exact checked-out commit.
- Alpha releases must not enter the `latest` dist-tag; stable releases must.
- Missing npm credentials or a draft/unpublished GitHub Release must fail before `npm publish`.
- Breaking alpha API or artifact changes require changelog, compatibility, and migration guidance; stable removals require a deprecation window.

---

### Task 1: Qualify the manual release gate and document compatibility obligations

**Files:**
- Create: `scripts/release-preflight.ts`
- Modify: `package.json`
- Create: `packages/css/test/release-policy.test.ts`
- Modify: `.github/workflows/release-please.yml`
- Modify: `.github/workflows/publish.yml`
- Modify: `README.md`
- Modify: `packages/css/COMPATIBILITY.md`
- Modify: `docs/src/content/docs/reference/compatibility.mdx`
- Create: `docs/assessments/2026-09-27-m8-5-release-policy.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- `release:preflight --tag v<version>` validates the package version, exact release tag, tag commit versus `HEAD`, and derived npm dist-tag without publishing; `--github-output <path>` additionally writes release outputs for Actions.
- `npmDistTagForVersion(version: string): string` returns `latest` for stable versions or the first named prerelease identifier (such as alpha, beta, or rc).
- `validatePublishTarget({ version, tag, tagCommit, headCommit })` rejects a mismatched tag or commit and returns the npm dist-tag on success.

- [x] Write focused failing tests for stable/prerelease dist-tag derivation, malformed/mismatched tags, tag/HEAD mismatch, release workflow non-publication, manual workflow gates, and documented stability/deprecation policy.
- [x] Run the focused test and confirm the expected missing-contract failures.
- [x] Implement the preflight command, release-please/manual-publish workflow split, required tag/GitHub Release/token gates, frozen install, and provenance publication.
- [x] Add the preflight and release policy to root/package/public compatibility docs; complete the M8.5 roadmap row without changing the package version or publishing.
- [x] Run the focused release-policy tests, full package tests, release check, and documentation build; inspect the final diff for unrelated changes.
- [x] Commit the completed M8.5 slice.
