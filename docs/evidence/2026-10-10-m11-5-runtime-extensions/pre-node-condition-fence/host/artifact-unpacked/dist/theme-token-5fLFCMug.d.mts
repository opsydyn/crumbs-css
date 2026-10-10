import { t as TokenContractIdentity } from "./identity-DwBRSt_G.mjs";

//#region src/theme-token.d.ts
declare const NativeThemeTokenReferenceType: "crumbs.css.theme-token";
type NativeThemeTokenReference = {
  readonly $$type: typeof NativeThemeTokenReferenceType;
  readonly varName: string;
};
/**
 * A token domain is deliberately data rather than a class or an Effect value.
 * Authoring code can therefore carry the domain through declarations without
 * making ordinary style consumers depend on Effect at runtime.
 */
type TokenDomain = {
  readonly kind: "color";
} | {
  readonly kind: "length";
  readonly allowNegative: boolean;
} | {
  readonly kind: "duration";
} | {
  readonly kind: "opacity";
} | {
  readonly kind: "enum";
  readonly values: ReadonlyArray<string>;
};
type TokenDomainValue<TDomain extends TokenDomain> = TDomain extends {
  readonly kind: "color";
} ? string : TDomain extends {
  readonly kind: "length";
} ? number | `${number}%` | "auto" : TDomain extends {
  readonly kind: "duration";
} ? number : TDomain extends {
  readonly kind: "opacity";
} ? number : TDomain extends {
  readonly kind: "enum";
  readonly values: infer TValues;
} ? TValues extends ReadonlyArray<infer TValue> ? TValue : never : never;
declare const legacyThemeVarBrand: unique symbol;
declare const domainThemeVarBrand: unique symbol;
declare const domainThemeVarVisibilityBrand: unique symbol;
type UnbrandedThemeLiteral = string & {
  readonly [legacyThemeVarBrand]?: never;
  readonly [domainThemeVarBrand]?: never;
};
type ThemeTokenVisibility = "public" | "private";
/** Type-only marker used to select the already-derived value shape for domain contracts. */
declare const nativeThemeValuesBrand: unique symbol;
/** The pre-M3 unscoped token brand retained for the migration path. */
type LegacyNativeThemeVar = `var(--crumbs-${string})` & {
  readonly [legacyThemeVarBrand]: "legacy";
};
/** A domain-carrying token reference used by the M3 token contract API. */
type DomainThemeVar<TDomain extends TokenDomain = TokenDomain, TVisibility extends ThemeTokenVisibility = ThemeTokenVisibility> = `var(--crumbs-${string})` & {
  readonly [domainThemeVarBrand]: TDomain;
  readonly [domainThemeVarVisibilityBrand]: TVisibility;
};
/** A token reference declared for use by consumers of its publishing contract. */
type PublicDomainThemeVar<TDomain extends TokenDomain = TokenDomain> = DomainThemeVar<TDomain, "public">;
/** A token reference retained for implementation use inside its publishing contract. */
type PrivateDomainThemeVar<TDomain extends TokenDomain = TokenDomain> = DomainThemeVar<TDomain, "private">;
/** Legacy token values remain the public `NativeThemeVar` migration type. */
type NativeThemeVar = LegacyNativeThemeVar;
type ThemeVar = NativeThemeVar | DomainThemeVar;
type ThemeTokenOriginStep = {
  readonly path: ReadonlyArray<string>;
  readonly publicId: string;
};
type ThemeTokenOrigin = {
  readonly kind: "definition" | "alias";
  readonly path: ReadonlyArray<string>;
  readonly publicId: string;
  readonly targetPath?: ReadonlyArray<string>;
  readonly targetPublicId?: string;
  readonly chain: ReadonlyArray<ThemeTokenOriginStep>;
  readonly fallback?: string | number;
};
/** Versioned, plain-data representation accepted at the external theme boundary. */
type ExternalTokenThemePayload = {
  readonly _tag: "CrumbsTokenTheme";
  readonly version: 1;
  readonly contract: TokenContractIdentity;
  readonly values: Readonly<Record<string, string | number>>;
};
declare function createThemeTokenReference(varName: string): NativeThemeTokenReference;
declare function isThemeTokenReference(value: unknown): value is NativeThemeTokenReference;
//#endregion
export { isThemeTokenReference as _, NativeThemeTokenReferenceType as a, PublicDomainThemeVar as c, ThemeTokenVisibility as d, ThemeVar as f, createThemeTokenReference as g, UnbrandedThemeLiteral as h, NativeThemeTokenReference as i, ThemeTokenOrigin as l, TokenDomainValue as m, ExternalTokenThemePayload as n, NativeThemeVar as o, TokenDomain as p, LegacyNativeThemeVar as r, PrivateDomainThemeVar as s, DomainThemeVar as t, ThemeTokenOriginStep as u, nativeThemeValuesBrand as v };