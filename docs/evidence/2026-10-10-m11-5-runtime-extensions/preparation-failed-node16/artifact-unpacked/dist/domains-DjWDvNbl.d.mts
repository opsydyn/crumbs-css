import { n as TokenContractIdentityInput, r as TokenContractVisibility, t as TokenContractIdentity } from "./identity-DwBRSt_G.mjs";
import { d as ThemeTokenVisibility, f as ThemeVar, l as ThemeTokenOrigin, m as TokenDomainValue, n as ExternalTokenThemePayload, o as NativeThemeVar, p as TokenDomain, r as LegacyNativeThemeVar, t as DomainThemeVar, v as nativeThemeValuesBrand } from "./theme-token-5fLFCMug.mjs";

//#region src/tokens/domain-values.d.ts
declare function isTokenDomainValue(domain: TokenDomain, value: unknown): boolean;
//#endregion
//#region src/theme-contract.d.ts
/** The legacy, unscoped shape accepted by createThemeContract. */
type ThemeContractInput = {
  readonly [key: string]: ThemeContractInput | null;
};
type NativeThemeValue = string | number;
type ThemeContract<T extends ThemeContractInput> = { readonly [K in keyof T]: T[K] extends null ? LegacyNativeThemeVar : T[K] extends ThemeContractInput ? ThemeContract<T[K]> : never };
type LegacyThemeValues<T> = { readonly [K in keyof T]: T[K] extends NativeThemeVar ? NativeThemeValue : T[K] extends Record<string, unknown> ? LegacyThemeValues<T[K]> : never };
type ThemeValues<T> = T extends {
  readonly [nativeThemeValuesBrand]: infer TValues;
} ? TValues : LegacyThemeValues<T>;
type NativeTheme<TContract> = {
  readonly contract: TContract;
  readonly tokens: Readonly<Record<string, NativeThemeValue>>;
  readonly values: ThemeValues<TContract>;
};
declare function createThemeContract<T extends ThemeContractInput>(shape: T): ThemeContract<T>;
declare function createTheme<TContract extends Record<string, unknown>>(contract: TContract, values: ThemeValues<TContract>): NativeTheme<TContract>;
declare function isThemeVar(value: unknown): value is ThemeVar;
declare function getThemeVarName(value: ThemeVar): string;
declare function getThemeTokenPath(value: ThemeVar): ReadonlyArray<string>;
//#endregion
//#region src/tokens/domains.d.ts
type TokenDomainDefinition = "color" | "duration" | "opacity" | "length" | {
  readonly kind: "color";
} | {
  readonly kind: "duration";
} | {
  readonly kind: "opacity";
} | {
  readonly kind: "length";
  readonly allowNegative?: boolean;
} | {
  readonly kind: "enum";
  readonly values: ReadonlyArray<string>;
};
type NormalizedDomain<TDefinition extends TokenDomainDefinition> = TDefinition extends "color" | {
  readonly kind: "color";
} ? {
  readonly kind: "color";
} : TDefinition extends "duration" | {
  readonly kind: "duration";
} ? {
  readonly kind: "duration";
} : TDefinition extends "opacity" | {
  readonly kind: "opacity";
} ? {
  readonly kind: "opacity";
} : TDefinition extends "length" | {
  readonly kind: "length";
} ? {
  readonly kind: "length";
  readonly allowNegative: TDefinition extends {
    readonly allowNegative: true;
  } ? true : false;
} : TDefinition extends {
  readonly kind: "enum";
  readonly values: infer TValues;
} ? TValues extends ReadonlyArray<string> ? {
  readonly kind: "enum";
  readonly values: TValues;
} : never : never;
type TokenAliasTarget = string | ReadonlyArray<string>;
type TokenAliasDefinition<TTarget extends TokenAliasTarget = TokenAliasTarget, TDomain extends TokenDomain | undefined = undefined> = {
  readonly $$type: typeof TokenAliasDefinitionType;
  readonly target: TTarget;
  readonly domain?: TDomain;
  readonly fallback?: TDomain extends TokenDomain ? TokenDomainValue<TDomain> : string | number;
};
type AnyTokenAliasDefinition = TokenAliasDefinition<TokenAliasTarget, TokenDomain | undefined>;
declare const TokenDefinitionType: "crumbs.css.token-definition";
declare const TokenAliasDefinitionType: "crumbs.css.token-alias";
type TokenDefinition<TDomain extends TokenDomain = TokenDomain> = {
  readonly $$type: typeof TokenDefinitionType;
  readonly domain: TDomain;
};
type TokenContractInput = {
  readonly [key: string]: TokenContractInput | TokenDefinition | AnyTokenAliasDefinition;
};
type TokenContractOptions = TokenContractIdentityInput;
type TokenDefinitionInput<TDefinition extends TokenDomainDefinition = TokenDomainDefinition> = TokenDefinition<NormalizedDomain<TDefinition>>;
declare const tokenContractShapeBrand: unique symbol;
type SplitTokenPath<TPath extends string> = TPath extends `${infer THead}.${infer TTail}` ? THead extends "" ? SplitTokenPath<TTail> : [THead, ...SplitTokenPath<TTail>] : TPath extends "" ? [] : [TPath];
type LookupTokenShape<TShape, TPath extends ReadonlyArray<string>> = TPath extends readonly [infer THead extends string, ...infer TRest extends string[]] ? THead extends keyof TShape ? TRest extends [] ? TShape[THead] : LookupTokenShape<TShape[THead], TRest> : never : never;
type AliasTargetPath<TTarget> = TTarget extends ReadonlyArray<string> ? TTarget : TTarget extends string ? SplitTokenPath<TTarget> : never;
type AliasTargetValue<TShape, TTarget> = LookupTokenShape<TShape, AliasTargetPath<TTarget>>;
type AliasTargetDomain<TShape, TTarget, TDeclaredDomain, TDepth extends ReadonlyArray<unknown> = []> = TDepth["length"] extends 8 ? TokenDomain : [TDeclaredDomain] extends [TokenDomain] ? TDeclaredDomain : AliasTargetValue<TShape, TTarget> extends TokenDefinition<infer TDomain> ? TDomain : AliasTargetValue<TShape, TTarget> extends TokenAliasDefinition<infer TNestedTarget, infer TNestedDomain> ? AliasTargetDomain<TShape, TNestedTarget, TNestedDomain, [...TDepth, unknown]> : TokenDomain;
type EqualTokenSegment<TLeft extends string, TRight extends string> = TLeft extends TRight ? TRight extends TLeft ? true : false : false;
type EqualTokenPath<TLeft extends ReadonlyArray<string>, TRight extends ReadonlyArray<string>> = number extends TLeft["length"] ? boolean : number extends TRight["length"] ? boolean : TLeft extends readonly [infer TLeftHead extends string, ...infer TLeftTail extends ReadonlyArray<string>] ? TRight extends readonly [infer TRightHead extends string, ...infer TRightTail extends ReadonlyArray<string>] ? EqualTokenSegment<TLeftHead, TRightHead> extends true ? EqualTokenPath<TLeftTail, TRightTail> : false : false : TRight extends readonly [] ? true : false;
type TokenPathInList<TPaths extends ReadonlyArray<ReadonlyArray<string>>, TPath extends ReadonlyArray<string>> = TPaths extends readonly [infer THead extends ReadonlyArray<string>, ...infer TTail extends ReadonlyArray<ReadonlyArray<string>>] ? EqualTokenPath<THead, TPath> extends true ? true : TokenPathInList<TTail, TPath> : number extends TPaths["length"] ? boolean : false;
type TokenPathVisibility<TPath extends ReadonlyArray<string>, TPublicPaths> = TPublicPaths extends undefined ? "public" : TPublicPaths extends ReadonlyArray<ReadonlyArray<string>> ? TokenPathInList<TPublicPaths, TPath> extends true ? "public" : TokenPathInList<TPublicPaths, TPath> extends false ? "private" : ThemeTokenVisibility : ThemeTokenVisibility;
type AliasTargetVisibility<TShape, TTarget, TPublicPaths, TDepth extends ReadonlyArray<unknown> = []> = TPublicPaths extends undefined ? "public" : TDepth["length"] extends 8 ? ThemeTokenVisibility : [AliasTargetValue<TShape, TTarget>] extends [never] ? "private" : AliasTargetValue<TShape, TTarget> extends TokenDefinition ? TokenPathVisibility<AliasTargetPath<TTarget>, TPublicPaths> : AliasTargetValue<TShape, TTarget> extends TokenAliasDefinition<infer TNestedTarget, infer _TNestedDomain> ? AliasTargetVisibility<TShape, TNestedTarget, TPublicPaths, [...TDepth, unknown]> : "private";
type TokenContractValue<TRootShape, TShape, TValue, TPublicPaths, TPath extends ReadonlyArray<string>> = TValue extends TokenDefinition<infer TDomain> ? DomainThemeVar<TDomain, TokenPathVisibility<TPath, TPublicPaths>> : TValue extends TokenAliasDefinition<infer TTarget, infer TDeclaredDomain> ? DomainThemeVar<AliasTargetDomain<TRootShape, TTarget, TDeclaredDomain>, AliasTargetVisibility<TRootShape, TTarget, TPublicPaths>> : TValue extends TokenContractInput ? TokenContractNode<TRootShape, TValue, TPublicPaths, TPath> : never;
type TokenContractNode<TRootShape, TShape extends TokenContractInput, TPublicPaths, TPath extends ReadonlyArray<string> = []> = { readonly [K in keyof TShape]: TokenContractValue<TRootShape, TShape, TShape[K], TPublicPaths, [...TPath, K & string]> };
type TokenContractPublicPaths<TOptions> = TOptions extends {
  readonly visibility?: infer TVisibility;
} ? TVisibility extends TokenContractVisibility ? TVisibility["public"] : undefined : undefined;
type ResolvedTokenThemeValues<TContract> = { readonly [K in keyof TContract]: TContract[K] extends DomainThemeVar<infer TDomain> ? TokenDomainValue<TDomain> : TContract[K] extends Readonly<Record<string, unknown>> ? ResolvedTokenThemeValues<TContract[K]> : never };
type TokenContract<TShape extends TokenContractInput, TOptions = undefined> = TokenContractNode<TShape, TShape, TokenContractPublicPaths<TOptions>> & {
  readonly [tokenContractShapeBrand]?: TShape;
  readonly [nativeThemeValuesBrand]: ResolvedTokenThemeValues<TokenContractNode<TShape, TShape, TokenContractPublicPaths<TOptions>>>;
};
type HasRequiredToken<TValue> = TValue extends AnyTokenAliasDefinition ? false : TValue extends TokenDefinition ? true : TValue extends TokenContractInput ? true extends { [K in keyof TValue]: HasRequiredToken<TValue[K]> }[keyof TValue] ? true : false : false;
type TokenThemeValuesForShape<TShape extends TokenContractInput> = { readonly [K in keyof TShape as TShape[K] extends AnyTokenAliasDefinition ? never : TShape[K] extends TokenContractInput ? HasRequiredToken<TShape[K]> extends true ? K : never : K]: TShape[K] extends TokenDefinition<infer TDomain> ? TokenDomainValue<TDomain> : TShape[K] extends TokenContractInput ? TokenThemeValuesForShape<TShape[K]> : never } & { readonly [K in keyof TShape as TShape[K] extends AnyTokenAliasDefinition ? K : TShape[K] extends TokenContractInput ? HasRequiredToken<TShape[K]> extends true ? never : K : never]?: TShape[K] extends TokenContractInput ? TokenThemeValuesForShape<TShape[K]> : never };
type TokenThemeValues<TContract> = TContract extends {
  readonly [tokenContractShapeBrand]?: infer TShape;
} ? TShape extends TokenContractInput ? TokenThemeValuesForShape<TShape> : never : { readonly [K in keyof TContract]: TContract[K] extends DomainThemeVar<infer TDomain> ? TokenDomainValue<TDomain> : TContract[K] extends Readonly<Record<string, unknown>> ? TokenThemeValues<TContract[K]> : never };
/** Independent theme axes are merged after the canonical base snapshot. */
declare const TOKEN_THEME_CONTEXT_PRECEDENCE: readonly ["brand", "mode", "density"];
type TokenThemeContextName = (typeof TOKEN_THEME_CONTEXT_PRECEDENCE)[number];
type TokenThemeLayerNode<TValue> = TValue extends ReadonlyArray<unknown> ? TValue : TValue extends Readonly<Record<string, unknown>> ? { readonly [K in keyof TValue]?: TokenThemeLayerNode<TValue[K]> } : TValue;
/** A sparse, domain-checked override for one independent theme context. */
type TokenThemeLayer<TContract> = TokenThemeLayerNode<TokenThemeValues<TContract>>;
type TokenThemeContexts<TContract> = { readonly [K in TokenThemeContextName]?: TokenThemeLayer<TContract> };
type TokenThemeSnapshotInput<TContract> = {
  readonly base: TokenThemeValues<TContract>;
  readonly contexts?: TokenThemeContexts<TContract>;
};
type TokenThemeOperationError = {
  readonly code: string;
  readonly path: ReadonlyArray<string | number>;
  readonly message: string;
};
type TokenThemePatchResult<TContract> = {
  readonly ok: true;
  readonly theme: NativeTheme<TContract>;
  readonly changedPaths: ReadonlyArray<ReadonlyArray<string>>;
} | {
  readonly ok: false;
  readonly error: TokenThemeOperationError;
};
type ExternalTokenThemeResult<TContract> = {
  readonly ok: true;
  readonly theme: NativeTheme<TContract>;
} | {
  readonly ok: false;
  readonly error: TokenThemeOperationError;
};
declare function defineToken<const TDefinition extends TokenDomainDefinition>(definition: TDefinition): TokenDefinition<NormalizedDomain<TDefinition>>;
declare function defineToken<const TKind extends "color" | "duration" | "opacity" | "length">(kind: TKind): TokenDefinition<NormalizedDomain<TKind>>;
declare function defineAlias<const TDomain extends TokenDomain>(target: DomainThemeVar<TDomain>, options?: {
  readonly fallback?: TokenDomainValue<TDomain>;
}): TokenAliasDefinition<ReadonlyArray<string>, TDomain>;
declare function defineAlias<const TTarget extends TokenAliasTarget>(target: TTarget): TokenAliasDefinition<TTarget>;
declare function defineAlias<const TTarget extends TokenAliasTarget, const TDefinition extends TokenDomainDefinition>(target: TTarget, options: {
  readonly domain: TDefinition;
  readonly fallback?: TokenDomainValue<NormalizedDomain<TDefinition>>;
}): TokenAliasDefinition<TTarget, NormalizedDomain<TDefinition>>;
/** Concise alias spelling for design-system layer definitions. */
declare const alias: typeof defineAlias;
/** Concise factories for the common native design-token domains. */
declare const token: Readonly<{
  color: () => TokenDefinition<{
    readonly kind: "color";
  }>;
  length: (options?: {
    readonly allowNegative?: boolean;
  }) => TokenDefinition<{
    readonly kind: "length";
    readonly allowNegative: boolean;
  }>;
  duration: () => TokenDefinition<{
    readonly kind: "duration";
  }>;
  opacity: () => TokenDefinition<{
    readonly kind: "opacity";
  }>;
  enum: <const TValues extends ReadonlyArray<string>>(values: TValues) => TokenDefinition<{
    readonly kind: "enum";
    readonly values: TValues;
  }>;
}>;
declare function isTokenDefinition(value: unknown): value is TokenDefinition;
declare function isTokenAliasDefinition(value: unknown): value is AnyTokenAliasDefinition;
declare function createTokenContract<const TShape extends TokenContractInput, const TOptions extends TokenContractOptions | undefined = undefined>(shape: TShape, identityOrOptions?: TOptions): TokenContract<TShape, TOptions>;
declare function getTokenContractIdentity(contract: object): TokenContractIdentity | undefined;
declare function getTokenContractKey(contract: object): string | undefined;
declare function getTokenId(token: DomainThemeVar): string;
declare function getTokenOrigin(token: DomainThemeVar): ThemeTokenOrigin | undefined;
declare function createTokenTheme<TContract extends Readonly<Record<string, unknown>>>(contract: TContract, values: TokenThemeValues<TContract>): NativeTheme<TContract>;
/**
 * Build one complete theme snapshot from a required base and sparse context
 * layers. The layers are always applied in the documented brand → mode →
 * density order, regardless of object insertion order or provider nesting.
 */
declare function createTokenThemeSnapshot<TContract extends Readonly<Record<string, unknown>>>(contract: TContract, input: TokenThemeSnapshotInput<TContract>): NativeTheme<TContract>;
/**
 * Rebase independent context layers on an already validated theme. This is
 * used by nested providers so every emitted value/token map is one complete
 * immutable snapshot rather than a partially resolved overlay.
 */
declare function createTokenThemeScopedSnapshot<TContract extends Readonly<Record<string, unknown>>>(contract: TContract, baseTheme: NativeTheme<TContract>, contexts: TokenThemeContexts<TContract>): NativeTheme<TContract>;
/** Concise alias for callers that model a scope as a resolved snapshot. */
declare const createTokenThemeScope: typeof createTokenThemeScopedSnapshot;
/**
 * Apply a sparse patch to one complete snapshot. The current snapshot is only
 * read; all validation and derivation happen against cloned values, so a
 * failed operation cannot leave partially updated canonical or flat state.
 */
declare function applyTokenThemePatch<TContract extends Readonly<Record<string, unknown>>>(contract: TContract, current: NativeTheme<TContract>, patch: TokenThemeLayer<TContract>): TokenThemePatchResult<TContract>;
/**
 * Validate a decoded external payload against one identified contract and
 * publish a complete native theme. The external format is keyed by stable
 * public token IDs, so paths and domains cannot drift silently.
 */
declare function createTokenThemeFromExternalPayload<TContract extends Readonly<Record<string, unknown>>>(contract: TContract, payload: ExternalTokenThemePayload): ExternalTokenThemeResult<TContract>;
//#endregion
export { getTokenContractIdentity as A, ThemeContractInput as B, createTokenTheme as C, createTokenThemeSnapshot as D, createTokenThemeScopedSnapshot as E, isTokenDefinition as F, getThemeVarName as G, createTheme as H, token as I, isThemeVar as K, NativeTheme as L, getTokenId as M, getTokenOrigin as N, defineAlias as O, isTokenAliasDefinition as P, NativeThemeValue as R, createTokenContract as S, createTokenThemeScope as T, createThemeContract as U, ThemeValues as V, getThemeTokenPath as W, TokenThemePatchResult as _, TokenAliasTarget as a, alias as b, TokenContractOptions as c, TokenDefinitionType as d, TokenDomainDefinition as f, TokenThemeOperationError as g, TokenThemeLayer as h, TokenAliasDefinitionType as i, getTokenContractKey as j, defineToken as k, TokenDefinition as l, TokenThemeContexts as m, TOKEN_THEME_CONTEXT_PRECEDENCE as n, TokenContract as o, TokenThemeContextName as p, isTokenDomainValue as q, TokenAliasDefinition as r, TokenContractInput as s, ExternalTokenThemeResult as t, TokenDefinitionInput as u, TokenThemeSnapshotInput as v, createTokenThemeFromExternalPayload as w, applyTokenThemePatch as x, TokenThemeValues as y, ThemeContract as z };