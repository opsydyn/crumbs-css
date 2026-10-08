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


### 2026-10-08 — accepted conditional expanded-runtime byte scope

Alan P Currie approved the [expanded-runtime scope spec](../superpowers/specs/2026-10-08-m10-5-expanded-runtime-budget-scope-design.md), following the [feature/API scope review](../assessments/2026-10-08-m10-5-budget-api-scope.md). This dated amendment permits initial caps of **39,000 B core ESM, 39,000 B core CJS, 96,000 B compatibility ESM and 99,000 B compatibility CJS**, retaining the existing IDs/selectors. It amends the earlier unchanged-host rule only for these four rows, and only on complete qualifying admission.

Actual independently qualified bytes become baseline `B`; the cap is `C`, with `absoluteMax=C` and `maxRegressionPercent=0`. Later measurements must satisfy both `M<=B` and `M<=C`. All seventeen other host contracts, including four startup cells and warm transform, remain unchanged. The original limits and failed results remain immutable historical/stated stretch objectives; they are not retrospectively passed. No mobile target is approved.

The [single inline plan](../superpowers/plans/2026-10-08-m10-5-expanded-runtime-remediation.md) implements deterministic three-build admission and policy/report/manifest bindings. Written plan review is still required. The [approval receipt](../evidence/2026-10-08-m10-5-expanded-runtime-plan/approval.json) preserves the exact original decision snapshot. Until every behavioural, software-context and 21-row host condition passes in one complete candidate, the current registry and release enforcement remain in force. Rejecting any condition removes the whole candidate and retains evidence only. M10.5 stays open; the broader compiler ADR remains proposed, physical-device/spoken-reader acceptance deferred, and hosted-runner qualification distinct from local proof.

### 2026-10-08 — proposed consumer-scoped host release enforcement

The [consumer decision](../assessments/2026-10-08-m10-5-consumer-decision.md) parks speculative runtime rewrites. The subsequent approved **policy review** produced a [concrete proposal](../assessments/2026-10-08-m10-5-host-policy-review.md): keep all 21 comparisons and numerical contracts, make ten runtime proxies advisory for release admission, and retain eleven compiler/Metro/editor comparisons as blocking. Valid advisory threshold failures remain failures; incomplete or invalid evidence still blocks. No numerical mobile target is proposed.

**Status: proposed, not accepted or active.** Approval to conduct the review did not approve this enforcement reduction. The accepted policy, conditional four-cap amendment and implemented all-21-pass gate remain unchanged. If this proposal is accepted, it replaces that release prerequisite and the unactivated byte-admission requirement; historical limits/caps/results remain intact. See the assessment for exact per-ID classification, risks, format/policy bindings, affected files, implementation outline and checkable acceptance criteria.

Next **M10.5** item: review the exact 11-blocking/10-advisory proposal, then implement it as one complete policy slice if approved. Dedicated runner qualification and any remaining blocking comparison failures must still be resolved before release. Physical-device/spoken-reader acceptance remains deferred; no publication or broader compiler-architecture acceptance follows.

### 2026-10-08 — accepted consumer-scoped release enforcement

Alan P Currie explicitly approved the exact [11-blocking/10-advisory proposal](../assessments/2026-10-08-m10-5-host-policy-review.md) presented at `60499bf`; the [approval receipt](../evidence/2026-10-08-m10-5-consumer-policy-plan/approval.json) pins its reviewed bytes. This supersedes the original all-21-pass publication prerequisite and the unactivated conditional four-cap byte-admission path at policy level. Every numerical contract, historical result and baseline remains unchanged. Advisory failures stay visible; invalid/incomplete evidence and any blocking comparison failure still prevent release. No numerical mobile target is accepted.

The [single-task implementation plan](../superpowers/plans/2026-10-08-m10-5-consumer-scoped-host-policy.md) covers the private policy, report/manifest formats, bindings, both jobs, adversarial controls and a fresh host result together. The written plan is pending review with inline execution preserved. **Acceptance is not activation:** current code continues requiring 21 passes until the complete implementation is verified and committed. M10.5 remains open; current host failures, dedicated runner qualification and deferred physical/spoken-reader acceptance are separate. No push/publication is approved.

### 2026-10-08 — Consumer-scoped host policy implemented

The approved single implementation slice activates `crumbs-host-budgets-2026-10-08-consumer-scope-v1`: eleven compiler/Metro/editor comparisons block admission, while four Node startup and six emitted runtime graph comparisons remain advisory. All 21 measurements, numerical contracts and historical evidence remain intact. Incomplete or invalid advisory evidence still blocks. Comparison 3, before/after policy bindings and manifest 2 independently bind both release jobs to the approved policy, unchanged registry and baseline hashes.

Synthetic controls exercise admission with all ten advisory failures, rejection of blocking failures and rejection of resealed report/policy tampering. They do not qualify host performance. The final real host result is recorded in [the implementation assessment](../assessments/2026-10-08-m10-5-consumer-policy-implementation.md). A working-tree report cannot stand in for exact release-commit qualification. M10.5 remains open; dedicated runner registration and retained blocking failures remain prerequisites. Physical-device and spoken-reader work stays deferred. No push or publication is authorised.
