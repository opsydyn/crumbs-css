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
