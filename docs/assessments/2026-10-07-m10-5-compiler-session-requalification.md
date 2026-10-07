# M10.5 current-source compiler-session requalification

- Date: 2026-10-07
- Roadmap: M10.5
- Status: private retained-session candidate rejected
- Constraints: preserve public APIs and the approved host budget; physical-device work deferred

## Decision

The current-source compiler-session candidate is not eligible for production. It reproduced stale output in an actual Metro entry-edit/import-removal/restore sequence, and every retained-session variant was materially slower than fresh compilation in the controlled matrix. No production source or public surface changed.

## Current-source evidence

The candidate was built from the source at `2e9d53c` and exercised through real Expo/Metro controls plus 105 fresh-process direct transform cohorts under current Node v24.15.0. The exact Node 22.0.0 floor was used for the three fresh/immediate/repeat behavioral controls. The full report preserves 124 compressed raw reports and 128 source/input/metadata/result receipts; `verify.py` independently checks their hashes and paired comparisons.

The same-source matrix passed exact output pairing for all 6,690 rows, and all candidate processes completed with zero owned resources, cleanup failures, or survivors. However, the actual Metro sequence failed on `entry-restored`: the candidate source/result hashes exactly matched the preceding `import-removal` transform, while the fresh reference returned the original entry. The candidate’s input and native metadata hashes differed too. This is a correctness defect in retained-context invalidation, even though stable-source repeated cohorts matched.

The long-lived single-owner path and three idle/reopen cycles at 1, 30, and 120 seconds disposed their contexts cleanly. Non-threaded Metro shutdown still had four worker/service processes at the gate’s two-second observation; worker-thread shutdown passed. Those recorded PIDs were gone at the later follow-up inspection. Node 22.0.0 behavioral parity passed. The development bundle control remained incomplete because the installed Expo CLI could not resolve its HMR module; production bundle, dependency invalidation and syntax-repair controls passed.

## Performance result

The 105-run performance gate establishes paired result parity for unchanged fixture inputs; it is not the official host-budget gate. All 90 retained comparisons were slower than their block-matched fresh controls.

| Workload | Fresh median | Fastest retained median | Median change |
| --- | ---: | ---: | ---: |
| Seven-entry | 10.64 ms | 32.00 ms (immediate, capacity 8) | +200.8% |
| Hot-scan | 10.65 ms | 32.23 ms (immediate, capacity 16) | +202.7% |
| 32-entry | 10.79 ms | 35.09 ms (immediate, capacity 8) | +225.2% |

These harness medians are comparative evidence only. The authoritative current-host result remains 9.754042 ms against the approved 6.514 ms maximum in the separate current-host report. The host gate was not run on this candidate after its correctness failure and substantial regression; device performance was not run.

## Scope and next step

No production change, dependency, public API, budget, baseline or enforcement rule changed. The retained context candidate is rejected, and M10.5 remains open.

Next recommended slice: **M10.5 — make retained-context identity fail closed across changed and restored compiler inputs, then pass the exact Metro source/input/metadata/result parity controls before another performance comparison.** Keep the existing host ceiling unchanged; only measure performance after the full invalidation path passes.
