# M10.5 host-budget result triage

- Date: 2026-10-04
- Roadmap: M10.5
- Current host-budget source revision: `1ffc68f581eaae0d4970f7736abc102b5e41c76e`
- Comparison source revisions: `374e4c44ab8b883a2e93549a2b842d4f827147a1` and `78d9fd0971305d36014022b2eff06387978d1d54`
- Status: diagnostic assessment; no runtime/API, budget, threshold, or baseline changes

## Result

The 2026-10-04 exact-floor host run completed with one pass, ten approved-limit failures, and ten incomplete comparisons. `cold-transform-ms` is the sole pass. Four module-initialization metrics and six emitted-graph metrics fail their existing comparisons. Warm transform, Metro, and editor measurements remain incomplete; their observed values do not qualify against the retained limits.

The exact Node v22.0.0 executable was verified by SHA-256 as `9507031f6769f2381eae353b3614bafa871c957dc6f2ae86a3af948acdf9b178`. The 2026-10-01 and 2026-10-04 reports name the same Apple M4 Pro arm64 host, macOS release, runtime versions, and initialization protocol. Their source revisions differ, so the comparison is useful for locating a regression window, not proving a single commit caused it.

## Initialization regression window

| Measured source | Node 22 ESM | Node 22 CJS | Node 24 ESM | Node 24 CJS |
| --- | ---: | ---: | ---: | ---: |
| `374e4c4` (2026-10-01) | 6.361 ms, pass | 3.913 ms, pass | 3.260 ms, fail | 2.792 ms, fail |
| `78d9fd0` (2026-10-02) | 7.939 ms, fail | 4.885 ms, fail | 4.342 ms, fail | 3.386 ms, fail |
| `1ffc68f` (2026-10-04) | 7.773 ms, fail | 4.612 ms, fail | 4.118 ms, fail | 3.213 ms, fail |

The approved maxima are 7.553/4.083 ms for Node 22 ESM/CJS and 3.067/2.444 ms for Node 24 ESM/CJS. The first recorded source transition from passing to failing Node 22 results lies between `374e4c4` and `78d9fd0`. That interval adds the resolver extraction (`91892df`), focused theme entrypoints (`4f7ab9d`), and shared token-path encoding (`48e8608`). The current source also includes later component-validation fast paths; from `78d9fd0` to `1ffc68f`, medians improved by 2.1–5.6%, but remain above all four approved maxima.

The comparison identifies a source-change interval, not a causal commit. The retained 512-sample source-profile matrix at the intermediate revision mapped only six samples to Crumbs source, with no repeated hotspot across the four compatibility-`theme` initialization cells. The compatibility entrypoint is the workload for all four initialization metrics; this is distinct from loading `theme/core`. No available profile justifies assigning the regression to a specific resolver or function.

## Emitted graph findings

The table compares the current exact byte counts with the unchanged zero-growth M4.6 reference, and also shows the size change since the 2026-10-01 source run.

| Entry / format | Approved reference | `374e4c4` | `1ffc68f` | Current growth vs reference | Change since `374e4c4` |
| --- | ---: | ---: | ---: | ---: | ---: |
| `theme/core` ESM | 17,271 B | 64,700 B | 64,549 B | +273.74% | -151 B |
| `theme/core` CJS | 17,641 B | 65,559 B | 65,408 B | +270.77% | -151 B |
| `tokens` ESM | 56,013 B | 60,959 B | 60,968 B | +8.85% | +9 B |
| `tokens` CJS | 63,308 B | 68,485 B | 68,590 B | +8.34% | +105 B |
| compatibility `theme` ESM | 44,017 B | 157,973 B | 164,215 B | +273.07% | +6,242 B |
| compatibility `theme` CJS | 44,764 B | 159,563 B | 171,842 B | +283.88% | +12,279 B |

The `theme/core` and token graph failures were already present at `374e4c4` and have changed very little since. The compatibility graph was already more than 3.5 times its reference at that revision and is larger in the current build. Earlier source-map attribution locates sizeable current payloads in shared theme runtime, component/extension validation, conditions, expressions, recipe planning, and token domains; those spans describe current contributors, not exact byte deltas from the historical reference ([2026-10-03 runtime triage](2026-10-03-m10-5-runtime-budget-failure-triage.md)). The approved zero-growth comparisons therefore reveal longstanding footprint gaps, with additional compatibility-entry growth since the October 1 run.

Minification is not a qualified remedy: the retained candidate reduced graphs but left `theme/core` and compatibility `theme` above their existing limits and made all four initialization medians substantially slower. It remains out of the default build.

## Incomplete measurement identities

| Metric group | Retained comparison difference | Current observation |
| --- | --- | --- |
| Warm transform | The measured warm call now uses the fixture-root process cwd; the approved September 14 baseline used the earlier ordering/cwd protocol. | 7.618 ms vs 5.664 ms baseline (+34.50%; above the numerical 6.514 ms ceiling), but status stays incomplete until the workload identity is matched. |
| Metro incremental rebuild | Baseline Expo is 56.0.4; current Expo is 56.0.23. Cache protocol changed, and original/restored style and workspace-token fixture hashes differ. | 134.271 ms vs 123.950 ms baseline (+8.33%), numerically below the 137.506 ms ceiling; status remains incomplete. Current fixtures were restored after all five repetitions. |
| Eight editor metrics | Baseline package is `0.1.2-alpha.2`; current is `0.1.1-alpha.1`. Base revision, condition/slot-recipe coverage labels, and all three scale-source hashes differ. Equal byte and line counts do not make the generated type workloads equivalent. | Lower current wall-time, memory, instantiation, and completion numbers remain unqualified; neither a pass nor a fail is assigned. |

These are provenance mismatches, not ten additional performance failures. Retained identities must be made comparable through an explicitly matched protocol or a separately reviewed replacement workload; dropping identity fields would conceal real workload changes.

## Decision and next experiment

No further source change or baseline adjustment is justified by this triage. M10.5 remains open, and the budget registry remains valid but unready with its device-facing thresholds and baselines incomplete. Host measurements do not establish Hermes/device performance, native rendering, accessibility, or Android acceptance.

Next bounded M10.5 slice: run a matched compatibility-entry initialization and graph attribution across `374e4c4`, `91892df`, `4f7ab9d`, `48e8608`, and the current source. Keep the Node 22 binary, build toolchain, 15 fresh-process repetitions, and graph-scan protocol fixed; capture module/source attribution alongside timing and verify export and cross-entry identity receipts. This will distinguish the runtime-entry changes that first cross the Node 22 limits from later graph and validator work before selecting another implementation A/B. Leave all approved limits and historical baselines unchanged; keep native/device qualification separate and Android last.
