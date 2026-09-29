import type { StyleExplanationReport } from "../../devtools/style-explanation-model"
import type { CrumbsDtcgImportResult } from "../dtcg/model"
import type { ManifestCompatibilityReport } from "../manifest/comparison-report-model"
import type { SourceMigrationReport } from "../migrations/model"
import type { DesignSystemPolicyReport } from "../policy/model"

/** Plain JSON-data contract for local design-system ownership metadata. */
export const DESIGN_SYSTEM_OWNERSHIP_FORMAT = "crumbs.design-system-ownership" as const
export const DESIGN_SYSTEM_OWNERSHIP_VERSION = 1 as const
export const DESIGN_SYSTEM_OWNED_REPORT_FORMAT = "crumbs.design-system-owned-report" as const
export const DESIGN_SYSTEM_OWNED_REPORT_VERSION = 1 as const
export const OWNERSHIP_MAX_REPORT_REFERENCES = 100_000 as const

export const OWNERSHIP_ANALYSIS_LIMIT_CODES = [
  "explicit-manifests-only",
  "manifest-unresolved-references",
  "report-subject-unresolved",
] as const
export type OwnershipAnalysisLimitCode = typeof OWNERSHIP_ANALYSIS_LIMIT_CODES[number]

export const OWNERSHIP_UNRESOLVED_REASON_CODES = [
  "stable-id-unavailable",
  "entity-not-in-supplied-manifests",
  "variable-name-ambiguous",
] as const
export type OwnershipUnresolvedReason = typeof OWNERSHIP_UNRESOLVED_REASON_CODES[number]

export type OwnershipOwner = {
  readonly id: string
  readonly displayName: string
}

export type OwnershipAssignment = {
  readonly entityId: string
  readonly ownerId: string
}

export type DesignSystemOwnership = {
  readonly format: typeof DESIGN_SYSTEM_OWNERSHIP_FORMAT
  readonly schemaVersion: typeof DESIGN_SYSTEM_OWNERSHIP_VERSION
  readonly owners: ReadonlyArray<OwnershipOwner>
  readonly assignments: ReadonlyArray<OwnershipAssignment>
}

export type OwnershipAttribution =
  | {
    readonly jsonPointer: string
    readonly entityId: string
    readonly status: "assigned"
    readonly owner: OwnershipOwner
  }
  | {
    readonly jsonPointer: string
    readonly entityId: string
    readonly status: "unassigned"
  }
  | {
    readonly jsonPointer: string
    readonly entityId?: string
    readonly status: "unresolved"
    readonly reason: OwnershipUnresolvedReason
  }

export type OwnershipAnalysisLimit = {
  readonly code: OwnershipAnalysisLimitCode
  readonly message: string
}

export type SupportedSourceReport =
  | ManifestCompatibilityReport
  | DesignSystemPolicyReport
  | SourceMigrationReport
  | CrumbsDtcgImportResult
  | StyleExplanationReport

export type OwnedReport = {
  readonly format: typeof DESIGN_SYSTEM_OWNED_REPORT_FORMAT
  readonly schemaVersion: typeof DESIGN_SYSTEM_OWNED_REPORT_VERSION
  readonly source: {
    readonly format: string
    readonly schemaVersion: number
    readonly data: SupportedSourceReport
  }
  readonly ownership: {
    readonly format: typeof DESIGN_SYSTEM_OWNERSHIP_FORMAT
    readonly schemaVersion: typeof DESIGN_SYSTEM_OWNERSHIP_VERSION
  }
  readonly attributions: ReadonlyArray<OwnershipAttribution>
  readonly analysisLimits: ReadonlyArray<OwnershipAnalysisLimit>
}
