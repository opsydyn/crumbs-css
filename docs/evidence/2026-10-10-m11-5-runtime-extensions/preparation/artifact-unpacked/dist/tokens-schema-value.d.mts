import { m as TokenDomainValue, p as TokenDomain } from "./theme-token-5fLFCMug.mjs";

//#region src/tokens/schema-value.d.ts
/** Decode one external token value without loading external-theme contracts. */
declare function decodeTokenValue<TDomain extends TokenDomain>(domain: TDomain, value: unknown): TokenDomainValue<TDomain>;
//#endregion
export { decodeTokenValue };