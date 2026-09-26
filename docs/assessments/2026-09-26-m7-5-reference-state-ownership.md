# M7.5 assessment: native reference state ownership

Date: 2026-09-26
Status: M7.5 implementation and source/runtime/type qualification complete. No device, screen-reader, or Android acceptance claimed.

`ShowcaseCard` now demonstrates an actionable React Native button. It is
explicitly accessible with a button role and action label. Its required
`onActionPress` callback belongs to the component's behavior layer; the recipe
resolver remains responsible only for selecting styles. The showcase screen
uses the callback to scroll to the live primitives gallery, and Storybook
stories use `storybook/test` spies.

## State contract

The public `ShowcaseCardAction` contract adds a `disabled` variant and advances
its owner identity version from 1 to 2. The component's single `disabled` prop
selects the disabled root and label styles and is passed to both `Pressable`
`disabled` and `accessibilityState.disabled`. The transient `pressed` value
continues to choose visual styles only. The public state map allows pressed and
idle selections while enabled, and idle only while disabled; its inferred
selection type rejects `disabled: true, pressed: true`.

A dedicated Disabled story and boolean control make the state available for
internal dogfooding. No behavior-library dependency or styling integration was
added; activation and native accessibility semantics remain owned by React
Native's `Pressable`.

## Evidence

- The runtime regression failed before the state constraint: the prohibited
  disabled-plus-pressed selection returned three root styles instead of the
  base-only result. After the constraint was added, the test verifies the
  fallback and diagnostic as well as enabled-pressed and valid-disabled style
  projections.
- `bun run --filter @crumbs/storybook test` — 1 test passed, 7 assertions.
- `bun run app:typecheck` — workspace package build and Expo Storybook typecheck passed; the app type fixture verifies the required callback, valid disabled selection, and prohibited disabled-plus-pressed selection.
- `bun run check` — package build and typecheck passed; 841 package tests across 136 files passed, along with the Storybook regression.
- `bun run docs:build` — passed; 20 documentation pages built.

## Limits

This qualifies authored contract behavior, resolver fallback, app typing, and
package checks. It does not establish native rendering or screen-reader
behavior on a device. Android remains parked for the final native acceptance
step.
