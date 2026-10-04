# M10.5 Vanilla Extract compile subphase attribution and A/B

The integration boundary is dominated by esbuild itself. Across the exact package-root fixtures, the instrumented esbuild build phase measured about 5.75–5.82 ms inside a 5.77–5.83 ms Vanilla Extract compile call. Vanilla Extract's debug-ID Babel transform contributed about 1.03 ms for the README fixture and 1.53 ms for the consumer fixture. Package-info lookup, file reads and the dependency-metafile callback were much smaller.

The experiment used the unchanged README recipe and package-owned consumer button fixtures, `strictDiagnostics: true`, package-root process cwd, one warmup, six retained transforms per process and five fresh processes per fixture and variant. Fixture and variant order were alternated. Scratch-only timers instrumented copies of Crumbs' transformer and Vanilla Extract's installed integration bundle; the timers perturb absolute results, so these measurements are diagnostic rather than official host-budget qualification.

| Fixture | Variant | Median of process medians | Integration compile | esbuild build, including plugin | Babel debug transform | CSS source read |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| README recipe | async baseline | 8.266 ms | 5.832 ms | 5.818 ms | 1.029 ms | 0.054 ms |
| README recipe | sync candidate | 8.101 ms | 5.765 ms | 5.751 ms | 0.919 ms | 0.057 ms |
| Consumer button | async baseline | 8.154 ms | 5.817 ms | 5.802 ms | 1.531 ms | 0.106 ms |
| Consumer button | sync candidate | 8.170 ms | 5.804 ms | 5.775 ms | 1.449 ms | 0.103 ms |

The candidate called Vanilla Extract's exported `transformSync` helper from its file plugin instead of awaiting `transform`. It retained debug identifiers and produced exactly matching generated JavaScript bodies for both fixtures. Its Babel phase fell by about 0.11 ms and 0.08 ms, but its full-transform medians overlapped baseline process ranges and the consumer median was slightly slower. The overall esbuild build phase barely moved. Adopting it would also mean maintaining a custom version of upstream integration compile behavior, so I rejected it.

This leaves roughly 4.1–4.7 ms of the esbuild build phase outside the measured file-plugin subphases; that residual includes esbuild resolution, bundling and other plugin/build work, and is not a separately timed esbuild metric. The existing uninstrumented warm comparison remains 8.033 ms for the README fixture and 7.372 ms for the consumer fixture against the unchanged 6.514 ms ceiling. I did not rerun the full Node 22 suite, and no production code, threshold or baseline changed. Android remains last.

See the [machine-readable phase and candidate evidence](../evidence/2026-10-04-m10-5-compile-subphase-ab/qualification.json).

Next recommended roadmap slice: **M10.5 esbuild context-reuse feasibility and invalidation A/B** — test whether reusing an esbuild context reduces the measured build overhead while retaining exact output and reliable invalidation for entry files, dependencies and compiler configuration. Run the full Node 22 host gate only if that candidate is repeatably faster and parity-safe.
