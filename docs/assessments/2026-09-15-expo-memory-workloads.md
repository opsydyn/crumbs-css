# M1.5e: retained-memory protocol and mount/unmount workload

Measure now includes a retained-memory workload at 100 and 1,000 rows. It performs 25 mount/unmount cycles and attempts a reading at baseline and after every fifth unmount. Each mounted row calls public useThemedStyles against a stable module under a constant light ThemeProvider, so the workload repeatedly allocates and releases a large consumer-shaped React tree through the actual Metro transform.

The report keeps four conclusions separate: the step protocol completed, lifecycle effects balanced, usable memory readings were collected with consistent source/forced-GC provenance, and an approved budget passed. Exact lifecycle admission requires 25 container mount/cleanup pairs and rowCount × 25 row pairs. Balanced effects are useful functional evidence, never leak proof.

Memory providers are attempted in this order: an optional test-harness `__CRUMBS_MEMORY_PROBE__`, `globalThis.gc` with Chromium `performance.memory`, `measureUserAgentSpecificMemory`, then diagnostic `performance.memory`. External probes have a three-second async deadline. A late result cannot mutate a cancelled capture. Every sample records source, actual byte reading, GC status/method and monotonic observation time. Browser APIs without explicit forced-GC provenance remain diagnostic.

The independent oracle requires all six ordered checkpoint readings, finite positive safe-integer bytes, a single source, completed forced GC with a named method, complete ordered workload observations, exact lifecycle cleanup, and an explicit budget. It reports last-minus-baseline retained bytes, least-squares bytes-per-cycle slope, and nearest-rank p95 positive delta. The budget has separate ceilings for all three metrics. M1.5e deliberately supplies no budget because M1.8 requires recorded baselines/noise and reviewer-approved limits; therefore a development run cannot qualify memory even if its diagnostic values look favorable.

Property tests cover 200 generated start/growth series. Deterministic negatives cover unavailable/nonfinite readings, absent GC, mixed sources, missing observations, incomplete cleanup, invalid plans/budgets and post-cancellation sample admission.

## Qualification and limits

[Evidence](../evidence/2026-09-15-expo-memory-workloads/qualification.json) retains final-source development web runs at 100 and 1,000 rows: fifty container and 27,500 row mount/cleanup pairs in total. Both complete their 112 ordered steps. Chromium supplies six `performance.memory` readings per run, but GC provenance is unavailable and no budget is applied, so both correctly report `memoryQualified: false`. User and navigation cancellation retain partial incomplete receipts. The final screenshot is visually reviewed and final-run browser errors are empty.

Package checks, workspace Expo typecheck and three JavaScript maps, isolated local-tarball npm Expo typecheck and three maps, Storybook types and the twenty-page docs build pass. Runtime map guards reject compiler/Node/Effect sources in both consumers. No dependency or library runtime/public API changes are introduced. Preexisting release version edits remain excluded; no push/publication.

This is workload and admission infrastructure, not retained-memory qualification. Development browser heap readings include unrelated page/runtime activity and uncontrolled GC. They do not establish a leak, absence of a leak, allocation cost, native Hermes behavior, frames, thermal state or calibrated performance. A qualifying run needs a controlled forced-GC adapter, runtime/device/build/artifact provenance, repeated samples and an approved M1.8 budget. Native iOS is not rerun and Android stays last. Parent M1.5 remains open for qualified retained memory and native context work; M1.3b remains absent/unqualified and the ADR stays proposed.

Next recommended slice: M1.7a, add reproducible editor/typechecker scale fixtures for the currently supported token, theme and recipe APIs at 100, 1,000 and 10,000 tokens. Record unsupported slot/condition coverage explicitly until those APIs exist. Begin only after approval.
