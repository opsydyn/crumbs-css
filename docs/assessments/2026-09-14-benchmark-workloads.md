# Honest host benchmark workloads — 2026-09-14

Approved M1.4 continuation under ADR D6/D12, based on `9285261`. This slice repairs existing host measurements; it does not add production cache behavior, native budgets or a performance optimization.

## Metric contract

The host harness now reports `sampleKind: "batch-mean-ms-per-operation"`, raw sample durations in original execution order, iterations per sample, `meanOperationMs`, and explicit `batchMeanMinMs` / `batchMeanMaxMs` / `batchMeanP50Ms` / `batchMeanP95Ms`. Console labels use `mean-operation`, `batch-mean-p50` and `batch-mean-p95`. Quantiles use nearest rank on sample duration divided by batch size. They do not expose individual operation or GC tails. One-iteration transform samples are individual transform observations. Invalid counts, warmup counts and nonpositive/nonfinite durations fail instead of yielding meaningless metrics.

`maxP95Ms` becomes `maxBatchMeanP95Ms`. Existing seven host smoke ceilings retain their numeric values; this rename does not calibrate or approve M1.8 release/device budgets. Three new scenarios have no budget yet. Benchmark JSON is format version 2, and is printed before budget assertions so a failing ceiling does not discard measurements. This is an internal benchmark-output migration; public styling APIs do not change.

## Equivalent and separated work

A package-owned [selection workload](../../packages/css/bench/selection-workload.ts) replaces the old cheaper raw selector. The handwritten baseline merges defaults, selects variants in definition order, appends the matching compound style and filters gaps. It is independent of `resolveRecipeStyle`; parity checks assert ordered output and reference identity before timing. Tests cover four default/partial inputs and all 48 complete combinations of this fixture's boolean/size/tone domains. Every measured selector starts its own identical 52-input cycle, including its warmup. Invalid selections/diagnostic paths are not part of this comparison. Explicit undefined remains a separate JS-only parity regression; it is not admitted by widening the public `exactOptionalPropertyTypes` contract.

The first three selection scenarios perform equivalent static valid-input work. The themed pre-resolved scenario uses the same selection cycle over a recipe whose tokens were resolved during setup; its style values differ deliberately. A new per-call scenario resolves the themed recipe module and selects every time, and the 240-export scenario explicitly recomputes the whole module. Their scenario descriptions name these different workloads rather than implying comparable amounts of work.

`createRecipeResolver` delegates to `resolveRecipeStyle` on every call. Its closure is **uncached**. Pre-resolved themed selection amortizes earlier resolution; it is not a recipe cache hit. The current React `useThemedStyles` memo does reuse resolved styles while style/theme identities are stable, but this pure host harness does not measure React cache hits, invalidation, renders or provider lifecycle. Those remain explicit `not-run` capabilities for M1.5; future recipe cache implementations/qualification belong to M4. No benchmark-only fake cache is presented as production behavior.

A [first-transform worker](../../packages/css/bench/first-transform.ts) runs one transform in each fresh Bun process, without transform warmup. Timing begins after imports and excludes child startup/import time; lazy compiler/esbuild initialization is included. These are first-transform measurements, not total process cold startup. OS filesystem caches remain uncontrolled/warm. For each of the two required fixtures, six first-transform children are separated from six same-process full transforms after setup and warmup. SHA-256 output receipts must match across phases. Warm process/package-info/esbuild state is not a transform-result cache.

## Retained host evidence

[Five raw runs](../evidence/2026-09-14-benchmark-repair/run-1.json) retain format, exact Bun/platform/OS/CPU/environment, source revision and working-tree hashes, fixture identities, all batch samples and 60 total fresh-process first-transform receipts. Each run has ten scenarios. Runs were sequential, after package checks completed; no other agent/test/build workload was launched alongside these retained runs. This does not establish host-wide quiescence, controlled thermal state or a device noise envelope. Scenario order remains fixed. An earlier concurrent build/benchmark smoke run was excluded from retained measurements.

The following values are the **median of five per-run batch-mean p50s**, with their across-run min/max range. They are not pooled operation p50s, inference of individual tails, a speedup versus the historical cheaper raw workload, or Hermes performance. See [machine-readable summary](../evidence/2026-09-14-benchmark-repair/summary.json).

| Scenario | Median of run batch-mean p50s, ms | Across-run range, ms |
| --- | ---: | ---: |
| raw equivalent recipe selection | 0.000089 | 0.000087–0.000095 |
| resolveRecipeStyle uncached selection | 0.000318 | 0.000307–0.000338 |
| createRecipeResolver uncached selection | 0.000303 | 0.000299–0.000311 |
| pre-resolved theme recipe uncached selection | 0.000308 | 0.000287–0.000317 |
| resolve theme module plus recipe selection per call | 0.002409 | 0.002338–0.002618 |
| resolveThemeStyles 240 exports uncached | 0.119544 | 0.111679–0.121277 |
| first transform README recipe fixture | 66.404584 | 64.426417–67.918583 |
| warm transform README recipe fixture | 5.664125 | 5.527250–6.037666 |
| first transform package-owned consumer button fixture | 66.384542 | 66.154084–73.209167 |
| warm transform package-owned consumer button fixture | 5.593416 | 5.008666–5.828750 |

## Qualification and follow-up

[Qualification](../evidence/2026-09-14-benchmark-repair/qualification.json) records fresh package build/typechecking and 265 passing tests / 11,526 assertions across 39 files, all five benchmark runs/ceilings/receipts, and the 20-page docs build. Regression tests cover explicit metric/format/budget semantics, input integrity, independent selection sequences, default/compound output parity and fresh-process output identity. No consumer API, provider/compiler validation, Effect dependency, engine/peer range, publication or release-version edit changes. M1.3b still requires an actual external-theme decoder before its footprint can be qualified; native Android remains last, and release Hermes/device/editor/calibrated budgets remain separate gates.

M1.4 closes for the host measurement repair. Next bounded slice: **M1.5a**, add repeatable static/themed list mount/unmount and theme-switch workloads in the Expo playground, with scenario size and run identity. It should expose React lifecycle/memo behavior before choosing device budgets; it does not itself qualify release-device frame or memory performance. Begin only after user approval.
