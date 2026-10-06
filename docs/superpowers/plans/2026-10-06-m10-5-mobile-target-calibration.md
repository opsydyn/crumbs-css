# M10.5 Mobile-Target Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Keep this whole calibration and evidence review as one M10.5 slice: commit once after the pre-registered cohorts and final evidence review pass. Preserve the user's native execution preference and recommend the next numbered slice.

**Goal:** Produce repeatable, provenance-complete Expo/Hermes software-context evidence that can support a later explicit mobile-target proposal, without changing current budgets, public APIs or physical-device status.

**Architecture:** Extend the existing private study harness with direct executable Node/npm observations and preserve Bun identity as a separate toolchain field. Add a separate calibration reader that validates complete study archives, admits only a pre-registered set of three comparable fresh cohorts, and reports artifact identity plus cohort-level and within-cohort timing summaries without pooling away cohort variation. The outcome is an evidence assessment and a recommendation for later policy review; it never edits the budget registry or auto-approves a numerical target.

**Tech Stack:** TypeScript, Bun, the existing Bun test runner and Expo/Hermes study harness. Add no dependency, public Crumbs entry point, or production package change.

**Spec:** [Accepted M10.5 target-policy ADR](../../decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md), [consumer-target review](../../assessments/2026-10-06-m10-5-target-policy.md), and [completed software-context cohort](../../assessments/2026-10-06-m10-5-expo-hermes-runtime.md). The user approved retaining every current host gate and using the earlier cohort as reference evidence only. The accepted ADR requires independently retained repeat cohorts before numerical mobile targets are proposed; it approves no mobile limit or tolerated regression.

## Global Constraints

- Preserve every current registry baseline, absolute maximum, allowed regression and enforcement. `packages/css/bench/budgets.json` and `scripts/performance-budgets.ts` are read-only in this slice.
- Preserve all public exports, synchronous behavior, runtime dependencies, package manifests and lockfiles.
- Use only the exact owned iOS Simulator and Android Emulator selectors recorded in each cohort. Reject the protected Simulator UUID `1F706822-9584-4340-B426-EECF36F9D8EA`; do not select physical devices or broad `booted`/`all` targets.
- Capture the resolved executable paths and direct `--version` results for Node and npm before native work and after collection. Record Bun path/version and Bun's `process.version` compatibility value under distinct field names. Do not rewrite prior cohort fingerprints or represent H's retrospective npm version as contemporaneous.
- Each new cohort uses the existing packed plain/core/compatibility six-cell matrix, production release Hermes artifacts, five retained cold launches and one excluded warm-up per cell. Keep every failed attempt and incomplete archive.
- Pre-register exactly **three fresh comparable cohorts** against one frozen calibration-harness source tree; preserve its source digest and exact source archive in every cohort. Each full cohort rebuilds six software-device release apps and collects 30 retained launches plus six excluded warm-ups, for 18 release-app builds and 90 retained launches over the three cohorts. Keep harness and fixture inputs immutable across all three. The earlier H cohort remains a reference/pilot and does not count because executable npm was not captured contemporaneously and the harness source changes.
- Do not pool platforms, variants or raw launches across cohorts as if they were independent. Report each cohort's full cell distributions and the range/distribution of cohort summaries separately.
- Artifact contribution measures stay distinct: package emitted graph bytes, mapped application JavaScript bytes and whole-bundle Hermes deltas. Do not infer execution cost from source maps.
- State outputs are software-device observations only. Physical-device acceptance remains deferred; no native-startup, visual-frame, allocation or retained-memory claims are added.
- Do not derive a ceiling by rounding the observed values. A later proposal must state metric, workload, platform/environment, baseline, absolute limit, tolerated regression and enforcement rationale and receive explicit review.
- Commit the plan's entire code, evidence and assessment as one slice only after the final evidence review. Preserve unrelated working-tree artifacts.

## Review Focus

1. Node/npm executables can be missing, resolve through different shims, or change during a study; capture exact resolved paths and fail admission if before/after identity changes.
2. Bun's `process.version` can resemble a Node version; tests pin separate `bunVersion`, `bunNodeCompatibilityVersion`, `nodeExecutable` and `npmExecutable` fields.
3. Matching screens with different package/source/runtime identity are not comparable; require equality of declared cohort-comparison fields and preserve platform-specific native identity.
4. A failed or incomplete cohort must never be replaced silently with a successful retry; the calibration reader reports and retains excluded cohorts and their reasons.
5. Legacy H lacks contemporaneous npm version proof; it remains readable as reference evidence with explicit `legacy-unverified` provenance and is excluded from the three-cohort admission count.

## Files and Interfaces

| Path | Responsibility |
| --- | --- |
| `scripts/expo-consumer-native.ts` | Capture and validate executable toolchain receipts and use the same resolved environment for the before/after observation |
| `scripts/measure-expo-consumer-runtime.ts` | Persist versioned before/after toolchain fields in newly prepared study archives while retaining legacy report compatibility |
| `scripts/measure-expo-consumer-runtime.test.ts` | Pin executable path/version capture, missing or changed tools, Bun compatibility labeling and legacy archive behavior |
| `scripts/expo-consumer-calibration.ts` | Validate archive admission, cohort comparability, protocol preregistration and deterministic summaries |
| `scripts/review-expo-consumer-calibration.ts` | Read explicit study archive paths and write a reproducible cross-cohort calibration report |
| `scripts/expo-consumer-calibration.test.ts` | Exercise comparable/incomparable cohorts, incomplete attempts, duplicate studies, ordering independence and summary accounting |
| `docs/evidence/2026-10-06-m10-5-mobile-target-calibration/` | Preserve protocol, all three fresh cohort receipts, failed cohorts, aggregate report and hash inventory |
| `docs/assessments/2026-10-06-m10-5-mobile-target-calibration.md`, `docs/roadmap.md` | Record evidence boundaries, target-proposal recommendation and next numbered work |

Private record shapes are defined by the producing task below. Keep the existing one-cohort `report` command and H archive readable; the calibration reader is additive. Cohort comparison must normalize only explicitly variable fields (study ID, archive path, timestamps, run IDs, owned device selector and binary hash). Source, packed-package, fixture, JS/Hermes, resolved dependency, Expo/React Native/Metro, OS/device class and executable Node/npm/Bun identities must agree within each platform comparison. iOS and Android retain separate environments and comparisons.

## Task 1 — Direct toolchain identity in new cohorts

**Files:** Modify `scripts/expo-consumer-native.ts` and `scripts/measure-expo-consumer-runtime.ts`; extend `scripts/measure-expo-consumer-runtime.test.ts`.

**Interfaces:** Export `collectToolchainIdentity(resolveExecutable?, runVersion?) : Promise<ToolchainIdentity>` and `sameToolchainIdentity(before, after): boolean` from `scripts/expo-consumer-native.ts`. `ToolExecutable = { command: string; resolvedPath: string; realPath: string; version: string }`; `ToolchainIdentity = { node: ToolExecutable; npm: ToolExecutable; bun: { resolvedPath: string; realPath: string; version: string; nodeCompatibilityVersion: string } }`. Resolve Node/npm with `Bun.which`, invoke those absolute paths with `--version`, and resolve Bun from `process.execPath`; do not infer executable versions from `process.version`, package metadata or shell text. Persist `toolchain-before.json` before native commands and `toolchain-after.json` after collection. A new cohort is complete only when `sameToolchainIdentity` passes. Prior archives without these files stay valid one-cohort reports but are marked `legacy-unverified` by calibration. Test seams resolve a command to a path or null and run a path with argv to `{ exitCode, stdout }`; production defaults use Bun APIs and bounded child processes.

- [ ] Write tests using an injected command resolver/runner: executable symlink records both link and real path; version output is tied to the resolved binary; Node, npm and Bun fields cannot be interchanged; absent/non-zero tools stop preparation before any native adapter call; changed before/after version or real path invalidates the new cohort; legacy archive report remains readable and explicitly lacks direct toolchain proof.
- [ ] Run `bun test scripts/measure-expo-consumer-runtime.test.ts`; verify the new cases fail for missing capture/identity rules rather than fixture setup.
- [ ] Implement capture with the resolved absolute executable, bounded output, explicit exit status and timestamp-free semantic identity comparison. Preserve raw command stdout/stderr/exit evidence in the study archive without recording credentials.
- [ ] Run the focused tests and harness TypeScript command: `./node_modules/.bin/tsc --noEmit --target esnext --module esnext --moduleResolution bundler --types bun --skipLibCheck scripts/expo-consumer-*.ts scripts/measure-expo-consumer-runtime*.ts`.
- [ ] Confirm the old H standalone report still completes and stays labelled retrospective for npm; do not regenerate its native fingerprints or samples.

## Task 2 — Comparable cohort admission and deterministic report

**Files:** Create `scripts/expo-consumer-calibration.ts`, `scripts/review-expo-consumer-calibration.ts` and `scripts/expo-consumer-calibration.test.ts`; add a root command `review:expo-consumer-calibration`; update the plan's roadmap handoff.

**Interfaces:** `readCalibrationCohorts(archivePaths: readonly string[]): Promise<CalibrationAdmission>` consumes exactly three explicit absolute paths to completed fresh one-cohort archives plus an optional separately labelled reference archive. It verifies each existing standalone report, source/package/proof inventory, six-cell cardinality, warm-up exclusion, five valid retained launches per cell, toolchain-before/after equality and all required study/artifact hashes. It produces `CalibrationAdmission = { admitted: readonly CalibrationCohort[]; excluded: readonly { archivePath: string; reasons: readonly CalibrationExclusion[] }[]; comparisonKey: CalibrationComparisonKey }`. The reader admits the calibration only when exactly three fresh archives are mutually comparable and all complete; it never chooses a best subset. H can be supplied as a labeled reference but cannot satisfy the three fresh archives. A complete admission means evidence may be submitted for policy review, not that any target is approved.

`CalibrationCohort` retains each platform/variant cell's five timings, median/min/max, JavaScript/mapped bytes, Hermes bytes/delta and artifact digests with its cohort ID and environment. `summariseCalibration(admission)` returns cohorts sorted by cohort ID, each cell's within-cohort min/median/max, the min/median/max of the three cohort medians, exact artifact-byte equality outcomes, and `eligibleForPolicyProposal`, true only when all three preregistered cohorts are admitted. Eligibility means an evidence packet can be submitted for later explicit policy review; it does not approve a threshold. Never combine the 15 launches into one five-number summary.

- [ ] Write tests for three comparable cohorts, fewer/extra/duplicate cohort IDs, missing version receipts, version/path drift, source/package/lock/config/runtime mismatch, missing platform/cell, duplicate attempts, excluded warm-ups counted as retained, failed attempts, corrupt hashes, artifact-byte drift, stable artifact bytes with timing drift, platform separation and input-order permutation. Assert that failures are listed and never erased by a successful cohort.
- [ ] Run `bun test scripts/expo-consumer-calibration.test.ts`; confirm regression cases fail on missing admission or identity checks.
- [ ] Implement schema parsing and pure deterministic aggregation. Keep report admission reasons as a closed union and include all exclusions in output. Do not calculate cross-platform pooled statistics or present a best-of-cohorts number.
- [ ] Add report command tests for JSON determinism, archive-path traversal rejection, malformed JSON, missing files and exit-nonzero on an ineligible calibration.
- [ ] Run focused tests, `bun run review:expo-consumer-calibration --help`, harness TypeScript and `git diff --check`.

## Task 3 — Pre-register and collect three fresh cohorts

**Files:** Create `docs/evidence/2026-10-06-m10-5-mobile-target-calibration/protocol.json`; write the immutable cohort archive references and environment receipts under that evidence directory. Update only after each completed attempt; never overwrite a prior cohort archive.

**Interfaces:** The protocol pins the base revision plus frozen working-tree source digest/archive, package tarball hash, fixture/config/lock identities, software-device ownership records, required toolchain fields, three cohort IDs/paths, collection order, six cells, five retained launches and one excluded warm-up per cell, retry/failure rules and report command before collection starts. Each cohort carries the same source and package inputs plus its own before/after environment and executable receipts. Do not edit the harness or fixture inputs until all cohorts and the final report are complete. The calibration reader from Task 2 consumes the three explicit archive paths.

- [ ] Validate the protocol and all archive/device preconditions before the first native build; fail before native commands if Node/npm are missing or toolchain identity is incomplete.
- [ ] Run each full matrix separately in its own immutable archive, preserving every attempt, warm-up, exclusion, native binary/Hermes match, source-map receipt, stdout/stderr/exit, environment fingerprints and scoped cleanup evidence. Retain failed cohorts; do not retry over them.
- [ ] After each cohort, run its standalone report and require `complete: true` with no failed retained cells before starting the next pre-registered archive. An incomplete cohort remains preserved and makes the three-cohort calibration ineligible; stop and report the blocker rather than substituting an unregistered cohort.
- [ ] After all three standalone reports pass, run the calibration reader once with the exact preregistered paths. Require exactly three admitted fresh cohorts, no silent exclusions and identical declared comparison keys per platform. Keep the H cohort separately as a historical reference.
- [ ] Verify all required native resources are cleaned through the owned ledger. Never run a global Simulator reset or shared ADB server reset.

## Task 4 — Calibration assessment and policy handoff

**Files:** Create `docs/assessments/2026-10-06-m10-5-mobile-target-calibration.md`; update `docs/roadmap.md`; preserve the final report and hash inventory in `docs/evidence/2026-10-06-m10-5-mobile-target-calibration/`.

- [ ] Report each cohort independently, with each cell's five launch values and cohort median/range; compare the three cohort summaries without pooling or claiming a tail guarantee from these runs.
- [ ] State whether artifact bytes reproduce exactly, where platform-specific native packages vary, whether timing variation is stable enough to motivate a candidate, and whether the evidence is inconclusive. Include all rejected, failed and incomplete archives and concrete reasons.
- [ ] Recommend a candidate target for later review only if the three cohorts support one. For every candidate, give metric identity, consumer reason, exact workload/environment, baseline selector, proposed absolute value, tolerated regression and proposed enforcement. Mark the recommendation as **not approved**; do not write it to the registry.
- [ ] If cohorts disagree or lack product justification for tolerated regression, recommend no numerical target and specify the next evidence needed. Do not force a target decision from inconclusive data.
- [ ] Keep host failures and the Expo environment mismatch in their own status; the new mobile report cannot pass, replace or waive them. Keep physical-device, startup, frames, allocation and memory acceptance open.
- [ ] Run the standalone validators and focused/package checks required by the repository, inspect staged paths and `git diff --check`, then make one final commit for the complete calibration slice. Recommend the next numbered M10.5 item: explicit review of any proposed numerical limits, or targeted host-gap remediation if no mobile target is supportable.

## Execution Handoff

This plan describes harness implementation and three complete fresh cohorts, not just a research note. The native execution preference is already established. After the user reviews this plan, implement it in the current authoritative worktree as one M10.5 slice and one final commit. Do not begin cohort collection before Tasks 1 and 2, `protocol.json`, executable identity checks, frozen source digest and retained harness-source archive are ready. The digest and archived source, rather than an intermediate commit, pin the exact code while the consolidated slice is measured; do not change those inputs before the one final commit.
