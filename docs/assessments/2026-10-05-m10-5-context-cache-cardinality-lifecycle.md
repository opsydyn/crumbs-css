# M10.5 bounded esbuild context-cache cardinality and lifecycle A/B

- Date: 2026-10-05
- Roadmap: M10.5
- Baseline revision: `e64b846d0cf2252a5ecbb23be82d05307527dbb8`
- Status: bounded-cache feasibility measured at the integration boundary; no production cache, threshold, or baseline changed.

## Result

The scratch LRU behaved as bounded and disposed every context it created. In this synthetic workload, a capacity of four was sufficient for all hits in a four-entry hot set. A capacity of one repeatedly evicted and recreated contexts, and drove the esbuild service to much higher sampled RSS. The results are not sufficient to choose a production cache size: this fixture is not a Metro transform trace, and the service RSS varied non-monotonically with capacity.

The matrix ran 27 fresh Node processes on Node 24.15.0 / macOS 26.6.2 / arm64, using esbuild 0.27.7 and `@vanilla-extract/integration` 8.0.10. Each process scanned 1, 8, or 32 cloned Crumbs recipe entries sharing one theme module, then exercised a repeated, skewed access pattern across up to four of the most recently scanned entries. Every distinct entry/value result was compared after context disposal with a fresh integration compile by exact generated-source SHA-256 and normalized input receipt: **654 comparisons passed**.

The generated-source hashes include each process's unique temporary fixture path, so they differ across fresh workers by design. The harness keeps each worker's exact output hashes, shares only the normalized dependency lists, and asserts those input lists match across workers.

| Entries | Capacity | Hot-phase hit rate | Contexts created / evicted per process | Warm hit median | Sampled peak esbuild service RSS | RSS after context disposal |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 100% | 1 / 0 | 4.69 ms | 31.8 MiB | 31.8 MiB |
| 8 | 1 | 0% | 64 / 63 | — | 136.3 MiB | 136.3 MiB |
| 8 | 4 | 100% | 8 / 4 | 4.75 ms | 53.9 MiB | 53.9 MiB |
| 8 | 8 | 100% | 8 / 0 | 6.38 ms | 55.7 MiB | 55.7 MiB |
| 32 | 1 | 0% | 88 / 87 | — | 129.4 MiB | 129.4 MiB |
| 32 | 4 | 100% | 32 / 28 | 4.59 ms | 118.2 MiB | 118.2 MiB |
| 32 | 8 | 100% | 32 / 24 | 5.21 ms | 110.5 MiB | 110.5 MiB |
| 32 | 16 | 100% | 32 / 16 | 6.64 ms | 111.5 MiB | 111.5 MiB |
| 32 | 32 | 100% | 32 / 0 | 4.53 ms | 132.5 MiB | 132.6 MiB |

The hot-phase hit rate excludes the initial cold scan. “Sampled peak” is the larger of the post-cold-scan and post-hot-workload RSS snapshots, not a continuous process peak. Esbuild documents that context disposal waits for active builds and frees context resources ([API](https://esbuild.github.io/api/)); after every cache entry was disposed, the service nevertheless stayed resident near its measured high-water RSS. Calling `esbuild.stop()` then removed the service child in all 27 processes. This is process RSS evidence, not a measurement of live per-context bytes; allocator high-water behavior may explain why disposal did not lower RSS.

The independent LRU control passed the sequence `A, B, A, C, B` at capacity 2: the second `A` hit, then `B` and `A` were evicted in order. Across the full matrix, all **891 created contexts were disposed**, and all caches ended with zero retained entries. The package build passed first with the existing Node 22 target. The benchmark and its fixtures live in the [evidence directory](../evidence/2026-10-05-m10-5-context-cache-ab/); machine-readable aggregates and process-level receipts are in [qualification.json](../evidence/2026-10-05-m10-5-context-cache-ab/qualification.json) and [raw-context-cache.json](../evidence/2026-10-05-m10-5-context-cache-ab/raw-context-cache.json).

## Limits and next step

This is Node 24 Vanilla Extract integration evidence using synthetic cloned entries. It does not exercise Crumbs' complete native transformer, a real Expo/Metro request trace, Metro worker shutdown, Node 22 host budgets, Hermes, a device, Android, or release behavior. The worktree package was rebuilt before measurement; the worktree's dependency symlink resolved esbuild and Vanilla Extract from the existing shared install. No public API or production code changed.

Next recommended roadmap slice: **M10.5 full-transform cache integration and Metro worker-lifecycle A/B** — replay a captured Expo Storybook transform trace through the complete Crumbs transformer, compare fresh and cached output plus dependency receipts, and measure resident RSS over realistic edits and worker shutdown. Include capacity 4 as a candidate, not as a selected production bound. Keep the Node 22 host-budget and device gates separate; Android remains last.

Reproduce after rebuilding the package with `bun run build` from `packages/css`: run `node docs/evidence/2026-10-05-m10-5-context-cache-ab/context-cache-bench.cjs`. The worker uses isolated temporary fixture directories and removes them after each run.
