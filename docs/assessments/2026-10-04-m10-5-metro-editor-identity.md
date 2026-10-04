# M10.5 Metro and editor measurement identity repair

## Finding

The previous exact Node 22 host-budget run left the Metro incremental-rebuild metric incomplete because it used Expo 56.0.23 and changed both the measured source graph and the timed cache protocol. The eight editor comparisons were incomplete because generated source markers changed the fixture hashes while source revision, package version, and API coverage metadata were being treated as workload identity.

The Metro runner now reconstructs the recorded M4.6 scalar-token source fixture for measurement and separately records the current worktree fixture hashes used for final restoration. Its strict-diagnostic cache-restart control remains present but now runs after the timed warmup and five direct-edit samples. The timed cache protocol and all five source hashes match the retained baseline. Before the M8.4 control runs, the runner restores the current worktree fixtures so the control exercises the current shared-token object graph while preserving the clear-once/persistent-restart sequence and validating changed permissive/strict/restored outputs.

The full run used the cached Expo 56.0.4, Metro 0.84.4, React Native 0.85.3, `@expo/metro-runtime` 56.0.12, React/ReactDOM 19.2.5, and `babel-preset-expo` 56.0.12 package set. Existing playground dependency symlinks were swapped for the run and restored afterward; app manifests and lockfiles did not change. The raw report records Metro's historical comparison environment and the additional resolved-package provenance.

The editor fixture generator now preserves the baseline source bytes and scale hashes. Current condition and slot-recipe support remains accurate in the manifest coverage field; source revision, Crumbs package version, and coverage are provenance, while host/toolchain, protocol, and exact per-scale source hashes/shape define measurement identity.

## Qualification

The exact Node v22.0.0 full host-budget run is complete. All 21 recorded comparisons now have exact environment and workload identity: ten pass and eleven fail existing approved limits, with no incomplete identity comparisons. Metro passes at a 127.310 ms median against its 123.950 ms baseline (+2.71%). All eight editor metrics pass with exact source hashes. The cold transform also passes.

The eleven remaining failures are the four runtime-initialization metrics, warm transform (8.033 ms versus a 5.664 ms baseline and 6.514 ms ceiling), and six runtime-graph metrics. The separate diagnostic-only emitted-byte comparison remains a failure and does not enter the 21-metric qualification. The budget registry remains unready for device-facing pending thresholds and missing baselines. Overall host performance qualification is therefore false.

Final `bun run check` passed: package build and typecheck, 1,370 CSS tests across 212 files, and 23 Storybook tests. `bun run budgets:validate` reports a valid registry with no baseline issues; registry readiness remains false because device thresholds and baselines are still pending.

No budget, threshold, historical baseline, package manifest, lockfile, public API, or runtime implementation changed. These are host measurements; they do not qualify Hermes or release-device performance, native rendering, accessibility, or Android. Android remains last.

See the [machine-readable qualification](../evidence/2026-10-04-m10-5-metro-editor-identity/qualification.json) and the retained [host-budget reports](../evidence/2026-10-04-m10-5-metro-editor-identity/host-budgets/).

## Next slice

**M10.5 warm-transform cost remediation** — profile the now-exact historical package-root workload, identify a bounded source or cache improvement, and preserve the existing output-parity assertion and approved 6.514 ms/15% gate. Re-run the full Node 22 suite only after focused evidence supports a candidate. Keep runtime-initialization/graph failures and device evidence visible as separate gates; Android remains last.
