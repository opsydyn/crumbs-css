# Native Storybook acceptance

`android-reference-preview.yaml` exercises the `Design System/Reference Patterns / Interactive` story used by M10.5.3.

Start the reference Storybook server from the repository root:

```sh
bun run --filter @crumbs/storybook storybook:native:reference
```

With an Android emulator attached, run the flow from a second terminal:

```sh
mkdir -p /tmp/crumbs-android-storybook
maestro test \
  --device emulator-5554 \
  --format JUNIT \
  --test-output-dir /tmp/crumbs-android-storybook \
  -e STORYBOOK_URL=exp://10.0.2.2:8090 \
  apps/storybook/e2e/android-reference-preview.yaml
```

The emulator reaches the host Metro server through `10.0.2.2`. The flow opens Expo Go, selects light mode, presses **Save changes**, switches back to dark mode, and confirms the action status persists. Its left-edge tap point for **Light** avoids the Expo Go developer launcher bubble, which otherwise overlaps the middle of that control on this emulator. The interaction remains text-targeted.

The flow verifies visible text discovery and interaction only. It does not qualify TalkBack traversal, screen-reader announcements, physical-device behavior, screenshot diffs, or release performance. The retained M10.5.3 run is in `docs/evidence/2026-10-01-m10-5-3-android/`.

## Story browsing, controls and actions (M10.5)

The development app uses Storybook's supported `LiteUI` with `liteMode: true`. This keeps browsing, Controls and Actions available without the default UI's Reanimated/bottom-sheet initialisation. `@legendapp/list` is declared directly because this app deliberately disables hierarchical Metro lookup. The reference-only command remains available.

Start `bun run app:storybook`, open its Expo URL, then run:

```sh
maestro --device <simulator-uuid> test \
  -e STORYBOOK_APP_ID=host.exp.Exponent \
  --test-output-dir /tmp/crumbs-storybook-ui-ios \
  apps/storybook/e2e/native-storybook-ui.yaml
```

On Android, use its emulator ID and `STORYBOOK_APP_ID=host.exp.exponent`. The app must already show its Storybook preview with both drawers closed. The flow selects ShowcaseCard, edits and restores its action label, verifies an `onActionPress` event, visits Light and Disabled, and returns to Dark. It records bounded screenshots; it does not establish exhaustive variant coverage, spoken screen-reader output or physical-device performance.

[Storybook documents the Lite UI Metro option](https://storybookjs.github.io/react-native/docs/intro/configuration/metro-configuration/#litemode).

## M9.3a native inspector

Start the development storybook server, then use an explicitly owned device:

```sh
maestro --device YOUR_DEVICE test apps/storybook/e2e/native-devtools.yaml \
  -e APP_ID=YOUR_INSTALLED_APP_ID -e APP_URL=YOUR_EXPO_URL \
  --format JUNIT --output /tmp/crumbs-storybook-devtools.xml
```

Expo Go SDK58 uses `host.exp.Exponent` on iOS and `host.exp.exponent` on Android.
Use loopback for iOS and `10.0.2.2` for Android. Existing custom clients must
include Expo Clipboard. The flow does not clear unrelated application data.
These are replay recipes; consult the [evidence](../../../docs/evidence/2026-10-18-m9-3a-native-devtools/README.md)
for which checks actually ran. A syntax check is not a live pass.

Run the companion `native-devtools-causes.yaml` with the same parameters to
assert scoped token and deterministic variant values. It leaves the override
capture open for the controlled edit/restore check below. Storybook permits
120 seconds for Expo Go startup; this is a harness download allowance, not a
widget performance threshold.

Also check each app's theme toggle, native back and
web Escape/focus. While a capture is open, change the fixture opacity from 0.8
to 0.7: Fast Refresh must mark it stale and disable Preview; Refresh must show
0.7. Restore the file and verify the same sequence back to 0.8.
The debug clipboard readback compares length plus FNV-1a checksum; it is a
functional probe, not a cryptographic integrity mechanism. Unit tests separately
assert exact equality of prepared text and the clipboard adapter argument.
Physical devices, spoken screen readers and independent user testing are separate.

### M9.3a qualification closure

After the causes flow, use `scripts/fixtures/m9-3a-native-refresh.yaml` with
`APP_ID` and `EXPECTED=0.7` after changing only the owned fixture's opacity0.8
literal. Restore the file and repeat with `EXPECTED=0.8`; then run
`scripts/fixtures/m9-3a-native-back.yaml` on Android. Run this app's
`native-devtools-updates.yaml` to verify subsequent variant and theme changes.
The comments in each recipe state its starting fixture state.

The [closure packet](../../../docs/evidence/2026-10-18-m9-3a-qualification-closure/README.md)
contains the native cost setup/restoration commands, platform receipts and limits.
Never package or commit while the temporary cost instrumentation is staged.
