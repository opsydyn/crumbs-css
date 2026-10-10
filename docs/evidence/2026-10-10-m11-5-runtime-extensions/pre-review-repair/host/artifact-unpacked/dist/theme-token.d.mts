import { g as NativeStyleTokenDomainForProperty } from "./native-style-minqF-Hg.mjs";
import { i as NativeThemeTokenReference, m as TokenDomainValue, p as TokenDomain, t as DomainThemeVar } from "./theme-token-5fLFCMug.mjs";
import { L as NativeTheme, R as NativeThemeValue } from "./domains-DjWDvNbl.mjs";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";
import { ReactElement, ReactNode } from "react";

//#region src/theme-token-only.d.ts
declare const themeStyleTokenDomain: unique symbol;
/** A token reference that retains the domain inferred from its token contract. */
type ThemeStyleToken<TDomain extends TokenDomain = TokenDomain> = NativeThemeTokenReference & {
  readonly [themeStyleTokenDomain]: TDomain;
};
type NativePrimitiveStyle = ImageStyle | TextStyle | ViewStyle;
type TokenizedNativeStyle<TStyle extends object> = { readonly [K in keyof TStyle]?: Extract<Exclude<TStyle[K], undefined>, NativeThemeValue> | undefined | ThemeStyleToken };
type ResolvedTokenNativeStyle<TStyle extends Readonly<Record<string, unknown>>> = { readonly [K in keyof TStyle]: TStyle[K] extends ThemeStyleToken<infer TDomain> ? TokenDomainValue<TDomain> : TStyle[K] };
type ResolvedTokenStyleMap<TStyles extends Readonly<Record<string, Readonly<Record<string, unknown>>>>> = { readonly [K in keyof TStyles]: ResolvedTokenNativeStyle<TStyles[K]> };
type CheckedTokenStyleValue<TStyle extends object, TProperty extends PropertyKey, TValue> = TProperty extends keyof TStyle ? TValue extends ThemeStyleToken<infer TDomain> ? TDomain extends NativeStyleTokenDomainForProperty<TProperty> ? TokenDomainValue<TDomain> extends Exclude<TStyle[TProperty], undefined> ? TValue : never : never : TValue extends Extract<Exclude<TStyle[TProperty], undefined>, NativeThemeValue> | undefined ? TValue : never : never;
type CheckedTokenStyles<TStyle extends object, TStyles> = { readonly [TName in keyof TStyles]: TStyles[TName] extends Readonly<Record<string, unknown>> ? { readonly [TProperty in keyof TStyles[TName]]: CheckedTokenStyleValue<TStyle, TProperty, TStyles[TName][TProperty]> } & (Exclude<keyof TStyles[TName], keyof TStyle> extends never ? unknown : never) : never };
/** Currying keeps the target native style type fixed while preserving literal style keys. */
declare function createTokenStyles<TStyle extends NativePrimitiveStyle>(): <const TStyles extends Readonly<Record<string, TokenizedNativeStyle<TStyle>>>>(styles: TStyles & CheckedTokenStyles<TStyle, TStyles>) => TStyles;
/** Create a style reference whose value and domain are derived from its token contract. */
declare function themeToken<const TDomain extends TokenDomain>(token: DomainThemeVar<TDomain>): ThemeStyleToken<TDomain>;
type ThemeSnapshot = NativeTheme<Record<string, unknown>>;
type ThemeProviderProps<TContract extends Record<string, unknown>> = {
  readonly children?: ReactNode;
  readonly theme: NativeTheme<TContract>;
};
/** A minimal provider that interoperates with the full theme entrypoint. */
declare function ThemeProvider<TContract extends Record<string, unknown>>({
  children,
  theme
}: ThemeProviderProps<TContract>): ReactElement;
/** Resolve a flat map of primitive native styles and direct token references. */
declare function resolveTokenStyles<const TStyles extends Readonly<Record<string, Readonly<Record<string, unknown>>>>>(styles: TStyles, theme: ThemeSnapshot): ResolvedTokenStyleMap<TStyles>;
/** React hook for the resolved token-only style subpath. */
declare function useTokenStyles<const TStyles extends Readonly<Record<string, Readonly<Record<string, unknown>>>>>(styles: TStyles): ResolvedTokenStyleMap<TStyles>;
//#endregion
export { ResolvedTokenNativeStyle, ResolvedTokenStyleMap, ThemeProvider, ThemeStyleToken, createTokenStyles, resolveTokenStyles, themeToken, useTokenStyles };