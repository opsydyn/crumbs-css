# M10.5 runtime budget failure triage

- Date: 2026-10-02
- Roadmap: M10.5
- Code source revision measured: `16697439ef33063c512a8c4ce550af7f9f32a984`
- Status: diagnostic assessment; no implementation, threshold, baseline, or workload changes.

## Scope and evidence boundary

This slice traced the current M10.5 runtime graph failures to emitted source modules and build topology, then tested a scratch-only minified build. It did not modify package source or `tsdown.config.ts`. All diagnostic outputs and scripts were written under `/tmp/crumbs-m10-5-budget-triage-20261002/` and are not release artifacts. Builds used Node 24.15.0, tsdown 0.21.10 / Rolldown 1.0.0-rc.17, the current `node22` target, and the package dependency policy. Timing probes used Bun 1.4.2 to launch fresh Node processes.

The admitted full host comparison retained at `docs/evidence/2026-10-01-m10-5-final/host-budgets/` uses source revision `374e4c44ab8b883a2e93549a2b842d4f827147a1`. It reports two Node 22 floor initialization passes, two Node 24 current-runtime initialization failures, six graph failures, and other incomplete comparisons. The newer graph comparison at the measured code revision `1669743` records all six approved graph comparisons as failures. Its separate 15-run theme import profile also measures newer package code, but has no refreshed full-suite comparison report; use those initialization numbers as diagnostic evidence until the exact M10.5 host suite is rerun.

No result here qualifies Hermes/device performance, packed Metro behavior, screenshots, accessibility, or release readiness. Approved limits and retained baselines remain unchanged.

## Current emitted graphs

The source-current graph report records these six failures against the existing zero-growth ceilings:

| Entry | Format | Baseline / ceiling | Current | Change |
| --- | --- | ---: | ---: | ---: |
| `theme/core` | ESM | 17,271 B | 64,700 B | +274.62% |
| `theme/core` | CJS | 17,641 B | 65,559 B | +271.63% |
| `tokens` | ESM | 56,013 B | 60,968 B | +8.85% |
| `tokens` | CJS | 63,308 B | 68,590 B | +8.34% |
| `theme` compatibility entry | ESM | 44,017 B | 164,366 B | +273.41% |
| `theme` compatibility entry | CJS | 44,764 B | 171,993 B | +284.22% |

All six runtime graphs retain the intended external boundary: `react` only for theme entries and no externals for tokens; no Effect dependency is present in these graphs.

## Source attribution

Source maps were generated in throwaway builds using the current production entry groups and source revision. Mapped output spans were attributed to a source file until the next source-map segment. This is useful for locating size contributors, but it is approximate: the mapper leaves generated wrapper code unmapped and a source span is not a causal estimate of runtime cost. The mapped figures below are byte counts from the ESM source-map builds. Their `sourceMappingURL` comments add 40 B to the core graph, 196 B to tokens, and 316 B to the compatibility graph versus the official no-map outputs; those diagnostic byte deltas are excluded from the source attribution and budget comparisons.

| Graph | Largest mapped contributors |
| --- | --- |
| `theme/core` | `theme-runtime.ts` 17,188 B; `components/contracts.ts` 11,997 B; `components/extension-contract.ts` 11,305 B; `conditions/index.ts` 8,552 B |
| `tokens` | `tokens/domains.ts` 34,199 B; `theme-token.ts` 7,351 B; `theme-contract.ts` 4,929 B; `tokens/identity.ts` 3,332 B |
| `theme` compatibility entry | `theme-runtime.ts` 31,048 B; `components/extension-contract.ts` 24,554 B; `expressions/index.ts` 23,048 B; `runtime/component-recipe-resolution-plan.ts` 16,611 B; `components/contracts.ts` 11,999 B; `conditions/index.ts` 9,125 B; `runtime/theme-recipe-resolvers.ts` 7,348 B; `runtime/sprinkles-resolution-plan.ts` 5,330 B |

The `theme/core` map confirms that the nominally lean public entry still carries component-contract and extension validation code through the shared theme resolver. The compatibility `theme` entry statically includes its recipe, sprinkles, condition, and expression surface; splitting the source files does not remove those features from consumers of that compatibility path. Token output is dominated by `tokens/domains.ts`. These maps locate current contributors but do not isolate which parts account for growth from the M4.6 baselines.

## Entry splitting and import timing

The previous compatibility artifact was one file at 157,973 B ESM and 159,563 B CJS. Building the current `src/theme-runtime.ts` as a throwaway single entry produces 158,140 B ESM and 159,730 B CJS, only 167 B larger in each format. The current multi-entry compatibility graph is 164,366 B ESM and 171,993 B CJS, adding 6,226 B and 12,263 B respectively over that single-entry diagnostic.

Alternating 15 fresh-process probes on Node 22.0.0 and Node 24.15.0 exercised the same `resolveThemeTokens` behavior receipt against the one-entry diagnostic and the current multi-entry graph. Each process measured module evaluation after harness startup; the OS file cache was uncontrolled and warm across repetitions. These are paired diagnostics, not the admitted M10.5 threshold run. Median import times were:

| Runtime | Format | One-entry diagnostic | Current multi-entry | Difference |
| --- | --- | ---: | ---: | ---: |
| Node 22.0.0 | ESM | 6.532 ms | 8.042 ms | +23.1% |
| Node 22.0.0 | CJS | 4.072 ms | 4.802 ms | +17.9% |
| Node 24.15.0 | ESM | 3.322 ms | 4.439 ms | +33.6% |
| Node 24.15.0 | CJS | 2.896 ms | 3.440 ms | +18.8% |

This associates the added chunks with real import overhead, but the one-entry build is not a valid replacement: it does not emit the focused feature subpaths, so this probe does not test the required same-function identity between compatibility and focused imports. It is a lower-bound diagnostic, not a proposed package layout. The old CPU profiles had only five samples and did not identify a feature-level hot function; no such attribution is claimed here.

## Non-breaking minification experiment

A scratch build with `minify: true` kept the existing ESM/CJS entry groups and their split feature outputs. The results preserved all checked runtime export-key sets and shared function identity for condition, expression, recipe, and sprinkles APIs. A `resolveThemeTokens` behavior receipt passed on both Node 22.0.0 and Node 24.15.0, in both module formats. This is a smoke check, not a full package, type, or packed-consumer qualification.

| Entry | Format | Current graph | Minified diagnostic | Change |
| --- | --- | ---: | ---: | ---: |
| `theme/core` | ESM | 64,700 B | 35,294 B | -45.4% |
| `theme/core` | CJS | 65,559 B | 35,515 B | -45.8% |
| `tokens` | ESM | 60,968 B | 29,906 B | -50.9% |
| `tokens` | CJS | 68,590 B | 33,656 B | -50.9% |
| `theme` compatibility entry | ESM | 164,366 B | 87,082 B | -47.0% |
| `theme` compatibility entry | CJS | 171,993 B | 89,799 B | -47.8% |

A matched 15-probe comparison also lowered median theme import time, though all values remained above the unchanged absolute ceilings:

| Runtime | Format | Current build | Minified diagnostic | Approved ceiling |
| --- | --- | ---: | ---: | ---: |
| Node 22.0.0 | ESM | 7.767 ms | 7.566 ms | 7.553 ms |
| Node 22.0.0 | CJS | 4.750 ms | 4.392 ms | 4.083 ms |
| Node 24.15.0 | ESM | 4.397 ms | 3.999 ms | 3.067 ms |
| Node 24.15.0 | CJS | 3.424 ms | 3.106 ms | 2.444 ms |

Minification would bring both token graphs under their existing ceilings in this diagnostic build. It would not close either `theme/core` or compatibility `theme` graph budget, and it would not pass any of the four sampled initialization ceilings. The new theme-profile medians in the retained source-current report (8.038/4.716 ms on Node 22 and 4.318/3.401 ms on Node 24) also exceed the same absolute ceilings; they remain diagnostic pending an exact full-suite refresh.

One qualification detail surfaced: minified CJS emits static module specifiers as no-substitution template literals. The current graph scanner counts those as nonliteral because it only accepts string-literal AST nodes. A throwaway scanner that also recognizes `NoSubstitutionTemplateLiteral` resolves the full graph, reports zero genuinely nonliteral loads, and confirms the same React-only external boundary. The existing scanner must be corrected and regression-tested before a minified build can be admitted as production evidence.

## Recommendation

Keep M10.5 open and preserve every approved threshold, baseline, and workload identity. The next bounded implementation slice should qualify `minify: true` on the actual package entry groups, including a graph-scanner fix for static template-literal module paths. It should verify the full ESM/CJS export and type surfaces, shared identity across compatibility and focused imports, React externalization, existing package tests, packed Expo/Metro output, and the exact Node 22.0.0 / current-Node host budgets. The token graph may then pass its unchanged limits; the remaining `theme/core`, compatibility `theme`, and initialization failures must stay visible and receive a separate source-level optimization diagnosis.

Do not disable or narrow the component APIs in this follow-up. The source maps identify where bytes are concentrated but do not demonstrate a safe semantic extraction. A full M10.5 close still requires the independent environment-matched, visual, device, screen-reader, and release-device evidence listed in the roadmap.
