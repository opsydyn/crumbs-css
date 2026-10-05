# M10.5 full-transform cache and Metro worker lifecycle A/B

- Date: 2026-10-05
- Source revision: `0c6a40d`
- Status: evidence-only experiment; production cache admission remains open
- Evidence: [captured trace](../evidence/2026-10-05-m10-5-full-transform-ab/captured-trace.json), [raw replay](../evidence/2026-10-05-m10-5-full-transform-ab/raw-replay.json), [controls](../evidence/2026-10-05-m10-5-full-transform-ab/controls.json), [qualification](../evidence/2026-10-05-m10-5-full-transform-ab/qualification.json)

## Decision

A retained esbuild context improved complete Crumbs/Expo transform latency by about 7.8% on this seven-entry replay, substantially less than the earlier integration-only improvement. Capacity 4 churned; capacity 8 retained the working set and increased sampled esbuild-service RSS. This supports further admission and lifecycle design, not a production cache or a selected universal capacity.

The important integration requirement is to dispatch dependency capture to the **current transform's callback** on every rebuild. Reusing the initial callback rebuilt esbuild source correctly but lost current native dependency metadata and changed all 56 cache-hit Metro results in the negative control.

## Protocol and provenance

The built CJS transformer was loaded from the designated worktree. Its esbuild inputs resolve the Crumbs ESM style/token artifacts from that same worktree; the shared install supplies third-party tools. Node v24.15.0, esbuild 0.27.7 and Vanilla Extract integration 8.0.10 were used. The package was rebuilt with `bun run build` before collection.

The normal Storybook configuration, with Storybook enabled, strict native diagnostics and Expo's upstream transformer, produced seven successful iOS development CSS-transform requests. The physical shared `node_modules` watch folder was added because the worktree's dependency directory is a symlink. Final app serialization failed with `Unexpected module with full source map found` for Metro's require polyfill. The capture therefore establishes actual successful CSS requests, **not a successful app bundle**. Its error is preserved in the trace. Storybook's generated requires file was restored.

Each fresh parent process started a real two-worker Metro WorkerFarm and replayed those seven requests in captured order, serially. Both the capture and the replay assigned CSS work to one active worker; the other worker was idle for these requests. This is not a concurrent scheduling qualification. The experimental wrapper serialises calls and injects a context implementation into Vanilla Extract's compile function; it changes no package source. It asserts that the only custom esbuild option is Crumbs' single dependency-capture plugin, rather than silently ignoring untested options.

Each process made 63 complete transforms: seven cold requests, six alternating entry-edit passes (42 requests), and two shared-theme passes (14 requests). Entry edits increase the first supported numeric declaration by one and restore it on alternate passes. The theme's control height changes from 48 to 49 and back. All eight authored files are restored in `finally`. Rebuilds refresh source and dependency capture, then run the entire native compiler, generated-module emission and Expo/Babel upstream transform.

Fresh compile, cache capacity 4 and cache capacity 8 each ran in three fresh parent processes with variant order alternated. Warm timing is the median of each process's 56 post-cold transform times, then the median of those three values. It includes native processing and upstream Babel; process telemetry, logging and parent IPC are outside that timer. Total replay durations in raw data include instrumentation, startup and shutdown and must not be treated as uninstrumented throughput.

## Results

| Variant | Warm complete-transform median | Change vs fresh | Warm hit rate | Contexts created / evicted per active worker | Median sampled service RSS peak |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fresh compile | 41.088 ms | — | — | — | 45.1 MiB |
| Capacity 4 | 41.089 ms | +0.0% | 0% | 63 / 59 | 46.1 MiB |
| Capacity 8 | 37.902 ms | -7.8% | 100% | 7 / 0 | 59.2 MiB |

All 567 replay requests, including 378 cache-variant requests, matched a fresh run by exact serialized Metro result SHA-256, entry SHA-1, compiled esbuild source SHA-256 and resolved input list. The seven cold results also matched the actual captured results. Each theme change changed all seven Metro result hashes, and restoration recovered their original hashes. This exercises dependency content refresh; import-graph, alias/config invalidation, errors and concurrent calls still require separate full-transform qualification.

The adapter disposed all 210 contexts created across the six cache runs, including 177 evictions; all 18 worker teardown callbacks completed, and all nine replay farms left zero observed worker/service survivors. Service RSS stayed at its sampled high-water value after context disposal and fell to zero after `esbuild.stop()` removed the process. This describes process RSS, not live per-context allocation or a proved leak. Node worker RSS peaks were approximately 593–627 MiB across variants; these include the complete compiler and Expo/Babel.

## Lifecycle and negative controls

An extra capacity-8 replay used the normal Metro worker without the adapter. Its 63 outputs matched fresh results and no observed process survived shutdown. It retained seven contexts until worker exit and recorded zero explicit disposals or teardown callbacks. Normal process termination released the service; it did not prove awaited `context.dispose()`.

The adapter is a scratch worker bootstrap that delegates to Metro's actual worker and exports the teardown hook awaited by installed Jest Worker. Metro's normal worker does not export that hook, and a transformer-only implementation cannot assume it exists. The adapter is evidence of a possible lifecycle mechanism, not a public Metro integration contract. Private WorkerFarm APIs used by this harness need an explicit compatibility decision before production adoption.

The stale-capture control retained the initial plugin callback. All seven cold results matched; all 56 hits diverged from fresh Metro results even though contexts rebuilt current esbuild source. This catches an easy integration error that generated-source/input parity alone would miss. The control is intentional evidence, not an existing production defect.

## Reproduction and evidence storage

Run from the worktree with current dependencies and built artifacts. Use a new temporary directory for each run. The harness samples `ps` and writes controlled app edits, restoring them after each replay; do not run replays concurrently or alongside app edits.

```sh
node full-transform.cjs --capture <capture-directory>
node full-transform.cjs --matrix <matrix-directory>
node full-transform.cjs --replay <controls-directory>/stock cache 8 0 stock
CRUMBS_AB_STALE_CAPTURE=1 node full-transform.cjs --replay <controls-directory>/stale cache 8 0 adapter
node full-transform.cjs --controls <controls-directory>
node verify.cjs
```

Paths above refer to scripts in `docs/evidence/2026-10-05-m10-5-full-transform-ab`. Create the directories first. The trace records absolute measured paths and captured options; replay requires that checkout identity. Re-capture in another checkout rather than silently substituting paths. Raw files deduplicate argument values via the trace and input lists via SHA-256 receipt references; measurements and per-request hashes remain intact.

## Next roadmap slice

**M10.5 cache admission and lifecycle design**: specify the supported Metro lifecycle mechanism, cache identity/config replacement, concurrent access, error recovery and admission policy; use the observed seven-entry churn to assess a bound rather than select one from the four-entry synthetic trace. Then qualify that design under actual incremental Metro graph invalidation before considering production adoption. The serializer failure should be tracked separately from transformer parity.

The approved 6.514 ms warm-transform host ceiling uses a different workload and remains unchanged. This Node 24 full-transform experiment does not pass that gate, the exact Node 22 host-budget gate, Hermes, device rendering, accessibility or release-device performance. Android remains last.
