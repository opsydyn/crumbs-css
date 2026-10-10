import { f as NativePrimitiveDomain } from "./model-DAuWjF1q.mjs";
import { M as NativeComponentRecipeDescriptor, Z as NativeSprinklesLookupPlan, f as NativeStyle, it as NativeComponentRecipeExtensionDescriptor, n as NativeRecipe } from "./native-style-minqF-Hg.mjs";
import { i as NativeThemeTokenReference } from "./theme-token-5fLFCMug.mjs";
import { L as NativeTheme, h as TokenThemeLayer, p as TokenThemeContextName } from "./domains-DjWDvNbl.mjs";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";
import { ReactElement, ReactNode } from "react";

//#region src/runtime/theme-dependency-plan.d.ts
declare const ThemeDependencyPlanType: "crumbs.css.theme-dependency-plan";
declare const ThemeDependencyPlanVersion: 1;
type ThemeDependencyPathSegment = string | number;
type ThemeDependencyPlanEntry = {
  readonly path: ReadonlyArray<ThemeDependencyPathSegment>;
  readonly tokens: ReadonlyArray<string>;
};
type ThemeDependencyPlan = {
  readonly $$type: typeof ThemeDependencyPlanType;
  readonly version: typeof ThemeDependencyPlanVersion;
  readonly entries: ReadonlyArray<ThemeDependencyPlanEntry>;
};
/**
 * Canonicalises compiler-emitted dependency entries into immutable data. A
 * path may be discovered more than once while traversing composed exports; its
 * token set is merged before sorting so equivalent modules emit equivalent
 * plans.
 */
declare function createThemeDependencyPlan(entries: ReadonlyArray<ThemeDependencyPlanEntry>): ThemeDependencyPlan;
//#endregion
//#region src/theme-runtime.d.ts
type ThemeProviderProps<TContract extends Record<string, unknown>> = {
  readonly children?: ReactNode;
  readonly theme: NativeTheme<TContract>;
};
declare function ThemeProvider<TContract extends Record<string, unknown>>({
  children,
  theme
}: ThemeProviderProps<TContract>): ReactElement;
declare function useTheme<TContract extends Record<string, unknown>>(): NativeTheme<TContract>;
declare function useThemeSelector<TSelected>(selector: (theme: NativeTheme<Record<string, unknown>>) => TSelected): TSelected;
type TokenThemeProviderProps<TContract extends Record<string, unknown>> = {
  readonly children?: ReactNode;
  readonly contract: TContract;
  readonly theme: NativeTheme<TContract>;
};
/**
 * A provider keyed by the contract's stable public identity. The context map
 * is shared through a global symbol so duplicate package copies in one app
 * observe the same provider rather than creating isolated React contexts.
 */
declare function TokenThemeProvider<TContract extends Record<string, unknown>>({
  children,
  contract,
  theme
}: TokenThemeProviderProps<TContract>): ReactElement;
/** Read a theme only when its contract identity and shape are both compatible. */
declare function useTokenTheme<TContract extends Record<string, unknown>>(contract: TContract): NativeTheme<TContract>;
type TokenThemeScopeProviderProps<TContract extends Record<string, unknown>> = {
  readonly children?: ReactNode;
  readonly contract: TContract;
  readonly context: TokenThemeContextName;
  readonly values: TokenThemeLayer<TContract>;
};
/**
 * Add one independent brand, mode, or density layer to the nearest complete
 * token theme. Layers compose by fixed axis precedence, so provider nesting
 * order cannot change which axis wins when the same token is overridden.
 */
declare function TokenThemeScopeProvider<TContract extends Record<string, unknown>>({
  children,
  contract,
  context,
  values
}: TokenThemeScopeProviderProps<TContract>): ReactElement;
declare function isTokenThemeCompatible<TContract extends object>(contract: TContract, theme: NativeTheme<Record<string, unknown>>): boolean;
type NativePrimitiveStyle = ImageStyle | TextStyle | ViewStyle;
type TokenizedNativeStyle<TStyle> = { readonly [K in keyof TStyle]?: TStyle[K] | NativeThemeTokenReference };
type TokenizedNativePrimitiveStyle = TokenizedNativeStyle<ImageStyle> | TokenizedNativeStyle<TextStyle> | TokenizedNativeStyle<ViewStyle>;
type RecursiveStyleLeaf<TInput> = [Extract<TInput, NativePrimitiveStyle>] extends [never] ? NativeStyle : Extract<TInput, NativePrimitiveStyle>;
type ResolvedNativeStyleInput<TInput, TSeen = never> = TInput extends false | null | undefined ? undefined : TInput extends NativeComponentRecipeDescriptor | NativeComponentRecipeExtensionDescriptor ? TInput : TInput extends NativePrimitiveStyle ? TInput : TInput extends ReadonlyArray<infer TEntry> ? TInput extends TSeen ? RecursiveStyleLeaf<TEntry> : ResolvedNativeStyleInput<TEntry, TSeen | TInput> : NativeStyle;
declare function useThemedStyle<TInput>(style: TInput): ResolvedNativeStyleInput<TInput> | undefined;
type ResolvedThemeStyles<TStyles extends Readonly<Record<string, unknown>>> = { readonly [K in keyof TStyles]: TStyles[K] extends NativeComponentRecipeDescriptor | NativeComponentRecipeExtensionDescriptor ? TStyles[K] : TStyles[K] extends NativeRecipe<infer TVariants> ? NativeRecipe<TVariants> : TStyles[K] extends NativeSprinklesLookupPlan<infer TPrimitives extends NativePrimitiveDomain, infer TProperties extends object, infer TShorthands extends Readonly<Record<string, readonly string[]>>> ? NativeSprinklesLookupPlan<TPrimitives, TProperties, TShorthands> : TStyles[K] extends NativePrimitiveStyle ? TStyles[K] | undefined : TStyles[K] extends TokenizedNativePrimitiveStyle ? NativeStyle | undefined : TStyles[K] extends Readonly<Record<string, unknown>> ? { readonly [V in keyof TStyles[K]]: ResolvedNativeStyleInput<TStyles[K][V]> | undefined } : ResolvedNativeStyleInput<TStyles[K]> | undefined };
declare function useThemedStyles<TStyles extends Readonly<Record<string, unknown>>>(styles: TStyles): ResolvedThemeStyles<TStyles>;
declare function resolveThemeStyles<TStyles extends Readonly<Record<string, unknown>>>(styles: TStyles, theme: NativeTheme<Record<string, unknown>>): ResolvedThemeStyles<TStyles>;
type ThemeDependencyResolutionMetrics = {
  readonly recomputations: number;
  readonly notifications: number;
  readonly changedTokens: ReadonlyArray<string>;
};
type ThemeDependencyResolution<TStyles extends Readonly<Record<string, unknown>>> = {
  readonly value: ResolvedThemeStyles<TStyles>;
  readonly metrics: ThemeDependencyResolutionMetrics;
};
type ThemeDependencyResolver<TStyles extends Readonly<Record<string, unknown>>> = {
  readonly resolve: (theme: NativeTheme<Record<string, unknown>>) => ThemeDependencyResolution<TStyles>;
};
/**
 * Resolves only the exported paths named by a compiler dependency plan. The
 * receipt's notification count is the number of output paths whose resolved
 * value changed; it is an invalidation signal for a future subscription layer,
 * not a claim about React renders.
 */
declare function createThemeDependencyResolver<TStyles extends Readonly<Record<string, unknown>>>(styles: TStyles, plan: ThemeDependencyPlan): ThemeDependencyResolver<TStyles>;
declare function resolveThemeTokens<TInput>(style: TInput, theme: NativeTheme<Record<string, unknown>>): ResolvedNativeStyleInput<TInput> | undefined;
//#endregion
export { createThemeDependencyPlan as S, useThemedStyles as _, ThemeProvider as a, ThemeDependencyPlan as b, TokenThemeScopeProvider as c, isTokenThemeCompatible as d, resolveThemeStyles as f, useThemedStyle as g, useThemeSelector as h, ThemeDependencyResolver as i, TokenThemeScopeProviderProps as l, useTheme as m, ThemeDependencyResolution as n, TokenThemeProvider as o, resolveThemeTokens as p, ThemeDependencyResolutionMetrics as r, TokenThemeProviderProps as s, ResolvedThemeStyles as t, createThemeDependencyResolver as u, useTokenTheme as v, ThemeDependencyPlanEntry as x, ThemeDependencyPathSegment as y };