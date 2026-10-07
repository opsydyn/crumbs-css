# M10.5 contract-derived theme-token candidate

This evidence packet records a disposable token-only React theme runtime after fixing the prior prototype's type-contract gap and dogfooding the consumer API in the internal Expo/Storybook app. It is candidate evidence only; the package entrypoint and Storybook fixture are not part of the shipping worktree.

## Result

`themeToken` now accepts only a domain-branded token reference from `createTokenContract`, and its type carries the token's domain into style authoring. `createTokenStyles<ViewStyle>()` checks both the property's allowed token domains and whether the contract-derived token value is assignable to the selected React Native property. A caller cannot supply an independent value generic. The public `theme/core` and compatibility `theme` entrypoints are unchanged in the candidate patch.

The candidate ESM/CJS graphs are 13,631/13,821 bytes, below the existing 17,271/17,641-byte comparison ceilings. Five package builds produced identical bytes and hashes. Each format contains one local artifact and has only `react` as an external. The comparison ceilings are not approved budgets for a new subpath. Existing `theme/core` artifacts match the current official host evidence exactly at 64,549/65,408 bytes.

Package build, typecheck, packed export/declaration checks, provider interoperability and the full package suite pass (1,515 passed, one Node-22-only skip, zero failed). The Storybook consumer typecheck and its 23 tests pass. Expo 56 web export bundles the app with the token-only component included (914 Metro modules; JS bundle SHA-256 retained in `expo-web-export.json`). This is a web bundle check, not native rendering or device acceptance.

The official M10.5 host gate is unchanged at 11 pass, nine fail and one incomplete. No module-startup performance, approved budget, native Hermes result, device rendering, accessibility result, or physical-device acceptance is claimed. M10.5 remains open.

## Consumer contract

The dogfood component uses the existing Storybook `TokenThemeProvider` from `@opsydyn/crumbs-css/theme` and the candidate `useTokenStyles` hook. The shared provider context resolves the same contract's color and length references into `View` and `Text` styles. The package runtime tests also cover candidate/full-provider interoperability in both ESM and CJS directions.

The type fixture accepts color, length, opacity, and finite-enum tokens when they fit the React Native property. It rejects raw variable names, legacy vanilla-extract theme refs, caller-chosen type parameters, cross-domain properties, incompatible enum values, and structured style values. The runtime remains intentionally narrow: flat primitive styles and direct token refs only; no arrays, conditions, recipes, components, or extensions.

## Reproduction

Use Bun 1.4.2 in a clean checkout at or after the recorded base revision. The candidate applier verifies that `packages/css`, `apps/storybook`, and the packed-runtime graph classifier still match the base source, checks the encoded patch digest, and applies only the recorded candidate patch. Run the package suite with Bun's isolated linker because a compatibility test consumes the `apps/playground` workspace peers; switch to the hoisted linker for Expo export because the Storybook Metro resolver searches the app and monorepo package roots.

```sh
bun install --frozen-lockfile --linker=isolated
bun docs/evidence/2026-10-07-m10-5-theme-token-contract-derived/repro/apply-candidate.mts
bun run --filter @opsydyn/crumbs-css build
bun run --filter @opsydyn/crumbs-css typecheck
bun run --filter @opsydyn/crumbs-css test
(cd apps/storybook && bun run typecheck)
(cd apps/storybook && bun run test)
bun install --frozen-lockfile --linker=hoisted
(cd apps/storybook && EXPO_NO_METRO_WORKSPACE_ROOT=1 ./node_modules/.bin/expo export --platform web --output-dir "$TMPDIR/crumbs-m105-expo-web")
bun docs/evidence/2026-10-07-m10-5-theme-token-contract-derived/repro/measure.mts
```

`measure.mts` performs five package builds and audits the emitted packed ESM/CJS graphs. The encoded patch is `repro/contract-derived-candidate.patch.b64`; its applier validates the decoded patch SHA-256 before use. The consumer source and all candidate package tests are inside that patch. The static web bundle was retained by size and digest rather than committed as a 2.5 MB generated file.

## Qualification boundary

This evidence does not admit or change a performance budget, select the candidate for release, add a dependency, or modify shipping source. The official M10.5 failures and incomplete Metro baseline remain open. Physical-device work remains deferred. See the [assessment](../../assessments/2026-10-07-m10-5-theme-token-contract-derived.md) for the adoption boundary and next recommendation.
