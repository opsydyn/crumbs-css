# M10.5 debug-ID intermediate-cache candidate evidence

**Disposition: rejected for production.** The scratch-only bounded Babel debug-ID cache preserved generated output within each matched pair and reduced the worst-fixture median by 0.786 ms (8.6%). Its 8.355 ms gate statistic remains 1.841 ms above the unchanged 6.514 ms maximum.

## Source and protocol identity

The packet keeps two cohorts separate. Five exact-checkout reports ([`current-source-1.json`](raw/current-source-1.json) through `current-source-5.json`) identify revision `a8d597e73e0a19d5250a9b431d4ddbefc61123d4`; their README/consumer fixture medians are 9.456083/8.805125 ms, selecting 9.456083 ms and leaving a 2.942083 ms gap to the 6.514 ms ceiling. This is a focused warm-transform cohort, not a full host-budget requalification.

The matched cache A/B used a disposable copy of the same package source and fixtures. Every source and fixture content hash in the ten scratch reports also matches that revision. Those reports have an empty Git revision because the copied package tree is not a Git checkout; `summary.json` records the verified source revision and identities.

Environment: macOS 25.6.0, arm64 Apple M4 Pro, Bun 1.4.2, `NODE_ENV` unset. The control and candidate each ran in five sequential fresh processes. Each process followed the package-root warm-transform protocol: one excluded warm-up and six retained samples for each fixture. The candidate was an LRU capped at 64 entries around Vanilla Extract's debug-ID Babel intermediate transform. It reported 24 hits, three misses, and zero evictions in each process.

| Fixture | Control five-process median | Candidate five-process median |
| --- | ---: | ---: |
| README recipe | 9.140750 ms | 8.355083 ms |
| Consumer button | 8.855125 ms | 8.031583 ms |
| Gate selector: maximum | 9.140750 ms | 8.355083 ms |

The control/candidate worst-fixture improvement is 0.785667 ms (8.595%). Against the approved 6.514 ms maximum, the candidate remains 1.841083 ms (28.27%) over. All five pairs have identical control and candidate output hashes for both fixtures; exact hashes and per-process p50/p95 values are in [`summary.json`](summary.json), with original reports under [`raw/`](raw/).

## Limits of the result

The absolute project root changes Crumbs' generated `@crumbs-native-cache` marker, so scratch output hashes differ from the live checkout even though every control/candidate pair matches. This is not live-path output parity or an official host-budget requalification. The experiment also does not establish configuration invalidation, Metro lifecycle ownership, or dependency-edit behavior for a production cache. The prototype's cache key is intentionally incomplete and is retained only to describe the diagnostic candidate.

No production source, public API, runtime dependency, installed package, baseline, threshold, or enforcement rule changed. Do not apply the retained patch to a consumer checkout; it is only for disposable reproduction.

## Retained files

- `raw/current-source-1.json` through `raw/current-source-5.json`: the exact-checkout warm-transform cohort.
- `raw/control-1.json` through `raw/control-5.json` and `raw/candidate-1.json` through `raw/candidate-5.json`: the ten original scratch A/B reports.
- [`summary.json`](summary.json): source and fixture hash validation, matched outputs, cache-hit receipts, fixture medians, and gate calculation.
- [`repro/debug-id-cache-probe.patch.gz`](repro/debug-id-cache-probe.patch.gz): scratch-only patch against Vanilla Extract integration 8.0.10's development bundle. Decompress it before applying to a disposable copy.

The authoritative host-budget comparison remains [the current-host M10.5 report](../2026-10-07-m10-5-current-host-budget-requalification/host-budgets/comparison.json). This candidate cohort is a diagnostic matched A/B only.
