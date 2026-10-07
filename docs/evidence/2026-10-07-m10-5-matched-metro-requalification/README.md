# Matched Expo/Metro incremental rebuild evidence

This packet closes the M10.5 incremental-rebuild environment mismatch for the current compiler artifact. [`metro-incremental.json`](metro-incremental.json) is the raw five-run report. [`qualification.json`](qualification.json) records the baseline comparison, unchanged limits, source and runtime-artifact identities, dependency controls, and restoration checks.

The approved baseline is the 2026-09-21 M4.6 expanded Metro protocol: Expo 56.0.4, Metro 0.84.4, React Native 0.85.3, the iOS development bundle request, one cleared Metro server, three dependency-only invalidation controls, one excluded direct-edit warm-up, and five retained direct `.css.ts` edits. The current median is 129.318750 ms against the 123.950500 ms baseline. It is below both the 137.506 ms absolute maximum and the 10% regression cap.

## Source and scaffold identity

The disposable app used the frozen baseline lock at `43c5ece39360cf321fdb074d82cee41d5daaba23` to provide the approved Expo/Metro/React Native versions. The current compiler runtime artifacts, Metro configuration and benchmark fixtures were overlaid from compiler revision `fa9d347101b0b2757a7b4db90462df90adb8b6dc`; their hashes are retained in `qualification.json`.

The raw runner's `sourceRevision` therefore identifies the lock scaffold, and `sourceTreeDirty: true` reflects those deliberate overlays. It does not identify the compiler source. The separate qualification record pins the current compiler source digest and runtime artifacts. The disposable playground also declared `@vanilla-extract/css` at the range already present in the current Playground manifest and resolved it to the baseline lock's 1.20.1 package. This reproduces the current adapter-resolution contract without changing the approved Expo, Metro, React or React Native versions. All Metro-loaded `.mjs` and `.cjs` package artifacts matched the current build; only `.d.mts` declaration chunks differed and are not used by this runtime measurement.

## Reproduction

In a disposable checkout of the baseline lock scaffold, install the Playground workspace, then overlay the current `packages/css/dist` runtime artifacts, `apps/playground/metro.config.js` and the five fixture files identified by hash in `qualification.json`. Add the current direct `@vanilla-extract/css` app dependency and link the already-locked 1.20.1 package into the app's `node_modules` so Metro resolves the same adapter as the current Playground. Run the current benchmark script from the compiler checkout:

```sh
CRUMBS_INCREMENTAL_REPO_ROOT=/private/tmp/crumbs-m10-5-metro-pair \
CRUMBS_INCREMENTAL_APP_ROOT=/private/tmp/crumbs-m10-5-metro-pair/apps/playground \
bun packages/css/bench/metro-incremental.ts \
  /private/tmp/crumbs-m10-5-metro-pair/metro-incremental-matched.json 5
```

The harness validates all three dependency controls and the persistent-cache `strictDiagnostics` restart control, then restores the style, token, nested-style and workspace-token fixtures in `finally`. The retained report shows their original and restored hashes are equal.

## Limits

This is host Expo/Metro development evidence. It does not establish release Hermes performance, native rendering, frame timing or physical-device acceptance. The other nine host-budget failures remain open; no baseline, threshold, API or production dependency changed.
