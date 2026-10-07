# M10.5 final current-source host-budget gate

- Date: 2026-10-07
- Roadmap: M10.5
- Status: gate executed; performance remains unqualified
- Source revision: `b7c20705109a1ea6a47a7a1ac95cd7c95de79544`
- Source identity: `23b89158a7642af4a4f7c8693cd79b2a21a34b74bdf52be967c2efd1049bfebd` (670 files)

## Decision

The exact current-source host run completed all 21 approved comparisons: **11 pass, nine fail, one incomplete**. Keep every existing budget, baseline, and selector unchanged. The incomplete Metro row is not a pass or failure because its Expo/Metro versions differ from the approved baseline. Physical-device acceptance remains deferred.

The older 2026-10-07 current-host report had source digest `db9a02ecd57c1c0c11f96ea19640fb975f447ae03bf52117ef2dcc3c349f9894` over 667 files. Twelve paths changed or were added before this run; the new [source delta](../evidence/2026-10-07-m10-5-final-host-budget-gate/source-delta.json) shows why the old report was no longer authoritative. The new clean-clone report pins `23b89158a7642af4a4f7c8693cd79b2a21a34b74bdf52be967c2efd1049bfebd`, and its source plus all 145 package artifact identities remained stable during collection.

## Results

The four initialization medians remain above their approved limits: Node 22 ESM 8.393 ms, Node 22 CJS 5.222 ms, Node 24 ESM 4.595 ms, and Node 24 CJS 3.557 ms. Warm transform is 9.973 ms against a 5.664 ms baseline. The theme/core and compatibility-theme graphs also fail; the token-only graphs pass.

The single incomplete comparison is incremental rebuild at 131.619 ms (+6.19%). The run uses Expo 56.0.23 / Metro 0.84.5; the approved baseline is Expo 56.0.4 / Metro 0.84.4. React Native 0.85.3 matches.

The collector used exact Node v22.0.0 (SHA-256 `9507031f…`) and Node v24.15.0 (SHA-256 `3200fbd9…`). `bun run check` passed with 1,502 CSS tests, one exact-floor-only skip, and 23 Storybook tests. `bun run budgets:validate` is valid with zero baseline issues; registry readiness remains false for pending device-facing threshold/baseline work.

See the [full host evidence](../evidence/2026-10-07-m10-5-final-host-budget-gate/README.md) and machine-readable [qualification](../evidence/2026-10-07-m10-5-final-host-budget-gate/qualification.json). No public API, dependency, baseline, threshold, or enforcement rule changed.

## Next item

**Next recommended numbered slice: M10.5 — select one API-preserving remediation candidate for the runtime-initialisation and theme graph failures using the current source and graph evidence.** Keep all existing budgets fixed, avoid rejected cache/static-extraction candidates, and require the exact host gate to pass before production admission.
