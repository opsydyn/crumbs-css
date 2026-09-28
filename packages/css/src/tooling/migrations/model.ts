/** Plain JSON-data contracts for opt-in source migrations. */
export const SOURCE_MIGRATION_FORMAT = "crumbs.source-migration" as const
export const SOURCE_MIGRATION_VERSION = 1 as const
export const SOURCE_MIGRATION_REPORT_FORMAT = "crumbs.source-migration-report" as const
export const SOURCE_MIGRATION_REPORT_VERSION = 1 as const

export const SOURCE_MIGRATION_DIAGNOSTIC_CODES = [
  "source.parse-error",
  "source.unsupported-syntax",
  "source.ambiguous-binding",
  "token.contract-path-unmapped",
  "component.origin-ambiguous",
  "component.resolver-unresolved",
  "io.read-failed",
  "io.write-failed",
] as const

export type SourceMigrationDiagnosticCode = typeof SOURCE_MIGRATION_DIAGNOSTIC_CODES[number]

export type SourceImportBinding = {
  readonly moduleSpecifier: string
  readonly importedName: string
}

export type SourceTokenMigration = {
  readonly fromId: string
  readonly toId: string
  readonly fromImport: SourceImportBinding
  readonly toImport: SourceImportBinding
}

export type SourceComponentMigration = {
  readonly fromId: string
  readonly toId: string
  readonly fromImport: SourceImportBinding
  readonly toImport: SourceImportBinding
  readonly slots: Readonly<Record<string, string>>
}

export type SourceMigration = {
  readonly format: typeof SOURCE_MIGRATION_FORMAT
  readonly schemaVersion: typeof SOURCE_MIGRATION_VERSION
  readonly id: string
  readonly revision: number
  readonly provider: string
  readonly tokens: ReadonlyArray<SourceTokenMigration>
  readonly components: ReadonlyArray<SourceComponentMigration>
}

export type SourceMigrationFileStatus = "unchanged" | "ready" | "blocked" | "written" | "write-failed"

export type SourceMigrationFileReport = {
  readonly path: string
  readonly status: SourceMigrationFileStatus
  readonly beforeSha256: string
  readonly afterSha256: string
  readonly proposedEditCount: number
  readonly appliedEditCount: number
}

export type SourceMigrationDiagnostic = {
  readonly code: SourceMigrationDiagnosticCode
  readonly message: string
  readonly path?: string
  readonly line?: number
  readonly column?: number
  readonly entityId?: string
}

export type SourceMigrationAnalysisLimit = {
  readonly code: "explicit-files-only"
  readonly message: string
}

export type SourceMigrationReport = {
  readonly format: typeof SOURCE_MIGRATION_REPORT_FORMAT
  readonly schemaVersion: typeof SOURCE_MIGRATION_REPORT_VERSION
  readonly migration: { readonly id: string; readonly revision: number }
  readonly provider: {
    readonly name: string
    readonly baselineVersion: string
    readonly currentVersion: string
  }
  readonly files: ReadonlyArray<SourceMigrationFileReport>
  readonly diagnostics: ReadonlyArray<SourceMigrationDiagnostic>
  readonly analysisLimits: ReadonlyArray<SourceMigrationAnalysisLimit>
}

export type SourceMigrationPlan = {
  readonly report: SourceMigrationReport
  readonly outputs: ReadonlyArray<{ readonly path: string; readonly source: string; readonly changed: boolean }>
}
