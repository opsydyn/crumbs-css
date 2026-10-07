# M10.5 additive contract-derived token-style entry implementation

**Result: the reviewed `@opsydyn/crumbs-css/theme/token` subpath is implemented as an additive alpha API.** Existing entrypoints and host-budget selectors remain unchanged; no release or performance target is claimed.

## API and compatibility

The package export map now provides ESM, CommonJS, and declaration targets for `./theme/token`. Its public surface includes `ThemeProvider`, `useTokenStyles`, `resolveTokenStyles`, `createTokenStyles`, and `themeToken`. The style helper carries the domain inferred from `createTokenContract` into React Native property checks, so incompatible token domains and values are rejected at compile time. Runtime support stays intentionally narrow: flat style records with primitive values and direct token references.

The token provider shares the theme store used by `theme/core`; provider interoperability is covered for both ESM and CommonJS. The runtime source-map allowlist now recognises the explicit `theme-token` entry and the token-contract `identity` chunk observed in the packed consumer. `theme`, `theme/core`, and the default entrypoint keep their existing behavior. The package version remains `0.1.1-alpha.1`; the API has not been published.

## Verification

Build, package typecheck, playground typecheck, Storybook typecheck, and documentation build pass. The full test run reports 1,515 package tests passed, one expected exact-Node-22-only skip, and zero failures; all 23 Storybook tests pass. The targeted source-map contract test also passes after admitting the new entry and its observed identity chunk.

`bun run playground:packed --check` installs the packed tarball into a disposable Expo consumer, typechecks it, exports production bundles and source maps for iOS, Android, and web, and validates all three maps. The package identity resolves to `0.1.1-alpha.1`. The emitted `theme/token` ESM/CJS files are 13,631/13,821 bytes; those measurements and the older comparison ceilings are diagnostic only, not approved budgets.

The packed consumer was built and launched on the already-booted **Crumbs M105 Expo Consumer, iOS 26.5 Simulator**. Its “Token styles” journey rendered contract-derived color and length styles, and switching the app from light to dark updated the token-driven colors. Xcode reported four warnings, including a missing MetalToolchain search path, but the app build, install, launch, and interaction succeeded. This is functional software-simulator evidence, not a release-Hermes performance result. No other simulator was reset or booted, and the protected simulator was left untouched.

Android production export and source-map validation pass, but native Android rendering was not run because no Android SDK or `adb` executable was available in this environment. Physical-device acceptance remains deferred.

## M10.5 status

The previous 21-metric host report remains 11 pass, nine fail, and one incomplete, but its source digest predates this implementation; it is historical evidence, not a current-source qualification. No budget value, baseline, selector, or enforcement rule changed. M10.5 remains open. See the [public-surface review](2026-10-07-m10-5-theme-token-public-surface.md), [accepted runtime-budget policy](../decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md), and [roadmap](../roadmap.md).

**Next recommended numbered slice:** M10.5 — set up or locate an Android SDK/emulator and complete the packed consumer's native Android token-style journey. After that, rerun the final current-source host-budget gate with all approved selectors and limits unchanged; keep physical-device work deferred.
