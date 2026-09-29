/**
 * Opt-in local design-system ownership tooling. This entrypoint is isolated
 * from ordinary Crumbs React Native runtime exports.
 */
export {
  DESIGN_SYSTEM_OWNED_REPORT_FORMAT,
  DESIGN_SYSTEM_OWNED_REPORT_VERSION,
  DESIGN_SYSTEM_OWNERSHIP_FORMAT,
  DESIGN_SYSTEM_OWNERSHIP_VERSION,
  OWNERSHIP_ANALYSIS_LIMIT_CODES,
  OWNERSHIP_MAX_REPORT_REFERENCES,
  OWNERSHIP_UNRESOLVED_REASON_CODES,
  type DesignSystemOwnership,
  type OwnedReport,
  type OwnershipAnalysisLimit,
  type OwnershipAnalysisLimitCode,
  type OwnershipAssignment,
  type OwnershipAttribution,
  type OwnershipOwner,
  type OwnershipUnresolvedReason,
  type SupportedSourceReport,
} from "./ownership/model"
export { decodeDesignSystemOwnership, decodeOwnedReport } from "./ownership/schema"
export { annotateDesignSystemReport } from "./ownership/annotate"
export { encodeCanonicalOwnedReport } from "./ownership/canonical-json"
