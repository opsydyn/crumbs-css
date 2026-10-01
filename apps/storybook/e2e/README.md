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
