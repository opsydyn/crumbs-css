/** Plain JSON-data types for the versioned manifest compatibility report. */
export const MANIFEST_COMPATIBILITY_REPORT_FORMAT = "crumbs.design-system-compatibility-report" as const
export const MANIFEST_COMPATIBILITY_REPORT_VERSION = 1 as const

export type ManifestReportJson = null | boolean | number | string | ReadonlyArray<ManifestReportJson> | {
  readonly [key: string]: ManifestReportJson
}

export type ManifestCompatibilityReportMode = "check" | "compare"

export type ManifestCompatibilityFindingCode =
  | "token.removed"
  | "token.domain-changed"
  | "token.visibility-reduced"
  | "token.added"
  | "component.removed"
  | "component.slot-removed"
  | "component.variant-removed"
  | "component.default-changed"
  | "component.added"
  | "component.slot-added"
  | "component.variant-added"
  | "consumer.private-token-dependency"

export type ManifestCompatibilityFindingLevel = "error" | "warning" | "info"

export type ManifestAnalysisLimitCode =
  | "explicit-coverage"
  | "unresolved-references"
  | "component-use-unavailable"
  | "consumer-manifests-not-supplied"

export type ManifestConsumerReference = {
  readonly package: {
    readonly name: string
    readonly version: string
  }
  readonly dependency: {
    readonly from: string
    readonly to: string
    readonly kind: "token-alias" | "style-token"
    readonly origin?: {
      readonly moduleId: string
      readonly exportPath: string
      readonly property?: string
    }
  }
}

export type ManifestCompatibilityFinding = {
  readonly code: ManifestCompatibilityFindingCode
  readonly level: ManifestCompatibilityFindingLevel
  readonly entityId: string
  readonly fieldPath: string
  readonly message: string
  readonly before?: ManifestReportJson
  readonly after?: ManifestReportJson
  readonly affectedConsumers: ReadonlyArray<ManifestConsumerReference>
}

export type ManifestAnalysisLimit = {
  readonly code: ManifestAnalysisLimitCode
  readonly message: string
}

export type ManifestCompatibilityReport = {
  readonly format: typeof MANIFEST_COMPATIBILITY_REPORT_FORMAT
  readonly schemaVersion: typeof MANIFEST_COMPATIBILITY_REPORT_VERSION
  readonly mode: ManifestCompatibilityReportMode
  readonly provider: {
    readonly name: string
    readonly baselineVersion?: string
    readonly currentVersion: string
  }
  readonly suppliedConsumers: ReadonlyArray<{
    readonly name: string
    readonly version: string
  }>
  readonly findings: ReadonlyArray<ManifestCompatibilityFinding>
  readonly analysisLimits: ReadonlyArray<ManifestAnalysisLimit>
}
