# M10.5 Vanilla Extract debug-ID intermediate-cache candidate

- Date: 2026-10-07
- Roadmap: M10.5
- Status: rejected for production
- Constraints: preserve the public API, development identifiers, exact output, and approved performance limits

## Decision

A scratch-only, bounded cache around Vanilla Extract's Babel debug-ID transform improved the matched gate statistic from 9.141 ms to 8.355 ms (0.786 ms, 8.6%). It remains 1.841 ms (28.3%) above the unchanged 6.514 ms ceiling. Do not ship this candidate.

Every one of five control/candidate process pairs produced identical output hashes within the disposable package copy. The candidate reported 24 cache hits, three misses, and no evictions per process. The result is diagnostic: the copied package root changes the generated `@crumbs-native-cache` marker, so its output hashes do not equal the live checkout's hashes. Source and fixture hashes in all ten scratch reports match revision `a8d597e73e0a19d5250a9b431d4ddbefc61123d4`.

The official host-budget failure remains 9.754042 ms against the 5.664125 ms baseline and the unchanged 6.514 ms maximum. This matched scratch study does not replace or requalify that result. No production source, API, dependency, baseline, threshold, or enforcement rule changed.

## Matched diagnostic cohort

Five sequential pairs used fresh Bun processes, one excluded warm-up, six retained full-transform samples per fixture, and package-root cwd. Both modes used the same disposable package copy and protocol. The candidate was an LRU capped at 64 entries; its experimental key used source text, filename, cwd, Babel config-file and babelrc options, and plugin names. That key is intentionally not treated as production-safe: configuration identity and invalidation were not qualified.

A separate five-process cohort on the exact `a8d597e` checkout measured 9.456083 ms for the README fixture and 8.805125 ms for the consumer fixture, selecting 9.456083 ms and leaving a 2.942083 ms gap to the ceiling. These reports are retained separately. This focused warm-transform cohort is not a fresh full host-budget qualification.

| Fixture | Control median | Candidate median | Change |
| --- | ---: | ---: | ---: |
| README recipe | 9.141 ms | 8.355 ms | −8.6% |
| Consumer button | 8.855 ms | 8.032 ms | −9.3% |
| Gate selector: worse fixture | 9.141 ms | 8.355 ms | −8.6% |
| Approved maximum | 6.514 ms | — | Candidate misses by 1.841 ms |

Every paired fixture hash matched. The isolated build's hashes differ from the live checkout because moving the project root changes the generated cache marker. The evidence therefore supports only within-pair parity for the scratch candidate. It does not establish parity against live Metro output, dependency-edit invalidation, Babel configuration changes, or a production cache lifecycle.

## Evidence and scope

The [evidence packet](../evidence/2026-10-07-m10-5-debug-id-cache-candidate/README.md) retains all ten process reports, source/fixture identities, derived medians, hit receipts, and the scratch-only patch. Earlier context-reuse and compiler-session candidates remain rejected. The candidate did not touch the installed dependency in either checkout.

M10.5 remains open for the four runtime-initialisation failures, warm-transform failure, and four theme graph-size failures. Physical-device work remains deferred.

Next recommended numbered slice: **M10.5 — assess a non-caching compiler-adapter path that removes redundant work within one Vanilla Extract compilation.** First establish a cost model and show that a candidate could recover at least the live 2.942 ms gap to the unchanged 6.514 ms ceiling; then require exact output parity, dependency-edit correctness, and Metro restore evidence before implementation. Keep the current host limits and selectors fixed.
