<p align="center">
  <img src="https://raw.githubusercontent.com/opsydyn/crumbs-css/main/crumbs-css-header.png" alt="Crumbs CSS" width="100%" />
</p>

# Crumbs CSS v1

Typed React Native styling for Expo and design systems, with a vanilla-extract-shaped authoring API.
Crumbs compiles `.css.ts` files into native styles at Metro transform time. Compose styles, typed component
recipes and atomic utilities; add themes, scoped design tokens, conditions, motion and reusable runtime
factories through explicit package entrypoints.

**Crumbs CSS v1 is available on [npm](https://www.npmjs.com/package/@opsydyn/crumbs-css) and [GitHub](https://github.com/opsydyn/crumbs-css/releases).**
Version `1.1.1` refreshes the package documentation and links the repository consumer agent skill. Its JavaScript, declarations, exports and dependencies are byte-identical to `1.1.0`, which qualified Expo SDK 57 / React Native 0.86 alongside SDK 56 / React Native 0.85.
See [release status](docs/releases/1.1.1.md) and [verification evidence](docs/evidence/2026-10-10-m1-9d-docs-patch/README.md). The inherited [1.1.0 disposition](docs/releases/1.1.0.md) retains its recorded warm-transform failure; this documentation patch adds no new performance pass or numerical exception. Generic future-release limits remain unchanged.

## Get started

The published `1.1.1` supports **Expo SDK 56 / React Native 0.85** and **Expo SDK 57 / React Native 0.86**, with React 19.2. Node `>=22.0.0` is required
for Crumbs tooling; SDK 57 requires Node `>=22.13.0`. Peer ranges are React `>=19 <20`, React Native `>=0.85 <0.87` and Metro `>=0.83 <1`. TypeScript
`>=5.9 <7` is optional for source migration tooling. Effect 4 is Crumbs' implementation dependency; applications
do not need an Effect import, service or runner.

Install the stable package into your Expo app:

```sh
npm install @opsydyn/crumbs-css@1.1.1
# or
bun add @opsydyn/crumbs-css@1.1.1
```

Wrap Expo's Metro configuration:

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config")
const { withNativeStyles } = require("@opsydyn/crumbs-css/metro-plugin")
module.exports = withNativeStyles(getDefaultConfig(__dirname))
```

Author a typed native style:

```ts
// card.css.ts
import { textStyle, viewStyle } from "@opsydyn/crumbs-css/style"

export const card = viewStyle({ padding: 16, borderRadius: 12, backgroundColor: "#16324f" })
export const title = textStyle({ color: "white", fontSize: 18, fontWeight: "700" })
```

Use the compiled exports directly:

```tsx
// Card.tsx
import { Text, View } from "react-native"
import * as styles from "./card.css"

export function Card() {
  return <View style={styles.card}><Text style={styles.title}>Crumbs CSS</Text></View>
}
```

Restart Metro after changing its configuration. Literal styles need no provider; token-bearing styles use
`ThemeProvider` and the resolution Hooks from `/theme/core`. Import authoring APIs in `.css.ts` files and runtime
APIs in components. Prefer the specific entry you use so optional tooling stays outside the native runtime graph.

### Build from source (optional)

To build the immutable v1 source yourself:

```sh
git clone --branch v1.1.1 https://github.com/opsydyn/crumbs-css.git
cd crumbs-css
bun install --frozen-lockfile
bun run build
cd packages/css
npm pack --ignore-scripts
```

Install the resulting tarball into your Expo app. The source build and published artifact have their own
recorded qualification identities; the supported registry quickstart above uses the verified release.

## API map

| Need | Import suffix | APIs to start with |
| --- | --- | --- |
| Native style authoring | `/style` | `style`, `styleVariants`, `viewStyle`, `textStyle`, `imageStyle` |
| Component variants and typed slots | `/style`, `/theme/recipes` | `recipe`, `componentRecipe`, `componentRecipeFromRecipe`, `extendComponentRecipe`, `createRecipeResolver`, `createComponentRecipeResolver` |
| Atomic utility scales | `/style`, `/theme/sprinkles` | `defineProperties`, `createSprinkles`, `createSprinklesLookupPlan`, `createSprinklesResolver` |
| Theme contracts and React resolution | `/style`, `/theme/core` | `createThemeContract`, `createTheme`, `ThemeProvider`, `useThemedStyle`, `useThemedStyles`, `useThemeSelector` |
| Typed design tokens and scoped themes | `/tokens`, `/theme` | `token`, `alias`, `createTokenContract`, `createTokenTheme`, `applyTokenThemePatch`, `TokenThemeProvider`, `TokenThemeScopeProvider`, `useTokenTheme` |
| Token-only runtime styles | `/theme/token` | `themeToken`, `createTokenStyles`, `resolveTokenStyles`, `useTokenStyles` |
| Standalone variables and local assignment | `/style`, `/theme/vars` | `createVar`, `fallbackVar`, `assignVars`, `resolveAssignedStyles`, `useAssignedStyles` |
| Responsive and accessibility conditions | `/theme/conditions` | `createNativeConditionStore`, `createNativeConditionResolver`, `useNativeConditionSnapshot`, `traceNativeConditionBranches` |
| Named container conditions | `/theme/containers` | `defineContainer`, `useContainerLayout`, `ContainerProvider`, `useContainerValue`, `getContainerBucket`, `resolveContainerValue` |
| Native motion | `/theme/motion`, `/theme/motion/native` | `defineMotion`, `useNativeMotion` |
| Functional token expressions | `/theme/expressions` | `createNativeExpressionLiteral`, `createNativeExpressionTokenReference`, `createNativeExpressionAdd`, `createNativeExpressionClamp`, `createNativeExpressionMatch`, `evaluateNativeExpression`, `foldNativeExpression` |
| Immutable token lookup and codecs | `/tokens/optic`, `/tokens/schema`, `/tokens/schema/value` | `createTokenThemeFocus`, `externalTokenThemeCodec`, `decodeExternalTokenTheme`, `encodeExternalTokenTheme`, `decodeTokenValue` |
| Colour and typography algebra | `/tokens/algebra` | `createColor`, `mixColor`, `setColorAlpha`, `multiplyColorAlpha`, `toNativeColor`, `createTypography`, `scaleTypography`, `createTypographyScale`, `toNativeTypography` |
| Typed runtime factories | `/extensions` | `defineExtension`, `ExtensionError` |
| Design-system manifests | `/tooling/manifest` | `assembleManifest`, `projectTokenContract`, `projectComponentRecipe`, `compareManifests`, `checkManifestConsumers` |
| Policy and governance | `/tooling/policy`, `/tooling/ownership` | `checkDesignSystemPolicy`, `getBuiltInPolicyPreset`, `annotateDesignSystemReport` |
| DTCG import and source migrations | `/tooling/dtcg`, `/tooling/migrations` | `importDtcgTheme`, `planSourceMigration` |
| Explain styles | `/devtools` | `explainStyle`, `StyleExplanationInputError` |
| Metro integration and diagnostics | `/metro-plugin`, package root | `withNativeStyles`, `createNativeStylesCacheStore`, `NativeStylesDiagnosticCode`, `formatNativeStylesDiagnostic` |

See the [full API reference](https://opsydyn.github.io/crumbs-css/reference/package-entrypoints-and-apis/)
and the [complete export index below](#complete-public-api) for every value and type, including protocol constants,
validation helpers and compatibility aliases. Runtime resolvers expose bounded caches and explicit lifetime controls;
Sprinkles plans select from finite scales without enumerating a Cartesian product.

## Coding agents

Use the repository [Crumbs consumer skill](.agents/skills/crumbs-css/SKILL.md) for the published `1.1.1` APIs. It covers Expo/Metro setup, import selection, typed design systems and native runtime boundaries, with a checked ActionCard example. [Copy the complete skill into your app repository](docs/src/content/docs/how-to/use-agent-skill.mdx), then invoke it as `$crumbs-css` in Codex. The skill is maintained in Git; it is not included in the npm 1.1.1 tarball.

## Guides and architecture

- [Package quickstart](packages/css/README.md) and [compatibility matrix](packages/css/COMPATIBILITY.md).
- [Themed screens](docs/src/content/docs/tutorials/build-a-themed-screen.mdx) and [component recipes](docs/src/content/docs/tutorials/build-your-first-button-recipe.mdx).
- [Local variables](docs/src/content/docs/how-to/use-local-variables.mdx), [container conditions](docs/src/content/docs/how-to/use-container-conditions.mdx), [native motion](docs/src/content/docs/how-to/use-native-motion.mdx), [token algebra](docs/src/content/docs/how-to/use-token-algebra.mdx) and [runtime extensions](docs/src/content/docs/how-to/create-runtime-extensions.mdx).
- [Reference design-system architecture](docs/src/content/docs/how-to/build-a-reference-design-system.mdx), [decision records](docs/decisions/README.md) and [roadmap](docs/roadmap.md).
- [Expo playground](apps/playground/README.md), [Storybook](apps/storybook) and [docs workspace](docs/README.md).

Crumbs targets native styles and public React Native APIs. Browser cascade, selectors, global styles, CSS media
queries and keyframes are outside its scope. Container selection and motion are explicit native APIs. Compilation
reduces repeated static authoring work; it does not eliminate runtime theme, condition or component work. Retained
Simulator/emulator functional results do not establish physical-device, spoken-reader or release-FPS acceptance.

## Complete public API

This index lists every public runtime value and type-only export in the v1 declarations and JavaScript.
Import paths are relative to `@opsydyn/crumbs-css`; type-only exports use `import type`. Internal `dist` files
outside the export map are not public APIs.

<details>
<summary>All values and types by entrypoint</summary>

### `.`

**Values:** `NATIVE_RESPONSIVE_CONDITION_MATCHERS`, `NATIVE_RESPONSIVE_CONDITION_NAMES`,
`NativeExpressionEvaluationError`, `NativeExpressionProgramType`, `NativeExpressionProgramVersion`,
`NativeExpressionType`, `NativeExpressionVersion`, `NativeSprinklesLookupPlanType`,
`NativeSprinklesLookupPlanVersion`, `NativeStylesDiagnosticCode`, `NativeThemeTokenReferenceType`,
`createNativeExpressionAdd`, `createNativeExpressionAlias`, `createNativeExpressionClamp`,
`createNativeExpressionCompose`, `createNativeExpressionConditionReference`, `createNativeExpressionDomain`,
`createNativeExpressionFallback`, `createNativeExpressionLiteral`, `createNativeExpressionMatch`,
`createNativeExpressionProgram`, `createNativeExpressionRuntime`, `createNativeExpressionScale`,
`createNativeExpressionSubtract`, `createNativeExpressionTokenReference`, `createNativeMapValueFn`,
`createNativeNormalizeValueFn`, `createSprinkles`, `createSprinklesLookupPlan`, `createTheme`,
`createThemeContract`, `createThemeTokenReference`, `defineProperties`, `evaluateNativeExpression`,
`foldNativeExpression`, `formatNativeStylesDiagnostic`, `getThemeTokenPath`, `getThemeVarName`, `imageStyle`,
`isNativeExpression`, `isNativeExpressionProgram`, `isThemeTokenReference`, `isThemeVar`,
`mapNativeConditionValueToBranches`, `nativeExpressionDependencyKey`, `nativeExpressionDomainKey`, `recipe`,
`style`, `styleVariants`, `textStyle`, `viewStyle`, `withNativeStyles`.

**Type-only exports:** `NativeConditionDefinitions`, `NativeConditionKey`, `NativeConditionNameList`, `NativeConditionValue`,
`NativeConditionValueMapper`, `NativeConditionalRecord`, `NativeConditionalTuple`, `NativeConditionalValue`,
`NativeExpression`, `NativeExpressionAdd`, `NativeExpressionAlias`, `NativeExpressionClamp`,
`NativeExpressionColorDomain`, `NativeExpressionCompose`, `NativeExpressionConditionReference`,
`NativeExpressionDependency`, `NativeExpressionDomain`, `NativeExpressionDomainInput`,
`NativeExpressionDurationDomain`, `NativeExpressionEnumDomain`, `NativeExpressionEvaluationErrorCode`,
`NativeExpressionEvaluationState`, `NativeExpressionFallback`, `NativeExpressionLengthDomain`,
`NativeExpressionLiteral`, `NativeExpressionMatch`, `NativeExpressionMatchCase`,
`NativeExpressionMatchOptions`, `NativeExpressionNumberDomain`, `NativeExpressionOpacityDomain`,
`NativeExpressionProgram`, `NativeExpressionRuntime`, `NativeExpressionRuntimeStats`, `NativeExpressionScale`,
`NativeExpressionSubtract`, `NativeExpressionTokenReference`, `NativeExpressionValue`,
`NativeImageStyleInput`, `NativeMapValueFn`, `NativeNormalizeValueFn`, `NativeNormalizedConditionalValue`,
`NativeRecipe`, `NativeRecipeCompoundVariant`, `NativeRecipeConfig`, `NativeRecipeProps`,
`NativeRecipeSelection`, `NativeRecipeStyleInput`, `NativeRecipeVariants`, `NativeSprinkleDefinition`,
`NativeSprinklePropertyConfig`, `NativeSprinklePropertyKey`, `NativeSprinkleShorthandConfig`,
`NativeSprinkleStaticResult`, `NativeSprinklesConfig`, `NativeSprinklesLookupPlan`,
`NativeSprinklesSelection`, `NativeStyle`, `NativeStyleComposition`, `NativeStyleInput`, `NativeStyleRule`,
`NativeStyleVariants`, `NativeStylesDiagnosticCodeValue`, `NativeTextStyleInput`, `NativeTheme`,
`NativeThemeTokenReference`, `NativeThemeValue`, `NativeThemeVar`, `NativeViewStyleInput`, `ThemeContract`,
`ThemeContractInput`, `ThemeValues`.

### `./style`

**Values:** `NATIVE_RESPONSIVE_CONDITION_MATCHERS`, `NATIVE_RESPONSIVE_CONDITION_NAMES`,
`NativeComponentRecipeContractVersion`, `NativeComponentRecipeExtensionType`,
`NativeComponentRecipeExtensionVersion`, `NativeComponentRecipeType`, `NativeComponentRecipeVersion`,
`NativeExpressionEvaluationError`, `NativeExpressionProgramType`, `NativeExpressionProgramVersion`,
`NativeExpressionType`, `NativeExpressionVersion`, `NativeRecipeClassType`, `NativeRecipeType`,
`NativeSprinklesLookupPlanType`, `NativeSprinklesLookupPlanVersion`, `NativeThemeTokenReferenceType`,
`componentRecipe`, `componentRecipeFromRecipe`, `createNativeExpressionAdd`, `createNativeExpressionAlias`,
`createNativeExpressionClamp`, `createNativeExpressionCompose`, `createNativeExpressionConditionReference`,
`createNativeExpressionDomain`, `createNativeExpressionFallback`, `createNativeExpressionLiteral`,
`createNativeExpressionMatch`, `createNativeExpressionProgram`, `createNativeExpressionRuntime`,
`createNativeExpressionScale`, `createNativeExpressionSubtract`, `createNativeExpressionTokenReference`,
`createNativeMapValueFn`, `createNativeNormalizeValueFn`, `createSprinkles`, `createSprinklesLookupPlan`,
`createTheme`, `createThemeContract`, `createThemeTokenReference`, `createVar`, `defineProperties`,
`evaluateNativeExpression`, `extendComponentRecipe`, `fallbackVar`, `foldNativeExpression`,
`getThemeTokenPath`, `getThemeVarName`, `imageStyle`, `isNativeExpression`, `isNativeExpressionProgram`,
`isThemeTokenReference`, `isThemeVar`, `mapNativeConditionValueToBranches`, `nativeExpressionDependencyKey`,
`nativeExpressionDomainKey`, `recipe`, `style`, `styleVariants`, `textStyle`, `viewStyle`.

**Type-only exports:** `DomainThemeVar`, `LegacyNativeThemeVar`, `NativeComponentCompoundVariant`, `NativeComponentContract`,
`NativeComponentContractExtensionPoints`, `NativeComponentContractIdentity`, `NativeComponentPublicProps`,
`NativeComponentRecipe`, `NativeComponentRecipeConfig`, `NativeComponentRecipeExtensionConfig`,
`NativeComponentRecipeExtensionDescriptor`, `NativeComponentRecipeProps`, `NativeComponentResolvedStyles`,
`NativeComponentSlotKind`, `NativeComponentSlotStyleInput`, `NativeComponentSlotStyles`,
`NativeComponentSlots`, `NativeComponentStateVariants`, `NativeComponentVariantSelection`,
`NativeComponentVariantsConfig`, `NativeConditionDefinitions`, `NativeConditionKey`,
`NativeConditionNameList`, `NativeConditionValue`, `NativeConditionValueMapper`, `NativeConditionalRecord`,
`NativeConditionalTuple`, `NativeConditionalValue`, `NativeExpression`, `NativeExpressionAdd`,
`NativeExpressionAlias`, `NativeExpressionClamp`, `NativeExpressionColorDomain`, `NativeExpressionCompose`,
`NativeExpressionConditionReference`, `NativeExpressionDependency`, `NativeExpressionDomain`,
`NativeExpressionDomainInput`, `NativeExpressionDurationDomain`, `NativeExpressionEnumDomain`,
`NativeExpressionEvaluationErrorCode`, `NativeExpressionEvaluationState`, `NativeExpressionFallback`,
`NativeExpressionLengthDomain`, `NativeExpressionLiteral`, `NativeExpressionMatch`,
`NativeExpressionMatchCase`, `NativeExpressionMatchOptions`, `NativeExpressionNumberDomain`,
`NativeExpressionOpacityDomain`, `NativeExpressionProgram`, `NativeExpressionRuntime`,
`NativeExpressionRuntimeStats`, `NativeExpressionScale`, `NativeExpressionSubtract`,
`NativeExpressionTokenReference`, `NativeExpressionValue`, `NativeImageStyleInput`, `NativeMapValueFn`,
`NativeNormalizeValueFn`, `NativeNormalizedConditionalValue`, `NativeRecipe`, `NativeRecipeCompoundVariant`,
`NativeRecipeConfig`, `NativeRecipeProps`, `NativeRecipeSelection`, `NativeRecipeStyleInput`,
`NativeRecipeVariantSelection`, `NativeRecipeVariantValue`, `NativeRecipeVariants`,
`NativeRecipeVariantsConfig`, `NativeSprinkleDefinition`, `NativeSprinklePropertyConfig`,
`NativeSprinklePropertyKey`, `NativeSprinkleShorthandConfig`, `NativeSprinkleStaticResult`,
`NativeSprinklesConfig`, `NativeSprinklesLookupPlan`, `NativeSprinklesSelection`, `NativeStyle`,
`NativeStyleComposition`, `NativeStyleInput`, `NativeStyleRule`, `NativeStyleTokenDomainForProperty`,
`NativeStyleVariants`, `NativeTextStyleInput`, `NativeTheme`, `NativeThemeTokenReference`, `NativeThemeValue`,
`NativeThemeVar`, `NativeViewStyleInput`, `ThemeContract`, `ThemeContractInput`, `ThemeValues`, `ThemeVar`,
`TokenDomain`, `TokenDomainValue`.

### `./theme`

**Values:** `NATIVE_CONDITION_BREAKPOINTS`, `NATIVE_RESPONSIVE_CONDITION_MATCHERS`, `NATIVE_RESPONSIVE_CONDITION_NAMES`,
`NativeExpressionEvaluationError`, `NativeThemeTokenReferenceType`, `ThemeProvider`, `TokenThemeProvider`,
`TokenThemeScopeProvider`, `createComponentRecipeResolutionPlan`, `createComponentRecipeResolver`,
`createNativeConditionResolver`, `createNativeConditionStore`, `createNativeExpressionRuntime`,
`createNativeMapValueFn`, `createNativeNormalizeValueFn`, `createRecipeResolver`, `createSprinklesResolver`,
`createThemeDependencyPlan`, `createThemeDependencyResolver`, `createThemeTokenReference`,
`defaultNativeConditionSnapshot`, `evaluateNativeExpression`, `foldNativeExpression`, `isThemeTokenReference`,
`isTokenThemeCompatible`, `mapNativeConditionValueToBranches`, `nativeConditionSnapshotKey`,
`normalizeNativeConditionInput`, `resolveComponentRecipeResolutionPlan`, `resolveComponentRecipeStyles`,
`resolveRecipeStyle`, `resolveThemeStyles`, `resolveThemeTokens`, `useNativeConditionSnapshot`, `useTheme`,
`useThemeSelector`, `useThemedStyle`, `useThemedStyles`, `useTokenTheme`.

**Type-only exports:** `BoundedNativeComponentRecipeResolver`, `BoundedNativeRecipeResolver`, `BoundedNativeSprinklesResolver`,
`ComponentRecipeCompoundMatcher`, `ComponentRecipeInvalidVariantReporter`, `ComponentRecipeResolutionPlan`,
`ComponentRecipeResolutionVariant`, `ComponentRecipeResolverControls`, `ComponentRecipeResolverOptions`,
`NativeComponentRecipeResolver`, `NativeConditionBranch`, `NativeConditionDefinitions`,
`NativeConditionInput`, `NativeConditionMatcher`, `NativeConditionNameList`, `NativeConditionSnapshot`,
`NativeConditionSource`, `NativeConditionStore`, `NativeConditionStoreOptions`, `NativeConditionStoreStats`,
`NativeConditionValueMapper`, `NativeConditionalRecord`, `NativeConditionalTuple`, `NativeConditionalValue`,
`NativeContrastPreference`, `NativeDirection`, `NativeExpressionEvaluationErrorCode`,
`NativeExpressionEvaluationState`, `NativeExpressionRuntime`, `NativeExpressionRuntimeStats`,
`NativeFontScaleBucket`, `NativeHeightBucket`, `NativeMapValueFn`, `NativeMotionPreference`,
`NativeNormalizeValueFn`, `NativeNormalizedConditionalValue`, `NativeOrientation`, `NativePlatform`,
`NativeRecipeResolver`, `NativeSprinklesLookupPlan`, `NativeSprinklesResolutionPlan`,
`NativeSprinklesResolutionSelection`, `NativeSprinklesResolver`, `NativeSprinklesSelection`,
`NativeThemeTokenReference`, `NativeWidthBucket`, `RecipeCompoundMatcher`, `RecipeResolutionInput`,
`RecipeResolutionPlan`, `RecipeResolutionVariant`, `RecipeResolverCacheStats`, `RecipeResolverControls`,
`RecipeResolverOptions`, `ResolvedThemeStyles`, `SprinklesResolverControls`, `SprinklesResolverOptions`,
`ThemeDependencyPathSegment`, `ThemeDependencyPlan`, `ThemeDependencyPlanEntry`, `ThemeDependencyResolution`,
`ThemeDependencyResolutionMetrics`, `ThemeDependencyResolver`, `TokenThemeProviderProps`,
`TokenThemeScopeProviderProps`.

### `./theme/core`

**Values:** `NATIVE_CONDITION_BREAKPOINTS`, `NATIVE_RESPONSIVE_CONDITION_MATCHERS`, `NATIVE_RESPONSIVE_CONDITION_NAMES`,
`NativeThemeTokenReferenceType`, `ThemeProvider`, `createNativeConditionResolver`,
`createNativeConditionStore`, `createNativeMapValueFn`, `createNativeNormalizeValueFn`,
`createThemeTokenReference`, `defaultNativeConditionSnapshot`, `isThemeTokenReference`,
`mapNativeConditionValueToBranches`, `nativeConditionSnapshotKey`, `normalizeNativeConditionInput`,
`resolveThemeStyles`, `resolveThemeTokens`, `useNativeConditionSnapshot`, `useTheme`, `useThemeSelector`,
`useThemedStyle`, `useThemedStyles`.

**Type-only exports:** `NativeConditionBranch`, `NativeConditionDefinitions`, `NativeConditionInput`, `NativeConditionMatcher`,
`NativeConditionNameList`, `NativeConditionSnapshot`, `NativeConditionSource`, `NativeConditionStore`,
`NativeConditionStoreOptions`, `NativeConditionStoreStats`, `NativeConditionValueMapper`,
`NativeConditionalRecord`, `NativeConditionalTuple`, `NativeConditionalValue`, `NativeContrastPreference`,
`NativeDirection`, `NativeFontScaleBucket`, `NativeHeightBucket`, `NativeMapValueFn`,
`NativeMotionPreference`, `NativeNormalizeValueFn`, `NativeNormalizedConditionalValue`, `NativeOrientation`,
`NativePlatform`, `NativeThemeTokenReference`, `NativeWidthBucket`, `ResolvedThemeStyles`.

### `./theme/token`

**Values:** `ThemeProvider`, `createTokenStyles`, `resolveTokenStyles`, `themeToken`, `useTokenStyles`.

**Type-only exports:** `ResolvedTokenNativeStyle`, `ResolvedTokenStyleMap`, `ThemeStyleToken`.

### `./theme/conditions`

**Values:** `NATIVE_CONDITION_BREAKPOINTS`, `NATIVE_RESPONSIVE_CONDITION_MATCHERS`, `NATIVE_RESPONSIVE_CONDITION_NAMES`,
`createNativeConditionResolver`, `createNativeConditionStore`, `createNativeMapValueFn`,
`createNativeNormalizeValueFn`, `defaultNativeConditionSnapshot`, `mapNativeConditionValueToBranches`,
`nativeConditionSnapshotKey`, `normalizeNativeConditionInput`, `traceNativeConditionBranches`,
`useNativeConditionSnapshot`.

**Type-only exports:** `NativeConditionBranch`, `NativeConditionBranchDecision`, `NativeConditionBranchTrace`,
`NativeConditionDefinitions`, `NativeConditionInput`, `NativeConditionMatcher`, `NativeConditionNameList`,
`NativeConditionSnapshot`, `NativeConditionSource`, `NativeConditionStore`, `NativeConditionStoreOptions`,
`NativeConditionStoreStats`, `NativeConditionValueMapper`, `NativeConditionalRecord`,
`NativeConditionalTuple`, `NativeConditionalValue`, `NativeContrastPreference`, `NativeDirection`,
`NativeFontScaleBucket`, `NativeHeightBucket`, `NativeMapValueFn`, `NativeMotionPreference`,
`NativeNormalizeValueFn`, `NativeNormalizedConditionalValue`, `NativeOrientation`, `NativePlatform`,
`NativeWidthBucket`.

### `./theme/expressions`

**Values:** `NativeExpressionEvaluationError`, `NativeExpressionProgramType`, `NativeExpressionProgramVersion`,
`NativeExpressionType`, `NativeExpressionVersion`, `createNativeExpressionAdd`, `createNativeExpressionAlias`,
`createNativeExpressionClamp`, `createNativeExpressionCompose`, `createNativeExpressionConditionReference`,
`createNativeExpressionDomain`, `createNativeExpressionFallback`, `createNativeExpressionLiteral`,
`createNativeExpressionMatch`, `createNativeExpressionProgram`, `createNativeExpressionRuntime`,
`createNativeExpressionScale`, `createNativeExpressionSubtract`, `createNativeExpressionTokenReference`,
`evaluateNativeExpression`, `evaluateNativeExpressionWithTrace`, `foldNativeExpression`, `isNativeExpression`,
`isNativeExpressionProgram`, `nativeExpressionDependencyKey`, `nativeExpressionDomainKey`.

**Type-only exports:** `NativeConditionKey`, `NativeConditionValue`, `NativeExpression`, `NativeExpressionAdd`,
`NativeExpressionAlias`, `NativeExpressionClamp`, `NativeExpressionColorDomain`, `NativeExpressionCompose`,
`NativeExpressionConditionReference`, `NativeExpressionDependency`, `NativeExpressionDomain`,
`NativeExpressionDomainInput`, `NativeExpressionDurationDomain`, `NativeExpressionEnumDomain`,
`NativeExpressionEvaluationErrorCode`, `NativeExpressionEvaluationState`, `NativeExpressionFallback`,
`NativeExpressionLengthDomain`, `NativeExpressionLiteral`, `NativeExpressionMatch`,
`NativeExpressionMatchCase`, `NativeExpressionMatchOptions`, `NativeExpressionMatchTrace`,
`NativeExpressionNumberDomain`, `NativeExpressionOpacityDomain`, `NativeExpressionProgram`,
`NativeExpressionRuntime`, `NativeExpressionRuntimeStats`, `NativeExpressionScale`,
`NativeExpressionSubtract`, `NativeExpressionTokenReference`, `NativeExpressionValue`.

### `./theme/recipes`

**Values:** `createComponentRecipeResolutionPlan`, `createComponentRecipeResolver`, `createRecipeResolver`,
`resolveComponentRecipeResolutionPlan`, `resolveComponentRecipeStyles`, `resolveRecipeStyle`.

**Type-only exports:** `BoundedNativeComponentRecipeResolver`, `BoundedNativeRecipeResolver`, `ComponentRecipeCompoundMatcher`,
`ComponentRecipeInvalidVariantReporter`, `ComponentRecipeResolutionPlan`, `ComponentRecipeResolutionVariant`,
`ComponentRecipeResolverControls`, `ComponentRecipeResolverOptions`, `NativeComponentRecipeResolver`,
`NativeRecipeResolver`, `RecipeCompoundMatcher`, `RecipeResolutionInput`, `RecipeResolutionPlan`,
`RecipeResolutionVariant`, `RecipeResolverCacheStats`, `RecipeResolverControls`, `RecipeResolverOptions`.

### `./theme/sprinkles`

**Values:** `createSprinklesResolver`.

**Type-only exports:** `BoundedNativeSprinklesResolver`, `NativeSprinklesLookupPlan`, `NativeSprinklesResolutionPlan`,
`NativeSprinklesResolutionSelection`, `NativeSprinklesResolver`, `NativeSprinklesSelection`,
`SprinklesResolverControls`, `SprinklesResolverOptions`.

### `./tokens`

**Values:** `TOKEN_THEME_CONTEXT_PRECEDENCE`, `TokenAliasDefinitionType`, `TokenDefinitionType`, `alias`,
`applyTokenThemePatch`, `createTokenContract`, `createTokenTheme`, `createTokenThemeFromExternalPayload`,
`createTokenThemeScope`, `createTokenThemeScopedSnapshot`, `createTokenThemeSnapshot`, `defineAlias`,
`defineToken`, `getTokenContractIdentity`, `getTokenContractKey`, `getTokenId`, `getTokenOrigin`,
`isTokenAliasDefinition`, `isTokenDefinition`, `isTokenDomainValue`, `token`.

**Type-only exports:** `DomainThemeVar`, `ExternalTokenThemePayload`, `ExternalTokenThemeResult`, `LegacyNativeThemeVar`,
`NativeThemeVar`, `PrivateDomainThemeVar`, `PublicDomainThemeVar`, `ThemeTokenOrigin`, `ThemeTokenOriginStep`,
`ThemeTokenVisibility`, `TokenAliasDefinition`, `TokenAliasTarget`, `TokenContract`, `TokenContractIdentity`,
`TokenContractIdentityInput`, `TokenContractInput`, `TokenContractOptions`, `TokenContractVisibility`,
`TokenContractVisibilityPath`, `TokenDefinition`, `TokenDefinitionInput`, `TokenDomain`,
`TokenDomainDefinition`, `TokenDomainValue`, `TokenThemeContextName`, `TokenThemeContexts`, `TokenThemeLayer`,
`TokenThemeOperationError`, `TokenThemePatchResult`, `TokenThemeSnapshotInput`, `TokenThemeValues`.

### `./tokens/optic`

**Values:** `createTokenThemeFocus`.

**Type-only exports:** `TokenThemeFocus`, `TokenThemeFocusResult`.

### `./tokens/schema`

**Values:** `decodeExternalTokenTheme`, `decodeTokenValue`, `encodeExternalTokenTheme`, `externalTokenThemeCodec`.

**Type-only exports:** `ExternalTokenTheme`.

### `./tokens/schema/value`

**Values:** `decodeTokenValue`.

**Type-only exports:** none.

### `./tooling/manifest`

**Values:** `DESIGN_SYSTEM_MANIFEST_FORMAT`, `DESIGN_SYSTEM_MANIFEST_VERSION`, `MANIFEST_COMPATIBILITY_REPORT_FORMAT`,
`MANIFEST_COMPATIBILITY_REPORT_VERSION`, `assembleManifest`, `checkManifestConsumers`, `compareManifests`,
`decodeManifest`, `decodeManifestCompatibilityReport`, `decodeManifestContractIdentity`,
`decodeManifestLifecycleAnnotation`, `decodeManifestSourceOrigin`, `decodeManifestUnresolvedReference`,
`encodeCanonicalManifest`, `encodeCanonicalManifestCompatibilityReport`, `projectComponentRecipe`,
`projectTokenContract`, `transformCssTsToStyleSheetWithManifestSidecar`.

**Type-only exports:** `CompilerManifestSidecar`, `ComponentRecipeRoot`, `DesignSystemManifest`, `ManifestAnalysisLimit`,
`ManifestAnalysisLimitCode`, `ManifestArtifact`, `ManifestAssemblyInput`, `ManifestCapability`,
`ManifestCompatibilityFinding`, `ManifestCompatibilityFindingCode`, `ManifestCompatibilityFindingLevel`,
`ManifestCompatibilityReport`, `ManifestCompatibilityReportMode`, `ManifestCompiler`, `ManifestComponent`,
`ManifestConsumerReference`, `ManifestContractIdentity`, `ManifestCoverageRoot`, `ManifestDependency`,
`ManifestLifecycle`, `ManifestLifecycleAnnotation`, `ManifestModule`, `ManifestPackage`, `ManifestProducer`,
`ManifestReportJson`, `ManifestSidecarPropertyOrigin`, `ManifestSourceOrigin`, `ManifestStateConstraint`,
`ManifestToken`, `ManifestTokenAlias`, `ManifestTokenDomain`, `ManifestUnresolvedReference`,
`TokenContractRoot`, `TransformCssTsManifestSidecarOptions`, `TransformCssTsOptions`,
`TransformCssTsWithManifestSidecarResult`.

### `./tooling/policy`

**Values:** `DESIGN_SYSTEM_POLICY_FORMAT`, `DESIGN_SYSTEM_POLICY_PRESET_VERSION`, `DESIGN_SYSTEM_POLICY_REPORT_FORMAT`,
`DESIGN_SYSTEM_POLICY_REPORT_VERSION`, `DESIGN_SYSTEM_POLICY_VERSION`, `POLICY_RULE_IDS`,
`checkDesignSystemPolicy`, `decodeDesignSystemPolicy`, `decodeDesignSystemPolicyReport`,
`decodePolicyEvaluationDate`, `decodePolicyMeasurements`, `encodeCanonicalDesignSystemPolicyReport`,
`getBuiltInPolicyPreset`.

**Type-only exports:** `BuiltInPolicyPreset`, `CheckDesignSystemPolicyInput`, `DesignSystemManifest`, `DesignSystemPolicy`,
`DesignSystemPolicyFinding`, `DesignSystemPolicyReport`, `PolicyAnalysisLimit`, `PolicyAnalysisLimitCode`,
`PolicyException`, `PolicyExceptionDiagnostic`, `PolicyFindingException`, `PolicyLevel`, `PolicyMeasurement`,
`PolicyOutputBudget`, `PolicyPresetIdentity`, `PolicyPresetName`, `PolicyPropertyScope`,
`PolicyProviderIdentity`, `PolicyReportJson`, `PolicyRuleId`, `PolicyTargetCapability`, `PolicyTargetProfile`,
`StyleExplanationMetadata`.

### `./tooling/migrations`

**Values:** `SOURCE_MIGRATION_DIAGNOSTIC_CODES`, `SOURCE_MIGRATION_FORMAT`, `SOURCE_MIGRATION_REPORT_FORMAT`,
`SOURCE_MIGRATION_REPORT_VERSION`, `SOURCE_MIGRATION_VERSION`, `decodeSourceMigration`,
`decodeSourceMigrationReport`, `encodeCanonicalSourceMigrationReport`, `planSourceMigration`.

**Type-only exports:** `SourceComponentMigration`, `SourceImportBinding`, `SourceMigration`, `SourceMigrationAnalysisLimit`,
`SourceMigrationDiagnostic`, `SourceMigrationDiagnosticCode`, `SourceMigrationFileReport`,
`SourceMigrationFileStatus`, `SourceMigrationPlan`, `SourceMigrationReport`, `SourceTokenMigration`.

### `./tooling/dtcg`

**Values:** `CRUMBS_DTCG_DIAGNOSTIC_CODES`, `CRUMBS_DTCG_FORMAT_PROFILE`, `CRUMBS_DTCG_IMPORT_FORMAT`,
`CRUMBS_DTCG_IMPORT_VERSION`, `CRUMBS_DTCG_METADATA_FORMAT`, `CRUMBS_DTCG_METADATA_VERSION`,
`CRUMBS_DTCG_RESOLVER_VERSIONS`, `importDtcgTheme`.

**Type-only exports:** `CrumbsDtcgDiagnostic`, `CrumbsDtcgDiagnosticCode`, `CrumbsDtcgImportRequest`, `CrumbsDtcgImportResult`,
`CrumbsDtcgResolverVersion`, `CrumbsDtcgThemeImport`, `DtcgGroupMetadata`, `DtcgImportSidecar`,
`DtcgJsonObject`, `DtcgJsonPrimitive`, `DtcgJsonValue`, `DtcgOperationResult`, `DtcgOrigin`,
`DtcgTokenMetadata`, `DtcgTokenProvenance`.

### `./tooling/ownership`

**Values:** `DESIGN_SYSTEM_OWNED_REPORT_FORMAT`, `DESIGN_SYSTEM_OWNED_REPORT_VERSION`, `DESIGN_SYSTEM_OWNERSHIP_FORMAT`,
`DESIGN_SYSTEM_OWNERSHIP_VERSION`, `OWNERSHIP_ANALYSIS_LIMIT_CODES`, `OWNERSHIP_MAX_REPORT_REFERENCES`,
`OWNERSHIP_UNRESOLVED_REASON_CODES`, `annotateDesignSystemReport`, `decodeDesignSystemOwnership`,
`decodeOwnedReport`, `encodeCanonicalOwnedReport`.

**Type-only exports:** `DesignSystemOwnership`, `OwnedReport`, `OwnershipAnalysisLimit`, `OwnershipAnalysisLimitCode`,
`OwnershipAssignment`, `OwnershipAttribution`, `OwnershipOwner`, `OwnershipUnresolvedReason`,
`SupportedSourceReport`.

### `./devtools`

**Values:** `STYLE_EXPLANATION_METADATA_TYPE`, `STYLE_EXPLANATION_REPORT_TYPE`, `STYLE_EXPLANATION_VALUE_TYPE`,
`STYLE_EXPLANATION_VERSION`, `StyleExplanationInputError`, `explainStyle`.

**Type-only exports:** `ExplainStyleInput`, `StyleExplanationBranchDecision`, `StyleExplanationBranchKind`,
`StyleExplanationBranchMetadata`, `StyleExplanationBranchReason`, `StyleExplanationChangedInput`,
`StyleExplanationConditionDecision`, `StyleExplanationCoverage`, `StyleExplanationCoverageReason`,
`StyleExplanationDeclaration`, `StyleExplanationExportMetadata`, `StyleExplanationExpressionDecision`,
`StyleExplanationInputErrorCode`, `StyleExplanationJsonValue`, `StyleExplanationMetadata`,
`StyleExplanationNegativeZero`, `StyleExplanationOpaqueReason`, `StyleExplanationOpaqueValue`,
`StyleExplanationPath`, `StyleExplanationPathSegment`, `StyleExplanationPropertyExplanation`,
`StyleExplanationReport`, `StyleExplanationSnapshot`, `StyleExplanationThemeToken`,
`StyleExplanationThemeTokenIdentity`, `StyleExplanationTransitionStatus`, `StyleExplanationUndefined`,
`StyleExplanationValue`, `StyleExplanationValueArray`, `StyleExplanationValueRecord`.

### `./metro-plugin`

**Values:** `createNativeStylesCacheStore`, `withNativeStyles`.

**Type-only exports:** none.

### `./dist/transformer`

**Values:** `buildStyleSheetCode`, `getCacheKey`, `transform`, `transformCssTsToStyleSheet`,
`transformCssTsToStyleSheetWithManifestSidecar`.

**Type-only exports:** `TransformCssTsManifestSidecarOptions`, `TransformCssTsOptions`, `TransformCssTsWithManifestSidecarResult`.

### `./dist/metro-plugin`

Compatibility alias of `/metro-plugin`; the values and types are identical.

### `./dist/theme`

Compatibility alias of `/theme`; the values and types are identical.

### `./theme/vars`

**Values:** `assignVars`, `resolveAssignedStyles`, `useAssignedStyles`.

**Type-only exports:** `NativeLocalFallback`, `NativeLocalVar`, `NativeLocalVarShape`, `NativeLocalVarValues`,
`NativeVarAssignments`, `ResolvedAssignedStyles`.

### `./theme/containers`

**Values:** `ContainerProvider`, `defineContainer`, `getContainerBucket`, `resolveContainerValue`, `useContainerLayout`,
`useContainerValue`.

**Type-only exports:** `ContainerProviderProps`, `NativeContainerAxis`, `NativeContainerBucket`, `NativeContainerDefinition`,
`NativeContainerDefinitionInput`, `NativeContainerLayout`, `NativeContainerValues`.

### `./theme/motion`

**Values:** `defineMotion`.

**Type-only exports:** `NativeMotionChannel`, `NativeMotionDefinition`, `NativeMotionDefinitionInput`, `NativeMotionEasing`,
`NativeMotionState`, `NativeMotionTarget`.

### `./theme/motion/native`

**Values:** `useNativeMotion`.

**Type-only exports:** `NativeMotionChannel`, `NativeMotionController`, `NativeMotionDefinition`, `NativeMotionDefinitionInput`,
`NativeMotionEasing`, `NativeMotionOptions`, `NativeMotionResult`, `NativeMotionRun`, `NativeMotionState`,
`NativeMotionTarget`.

### `./tokens/algebra`

**Values:** `TokenAlgebraError`, `createColor`, `createTypography`, `createTypographyScale`, `mixColor`,
`multiplyColorAlpha`, `scaleTypography`, `setColorAlpha`, `toNativeColor`, `toNativeTypography`.

**Type-only exports:** `AlgebraColor`, `AlgebraColorInput`, `ColorInterpolationSpace`, `ColorMixOptions`, `NativeTypographyStyle`,
`TokenAlgebraErrorCode`, `Typography`, `TypographyInput`, `TypographyScale`, `TypographyScaleOptions`.

### `./extensions`

**Values:** `ExtensionError`, `defineExtension`.

**Type-only exports:** `ExtensionConfig`, `ExtensionErrorCode`, `ExtensionFactory`, `ExtensionModule`.

### `./package.json`

Package metadata, including the exact installed version, peer ranges and public export map.

</details>

## Development

| Command | Purpose |
| --- | --- |
| `bun install --frozen-lockfile` | Reproduce the committed workspace dependency graph. |
| `bun run build` | Build the published package. |
| `bun run test` | Run the package and Storybook test suites. |
| `bun run typecheck` | Typecheck the published package. |
| `bun run app:storybook` | Start the Expo Storybook app for component development. |
| `bun run app:typecheck` | Typecheck the Storybook consumer against the workspace package. |
| `bun run playground` | Run the Expo consumer with Crumbs build watching and Metro restarts. |
| `bun run playground:packed --check` | Typecheck and bundle an isolated consumer of the working-tree tarball. |
| `bun run playground:distribution --check` | Qualify packed Crumbs, token, and component packages in Expo on iOS and web. |
| `bun run playground:published --version=1.1.1 --check` | Verify v1 in an isolated registry consumer after publication. |
| `bun run docs:dev` | Run the Starlight docs site locally. |
| `bun run docs:build` | Build the docs site. |
| `bun run release:check` | Build, typecheck, test, bench, pack, and require a current-source host report admitted by release policy. |
| `bun run release:preflight --tag v<version>` | Verify a release tag matches the package version and checked-out commit; print its npm dist-tag without publishing. |

### Workspace layout

See the [Expo playground guide](apps/playground/README.md) for consumer modes and feedback journeys.

### CI checks

Pull requests that change `apps/` run the same CI workflow as package changes;
docs-only pull requests remain path-ignored. CI uses Bun 1.4.2, Node 24, and
`bun install --frozen-lockfile` across all workspaces. `bun run test` covers the
package and Storybook test suites, `bun run app:typecheck` checks the Storybook
consumer, and `bun run playground:distribution --check` builds packed package
artifacts, typechecks an independent Expo consumer, and requires iOS and web
bundle provenance. Missing required compiler fixtures or consumer maps fail
the gate. This CI coverage does not include Android or device acceptance.

```
packages/
  css/          # Published package: authoring, runtime, Metro and tooling

apps/
  storybook/    # Expo Storybook — component development and visual testing
  playground/   # Workspace, packed and published Expo consumer modes

docs/
  # Starlight consumer documentation site
```

### Storybook

```sh
bun run app:storybook
```

Runs the Expo Storybook app. Use it for visual checks, component examples, and Expo Dev Client smoke testing.

### Releasing

- [release-please](https://github.com/googleapis/release-please) manages version PRs, changelog updates, tags, and GitHub releases.
- release-please never publishes to npm. npm publication is a separate, manually dispatched workflow after a published GitHub Release exists.
- v1 uses SemVer. Stable APIs and published artifact formats receive a documented replacement and at least one minor release of deprecation before removal in a major release. Stable npm versions use `latest`; named prereleases use their channel, such as `alpha`.
- Release operations require repository secrets and permissions:
  - `RELEASE_PLEASE_TOKEN` for reliable release PR creation
  - `NPM_TOKEN` for the manual npm publish workflow
- The `publish` workflow is manually dispatched from `main` with an exact `v<version>` tag. Its qualification job runs on the dedicated Apple M4 Pro runner, installs the frozen workspace and approved Expo/Metro baseline, measures all 21 host budgets against the matched scaffold, and supplies that report to `release:check`. That check requires 11 blocking compiler, Metro and editor rows to pass; 10 advisory Node startup and emitted runtime graph rows retain their numerical pass/fail results. Missing, malformed, incomplete or unmatched advisory evidence still blocks admission. `releasePolicyQualified` is distinct from whole-registry `performanceQualified`: advisory failures can remain visible while release policy admits the report. No numerical limit or baseline changes. The checked-in policy ID and policy/registry hashes bind comparison format 3, before/after identities and qualification manifest format 2 to the checked-out source and rebuilt package artifacts. Legacy report/manifest formats cannot qualify a new release. The workflow then packs without lifecycle scripts and binds the report and exact tarball in one hashed qualification bundle.

An Ubuntu publisher waits for qualification, checks that the tag still points to the qualified commit and that a published GitHub Release exists, verifies the bundle, and publishes the downloaded tarball with npm provenance. It does not rebuild or repack. The qualification job receives no npm token or OIDC write permission. The dedicated runner and current host-budget result are documented in the [performance budget protocol](packages/css/bench/PERFORMANCE_BUDGETS.md). Branches, raw SHAs, draft releases, and arbitrary refs are not publish targets.

## Acknowledgements

Directly inspired by [vanilla-extract](https://vanilla-extract.style/) — the zero-runtime CSS-in-TypeScript library by [Mark Dalgleish](https://github.com/markdalgleish) and the team at [Seek](https://github.com/seek-oss). The authoring API, theme contract model, and recipe abstraction are all shaped by vanilla-extract's design. If you work on web, use vanilla-extract.

## License

MIT
