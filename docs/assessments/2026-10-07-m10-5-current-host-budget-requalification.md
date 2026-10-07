# M10.5 current-host budget requalification

**Status: host performance remains unqualified.** A clean-install requalification now measures the current tracked source and lock state. It records 11 passing metrics, nine failures and one incomplete Metro comparison. No approved baseline, threshold or enforcement rule changed.

## Measurement integrity

The collection ran in a disposable clean clone at base revision `3db9ac787de7456897949001d5b297e7b806b9c3`, with the final tracked changes and frozen lockfile. Its authored-source SHA-256 (`db9a02ecd57c1c0c11f96ea19640fb975f447ae03bf52117ef2dcc3c349f9894`) matches the managed `main` worktree. The measured source and 145 freshly built package artifacts each had identical before/after hashes. The managed worktree's `node_modules` is a symlink into another checkout, so its dependencies were not used. Its ignored pre-existing `dist` artifacts differ from the fresh clean build; they were neither used nor overwritten.

The host was macOS arm64 on Apple M4 Pro, Bun 1.4.2, exact Node 22.0.0 floor binary (SHA-256 `9507031f6769f2381eae353b3614bafa871c957dc6f2ae86a3af948acdf9b178`) and current Node 24.15.0. The full measurement and raw component reports are retained under [`evidence/2026-10-07-m10-5-current-host-budget-requalification/`](../evidence/2026-10-07-m10-5-current-host-budget-requalification/).

## Results

| Metric | Approved baseline | Current median | Difference | Result |
| --- | ---: | ---: | ---: | --- |
| Node 22 ESM initialization | 6.293542 ms | 8.435833 ms | +34.04% | Fail |
| Node 22 CJS initialization | 3.401791 ms | 5.110042 ms | +50.22% | Fail |
| Current Node ESM initialization | 2.555625 ms | 4.614500 ms | +80.56% | Fail |
| Current Node CJS initialization | 2.036500 ms | 3.608125 ms | +77.17% | Fail |
| Warm transform | 5.664125 ms | 9.754042 ms | +72.21% | Fail |
| `theme/core` ESM graph | 17,271 bytes | 64,549 bytes | +273.74% | Fail |
| `theme/core` CJS graph | 17,641 bytes | 65,408 bytes | +270.77% | Fail |
| Compatibility theme ESM graph | 44,017 bytes | 164,215 bytes | +273.07% | Fail |
| Compatibility theme CJS graph | 44,764 bytes | 171,842 bytes | +283.88% | Fail |

The incremental rebuild median is 130.399458 ms against 123.9505 ms (+5.20%), but remains **incomplete**. Its environment is Expo 56.0.23 / Metro 0.84.5 / React Native 0.85.3, while the approved baseline is Expo 56.0.4 / Metro 0.84.4 / React Native 0.85.3. The observation cannot be counted as a pass or fail until the workload and environment match; the existing 10% ceiling is unchanged.

The report's runtime graph shows `theme/core` as a 64,549-byte entry with React as its only external. The current source graph includes the newer condition, expression, recipe and sprinkles runtime capabilities. This points to accumulated graph growth as a useful target for attribution, but the host report does not isolate the cost of individual functions. It provides no evidence for blaming Effect itself or for introducing a persistent compiler-context cache. No safe, behavior-preserving production change was identified from this run, so no speculative runtime optimization was made.

## Clean-install and repository checks

The clean install exposed missing declarations in the measurement/test environment. The Playground now directly declares its Vanilla Extract adapter; the CSS workspace declares the Metro cache package used by its benchmark tooling; the root declares the TypeScript and TSGo tools expected by the editor benchmark. The package-boundary test now resolves React peers from the actual Expo consumer fixture rather than relying on Bun hoisting them to the workspace root. These changes do not alter the public Crumbs API or add a production runtime dependency.

The final `bun run check` passed: 1,499 Crumbs CSS tests passed, one exact-Node-floor-only test was skipped under the current-runtime run, zero failed; Storybook passed all 23 tests. `bun run budgets:validate` returned `valid: true` with no baseline issues; its registry remains `thresholds-pending-review` for separate future metrics. The separate host report remains unqualified because its nine failures and one incomplete comparison are preserved.

## Remaining work

Keep M10.5 open. The next bounded slice should profile the five runtime initialization / warm-transform failures by entry and feature boundary, then test an API-preserving graph reduction against the same unchanged budgets. Separately qualify the Expo/Metro comparison using a controlled dependency pair or an explicitly reviewed baseline policy. Physical-device work remains deferred; this slice used host measurement only.
