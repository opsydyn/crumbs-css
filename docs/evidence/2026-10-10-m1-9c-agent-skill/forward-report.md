# Crumbs consumer forward test

The consumer request is supported by the supplied 1.1.0 package for SDK 57 / RN 0.86 with React 19, subject to its actual installed versions. The generated example files were retained in `/private/tmp/crumbs-m19c-forward`, outside this evidence directory. The portable canonical example is `.agents/skills/crumbs-css/references/design-system.md`. Node must be at least 22.13 for SDK 57. Preserve the application's existing Expo-compatible dependencies and Metro customisations.

## Necessary structural changes

- Replace the requested `theme.css.ts` with ordinary `theme.ts`. Identified `createTokenContract` / `createTokenTheme` need their runtime metadata preserved. The legacy `.css.ts` `createThemeContract` / `createTheme` API is supported, but the domain-aware public token fallback used here needs the typed contract.
- The recipe owns typed `root` (view) and `label` (text) slots plus the public primary/secondary tone. The local accent lives in a separate scalar `viewStyle`; local variables cannot be embedded in the recipe or Sprinkles.
- Add a provider at the application boundary; `App.tsx` shows this explicitly. The absence of an accent creates an empty complete assignment snapshot and restores the current theme accent. Each instance resolves its own immutable assignment; it does not mutate the theme.
- `ActionCardProps` preserves normal `PressableProps` except children, which are represented by the required label. It supports `onPress`, disabled, testID, accessibility props, and both normal and callback `style`. `labelStyle` provides a normal Text style override. Overrides come last. Imports use `./card.css`, with runtime subpaths rather than the package root.

## Complete files

- `metro.config.js`: wraps Expo's config with `/metro-plugin` `withNativeStyles`. This is the conventional CommonJS Expo config; the temporary package.json's ESM setting is only for the host check harness. If the real app uses ESM package mode, retain its established Metro configuration format rather than copying the harness package.json.
- `theme.ts`: identified typed contract and complete immutable theme.
- `card.css.ts`: contracted two-slot recipe, finite token padding lookup plan, local colour variable and typed same-domain fallback.
- `ActionCard.tsx`: stable explicit style maps, memoised recipe/Sprinkles resolvers and assignments, native pressed-state feedback and normal props.
- `App.tsx`: owning TokenThemeProvider and two independent cards.

## Reusable factory outline

`runtime.tsx`, `authoring.ts`, `other-team.css.ts` and `OtherScreen.tsx` form the complete source outline. `runtime.tsx` exports a named synchronous `createActionCard` factory. It wraps the ordinary component, which owns the recipe, plan, local variable, and its Hooks. Factory arguments are plain finite configuration data (tone/compact defaults), so no local plans or variables cross the extension boundary.

`authoring.ts` uses a type-only runtime namespace and `defineExtension<typeof Runtime>().factory({importPath: '@acme/ui/runtime', importName: 'createActionCard'})`. The other team creates `SecondaryCard` at stylesheet module scope and imports it directly in React. Props and the argument tuple come from the named runtime function. The returned component still needs the owning theme provider.

`library-package.example.json` shows the required real package exports. Publish actual implementation and declarations at those targets. Build the library's runtime graph as pure ESM, including the component/style assets; ensure internal emitted imports resolve and the export targets exist. This test has not built or published that illustrative library. TypeScript path aliases in the check harness establish types only; they are not proof of Metro extension linkage. Do not substitute relative importPath, a generic/overloaded/default/async factory, an arbitrary serialised closure, ambiguous platform siblings or mixed static ESM-to-CJS graphs. Custom Metro aliases/conditions need their own qualification.

## Requested variation

**CSS `@container`:** unsupported inside the recipe. Use `/theme/containers` definitions in ordinary TS, `useContainerLayout` + View.onLayout + ContainerProvider, then `useContainerValue` with exhaustive `unmeasured`, `narrow`, `wide` entries. `containers.ts` and `CardRegion.tsx` supply this concrete path. The measured width is independently constrained by the width prop; the selected compact prop cannot determine it. Definitions do not add compiler/recipe/Sprinkles conditions.

**CSS `@keyframes`:** unsupported. `motion.ts` defines stable named opacity/translation states with `/theme/motion` in ordinary TS; `AnimatedActionCard.tsx` uses `/theme/motion/native` `useNativeMotion` and an Animated.View. The application supplies explicit full/reduced motion, starting reduced until its accessibility source resolves. Motion remains outside `.css.ts`, recipes and Sprinkles. An animated transform replaces its whole field; keep unrelated static transforms on another wrapper.

**Hook-free theme update:** `applyTokenThemePatch` can compute a new immutable snapshot without Hooks. `hook-free.ts` demonstrates pure theme, recipe, Sprinkles and local resolution. This function does not publish an automatic React/UI update. The app must deliver the new snapshot as the provider's theme prop through a React update (a class owner can use setState if its owner must be hook-free), or explicitly pass newly resolved native styles as props. No public imperative mutation/store-publishing API is established here. Mutating the existing snapshot is unsupported and does not provide invalidation; the dependency resolver's notifications metric is not a React rendering claim.

**Expo 58 with peer checks disabled:** unsupported/unqualified by this reference. Disabling peer checks does not establish compatibility. Version 1.1.0 declares RN >=0.85 <0.87 and supports SDK 56/57. Establish the new SDK's actual RN/Metro/React versions and qualify its exact artifact/compiler/runtime before treating it as supported.

## Checks actually run

1. `node --version`: v24.15.0. Existing dependency versions: React 19.2.3, React Native 0.85.3, Crumbs 1.1.0; `tsc --version`: 6.0.3.
2. `/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/node_modules/.bin/tsc --project /private/tmp/crumbs-m19c-forward/tsconfig.json --noEmit`: passed. Checks the example, variation and factory source outline against the supplied dist declarations and existing RN types. `consumer-types.tsx` includes valid native callbacks and expected errors for an invalid tone and invented onActionPress prop.
3. `node --check /private/tmp/crumbs-m19c-forward/metro.config.js`: passed syntax only. The config was not loaded into Expo; Expo is not installed in this harness.
4. `node /private/tmp/crumbs-m19c-forward/transform-check.mjs`: passed using supplied published transformer exports, strict diagnostics, production iOS mode, plain output (useStyleSheet false). Output: `card.compiled.mjs`, 12,664 bytes. Initial isolated attempt failed because the harness lacked @vanilla-extract; reusing the existing dependency via a temporary symlink corrected it. No dependency was installed.
5. `node --check /private/tmp/crumbs-m19c-forward/card.compiled.mjs`: passed.
6. `node /private/tmp/crumbs-m19c-forward/checks.mjs`: passed pure host assertions for theme slot resolution, all four atomic padding sides, local accent assignment/reset and unchanged shared theme, new immutable token patch, container initial/zero/fractional boundary selection, and frozen motion definition admission. An initial assertion expected borderColor; observed compiler output uses canonical four physical border colour fields, so the assertion was corrected to check all four.

No repository edits, dependency installation, Metro app export, extension linkage build, native app build, device interaction, accessibility or performance acceptance, external lookup, registry check or publication was performed. The checks are source/declaration and host compiler/resolver evidence, not a fresh SDK 57 acceptance claim.

## Skill result

The skill supplied the structural corrections and combined consumer pattern directly. Its optional linked guides supplied concrete extension, container and motion details. No blocker in the skill prevented producing the requested bounded result. The broad vanilla-extract familiarity did not lead to unsupported CSS syntax or local variables in recipes/extensions. Package contents and declarations supplied the current API truth; older memory context was only checked to avoid inferring current implementation from prior approval.
