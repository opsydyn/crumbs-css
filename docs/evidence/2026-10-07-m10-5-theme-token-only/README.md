# M10.5 token-only React runtime feasibility screen

This packet captures a disposable prototype of a narrowly typed React theme runtime. It is cost and behavior evidence only; the candidate has not been added to the package API.

## Recorded result

The candidate `./theme/token` graph is 13,176 bytes ESM and 13,366 bytes CJS. Five fresh package builds produced identical bytes and hashes. Each packed graph contains one local file, has only `react` as an external, and has no dynamic-loader exceptions. These values are compared with the existing `theme/core` maxima of 17,271/17,641 bytes only as a feasibility screen; they do not establish an approved budget for a new subpath.

The existing `theme/core` build remains 64,549/65,408 bytes and exactly matches the retained official host artifacts. Its four gate failures remain unchanged. No module-load or Expo/Hermes timing was collected for this candidate.

## Candidate behavior and limits

The scratch-only API surface is `ThemeProvider`, `useTokenStyles`, `resolveTokenStyles`, `createTokenStyles<TStyle>()`, and `themeToken<TValue>()`. It accepts flat native style records with primitive values and direct token references. It rejects arrays, nested maps, conditional styles, recipes, component recipes, and extension descriptors. Missing token values, contract ownership mismatches, invalid token descriptors, and accessor properties are covered. It uses the same global provider-context key as `theme/core`; ESM/CJS server-render checks pass in both provider/hook directions.

The type prototype still has a blocker for public adoption: `themeToken<TValue>(varName)` allows a caller to assert a value type unrelated to the contract token. The type fixture records a counterexample. A follow-up should infer the type from a contract-bound token reference and prove property compatibility before any public export is added.

## Reproduction

The candidate is based on commit `8ba4cf9cbd6783b307676076c5b8febe6fb7af49`. In a clean disposable checkout at that revision, run the included decoder/applier, install the frozen workspace dependencies, then run:

```sh
bun docs/evidence/2026-10-07-m10-5-theme-token-only/repro/apply-candidate.mts
bun run --filter @opsydyn/crumbs-css build
bun run --filter @opsydyn/crumbs-css typecheck
bun run --filter @opsydyn/crumbs-css test
bun docs/evidence/2026-10-07-m10-5-theme-token-only/repro/measure.mts
```

The encoded `repro/theme-token-only-candidate.patch.b64` is decoded and digest-checked by `apply-candidate.mts` before the exact patch is applied. The measurement script performs five independent package builds, records exact file sizes and SHA-256 hashes for `theme/token` and `theme/core`, then runs the repository’s packed-runtime graph audit. The retained environment is Bun 1.4.2, Node 24.15.0, macOS arm64. The test checkout used the matching installed Expo Playground React/React DOM peers for the cross-entry server-render checks; this is a test harness detail, not a new package dependency.

## Qualification boundary

The prototype build and declarations pass. Package typecheck passes, including Node16 and Bundler consumer declaration resolution. The complete CSS package suite reports 1,514 passed, one Node-22-only skip, and zero failed. Four new cross-entry React checks pass across ESM/CJS. This package suite does not replace the official M10.5 host matrix, Metro refresh qualification, Expo/Hermes consumer matrix, or device acceptance.

The official M10.5 host result remains 11 pass, nine fail, and one incomplete. No production source, public export, dependency, approved limit, baseline, or enforcement rule changed. Physical-device work remains deferred.
