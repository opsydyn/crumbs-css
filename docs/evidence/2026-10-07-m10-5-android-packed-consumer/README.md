# M10.5 Android packed Expo consumer

**Result:** the contract-derived token-style screen rendered on Android and completed a light → dark → light theme round trip on 2026-10-07.

## Target and provenance

- Dedicated AVD: `crumbs_m105_api36`, serial `emulator-5558`, model `sdk_gphone64_arm64`, Android 16 / API 36, 1080 × 1920 at 420 dpi.
- Expo Go: 56.0.4. Consumer runtime: Expo 56.0.23, React 19.2.3, React Native 0.85.3.
- Packed dependency: `@opsydyn/crumbs-css@0.1.1-alpha.1`.
- The temporary consumer's identity marker says `09bcf90 (working tree)`: it was packed immediately before commit `26ee91a`, not rebuilt from that commit. Its entire `apps/playground/src` tree matches the current worktree. The packed and current `packages/css/dist/theme.cjs` files have the same SHA-256 (`72d311a5a86b93ee5c2fdf99f0fe4898317762e4d2a7d6aa189dbc46eb373a02`). This is source-parity evidence for the exercised consumer, not an exact-HEAD repack of the whole package.
- A fresh package build was attempted during this slice but could not start: the pre-existing `packages/css/node_modules/tsdown` link resolves to a missing `tsdown/index.js`. No dependency tree was changed. The Android app itself bundled successfully in Metro (`724` modules).

## Journey and evidence

The `Token styles` control opened the `Contract-derived token styles` panel (`crumbs-theme-token-panel`). The accessibility hierarchy reported the expected light-theme text, then dark-theme text after switching, then light-theme text after restoring the original mode. The three screenshots and their matching UI hierarchy captures are retained beside this file. `SHA256SUMS.txt` records their digests.

Maestro 2.11.0 was attempted, but its Android device discovery did not recognize the online `emulator-5558` serial and the explicit-device run reported that it was not connected. The same focused journey therefore used direct ADB commands scoped to `emulator-5558`, with `uiautomator` hierarchy checks and screenshots. No other emulator or physical device was targeted.

## Qualification boundary

This confirms native Android rendering for the staged packed Expo Go consumer and token-style light/dark behavior. It does not establish an exact-HEAD package repack, installed standalone-app behavior, TalkBack acceptance, visual-diff qualification, Hermes performance, host-budget qualification, or physical-device acceptance. The protected iOS Simulator was not touched; physical-device work remains deferred.

The prior host-budget result predates the admitted `theme/token` entry and is not current-source qualification. M10.5 remains open for the final current-source host-budget gate with all approved selectors and thresholds unchanged.
