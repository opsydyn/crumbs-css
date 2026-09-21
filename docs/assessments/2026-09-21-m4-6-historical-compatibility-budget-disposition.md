# M4.6 historical compatibility budget disposition

## Decision

Retire the historical `runtime-emitted-bytes` metric from active budget gates
and keep it as a verified diagnostic. Its old selector,
`effect.runtime.cjs.graph-bytes`, and 11,307-byte value remain in the registry
with the original audit evidence, but the baseline is classified as
`diagnostic` and no longer contributes to threshold approval or current
performance qualification.

The six format-specific split graph metrics are the active runtime-byte gates
for the current contract: `theme-core`, `tokens` and compatibility `theme`, in
ESM and CJS. Their approved zero-growth ceilings remain unchanged.

The machine-readable decision is recorded in
[decision.json](../evidence/2026-09-21-m4-6-historical-compatibility-disposition/decision.json).

## Why the old ceiling is no longer active

The old 11,307-byte value came from the compatibility `theme.cjs` graph before
the token identity, domain, schema/optic boundary, dependency-plan and
dedicated-entrypoint work. The current compatibility graph is 44,764 bytes and
the intervening public runtime contract is materially larger. The retained
evidence does not identify a same-functionality reduction target that would
make the old ceiling comparable.

The old comparison remains a useful sentinel: the current graph is 33,457
bytes above the old value (+295.9%). Reclassifying it as diagnostic preserves
that signal without making an obsolete compatibility lineage block the six
current-functionality gates. Diagnostic selector/value metadata is re-derived
from retained evidence, and host comparison reports keep diagnostic results
separate from the recorded metric set.

## Registry and reporting changes

- `runtime-emitted-bytes` is now a diagnostic baseline with its selector,
  value, evidence and reason retained.
- Diagnostic baseline metadata is verified when `budgets:validate` runs.
- Recorded comparisons now contain the 21 active approved metrics; diagnostic
  comparisons are reported separately and never set `performanceQualified`.
- The focused runtime graph adapter reads the historical zero-growth policy
  from the retained decision evidence and reports the compatibility result as
  diagnostic-only.

The registry remains pending because release-device frame, allocation and
retained-memory evidence is still missing or diagnostic. This slice changes no
dependency, public API, native target, publication state or Android status.

## Verification and limits

The focused budget-contract suite covers diagnostic classification,
selector/value re-derivation, separate diagnostic comparison and the unchanged
split gates. Typecheck and registry validation are required before commit.
The comparison is emitted-artifact evidence on the current macOS host; it does
not qualify Hermes startup, native frame time, allocation, retained memory,
physical iOS or Android.

Next recommended roadmap item: **M5.1** — define the public native
`defineProperties` / `createSprinkles` adaptation with finite values,
domain-safe token scales, native primitive kinds and typed shorthands. Keep
M4.6 release-device gates and Android qualification explicitly backlogged to
the final device-enabled move.
