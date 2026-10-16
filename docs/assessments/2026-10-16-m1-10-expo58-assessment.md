# M1.10 — Expo SDK 58 impact assessment and upgrade design

Date: 2026-10-16. Status: assessed; implementation proposed, not started.

## Decision and scope

Qualify SDK 58 as an additive compatibility update, retaining SDK 56/57 and all existing Crumbs APIs. First qualify a packed consumer, then promote the two internal apps, then prepare an independently qualified release. Keep optional Rust-worker integration and variable-font authoring expansion outside this compatibility batch. This document is also the design brief for the [implementation plan](../superpowers/plans/2026-10-16-m1-10-expo58-upgrade.md).

The current task authorises assessment and planning only. No product dependency, app, compiler, peer range, native project or release changes have been made. The prior M10.5 reproduction commit is still local and ahead of origin; unrelated untracked native and workflow files remain untouched.

## Verified target and current checkout

Public npm metadata confirms Expo **58.0.11**, blank template **58.0.20**, React **19.3.0**, and RN **0.88.0**. These are the observed stable candidate pins, not a promise that a moving latest tag will retain them. Expo's published metadata requires Node `^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0`; RN declares `^22.13.0 || ^24.3.0 || >= 26.0.0`. The installed genuine Node **24.15.0** satisfies both. Verify exact registry/template versions again at execution and retain the installed lockfile. Sources: [Expo manifest](https://registry.npmjs.org/expo/58.0.11), [template](https://registry.npmjs.org/expo-template-blank/58.0.20), [RN manifest](https://registry.npmjs.org/react-native/0.88.0).

| Area | Current checkout | SDK 58 effect |
| --- | --- | --- |
| Library | Crumbs 1.1.1; RN peer `>=0.85 <0.87`; React peer `>=19 <20`; Node >=22.0.0 | RN 0.88 is outside the declared contract. React 19.3 fits the current React peer; runtime/type support is still untested. |
| Internal apps | Both Expo 57.0.27 / RN 0.86.3 / React 19.2.8 | Both need coordinated app peer upgrades. Keep the library's SDK 56 development baseline initially. |
| Metro | Locked Expo wrapper 56.0.2 / core 0.84.5, despite the Expo SDK 57 app version | SDK 58 wrapper 58.0.0 pins core/cache/worker 0.87.1. Test physical resolution and invalidation; do not infer the version from the SDK label. |
| Candidate runner | SDK 57 path, log labels, receipt slice and Node predicate hard-coded | Make SDK selection explicit while preserving the existing SDK 57 command and pinned profile. |
| Native environment | Node 24.15.0, Bun 1.4.2, Xcode 26.5 | Existing host meets the documented minimum Xcode 26.4; iOS 27/Device Hub acceptance is separate and unperformed. |
| Docs | COMPATIBILITY.md still says internal apps remain SDK 56 | Correct current-state text while retaining historical versioned evidence. |

[Checkout and registry receipts](../evidence/2026-10-16-m1-10-expo58-assessment/README.md). [SDK technical matrix](https://docs.expo.dev/versions/v58.0.0/) lists Android compile SDK 37, target 36, iOS >=16.4 and Xcode >=26.4. No Android SDK 37 installation was verified in this assessment.

## Current-contract probes

The existing SDK qualification and Expo contract tests pass: **16 tests, 89 assertions, zero failures**. A read-only runner probe confirms RN 0.88 is rejected by the current peer range and `--sdk=58` is unknown. The SDK 57 Node predicate also accepts Node 23, 24.0 and 25, which must not be reused unchanged for SDK 58. These checks validate the assessment prerequisites, not SDK 58 compatibility. [Probe and test log](../evidence/2026-10-16-m1-10-expo58-assessment/README.md).

## Impact ranked by risk

1. **Metro custom-worker chain and dependency invalidation — high.** Crumbs sets `transformerPath`, saves Expo's upstream worker and depends on result-key/cache-store bridges plus private server graph/change hooks in `packages/css/src/metro-plugin.ts`. SDK 58's supervising worker dispatches the custom worker and remaps Metro requires to Expo's versions. Confirm compilation still runs exactly once, normal files retain Expo processing, and edits to imported `.css.ts`/theme/runtime-factory dependencies invalidate cached importers. Test creation, deletion and restoration of resolution candidates too. Successful exports alone do not prove live invalidation. Sources: [published wrapper](https://registry.npmjs.org/@expo%2fmetro/58.0.0), [pinned supervising worker](https://github.com/expo/expo/blob/800752bfaa06d46f724cfdd221da6c1fb8453087/packages/%40expo/metro-config/src/transform-worker/supervising-transform-worker.ts).

2. **Strict public TypeScript surface — high.** RN 0.87+ defaults to the Strict TypeScript API. A source scan finds no Crumbs product imports from `react-native/Libraries/*`, `InteractionManager`, or `NativeMethods`, which reduces direct migration work. It does not prove compatibility: mapped View/Text/Image style types, Animated's exported type namespace, event/ref types, emitted declarations and third-party Storybook components need compilation against RN 0.88. Retain strict mode; do not adopt the legacy deep-import condition as the support strategy. Source: [RN Strict API guide](https://reactnative.dev/docs/strict-typescript-api).

3. **Storybook native dependency cohort — high for the app, not a core Crumbs dependency requirement.** SDK 58's bundled modules select Gesture Handler ~3.3.0, Reanimated 4.7.1, Worklets 0.13.0, safe-area-context ~5.10.1, DateTimePicker 9.2.1 and Slider 5.2.1. Gesture Handler crosses a major version. Upgrade and test Controls/Actions, sheets, portals and gestures together; do not bump every RN Primitives/Storybook package blindly. Record any upstream peer blocker rather than forcing installation. Source: [SDK 58 bundled modules](https://github.com/expo/expo/blob/800752bfaa06d46f724cfdd221da6c1fb8453087/packages/expo/bundledNativeModules.json).

4. **Runtime resize, environment and RTL semantics — medium.** Exercise live container/layout changes, theme hooks, motion cancellation and RTL. Expo changes `NODE_ENV` selection and environment-value cache identity; Storybook also uses `expo-localization` configuration. Verify actual dev/prod output, diagnostics, debug IDs, public environment updates and I18nManager-driven RTL. Scene-based iOS builds require freshly generated owned native projects; preserve existing untracked iOS data. Source: [SDK 58 changes](https://expo.dev/changelog/sdk-58).

5. **New typography capability — bounded gap, not automatic support.** RN 0.88 adds object-valued `fontVariationSettings`; Crumbs has no explicit entry for it in its closed structured-property protocol. Test whether its RN-mapped authoring types accidentally admit a value the compiler cannot serialize. Either qualify exact native support with dedicated structured-IR tests or keep that field explicitly unsupported with actionable guidance. The recommended compatibility scope is the latter; no implicit expansion of M11.4 token algebra. Existing supported typography must keep working. Source: [SDK 58 RN summary](https://expo.dev/changelog/sdk-58).

## Performance boundary — M10.5

Expo's experimental `experiments.noxcturnalTransformWorker` targets the Babel stage, excludes custom transform workers from activation, and has file-level Babel fallbacks. Crumbs is a custom transform worker with an additional Vanilla Extract/esbuild/evaluation pipeline. Therefore Expo's reported speedups cannot be credited to Crumbs or treated as fixing the measured 1.69× historical warm regression. Even a future successful ordinary-module fast path would not by itself remove Crumbs compilation. Source: [upstream implementation proposal](https://github.com/expo/expo/pull/48443).

Keep the experiment off for the supported baseline. Record flag-on behavior as fallback, explicit unsupported failure, or proven interoperability; never allow raw `.css.ts` execution or bypass of Crumbs. A complete Noxcturnal integration is a separate M10.5 decision after the actual SDK 58 chain is traced. Compare SDK 57 and 58 cold builds, warm transforms and dependency edits in matched environments; do not overwrite historical baselines or conflate Metro and direct compiler timings. The [2026-10-12 reproduction](2026-10-12-m10-5-consumer-compiler-reproduction.md) and its unresolved consumer 2.5× report remain authoritative for that scope.

## Alternatives and recommendation

- **Recommended: compatibility first, then apps, then release.** Isolates the library contract from third-party UI upgrades and retains rollback at each commit. Three coherent slices below, not a long series of approval-only microsteps.
- **Upgrade both apps and broaden peers immediately.** Faster initial dependency edit, but workspace aliases and cached installs can mask packed-consumer failures; reject this approach.
- **Combine SDK support, compiler redesign, Rust-worker adoption and font algebra.** Greater scope and unclear causal evidence; defer those optional features.

## Constraints and acceptance

- Preserve SDK 56 / RN 0.85 and SDK 57 / RN 0.86, existing imports, emitted payload versions and runtime APIs.
- Qualify SDK 58 / RN 0.88 as an explicit additional line. Proposed RN peer after success: `>=0.85 <0.87 || >=0.88 <0.89`. Do not imply untested RN 0.87 support. Teach the qualification helper to evaluate these bounded intervals; reject prereleases and unbounded clauses.
- Preserve SDK 57 candidate CLI/default behavior; add explicit `--sdk=58`. Keep all CI invocations explicit and pinned. Preserve `--sdk=56` installed-mode behavior and add an explicit SDK 57 retention path when app defaults move to 58.
- No `--force`, `--legacy-peer-deps`, workspace links in installed consumers or global native/simulator cleanup. Record exact tarball, installed hashes, app peers and effective Metro worker paths.
- Keep strict RN types enabled. New RN props are supported only if the compiler/runtime contract supports them; unsupported structured fields must not be silently dropped.
- SDK 58 baseline uses the default Babel path. Optional Rust, Expo UI native modifier adapters, hinge APIs, agent-CLI adoption and SwiftPM migration are outside this batch.
- Functional export, host type/runtime, actual simulator/emulator, browser interaction and physical/release-FPS proof remain distinct. Physical hardware/spoken readers remain deferred. SDK 58 development builds are preferred while Expo Go availability catches up.
- Release preparation requires fresh exact-source CI and unchanged release gates. Prior v1/v1.1 exceptions do not authorise the next release. A failed performance gate needs remediation or a new explicit, artifact-specific disposition; no automatic waiver.

## Numbered roadmap and delivery

- **M1.10a — Library and isolated SDK 58 qualification.** Parameterize the existing runner, add the pinned candidate, reproduce strict-peer rejection, make only evidenced API-preserving compatibility repairs, and qualify the same packed artifact against SDK 56/57/58, default worker and live invalidation. Commit once the slice is coherent.
- **M1.10b — Playground and Storybook SDK 58.** Promote both apps together, align React/native/worklets peers, retain old installed profiles, qualify platform exports and actual iOS/Android development-client interactions. Commit after the complete app slice.
- **M1.10c — Documentation, skill and release preparation.** Update truthful compatibility/DX guidance, exact-source CI, three-SDK artifacts and candidate release review. Recommend 1.2.0 if the registry/source release state remains compatible. Publication requires explicit authorisation and a fresh passing gate or new explicit disposition. Commit this slice and recommend the next action.

The task now is planning. Recommended next executable slice is **M1.10a**. Optional compiler optimisation remains **M10.5**, rather than an implicit prerequisite to writing the compatibility patch.
