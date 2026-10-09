import { m as TokenDomainValue, p as TokenDomain, t as DomainThemeVar } from "./theme-token-5fLFCMug.mjs";
import { L as NativeTheme, _ as TokenThemePatchResult, y as TokenThemeValues } from "./domains-DjWDvNbl.mjs";

//#region src/tokens/optic.d.ts
/** A plain-data result for one validated focus update. */
type TokenThemeFocusResult<TContract> = TokenThemePatchResult<TContract>;
/**
 * A reusable nested token focus. The pure value methods expose Effect Optic's
 * path-copy semantics without leaking Effect types; theme methods add Crumbs'
 * contract and domain validation before publishing a new snapshot.
 */
type TokenThemeFocus<TContract, TValue> = {
  readonly path: ReadonlyArray<string>;
  readonly getValues: (values: TokenThemeValues<TContract>) => TValue;
  readonly replaceValues: (value: TValue, values: TokenThemeValues<TContract>) => TokenThemeValues<TContract>;
  readonly modifyValues: (update: (value: TValue) => unknown, values: TokenThemeValues<TContract>) => TokenThemeValues<TContract>;
  readonly get: (theme: NativeTheme<TContract>) => TValue;
  readonly replace: (value: TValue, theme: NativeTheme<TContract>) => TokenThemeFocusResult<TContract>;
  readonly modify: (update: (value: TValue) => unknown, theme: NativeTheme<TContract>) => TokenThemeFocusResult<TContract>;
};
/**
 * Create a reusable focus for one definition token. Aliases are derived data
 * and therefore cannot be focus targets. The returned focus is safe to cache
 * outside render loops and can be used for both pure transformations and
 * validated immutable theme updates.
 */
declare function createTokenThemeFocus<TContract extends Readonly<Record<string, unknown>>, TDomain extends TokenDomain>(contract: TContract, token: DomainThemeVar<TDomain>): TokenThemeFocus<TContract, TokenDomainValue<TDomain>>;
//#endregion
export { TokenThemeFocus, TokenThemeFocusResult, createTokenThemeFocus };