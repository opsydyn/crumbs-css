# Native playground acceptance — 2026-09-14

Status: **partial**. This slice supplies direct iOS simulator evidence; it does not complete M0.9 native acceptance.

Consumer: workspace `@opsydyn/crumbs-css@0.1.2-alpha.2`, revision `732ff76 (working tree)`, public `packages/css/dist/theme.cjs` entry. The pending package/release version bump was present during testing. Native host: official Expo Go 56.0.4, Expo SDK 56, dedicated iPhone 17 simulator on iOS 26.5 (23F77). The other project's booted iOS 26.4 simulator was left untouched. No standalone Crumbs native application build is claimed.

| Journey | Observed result | Evidence |
| --- | --- | --- |
| Startup / identity | Native app rendered the expected mode, package version and revision. | [Light list](list-light.png) |
| List / themes | Rows rendered in light and dark palettes; the toggle updated the controls and rows. | [Dark list](list-dark.png) |
| List / gestures | Two automated upward drags and a scroll request did not change the visible range, which stayed at rows 1–10. Scrolling remains unverified; these observations do not identify whether the cause is the automation path or application behavior. | Compare both list captures; manual or another native gesture path required. |
| Form / state | Typed `Acceptance Button`, enabled the switch, and changed the theme; both values and the derived summary remained visible. | [Form](form-light.png) |
| Software keyboard | The keyboard appeared; the input, switch and summary remained visible in this portrait layout. | [Keyboard](form-keyboard.png) |
| Nested scopes | Parent and nested cards had different palettes and inverted after changing the parent theme. | [Scopes](scopes-light.png), [opposite parent](portal-light.png) |
| Portal | Opened, closed and reopened after changing the parent theme. Its explicitly wrapped ThemeProvider used the nested palette in both modes. | [Dark portal](portal-dark.png), [light portal](portal-light.png) |

The portal overlays the upper header controls while open, with Close available. This is the current diagnostic fixture layout; no modal focus trapping, automatic portal context propagation, dismissal gestures or production dialog accessibility is asserted.

The observed Expo/Metro session bundled successfully and showed no runtime error overlay during these interactions. Native iOS development bundling reported 740 modules; that is not a runtime-isolation or bundle-size budget assertion. The screenshots are raw simulator captures; [result.json](result.json) records their SHA-256 hashes and results.

Android: `ANDROID_HOME` points to `~/Library/Android/sdk`, but neither `platform-tools/adb` nor `emulator/emulator` exists there, and adb was unavailable on PATH and in standard Homebrew locations. No Android acceptance was performed. Installing the Android toolchain is a separate prerequisite slice.

Still open: native gesture scrolling, Android journeys, physical-device acceptance, release startup/frame measurements, screen-reader navigation, dynamic text and other device sizes/orientations. The software-keyboard check was restored to its prior hidden state. The dedicated test simulator is retained for reuse, with test processes stopped after evidence capture.

Reproduce with `bun run playground`, boot the dedicated simulator, and open `exp://127.0.0.1:8091` there. The runner records the current working-tree identity, so compare it with this report before treating a rerun as equivalent.
