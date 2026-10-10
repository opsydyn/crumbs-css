import { t as TokenContractIdentity } from "./identity-DwBRSt_G.mjs";
import { decodeTokenValue } from "./tokens-schema-value.mjs";
//#region src/contracts/data-codec.d.ts
type ContractIssue = {
  readonly code: "CRUMBS_CONTRACT_INVALID_PAYLOAD" | "CRUMBS_CONTRACT_INVALID_JSON" | "CRUMBS_CONTRACT_UNSUPPORTED_VERSION";
  readonly boundary: string;
  readonly path: ReadonlyArray<string | number>;
  readonly message: string;
};
type ContractResult<T> = {
  readonly ok: true;
  readonly value: T;
} | {
  readonly ok: false;
  readonly issues: ReadonlyArray<ContractIssue>;
};
type DataCodec<T> = {
  readonly decode: (input: unknown) => ContractResult<T>;
  readonly decodeJson: (input: unknown) => ContractResult<T>;
  readonly encode: (input: T) => ContractResult<string>;
  readonly encodeUnknown: (input: unknown) => ContractResult<string>;
};
//#endregion
//#region src/contracts/payloads.d.ts
type ContractIdentity = TokenContractIdentity;
declare const ExternalTokenThemeVersion: 1;
type ExternalTokenTheme = {
  readonly _tag: "CrumbsTokenTheme";
  readonly version: typeof ExternalTokenThemeVersion;
  readonly contract: ContractIdentity;
  readonly values: Readonly<Record<string, string | number>>;
};
declare const externalTokenThemeCodec: DataCodec<ExternalTokenTheme>;
//#endregion
//#region src/tokens/schema.d.ts
/** Decode a versioned external theme without constructing a runtime theme. */
declare function decodeExternalTokenTheme(input: unknown): ContractResult<ExternalTokenTheme>;
/** Encode an already decoded external theme using its canonical JSON shape. */
declare function encodeExternalTokenTheme(input: ExternalTokenTheme): ContractResult<string>;
//#endregion
export { type ExternalTokenTheme, decodeExternalTokenTheme, decodeTokenValue, encodeExternalTokenTheme, externalTokenThemeCodec };