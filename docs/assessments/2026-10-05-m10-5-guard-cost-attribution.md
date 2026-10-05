# M10.5 — retained-candidate guard cost attribution

2026-10-05; base `99d9ffb`. **Repeated filesystem validation dominates the private retention candidate's warm cost.** This is diagnostic attribution, not an optimisation or production-admission result. Shipping source/artifacts/API/dependencies/defaults and approved budgets remain unchanged. Android remains last.

[Raw report](../evidence/2026-10-05-m10-5-guard-cost-attribution/report.json), [summary](../evidence/2026-10-05-m10-5-guard-cost-attribution/summary.json), and [independent verifier](../evidence/2026-10-05-m10-5-guard-cost-attribution/verify.py) retain the frozen matrix and complete source/input/native-metadata/Metro-result byte receipts.

## Question and method

Task 5 found every retained variant slower despite exact complete-transform parity. The approved follow-up separates configuration hashing, source/input guards, compiler rebuild and native costs without removing validation. Only copied private session/identity sources receive checked TypeScript-AST instrumentation. A new optional copy hook in the private builder and injectable fixture builder leave their default paths unchanged. The ordinary candidate and shipping transformer do not receive timing exports.

The same instrumented candidate artifact and physical fixture paths serve every profiling-on/off process. Spans wrap known function bodies and compiler/native calls, preserve argument evaluation and method receivers, and record inclusive and exclusive durations. Async function bodies stay inside their original control-flow body; a wrapper awaits completion solely to close the diagnostic span. File reads count bytes under their enclosing guard. The collector is for sequential direct probes, not concurrent Expo profiling. Module-load spans are drained before the first transform. Per-request collection, byte dictionary serialization and process/RSS observation run outside complete-transform timing; timing hooks and counter updates inside guards remain measured overhead.

Current Node is genuine v24.15.0, Bun 1.4.2, macOS arm64. The existing builder/backend checks installed integration 8.0.10 / esbuild 0.27.7. Captured Expo upstream configuration/options come from the hash-verified Task 5 successful CSS trace, including its development CSS transform settings; no new app-bundle or Metro invalidation acceptance is inferred from replay. Executable, original shipping inventory, candidate artifact/source and workload identities are retained.

The diagnostic subset is **capacity 8**, fresh/immediate/repeat, profiling off/on, five sequential fresh-process blocks for each of the existing seven-entry, four-hot-plus-32-scan and 32-entry workloads: **90 processes, 6,690 transforms**. Odd blocks reverse order. This subset does not requalify capacities 4/16 or select a production bound. All modes keep the conservative closed resolver domain and guards. Unchanged host budgets, installation replacement, Node-floor performance, Hermes/device, screen-reader and Android acceptance are not measured in this slice.

## Results

The verifier proves 3,345 on/off row pairs and 4,460 retained/fresh row pairs match all four complete receipt identities, checks actual native baked values, context/probation bounds, owned close and process exit, and conserves exclusive span and read-byte accounting. No hashes are normalised between artifacts. “Warm” excludes the first encounter of each entry per process. Values below are medians of five per-process warm medians, in milliseconds; these medians are not additive stage budgets.

| Workload | Mode | Profile off | Profile on | Guard work | Read IO | SHA-256 | Rebuild |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| seven-entry | fresh | 10.084 | 9.844 | 0.000 | 0.000 | 0.000 | 0.000 |
| seven-entry | immediate | 34.606 | 35.025 | 24.796 | 11.412 | 8.869 | 4.123 |
| seven-entry | repeat | 35.733 | 35.785 | 24.720 | 11.357 | 8.901 | 5.000 |
| hot-scan | fresh | 11.509 | 10.971 | 0.000 | 0.000 | 0.000 | 0.000 |
| hot-scan | immediate | 38.866 | 35.947 | 24.939 | 11.561 | 8.953 | 4.756 |
| hot-scan | repeat | 36.133 | 37.256 | 25.748 | 11.881 | 9.095 | 5.207 |
| 32-entry | fresh | 9.740 | 9.470 | 0.000 | 0.000 | 0.000 | 0.000 |
| 32-entry | immediate | 38.367 | 38.391 | 24.402 | 11.281 | 8.810 | 6.014 |
| 32-entry | repeat | 38.657 | 38.374 | 24.603 | 11.294 | 8.889 | 0.000 |

Retained guard work accounts for about 24.4–25.7 ms per warm transform. Reads consume about 11.3–11.9 ms and hashing 8.8–9.1 ms. Rebuild costs about 4.1–6.0 ms where contexts exist; the 32-entry repeat workload never promotes a retained context at capacity 8, so it records fresh compile rather than rebuild. Fresh mode bypasses these retained guards; zero guard/read/hash columns do **not** mean esbuild or Babel performs no IO or hashing—the instrumentation only covers our copied qualification guards.

Each retained request calls `captureConfiguration` three times, `assessReuse` twice and `sourceInventory` twice. Its guards perform **847 reads / 24,843,337 bytes** in this candidate: configuration reads about 13.07 MB, direct eligibility/compiler-identity reads 4.34 MB, and input-root scans 7.43 MB. The input roots include the complete candidate `dist` tree, not only dependencies used by the current entry. Configuration validation repeatedly hashes the declared and loaded implementation inventory. These are logical bytes returned by reads, not physical disk traffic; filesystem/page-cache effects are not measured.

Per-group paired median profiling-on/off ratios range roughly 0.95–1.03. Negative observed deltas demonstrate host variability; they do not establish that profiling is free or beneficial. The instrumented-off path still contains wrapper calls and additional async boundaries. This is an observer-cost control within one artifact, not an exact comparison with the original uninstrumented Task 5 artifact or shipping compiler. No calibrated instrumentation-overhead bound, cache default or performance ceiling is selected.

Native callback work and receipt cloning are separately measured. Complete-transform residual includes upstream Metro/Babel work, request setup, queue/microtask and uninstrumented operations plus observer overhead; it is not all native rendering. Phase clocks are wall time, not CPU time. RSS is sampled process evidence only. Context disposal does not promise lower allocator RSS or shared-service shutdown.

## Interpretation and next slice

The data supports repeated byte traversal/hashing as the dominant measured cause of retention regression in this closed domain. It does not prove a particular optimisation safe. Do not weaken guards, use mtime-only shortcuts, cache validation across requests or infer graph-invalidation correctness from direct replay. Task 5's alias/symlink and receipt failures, development HMR issue and bounded two-worker shutdown failure remain open.

Recommend **M10.5 — A/B deduplicated guard receipts per transform**: test sharing byte receipts within each coherent before/after validation pass while retaining both passes, loaded-artifact/package restart boundaries, unknown-domain fresh fallback, buffer conflicts and source-change detection. Use the same complete-transform pairs and adversarial controls before considering production admission. Actual configuration/graph invalidation remediation remains a separate blocker. Android remains last.

## Reproduction and verification

Run `bun packages/css/bench/context-reuse/attribute-guards.ts <empty-owned-root>` for the fixed matrix; `--smoke` selects a separate six-process seven-entry pilot. It builds one owned candidate and uses installed dependencies; no npm install or shipping rebuild is required. Replay this archive with `python3 docs/evidence/2026-10-05-m10-5-guard-cost-attribution/verify.py`; `--live` additionally checks retained measured candidate/shipping files. Full source/input/native-metadata/results live in the gzip dictionary.

The first pilot failed because a diagnostic callback moved an awaited argument into a non-async scope. A regression reproduces the error; the fix keeps arguments in their enclosing scope and preserves receivers. Both failed build logs and successful pilot logs are retained outside official measurements. The initial collector, await-scope and read-byte attribution checks each ran RED→GREEN. Final verification passed: 1,448 package tests, typecheck, the 28-page docs build, archive replay, live shipping/candidate hashes and a poisoned-raw negative control. Fresh review found no critical or important issues. Two minor follow-ups remain before extending the diagnostic runner: a child-process watchdog and exact AST operation coverage checks.

A supplementary two-process immediate-mode error/repair probe ran after the timed matrix. Profiling on/off preserved the same error name/message, drained failed spans, restored the original fixture bytes, reproduced all four successful receipt hashes after repair and closed both contexts. These runs are excluded from timing summaries; the probe, results and error logs are archived. It checks this syntax-error path, not every possible asynchronous failure.
