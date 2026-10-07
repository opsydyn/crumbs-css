# M10.5 final current-source host-budget gate

**Outcome: unqualified.** The final current-source host gate completed all 21 approved metric comparisons: 11 pass, nine fail, and one remains incomplete because Expo/Metro identities differ from the approved baseline. No threshold, baseline, API, or production dependency changed.

## Why a new run was required

The earlier current-host report was no longer source-current. Its authored-source digest was `db9a02ecd57c1c0c11f96ea19640fb975f447ae03bf52117ef2dcc3c349f9894` across 667 files; the current digest is `23b89158a7642af4a4f7c8693cd79b2a21a34b74bdf52be967c2efd1049bfebd` across 670 files. Twelve source paths were changed or added since that report, including the transformer and compiler-session identity/invalidation tests. [`source-delta.json`](source-delta.json) records every difference. This fresh run therefore supersedes the earlier host result for current-source decisions.

## Collection integrity

The collector ran in a clean clone of commit `b7c2070` after `bun install --frozen-lockfile` and `bun run check`. It used Bun 1.4.2, exact Node v22.0.0 (SHA-256 `9507031f…`) and configured Node v24.15.0 (SHA-256 `3200fbd9…`) on Apple M4 Pro / darwin arm64. The source digest remained `23b89158a7642af4a4f7c8693cd79b2a21a34b74bdf52be967c2efd1049bfebd` before and after the measurement, and all 145 built package artifacts kept identical hashes. The Node 22 floor and current Node measurements each used 15 fresh-process repetitions; graph scans used five repetitions; the benchmark suite used five process reports.

`bun run check` passed: CSS package 1,502 passed, one exact-floor-only skip, zero failures; Storybook 23 passed. `bun run budgets:validate` returned valid with zero baseline issues. The registry remains not ready because four future/device metrics have pending thresholds and three baselines are missing. The host report is still unqualified because of the measured failures below.

## All 21 approved metrics

| Metric | Approved baseline | Current median | Change | Result |
| --- | ---: | ---: | ---: | --- |
| `runtime-initialization-node22-esm` | 6.294 ms | 8.393 ms | +33.36% | Fail |
| `runtime-initialization-node22-cjs` | 3.402 ms | 5.222 ms | +53.50% | Fail |
| `runtime-initialization-current-esm` | 2.556 ms | 4.595 ms | +79.79% | Fail |
| `runtime-initialization-current-cjs` | 2.037 ms | 3.557 ms | +74.68% | Fail |
| `cold-transform-ms` | 66.405 ms | 78.848 ms | +18.74% | Pass |
| `warm-transform-ms` | 5.664 ms | 9.973 ms | +76.08% | Fail |
| `incremental-rebuild` | 123.950 ms | 131.619 ms | +6.19% | Incomplete (Expo/Metro identity mismatch) |
| `editor-tsc-wall-10000` | 882.106 ms | 560.037 ms | -36.51% | Pass |
| `editor-tsgo-wall-10000` | 332.922 ms | 159.379 ms | -52.13% | Pass |
| `editor-tsc-memory-10000` | 285,025 KiB | 215,832 KiB | -24.28% | Pass |
| `editor-tsgo-memory-10000` | 140,013 KiB | 112,068 KiB | -19.96% | Pass |
| `editor-tsc-instantiations-10000` | 490,410 count | 113,973 count | -76.76% | Pass |
| `editor-tsgo-instantiations-10000` | 490,508 count | 114,072 count | -76.74% | Pass |
| `editor-first-completion-10000` | 39.288 ms | 33.547 ms | -14.61% | Pass |
| `editor-warm-completion-10000` | 30.387 ms | 25.305 ms | -16.72% | Pass |
| `runtime-theme-core-esm-graph-bytes` | 17,271 bytes | 64,549 bytes | +273.74% | Fail |
| `runtime-theme-core-cjs-graph-bytes` | 17,641 bytes | 65,408 bytes | +270.77% | Fail |
| `runtime-tokens-esm-graph-bytes` | 56,013 bytes | 29,906 bytes | -46.61% | Pass |
| `runtime-tokens-cjs-graph-bytes` | 63,308 bytes | 33,656 bytes | -46.84% | Pass |
| `runtime-theme-compatibility-esm-graph-bytes` | 44,017 bytes | 164,215 bytes | +273.07% | Fail |
| `runtime-theme-compatibility-cjs-graph-bytes` | 44,764 bytes | 171,842 bytes | +283.88% | Fail |

The four runtime-initialisation rows, warm transform, and four theme/core or compatibility-theme graph rows fail their existing budgets. The `theme/core` graph is 64,549 bytes ESM / 65,408 bytes CJS; the compatibility theme graph is 164,215 / 171,842 bytes. Token-only graphs pass at 29,906 / 33,656 bytes. The single incomplete row measured 131.619 ms (+6.19%), but current Expo 56.0.23 / Metro 0.84.5 does not match the approved Expo 56.0.4 / Metro 0.84.4 baseline; React Native is 0.85.3 in both.

The machine-readable [`comparison.json`](host-budgets/comparison.json) contains the complete result and diagnostic fields. [`qualification.json`](qualification.json) summarizes gate status, toolchain, source/artifact continuity, package checks, and controls; [`host-budgets/`](host-budgets/) retains every raw collector report and log. The Metro fixture’s style, token, base-style, and workspace-token restore hashes match their originals.

## Scope and next slice

This was a host gate only; physical-device acceptance remains deferred as instructed. M10.5 is not performance-qualified. The no-cache compiler-adapter candidate remains rejected, and the current warm-transform failure remains open.

**Next recommended numbered slice: M10.5 — select one API-preserving remediation candidate for the runtime-initialisation and theme graph failures using the current source and graph evidence.** Preserve the full API and approved budgets; do not repeat rejected compiler caches, static extraction, or threshold changes. Require the exact host matrix to pass before admission.
