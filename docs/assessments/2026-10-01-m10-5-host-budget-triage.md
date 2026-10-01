# M10.5 host-budget regression triage

## Scope and result

This slice reclassified the retained 2026-10-01 host measurements using comparison report format v2 and traced the approved-threshold failures to their measurement inputs and emitted artifacts. It did not rerun workloads, modify approved limits, alter recorded baselines, or qualify the incomplete native/device domains.

The original format-v1 comparator put workload, protocol and fixture differences under one `incomplete-environment-mismatch` label. Format v2 separates host/toolchain differences from measurement-identity differences and retains the differing field paths. The [reclassified comparison](../evidence/2026-10-01-m10-5-host-budget-triage/comparison.json) uses the original raw reports from the [M10.5 final host run](../evidence/2026-10-01-m10-5-final/host-budgets/).

Of 21 active recorded metrics, three pass, eight fail their approved limits, and ten remain incomplete. The historical `runtime-emitted-bytes` diagnostic still reports its zero-growth comparison separately and does not count toward the 21 active metrics or registry readiness.

## Comparable results and genuine regressions

Both floor-specific Node v22.0.0 initialization measurements pass. Their medians are 6.361 ms ESM against a 7.553 ms ceiling, and 3.913 ms CJS against a 4.083 ms ceiling. The cold-transform metric also passes after fixture paths are canonicalised: 62.147 ms versus the 66.405 ms baseline, a 6.41% decrease. The cold worker uses the fixture-root cwd in both the retained legacy and current protocols. Only the exact known legacy/current ordering descriptions are treated as equivalent for this metric.

The eight comparable failures are two current-Node initialization measurements and six emitted-graph measurements. Baseline and current Node initialization runs both use Node v24.15.0 on Darwin arm64 / Apple M4 Pro, so the differences are not explained by host identity:

| Metric | Baseline | Current median | Change | Approved limits |
| --- | ---: | ---: | ---: | --- |
| Current Node ESM initialization | 2.556 ms | 3.260 ms | +27.55% | 3.067 ms absolute; 20% relative |
| Current Node CJS initialization | 2.037 ms | 2.792 ms | +37.08% | 2.444 ms absolute; 20% relative |
| Theme-core ESM graph | 17,271 B | 64,700 B | +274.62% | 17,271 B; zero growth |
| Theme-core CJS graph | 17,641 B | 65,559 B | +271.63% | 17,641 B; zero growth |
| Tokens ESM graph | 56,013 B | 60,959 B | +8.83% | 56,013 B; zero growth |
| Tokens CJS graph | 63,308 B | 68,485 B | +8.18% | 63,308 B; zero growth |
| Theme compatibility ESM graph | 44,017 B | 157,973 B | +258.89% | 44,017 B; zero growth |
| Theme compatibility CJS graph | 44,764 B | 159,563 B | +256.45% | 44,764 B; zero growth |

The graph scanner uses Bun 1.4.2 and tsdown 0.21.10; npm, Darwin arm64, and the macOS release match the admitted graph evidence. Its stored `node` field is Bun's process-version metadata and is retained for inspection but excluded from the graph environment fingerprint, as documented in the budget protocol.

The emitted artifacts show the shape of the growth: current `theme-core` and compatibility `theme` each emit as one large file, while the tokens entry emits a new identity chunk and a larger domains chunk. Since the M4.6 graph baseline, `theme-runtime.ts` gained 676 lines and removed 3. The additions include exports and runtime paths for component recipes, sprinkles, native conditions, and expressions. The current `theme-core.ts` re-exports this shared runtime surface. This source review identifies likely contributors; it is not a byte-by-byte attribution of each feature.

The initialization evidence is consistent with the same compatibility-entry growth. CJS module-cache bytes rise from 58,712 to 206,968, while the emitted `theme.cjs` grows from 44,764 to 159,563 bytes. That correlation does not isolate the runtime cost of each newly exported feature. The two current-Node medians nevertheless fail both their approved absolute and relative limits; all six graph metrics fail their zero-growth limits.

## Incomplete comparisons

- `warm-transform-ms` has an exact host match but differs at `protocol.ordering`. The current harness moves warm transforms to the fixture-root cwd; the baseline harness did not. The current median is 7.610 ms, 34.35% above the 5.664 ms baseline and above the approved limits, but this result remains incomplete because the measurement protocol changed.
- `incremental-rebuild` has an Expo version difference (`56.0.4` baseline, `56.0.23` current) and measurement-identity differences in `protocol.cacheState` plus the original/restored style and workspace-token hashes. Its observed median is 132.399 ms versus 123.950 ms (+6.82%). No threshold result is assigned to this non-equivalent run.
- All eight editor metrics use the same machine and compiler versions as the baseline, but the comparison inputs differ: `identity.baseRevision`, `identity.crumbsVersion`, the condition/slot-recipe coverage labels, and all three scale-content hashes. Equal generated byte and line counts do not establish identical TypeScript workloads. The observed medians are retained, but none is treated as a pass or fail against the old baseline.

## Follow-up

The v2 report still has ten incomplete active metrics. Warm transforms need a run under a pinned protocol; Metro needs matching Expo and fixture/protocol identity; editor budgets need a stable workload manifest or a separately reviewed replacement baseline. The latter two cannot be made comparable by removing provenance checks.

The registry remains valid but unready: four thresholds are pending, three active baselines are missing, and retained memory is diagnostic. M10.5 remains open for runtime-footprint remediation, equivalent host/editor comparisons, and the separate native screenshot, screen-reader, physical-device and release-device performance gates. No performance qualification is claimed by this triage.
