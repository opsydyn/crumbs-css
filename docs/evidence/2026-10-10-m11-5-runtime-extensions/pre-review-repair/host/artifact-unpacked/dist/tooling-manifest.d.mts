import { M as NativeComponentRecipeDescriptor } from "./native-style-minqF-Hg.mjs";
import { _ as ManifestStateConstraint, a as ManifestCapability, b as ManifestTokenDomain, c as ManifestContractIdentity, d as ManifestLifecycle, f as ManifestLifecycleAnnotation, g as ManifestSourceOrigin, h as ManifestProducer, i as ManifestArtifact, l as ManifestCoverageRoot, m as ManifestPackage, n as DESIGN_SYSTEM_MANIFEST_VERSION, o as ManifestCompiler, p as ManifestModule, r as DesignSystemManifest, s as ManifestComponent, t as DESIGN_SYSTEM_MANIFEST_FORMAT, u as ManifestDependency, v as ManifestToken, x as ManifestUnresolvedReference, y as ManifestTokenAlias } from "./model-C3BKvFKH.mjs";
import { c as transformCssTsToStyleSheetWithManifestSidecar, l as CompilerManifestSidecar, n as TransformCssTsOptions, r as TransformCssTsWithManifestSidecarResult, t as TransformCssTsManifestSidecarOptions, u as ManifestSidecarPropertyOrigin } from "./transformer-BWqR2he5.mjs";
import { a as ManifestCompatibilityFinding, c as ManifestCompatibilityReport, d as ManifestReportJson, i as ManifestAnalysisLimitCode, l as ManifestCompatibilityReportMode, n as MANIFEST_COMPATIBILITY_REPORT_VERSION, o as ManifestCompatibilityFindingCode, r as ManifestAnalysisLimit, s as ManifestCompatibilityFindingLevel, t as MANIFEST_COMPATIBILITY_REPORT_FORMAT, u as ManifestConsumerReference } from "./comparison-report-model-BbJjzyt1.mjs";
//#region src/tooling/manifest/contracts.d.ts
type TokenContractRoot = {
  readonly contract: object;
  readonly origin: ManifestSourceOrigin;
};
type ComponentRecipeRoot = {
  readonly recipe: NativeComponentRecipeDescriptor;
  readonly origin: ManifestSourceOrigin;
};
/** Project one explicitly supplied token contract without reading any theme values. */
declare function projectTokenContract(contract: object, sourceOrigin: ManifestSourceOrigin): ReadonlyArray<ManifestToken>;
/** Project only the public surface of a validated component recipe descriptor. */
declare function projectComponentRecipe(recipe: NativeComponentRecipeDescriptor, sourceOrigin: ManifestSourceOrigin): ManifestComponent;
//#endregion
//#region src/tooling/manifest/assemble.d.ts
type ManifestAssemblyInput = {
  readonly package: ManifestPackage;
  readonly producer: ManifestProducer; /** Explicit token contract roots; no source-tree discovery is performed. */
  readonly tokenContracts?: ReadonlyArray<TokenContractRoot>; /** Explicit component recipe roots; no recipe registry is inspected. */
  readonly componentRecipes?: ReadonlyArray<ComponentRecipeRoot>; /** Explicit compiler sidecars for selected style modules; no source-tree discovery is performed. */
  readonly styleSidecars?: ReadonlyArray<CompilerManifestSidecar>;
  readonly lifecycleAnnotations?: ReadonlyArray<ManifestLifecycleAnnotation>;
  readonly unresolvedReferences?: ReadonlyArray<ManifestUnresolvedReference>;
};
/** Assemble a v1 manifest from only the token, component and style roots supplied by the caller. */
declare function assembleManifest(input: ManifestAssemblyInput): DesignSystemManifest;
//#endregion
//#region src/tooling/manifest/schema.d.ts
/** Validate unknown input and return an ordinary, detached JSON-data record. */
declare function decodeManifest(input: unknown): DesignSystemManifest;
declare function decodeManifestContractIdentity(input: unknown): ManifestContractIdentity;
declare function decodeManifestSourceOrigin(input: unknown): ManifestSourceOrigin;
declare function decodeManifestLifecycleAnnotation(input: unknown): ManifestLifecycleAnnotation;
declare function decodeManifestUnresolvedReference(input: unknown): ManifestUnresolvedReference;
//#endregion
//#region src/tooling/manifest/canonical-json.d.ts
/** Encode a validated manifest as compact UTF-8 JSON with one trailing newline. */
declare function encodeCanonicalManifest(input: unknown): string;
//#endregion
//#region src/tooling/manifest/consumer-check.d.ts
/**
 * Check explicitly supplied consumer manifests for stable external edges to
 * tokens that the current provider manifest marks private.
 */
declare function checkManifestConsumers(input: {
  readonly current: unknown;
  readonly consumers?: ReadonlyArray<unknown>;
}): ManifestCompatibilityReport;
//#endregion
//#region src/tooling/manifest/comparison.d.ts
/** Compare two provider manifests and attach only explicitly supplied consumer edges. */
declare function compareManifests(input: {
  readonly baseline: unknown;
  readonly current: unknown;
  readonly consumers?: ReadonlyArray<unknown>;
}): ManifestCompatibilityReport;
//#endregion
//#region src/tooling/manifest/comparison-report-schema.d.ts
/** Validate report data and cross-record relationships, returning detached plain data. */
declare function decodeManifestCompatibilityReport(input: unknown): ManifestCompatibilityReport;
//#endregion
//#region src/tooling/manifest/comparison-report-canonical-json.d.ts
/** Encode a validated compatibility report as compact canonical JSON with one trailing newline. */
declare function encodeCanonicalManifestCompatibilityReport(input: unknown): string;
//#endregion
export { type CompilerManifestSidecar, type ComponentRecipeRoot, DESIGN_SYSTEM_MANIFEST_FORMAT, DESIGN_SYSTEM_MANIFEST_VERSION, type DesignSystemManifest, MANIFEST_COMPATIBILITY_REPORT_FORMAT, MANIFEST_COMPATIBILITY_REPORT_VERSION, type ManifestAnalysisLimit, type ManifestAnalysisLimitCode, type ManifestArtifact, type ManifestAssemblyInput, type ManifestCapability, type ManifestCompatibilityFinding, type ManifestCompatibilityFindingCode, type ManifestCompatibilityFindingLevel, type ManifestCompatibilityReport, type ManifestCompatibilityReportMode, type ManifestCompiler, type ManifestComponent, type ManifestConsumerReference, type ManifestContractIdentity, type ManifestCoverageRoot, type ManifestDependency, type ManifestLifecycle, type ManifestLifecycleAnnotation, type ManifestModule, type ManifestPackage, type ManifestProducer, type ManifestReportJson, type ManifestSidecarPropertyOrigin, type ManifestSourceOrigin, type ManifestStateConstraint, type ManifestToken, type ManifestTokenAlias, type ManifestTokenDomain, type ManifestUnresolvedReference, type TokenContractRoot, type TransformCssTsManifestSidecarOptions, type TransformCssTsOptions, type TransformCssTsWithManifestSidecarResult, assembleManifest, checkManifestConsumers, compareManifests, decodeManifest, decodeManifestCompatibilityReport, decodeManifestContractIdentity, decodeManifestLifecycleAnnotation, decodeManifestSourceOrigin, decodeManifestUnresolvedReference, encodeCanonicalManifest, encodeCanonicalManifestCompatibilityReport, projectComponentRecipe, projectTokenContract, transformCssTsToStyleSheetWithManifestSidecar };