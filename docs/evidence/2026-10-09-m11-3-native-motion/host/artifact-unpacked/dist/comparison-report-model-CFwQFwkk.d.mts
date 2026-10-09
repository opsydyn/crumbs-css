//#region src/tooling/manifest/comparison-report-model.d.ts
/** Plain JSON-data types for the versioned manifest compatibility report. */
declare const MANIFEST_COMPATIBILITY_REPORT_FORMAT: "crumbs.design-system-compatibility-report";
declare const MANIFEST_COMPATIBILITY_REPORT_VERSION: 2;
type ManifestReportJson = null | boolean | number | string | ReadonlyArray<ManifestReportJson> | {
  readonly [key: string]: ManifestReportJson;
};
type ManifestCompatibilityReportMode = "check" | "compare";
type ManifestCompatibilityFindingCode = "token.removed" | "token.domain-changed" | "token.alias-changed" | "token.visibility-reduced" | "token.added" | "component.removed" | "component.slot-removed" | "component.variant-removed" | "component.default-changed" | "component.added" | "component.slot-added" | "component.variant-added" | "consumer.private-token-dependency";
type ManifestCompatibilityFindingLevel = "error" | "warning" | "info";
type ManifestAnalysisLimitCode = "explicit-coverage" | "unresolved-references" | "component-use-unavailable" | "consumer-manifests-not-supplied";
type ManifestConsumerReference = {
  readonly package: {
    readonly name: string;
    readonly version: string;
  };
  readonly dependency: {
    readonly from: string;
    readonly to: string;
    readonly kind: "token-alias" | "style-token";
    readonly origin?: {
      readonly moduleId: string;
      readonly exportPath: string;
      readonly property?: string;
    };
  };
};
type ManifestCompatibilityFinding = {
  readonly code: ManifestCompatibilityFindingCode;
  readonly level: ManifestCompatibilityFindingLevel;
  readonly entityId: string;
  readonly fieldPath: string;
  readonly message: string;
  readonly before?: ManifestReportJson;
  readonly after?: ManifestReportJson;
  readonly affectedConsumers: ReadonlyArray<ManifestConsumerReference>;
};
type ManifestAnalysisLimit = {
  readonly code: ManifestAnalysisLimitCode;
  readonly message: string;
};
type ManifestCompatibilityReport = {
  readonly format: typeof MANIFEST_COMPATIBILITY_REPORT_FORMAT;
  readonly schemaVersion: typeof MANIFEST_COMPATIBILITY_REPORT_VERSION;
  readonly mode: ManifestCompatibilityReportMode;
  readonly provider: {
    readonly name: string;
    readonly baselineVersion?: string;
    readonly currentVersion: string;
  };
  readonly suppliedConsumers: ReadonlyArray<{
    readonly name: string;
    readonly version: string;
  }>;
  readonly findings: ReadonlyArray<ManifestCompatibilityFinding>;
  readonly analysisLimits: ReadonlyArray<ManifestAnalysisLimit>;
};
//#endregion
export { ManifestCompatibilityFinding as a, ManifestCompatibilityReport as c, ManifestReportJson as d, ManifestAnalysisLimitCode as i, ManifestCompatibilityReportMode as l, MANIFEST_COMPATIBILITY_REPORT_VERSION as n, ManifestCompatibilityFindingCode as o, ManifestAnalysisLimit as r, ManifestCompatibilityFindingLevel as s, MANIFEST_COMPATIBILITY_REPORT_FORMAT as t, ManifestConsumerReference as u };