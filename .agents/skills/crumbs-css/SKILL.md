---
name: crumbs-css
description: Use when an Expo or React Native app uses @opsydyn/crumbs-css, or when adding or debugging its Metro setup, typed themes, component recipes, Sprinkles, local variables, native adapters or runtime extensions.
---

# Crumbs CSS

Build consumer apps and design systems with the installed public API. This reference targets published **1.1.0**; check the app's lockfile and installed export map before using it for another version. Preserve the app's architecture and requested scope.

## Setup and imports

1. Inspect the app's Expo, React Native and Crumbs versions and existing Metro config. Version 1.1.0 supports SDK 56 / RN 0.85 and SDK 57 / RN 0.86, with React 19. Crumbs tooling needs Node >=22; SDK 57 needs >=22.13. Use Expo-compatible dependencies; establish a new SDK's support before widening peers or bypassing installation checks.
2. Wrap the existing Expo config with `withNativeStyles` from `/metro-plugin`, preserving its other customisations. Restart Metro after configuration changes. Applications need no Effect import, service or runner.
3. Put native style authoring in `.css.ts`; import its compiled exports via `./card.css`. Use specific runtime entries in components. The package root is not a universal React runtime entry.

All suffixes below follow `@opsydyn/crumbs-css`:

| Need | Authoring | Runtime |
| --- | --- | --- |
| Primitive styles | `/style`: `viewStyle`, `textStyle`, `imageStyle` | Literal output directly; themed output via `/theme/core` |
| Typed tokens | `/tokens`: contracts and themes in ordinary `.ts` | `/theme`: `TokenThemeProvider`, scopes |
| Slots / variants | `/style`: `componentRecipe`, `recipe` | `/theme/recipes`: resolvers after theme resolution |
| Atomic utilities | `/style`: `defineProperties`, `createSprinkles`, lookup plans | `/theme/sprinkles`: `createSprinklesResolver` |
| Instance scalars | `/style`: `createVar`, `fallbackVar` | `/theme/vars`: `assignVars`, `useAssignedStyles` |

Read [the design-system example](references/design-system.md) when combining these APIs or selecting an extension strategy. For optional features, consult the linked guides there; use the [complete API index](https://opsydyn.github.io/crumbs-css/reference/package-entrypoints-and-apis/) for exact exports.

## Native boundaries and common mistakes

- Literal styles need no provider. Token-bearing styles need the owning theme and runtime resolution. Pass explicit style/recipe/plan maps to Hooks; keep handles, constants and factory results outside those maps.
- Identified typed contracts and themes retain metadata: keep `createTokenContract` / `createTokenTheme` exports in ordinary `.ts`. The legacy `createThemeContract` / `createTheme` `.css.ts` pattern remains supported.
- Keep local variables in separate scalar primitive styles, resolved with `/theme/vars`. They cannot be embedded in recipes, Sprinkles, conditions, expressions or extension arguments. A theme fallback needs a public typed same-domain token.
- Keep definitions and maps stable; memoise resolvers by resolved descriptor and assignments by their inputs. Resolver caches are bounded. Spread readonly style arrays at the React Native prop boundary when necessary.
- Model interaction through native props/state (`Pressable.onPress`, pressed/disabled callbacks). Browser selectors, cascade, globals, CSS media queries and keyframes have no native implementation here.
- A type check validates authoring types; a Metro export checks compilation. Neither proves native interaction, accessibility or device performance. Report the checks actually run.
