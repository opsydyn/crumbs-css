# M4.6: budget qualification and remaining native gate

This slice ran the available M1 budget workloads against the M4.5 revision
`b2e22c9` and retained every raw report under
`docs/evidence/2026-09-21-m4-6/`. The host was an Apple M4 Pro arm64 macOS
25.6.0 machine with Bun 1.4.2, current Node 24.15.0, exact Node 22.0.0
floor probes, TypeScript 6.0.3, and tsgo
`7.0.0-dev.20260519.1`. The Metro run used Expo 56.0.4, Metro 0.84.4 and
React Native 0.85.3.

The native-style host benchmark passed all of its existing smoke ceilings over
five independent processes. Those are host checks only; the report explicitly
does not claim Hermes, UI frames, allocations or device rendering.

The recorded comparison gives these results for equivalent retained host
scenarios:

| Scenario | Baseline → current median | Change | Admission |
| --- | ---: | ---: | --- |
| Runtime graph bytes | 11,307 → 44,764 bytes | +295.9% | fail |
| Node 22 ESM initialisation | 6.294 → 6.173 ms | −1.9% | pass |
| Node 22 CJS initialisation | 3.402 → 3.563 ms | +4.8% | pass |
| Current ESM initialisation | 2.556 → 2.695 ms | +5.5% | pass |
| Current CJS initialisation | 2.037 → 2.139 ms | +5.1% | pass |
| Cold transform | 66.405 → 65.129 ms | −1.9% | pass |
| Warm transform | 5.664 → 5.699 ms | +0.6% | pass |
| TypeScript 10,000-token wall time | 882.106 → 933.081 ms | +5.8% | pass |
| tsgo 10,000-token wall time | 332.922 → 335.197 ms | +0.7% | pass |
| TypeScript 10,000-token memory | 285,025 → 305,334 KiB | +7.1% | pass |
| tsgo 10,000-token memory | 140,013 → 151,976 KiB | +8.5% | pass |
| TypeScript 10,000-token instantiations | 490,410 → 834,137 | +70.1% | fail |
| tsgo 10,000-token instantiations | 490,508 → 834,235 | +70.1% | fail |
| First completion | 39.288 → 34.004 ms | −13.5% | pass |
| Warm completion | 30.387 → 25.283 ms | −16.8% | pass |

The five retained direct Metro edits completed at a median of 128.079 ms,
with plain-token, nested-css and workspace-source invalidation controls also
producing the expected rebuilt values. Its comparison is deliberately marked
`incomplete-environment-mismatch` because the current fixture/source identity
does not equal the retained baseline; no threshold was changed to hide that
difference. The Effect boundary audit and 15-sample runtime-initialisation
matrix also completed, including the exact Node 22 CJS negative control for an
external Effect graph.

The retained-memory protocol was re-checked with six current admission and
property tests. The latest live workload evidence remains the committed M1.5e
development-web run at 100 and 1,000 rows: lifecycle and ordered-step
receipts completed, but browser readings had no forced-GC provenance and no
approved memory budget. Those readings remain diagnostic. No release-mode
Hermes run, controlled forced-GC adapter, JS/UI frame run, allocation run or
physical-device retained-memory result was available on this host. Android
remains explicitly parked until the final platform move.

M4.6 therefore remains unchecked. `bun run budgets:validate` succeeds for the
registry and retained evidence, while `bun run budgets:readiness` correctly
fails closed: the registry still has pending JS-frame, UI-frame, allocation and
retained-memory thresholds/baselines. No budget threshold, dependency or
native engine was introduced in this slice.

Evidence: [raw M4.6 reports](../evidence/2026-09-21-m4-6/),
[comparison](../evidence/2026-09-21-m4-6/comparison.json), and
[threshold review](../evidence/2026-09-21-m4-6/threshold-review.json).

Next recommended slice: obtain a release-mode Hermes measurement on the
available iOS target with a controlled retained-memory probe, then repeat the
same workload and budget review when the parked Android prerequisite is
authorised. Do not activate the performance registry until those native,
allocation and retained-memory records exist and the runtime-byte and editor
instantiation regressions are reviewed.
