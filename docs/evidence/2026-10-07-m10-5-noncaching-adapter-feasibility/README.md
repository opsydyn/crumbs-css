# M10.5 non-caching compiler-adapter feasibility

**Decision: no-go.** The current Vanilla Extract path has no bounded, non-caching adapter candidate with a credible route to recover the live 2.942 ms warm-transform gap. No adapter was implemented or benchmarked, and no production code, public API, dependency, performance limit, or baseline changed.

## Cost model

Five fresh, instrumented Bun processes profiled the README recipe and consumer button fixtures in an isolated copy. For each process, the last seven recorded events per phase and fixture were reduced to a median; the table then reports the median of those five per-process medians. The values are nested diagnostic phases and must not be added. Instrumentation and the disposable checkout affect total timings, so these are not host-budget results.

| Reported phase | README recipe | Consumer button |
| --- | ---: | ---: |
| Vanilla Extract esbuild build | 6.252 ms | 5.633 ms |
| Debug-ID Babel transform, within the build | 0.932 ms | 0.788 ms |
| Generated-module evaluation | 1.163 ms | 0.806 ms |
| Native module processing | 1.312 ms | 0.958 ms |
| Crumbs post-processing and emission | 1.241 ms | 1.047 ms |
| Full transform, instrumented | 9.467 ms | 8.598 ms |

The focused exact-checkout warm cohort separately selects 9.456083 ms against the unchanged 6.514 ms maximum, a 2.942083 ms gap. That cohort and the authoritative current-host result (9.754042 ms against a 5.664125 ms baseline) remain separate from these instrumented phase reports. See the [debug-ID candidate evidence](../2026-10-07-m10-5-debug-id-cache-candidate/README.md) and the [current-host qualification](../2026-10-07-m10-5-current-host-budget-requalification/README.md).

## Feasibility finding

The installed `@vanilla-extract/integration` 8.0.10 implementation performs `esbuild.build` with `bundle: true` and `metafile: true`, applies Vanilla Extract's file-scope transform, and returns the compiled module. Crumbs then evaluates that module to capture exports and generated CSS, while metafile inputs feed resolution identity and dependency receipts. Removing the bundle build would therefore require replacing a substantial part of the compiler pipeline and preserving its module, export, CSS, and dependency semantics; that is not a small adapter around redundant work. The [official esbuild integration documentation](https://vanilla-extract.style/documentation/integrations/esbuild/) describes the integration boundary.

Crumbs currently installs two `onEnd` listeners that read the same metafile inputs for separate resolution and dependency receipts. Consolidating those receipts might remove a small amount of callback work, but there is no evidence it approaches milliseconds, so it does not qualify against the 2.942 ms gap. We did not implement that cleanup.

The official `@vanilla-extract/compiler` implementation uses Vite and Vite-Node, retains module/CSS graph caches, and owns watcher and close lifecycles. It is an architectural compiler alternative, not a non-caching adapter. Adding that stack would introduce cache invalidation and lifecycle questions without evidence that it meets the existing output or timing gates. See the [official package metadata](https://raw.githubusercontent.com/vanilla-extract-css/vanilla-extract/master/packages/compiler/package.json) and [compiler implementation](https://raw.githubusercontent.com/vanilla-extract-css/vanilla-extract/master/packages/compiler/src/compiler.ts).

No candidate passed the initial feasibility threshold. Consequently, exact output parity, dependency-edit correctness, and Metro restore testing were not run for an adapter candidate. Existing development identifiers and the 6.514 ms maximum remain fixed.

## Evidence and reproduction

[`raw/`](raw/) retains the five original phase reports. [`summary.json`](summary.json) records every report hash, environment, fixture/source identities, phase formula, and derived medians. The reports came from a scratch copy based on `a8d597e`; before instrumentation, its `packages/css/src/transformer.ts` hash matched both that revision and the current source at collection (`bb080bfe…`). The archived [phase instrumentation patch](../2026-10-07-m10-5-current-warm-transform-attribution/repro/phase-instrumentation.patch.gz) then changed the scratch transformer; the instrumented hash recorded in the reports is `fc684306…`. The source and fixture hashes are retained in every raw report. The reports are diagnostic and do not attest to emitted-output parity or a full host-budget pass.

The shared profile harness is in the earlier [current warm-transform evidence packet](../2026-10-07-m10-5-current-warm-transform-attribution/repro/native-styles.profile.bench.ts). Apply the archived instrumentation only to a disposable checkout; never apply it to the user checkout or ship it.

## M10.5 status and next item

M10.5 remains open: the current host ledger still has four runtime-initialisation failures, the warm-transform failure, and four theme graph-size failures. Physical-device work remains deferred by user instruction.

**Next recommended numbered slice: M10.5 — run the final host-budget gate** against the current tracked source and unchanged approved selectors/limits. Record every metric as pass, fail, or incomplete, preserve the nine existing failures unless a separately qualified fix changes them, and keep physical-device acceptance deferred.
