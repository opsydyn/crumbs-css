# M11 Container Conditions Dogfood Assessment

Date: 2026-09-30
Source revision: f7836dc
Decision: **Park container-condition implementation pending a demonstrated consumer need.**

## Question

Does the internal Expo reference system contain a component whose intended layout must change with its own parent width, independently of the app window width?

## Evidence reviewed

- `apps/storybook/src/components/ShowcaseScreen.tsx` places its sections in one vertical stack inside a screen-level ScrollView. The reference content is not currently arranged into independently sized panes.
- ReferenceSystem and PrimitiveGallery use stacked sections. PrimitiveCard places a demo in a preview region, but the current showcase does not give that region a separate width contract.
- Existing narrow-space handling is fluid: `ShowcaseCard.metaRow`, gallery action rows, and tabs wrap; selection rows wrap; table cells divide their available width with `flex: 1`.
- The two-column TableDemo is the closest candidate for a narrow-parent case. It is currently shown inside the full-width gallery preview, and no required change from columns to stacked rows is specified or observed.
- M6 native conditions currently derive width buckets from window-level dimensions. AppThemeProvider supplies `useWindowDimensions()` to the condition store, and the finite buckets use the 600 and 840 point thresholds. The Storybook reference has no container-owned measurement or condition consumer.

## Finding and limit

The inspected Expo dogfood surface provides no reproducible case where a shared component has two independent parent widths under the same window and needs different authored styles. A comparison table embedded in a future side pane is a plausible scenario, but it is hypothetical; the current source does not establish that flex sizing or wrapping fails.

This is a source-backed review, not a live native rendering study. No simulator/device run or screenshot was available for this assessment, so it does not qualify native layout behaviour.

## Disposition

Keep container conditions in M11's optional-extension backlog. Reopen only when an internal or adopter-owned example shows the same component in independently constrained parents and demonstrates a meaningful layout failure that cannot be expressed clearly with existing flex, wrapping, composition, or component variants.

If that evidence appears, first specify explicit container ownership and nested-container semantics. Convert measured dimensions to finite buckets before they enter condition snapshots or cache keys; publish only on bucket changes; clean up subscriptions on unmount; and test measurement timing, layout/resize loops, nested owners, and update cost. No API or runtime implementation is approved by this assessment.

## Next recommended M11 check

Evaluate the existing standalone token-variable convenience proposal against a real per-instance override in the reference app. M3 already supplies token contracts, optional-fallback semantics, and scopes, so the test must show what `createVar` / assignment convenience unlocks beyond those APIs before any public surface is added.
