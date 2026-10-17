# Changelog

## [1.2.0](https://github.com/opsydyn/crumbs-css/compare/v1.1.1...v1.2.0) (2026-10-17)


### Features

* qualify Expo SDK 58 and upgrade native apps (M1.10a-b) ([e333250](https://github.com/opsydyn/crumbs-css/commit/e33325035a343c448d97f83db2b9e68f55803ba8))
* qualify Expo SDK 58 compatibility (M1.10a) ([5e7e3d3](https://github.com/opsydyn/crumbs-css/commit/5e7e3d301125ed844d7d92a39c9d23fae05c0785))

## [1.1.1](https://github.com/opsydyn/crumbs-css/compare/v1.1.0...v1.1.1) (2026-10-10)

### Documentation

* Refresh the npm README and compatibility documentation for the complete stable API and the repository Crumbs consumer agent skill (M1.9c/M1.9d).
* Inherit all JavaScript, declarations, exports, dependencies and peer ranges byte-for-byte from published 1.1.0. No runtime or API changes.

## 1.1.0 (2026-10-10)

### Compatibility

- Add Expo SDK 57 / React Native 0.86 support while retaining Expo SDK 56 / React Native 0.85; bound the React Native peer range to `>=0.85 <0.87`. No public API removals or changes.
- Qualify the isolated SDK 57 packed consumer with strict npm peers, installed byte identity, types, motion contracts and production iOS/Android/web Metro exports. Preserve explicit app runtime imports when staging consumers.
- Run the committed SDK 57 profile in CI and against the exact future-release tarball; keep existing host budgets and generic release policy unchanged. Physical-device acceptance remains separate.

## [1.0.1](https://github.com/opsydyn/crumbs-css/compare/v1.0.0...v1.0.1) (2026-10-10)

### Documentation

- Correct the npm README and packaged compatibility notes to describe the complete published v1 API.
- Update onboarding to install 1.0.1 and clarify historical qualification scope.
- Preserve every runtime JavaScript and declaration file, export, dependency and peer range from verified 1.0.0. No functional or performance-policy change.

## [1.0.0](https://github.com/opsydyn/crumbs-css/compare/v0.1.2-alpha.1...v1.0.0) (2026-10-10)

### Stable API baseline

Promote the additive native styling and design-system surface to v1. Public APIs
and published artifact formats follow SemVer, with a documented replacement and
at least one minor release of deprecation before removal in a major release.
Existing APIs and declared peer ranges are preserved.

### Features

- Typed view/text/image composition, mapped variants, component recipes and finite Sprinkles lookup plans.
- Typed token contracts, aliases, scoped theme stores, selectors, codecs, optics and functional expressions.
- Standalone `createVar`/`fallbackVar` inputs and immutable `assignVars` snapshots.
- Named container ownership and exhaustive native layout conditions.
- Native motion definitions and an instance-owned public Animated adapter.
- Encoded/linear sRGB colour operations and immutable typography scales.
- Typed runtime factories backed by explicit named runtime imports and bounded frozen argument snapshots.
- Manifest compatibility, policy presets, ownership reports, DTCG import, migration planning and style explanations.

### Documentation and qualification

- Expand the repository and npm READMEs, complete every public entrypoint/value/type index, and expose delivered guides in the docs navigation.
- M11.5 passes1,828 CSS/33 Storybook tests, full packed host qualification and12 functional phases each on iOS/Android; native evidence belongs to the exact M11.5 artifacts, not an untested v1 tarball.
- v1.0.0 subsequently passed guarded npm publication, registry integrity/provenance and installed Expo exports. Cold transform and all editor rows pass; the recorded warm-transform and capped incremental failures have explicit v1-only approval. Physical-device, spoken-reader, live authored HMR and release-FPS checks remain deferred. See [v1 release evidence](https://github.com/opsydyn/crumbs-css/blob/main/docs/releases/1.0.0.md).

## [0.1.2-alpha.1](https://github.com/opsydyn/crumbs-css/compare/v0.1.1-alpha.1...v0.1.2-alpha.1) (2026-05-25)


### Bug Fixes

* **css:** finalize expo 56 compatibility contract ([64f9934](https://github.com/opsydyn/crumbs-css/commit/64f9934e65eb25fe32cc3cae584d0268be28e349))

## [0.1.1-alpha.1](https://github.com/opsydyn/crumbs-css/compare/v0.1.0-alpha.1...v0.1.1-alpha.1) (2026-05-20)


### Bug Fixes

* **css:** refresh npm readme ([279c2fb](https://github.com/opsydyn/crumbs-css/commit/279c2fb819e9d31819a03044e9e66fdb1576be31))

## [0.1.0-alpha.1](https://github.com/opsydyn/crumbs-css/compare/v0.1.0-alpha.0...v0.1.0-alpha.1) (2026-05-19)


### Features

* :rocket: pkg rename ([dbb1aee](https://github.com/opsydyn/crumbs-css/commit/dbb1aee68143ec4b8c2972eebc6ec4ebfba56c26))
* :sparkles: add release tooling ([b04aabe](https://github.com/opsydyn/crumbs-css/commit/b04aabe2f28fc228c0df33d19cb4343007612988))
* :sparkles: add sotrybook ([0b958d1](https://github.com/opsydyn/crumbs-css/commit/0b958d1444e089b3a76d3bb9ca8cec2cfbb48fa2))
* :zap: migrate crumbs from app ([7ee181f](https://github.com/opsydyn/crumbs-css/commit/7ee181fc7334f60c19e7940b96129f3624eb0cf4))


### Bug Fixes

* :bug: pin deps ([2e3a27f](https://github.com/opsydyn/crumbs-css/commit/2e3a27fb82769f6f5b9afaef6c6b72ee24a9894f))
