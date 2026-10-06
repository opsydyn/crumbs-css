---
status: proposed
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

This ADR is proposed and awaits review. Drafting it does not change an API, approve a new target, or authorize changing an existing threshold.

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
- Bad: the current host-budget failures remain visible and M10.5 stays open while evidence is collected.
- Bad: an Expo consumer study adds a separate harness and repeatable platform runs.
- Neutral: simulator and emulator measurements can qualify software-context behavior, but cannot establish physical-device performance acceptance.

## Implementation Plan

This ADR itself changes documentation only. The subsequent evidence slice should add a repeatable measurement harness and retain its full receipt.

- **Affected paths for this ADR**: `docs/decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md`, `docs/decisions/README.md`, and `docs/roadmap.md`.
- **Affected paths for the later evidence slice**: the packed Expo app under `apps/playground/`; a focused harness at `scripts/measure-expo-consumer-runtime.ts` with tests at `scripts/measure-expo-consumer-runtime.test.ts`; and raw reports under `docs/evidence/<date>-m10-5-expo-hermes/`.
- **Dependencies**: add none for this ADR or the measurement harness. Use the Expo, React Native, React, Metro, and Hermes versions pinned by the consumer lockfile. Any proposed dependency requires its own review.
- **Patterns to follow**: use the isolated packed-consumer path documented in `apps/playground/README.md`; identify the exact package tarball, lockfile, source tree, build configuration, and resulting artifacts by digest; retain raw per-run values and the existing minimum-five-repetition, median, and min/median/max reporting convention.
- **Patterns to avoid**: do not treat Node or Bun timings as Hermes results; do not infer application contribution from the Node emitted-graph sum; do not compare different Expo/RN versions as a paired result; do not label simulator/emulator evidence as physical-device acceptance; do not change a budget, baseline, API, or package dependency during evidence collection.
- **Configuration**: no configuration changes in this ADR. The later harness must record the resolved Expo SDK, React, React Native, Metro, Hermes, OS, architecture, build mode, and platform for every run.
- **Migration steps**: none. Keep current consumers and entrypoints intact. A later target proposal must map old and proposed checks explicitly and be separately reviewed before registry or enforcement changes.

### Verification

- [ ] The ADR, index, and roadmap link to one another and identify the work as M10.5.
- [ ] The ADR remains marked proposed until explicitly accepted or rejected.
- [ ] `packages/css/bench/budgets.json`, package exports, declarations, dependencies, and public APIs are unchanged by this documentation slice.
- [ ] The later packed study installs the exact Crumbs artifact outside workspace resolution and proves the app resolves that artifact on both iOS and Android.
- [ ] Each platform report includes production-mode Hermes outputs, source maps, package/artifact/source hashes, exact runtime versions, and a matching plain React Native control.
- [ ] Each runtime cell retains at least five independent cold-launch samples and reports the median plus minimum and maximum. Define the measured interval as JavaScript entry execution to the first themed root `onLayout`; label it as first-layout time, not native frame or physical-device startup.
- [ ] The report attributes Metro JavaScript and Hermes bytecode size to `theme/core` and compatibility `theme` separately, and compares each with its plain React Native control.
- [ ] iOS Simulator and Android Emulator results are labelled software-context evidence. No physical-device acceptance is claimed; that work stays deferred.
- [ ] The evidence report proposes no automatic threshold change. Any new or replacement target is submitted in a separate explicit review with metric scope, platform, baseline, absolute limit, and allowed regression stated.

## Pros and Cons of the Options

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
