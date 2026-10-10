# Crumbs consumer baseline, without the proposed reference skill

The complete sample is in `/private/tmp/crumbs-m19c-baseline`. It uses the supplied
`@opsydyn/crumbs-css` 1.1.0 `dist` artifact and package exports, not source imports.
The repository was not edited. Local dependency links point at existing files;
no dependencies were installed.

## Sample files

- `metro.config.js`: Expo default config wrapped with `/metro-plugin`.
- `theme.css.ts`: namespaced `createThemeContract` plus light/dark `createTheme`.
- `card.css.ts`: root/view and label/text slots, primary/secondary tone, static
  default padding, a finite runtime Sprinkles lookup plan and local accent plans.
- `ActionCard.tsx`: the exported component, wired to authored card definitions.
- `ActionCard.runtime.tsx`: full typed component implementation; forwards normal
  Pressable and Text props, including the Pressable style callback.
- `App.tsx`: ThemeProvider and two example cards.
- `reusable-card.css.ts`: type-only runtime namespace plus `defineExtension`
  with explicit `@example/action-card/runtime` import path and named factory.
- `factory-package/runtime.tsx`: reusable factory that supplies typed tone,
  padding and accent defaults to the complete ActionCard component.
- `factory-package/package.json`: local demonstration of the named runtime
  export. Other files in this folder are links to the canonical sample sources.
- `verify.cjs`: compiler smoke check, writing exact generated code to `compiled/`.
- `tsconfig.json`: strict consumer checking.

## Why the sample is structured this way

Native props are used throughout: Pressable's `style`, Text's `style` and
explicit typed tone choices. Experienced vanilla-extract users can retain the
stylesheet shape, but browser selectors, pseudo classes, cascade and className
are not part of this native interface. Sprinkles authoring runs in `.css.ts`;
components select the generated finite plan through the runtime resolver.

Each accent creates an immutable local assignment snapshot. The component
applies its resolved local plans after the selected recipe only when an accent
is supplied, and forwards the caller's native styles last. With no accent, the
recipe resolves against the current ThemeProvider. The shared theme is never
patched or mutated. Removing the accent restores the themed recipe.

The reusable factory transports ordinary scalar configuration. The compiler
emits an explicit named import and reconstructs the wrapper once on module
evaluation. Its component delegates to the complete ActionCard feature.
Library authors would publish the wrapper, component and canonical stylesheet
within the same package and emit its public declarations. This sample links a
temporary package to illustrate and verify linkage; it is not a published team
package.

## Checks and outcomes

- Strict TypeScript: passed using TypeScript 6.0.3 against the supplied exported
  declarations, React 19.2.3 types and existing React Native 0.85.3 declarations.
- Production `ios` compiler transforms with `useStyleSheet: false`: passed for
  `theme.css.ts`, `card.css.ts` and `reusable-card.css.ts` using Node 24.15.0.
- Generated factory code explicitly imports `createActionCard` from
  `@example/action-card/runtime`, freezes the ordinary defaults and exports its
  checked function result.
- No Metro launch, Expo SDK 57 execution, Hermes/native rendering, device test,
  package publish or release verification was performed.

## Baseline traps encountered and corrected

1. The domain-token `token` export is a namespace (`token.color()`,
   `token.length()`), not a callable `token(kind)` function. Strict checking
   identified this before the final sample.
2. Exporting `createTokenContract`/`createTokenTheme` results from the requested
   `theme.css.ts` failed `CRUMBS_CSS_UNSUPPORTED_EXPORT` at
   `darkTheme.contract` for symbol-keyed data. The final file uses the README's
   legacy stylesheet contract. Its shape is typed; leaf values admit string or
   number and do not carry the domain guarantees of the token-contract API.
   Moving domain-token contracts to an ordinary `.ts` file is the likely
   alternative, but that alternative was not qualified in this bounded sample.
3. `defineExtension().factory` accepted a relative import path at the type
   level, but compilation rejected `./ActionCard.runtime` with
   `extension.invalid-config`: an explicit named package path is required.
4. Passing the authored `componentRecipe` object as a factory argument failed
   `extension.invalid-argument` at `args[0]["card"]["base"]["root"]` for symbol
   fields. The final factory accepts plain tone/padding/accent defaults and
   owns the ActionCard implementation and stylesheet.

## Limits that remain unestablished

The README states Expo SDK 57/RN 0.86 support; this sample used the existing RN
0.85.3 type dependency and an `ios` compiler pass only. Native visual behaviour,
touch handling, accessibility, HMR and release performance are not established
by these checks. The team factory package's distribution and peer-dependency
configuration need checking when it becomes a real published library.
