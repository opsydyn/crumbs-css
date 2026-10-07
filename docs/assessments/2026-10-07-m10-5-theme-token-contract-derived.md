# M10.5 contract-derived theme-token references and Expo/Storybook dogfood

**Result: the type-contract repair and web consumer dogfood pass; the candidate remains private evidence.** The token-only runtime now derives token value types from the actual domain-branded contract reference. It checks the token domain and resolved value against the target React Native property, without allowing a caller-supplied value generic.

## Type contract and behavior

The candidate API accepts `themeToken(vars.color.accent)` where `vars` comes from `createTokenContract`. `ThemeStyleToken<TDomain>` carries the token domain, `ResolvedTokenNativeStyle` preserves the corresponding value type, and `createTokenStyles<ViewStyle>()` uses the existing native property-domain map plus React Native's property type. The fixture proves color, length, opacity, and finite-enum use, and rejects seven unsafe or unsupported cases: raw variable names, legacy vanilla-extract refs, caller-selected generics, color/length cross-use, an enum outside the property type, and structured style objects.

Runtime resolution still checks contract ownership and missing values, validates token references without invoking accessors, and returns stable cached resolutions. The candidate shares the existing theme-store context so its hook works with the full `theme` provider across ESM and CJS. The API remains limited to flat primitive style maps and direct token references; it does not include conditional styles, recipes, component contracts, extensions, or Effect runtime imports.

## Candidate graph and consumer dogfood

Five fresh package builds produced identical ESM/CJS graphs of 13,631/13,821 bytes. Each format is one local artifact with `react` as its only external. These results are below the existing 17,271/17,641-byte comparison ceilings, which are not approved budgets for a candidate `theme/token` subpath. The existing `theme/core` artifact hashes still match the official current-source host report exactly at 64,549/65,408 bytes.

The temporary Storybook component consumes color and length refs through `useTokenStyles` under the app's existing `TokenThemeProvider`. Storybook typecheck passes, all 23 Storybook tests pass, and Expo 56.0.23 exports the web app through Metro with the dogfood component included. The bundle is 2,490,484 bytes with SHA-256 `060dca16879941cec4a233ab9654df8efd26c24dd040739f2ea25846a7681e69`. This qualifies consumer compilation and web bundling only; it does not show a running browser session, native rendering, Hermes performance, or device behavior.

The full CSS package suite passes with 1,515 passed, one Node-22-only skip, zero failed, and 115,642 assertions. Package typecheck, packed export/declaration checks, focused runtime tests, and provider interoperability also pass.

## Adoption boundary

The official M10.5 host result remains **11 pass, nine fail, and one incomplete**. The four initialization metrics, warm transform, and four existing theme graph metrics remain open, and the Expo/Metro baseline mismatch remains incomplete. The candidate's graph comparison does not change those results or create an admitted budget for `theme/token`. No production source, public package export, dependency, approved budget, baseline, or enforcement rule changed. Native rendering, physical-device work, and spoken accessibility acceptance remain not-run/deferred as previously recorded.

Keep the encoded patch private until a separate package-surface/adoption review decides whether the additive subpath belongs in the shipping API. The exact candidate patch, measurements, Expo bundle receipt, and qualification record are in the [evidence packet](../evidence/2026-10-07-m10-5-theme-token-contract-derived/README.md).

**Next recommended roadmap item: M10.5 — review public-surface admission for the contract-derived token-only API against the unchanged host gate.** Keep all limits fixed; decide whether to adopt `theme/token` as an additive opt-in subpath or keep the candidate parked. Do not interpret comparison ceilings as approved performance budgets.
