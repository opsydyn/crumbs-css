# M1.8c: approved host and editor performance thresholds

M1.8c records the reviewer-approved limits for every reproducible host/editor baseline. Approval applies to the fifteen metrics below. It does not activate the registry or qualify the whole product: JS frames, UI frames, allocation and actual-edit incremental rebuild still lack baselines, while retained-memory evidence remains diagnostic.

Runtime initialization no longer collapses four unlike scenarios into one maximum. Node 22.0.0 and the current Node runtime now have separate ESM and CommonJS measurements. Each scenario excludes one fresh-process warmup and retains 15 fresh-process samples. The comparison statistic is the median, so isolated scheduler and process-launch noise does not control the gate; min/max and deviation remain in the review packet. Node 22 CJS contains one large outlier and remains in `reviewAttention.highNoise`, but its central samples support the approved 20% median margin.

| Metric | Baseline | Absolute maximum | Relative maximum | Decision basis |
| --- | ---: | ---: | ---: | --- |
| Runtime emitted bytes | 11,307 bytes | 11,307 bytes | 0% | Deterministic output; require explicit review for any growth |
| Node 22 ESM initialization | 6.294 ms | 7.553 ms | 20% | Isolated 15-process median with retained envelope |
| Node 22 CJS initialization | 3.402 ms | 4.083 ms | 20% | Isolated 15-process median; outlier retained for diagnosis |
| Current Node ESM initialization | 2.556 ms | 3.067 ms | 20% | Isolated 15-process median with retained envelope |
| Current Node CJS initialization | 2.037 ms | 2.444 ms | 20% | Isolated 15-process median with retained envelope |
| Cold transform | 66.405 ms | 83.006 ms | 25% | Fresh-process workload carries wider host noise |
| Warm transform | 5.664 ms | 6.514 ms | 15% | Repeated transform workload has a tighter envelope |
| tsc wall time at 10,000 tokens | 882.106 ms | 1,014.422 ms | 15% | Fresh-process compiler timing margin |
| tsgo wall time at 10,000 tokens | 332.922 ms | 382.861 ms | 15% | Fresh-process compiler timing margin |
| tsc memory at 10,000 tokens | 285,025 KiB | 313,528 KiB | 10% | Process diagnostic memory with exact manifest/host matching |
| tsgo memory at 10,000 tokens | 140,013 KiB | 154,015 KiB | 10% | Process diagnostic memory with exact manifest/host matching |
| tsc instantiations at 10,000 tokens | 490,410 | 490,410 | 0% | Deterministic type-complexity counter |
| tsgo instantiations at 10,000 tokens | 490,508 | 490,508 | 0% | Deterministic type-complexity counter |
| First completion at 10,000 tokens | 39.288 ms | 43.218 ms | 10% | Language-service process timing margin |
| Warm completion at 10,000 tokens | 30.387 ms | 34.945 ms | 15% | Language-service completion timing margin |

The absolute and relative limits must both pass under an exact environment and scenario fingerprint. A metric with insufficient repetitions or mismatched runtime, compiler, fixture, sampling protocol or editor manifest remains incomplete. The retained [fresh comparison and review packet](../evidence/2026-09-15-performance-threshold-decisions/) show the current run separately from the baseline decisions.

The fresh comparison matched every environment fingerprint and all fifteen approved metrics passed both limits. Median changes ranged from 6.1% below baseline to 4.0% above baseline. Runtime bytes and both compiler-instantiation counters were unchanged. The comparison still reports high current-run envelopes independently of pass/fail, including both Node 22 initialization scenarios and tsgo wall time.

The registry remains `thresholds-pending-review` because its unresolved metrics correctly keep pending thresholds. This state prevents an approved host subset from being mistaken for whole-registry readiness or current-checkout performance qualification.
