# M10.5 — per-pass guard receipts A/B

Status: completed diagnostic experiment; **reject this candidate as a performance improvement**. No shipping cache, API, dependency, default, threshold or production-admission gate changes.

## Question and candidate

The prior attribution found retained guards dominated by repeated byte traversal and hashing. This approved bounded slice tests whether sharing file receipts within a synchronous validation pass improves complete transforms while retaining independent before/after validation, resource ownership and fail-closed identity rules.

The helper keeps logical plus canonical file identity. Its first admission reads and hashes bytes twice, rejecting instability; later reads within that pass use owned bytes and saved digests. UTF-8 reads return immutable strings. Buffer consumers receive copies; digest reuse checks that those copies still equal the owned bytes. It performs no mtime-only or cross-request caching, directory/metadata caching, resolution inference or persistent memoisation. Each lookup recanonicalises paths, and all existing domain, symlink and input checks remain.

An explicit synchronous scope surrounds each guard call. Before configuration capture, eligibility and source inventory share one map; eviction closes it before disposal and starts a new map afterwards. The map closes before compilation. A new post-build map covers source inventory and eligibility, then closes before native evaluation. An outer finally closes any outstanding map, including bypass/error paths. Fresh mode bypasses these retained guards. These are coherent byte receipts, **not an atomic filesystem snapshot**.

Only the owned candidate copy is patched. Named function boundaries, supported operation counts and generated syntax are checked. Both A/B arms use one artifact and enable the same phase profiler; `on`/`off` labels mean receipt sharing, not profiling. Off still contains private wrappers/async boundaries, so neither arm is the original shipping compiler or an uninstrumented Task 5 build.

## Fixed measurement

The official repaired candidate runs fresh/immediate/repeat at capacity 8 over seven-entry, hot/scan and 32-entry workloads, with five fresh processes per arm. Odd blocks reverse variant order. The matrix is frozen before transforms. It executes **90 processes / 6,690 transforms**, with 3,345 sharing toggle pairs and 4,460 retained/fresh pairs. Captured Expo stock configuration replays development CSS transforms directly; this is not a new Metro bundle, HMR, host-budget, Hermes or device qualification.

Node v24.15.0, Bun 1.4.2, macOS arm64, esbuild 0.27.7 and integration 8.0.10 remain unchanged. Candidate copied-source/artifact hashes, actual Node executable identity and captured upstream trace provenance are recorded. Full source/input/native-metadata/Metro-result bytes are retained. Absolute measured paths remain unchanged. The verifier checks parity, clocks, logical bytes, capacities, current Node, non-overlapping processes, explicit close/disposal and observed child exit. RSS samples are endpoints, not peaks or allocator limits. The inherited runner awaits child completion without a watchdog; unattended hang recovery is still a tooling follow-up.

## Result

Five-process warm median milliseconds; ratio is the median of paired process warm medians (on/off), not a ratio of the aggregate medians.

| Workload | Mode | Sharing off | Sharing on | Paired ratio |
| --- | --- | ---: | ---: | ---: |
| seven-entry | fresh | 9.716 | 9.775 | 1.001 |
| seven-entry | immediate | 35.102 | 42.497 | 1.213 |
| seven-entry | repeat | 35.991 | 42.739 | 1.192 |
| hot-scan | fresh | 9.700 | 9.715 | 0.998 |
| hot-scan | immediate | 35.637 | 42.064 | 1.181 |
| hot-scan | repeat | 36.153 | 42.499 | 1.170 |
| 32-entry | fresh | 9.734 | 9.769 | 1.004 |
| 32-entry | immediate | 39.601 | 49.654 | 1.254 |
| 32-entry | repeat | 39.428 | 45.169 | 1.143 |

The repaired candidate preserves all four exact receipts, current native values, capacity/probation bounds and owned cleanup. Receipt sharing increases retained warm transform time by roughly 14–25% in paired process medians rather than improving it. Fresh controls are near parity. Source-domain scans include the whole candidate dist tree. These workloads do not requalify capacity 4/16, production graph invalidation or process shutdown with multiple Metro workers.

Most retained sharing-on workloads read 796 times / 15,445,472 logical bytes; 32-entry immediate, which resets the pass after eviction, reads 890 times / 19,512,360 bytes. Sharing-off reads 847 times / about 24.87 MB of logical bytes. Read counts and logical byte totals are reported per process in the evidence. Fewer bytes do not imply less physical disk traffic or faster execution. This candidate introduces double sampling of previously single-read inputs, repeated canonicalisation, defensive buffer copies and equality checks; their individual allocation/canonicalisation costs are not isolated. Do not infer the entire slowdown comes from one of them. The experiment does not select an overhead budget or weaken guard guarantees.

## Controls and repairs

Initial behavioural tests ran RED (three failures) then GREEN for receipt sharing and scope ownership. Checks cover preserved-mtime edits, consumer buffer mutation, closed/error scopes, synchronous boundaries and symlink retargets. A generated-copy test uses real file writes between the two sampling reads, before and after compilation.

Fresh review identified that initial sampling instability in source inventory rethrew instead of selecting fresh. The regression reproduced that error, then passed after a class-specific source-unstable drain/fallback was added. Other build/native errors retain their original handling. The initial 90-run matrix predates that repair and is **excluded** from the final measurement; its report/summary and log remain labelled separately. The official matrix was repeated on a newly built repaired artifact.

The existing identity/session/property suite is also executed against owned patched copies. One disposable integration fixture initially copied identity alone and omitted the new diagnostic helpers; copying those helpers repaired the test setup. Supplementary full-transform controls run after timing, including repair, preserved-mtime entry edits, buffer conflict, unknown build option, mid-rebuild instability, loaded-artifact change and package rename. The first instability control changed recognised-plugin configuration between its prime/request and therefore entered the configuration-change fresh route; corrected priming uses the same recognised-plugin shape for an actual retained mid-rebuild edit. Package-name changes deliberately require worker restart; in-process fresh fallback is not promised to erase integration's package-info cache.

Final package verification passes 1,456 tests, typecheck, the 28-page docs build, 42 copied-candidate checks (including 500 independent resource traces) and 14 supplementary controls. Twelve controls match complete fresh references; package rename preserves the required disable/restart boundary and has identical metadata, while in-process source/input/result differ from a restarted worker as expected. Final review is recorded in `verification.json`; no prior failed admission gate is inferred passed from these controls. Task 5's configuration/graph, receipt, development HMR and worker-exit blockers remain open.

## Reproduction and next slice

Run `bun packages/css/bench/context-reuse/guard-receipt-ab.ts <empty-owned-root>` for the fixed matrix; `--smoke` selects a separate six-process pilot. It builds owned copies with installed packages. Replay the committed archive using `python3 docs/evidence/2026-10-05-m10-5-guard-receipts-ab/verify.py`; optional `--live` checks original retained shipping/candidate paths. The archive is pinned by exact membership and SHA-256 hashes.

Recommend **M10.5 — A/B immutable path-digest receipts**: avoid exposing/copying large byte buffers for digest-only guard consumers, retain independent before/after sampling and all instability/restart/buffer controls, and compare complete fresh results before considering admission. This remains a private experiment; it is not a production optimisation recommendation. Android remains last.
