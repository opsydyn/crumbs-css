# M1.8d: Expo/Metro actual-edit baseline

M1.8d records a bounded incremental-build baseline from the Expo 56 playground on Metro 0.84 and React Native 0.85. The admitted scenario is a direct edit to a `.css.ts` source file in an already warm iOS development graph. It is a macOS host/build-tool measurement, not release Hermes runtime or device-frame evidence.

The runner starts one cleared Metro server, builds a dedicated entry, runs one excluded direct-edit warmup, and retains five more direct edits. Timing begins before the file write, includes a declared 75 ms watcher-settle interval, and ends when a full bundle contains all four newly compiled padding longhands and none of the previous values. Every run must change the bundle hash. Exact fixture hashes and restoration hashes prevent generated edits from leaking into the checkout.

The [retained baseline](../evidence/2026-09-15-metro-incremental/baseline.json) has a 125.005 ms median, 124.895 ms minimum and 125.535 ms maximum. Maximum deviation from the median is 0.424%. The standard review formula produces a candidate of 137.506 ms absolute and 10% relative. That candidate remains `pending-review`; this slice does not treat it as approved.

The [fresh whole-host comparison](../evidence/2026-09-15-performance-incremental-comparison/comparison.json) matched the baseline environment and fixture fingerprint. Its direct-edit median was 126.227 ms, 0.978% above baseline, so it remains `incomplete-threshold-pending`. All fifteen previously approved host/editor metrics passed; whole-registry performance qualification remains false.

The same server runs a dependency-only control before the admitted workload. Metro observed and bundled the changed ordinary dependency module after 127.094 ms, but the importing `.css.ts` module retained its previous baked StyleSheet value. This proves that emitted side-effect imports establish graph membership without causing Metro 0.84 to re-transform a cached parent whose own source is unchanged. The control is retained as `dependency-module-updated-parent-transform-stale` and cannot qualify M2.7 dependency invalidation.

Admission rejects insufficient repetitions, unsupported edit kinds, nonfinite timings, unchanged bundle hashes, missing new compiled values, retained previous values and incomplete restoration. Comparison additionally requires exact Expo/Metro/RN, host, protocol and fixture fingerprints. Initial server startup and initial graph build are excluded from the incremental metric. Client HMR presentation, native execution, release mode, device frames, allocations and retained memory are outside this baseline.

Registry readiness and whole-registry performance qualification remain false. JS frames, UI frames and allocations still lack baselines; retained-memory evidence remains diagnostic; the new incremental threshold awaits explicit reviewer approval. Native Android remains deferred until last.

Package build, typechecking and 307 tests pass. The workspace Expo consumer typechecks and exports production JavaScript for web, iOS and Android with all three runtime source-map guards passing. Documentation builds separately; no native device run, push or publication is part of this slice.
