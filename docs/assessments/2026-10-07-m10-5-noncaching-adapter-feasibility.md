# M10.5 non-caching Vanilla Extract compiler-adapter feasibility

- Date: 2026-10-07
- Roadmap: M10.5
- Status: no qualifying non-caching adapter identified
- Constraints: preserve current public APIs, development identifiers, generated output, dependency invalidation, and approved host budgets

## Decision

Do not implement a compiler adapter from this assessment. Five instrumented profiles put Vanilla Extract's esbuild build at a median 6.252 ms for the README fixture and 5.633 ms for the consumer fixture. The debug-ID transform is only 0.932/0.788 ms within those builds; generated-module evaluation, native processing, and Crumbs post-processing are also smaller phases. These instrumented scratch timings diagnose the cost distribution; they do not replace the exact-checkout or full host-budget measurements.

The exact-checkout focused cohort selects 9.456083 ms against the unchanged 6.514 ms maximum, leaving a 2.942083 ms gap. The authoritative current-host warm-transform result remains 9.754042 ms against a 5.664125 ms baseline. No bounded non-caching adapter candidate was identified that could remove the required amount while preserving Vanilla Extract's bundling, file-scope transform, module evaluation, export capture, CSS generation, resolution identity, and dependency receipts.

Two `onEnd` callbacks currently collect the same esbuild metafile inputs for distinct receipts. Consolidating them is a possible micro-cleanup, but no measurement suggests it could recover milliseconds; it was not implemented. The official Vanilla Extract compiler is built on Vite/Vite-Node and retains module/CSS graph caches and watcher lifecycle. It does not meet this no-cache candidate's premise and would add new invalidation and disposal obligations.

## Results

The [evidence packet](../evidence/2026-10-07-m10-5-noncaching-adapter-feasibility/README.md) retains five raw instrumented reports and their hashes. Median reported build times are 6.252 ms and 5.633 ms; full-transform instrumented medians are 9.467 ms and 8.598 ms. These are nested phase measurements and are not additive. The reports were collected in a disposable copy after applying the archived instrumentation patch; the base transformer source hash matched the current tracked code before instrumentation. They do not establish output parity or an adapter candidate's dependency/Metro behavior.

The source review confirmed that `@vanilla-extract/integration` 8.0.10 performs an esbuild bundle with a metafile, and that Crumbs uses those inputs in both stable-resolution handling and dependency receipts. The official [esbuild integration documentation](https://vanilla-extract.style/documentation/integrations/esbuild/), [compiler package metadata](https://raw.githubusercontent.com/vanilla-extract-css/vanilla-extract/master/packages/compiler/package.json), and [compiler implementation](https://raw.githubusercontent.com/vanilla-extract-css/vanilla-extract/master/packages/compiler/src/compiler.ts) inform the adapter comparison.

## Scope and next item

No production source, API, dependency, baseline, threshold, or enforcement rule changed. No adapter candidate passed the initial feasibility bar, so candidate-specific output-parity, dependency-edit, and Metro restore checks were not run. **M10.5 remains open** with four runtime-initialisation failures, the warm-transform failure, and four theme graph-size failures. Physical-device work remains deferred.

**Next recommended numbered slice: M10.5 — run the final host-budget gate** on the current tracked source with all approved limits/selectors unchanged; record every metric as pass, fail, or incomplete, leaving physical-device acceptance deferred.
