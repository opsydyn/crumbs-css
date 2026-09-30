# M10.5 Performance Registry Membership Correction

Date: 2026-09-30

Base revision: `91b128c`

## Finding

The v1 registry mixed active performance budgets with a historical diagnostic.
Although M4.6 retired `runtime-emitted-bytes` from active qualification, its
pending threshold still blocked registry readiness and threshold review.

The registry is now v2. It separates 25 active `metrics` from a top-level
`diagnostics` collection containing the historical `runtime-emitted-bytes`
entry. The diagnostic retains its evidence path, selector, value, reason, and
repetition count; it has no active threshold. IDs must be unique across both
collections. Required domains, active-registry completeness, readiness,
threshold-review candidates, and recorded performance comparisons are based on
`metrics`. Diagnostic evidence verification and diagnostic comparisons include
both active metrics with diagnostic baselines and the separate diagnostic
collection.

The four remaining active gates are unchanged: JS frames, UI frames, allocations,
and retained memory. Three baselines remain missing and retained memory remains
diagnostic pending controlled forced-GC release-device evidence. No baseline,
threshold, device claim, or registry activation was created by this change.

## Verification

- `bun test test/budget-contract.test.ts`: 16 tests passed, 214 assertions,
  including cross-collection duplicate rejection and malformed diagnostic
  membership cases.
- `bun run budgets:validate`: `valid: true`, `registryReady: false`,
  `performanceQualification: "not-run"`, 25 active metrics, four active pending
  thresholds, three missing baselines, one active diagnostic baseline, one
  diagnostic-only entry, and no baseline issues.
- `bun run budgets:readiness`: exits 1 as designed because the four active
  device gates remain incomplete.
- `bun run check`: package build and typecheck completed; 1,287 CSS package tests
  and 23 Storybook tests passed.
- `bun run docs:build`: 28 pages built successfully.

This slice does not complete M10.5. Native visual/accessibility acceptance and
device performance budgets still need direct evidence. The exact Node v22.0.0
full host-budget suite remains the final M10.5 gate; Android remains parked.
