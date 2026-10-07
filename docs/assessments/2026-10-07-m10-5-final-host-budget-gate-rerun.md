# M10.5 final current-source host-budget gate rerun

- Date: 2026-10-07
- Roadmap: M10.5
- Status: gate executed; performance remains unqualified
- Source revision: `dbf491d12c5700f50c77d646873bece3bf341f20`
- Source identity: `4e519e759379541fbdc557e61e3968e59c94c6f3e617508271f4ace56d6ef70d` (675 files)

## Decision

The current-source run completed all 21 approved host comparisons: **11 pass, nine fail, one incomplete**. The incomplete incremental-rebuild row is excluded from pass/fail because Expo and Metro differ from the approved environment. Keep all baselines, thresholds, and selectors unchanged. Physical-device acceptance remains deferred.

## Why the prior report was stale

The previous exact host report was pinned to `b7c20705109a1ea6a47a7a1ac95cd7c95de79544` with digest `23b89158a7642af4a4f7c8693cd79b2a21a34b74bdf52be967c2efd1049bfebd` over 670 source files. Since then, 17 paths changed or were added and none were removed, including the additive `theme/token` implementation, its public export, and contract/type/runtime tests. This rerun therefore refreshes the official host result against the source now committed at `dbf491d12c5700f50c77d646873bece3bf341f20`. [`source-delta.json`](../evidence/2026-10-07-m10-5-final-host-budget-gate-rerun/source-delta.json) lists all changed paths and hashes.

## Results

The failures are all four runtime-initialization budgets, warm transform, and four `theme/core` or compatibility-theme graph budgets. The existing `runtime-tokens` graph selectors pass. The incremental rebuild is incomplete at 130.462 ms because the measured Expo 56.0.23 / Metro 0.84.5 differs from approved Expo 56.0.4 / Metro 0.84.4; React Native 0.85.3 matches. The complete 21-row table and measurement protocol are in the [evidence packet](../evidence/2026-10-07-m10-5-final-host-budget-gate-rerun/README.md).

A frozen install completed with 1,094 packages. `bun run check` passed with 1,515 CSS tests, one Node-floor-only skip, zero CSS failures, and 23 Storybook tests passing. Budget registry validation is valid with zero baseline issues; registry readiness remains false for four future/device-facing pending thresholds. The source manifest remained stable during collection, and all 149 built artifact hashes remained stable. Exact Node 22.0.0 and Node 24.15.0 binaries were verified by SHA-256 and retained in the machine-readable qualification.

No production source, API, dependency, baseline, threshold, selector, or enforcement rule changed in this host gate. `theme/token` graph size was not made a new approved selector. This report covers host evidence only and adds no Hermes, physical-device, or release-performance claim.

## Next item

**Next recommended numbered slice: M10.5 — select one API-preserving remediation candidate for the runtime-initialisation, warm-transform, and theme graph failures using the current source and graph evidence.** Preserve the full public API and every approved budget. Avoid the rejected cache and static-extraction candidates, and require this exact host gate to pass before production admission.
