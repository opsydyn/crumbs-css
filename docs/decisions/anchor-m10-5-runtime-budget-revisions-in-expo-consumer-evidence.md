---
status: accepted
date: 2026-10-06
decision-makers: Alan P Currie
---

# Anchor M10.5 runtime-budget revisions in Expo consumer evidence

## Context and Problem Statement

M10.5 has no measured, non-breaking candidate that meets the current theme startup and emitted-graph budgets. The 2026-10-06 [feasibility assessment](../assessments/2026-10-06-m10-5-startup-graph-feasibility.md) records four failing startup cells and four failing theme graph cells. Static extraction slightly increased each graph and showed no paired first-use improvement; package-wide minification remained above every theme graph limit. The measured startup is Node module evaluation, and the graph budgets count emitted local files. Neither measures a packed Expo application's Hermes bundle contribution or native first-screen experience.

The synchronous descriptor validation, recursive resolver behavior, and compatibility `theme` exports are current public behavior. Removing them or making them asynchronous would break consumers. The proposed [native compiler ADR](adopt-native-design-system-compiler.md#d6-treat-runtime-identity-updates-and-memory-as-contracts) calls for release-mode Hermes evidence against equivalent plain React Native baselines and says a guarantee should be amended through recorded evidence rather than silently weakened.

How should M10.5 resolve the mismatch between the existing package-host budgets and Crumbs' React Native product target without breaking public APIs or reclassifying failed measurements?

## Decision Drivers

- Preserve synchronous public APIs, descriptor validation, and compatibility behavior.
- Keep all currently approved limits and their recorded results intact until an explicit review changes them.
- Measure the package in its actual Expo/Hermes consumer context before proposing a mobile runtime target.
- Keep package-host, application-bundle, runtime, and physical-device evidence distinct.
- Include both iOS and Android software contexts while physical-device work remains deferred.

## Considered Options

- Keep the existing Node startup and emitted-graph checks as the only runtime performance evidence.
- Replace or relax current limits now using the available host measurements.
- Add a narrow public runtime entry before a consumer case is measured.
- Preserve the existing APIs and checks, then use packed Expo/Hermes evidence to inform a separately reviewed target decision.

## Decision Outcome

Chosen option: "Preserve the existing APIs and checks, then use packed Expo/Hermes evidence to inform a separately reviewed target decision", because it retains the approved contracts and prevents Node package measurements from being presented as React Native user experience.

Accepted after the 2026-10-06 consumer-evidence review and explicit session approval by Alan P Currie. Retain every existing host gate and admit the packed Expo/Hermes cohort as reference evidence. No numerical mobile target, baseline replacement, host-gate retirement or relaxation is approved. M10.5 remains open; acceptance of this policy does not accept the broader native-compiler ADR.

The startup and theme graph limits implicated by this assessment remain unchanged:

| Existing package-host metric | Current approved maximum |
| --- | ---: |
| Node 22 module evaluation, ESM / CJS | 7.553 ms / 4.083 ms |
| Current Node module evaluation, ESM / CJS | 3.067 ms / 2.444 ms |
| `theme/core` emitted graph, ESM / CJS | 17,271 B / 17,641 B |
| Compatibility `theme` emitted graph, ESM / CJS | 44,017 B / 44,764 B |

These values remain host/package checks. Expo evidence does not automatically pass, replace, or waive them. Any later proposal to change their scope, enforcement, or values must identify each affected metric and receive explicit review.

### Consequences

- Good: consumers keep the synchronous APIs and descriptor behavior on which existing code relies.
- Good: future React Native targets can be based on actual packed application artifacts and Hermes measurements.
- Bad: the retained host-budget failures remain visible and M10.5 stays open; consumer reference evidence does not resolve them.
- Bad: an Expo consumer study adds a separate harness and repeatable platform runs.
- Neutral: simulator and emulator measurements can qualify software-context behavior, but cannot establish physical-device performance acceptance.

## Implementation Plan

This policy slice changes documentation only. The original measurement implementation is complete in `56719d3`; its six staged consumers live under the retained archive rather than modifying the playground. The dated review below records completion and remaining calibration work. The original evidence plan follows for provenance.

- **Affected paths for this ADR**: `docs/decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md`, `docs/decisions/README.md`, and `docs/roadmap.md`.
- **Affected paths for the later evidence slice**: the packed Expo app under `apps/playground/`; a focused harness at `scripts/measure-expo-consumer-runtime.ts` with tests at `scripts/measure-expo-consumer-runtime.test.ts`; and raw reports under `docs/evidence/<date>-m10-5-expo-hermes/`.
- **Dependencies**: add none for this ADR or the measurement harness. Use the Expo, React Native, React, Metro, and Hermes versions pinned by the consumer lockfile. Any proposed dependency requires its own review.
- **Patterns to follow**: use the isolated packed-consumer path documented in `apps/playground/README.md`; identify the exact package tarball, lockfile, source tree, build configuration, and resulting artifacts by digest; retain raw per-run values and the existing minimum-five-repetition, median, and min/median/max reporting convention.
- **Patterns to avoid**: do not treat Node or Bun timings as Hermes results; do not infer application contribution from the Node emitted-graph sum; do not compare different Expo/RN versions as a paired result; do not label simulator/emulator evidence as physical-device acceptance; do not change a budget, baseline, API, or package dependency during evidence collection.
- **Configuration**: no configuration changes in this ADR. The later harness must record the resolved Expo SDK, React, React Native, Metro, Hermes, OS, architecture, build mode, and platform for every run.
- **Migration steps**: none. Keep current consumers and entrypoints intact. A later target proposal must map old and proposed checks explicitly and be separately reviewed before registry or enforcement changes.

### Verification

- [x] The ADR, index, and roadmap link to one another and identify the work as M10.5.
- [x] Explicit session approval follows the concrete consumer-evidence review; the ADR and index now record acceptance.
- [x] `packages/css/bench/budgets.json`, package exports, declarations, dependencies, and public APIs are unchanged by this documentation slice.
- [x] The completed packed study installs the exact Crumbs artifact outside workspace resolution and proves the app resolves that artifact on both iOS and Android.
- [ ] Each platform report includes production-mode Hermes outputs, source maps, package/artifact/source hashes, exact runtime versions, and a matching plain React Native control.
- [x] Each runtime cell retains at least five independent cold-launch samples and reports the median plus minimum and maximum. Define the measured interval as JavaScript entry execution to the first themed root `onLayout`; label it as first-layout time, not native frame or physical-device startup.
- [x] The report attributes mapped Metro JavaScript bytes to `theme/core` and compatibility `theme` separately and reports platform-specific whole-bundle Hermes deltas against plain React Native. Per-source Hermes cost is not inferred.
- [x] iOS Simulator and Android Emulator results are labelled software-context evidence. No physical-device acceptance is claimed; that work stays deferred.
- [x] The evidence report proposes no automatic threshold change. Any new or replacement target is submitted in a separate explicit review with metric scope, platform, baseline, absolute limit, and allowed regression stated.

## Pros and Cons of the Options

These options record the original proposal. The dated consumer-evidence review in More Information and its accepted policy preserve the subsequent findings; the original absence of consumer measurements is no longer the current state.

### Keep Node checks as the only runtime performance evidence

This preserves the current measurements and avoids new work.

- Good, because the existing package-host checks and their failures remain directly actionable.
- Bad, because it provides no evidence about the Expo/Hermes consumer product named by the architecture decision.
- Bad, because Node startup and emitted local graph bytes are not first-screen or application-bundle measurements.

### Replace or relax current limits now

This would remove current failures from the blocking path without changing public APIs.

- Good, because it could make the current CI result green quickly.
- Bad, because the available evidence supplies no Expo/Hermes target or plain React Native control.
- Bad, because changing approved limits before an explicit evidence review would erase the distinction between a measured failure and a changed policy.

### Add a narrow public runtime entry now

This could offer a smaller import surface to new consumers.

- Good, because an additive entry could serve a future consumer with limited needs.
- Bad, because no measured consumer case establishes which exports belong in it.
- Bad, because a new entry would not fix the existing `theme` or `theme/core` graph checks by itself.
- Bad, because new API and declaration contracts would expand the compatibility surface before their value is demonstrated.

### Preserve current checks and gather Expo/Hermes evidence

This separates host/package gates from consumer runtime evidence and defers target selection until both are available.

- Good, because it preserves current public behavior, approved values, and truthful fail results.
- Good, because the packed app can measure platform-specific bundle contribution and first themed layout against a plain React Native control.
- Good, because an explicit follow-up review can choose whether to retain, add, or replace target metrics with source-pinned evidence.
- Bad, because it leaves current host failures unresolved and requires a dedicated measurement slice.

## More Information

- [M10.5 startup and emitted-graph feasibility](../assessments/2026-10-06-m10-5-startup-graph-feasibility.md).
- [Rejected static runtime-boundary candidate](separate-mandatory-theme-resolution-from-optional-runtime-state.md).
- [Performance budget registry](../../packages/css/bench/budgets.json).
- [Packed playground instructions](../../apps/playground/README.md).
- The later Expo/Hermes evidence may support a new or amended target proposal; it does not itself approve one. Physical-device acceptance remains separately deferred.


### 2026-10-06 — accepted consumer-evidence and target policy

The [policy review](../assessments/2026-10-06-m10-5-target-policy.md) maps every unresolved retained host metric to its unchanged approved maximum and allowed regression. The rejected candidate's 11 passes, nine failures and one Expo environment mismatch remain historical candidate results, not fresh qualification of the current checkout. The [review receipt](../evidence/2026-10-06-m10-5-target-policy/review.json) pins their provenance and the unchanged registry digest.

The [consumer study](../assessments/2026-10-06-m10-5-expo-hermes-runtime.md) is admitted as software-context reference evidence: six matched release apps and export pairs, 30 retained cold-process samples and six excluded warm-ups. Admission establishes the controlled study's identity and completeness, not a performance pass, a causal speed claim, or physical-device acceptance. Five samples per cell in one cohort do not justify rounding the observed medians or byte counts into approved limits.

The accepted policy is:

1. Keep all existing host/package/compiler/editor metrics, baseline selectors, absolute maxima, allowed regressions and enforcement unchanged. Do not reclassify existing failures or waive environment mismatches.
2. Preserve synchronous public APIs and descriptor validation. Do not introduce a narrower public entry solely to avoid existing checks.
3. Keep package emitted graph bytes, mapped consumer JavaScript contribution and whole-bundle Hermes delta separate. Keep JavaScript-entry-to-root-layout time separate from native startup, frame presentation, allocation and retained memory.
4. Require repeatable, independently retained matched cohorts before proposing numerical mobile targets. A target proposal must specify metric identity, workload, platform/environment, baseline, absolute limit, allowed regression and enforcement. Artifact-byte and timing targets may need different repeatability criteria; no sample-count or regression allowance is approved here.
5. Keep all physical-device work deferred. Software targets cannot close physical acceptance or the pending physical metrics.

Follow-up **M10.5 — mobile-target calibration and repeatability plan** must cover these items together:

- Extend `scripts/expo-consumer-native.ts` and `scripts/measure-expo-consumer-runtime.ts` to capture executable Node/npm versions and paths directly before another cohort; cover the distinction from Bun's `process.version` in `scripts/measure-expo-consumer-runtime.test.ts`. Do not rewrite historical H fingerprints; npm's historical version remains unproven.
- Specify independent cohort count, within-cell cold-process repetitions, balanced schedule, failure retention and environment admission before collection. Use the existing packed plain/core/compatibility fixture and owned software-device lifecycle. Do not repeatedly sample until a preferred result appears.
- Specify artifact reproducibility and timing variability checks, a product reason for tolerated regression, and a reject/inconclusive outcome. Do not pool platforms or turn diagnostic negative Android deltas into a claimed optimization.
- Retain the plan under `docs/superpowers/plans/`, the resulting assessment under `docs/assessments/`, and raw evidence under `docs/evidence/`. Any later registry/enforcement change in `packages/css/bench/budgets.json` or `scripts/performance-budgets.ts` requires a separately reviewed per-metric proposal. Add no public API or dependency for this calibration work without its own review.
- Keep host-gap remediation separate: warm full-transform and matched Expo incremental rebuild need their own evidence; mobile calibration cannot resolve them. The roadmap must continue to identify M10.5 as open.

Verification boundary: production-mode Hermes artifacts, source maps, matched controls and recorded environment identities were verified in H. The original exact-runtime-version checkbox above remains unchecked because executable npm version was not captured contemporaneously; retained iOS paths establish Node 24.15.0 and a supplemental post-run receipt records npm separately. Capturing versions directly is a required follow-up, not a retroactive qualification claim.
