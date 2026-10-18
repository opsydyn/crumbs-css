# Crumbs Expo playground

This public-API consumer complements Storybook. Both apps use Expo 58.0.14 / RN 0.88.0 / React 19.3.1. Use Node `^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0`. The library retains SDK 56 development peers and independent installed SDK 56/57 profiles. The [isolated SDK profiles](upgrade/README.md) record exact pins; the candidate runner still defaults to SDK 57, so select `--sdk=58` explicitly for the new line.

From the repository root:

```sh
bun run playground --web
bun run playground --ios
bun run playground --android
bun run playground:check
bun run playground:packed --check
# Retain the supported SDK 56 regression consumer.
bun run playground:packed --sdk=56 --check
bun run playground:packed --sdk=57 --check
bun run playground:distribution --artifacts-only
bun run playground:distribution --prepare-only
bun run playground:distribution --check
bun run playground:distribution --m8-2-check
bun run playground:distribution --m8-3-check
bun run playground:published --version=1.2.0 --sdk=58 --check
bun run playground:sdk-candidate docs/evidence/YYYY-MM-DD-expo-sdk-candidate/qualification.json
```

Workspace mode resolves Crumbs' exported `dist` files. Its typecheck maps native types to the app's installed React Native package; Metro pins React and native/web renderer peers to the app, including shared Storybook demos. `experiments.tsconfigPaths: false` keeps these type-only paths out of Metro, which retains Expo's web alias. The runner builds first, watches library source, and restarts Metro after build-output changes to reload the Node compiler. App edits use normal Expo refresh. Ctrl-C stops both processes. Use port 8091; Storybook remains on 8090.

The focused `bun run measure:metro-incremental <output.json>` workload uses a dedicated playground entry to exercise warm Metro invalidation and record direct `.css.ts` edit-to-bundle latency. It checks compiled values after edits to plain tokens, nested `.css.ts` dependencies and shared workspace theme configuration, then restores every fixture. It also restarts Metro with `strictDiagnostics` changed while retaining the transform cache; the same edited style must switch from a compiled value to the expected diagnostic and back again. The retained M8.4 receipt records these outputs. This is functional invalidation evidence, not a device-performance qualification.

Expo Doctor reports the workspace's SDK 56 library development peers alongside the SDK 58 app peers; app-owned physical React/native/web resolution is checked separately. M1.10b retains 19/20 Playground and18/20 Storybook Doctor results, including Storybook's preexisting native-folder warning. Owned custom iOS/Android development builds pass under Babel and Rust. Export/Doctor checks alone do not qualify another app's native behavior.

The retained SDK 57 profile uses React / React DOM 19.2.8 for the current Expo CLI optional peer requirements, retaining strict npm installation. Expo's recommended template pins 19.2.3; the two explicit `expo.install.exclude` entries preserve the qualified patch versions without excluding other dependency checks.

Packed mode builds, runs `npm pack` against the working tree and installs the tarball into a new temporary app outside the monorepo. Published mode defaults to `alpha`, resolves the requested registry version or tag to one exact version and installs it into a separate temporary app. Neither mode links workspace Crumbs. Both default to the current SDK 58 app profile; explicit `--sdk=56`, `--sdk=57` or `--sdk=58` select pinned installed profiles. `--sdk=56` selects the retained SDK 56 dependencies and is valid only in packed/published modes. `--prepare-only` installs and prints the directory without launching. Keep the printed directory and its npm lockfile for reproducing feedback; delete it when finished. The separate packed-artifact directory and temporary npm cache can also be removed after use.

Packed design-system mode builds three separate tarballs for Crumbs, a token package and a component package, then installs those local artifacts into a standalone Expo app outside the monorepo. `--artifacts-only` prints the three artifact identities and hashes. `--prepare-only` keeps the staged app and artifacts and prints their paths. `--check` additionally typechecks the app, exports production JavaScript bundles and source maps for iOS and web, and verifies that both maps reference the installed packages without repository or authored `.css.ts` paths. The receipt is written to `docs/evidence/2026-09-26-m8-1-packed-design-system/qualification.json`. This is separate-package and bundle-provenance qualification; it does not claim device rendering, Android, accessibility or performance acceptance. The existing `playground:packed` mode still qualifies one Crumbs tarball with the full playground app.

The separate M8.2 `--m8-2-check` mode uses the same packed Expo baseline and
installs a second physical copy of the Crumbs tarball beneath the component
package. Its Node probe checks lazy theme reads across both copies, identified
contract compatibility, and one React instance resolved from the app, UI and
both Crumbs package roots. It also checks the versioned runtime boundaries,
generated native metadata, consumer typecheck, and iOS/web exports with source
maps. The result is kept separately at
`docs/evidence/2026-09-26-m8-2-compatibility-matrix/qualification.json`; it does
not modify or replace the M8.1 receipt. Android export and Android/device
acceptance remain parked, and the result does not claim native-device rendering,
startup, accessibility or performance.

The M8.3 `--m8-3-check` mode resolves every packed Crumbs export and its ESM,
CommonJS and declaration target, audits each runtime dependency graph, then
exports isolated production Expo surfaces for iOS and web: ordinary runtime,
the focused `tokens/schema/value` decoder, and the full `tokens/schema`
positive control. It verifies packed-source maps and the raw JavaScript
`external-token-theme` canary pair. A dirty-source run writes interim evidence
under its temporary build directory; the clean-source result is retained at
`docs/evidence/2026-09-26-m8-3-runtime-resolution/qualification.json` and
qualifies only the exact recorded package and app versions. The receipt marks
Android `not-run`; Android/device acceptance, physical-device acceptance and
publishing remain deferred.

The [nested SDK upgrade configuration](upgrade/README.md) is excluded from the monorepo workspaces and never changes the supported app implicitly. Its runner verifies npm's live `latest` and official blank-template versions, packs the current Crumbs source, and exercises npm resolution without peer overrides. A recorded `peer-blocked` result means the newest SDK remains unsupported and the isolation contract passed; it is not a successful consumer qualification.

On 2026-09-14, `alpha` resolved to `0.1.2-alpha.1` and bundled against this baseline. `latest` resolved to `0.1.0-alpha.1`, which requires React Native `>=0.83 <0.84`; `--version=latest` correctly failed dependency installation. No peer dependency override is applied. Registry tags can change; use an exact version to reproduce a previous run.

On 2026-09-15, `alpha` still resolved and installed as `0.1.2-alpha.1`, but the current playground failed typechecking because it now dogfoods composition and primitive-reference behavior added after that artifact. This is expected distribution-drift evidence until a compatible alpha is published; it is not a failure of tag resolution or installation.

The runner checks the installed package name, version and real entry path, records `.expo-consumer-identity.json`, and injects mode/version/revision into the app. A workspace revision explicitly represents a dirty working tree, not a release. Direct `expo start` without the runner can show an unrecorded identity. To reopen a staged app, run `EXPO_NO_METRO_WORKSPACE_ROOT=1 npm start` in its directory.

Try scrolling the 1,000-row list while toggling themes, editing the form and switch, and comparing parent and nested scopes. The portal explicitly wraps its content in the source ThemeProvider because the portal host renders outside the source context. This probes integration with an explicit theme bridge; it does not assert automatic context propagation.

The **Token styles** journey exercises the opt-in `@opsydyn/crumbs-css/theme/token` entrypoint from this independent consumer. Its card uses contract-derived color and length references; switch between light and dark themes to check the provider update and resolved native style values. The journey is functional consumer evidence, not a performance-budget or physical-device acceptance result.

`--check` typechecks, clears old export output and exports production JavaScript bundles with source maps for iOS, Android and web. It rejects compiler sources in those maps and requires each platform to contain the Crumbs theme runtime. Maps remain in `dist`; `.expo-runtime-bundles.json` records the inspected files. That does not verify device rendering, keyboard behavior, scrolling frame time, native startup, or accessibility. Record platform/device, package identity, journey and observed behavior with feedback. Use Expo's `run:ios` / `run:android` from the consumer directory for native builds; generated native projects and device acceptance remain separate qualification steps.

The [2026-09-14 iOS simulator acceptance report](../../docs/acceptance/2026-09-14-ios/README.md) retains direct evidence for startup, themes, form state, keyboard layout, scopes and explicitly bridged portals. The subsequent [Maestro native scroll report](../../docs/acceptance/2026-09-14-maestro/README.md) qualifies native swipes, theme position preservation and reverse scrolling. Android remains unverified; these are functional checks, not device performance qualification.

For native input diagnosis, run `EXPO_PUBLIC_CRUMBS_SCROLL_PROBE=true bun run playground`. The development-only probe shows native touch/drag counts, scroll offset, first half-visible row, viewport height and reported content height. Its state updates affect rendering; leave it disabled for performance measurements. The [scroll investigation](../../docs/acceptance/2026-09-14-scroll/README.md) records the earlier computer-use input-delivery gap. Run the [Maestro flows](e2e/README.md) for native gesture acceptance.


## Repeatable list lifecycle workloads

Open **Measure**, choose **Static list** or **Themed list** and **25**, **100** or **1,000 rows**, then press **Run 5 cycles**. Each cycle mounts a list with the light theme, rerenders it with the same theme identity, switches its local provider to dark and unmounts it. The static scenario uses a hoisted native StyleSheet; the themed scenario uses one `useThemedStyles` call over a stable module per list. Both use FlatList initial/batch size 10 and window size 5. A requested 250 ms dwell separates steps; scheduling and background-tab throttling can extend it.

Keep the app idle during the run. Scenario controls disable while active; navigating away discards an unfinished run and clears its pending timer. A new run gets a new identity/capture. On completion, copy the **Measurement JSON report**, also logged with `CRUMBS_WORKLOAD_REPORT`. Retain it with the exact package/source mode and the source/artifact hashes of the tested consumer. Direct Expo starts can contain stale/unrecorded revision metadata; use the runner and restart with a cleared Metro cache if an injected identity changes.

The report records each step, list/row layout-effect mount/unmount counts, and resolved-style object identity. An unchanged-theme rerender should reuse the themed object; switching theme should replace it. Static style references should remain stable. Missing/duplicate/out-of-order steps, impossible counts or unexpected reference outcomes do not become successful receipts. The completion status distinguishes a verified sequence from one needing review. Development Strict Mode can replay effects; inspect raw counts and record that setup rather than treating balanced effects as exactly one mount.

Virtualization means requested rows, mounted rows and visible rows differ. Balanced effect counts do **not** prove absence of memory leaks. Request-to-layout-effect times include JS scheduling and commit delay, not render CPU, native layout or visual readiness. React Profiler durations, when enabled, describe render work inside the list boundary; unmount timing is not profiled there. Production profiling may be disabled and is reported unavailable. Instrumentation itself adds work. These are functional lifecycle/memo probes, not release-device frame/memory benchmarks, scrolling acceptance or calibrated budgets. Native Android remains deferred until last.

[Retained web workload evidence](../../docs/assessments/2026-09-14-expo-list-workloads.md) separates actual web receipts, package/app checks and production JavaScript maps from native/device acceptance. Remaining M1.5 workloads cover recipe selection, nested scopes, orientation/font scaling and retained memory.

## SDK 58 optional Rust worker

Babel is the default. Start `CRUMBS_METRO_WORKER=rust bun run playground` to select the app's Expo experiment, then restart Metro after configuration changes. The canonical Expo preset preserves default eligibility; custom required transforms remain valid Babel fallback reasons. Actual eligible-file completion events establish Rust use; the flag or export alone does not. This retains the existing Crumbs compile phase and makes no speed claim. See the [Storybook/dev-client guide](../../docs/src/content/docs/how-to/use-storybook-and-expo-dev-client.mdx) for routing and native acceptance limits.

## M9.3a inspector dogfooding (source build)

In development, select the **Devtools** journey, then open **Crumbs**. Inspect a scoped card,
the deliberate opacity override and a recipe variant. Change the fixture, Refresh,
preview/copy a report and use **Verify copied report** to check the clipboard.
Missing metadata and target removal are deliberate negative cases.

The development adapter keeps widget/probe/clipboard imports out of production.
Expo Go SDK58 includes the clipboard module; existing custom clients need a
rebuild after adding it. See [native checks](e2e/README.md) and the
[M9.3a evidence](../../docs/evidence/2026-10-18-m9-3a-native-devtools/README.md)
for actual coverage and remaining gaps. This API is not in npm v1.2.0.
