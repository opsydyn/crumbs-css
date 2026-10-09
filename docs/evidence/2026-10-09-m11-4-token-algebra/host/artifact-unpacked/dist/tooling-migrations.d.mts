import { r as DesignSystemManifest } from "./model-BQg2TFpj.mjs";
import { a as SOURCE_MIGRATION_VERSION, c as SourceMigration, d as SourceMigrationDiagnosticCode, f as SourceMigrationFileReport, g as SourceTokenMigration, h as SourceMigrationReport, i as SOURCE_MIGRATION_REPORT_VERSION, l as SourceMigrationAnalysisLimit, m as SourceMigrationPlan, n as SOURCE_MIGRATION_FORMAT, o as SourceComponentMigration, p as SourceMigrationFileStatus, r as SOURCE_MIGRATION_REPORT_FORMAT, s as SourceImportBinding, t as SOURCE_MIGRATION_DIAGNOSTIC_CODES, u as SourceMigrationDiagnostic } from "./model-C_6ciavk.mjs";

//#region src/tooling/migrations/schema.d.ts
/** Decode the strict, versioned migration map and reject duplicate or conflicting edits. */
declare function decodeSourceMigration(input: unknown): SourceMigration;
/** Decode a strict, versioned migration report. */
declare function decodeSourceMigrationReport(input: unknown): SourceMigrationReport;
//#endregion
//#region src/tooling/migrations/canonical-json.d.ts
/** Encode a validated source migration report as compact recursively key-sorted JSON. */
declare function encodeCanonicalSourceMigrationReport(input: unknown): string;
//#endregion
//#region src/tooling/migrations/plan.d.ts
type ExplicitSourceFile = {
  readonly path: string;
  readonly source: string;
};
/**
 * Plan explicit TypeScript source edits without filesystem access or writes.
 * A blocker anywhere in the invocation suppresses every tentative output.
 */
declare function planSourceMigration(input: {
  readonly migration: SourceMigration;
  readonly baseline: DesignSystemManifest;
  readonly current: DesignSystemManifest;
  readonly files: ReadonlyArray<ExplicitSourceFile>;
}): SourceMigrationPlan;
//#endregion
export { SOURCE_MIGRATION_DIAGNOSTIC_CODES, SOURCE_MIGRATION_FORMAT, SOURCE_MIGRATION_REPORT_FORMAT, SOURCE_MIGRATION_REPORT_VERSION, SOURCE_MIGRATION_VERSION, type SourceComponentMigration, type SourceImportBinding, type SourceMigration, type SourceMigrationAnalysisLimit, type SourceMigrationDiagnostic, type SourceMigrationDiagnosticCode, type SourceMigrationFileReport, type SourceMigrationFileStatus, type SourceMigrationPlan, type SourceMigrationReport, type SourceTokenMigration, decodeSourceMigration, decodeSourceMigrationReport, encodeCanonicalSourceMigrationReport, planSourceMigration };