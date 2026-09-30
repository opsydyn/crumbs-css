# M10.4 North Star Journeys Qualification

**Status:** qualified for the packed iOS/web export and host interaction matrix. This is package and JavaScript-bundle evidence, not native-device acceptance.

## Result

All three M10.4 journeys passed against locally packed Crumbs, token, and UI artifacts installed beneath an independent Expo consumer. The retained [qualification receipt](../evidence/2026-09-30-m10-4-north-star/qualification.json) binds source and fixture hashes, exact artifact versions and tarball hashes, the lockfile, and result artifacts. Its [bundle inventory](../evidence/2026-09-30-m10-4-north-star/bundle-inventory.json) records package provenance for iOS and web source maps; the maps include the packed packages and exclude repository source paths.

The consumer matrix was Expo 56.0.4, React 19.2.3, React Native 0.85.3, React Native Web 0.21.2, `@rn-primitives/portal` 1.4.0, and `react-test-renderer` 19.2.3. The host was Bun 1.4.2, Node 24.15.0, npm 11.12.1, macOS 25.6.0 on Apple M4 Pro. The receipt records these versions; no publication or workspace linking was used.

**Journey A — distribute a component package.** The independent app installed all three packages from local tarballs. Its integration test rendered the same packed `ActionCard` under Foundation and Signal, then rendered Signal content through a portal with the scope reapplied at the portal host. It verified the Signal token values and disabled accessibility state without copying the component implementation or changing Crumbs runtime APIs. The runtime graph audit passed for 37 graphs, including eight ordinary-runtime entrypoints.

**Journey B — change a shared token safely.** The packed manifest API reports a public alias-target change as a warning and a removed public token as an error, each attributed to the explicitly supplied consumer. The packed migration API changes only the named source file, leaves an unrelated file byte-identical, and returns an unchanged plan when repeated. The previous packed theme snapshot retains its original values after a new snapshot is constructed.

The new `token.alias-changed` finding advances the strict compatibility report wire version to v2. Manifest v1 and source migration v1 are unchanged. The ownership tooling and its active fixtures now consume compatibility v2; the prior M9.7 v1 receipt remains as historical evidence. The strict compatibility decoder rejects v1 reports, so consumers of saved compatibility reports must regenerate them with the v2 producer.

**Journey C — add a second brand.** The same public component and slot/variant types work under both validated brand scopes. Portal scope and disabled state checks pass in the host test. The test uses React Native Web in Bun because Bun cannot execute React Native's Flow entrypoint; the iOS and web Metro exports are separate bundle gates.

## Verification

- `bun run northstar:qualify` — passed packed installation, public tooling entry resolution, theme snapshot check, host integration test, consumer typecheck, iOS/web Expo exports, source-map inventory, runtime graph audit, and host smoke benchmark.
- `bun run check` — passed package build/typecheck, 1,269 CSS package tests, and 23 Storybook tests.
- `bun run app:typecheck` — passed.
- `bun run docs:build` — passed.
- `git diff --check` — passed.
- The host benchmark passed its existing smoke ceilings. Cold and warm transforms now run from the same fixture-root working directory and produce matching hashes. Its numbers remain host-only observations; new ingress/cold scenarios have no calibrated budget and full M1.8 performance qualification remains open. See the [host report](../evidence/2026-09-30-m10-4-north-star/host-smoke-performance.json).

## Limits

The declared matrix is limited to the exact versions in the receipt. iOS and web exports establish packed JavaScript bundle provenance, not native rendering, native accessibility, or native performance. The host interaction test is not screen-reader acceptance. No screenshots or device recordings were captured. Android, physical-device rendering/performance, screen-reader acceptance, and publishing remain `not-run`; Android remains parked and device acceptance remains backlogged.

## Next roadmap item

**M10.5** — run the full compatibility, property, type/editor, package, documentation, visual, and device budgets, then publish a guarantees matrix separating supported, measured, and unsupported behavior.
