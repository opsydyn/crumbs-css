//#region src/tokens/identity.d.ts
/**
 * Stable identity for a token contract.
 *
 * The owner is normally the publishing package name, `name` is the contract
 * name within that package, and `version` is the compatibility version of the
 * contract shape. Keeping these fields explicit makes identity independent of
 * module evaluation order, object identity, and the package copy that happens
 * to create the contract at runtime.
 */
type TokenContractIdentity = {
  readonly owner: string;
  readonly name: string;
  readonly version: number;
};
type TokenContractIdentityInput = TokenContractIdentity | {
  readonly identity?: TokenContractIdentity;
  readonly visibility?: TokenContractVisibility;
};
/** A token path whose visibility is declared by its publishing contract. */
type TokenContractVisibilityPath = ReadonlyArray<string>;
/** Public paths are definitions; aliases inherit from their terminal definition. */
type TokenContractVisibility = {
  readonly public: ReadonlyArray<TokenContractVisibilityPath>;
};
//#endregion
export { TokenContractVisibilityPath as i, TokenContractIdentityInput as n, TokenContractVisibility as r, TokenContractIdentity as t };