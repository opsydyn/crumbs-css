/**
 * Opt-in build-time helpers for deterministic Crumbs design-system manifests.
 * This entrypoint is intentionally separate from every application runtime API.
 */
export {
  DESIGN_SYSTEM_MANIFEST_FORMAT,
  DESIGN_SYSTEM_MANIFEST_VERSION,
  type DesignSystemManifest,
  type ManifestArtifact,
  type ManifestCapability,
  type ManifestComponent,
  type ManifestCompiler,
  type ManifestContractIdentity,
  type ManifestCoverageRoot,
  type ManifestDependency,
  type ManifestLifecycle,
  type ManifestLifecycleAnnotation,
  type ManifestModule,
  type ManifestPackage,
  type ManifestProducer,
  type ManifestSourceOrigin,
  type ManifestStateConstraint,
  type ManifestToken,
  type ManifestTokenAlias,
  type ManifestTokenDomain,
  type ManifestUnresolvedReference,
} from "./manifest/model"
export { assembleManifest, type ManifestAssemblyInput } from "./manifest/assemble"
export {
  projectComponentRecipe,
  projectTokenContract,
  type ComponentRecipeRoot,
  type TokenContractRoot,
} from "./manifest/contracts"
export {
  decodeManifest,
  decodeManifestContractIdentity,
  decodeManifestLifecycleAnnotation,
  decodeManifestSourceOrigin,
  decodeManifestUnresolvedReference,
} from "./manifest/schema"
export { encodeCanonicalManifest } from "./manifest/canonical-json"
export {
  transformCssTsToStyleSheetWithManifestSidecar,
  type TransformCssTsManifestSidecarOptions,
  type TransformCssTsOptions,
  type TransformCssTsWithManifestSidecarResult,
} from "../transformer"
export type { CompilerManifestSidecar, ManifestSidecarPropertyOrigin } from "../compiler/manifest-sidecar"
export { checkManifestConsumers } from "./manifest/consumer-check"
export { compareManifests } from "./manifest/comparison"
export { decodeManifestCompatibilityReport } from "./manifest/comparison-report-schema"
export { encodeCanonicalManifestCompatibilityReport } from "./manifest/comparison-report-canonical-json"
export {
  MANIFEST_COMPATIBILITY_REPORT_FORMAT,
  MANIFEST_COMPATIBILITY_REPORT_VERSION,
  type ManifestAnalysisLimit,
  type ManifestAnalysisLimitCode,
  type ManifestCompatibilityFinding,
  type ManifestCompatibilityFindingCode,
  type ManifestCompatibilityFindingLevel,
  type ManifestCompatibilityReport,
  type ManifestCompatibilityReportMode,
  type ManifestConsumerReference,
  type ManifestReportJson,
} from "./manifest/comparison-report-model"
