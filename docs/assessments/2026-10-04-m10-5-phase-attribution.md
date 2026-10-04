# M10.5 Vanilla Extract compilation and evaluation attribution

The largest measured warm-transform phase is Vanilla Extract integration compilation, not VM wrapper compilation. A scratch-only instrumented copy attributed about 5.8–5.9 ms of the roughly 8.0–8.3 ms diagnostic transform medians to `compile`; generated-module evaluation took about 1.2 ms, while constructing the `vm.Script` wrapper took about 0.01 ms. This points the next optimization search at the integration compile boundary.

The profile used the exact README recipe and package-owned consumer button fixtures, package-root process cwd, strict diagnostics, one warmup, six retained transforms per process, and five fresh processes per fixture and variant. Fixture order was alternated. Timings include lightweight phase timers and are diagnostic only; they do not qualify the approved host budget. Existing uninstrumented results remain 8.033 ms and 7.372 ms against the unchanged 6.514 ms ceiling.

| Fixture | Median of process medians | Integration compile | Generated-module evaluation | VM script construction | VE `transformCss` |
| --- | ---: | ---: | ---: | ---: | ---: |
| README recipe | 8.283 ms | 5.911 ms | 1.231 ms | 0.011 ms | 0.106 ms |
| Consumer button | 8.017 ms | 5.763 ms | 1.209 ms | 0.012 ms | 0.131 ms |

The `compile` phase includes Vanilla Extract integration's esbuild build, file-scope/debug-id transformation and metafile capture. The VM execution phase accounts for nearly all generated-module evaluation; wrapper script construction is negligible.

One bounded candidate forced Vanilla Extract's supported `short` identifier mode while `NODE_ENV` was unset, where Crumbs normally chooses development `debug` identifiers. Its instrumented full-transform medians improved from 8.283 to 7.438 ms for the README recipe and from 8.017 to 7.155 ms for the consumer fixture; compile medians fell by about 1.03 and 1.07 ms. The candidate changed both generated module bodies and removes readable development identifiers, so it fails output parity and was rejected. No production source change was made.

The scratch instrumentation's default-mode generated JavaScript bodies matched the uninstrumented current transformer exactly after removing the first `@crumbs-native-cache` marker. That marker differs because the marker intentionally hashes the transformer source, which the scratch instrumentation changed. Candidate output bodies differed from default on both fixtures. The full Node 22 host suite was not rerun, and no threshold or baseline changed. Android remains last.

See the [machine-readable phase attribution and A/B evidence](../evidence/2026-10-04-m10-5-phase-attribution/qualification.json).

Next recommended roadmap slice: **M10.5 integration-compilation subphase attribution and parity-preserving candidate search** — split the esbuild and Vanilla Extract debug-id costs inside the integration boundary, then test one bounded candidate that retains development identifiers and exact output parity before any full host-budget rerun.
