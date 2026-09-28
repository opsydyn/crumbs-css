/**
 * Opt-in, TypeScript-backed source migration tooling.
 *
 * This entry intentionally exposes only plain data contracts and operations;
 * Effect Schema codecs and TypeScript AST implementation details stay private.
 */
export {
  SOURCE_MIGRATION_DIAGNOSTIC_CODES,
  SOURCE_MIGRATION_FORMAT,
  SOURCE_MIGRATION_REPORT_FORMAT,
  SOURCE_MIGRATION_REPORT_VERSION,
  SOURCE_MIGRATION_VERSION,
} from "./migrations/model"
export type {
  SourceComponentMigration,
  SourceImportBinding,
  SourceMigration,
  SourceMigrationAnalysisLimit,
  SourceMigrationDiagnostic,
  SourceMigrationDiagnosticCode,
  SourceMigrationFileReport,
  SourceMigrationFileStatus,
  SourceMigrationPlan,
  SourceMigrationReport,
  SourceTokenMigration,
} from "./migrations/model"
export { decodeSourceMigration, decodeSourceMigrationReport } from "./migrations/schema"
export { encodeCanonicalSourceMigrationReport } from "./migrations/canonical-json"
export { planSourceMigration } from "./migrations/plan"
