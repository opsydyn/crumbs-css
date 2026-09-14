# Native scroll input investigation — 2026-09-14

Status: **input delivery diagnosed; native swipe acceptance pending**.

Workspace consumer: Crumbs `0.1.2-alpha.2`, revision `7054ea4 (working tree)`, official Expo Go 56.0.4 on the dedicated iPhone 17 / iOS 26.5 simulator. The original playground list layout and Crumbs compiler were unchanged.

The screenshot coordinate path was calibrated by tapping the theme control at `(230, 240)`, which changed the palette. A development-only native probe was then enabled with `EXPO_PUBLIC_CRUMBS_SCROLL_PROBE=true`. It reads actual FlatList touch, drag, layout, viewability and scroll callbacks; no programmatic scrolling was substituted for a gesture.

| Native measurement | Initial | After two automated drags |
| --- | --- | --- |
| Offset y | 0 | 0 |
| First half-visible row | 1 | 1 |
| Viewport height | 579 | 579 |
| Reported content height | 6,397 | 6,397 |
| Touch starts / ends | 0 / 0 | 2 / 2 |
| Touch move callbacks | 0 | 0 |
| Native drag starts | 0 | 0 |

The first drag used `(220, 800)` → `(220, 450)` in window screenshot coordinates. The second explicitly raised the Simulator window and used `(220, 800)` → `(220, 430)`. An intervening scroll-wheel request did not change the probe. [Retained native capture](gesture-delivery-gap.png) shows the final result. Content height is the FlatList's current reported extent, not a measurement of all 1,000 rows.

The automation path delivered touch starts/ends but no native drag or movement. There is scrollable content beyond the viewport. These results explain why prior attempts supplied no scroll acceptance evidence; they do not demonstrate a Crumbs layout defect or prove that another input path will scroll correctly.

The probe is guarded by both `__DEV__` and the opt-in environment variable. It is off by default. When enabled it updates React state during input, so it must not be used for frame-time or rendering performance measurements. Stable `crumbs-scroll-probe` and `crumbs-component-list` test IDs support a native runner. No runtime package dependency was added.

Production guard verification: the iOS consumer was launched with Expo `--no-dev --minify` and the opt-in flag still set to `true`; [the native screen](production-probe-hidden.png) showed no probe. Typechecking and production iOS/Android/web exports passed with the same flag. The web production bundle contains no probe text/test ID after the explicit render-time development guard. Native Hermes bundles still retain the diagnostic strings; the UI and event handlers are runtime-disabled there, not asserted to be fully stripped. No standalone release or physical-device check is claimed.

Next acceptance contract: reset to offset 0 / first row 1; deliver a native upward swipe; require a native drag start, positive offset and a later visible row; toggle the theme and require position preservation; deliver a reverse swipe and require a smaller offset/earlier visible row. Repeat the flow to establish reproducibility. The native runner choice is pending user input because the computer-use instructions require an explicit choice before another UI automation technology can be used.

The earlier [partial iOS report](../2026-09-14-ios/README.md) remains valid. Android, physical-device behavior, release performance budgets and screen-reader navigation remain unqualified.
