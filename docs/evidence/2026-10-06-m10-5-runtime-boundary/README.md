# M10.5 static runtime-boundary candidate: rejected

This archive records a private compatibility-preserving extraction experiment. Its production restructuring was rejected against the unchanged M10.5 gates. The measured candidate source is retained in [candidate-source.tar.gz](./candidate-source.tar.gz); the final production source tree was restored to the control implementation. No public API, dependency, approved threshold, baseline or package guarantee changed.

## Control and candidate

The control is the package built from revision `7eb51d89225802f57f51cb16259d8c96c61c1bfe`, with production source digest `1f88a93d9dfbeffc911303eb1e531492cc005d83ba52a885513526d448362673`. The complete package and its export, declaration and graph receipts are preserved in [control-package.tar.gz](./control-package.tar.gz) and [control-manifest.json](./control-manifest.json). The exact changed candidate source is archived and hashed in [qualification.json](./qualification.json).

The candidate separated React integration, cache access, token/style resolution, component-token resolution, token-theme scopes and dependency resolution into static modules. It preserved the generic resolver passed into nested component/extension slot traversal, the existing Symbol keys, validators, public facades and independent core build group. Package-shaped ESM/CJS characterization, focused binding identity, mixed provider/hook order, recursive slot resolution and runtime isolation passed. The candidate did not introduce a public API or dependency.

## Performance disposition

The official unchanged 21-metric comparison recorded **11 passes, 9 failures and 1 environment mismatch**. It is not performance-qualified. All four startup metrics fail, including exact Node 22.0.0 ESM/CJS; warm full-transform also fails. The four theme graph gates fail. The Expo incremental-rebuild comparison is incomplete because its baseline used Expo 56.0.4 while the candidate used 56.0.23. Five legacy smoke repetitions passed. A separate diagnostic-only emitted-byte metric failed and is not part of the official 21-metric count. See [the full comparison](./host-budgets/comparison.json), [input identity](./host-budgets/input-identity.json) and [paired raw first-use data](./paired-first-use/candidate-control.json).

Against the package control, the candidate graph sizes grew slightly: theme ESM/CJS by 515/295 bytes and core ESM/CJS by 350/339 bytes. The 16 fresh-process diagnostic cohorts (Node 22.0.0 and Node 24.15.0, ESM/CJS, token/component/extension/scope) retained 15 alternating control/candidate pairs each, 240 pairs total. All 16 combined import-plus-first-use screens were within the control sample range; the experiment establishes no qualifying speedup.

The candidate's packed Expo result was observed in the execution output but not retained as an artifact. Accordingly, candidate packed-consumer, Metro refresh and native-flow qualification remain incomplete. After restoring the control source, a new packed iOS/Android/web export and source-map check passed; its artifact hashes are in [packed-consumer/final-control.json](./packed-consumer/final-control.json). This is build/source-map evidence, not a launched native-app or visual-acceptance claim. No Simulator was operated; physical-device acceptance remains deferred.

## Final verification

After restoration, the package build, complete package and Storybook tests, package typecheck, Storybook typecheck, and packed iOS/Android/web check passed. The guarantees matrix was reconciled with the current source identity: 15 earlier measurement rows are now marked stale, with original hashes, revisions and outcomes retained. The generated reference check passed and the 28-page documentation build succeeded. `packages/css/src/theme-runtime.ts` and `theme-core.ts` match the control. The retained source changes are the `native-tags-*` runtime-source-map allowlist and its test, which let the packed source-map checker recognise a runtime chunk already present in the control graph, plus the control-backed runtime-boundary characterization test.

The next recommended numbered slice is **M10.5 — non-breaking startup and emitted-graph attribution and feasibility design**. Attribute current bytes and startup work to required public semantics versus avoidable module initialization, then propose one measurable implementation candidate while preserving current APIs and approved ceilings. Keep warm-transform and Expo comparability gates explicit.
