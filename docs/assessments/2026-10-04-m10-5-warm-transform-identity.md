# M10.5 warm-transform measurement identity

## Finding

The historical warm-transform budget was measured by `bun run --cwd packages/css bench:native-styles` ([retained command record](../evidence/2026-09-14-benchmark-repair/qualification.json)). The full host-budget adapter had been running that benchmark from the workspace root and using fixture-root cwd for warm calls, so its protocol could not be compared to the recorded baseline. The fix adds an explicit, validated package-root mode for the full host run while preserving fixture-root as the standalone benchmark default. The comparator normalizes only this exact package-root protocol to the recorded legacy ordering. Environment, fixture, sample and scenario checks remain exact.

The cold worker runs from the consumer fixture root, where compiler ownership metadata falls back to `consumer`; the historical warm transform runs from the package root and records `@opsydyn/crumbs-css`. Their generated output hashes therefore differ. The benchmark retains this parity result in every raw report and continues to reject output mismatches whenever cold and warm calls use the same cwd. A focused probe is in [cwd-output-probe.json](../evidence/2026-10-04-m10-5-warm-transform-identity/cwd-output-probe.json). This is an observed working-directory-sensitive transform result; this slice does not change compiler ownership semantics.

## Qualification

The exact Node v22.0.0 full host-budget run completed with the existing thresholds and baselines. The warm-transform environment and measurement identity now compare as exact, but its 7.846 ms median is 38.52% above the 5.664 ms baseline and fails its existing 6.514 ms / 15% limit. Cold transform passes at 65.573 ms against 66.405 ms (-1.25%). Four runtime-initialization and six emitted runtime-graph metrics fail their approved limits. Metro remains one environment/measurement mismatch and eight editor comparisons remain incomplete on source/workload identity. Overall performance qualification remains false.

No threshold, baseline, registry entry, runtime API, or compiler behavior was changed. This does not establish React Native, Hermes, device, release-performance, visual, or accessibility qualification.

See the [qualification record](../evidence/2026-10-04-m10-5-warm-transform-identity/qualification.md) and its retained [host reports](../evidence/2026-10-04-m10-5-warm-transform-identity/host-budgets/).
