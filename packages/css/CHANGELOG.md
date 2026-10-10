# Changelog

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
- M10.5 cold/warm host budgets remain failed and the required hosted Mac runner is unregistered. GitHub release creation does not publish to npm or waive those gates. Physical-device, spoken-reader, live authored HMR and release-FPS checks remain deferred.

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
