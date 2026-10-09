//#region src/tooling/migrations/model.d.ts
/** Plain JSON-data contracts for opt-in source migrations. */
declare const SOURCE_MIGRATION_FORMAT: "crumbs.source-migration";
declare const SOURCE_MIGRATION_VERSION: 1;
declare const SOURCE_MIGRATION_REPORT_FORMAT: "crumbs.source-migration-report";
declare const SOURCE_MIGRATION_REPORT_VERSION: 1;
declare const SOURCE_MIGRATION_DIAGNOSTIC_CODES: readonly ["source.parse-error", "source.unsupported-syntax", "source.ambiguous-binding", "token.contract-path-unmapped", "component.origin-ambiguous", "component.resolver-unresolved", "io.read-failed", "io.write-failed"];
type SourceMigrationDiagnosticCode = typeof SOURCE_MIGRATION_DIAGNOSTIC_CODES[number];
type SourceImportBinding = {
  readonly moduleSpecifier: string;
  readonly importedName: string;
};
type SourceTokenMigration = {
  readonly fromId: string;
  readonly toId: string;
  readonly fromImport: SourceImportBinding;
  readonly toImport: SourceImportBinding;
};
type SourceComponentMigration = {
  readonly fromId: string;
  readonly toId: string;
  readonly fromImport: SourceImportBinding;
  readonly toImport: SourceImportBinding;
  readonly slots: Readonly<Record<string, string>>;
};
type SourceMigration = {
  readonly format: typeof SOURCE_MIGRATION_FORMAT;
  readonly schemaVersion: typeof SOURCE_MIGRATION_VERSION;
  readonly id: string;
  readonly revision: number;
  readonly provider: string;
  readonly tokens: ReadonlyArray<SourceTokenMigration>;
  readonly components: ReadonlyArray<SourceComponentMigration>;
};
type SourceMigrationFileStatus = "unchanged" | "ready" | "blocked" | "written" | "write-failed";
type SourceMigrationFileReport = {
  readonly path: string;
  readonly status: SourceMigrationFileStatus;
  readonly beforeSha256: string;
  readonly afterSha256: string;
  readonly proposedEditCount: number;
  readonly appliedEditCount: number;
};
type SourceMigrationDiagnostic = {
  readonly code: SourceMigrationDiagnosticCode;
  readonly message: string;
  readonly path?: string;
  readonly line?: number;
  readonly column?: number;
  readonly entityId?: string;
};
type SourceMigrationAnalysisLimit = {
  readonly code: "explicit-files-only";
  readonly message: string;
};
type SourceMigrationReport = {
  readonly format: typeof SOURCE_MIGRATION_REPORT_FORMAT;
  readonly schemaVersion: typeof SOURCE_MIGRATION_REPORT_VERSION;
  readonly migration: {
    readonly id: string;
    readonly revision: number;
  };
  readonly provider: {
    readonly name: string;
    readonly baselineVersion: string;
    readonly currentVersion: string;
  };
  readonly files: ReadonlyArray<SourceMigrationFileReport>;
  readonly diagnostics: ReadonlyArray<SourceMigrationDiagnostic>;
  readonly analysisLimits: ReadonlyArray<SourceMigrationAnalysisLimit>;
};
type SourceMigrationPlan = {
  readonly report: SourceMigrationReport;
  readonly outputs: ReadonlyArray<{
    readonly path: string;
    readonly source: string;
    readonly changed: boolean;
  }>;
};
//#endregion
export { SOURCE_MIGRATION_VERSION as a, SourceMigration as c, SourceMigrationDiagnosticCode as d, SourceMigrationFileReport as f, SourceTokenMigration as g, SourceMigrationReport as h, SOURCE_MIGRATION_REPORT_VERSION as i, SourceMigrationAnalysisLimit as l, SourceMigrationPlan as m, SOURCE_MIGRATION_FORMAT as n, SourceComponentMigration as o, SourceMigrationFileStatus as p, SOURCE_MIGRATION_REPORT_FORMAT as r, SourceImportBinding as s, SOURCE_MIGRATION_DIAGNOSTIC_CODES as t, SourceMigrationDiagnostic as u };