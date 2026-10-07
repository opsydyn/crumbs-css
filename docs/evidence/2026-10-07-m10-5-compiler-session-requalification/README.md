# M10.5 current-source compiler-session requalification

This evidence packet requalifies the private retained esbuild-session candidate against the source at commit `2e9d53c`. The decision is **reject**: the current Metro path returns stale compiled output after an entry is edited, its import is removed, and the original entry is restored. In the fixed 105-process warm matrix, all 90 retained-session variants are slower than their matched fresh-compilation controls.

## Run identity

`qualification.json` records the current source revision, Node 24.15.0 and exact Node 22.0.0 executable identities, Bun 1.4.2, Vanilla Extract integration 8.0.10, esbuild 0.27.7, candidate artifact hash, workload hash, and the unchanged shipping source inventory. The candidate was built and run in a disposable directory. `raw/` preserves all 124 compressed reports; `receipts/` preserves all 128 compressed source/input/metadata/result blobs. `archive-manifest.json` pins every file by SHA-256.

## Findings

- All 105 fresh-process matrix runs completed. The 90 retained-mode runs match their fresh control on every per-request source, input, native metadata, and final result hash: 6,690 paired rows. All matrix workers closed with no live session, cleanup errors, or surviving processes.
- Every retained warm median was slower than its matched fresh process. Fresh medians were 10.64 ms (seven-entry), 10.65 ms (hot-scan), and 10.79 ms (32-entry). The fastest retained medians were 32.00 ms, 32.23 ms, and 35.09 ms respectively. These are harness comparisons, not the approved host-budget measurement.
- Actual Metro edit/invalidation controls fail the entry-restore case. The candidate’s source, input, metadata, and result hashes remain those from the preceding import-removal transform, while a fresh reference matches the original entry. The exact mismatch hashes are in `qualification.json` and the full `incremental` receipt.
- Single-worker owner and three idle/reopen cycles at 1, 30, and 120 seconds pass with zero retained resources at close. The non-threaded Metro shutdown gate observed four worker/service survivors at its two-second check; worker-thread shutdown passed. The recorded PIDs were gone at the later follow-up check, so no forced termination was needed.
- The development bundle control failed because the current Expo CLI could not resolve `expo/src/async-require/hmr.ts`. The production bundle, dependency invalidation, syntax repair, Node 22.0.0 behavioral parity, and shipping-inventory checks passed.

No production code, public API, dependency, performance threshold, baseline, or device claim changed. The approved current-host warm-transform result remains the separate retained 9.754042 ms report against the 6.514 ms ceiling; this candidate’s host-budget gate was not run after the correctness and timing failures. No Simulator or physical device was used.

## Verification and reproduction

Run `python3 docs/evidence/2026-10-07-m10-5-compiler-session-requalification/verify.py` to check archive hashes, all matrix pairings, clean disposal, idle cycles, floor parity, and the reproduced stale entry-restoration result.

To recollect in a new empty owned directory, run:

```sh
bun packages/css/bench/context-reuse/qualify.ts \
  /absolute/path/to/empty-output-root \
  /Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node \
  node
```

The lifecycle collector uses process inspection and local Expo/Metro servers. This run used a process-enabled execution environment; a sandboxed attempt that denied spawning `ps` was excluded before any qualification gate was recorded.
