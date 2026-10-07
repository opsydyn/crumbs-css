# M10.5 current warm-transform attribution and context-reuse candidate

**Decision: reject the candidate for production.** Reusing a bounded esbuild context improved the matched scratch workload by 21.6%, preserved generated output and rebuilt edited inputs. Its gate-selected median is still 7.984 ms, 1.470 ms (22.6%) above the unchanged 6.514 ms ceiling. The experiment also needs an explicit context-disposal owner; Metro teardown integration was not demonstrated. No production source, public API, dependency, baseline or budget changed.

## Current host gate

The retained current-host report remains authoritative: the warm-transform metric is 9.754042 ms against a 5.664125 ms baseline. The approved absolute maximum is 6.514 ms, with a maximum 15% regression. The selector is the maximum of the README and consumer fixture medians. See the [current-host comparison](../2026-10-07-m10-5-current-host-budget-requalification/host-budgets/comparison.json) and its [qualification assessment](../../assessments/2026-10-07-m10-5-current-host-budget-requalification.md).

## Phase attribution

Five independent instrumented processes used the exact package-root warm-transform scenario: one warm-up and six retained transform samples per fixture. The instrumentation reports nested subphases; do not add the Babel time to the esbuild total. These phase timings are diagnostic, not host-budget qualification. Timers and the isolated scratch path alter total time slightly, so the retained current-host report remains the gate source.

| Warm phase | README recipe | Consumer button |
| --- | ---: | ---: |
| Stable-resolution compile total | 7.632 ms | 7.725 ms |
| Vanilla Extract esbuild build, included above | 6.356 ms | 6.192 ms |
| Debug-ID Babel transform, included above | 0.997 ms | 1.525 ms |
| Generated-module evaluation | 1.182 ms | 1.024 ms |
| Crumbs post-processing and emission | 1.492 ms | 1.285 ms |

The fresh esbuild build dominates the compile phase. A separate instrumented A/B shows `context.rebuild()` reducing that subphase from 6.450 to 4.488 ms for the README fixture and from 6.304 to 4.621 ms for the consumer fixture. The full transform still misses the approved ceiling.

## Unprofiled context-reuse A/B

The official native-styles benchmark ran in five independent control processes and five candidate processes, interleaved by process number. Both modes used the same disposable checkout, Bun 1.4.2, package-root warm cwd, fixtures, one warm-up and six retained samples. The control uses fresh `esbuild.build()` calls. The candidate uses an LRU of at most 16 esbuild contexts keyed by compiler inputs, takes metafile inputs directly from the rebuild result, and enables reuse only in the scratch process.

| Fixture | Scratch control median | Context candidate median | Change |
| --- | ---: | ---: | ---: |
| README recipe | 10.186 ms | 7.916 ms | −22.3% |
| Consumer button | 9.579 ms | 7.984 ms | −16.7% |
| Gate selector: worse fixture | 10.186 ms | 7.984 ms | −21.6% |

The five paired worst-fixture comparisons all improved. The candidate remains 22.6% over the 6.514 ms limit, so it does not qualify. The scratch control is a matched A/B reference, not a replacement for the retained 9.754042 ms current-host result.

All five control/candidate runs produced matching warm output hashes for each fixture:

- README recipe: `1b40a11892d37cfd2c3a41366620953a8d941a12fd8fc08e25eac0c0d96924b2`
- Consumer button: `fb7f7308e3197e9bfcf237f587e88b643559f6d5f238430177549c0ce305c54f`

The disposable invalidation check also passed: six repeated candidate transforms matched the fresh-build result; changing the entry’s `minHeight` from 48 to 49 changed output; changing the imported theme colour from `#3559c7` to `#3659c7` rebuilt the dependency and changed output; restoring both files recovered the original output hash.

## Lifecycle and limits

Without explicit disposal, the candidate benchmark wrote its full results but the process remained alive. The harness then awaited `dispose()` on each owned context and the five final runs exited successfully. This does not prove that the Metro transformer owns a suitable project lifecycle or reliably disposes contexts during reload and shutdown. That lifecycle remains unqualified, independently of the failed timing gate.

The candidate diff and benchmark teardown overlay are retained for review under [`repro/`](repro/), gzip-compressed to preserve unified-diff context whitespace; decompress a `.patch.gz` file before applying it. The phase and candidate profile patches target a disposable checkout and the installed `@vanilla-extract/integration` 8.0.10 bundle. Do not apply them to the user checkout or treat them as shipping changes. `raw/phase-baseline/` contains the five phase reports, `raw/context-profile-ab/` the instrumented candidate A/B, and `raw/unprofiled-ab/` the final uninstrumented five-process A/B.

## Next roadmap slice

**M10.5 — design and test the bounded compiler-session lifecycle and residual warm-transform reductions.** Keep development identifiers, output hashes, entry/dependency invalidation, the existing 6.514 ms ceiling and public APIs fixed. Require an explicit Metro teardown/disposal owner and a full-transform median within the unchanged gate before production admission.
