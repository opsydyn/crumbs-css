# M10.5 final current-source host-budget gate rerun

**Outcome: unqualified.** The approved host gate completed all 21 comparisons: **11 pass, nine fail, one incomplete**. The incomplete Metro comparison does not count as a pass or failure because its Expo and Metro versions differ from the approved environment. All approved selectors, thresholds, and baselines remain unchanged; physical-device acceptance remains deferred.

## Source and collection integrity

The run used source revision `dbf491d12c5700f50c77d646873bece3bf341f20` with content SHA-256 `4e519e759379541fbdc557e61e3968e59c94c6f3e617508271f4ace56d6ef70d` across 675 tracked source files. It supersedes the earlier gate at `b7c20705109a1ea6a47a7a1ac95cd7c95de79544`, whose source SHA-256 was `23b89158a7642af4a4f7c8693cd79b2a21a34b74bdf52be967c2efd1049bfebd` across 670 files. The source delta contains 17 changed or added paths and 0 removed paths, including the newly admitted additive `theme/token` API and its consumer/type-test coverage. See [`source-delta.json`](source-delta.json) for the path-by-path hashes.

The source manifest and digest were identical before and after collection, and all 149 built package artifacts retained matching hashes. The collector ran in a disposable clean clone after `bun install --frozen-lockfile` (1,094 packages installed) and `bun run check`.

## Toolchain and checks

The measurement host was Bun 1.4.2 on macOS 26.6.2, darwin/arm64, Apple M4 Pro. Runtime initialization used 15 fresh-process samples per selector with exact Node v22.0.0 (SHA-256 `9507031f6769f2381eae353b3614bafa871c957dc6f2ae86a3af948acdf9b178`) and Node v24.15.0 (SHA-256 `3200fbd9f7fd4410426dd541e10d1ab829d3472f270d743c7fabd1696c03fe32`). The current-version binary is not inferred from the shell default; its path and hash are retained in `qualification.json`.

`bun run check` passed: CSS package tests reported 1,515 passed, one Node-floor-only skip, and zero failures; Storybook reported 23 passed and zero failures. `bun run budgets:validate` returned valid with zero baseline issues. Registry readiness remains false because four future/device-facing thresholds are pending; this is distinct from the host gate result.

## All 21 approved metrics

| Metric | Approved baseline | Current median | Change | Result |
| --- | ---: | ---: | ---: | --- |
| `runtime-initialization-node22-esm` | 6.294 ms | 8.639 ms | +37.26% | Fail |
| `runtime-initialization-node22-cjs` | 3.402 ms | 5.337 ms | +56.88% | Fail |
| `runtime-initialization-current-esm` | 2.556 ms | 4.618 ms | +80.71% | Fail |
| `runtime-initialization-current-cjs` | 2.037 ms | 3.728 ms | +83.07% | Fail |
| `cold-transform-ms` | 66.405 ms | 81.051 ms | +22.06% | Pass |
| `warm-transform-ms` | 5.664 ms | 10.370 ms | +83.08% | Fail |
| `incremental-rebuild` | 123.950 ms | 130.462 ms | +5.25% | Incomplete (environment mismatch) |
| `editor-tsc-wall-10000` | 882.106 ms | 556.952 ms | -36.86% | Pass |
| `editor-tsgo-wall-10000` | 332.922 ms | 161.076 ms | -51.62% | Pass |
| `editor-tsc-memory-10000` | 285,025 KiB | 215,813 KiB | -24.28% | Pass |
| `editor-tsgo-memory-10000` | 140,013 KiB | 112,061 KiB | -19.96% | Pass |
| `editor-tsc-instantiations-10000` | 490,410 | 113,973 | -76.76% | Pass |
| `editor-tsgo-instantiations-10000` | 490,508 | 114,072 | -76.74% | Pass |
| `editor-first-completion-10000` | 39.288 ms | 33.438 ms | -14.89% | Pass |
| `editor-warm-completion-10000` | 30.387 ms | 25.119 ms | -17.33% | Pass |
| `runtime-theme-core-esm-graph-bytes` | 17,271 bytes | 64,549 bytes | +273.74% | Fail |
| `runtime-theme-core-cjs-graph-bytes` | 17,641 bytes | 65,408 bytes | +270.77% | Fail |
| `runtime-tokens-esm-graph-bytes` | 56,013 bytes | 29,906 bytes | -46.61% | Pass |
| `runtime-tokens-cjs-graph-bytes` | 63,308 bytes | 33,656 bytes | -46.84% | Pass |
| `runtime-theme-compatibility-esm-graph-bytes` | 44,017 bytes | 164,215 bytes | +273.07% | Fail |
| `runtime-theme-compatibility-cjs-graph-bytes` | 44,764 bytes | 171,842 bytes | +283.88% | Fail |

The nine failures are the four runtime-initialization rows, warm transform, and four `theme/core` or compatibility-theme graph rows. The current `theme/core` graph is 64,549 bytes ESM / 65,408 bytes CommonJS; compatibility-theme is 164,215 / 171,842 bytes. The existing `runtime-tokens` selector passes at 29,906 / 33,656 bytes. No new selector or budget was added for `theme/token`.

The incremental rebuild measured 130.462 ms, but is incomplete because this collection used Expo 56.0.23 / Metro 0.84.5 instead of approved Expo 56.0.4 / Metro 0.84.4. React Native 0.85.3 matches the approved version.

## Controls and next slice

The official [`comparison.json`](host-budgets/comparison.json) retains every approved metric, threshold comparison, and environment classification. [`qualification.json`](qualification.json) records source/toolchain identities, check results, metric outcomes, and controls. [`host-budgets/`](host-budgets/) retains the raw reports and logs. No production source, API, dependency, budget, baseline, threshold, or enforcement rule changed in this gate. Host measurements do not establish Hermes or physical-device performance.

**Next recommended numbered slice: M10.5 — select one API-preserving remediation candidate for the runtime-initialisation, warm-transform, and theme graph failures using the current source and graph evidence.** Preserve every approved budget and the public API; do not repeat rejected cache or static-extraction candidates. Require the unchanged exact host gate to pass before production admission.
