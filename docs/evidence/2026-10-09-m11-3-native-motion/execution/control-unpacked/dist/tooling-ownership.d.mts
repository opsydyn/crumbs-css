import { T as StyleExplanationReport } from "./style-explanation-model-BZtfxy4g.mjs";
import { r as DesignSystemManifest } from "./model-CEh8hjok.mjs";
import { d as CrumbsDtcgImportResult } from "./model-CDXYAxVv.mjs";
import { c as ManifestCompatibilityReport } from "./comparison-report-model-DySSVNgd.mjs";
import { h as SourceMigrationReport } from "./model-BfErTNgF.mjs";
import { l as DesignSystemPolicyReport } from "./model-BFKtS9b_.mjs";

//#region src/tooling/ownership/model.d.ts
/** Plain JSON-data contract for local design-system ownership metadata. */
declare const DESIGN_SYSTEM_OWNERSHIP_FORMAT: "crumbs.design-system-ownership";
declare const DESIGN_SYSTEM_OWNERSHIP_VERSION: 1;
declare const DESIGN_SYSTEM_OWNED_REPORT_FORMAT: "crumbs.design-system-owned-report";
declare const DESIGN_SYSTEM_OWNED_REPORT_VERSION: 1;
declare const OWNERSHIP_MAX_REPORT_REFERENCES: 100000;
declare const OWNERSHIP_ANALYSIS_LIMIT_CODES: readonly ["explicit-manifests-only", "manifest-unresolved-references", "report-subject-unresolved"];
type OwnershipAnalysisLimitCode = typeof OWNERSHIP_ANALYSIS_LIMIT_CODES[number];
declare const OWNERSHIP_UNRESOLVED_REASON_CODES: readonly ["stable-id-unavailable", "entity-not-in-supplied-manifests", "variable-name-ambiguous"];
type OwnershipUnresolvedReason = typeof OWNERSHIP_UNRESOLVED_REASON_CODES[number];
type OwnershipOwner = {
  readonly id: string;
  readonly displayName: string;
};
type OwnershipAssignment = {
  readonly entityId: string;
  readonly ownerId: string;
};
type DesignSystemOwnership = {
  readonly format: typeof DESIGN_SYSTEM_OWNERSHIP_FORMAT;
  readonly schemaVersion: typeof DESIGN_SYSTEM_OWNERSHIP_VERSION;
  readonly owners: ReadonlyArray<OwnershipOwner>;
  readonly assignments: ReadonlyArray<OwnershipAssignment>;
};
type OwnershipAttribution = {
  readonly jsonPointer: string;
  readonly entityId: string;
  readonly status: "assigned";
  readonly owner: OwnershipOwner;
} | {
  readonly jsonPointer: string;
  readonly entityId: string;
  readonly status: "unassigned";
} | {
  readonly jsonPointer: string;
  readonly entityId?: string;
  readonly status: "unresolved";
  readonly reason: OwnershipUnresolvedReason;
};
type OwnershipAnalysisLimit = {
  readonly code: OwnershipAnalysisLimitCode;
  readonly message: string;
};
type SupportedSourceReport = ManifestCompatibilityReport | DesignSystemPolicyReport | SourceMigrationReport | CrumbsDtcgImportResult | StyleExplanationReport;
type OwnedReport = {
  readonly format: typeof DESIGN_SYSTEM_OWNED_REPORT_FORMAT;
  readonly schemaVersion: typeof DESIGN_SYSTEM_OWNED_REPORT_VERSION;
  readonly source: {
    readonly format: string;
    readonly schemaVersion: number;
    readonly data: SupportedSourceReport;
  };
  readonly ownership: {
    readonly format: typeof DESIGN_SYSTEM_OWNERSHIP_FORMAT;
    readonly schemaVersion: typeof DESIGN_SYSTEM_OWNERSHIP_VERSION;
  };
  readonly attributions: ReadonlyArray<OwnershipAttribution>;
  readonly analysisLimits: ReadonlyArray<OwnershipAnalysisLimit>;
};
//#endregion
//#region src/tooling/ownership/schema.d.ts
/** Validate the strict v1 ownership document and return detached plain data. */
declare function decodeDesignSystemOwnership(input: unknown): DesignSystemOwnership;
/** Validate and detach the versioned ownership/report envelope. */
declare function decodeOwnedReport(input: unknown): OwnedReport;
//#endregion
//#region src/tooling/ownership/annotate.d.ts
/** Purely annotate a supported, versioned source report against explicit manifests. */
declare function annotateDesignSystemReport(input: {
  readonly ownership: DesignSystemOwnership;
  readonly manifests: ReadonlyArray<DesignSystemManifest>;
  readonly report: SupportedSourceReport;
}): OwnedReport;
//#endregion
//#region src/tooling/ownership/canonical-json.d.ts
/** Encode a validated owned report as recursively key-sorted JSON with one newline. */
declare function encodeCanonicalOwnedReport(input: unknown): string;
//#endregion
export { DESIGN_SYSTEM_OWNED_REPORT_FORMAT, DESIGN_SYSTEM_OWNED_REPORT_VERSION, DESIGN_SYSTEM_OWNERSHIP_FORMAT, DESIGN_SYSTEM_OWNERSHIP_VERSION, type DesignSystemOwnership, OWNERSHIP_ANALYSIS_LIMIT_CODES, OWNERSHIP_MAX_REPORT_REFERENCES, OWNERSHIP_UNRESOLVED_REASON_CODES, type OwnedReport, type OwnershipAnalysisLimit, type OwnershipAnalysisLimitCode, type OwnershipAssignment, type OwnershipAttribution, type OwnershipOwner, type OwnershipUnresolvedReason, type SupportedSourceReport, annotateDesignSystemReport, decodeDesignSystemOwnership, decodeOwnedReport, encodeCanonicalOwnedReport };