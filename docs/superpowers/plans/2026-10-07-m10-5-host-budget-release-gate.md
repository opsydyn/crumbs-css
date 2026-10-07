# M10.5 Host-Budget Release Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require all 21 currently approved host-budget comparisons to pass before release checks and npm publication, with the exact measured package tarball handed from a secret-free M4 Pro qualification job to Ubuntu.

**Architecture:** Reuse the existing registry codec, baseline verifiers, source identity helper, and budget comparator to rederive the report from raw measurements. A separate release policy checks the fixed host metric set without consulting whole-registry readiness. Prepare the exact approved Expo/Metro scaffold and host identity, bind report and tarball in a hashed manifest, then make the Ubuntu publisher depend on qualification and publish only the verified tarball.

**Tech Stack:** Bun 1.4.2, npm 11.12.1, Effect Schema 4 already used by the package, Node 22.0.0 and Node 24.15.0, TypeScript, GitHub Actions, existing npm provenance flow. Add no runtime or development dependency.

**Spec:** `docs/superpowers/specs/2026-10-07-m10-5-host-budget-release-gate-design.md`

## Global Constraints

- Require exactly these 21 host metric IDs, once each, with result `pass`: `runtime-initialization-node22-esm`, `runtime-initialization-node22-cjs`, `runtime-initialization-current-esm`, `runtime-initialization-current-cjs`, `cold-transform-ms`, `warm-transform-ms`, `incremental-rebuild`, `editor-tsc-wall-10000`, `editor-tsgo-wall-10000`, `editor-tsc-memory-10000`, `editor-tsgo-memory-10000`, `editor-tsc-instantiations-10000`, `editor-tsgo-instantiations-10000`, `editor-first-completion-10000`, `editor-warm-completion-10000`, `runtime-theme-core-esm-graph-bytes`, `runtime-theme-core-cjs-graph-bytes`, `runtime-tokens-esm-graph-bytes`, `runtime-tokens-cjs-graph-bytes`, `runtime-theme-compatibility-esm-graph-bytes`, and `runtime-theme-compatibility-cjs-graph-bytes`.
- Keep all selectors, baselines, limits, regression rules, and environment comparisons unchanged. Require registry decoding and baseline integrity, but do not require whole-registry readiness or trust the comparator's `performanceQualified` flag.
- Use macOS 26.6.2 on Apple M4 Pro / ARM64 (Darwin release 25.6.0), Bun 1.4.2 and npm 11.12.1 as recorded in the approved graph baselines, exact Node 22.0.0 floor, and Node 24.15.0 current Node runtime. The editor-scale identity's `node: v26.3.0` is Bun's Node compatibility version; do not require a separate Node 26 executable.
- Pin Bun 1.4.2 for the measurement job without changing the repository's existing `packageManager` declaration as part of this release-gate slice.
- Match the approved Metro cohort: Expo 56.0.4, Metro 0.84.4, React Native 0.85.3, Expo Metro runtime 56.0.12, React and React DOM 19.2.5, Babel preset Expo 56.0.12, and `@vanilla-extract/css` 1.20.1 from scaffold commit `43c5ece39360cf321fdb074d82cee41d5daaba23`.
- Do not expose `NPM_TOKEN`, write permission, or OIDC credentials to the qualification job. Publish only the exact hashed tarball produced after successful qualification.
- Keep physical-device and screen-reader acceptance deferred. Do not gate release on `budgets:readiness`.
- Treat M10.5 as one implementation slice: keep the five tasks in one working tree and make one commit only after the end-to-end checks pass; then report the next numbered M10.5 slice.

## Review Focus

- A 21-row host pass must remain eligible while deferred device thresholds keep `performanceQualified` false; Task 1 pins this case and the exact approved ID-to-selector map.
- Raw report edits must not forge a passing comparison; Task 2 rederives rows from retained measurement inputs.
- A stale source SHA or changed `dist` artifact must fail; Task 2 checks source and before/after artifact identity.
- An M4 runner label must not hide a wrong machine, Node, Expo, Metro, or fixture version; Task 3 verifies actual identity and scaffold contents.
- A moved tag, altered report, substituted package, or early secret exposure must block publication; Tasks 4 and 5 test the handoff and workflow boundary.

---

### Task 1: Define the closed host-metric release policy

**Files:**
- Create: `scripts/release-host-budget-policy.ts`
- Test: `packages/css/test/release-host-budget-policy.test.ts`

**Interfaces:**
- Produces `releaseHostBudgetMetricContracts: readonly { id: string; selector: string }[]` with the exact 21 ID-to-selector pairs in the current approved registry, plus `verifyReleaseHostBudgetRegistry(registry)` to reject missing, extra, reclassified, or unapproved rows.
- Produces `evaluateReleaseHostBudgetRows(rows: readonly { id: string; result: string }[]): { qualified: boolean; blockers: readonly string[] }`.

The pinned ID-to-selector contract is:

| ID | Selector |
| --- | --- |
| `runtime-initialization-node22-esm` | `runtime-init.floor.esm.load-ms.median` |
| `runtime-initialization-node22-cjs` | `runtime-init.floor.cjs.load-ms.median` |
| `runtime-initialization-current-esm` | `runtime-init.current.esm.load-ms.median` |
| `runtime-initialization-current-cjs` | `runtime-init.current.cjs.load-ms.median` |
| `cold-transform-ms` | `benchmark.cold-transform.max-median-ms` |
| `warm-transform-ms` | `benchmark.warm-transform.max-median-ms` |
| `incremental-rebuild` | `metro-incremental.direct-css-edit-ms.median` |
| `editor-tsc-wall-10000` | `editor.tsc.10000.wall-ms.median` |
| `editor-tsgo-wall-10000` | `editor.tsgo.10000.wall-ms.median` |
| `editor-tsc-memory-10000` | `editor.tsc.10000.memory-kib.median` |
| `editor-tsgo-memory-10000` | `editor.tsgo.10000.memory-kib.median` |
| `editor-tsc-instantiations-10000` | `editor.tsc.10000.instantiations` |
| `editor-tsgo-instantiations-10000` | `editor.tsgo.10000.instantiations` |
| `editor-first-completion-10000` | `editor.10000.first-completion-ms.median` |
| `editor-warm-completion-10000` | `editor.10000.warm-completion-ms.median` |
| `runtime-theme-core-esm-graph-bytes` | `runtime.theme-core.esm.graph-bytes` |
| `runtime-theme-core-cjs-graph-bytes` | `runtime.theme-core.cjs.graph-bytes` |
| `runtime-tokens-esm-graph-bytes` | `runtime.tokens.esm.graph-bytes` |
| `runtime-tokens-cjs-graph-bytes` | `runtime.tokens.cjs.graph-bytes` |
| `runtime-theme-compatibility-esm-graph-bytes` | `runtime.theme-compatibility.esm.graph-bytes` |
| `runtime-theme-compatibility-cjs-graph-bytes` | `runtime.theme-compatibility.cjs.graph-bytes` |

- [ ] **Step 1: Write policy tests.** Assert that exactly one `pass` row for each approved ID qualifies; a missing, duplicate, extra, or reclassified ID fails; every `fail` or `incomplete-*` result is named in `blockers`; and the fixed selector for each ID matches the reviewed registry.
- [ ] **Step 2: Prove registry-readiness independence.** Pass 21 passing rows alongside `performanceQualified: false`; assert the host policy qualifies from rows alone. Decode `packages/css/bench/budgets.json` and assert the fixed ID-to-selector map matches exactly the recorded, threshold-approved host rows.
- [ ] **Step 3: Run the tests and confirm they fail.** Run `bun test packages/css/test/release-host-budget-policy.test.ts`. Expected: the module and exported policy functions are missing.
- [ ] **Step 4: Implement the fixed ID-to-selector map, registry check, and row evaluator.** Report duplicate, missing, extra, reclassified, and non-pass rows without reading `assessBudgetRegistry(...).ready` or `performanceQualified`.
- [ ] **Step 5: Run the policy tests.** Run `bun test packages/css/test/release-host-budget-policy.test.ts`; expected: all policy cases pass.
### Task 2: Revalidate raw host evidence and require it in `release:check`

**Files:**
- Create: `scripts/release-host-budget-report.ts`
- Create: `scripts/check-release-host-budgets.ts`
- Create: `packages/css/test/release-host-budget-report.test.ts`
- Modify: `packages/css/package.json`

**Interfaces:**
- `verifyReleaseHostBudgetReport(options: { reportDirectory: string; repositoryRoot: string; expectedRevision: string; expectedArtifacts?: readonly { path: string; sha256: string }[] }): { qualified: boolean; blockers: readonly string[]; sourceRevision?: string; sourceDigest?: string }`.
- The verifier reads the current format-v2 `comparison.json`, `input-identity.json`, and the raw `effect.json`, `runtime-graph.json`, `runtime-initialization.json`, `benchmark-summary.json`, `metro-incremental.json`, and `editor.json` files.
- The CLI requires `CRUMBS_HOST_BUDGET_REPORT`, uses `CRUMBS_RELEASE_SOURCE_REVISION` when set (otherwise `git rev-parse HEAD`), checks the current `packages/css/dist` inventory, and exits nonzero with named blockers.

- [ ] **Step 1: Write report-verifier tests.** Reuse the retained current-source report as a rejected fixture; assert raw reports rederive its stored metric rows, and assert its nine failures plus any incomplete row are reported. Add mutations for missing files, edited raw measurements, wrong source revision/digest, before/after drift, and changed artifact hashes.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `bun test packages/css/test/release-host-budget-report.test.ts`. Expected: verifier exports and required-input failures are absent.
- [ ] **Step 3: Implement rederivation and identity checks.** Decode the registry with `budgetRegistryCodec`, run `verifyRecordedBaselines` and `verifyDiagnosticBaselines`, validate the registry against Task 1's fixed ID-to-selector map, reconstruct the comparator evidence bundle from the raw report files, call `compareRecordedMetrics`, and compare its metric rows to the saved rows. Require the closed host policy from Task 1; ignore only the registry-wide `performanceQualified` field.
- [ ] **Step 4: Add the command-line check and package script integration.** Require `CRUMBS_HOST_BUDGET_REPORT` and `CRUMBS_RELEASE_SOURCE_REVISION` (defaulting only the latter to `git rev-parse HEAD`); append `bun ../../scripts/check-release-host-budgets.ts` after the existing build, typecheck, tests, native-style benchmark, and pack dry-run. The verifier compares source identity and artifact hashes with current source and rebuilt `dist` files.
- [ ] **Step 5: Run focused tests.** Run `bun test packages/css/test/release-host-budget-policy.test.ts packages/css/test/release-host-budget-report.test.ts`; expected: metric rows rederive, the retained current report is rejected with measured blockers, and all identity mutations fail.
### Task 3: Verify the M4 Pro environment and prepare the approved Metro scaffold

**Files:**
- Create: `scripts/release-host-environment.ts`
- Create: `scripts/prepare-matched-metro-scaffold.ts`
- Create: `packages/css/test/release-host-environment.test.ts`
- Create: `packages/css/test/matched-metro-scaffold.test.ts`
- Source inputs: `apps/playground/metro.config.js`, `apps/playground/src/incremental-entry.ts`, `apps/playground/src/incremental.css.ts`, `apps/playground/src/incremental-token.ts`, `apps/playground/src/incremental-base.css.ts`, and `packages/css/fixtures/m2-7-workspace-token.ts`.

**Interfaces:**
- `verifyReleaseHostEnvironment(actual: ReleaseHostEnvironment): readonly string[]` checks macOS product version, Darwin release, chip, architecture, Bun, npm, the Node 22 floor, the Node 24.15 current runtime, Bun's Node compatibility identity, tsdown, TypeScript, and `tsgo`.
- `prepareMatchedMetroScaffold(options: { baselineRoot: string; baselineRevision: "43c5ece39360cf321fdb074d82cee41d5daaba23"; sourceRoot: string; outputRoot: string }): Promise<{ appRoot: string; fixtureHashes: readonly { path: string; sha256: string }[]; resolvedVersions: Readonly<Record<string, string>> }>`.

- [ ] **Step 1: Write host-environment tests.** Assert the recorded macOS 26.6.2 / Darwin 25.6.0 / Apple M4 Pro / ARM64 / Bun 1.4.2 / npm 11.12.1 / Node 22.0.0 / Node 24.15.0 / tsdown 0.21.10 / TypeScript 6.0.3 / `tsgo` 7.0.0-dev.20260519.1 identity passes, and that each wrong value yields a specific blocker. Confirm the editor report's Bun Node-compatibility version is v26.3.0 without requiring a separate Node 26 executable.
- [ ] **Step 2: Write scaffold tests.** Build small temporary source and baseline roots; assert the script copies the current Metro config and five fixture files, overlays built package artifacts, resolves the direct Vanilla Extract edge to 1.20.1, and rejects wrong baseline commit/version or missing input files.
- [ ] **Step 3: Run both test files and confirm they fail.** Run `bun test packages/css/test/release-host-environment.test.ts packages/css/test/matched-metro-scaffold.test.ts`. Expected: both helpers are missing.
- [ ] **Step 4: Implement the host check and scaffold preparation.** Read actual macOS product/chip identity, verify `Bun.version`, `npm --version`, the explicit `CRUMBS_AUDIT_NODE_FLOOR` binary and PATH-resolved current Node, plus locked tsdown, TypeScript, and `tsgo` versions; record Bun's editor `process.version`; set `CRUMBS_INCREMENTAL_REPO_ROOT` / `CRUMBS_INCREMENTAL_APP_ROOT` to the prepared baseline scaffold. Preserve source files and the locked baseline checkout.
- [ ] **Step 5: Run the targeted tests.** Run `bun test packages/css/test/release-host-environment.test.ts packages/css/test/matched-metro-scaffold.test.ts`; expected: accepted values pass and each mismatch is rejected.
### Task 4: Bind the qualified report to the exact package tarball

**Files:**
- Create: `scripts/release-qualification-artifact.ts`
- Create: `packages/css/test/release-qualification-artifact.test.ts`

**Interfaces:**
- `ReleaseQualificationInput` contains `releaseTag`, `sourceRevision`, `sourceDigest`, `host`, `reportDirectory`, `packageRoot`, and `tarballPath`. `createReleaseQualificationManifest(input: ReleaseQualificationInput): ReleaseQualificationManifest` records format version, tag, commit SHA, source digest, host identity, sorted report file hashes, package name/version, package artifact inventory, tarball name, and tarball SHA-256.
- `verifyReleaseQualificationBundle(options: { bundleDirectory: string; repositoryRoot: string; expectedTag: string; expectedRevision: string }): { valid: boolean; blockers: readonly string[] }` verifies manifest shape, report/source identity, package metadata, report digest, and tarball digest without rebuilding the package.

- [ ] **Step 1: Write manifest tests.** Accept a valid temporary report/tarball bundle; reject a changed report, tarball, tag, commit, source digest, package name, or version. Verify no package lifecycle rebuild is needed to consume the tarball.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `bun test packages/css/test/release-qualification-artifact.test.ts`. Expected: manifest functions are missing.
- [ ] **Step 3: Implement strict manifest creation and verification.** Use the existing Effect Schema 4 dependency for the manifest codec; hash files with SHA-256; compare manifest artifact inventory with `input-identity.json`; extract the tarball into a temporary directory and compare its `package/dist` file inventory and hashes with the report's measured artifacts; verify package name/version against both the tarball and checked-out source.
- [ ] **Step 4: Verify pack behavior in a temporary package.** Run `npm pack --ignore-scripts --json --pack-destination <temporary-directory>` and prove the output tarball is produced without invoking `prepack` or rebuilding `dist`; unpack it and prove its packaged `dist` hashes equal the measured inventory.
- [ ] **Step 5: Run manifest tests.** Run `bun test packages/css/test/release-qualification-artifact.test.ts`; expected: all mutated bundles fail and the valid bundle passes.
### Task 5: Wire qualification and publication jobs, then document the gate

**Files:**
- Modify: `.github/workflows/publish.yml`
- Modify: `packages/css/test/release-policy.test.ts`
- Modify: `packages/css/bench/PERFORMANCE_BUDGETS.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- `qualify` runs on `[self-hosted, macOS, ARM64, crumbs-m4-pro]`, checks out and preflights the release tag, installs the frozen lock, prepares the scaffold, measures the host report, runs `release:check`, packs with scripts disabled, creates the manifest, and uploads report plus tarball even on failure.
- `publish` uses `needs: qualify` on `ubuntu-latest`, checks the tag still points to the qualified SHA, verifies the downloaded bundle and release, then publishes the exact tarball. Global permissions are `contents: read`; only this job adds `id-token: write`; `NPM_TOKEN` exists only on `npm publish`.

- [ ] **Step 1: Write workflow contract tests.** Assert the job dependency, runner labels, exact Bun/Node versions, report and tarball artifact handoff, tag-SHA recheck, absence of rebuild/repack in `publish`, job-scoped permissions, and secret exposure only in the final publish step.
- [ ] **Step 2: Run the workflow contract tests and confirm they fail.** Run `bun test packages/css/test/release-policy.test.ts`. Expected: current one-job workflow violates the new contracts.
- [ ] **Step 3: Implement the two-job workflow.** Move full checks to `qualify`; set `CRUMBS_AUDIT_NODE_FLOOR`, `CRUMBS_INCREMENTAL_REPO_ROOT`, `CRUMBS_INCREMENTAL_APP_ROOT`, `CRUMBS_HOST_BUDGET_REPORT`, and `CRUMBS_RELEASE_SOURCE_REVISION` explicitly. Make the publisher install only what its verifier needs and publish the downloaded tarball without rebuilding.
- [ ] **Step 4: Update release instructions and roadmap.** Document the exact report-generation command and required M4 Pro runner; record that all 21 rows are now a publication prerequisite, the current nine failures still block, registry readiness is separate, and physical-device work remains deferred.
- [ ] **Step 5: Run release-policy tests.** Run `bun test packages/css/test/release-policy.test.ts`; expected: job ordering, permission boundaries, exact report handoff, and token scope pass.
- [ ] **Step 6: Parse the workflow.** Run `ruby -e 'require "yaml"; YAML.parse_file(".github/workflows/publish.yml")'`; expected: exit 0.
- [ ] **Step 7: Run package checks.** Run `bun run check`; expected: package and Storybook checks pass.
- [ ] **Step 8: Validate the registry.** Run `bun run budgets:validate`; expected: recorded baselines still validate without changing registry values.
- [ ] **Step 9: Run the full host measurement on the matched M4 Pro environment.** Expected: all 21 rows are explicit; the approved Metro cohort passes `incremental-rebuild`, the nine known performance failures remain visible, `release:check` rejects the report, and publish stays skipped until all approved rows pass. Record whether the dedicated GitHub runner is registered; if it is unavailable, leave end-to-end Actions qualification clearly pending and never claim it passed.
- [ ] **Step 10: Check the final diff.** Run `git diff --check`; expected: no whitespace errors and only the M10.5 workflow, verifier, tests, and docs are changed.
- [ ] **Step 11: Commit and hand off.** After every task and end-to-end check passes, commit the complete M10.5 slice as `feat(m10.5): gate npm publication on host budgets`. Report the runner disposition and recommend the next numbered M10.5 slice for remediating the nine remaining host failures.
