# M1.9f — Expo SDK 57 playground default

The playground now defaults to the already-qualified Expo 57.0.27 / React Native
0.86.3 / React 19.2.8 profile, with Node >=22.13.0. Storybook retains Expo 56.0.23 /
RN 0.85.3 / React 19.2.3. Its package manifest and the library manifest are unchanged.
The shared lockfile resolves Storybook's existing `^1.4.0` portal dependency to
1.5.3, also pinned by the qualified SDK 57 profile; Storybook types and tests pass.
The lockfile also synchronises the existing library version metadata to 1.1.1.

[Qualification](qualification.json) records the verified working tree based on
`243154354f526b169d6ca3f26aaf8e806190f13e`, exact packed artifacts and execution
contexts. [Source hashes](source-input-hashes.json) pin the functional inputs.
This is local evidence, not a clean hosted CI run or a new library publication.

## Consumer and regression checks

- Locked Bun installation, library types and Storybook types pass.
- The library suite passes 1,858 tests with one skip; Storybook passes 33 tests.
  [The full output](tests.log.gz) retains both suites. The final focused SDK/staging/
  resolver suite passes [14 tests](focused-final.log.gz).
- [SDK 57 workspace checking](workspace-check-final.log.gz) passes types and
  production iOS, Android and web exports. All three [runtime source maps](workspace-runtime-maps.json)
  contain Crumbs runtime modules and exclude compiler/Effect dependencies.
- [Physical peer roots](workspace-peer-roots.json) verify one React 19.2.8 package
  per platform, one native RN 0.86.3 renderer on iOS/Android, and one React DOM /
  React Native Web renderer on web. Shared Storybook demo sources use these app
  peers. TypeScript maps native types to the app; Expo's `tsconfigPaths` rewriting
  is disabled so those type-only paths do not replace Metro's platform aliases.
- `bun run playground:packed --sdk=56 --check` passes npm installation without peer overrides,
  types and all three exports. The [SDK 56 receipt](sdk56/installed-versions.json)
  retains the 56.0.4 / 0.85.3 / 19.2.3 standalone regression fixture.
- `bun run playground:packed --check` independently passes the same checks for
  the default SDK 57 app. Both retained install locks also pass explicit
  `npm ci --strict-peer-deps --dry-run --ignore-scripts` validation
  ([SDK 56](sdk56-strict-lock.log.gz), [SDK 57](sdk57-strict-lock.log.gz)); this check
  resolves the locked graphs without executing a second install. [Its versions](sdk57/installed-versions.json), manifests,
  compressed npm lockfiles and runtime receipts are retained for both consumers.
  CI explicitly retains the SDK 56 command alongside SDK 57 workspace and packed
  qualification. No force or legacy-peer installation override is used.
- The docs site [builds 34 pages](docs-build.log.gz).

## Expo validation boundary

[Workspace Doctor](expo-doctor.log.gz) passes 20 of 21 checks and reports the
intentionally different React/RN development dependencies reached through the
linked library. This warning is retained. [Standalone SDK 57 Doctor](sdk57-doctor.log.gz)
passes all 21 checks, without excluding duplicate-dependency validation.

The [dependency check](expo-install-check-final.log.gz) preserves qualified React /
React DOM 19.2.8 through two explicit `expo.install.exclude` entries. The SDK 57
blank template recommends 19.2.3; the previously qualified patch pins satisfy the
current CLI's optional peers under strict npm installation. Other package checks
remain active. The original [template-pin warning](expo-install-check.log.gz)
is retained. This exercise does not qualify a custom native development build or
its autolinking across the mixed-SDK workspace.

## Native SDK 57 smoke checks

Both platforms use the official Expo Go 57.0.9 clients, with [URLs, downloaded
hashes and installed iOS version](native-client-identity.json) retained.

On the dedicated iPhone 17 / iOS 26.4 simulator, [native delivered taps](ios-observations.json)
advance the generated and independent-control callbacks from 0 to 1. Literal ->
themed, light -> dark and blue -> red changes produce the same `#800000` card colour
on both implementations, retaining the callback counts and four factory calls.
The [before](ios-extensions-before.png) and [after](ios-extensions-after.png)
screenshots agree with the live native telemetry. All 11 journey navigation controls
become selected; their individual native snapshots are retained. This is journey
switching smoke coverage, not full acceptance of every journey's behaviour.

The original idb AX reader returned stale telemetry, causing the retained
[first probe](ios-probe.log.gz) and [scroll-responder diagnostic](ios-diagnostic-probe.log.gz)
to fail their assertions. The alternate `axbridge` guest reader exposes live state;
its enabled metadata is unavailable, rather than false. [The final probe](ios-final-probe.log.gz)
uses that backend and passes against the restored source. The temporary
`disableScrollViewPanResponder` diagnostic was removed; `App.tsx` remains identical
to the base commit. The archived scripts record this study's original paths and
UUID, rather than providing a portable test runner.

The owned Android API 36 AVD starts read-only. [ADB taps and uiautomator receipts](android-observations.json)
independently pass the same callbacks, factory/theme changes and 11 navigation
switches. [Before](android-extensions-before.png) and [after](android-extensions-after.png)
screenshots show the transition from zero counters and blue literal cards to
both counters at 1 and matching dark-red themed cards.

## Cleanup and limits

The [owned iOS simulator was removed](native-ownership.json), the read-only Android
session stopped, its port reverse removed and test Metro stopped. Other booted
simulators and the unrelated offline Android target were preserved. Only this
slice's newly created dependency installs and [verified npm caches](npm-cache-cleanup.json)
were removed; consumer sources, locks, exports and tarballs remain. The unrelated
primary checkout's dirty files are [byte-identical](primary-preservation.json).

No library API, dependency, peer range or release-budget policy changes. Physical
acceptance, spoken screen readers, live HMR and release performance were not run;
M11.6 remains parked. Simulator/Expo Go checks do not establish those contexts.
