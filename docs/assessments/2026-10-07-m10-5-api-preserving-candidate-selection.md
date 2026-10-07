# M10.5 API-preserving remediation candidate selection

- Date: 2026-10-07
- Roadmap: M10.5
- Status: no qualifying production candidate selected
- Constraints: preserve the current public API and all approved host budgets
- Current product source: `dbf491d12c5700f50c77d646873bece3bf341f20`
- Current source identity: `4e519e759379541fbdc557e61e3968e59c94c6f3e617508271f4ace56d6ef70d`

## Decision

No API-preserving production candidate in the retained evidence can close the remaining M10.5 host failures. Do not change production code from this screen. Keep the public API, selectors, baselines, and thresholds fixed, and leave M10.5 open.

The current-source host gate has **12 passes and nine failures, with no incomplete comparisons** after the matched Expo/Metro rerun. The remaining failures are four runtime-initialisation rows, the warm-transform row, and four `theme/core` or compatibility-theme graph rows. The matched Expo 56.0.4 / Metro 0.84.4 / React Native 0.85.3 incremental rebuild passes at 130.363208 ms, 5.17% over its approved baseline and below both unchanged limits. The [matched Metro report](2026-10-07-m10-5-current-source-matched-metro.md) and [host-gate report](2026-10-07-m10-5-final-host-budget-gate-rerun.md) retain the detailed source and environment identities.

## Candidate screen

- **Theme graph minification:** the retained A/B reduces graph bytes by about 45–48%, but the four resulting graphs remain roughly twice their approved maxima. The four initialization medians also remain above their limits. This is not a qualifying remedy; see the [minification assessment](2026-10-07-m10-5-current-theme-minification-candidate.md).
- **Static-boundary extraction:** preserving all current exports, validation, recursive resolution, and binding identity increased each theme graph by 295–515 bytes and showed no qualifying import-plus-first-use improvement. It remains rejected; see the [runtime-boundary assessment](2026-10-06-m10-5-runtime-boundary.md).
- **Focused React entrypoint:** the candidate subpath reduces its own graph, while the existing `theme/core` and compatibility-theme artifacts remain byte-identical to the official host artifacts. It therefore does not change the failing selectors; see the [entrypoint assessment](2026-10-07-m10-5-theme-react-entrypoint.md).
- **Token-only runtime:** `theme/token` provides a distinct, contract-derived type-safety capability. Its separate graph is not one of the approved selectors and does not reduce the existing `theme/core` or compatibility-theme graphs, so it is not a remedy for these failures.
- **Warm-transform work:** the official current-source median is 9.754 ms against the unchanged 6.514 ms maximum. The debug-ID cache improves a focused scratch statistic but still misses the ceiling and does not meet output-marker and invalidation requirements. The non-caching adapter screen found no removable phase large enough to recover the required gap while preserving Vanilla Extract output and dependency behavior. See the [cache assessment](2026-10-07-m10-5-debug-id-cache-candidate.md) and [adapter feasibility report](2026-10-07-m10-5-noncaching-adapter-feasibility.md).
- **Runtime decomposition:** source-map attribution identifies emitted-code origins, not removable cost. The synchronous public resolvers keep component and extension validation, recursive slot resolution, conditions, recipes, and sprinkles reachable. Moving those implementations between files does not remove them while preserving the current entrypoint semantics. The earlier source-map and startup measurements are diagnostic; the current host gate remains authoritative. See the [runtime attribution assessment](2026-10-07-m10-5-runtime-attribution-and-reduction-feasibility.md).

These screens either fail the unchanged gate, leave the failing selector untouched, or lack the parity and invalidation evidence required for production admission. The additive `theme/token` API remains a separate surface and makes no performance claim for existing entrypoints.

## Scope and next decision

No production source, public export, dependency, baseline, selector, threshold, or enforcement rule changed. This is a candidate-selection result, not a host-budget pass. M10.5 remains unqualified for its nine host failures. The consumer and emulator evidence remains separate from release Hermes and physical-device evidence; all physical-device work remains deferred.

**Next recommended numbered slice: M10.5 — review the binding host-budget policy against the completed current-source evidence. Record whether the nine package-host limits remain release blockers or whether a separately authorised compatibility/architecture change is needed. Keep the existing budget registry and API unchanged until that decision is explicit.**
