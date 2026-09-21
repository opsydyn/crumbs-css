# M4.6 current split-budget comparison run

## Result

The new current-checkout adapter passed all six admitted emitted-graph gates:

- `theme-core`: 17,271 bytes ESM and 17,641 bytes CJS;
- `tokens`: 56,013 bytes ESM and 63,308 bytes CJS, including local chunks;
- compatibility `theme`: 44,017 bytes ESM and 44,764 bytes CJS.

Each graph had five deterministic scans, zero deviation, zero nonliteral loads,
and the retained artifact shape. The split comparison is recorded in
[comparison evidence](../evidence/2026-09-21-m4-6-runtime-byte-comparison/comparison.json).

The historical `runtime-emitted-bytes` metric remains visible and fails as
expected: the current compatibility CJS graph is 44,764 bytes against its
11,307-byte zero-growth baseline (+295.9%). The adapter keeps that result
separate so it does not obscure the six current-functionality budgets.

## Implementation

`packages/css/bench/runtime-graph-budget.ts` provides the shared five-scan
adapter. `scripts/measure-runtime-graph-budgets.ts` writes the current graph
and comparison evidence, and `measure:host-budgets` now includes the same graph
evidence when the full host matrix runs. `compareRuntimeGraphMetrics` scopes
the comparison to the six admitted graph selectors while retaining the
whole-registry readiness result as `not-run`.

The current host reports Node v26.3.0 while the retained admission evidence
reports Node v24.15.0. This is an explicit graph-scan equivalence: the emitted
bytes are produced by the same Bun/tsdown build and AST scanner, so Node is
retained for traceability but does not make this deterministic byte comparison
incomplete.

## Verification and limits

- `bun run build` passed.
- Focused budget-contract tests passed: 14 tests / 198 assertions.
- `bun run budgets:validate` passed with valid registry, no baseline issues,
  and readiness still false for the four native/device domains.
- `bun run measure:runtime-graph-budgets` exited zero after passing the split
  gates and wrote the comparison report; the retained historical failure does
  not change that focused command's exit status.

This is emitted-artifact evidence on the current macOS arm64 host. It does not
qualify Hermes startup, frame time, allocations, retained memory, physical iOS,
or Android. Those gates remain backlogged.

Next recommended slice: **M4.6 full host comparison rerun** — run the updated
`measure:host-budgets` adapter so the Effect boundary, runtime initialization,
benchmark, Metro, editor, and split graph reports are compared together. Keep
the historical compatibility failure visible and the whole registry fail-closed.
