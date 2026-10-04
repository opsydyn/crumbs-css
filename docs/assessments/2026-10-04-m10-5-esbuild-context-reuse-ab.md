# M10.5 esbuild context reuse and invalidation A/B

- Date: 2026-10-04
- Roadmap: M10.5
- Baseline revision: `f1c1e044011eb6d3e858f9481b14999f677807de`
- Status: esbuild-level candidate accepted for bounded-cache feasibility; no production code, threshold, or baseline changed.

## Result

A reused esbuild context reduced changed-entry rebuild time on both source-current fixtures, with exact generated JavaScript and dependency-input parity against fresh Vanilla Extract integration builds.

| Fixture | Fresh `compile()` median | Reused context median | Warm change | Eight-call process total, fresh | Eight-call process total, context |
| --- | ---: | ---: | ---: | ---: | ---: |
| README recipe | 6.081 ms | 3.666 ms | -39.7% | 98.735 ms | 82.281 ms (-16.7%) |
| Consumer button | 6.126 ms | 4.090 ms | -33.2% | 98.222 ms | 85.845 ms (-12.6%) |

Each cell used five fresh processes per variant. The process-total comparison was lower in every paired process: -14.7% to -18.9% for the recipe and -12.5% to -14.0% for the consumer. Process totals include eight transforms; the context total also includes `context()` setup and its initial build. The warm-change medians use six retained, alternating entry edits in each process.

The harness asserts byte-identical generated JavaScript hashes and equal normalized dependency-input lists for all eight builds in each process. It pins the scratch consumer import to the worktree package build, avoiding the shared `node_modules` symlink into the other checkout. The worktree package was rebuilt with `bun run build` before the final A/B.

## Invalidation

A separate fixture using the same installed `@vanilla-extract/integration` and esbuild versions verified that a dependency content edit updates the output, an entry import-edge change removes the old input and records the new one, and a `tsconfig` path-alias change is reflected by `context.rebuild()`. In each case, output and input receipts matched a fresh build. Disposing and recreating the context after the config change also matched. A deliberate stale-result control failed at the expected value assertion after the dependency edit.

This exercises esbuild and Vanilla Extract integration directly. It does not call Crumbs' full native transformer, Metro, or React Native. Esbuild documents that contexts share build options, reuse work on rebuilds, and retain cached file/AST data until disposal; that behavior motivates measuring cache lifetime and bounds before adoption ([esbuild API](https://esbuild.github.io/api/)).

## Limits and next step

The final A/B ran on Node 24.15.0, macOS 25.6.0, arm64, with esbuild 0.27.7 and `@vanilla-extract/integration` 8.0.10. It is diagnostic evidence, not the Node 22 host-budget run. The probe retained one context at a time and disposed it at process end; it does not establish safe memory use across many entry contexts, LRU capacity, Metro worker shutdown behavior, full-transform parity, Hermes/device performance, or release readiness.

Next recommended roadmap slice: **M10.5 bounded context-cache cardinality, retained-memory, eviction, and disposal A/B**. Sweep realistic stylesheet counts and candidate cache bounds, check esbuild service memory and edit latency, and prove full Crumbs transformer output and fresh dependency receipts before considering a production cache. Android remains last.

Reproduction scripts, raw process records, and invalidation results are in [the evidence directory](../evidence/2026-10-04-m10-5-context-reuse-ab/). The machine-readable summary is [qualification.json](../evidence/2026-10-04-m10-5-context-reuse-ab/qualification.json).
