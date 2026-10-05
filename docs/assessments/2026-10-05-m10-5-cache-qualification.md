# M10.5 Task 5 — incremental Metro cache qualification

2026-10-05. Base `bb1a696`. Private benchmark tooling and disposable candidate artifacts only. **Do not admit this candidate to production.** Every retained configuration regresses against fresh complete transforms; actual alias/symlink changes and some receipt comparisons fail. M10.5 remains open. Android remains last.

The [report](../evidence/2026-10-05-m10-5-cache-qualification/report.json), [raw summary](../evidence/2026-10-05-m10-5-cache-qualification/summary.json) and [offline verifier](../evidence/2026-10-05-m10-5-cache-qualification/verify.py) preserve passing, failed and unperformed gates. Successful package tests verify the harness and existing contracts; they do not turn failed acceptance gates into passes.

## Environment and boundaries

Current Node is v24.15.0; behavioural floor processes execute genuine v22.0.0. Bun is 1.4.2, esbuild 0.27.7, Vanilla Extract integration 8.0.10, tsdown 0.21.10 and Effect 4.0.0-rc.115. Expo 56.0.23 / CLI 56.1.26 uses its SDK peer Metro 0.84.5 and @expo/metro 56.0.2; the workspace's direct Metro 0.84.4 is separately recorded. React Native is 0.85.3. Package paths, package JSON hashes, executable hashes, candidate artifact and workload inventories are retained. No dependency, lockfile, shipping compiler/artifact, public API, default or approved threshold changed.

The owned app uses Expo's normal CLI and Crumbs' existing Metro transformer integration. An independent stock single-worker server trial uses Expo's actual SDK peer through its public `runServer`/`onClose` contract. There is no WorkerFarm replacement, signal adapter or global esbuild stop. The private resolver domain copies Expo's base tsconfig byte-for-byte locally. Package-based extends is unsupported by this candidate's closed-domain admission and selects fresh; this result does not establish reuse with ordinary Expo defaults.

## Gate results

| Gate | Result | Scope |
| --- | --- | --- |
| Normal Expo CLI fresh bundle | Passed | iOS non-development HTTP 200, actual baked native values |
| Development CLI bundle | Failed | HMR module `expo/src/async-require/hmr.ts` resolution; separate from historical serializer failure |
| Unchanged importer dependency invalidation | Passed | Plain token, nested `.css.ts`, workspace source; all four shorthand fields new/old checks and exact fresh receipts |
| Direct entry and import removal | Passed | Extra isolated CLI controls after throughput; unique new value, old value absent, fresh receipt parity |
| Import replacement / alias addition / exports edit | Passed | Explicit owned configurations; same coherent-state fresh reference |
| Alias retarget / symlink retarget | Failed | Stale unchanged importer remains in actual bundle |
| Workspace package import | Failed | Correct value but input/full-result fresh receipt mismatch |
| Restored entry receipt | Failed | Correct restored value but fresh receipt mismatch; byte restoration itself passes |
| Syntax error and repair | Passed | HTTP 500 diagnostic, then successful repaired fresh receipt |
| Two process workers | Bundle passed; exit failed | Both transform PIDs observed; workers/services still alive at bounded two-second shutdown observation, later naturally exited |
| Worker threads | Passed | Two thread IDs observed, successful bundle, no observed survivors after process exit; no awaited worker-disposal claim |
| Long-lived stock Metro owner | Passed after harness correction | Same main PID, shutdown/restart/second project, 8/8/7 idle disposals; explicit tooling close totals 23, zero live contexts |
| Real idle/reopen | Passed | Three cycles each at 1, 30 and 120 seconds, seven entries; extra reopen after third cycle; owned close |
| Exact Node floor | Passed | Fresh/immediate/repeat 63 transforms each, exact complete receipts, retained hits and owned close; no floor performance-budget claim |
| Fixed full-transform matrix | Parity passed; benefit failed | 105 isolated processes, 7,805 exact source/input/native-metadata/full-result comparisons |
| Installation replacement | Not run | Owned lock marker plus token edit exercised; no isolated lock-only or actual installed dependency replacement |
| Host/device budgets | Not run | Unchanged host baselines not rerun; no Hermes/device/screen-reader/release measurement |

Package-name and loaded-artifact changes retain Tasks 2–4's restart-required boundary: recreating an esbuild context cannot reload an upstream module/package-info cache. Actual Metro configuration edits that fail are not retrospectively accepted because direct compiler tests pass.

## Performance

The frozen matrix is three workloads × five process blocks × seven variants: fresh, immediate 4/8/16 and repeat 4/8/16. Odd blocks reverse variant order. Each retained run is paired with that block's fresh reference using the same candidate artifact and physical fixture paths. The seven-entry workload has 63 calls, four-hot-plus-32-scan has 96, and the 32-entry loop has 64. “Warm” excludes the first encounter of each entry in each process; cold first encounters and module load are separate raw measures. Configuration hashing, session admission and full native lowering are inside `T.transform` timing. Receipt serialization/hash dictionary and process/resource sampling are outside it.

The table is the median of five per-process warm medians, in milliseconds. Exact paired ratios, cold, module-load, total process time, queue deltas, hit/miss/eviction counts and sampled Node/service RSS remain in `summary.json`.

| Workload | Fresh | Immediate 4 | Immediate 8 | Immediate 16 | Repeat 4 | Repeat 8 | Repeat 16 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| seven-entry | 9.649 | 36.972 | 34.384 | 34.482 | 36.293 | 35.074 | 34.485 |
| hot-scan | 9.666 | 35.100 | 34.598 | 34.935 | 35.072 | 34.491 | 35.164 |
| 32-entry | 9.429 | 38.483 | 37.871 | 38.343 | 37.925 | 38.128 | 37.743 |

Every retained variant is approximately 3.5–4.1 times slower despite real hits. Seven entries hit 56 times with immediate capacity 8/16 and 49 with repeat 8/16; immediate 4 churns with zero hits, repeat 4 has 20. The hot-scan workload yields 60 hits per retained run; the 32-entry loop yields none at these limits. Hit rate alone cannot select a bound or establish benefit. Configuration/source guard work is included, but the cause of regression has not been separately attributed.

Service RSS before close has lower sampled medians for retained runs in this collection, but these are endpoint process samples, not peaks or a heap-byte guarantee. Shared services may remain after owned idle/close. Process exit is recorded separately; no global service stop manufactures cleanup. The existing approved 6.514 ms host ceiling, workload identities and environment matching rules remain unchanged; these measurements cannot pass that gate.

## Corrections and provenance

The first long-lived-owner attempt failed to load the SDK peer. A retry then used the wrong installed `runServer` return/port contract. The corrected trial selects Expo CLI's SDK peer, sets `config.server.port`, closes `returned.httpServer`, and awaits public `onClose` before checking idle cleanup. Failed attempts and logs are preserved alongside the successful retry. The warning about unknown top-level `fileMapCacheDirectory` remains in the stock owner log.

That retry overlapped the original throughput collection. All 105 original timings were conservatively invalidated, retained with hashes under `invalidated-throughput/`, and excluded. All 105 qualifying processes were recollected sequentially after other trials finished. No result averages combine the collections. An attempted coordinator pause was rejected by automatic approval review before ownership was established; the pause was never retried. Read-only identity checks and complete recollection resolved it. The two worker shutdown survivors had already exited naturally at later observation (`ESRCH`); this does not erase their failed two-second gate or establish a permanent leak.

The committed harness includes admission reporting and readable formatting added after collection. The report labels its tooling hash snapshot accordingly; full candidate artifact/input/result identities and executed recovery scripts retain measured provenance. Absolute measured paths inside receipts are intentionally preserved, not normalised to manufacture parity. The archive is portable for offline replay; `--live` additionally verifies the retained scratch fixture, symlink, candidate and original shipping inventory while those paths exist.

## Verification and next slice

Run `python3 docs/evidence/2026-10-05-m10-5-cache-qualification/verify.py` from any checkout. It replays compressed hashes, receipt dictionaries, all workload pairs, native baked values, resource bounds, idle/floor/owner evidence and explicitly failed controls. A tampered raw hash must fail verification. A new live collection uses `bun packages/css/bench/context-reuse/qualify.ts <empty-owned-root> <exact-node22> [current-node]` and requires the installed recorded toolchain/Expo dependencies. Idle trials intentionally take at least six minutes for the 120-second setting.

Recommend **M10.5 — attribute retained-candidate guard cost** as the next bounded slice: separate configuration hashing, source/input checks and rebuild/native costs under these exact workloads, preserving fresh receipt parity. Then separately remediate actual configuration/graph invalidation before another admission review. Do not introduce a production flag, dependency, cache default or host-budget rerun from this result. Android remains last.

Final verification: **1,441 package tests pass**, 12 focused checks / 194 assertions, typecheck, 28-page docs build, independent evidence replay including live shipping/candidate/restoration hashes and prior Task 4 archive replay. Tampered raw evidence fails verification. One fresh reviewer identified two live-runner false-pass paths; both now have specific RED→GREEN regressions. Owner admission requires all three successful same-process project/idle observations before final close, and topology admission requires actual worker PIDs/thread IDs. Existing archived observations pass the stronger replay.

Deferred minor: the reusable runner does not automatically collect the archive-enriched installed package/version/path/hash inventory. This archive contains that attribution, including the SDK/workspace Metro distinction; future collections still need enrichment. See [verification record](../evidence/2026-10-05-m10-5-cache-qualification/verification.json).
