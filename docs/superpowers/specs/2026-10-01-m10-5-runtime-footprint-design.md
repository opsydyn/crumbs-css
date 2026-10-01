# M10.5 Runtime Footprint Remediation Design

- **Status:** Design approved; written specification awaiting review
- **Date:** 2026-10-01
- **Roadmap:** M10.5 in [roadmap.md](../../roadmap.md)
- **Depends on:** M10.5 host-budget regression triage and the existing approved performance-budget registry

## Intent

Reduce avoidable runtime initialization and emitted-graph cost while preserving the currently published Crumbs theme API. Improve import granularity for new consumers through additive feature subpaths, and retain direct evidence for every existing host budget. This slice must not disguise a failed budget by changing its threshold, baseline, workload identity, or package compatibility contract.

## Approved understanding

- Preserve every current value export, type export, runtime behavior, and import path from `@opsydyn/crumbs-css/theme` and `@opsydyn/crumbs-css/theme/core`.
- Add focused, optional theme feature subpaths that expose the same canonical feature implementations. Existing consumers are not required to migrate.
- Use packed-consumer and production Metro evidence to determine whether focused imports let applications omit unused feature code. Do not infer tree-shaking from a source split or a successful package build.
- Profile before optimizing. Keep synchronous APIs synchronous and keep React Native, Node ESM, and Node CJS behavior aligned.
- Preserve all approved budget thresholds, recorded baselines, registry membership, and workload identities. Report failures and incomplete comparisons without relabeling them.
- Commit each reviewable slice and recommend the next M10.5 roadmap item after each commit.

## Current evidence and limits

The [host-budget triage](../../assessments/2026-10-01-m10-5-host-budget-triage.md) found eight comparable failures among 21 active recorded metrics: two current-Node initialization metrics and six emitted-graph metrics. The current Node v24.15.0 medians are 3.260 ms ESM and 2.792 ms CJS against approved ceilings of 3.067 ms and 2.444 ms. Both Node v22.0.0 floor initialization measurements pass.

The six graph comparisons use zero-growth ceilings against M4.6. Current `theme/core` emits 64,700 B ESM and 65,559 B CJS versus 17,271 B and 17,641 B. The compatibility `theme` entry emits 157,973 B ESM and 159,563 B CJS versus 44,017 B and 44,764 B. Tokens emit 60,959 B ESM and 68,485 B CJS versus 56,013 B and 63,308 B. The compatibility graph grew as new runtime features were added to the public surface. Keeping all of those exports means moving code between source files alone cannot remove it from the compatibility entry's static graph. Passing the unchanged graph budgets therefore requires measured implementation-size reductions; this design does not assume a file split will pass them.

The ten incomplete host comparisons remain separate: warm transform has a protocol mismatch, Metro has host/workload identity differences, and editor comparisons use different source/workload identities. Device and accessibility evidence remains governed by the existing M10.5 matrix. This design does not qualify those domains.

## Public API and entrypoint architecture

The existing compatibility contract remains exact:

- `@opsydyn/crumbs-css/theme` retains every current named runtime and type export.
- `@opsydyn/crumbs-css/theme/core` retains every current named runtime and type export.
- Existing package export conditions continue to resolve to compatible ESM, CJS, and declaration files. No export is renamed, removed, relocated, deprecated, or made asynchronous.
- Any additive feature subpath re-exports the canonical implementation and types. When the same symbol is available through a legacy entry and its focused subpath, both paths resolve to the same implementation rather than copied wrappers.

Add optional feature-oriented entrypoints for the existing feature families where a bounded consumer import is useful: native conditions, native expressions, component recipes, and sprinkles. The implementation plan will verify exact export names and existing internal module boundaries before fixing filenames. These paths are additive conveniences; they do not change the compatibility entrypoint or promise a byte budget before measurement.

Keep package metadata and builds symmetrical across ESM, CJS, and declarations. Register each new public entry in `package.json` and `tsdown.config.ts`, preserving the current single declaration graph so nominal token brands remain consistent. Do not make platform-conditional export maps or introduce Node-only lazy loading into React Native runtime paths.

The existing `./theme` and `./theme/core` graph budgets remain attached to those exact entrypoints. Focused-subpath or packed-application sizes may be recorded as diagnostic evidence until separately approved thresholds exist; they cannot replace or satisfy the existing compatibility-entry metrics.

## Runtime and performance approach

First use the retained current-Node initialization reports and focused profiling to identify module-evaluation work, allocations, and repeated helpers that can be reduced without changing output or API behavior. Prefer changes such as eliminating duplicated work, moving work that is provably unnecessary at import time behind the operation that needs it, and improving bounded caches only when profiling supports the change. Preserve cache identity, diagnostics, disposal behavior, store notifications, condition semantics, and token ownership/visibility rules.

Extract or reorganize feature implementations only to establish canonical modules that the compatibility entry and additive subpaths can both re-export. Do not treat source-file count, split chunks, or local graph presentation as a performance gain by itself. Do not use lazy loading that changes a synchronous return type, breaks Metro resolution, creates duplicate React contexts, or weakens contract checks.

Optimize token graph growth separately from theme initialization. Preserve token contract identity, public/private visibility, DTCG behavior, and nominal type relationships. Any reduction must pass the existing contract and property-based tests.

## Qualification and acceptance

1. A public API parity test records the current `theme` and `theme/core` value and type exports and proves none are removed or renamed. It also verifies that every existing import used by the packed fixture, Storybook, playground, and documentation still typechecks.
2. Positive tests resolve every new subpath through package exports in ESM and CJS and typecheck its declarations. Shared exports have the same runtime function/object identity through compatibility and focused paths.
3. A packed-consumer fixture installs the built package without workspace aliases, imports focused paths, typechecks, and exports the production Metro bundle. Its inventory identifies whether unused Crumbs feature modules are absent; a bundle result is reported for its exact platform and toolchain.
4. Existing theme, condition, expression, recipe, sprinkles, token, compatibility, and property tests remain green. Tests cover unchanged synchronous behavior and preserve React context/store identity.
5. Run the existing runtime initialization and emitted-graph budget harness with the unchanged commands, identity rules, thresholds, and baselines. Exact Node v22.0.0 floor evidence remains distinct from current-Node evidence. A still-failing metric remains failed; an incomparable run remains incomplete.
6. `bun run budgets:validate` must pass without baseline drift. Registry readiness is reported separately and is not inferred from successful validation.
7. Package build, typecheck, package-entrypoint contract tests, packed-consumer/Metro qualification, and the relevant documentation build pass for the final implementation revision.
8. No new threshold, baseline, or budget membership is created in this slice. If the approved compatibility graph budgets still cannot pass after evidence-led optimizations, M10.5 remains open and the evidence states why. Any later budget-policy change requires a separate explicit decision.
9. No publication, native rendering, device performance, screenshot-diff, or screen-reader claim follows from these host and packed-bundle checks.

## Non-goals

- Do not remove, move, rename, deprecate, or make asynchronous any current `theme` or `theme/core` API.
- Do not change approved performance thresholds, baselines, measurement protocols, or registry membership to manufacture a pass.
- Do not change the Effect dependency, token model, styling semantics, or supported Node/React Native versions.
- Do not claim that additive entrypoints improve consumer bundle size until a packed production bundle demonstrates it.
- Do not close M10.5 while an approved required budget is failed, incomplete, or unrun, or while native/device gates remain open.

## Risks and mitigations

- **The compatibility barrel still includes all re-exported implementations.** Measure the actual entry graph and keep its existing gate visible. Focused imports are additive consumer choices, not a substitute metric.
- **Refactoring creates duplicate implementations or React contexts.** Use canonical module ownership, public identity tests, and store/context regression tests.
- **A smaller source graph changes behavior or diagnostics.** Preserve the synchronous public contracts and validate with existing compatibility, property, and type fixtures.
- **Metro tree-shaking differs from Node or a local build.** Qualify from a packed artifact using the supported Expo/React Native baseline and report exact bundle identity.
- **Optimization trades maintainability for a benchmark result.** Require profile evidence, keep changes localized to identified hot paths, and reject changes that fail output-equivalence or contract checks.

## Design boundary

This document approves a compatibility-preserving architecture and defines its evidence requirements. It does not authorize implementation details or threshold changes. After review of this written specification, the next stage is an implementation plan with exact file boundaries, test-first steps, benchmark protocol, rollback points, and commit-sized slices. Implementation begins only after that plan is reviewed and its execution method is selected.
