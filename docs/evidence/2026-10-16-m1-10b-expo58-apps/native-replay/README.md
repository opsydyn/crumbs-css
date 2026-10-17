# Native replay boundary

These are retained test fixtures for this owned 1080×2400 Android AVD, not product APIs or a new test framework. Build/client hashes, server events and screenshots establish the exact qualification inputs. Simulator/AVD names alone do not establish ownership; verify the retained identity before replay.

`maestro-owned.sh` pins the installed Maestro2.11 CLI, task-owned Android SDK and direct Dadb endpoint127.0.0.1:5581 (ADB emulator-5580). The endpoint bypasses discovery without restarting the shared ADB server. Its paths refer to the retained host scratch directory and should be reviewed before reuse.

Playground's body flow verifies theme, form, portal, factory action counters, scroll and measured containers. `RapidMotion.java` uses the installed real AndroidDriver API and live resource-id bounds to interrupt a running five-second transition before CLI settling can finish it. It records elapsed native input, cancellation, unmount with sibling intact and the state after the retired deadline. No app code or duration changed. Run with Java17 and the installed Maestro `lib/*` classpath against the verified owned emulator only.

Storybook Babel first used `storybook-search.yaml` and `storybook-search-select.yaml`, then `android-storybook-after-search.yaml` (successful full journey). Rust uses their combined `android-storybook-search-core.yaml`. Search avoids the initial clipped component tree row; exact case separates Dark/Light story rows from background DARK/LIGHT theme controls. The one search-field point is derived from the retained native hierarchy, x26..1054/y1021..1129. Action values both have twelve characters, so the final combined fixture clears twelve rather than the CLI default fifty. This changes test input cost only.

`controlled-rtl-entry.js` calls public I18nManager setup then requires the unchanged product entry. RTL qualification uses a fresh native launch followed by unchanged normal entries. Both platform preferences were restored to forceRTL:false; this controlled setup is not shipped as the app entry.

ATD originally disabled drawing. Early black screenshots establish hierarchy/event evidence only; later screenshots were captured with debug.hwui.drawing_enabled=1, normal animation scales and the real native clients. Swiftshader/ATD is functional emulator coverage, not physical GPU/FPS/Google-services acceptance.
