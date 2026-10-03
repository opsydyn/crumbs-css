# M10.5 runtime-budget failure triage

- Date: 2026-10-03
- Roadmap: M10.5
- Host-budget source revision: `78d9fd0971305d36014022b2eff06387978d1d54`
- Profile-harness revision: `22d96774feece71e8a08398b9abf4b80e82198f0`
- Source-map graph-attribution revision: `16697439ef33063c512a8c4ce550af7f9f32a984`
- Status: diagnostic assessment; no runtime source, public API, threshold, baseline, or workload changes.

## Evidence boundary

This assessment combines the retained exact-floor host comparison, the corrected eight-cell source-profile run, and source-map graph attribution from the preceding runtime-footprint study. There are no `packages/css/src`, `packages/css/tsdown.config.ts`, or `packages/css/build-policy.ts` changes between the source-map and host-budget revisions, or between the host-budget revision and this checkout. The host suite and profile run are still separate evidence: the host suite determines approved pass/fail status; CPU profiles and source maps only help locate possible contributors.

The host comparison records four exact initialization failures and six exact emitted-graph failures. One cold-transform metric passes. Ten warm-transform, Metro, and editor measurements remain incomplete because their protocol order, environment, or workload identities differ from their baselines; they are not treated as performance failures.

## Initialization failures

`measureRuntimeInitialization` loads `dist/theme.mjs` or `dist/theme.cjs` in fresh Node processes; these four metrics measure the compatibility `theme` entry, not `theme/core`. The protocol excludes process startup, forces garbage collection around module evaluation, and leaves OS cache state warm and uncontrolled. Each runtime/format cell retained fifteen samples.

| Runtime and format | Baseline | Current median | Approved maximum | Result |
| --- | ---: | ---: | ---: | --- |
| Node 22.0.0 ESM | 6.294 ms | 7.939 ms | 7.553 ms | Fail |
| Node 22.0.0 CJS | 3.402 ms | 4.885 ms | 4.083 ms | Fail |
| Node 24.15.0 ESM | 2.556 ms | 4.342 ms | 3.067 ms | Fail |
| Node 24.15.0 CJS | 2.037 ms | 3.386 ms | 2.444 ms | Fail |

The source-profile matrix recorded 512 CPU samples in 120 retained processes, with six samples mapped to Crumbs source across six processes. In the four compatibility `theme` cells, only Node 22.0.0 ESM had a mapped sample: one at `conditions/index.ts:202`; the other three compatibility cells had none. This is too sparse to attribute the four load regressions to a function. The separate scratch change replacing `snapshotFromInput(DEFAULT_INPUT)` with a frozen literal was rejected: all four initialization medians were higher, and each tested ESM/CJS graph grew by 167 bytes.

A preceding single-entry diagnostic provides a more plausible structural lead. Relative to the current multi-entry compatibility graph, it reduced ESM/CJS graph bytes from 164,366/171,993 to 158,140/159,730 and lowered import medians from 8.042/4.802/4.439/3.440 ms to 6.532/4.072/3.322/2.896 ms for Node 22 ESM/CJS and Node 24 ESM/CJS respectively. This is an 18–34% improvement across the probes. The [preceding M10.5 budget-triage assessment](2026-10-02-m10-5-budget-failure-triage.md) records its protocol and source revision. The diagnostic did not emit the focused feature subpaths or test the required compatibility-to-focused function identity, so it is not a valid replacement or qualification. It indicates that chunk layout may contribute to initialization cost; it does not establish that a safe layout change will pass the budgets.

## Emitted-graph failures

The six measured graphs have exact byte counts. The source-module attributions below come from ESM source maps and are approximate spans, not exact historical byte deltas. CJS uses the same entry source and runtime dependencies, but its byte distribution was not separately mapped here.

| Entry and format | Baseline / ceiling | Current | Increase | Largest mapped current contributors |
| --- | ---: | ---: | ---: | --- |
| `theme/core` ESM | 17,271 B | 64,700 B | 47,429 B | `theme-runtime.ts` 17,188 B; `components/contracts.ts` 11,997 B; `components/extension-contract.ts` 11,305 B; `conditions/index.ts` 8,552 B |
| `theme/core` CJS | 17,641 B | 65,559 B | 47,918 B | ESM attribution is the best available source-family locator; CJS wrappers and byte distribution differ |
| `tokens` ESM | 56,013 B | 60,968 B | 4,955 B | `tokens/domains.ts` 34,199 B; `theme-token.ts` 7,351 B; `theme-contract.ts` 4,929 B; `tokens/identity.ts` 3,332 B |
| `tokens` CJS | 63,308 B | 68,590 B | 5,282 B | ESM attribution is the best available source-family locator; CJS wrappers and byte distribution differ |
| Compatibility `theme` ESM | 44,017 B | 164,366 B | 120,349 B | `theme-runtime.ts` 31,048 B; `extension-contract.ts` 24,554 B; `expressions/index.ts` 23,048 B; `component-recipe-resolution-plan.ts` 16,611 B; `contracts.ts` 11,999 B |
| Compatibility `theme` CJS | 44,764 B | 171,993 B | 127,229 B | ESM attribution is the best available source-family locator; CJS wrappers and byte distribution differ |

The current `theme/core` facade re-exports `resolveThemeTokens` and `resolveThemeStyles` from `theme-runtime.ts`. Those generic resolvers dispatch component-recipe and extension descriptors through the component contract validators, and dispatch recipes and sprinkles through their respective resolvers. That reachable behavior explains why the nominally lean entry still includes component validation code. The facade also directly exports the native condition runtime. Removing these imports without changing behavior would require a different internal design; dropping the behavior would change the established API semantics.

The compatibility `theme` entry deliberately carries the wider token-scope, dependency-plan, recipe, sprinkles, expression, and condition surface. The source maps locate those costs in the shared runtime and feature modules. The `tokens` graphs show a smaller absolute increase, concentrated in domain and token-contract code. These maps identify current payload contributors, but they do not prove that each mapped byte is newly added relative to the old baseline.

## Decision and next experiment

No source-level optimization was selected in this triage. The condition-snapshot candidate is ruled out, and API removal or validation bypass would violate the no-breaking-change constraint. Minification has already been qualified against the actual entry groups: it reduces emitted graphs substantially, but only token ESM/CJS pass their unchanged graph limits; theme initialization and theme graph budgets still fail.

The next bounded M10.5 experiment should test **identity-preserving compatibility-entry chunk layout**. Use the single-entry result only as a hypothesis, preserve every compatibility and focused export, and add an explicit cross-entry function-identity receipt before accepting any graph or timing result. Compare the four existing Node initialization metrics and the compatibility ESM/CJS graph totals against their unchanged limits. If a faster/smaller layout cannot preserve identity, discard it. Keep the `theme/core` and token graph failures separately visible; do not relax their budgets or alter runtime semantics to make the comparison pass.

No result here establishes Metro/Hermes, native rendering, accessibility, device, or release performance. Android remains parked for the final device-specific roadmap work.
