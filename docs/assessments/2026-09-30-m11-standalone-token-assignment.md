# M11 Standalone Token Assignment Dogfood Assessment

Date: 2026-09-30
Source revision: `120e688`
Decision: **Park standalone/local token-assignment API work pending a concrete consumer case.**
Confidence: Moderate for the internal Expo reference app; adopter demand is unknown.

## Question

Does the reference app contain a component that needs an instance-owned, domain-checked token value which cannot be expressed clearly with M3 semantic theme scopes or the existing finite component recipe states?

## Evidence reviewed

- `apps/storybook/src/styles/theme.ts` defines a typed token contract and complete base theme, then sparse brand, mode, contrast, and density layers.
- `apps/storybook/src/components/AppThemeProvider.tsx` composes the complete theme with brand, mode, and density scopes. `ReferenceSystem.tsx` locally reapplies brand and mode to show the same components under a partner brand. `ReferenceDialog.tsx` explicitly reapplies the needed brand scope across its portal boundary. These are shared subtree variations, not per-instance scalar token assignments.
- `ShowcaseCard.tsx`, `ReferenceButton.tsx`, `ReferenceTextField.tsx`, and `ReferenceSelections.tsx` model pressed, disabled, focused, invalid, and selected states with finite recipe selections. Their behavior and content are carried by component props and state.
- A source search of `apps/storybook/src` found no use of `createVar`, `fallbackVar`, `assignVars`, or a local-token assignment equivalent.
- M3's public `TokenThemeScopeProvider` accepts one of the fixed `brand`, `mode`, or `density` axes. Snapshot and patch helpers validate sparse layers against the token contract; `packages/css/test/token-theme-contexts.property.test.ts` covers precedence, rebasing, invalid-domain rejection, and alias protection.

## Finding and limit

The internal example has no demonstrated need for arbitrary instance-local token assignment. M3 scopes already express the shared theme changes the app uses, and finite component states are represented as recipe variants.

There is a boundary in the current capability: fixed semantic scopes are not a general local-variable mechanism. That boundary alone is not evidence that consumers need another API. Reusing the `brand` axis for a one-off component value would make the API less understandable, while adding standalone convenience names without a consumer case would expand the public surface without demonstrated progress.

This is a source-level dogfood review. It does not establish adopter demand, runtime allocation or render cost, or native-device behavior. No performance claim is made.

## Disposition

Keep native equivalents for `createVar`, `fallbackVar`, `assignVars`, and dynamic local assignment parked in M11. Reopen when a real reference or adopter component needs an instance-owned typed token value and the current semantic scopes or finite variants are a semantic or usability mismatch. At that point, name the component, token domain, update frequency, ownership/lifetime, and expected style-resolution cost before designing the API. High-frequency motion remains the responsibility of a supported animation system.

## Next roadmap slice

Assess the M11 motion-adapter item against a concrete interaction in the reference app. The Node v22.0.0 host-budget gate remains the final M10.5 gate, and Android remains parked.
