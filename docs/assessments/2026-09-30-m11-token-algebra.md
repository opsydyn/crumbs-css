# M11 Token Algebra Dogfood Assessment

Date: 2026-09-30
Source revision: `b77030c`
Decision: **Park additional color and typography derivation operators pending a concrete consumer need.**
Confidence: Moderate for the internal reference theme; adopter demand is unknown.

## Question

Does the reference theme have repeated color or typography derivations whose authored values create a demonstrated maintenance or correctness problem that a typed native expression would solve?

## Evidence reviewed

- `apps/storybook/src/styles/theme.ts` defines a typed contract with color, length, radius, and spacing tokens. It explicitly authors two brands, dark/light surface layers, four brand/mode accent and accent-text pairs, and one shared more-contrast palette. `modeScopeFor` composes these existing layers.
- `apps/storybook/test/ReferenceTheme.axes.test.ts` asserts exact selected accent, canvas, density, and more-contrast values. No `createNativeExpression` or equivalent expression use was found under `apps/storybook/src`.
- `packages/css/src/expressions/index.ts` already supports typed numeric add/subtract, scale, and clamp, plus finite condition matches. A match can select same-domain color values, but the additive/scalar operators exclude the color domain. Color expression literals are currently checked as non-empty strings; the expression domains have no composite typography domain or color-space model.
- The Storybook contrast review computes ratios for opaque six-digit sRGB values and labels alpha-composited pairs unknown. Its test deliberately records six normal-contrast failures involving copy, muted, and accent on `accentMuted` in Foundry light and Signal dark. The higher-contrast palette reaches its declared 7:1 review target for known opaque pairs. The M10.3 record states that this source review is not WCAG conformance evidence and makes no overall conformance claim.

## Finding and limit

The internal palette is small and finite, and its brand-specific values are authored explicitly. The current axes and tests make the selected combinations reviewable; this source review found no repeated derivation task or reported authoring cost. A generic `mix`, `lighten`, or `darken` operation would not by itself choose a readable foreground for every surface, preserve brand intent, or resolve the six existing failures. Those failures are a concrete palette issue, but they do not demonstrate that a runtime expression operator is the right repair.

Typography derivation has no current reference consumer either. The reference font-scale example explicitly leaves scaling to React Native `Text`; it has no Crumbs-derived typography values, and the expression model has no typography value domain. Adopter demand and design-team authoring costs are unknown; this review does not establish either.

## Disposition

Keep M11 color/typography derivation operators parked. Address the known contrast pairs through explicit semantic palette values and the existing deterministic review. Reopen the operator proposal when a consumer demonstrates repeated, domain-specific derivations that cause material duplication or drift. Before implementation, specify color space, accepted input syntax, alpha handling, gamut/clamping and native output; for typography, define units and interaction with native font scaling. Keep any palette recommendation or theme-generation tool as a separate authoring/tooling decision unless a consumer shows it belongs in runtime expressions.

## Next roadmap slice

M10.5 visual/accessibility follow-up: correct the six reported normal-contrast pairs with deliberate palette values and rerun the existing deterministic review. Preserve the Node v22.0.0 host-budget gate as the final M10.5 gate; Android remains parked.
