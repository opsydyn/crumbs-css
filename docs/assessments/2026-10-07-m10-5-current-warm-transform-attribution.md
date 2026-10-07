# M10.5 current warm-transform attribution and context-reuse candidate

- Date: 2026-10-07
- Roadmap: M10.5
- Status: context-reuse candidate rejected for production
- Constraints: preserve the public API and the approved host-performance budgets

## Decision

A disposable esbuild context reduced the matched scratch workload by 21.6%, with identical generated output hashes and successful entry/dependency invalidation. Its gate-selected median is still 7.984 ms against the unchanged 6.514 ms maximum, 1.470 ms (22.6%) over the limit. The context also needs explicit disposal; Metro project-lifecycle ownership was not demonstrated. Do not ship the candidate.

The authoritative current-host result remains 9.754042 ms against a 5.664125 ms baseline. The current host gate remains failed. This candidate A/B is a matched scratch comparison, not a replacement qualification. The [retained evidence and reproduction packet](../evidence/2026-10-07-m10-5-current-warm-transform-attribution/README.md) contains 25 raw benchmark reports, phase summaries, output receipts, invalidation checks and scratch-only diffs.

## Attribution and candidate result

Five instrumented current-source runs locate the main warm cost in Vanilla Extract compilation. Median fresh esbuild builds took 6.356 ms for the README recipe fixture and 6.192 ms for the consumer button fixture. Debug-ID Babel took 0.997 ms and 1.525 ms respectively inside that build. Generated-module evaluation was 1.182/1.024 ms; Crumbs post-processing and emission was 1.492/1.285 ms. These are nested diagnostic phase timings, not values to add together or substitute for the retained host gate.

| Matched scratch workload | Fresh-build control | Context-reuse candidate | Change |
| --- | ---: | ---: | ---: |
| README recipe median | 10.186 ms | 7.916 ms | −22.3% |
| Consumer button median | 9.579 ms | 7.984 ms | −16.7% |
| Gate selector: worse fixture | 10.186 ms | 7.984 ms | −21.6% |

All five paired processes improved. Control and candidate output hashes match across all five processes for both fixtures. Six repeated context transforms also matched fresh output. Editing the entry and an imported `.css.ts` file caused output changes and rebuilds; restoring both sources recovered the original output hash.

The candidate remains 22.6% over the approved limit. In an initial harness run, the context-owning process remained alive after writing its results until the harness explicitly awaited context disposal. The final candidate cohort used that disposal step; Metro teardown and reload ownership remain unqualified.

## Scope and next step

No production source, public API, dependency, budget, baseline or enforcement rule changed. M10.5 remains open for the four runtime-initialisation failures, the warm-transform failure and the four theme graph-size failures. Physical-device work remains deferred.

Next recommended roadmap slice: **M10.5 — design and test the bounded compiler-session lifecycle and residual warm-transform reductions**. Require an explicit Metro teardown/disposal owner and full-transform results within the unchanged 6.514 ms ceiling before production admission.
