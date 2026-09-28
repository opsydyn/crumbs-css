import * as Schema from "effect/Schema"
import { makeDataCodec } from "../../contracts/data-codec"
import type { DataCodec } from "../../contracts/data-codec"
import {
  SOURCE_MIGRATION_DIAGNOSTIC_CODES,
  SOURCE_MIGRATION_FORMAT,
  SOURCE_MIGRATION_REPORT_FORMAT,
  SOURCE_MIGRATION_REPORT_VERSION,
  SOURCE_MIGRATION_VERSION,
  type SourceMigration,
  type SourceMigrationReport,
} from "./model"

const IdentifierText = Schema.NonEmptyString.check(Schema.makeFilter<string>(value =>
  value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value)))
const PackageName = Schema.String.check(Schema.isPattern(/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/))
const SemVer = Schema.String.check(Schema.isPattern(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|1|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/))
const PositiveSafeInteger = Schema.Finite.check(Schema.makeFilter<number>(value => Number.isSafeInteger(value) && value > 0))
const NonNegativeSafeInteger = Schema.Finite.check(Schema.makeFilter<number>(value => Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0)))
const ImportName = Schema.String.check(Schema.isPattern(/^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u))
const RelativeDisplayPath = Schema.String.check(Schema.makeFilter<string>(value =>
  value.length > 0 && value === value.trim() && !value.startsWith("/") && !/^[A-Za-z]:/u.test(value) &&
  !value.includes("\\") && !/[\u0000-\u001f\u007f]/u.test(value)))
const Sha256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u))
const SourceImportBindingSchema = Schema.Struct({
  moduleSpecifier: IdentifierText,
  importedName: ImportName,
})
const SourceTokenMigrationSchema = Schema.Struct({
  fromId: IdentifierText,
  toId: IdentifierText,
  fromImport: SourceImportBindingSchema,
  toImport: SourceImportBindingSchema,
}).check(Schema.makeFilter(value => value.fromId !== value.toId))
const SourceComponentMigrationSchema = Schema.Struct({
  fromId: IdentifierText,
  toId: IdentifierText,
  fromImport: SourceImportBindingSchema,
  toImport: SourceImportBindingSchema,
  slots: Schema.Record(IdentifierText, IdentifierText),
}).check(Schema.makeFilter(value => value.fromId !== value.toId))
const SourceMigrationSchema = Schema.Struct({
  format: Schema.Literal(SOURCE_MIGRATION_FORMAT),
  schemaVersion: Schema.Literal(SOURCE_MIGRATION_VERSION),
  id: IdentifierText,
  revision: PositiveSafeInteger,
  provider: PackageName,
  tokens: Schema.Array(SourceTokenMigrationSchema),
  components: Schema.Array(SourceComponentMigrationSchema),
})

const SourceMigrationDiagnosticCodeSchema = Schema.Literals(SOURCE_MIGRATION_DIAGNOSTIC_CODES)
const SourceMigrationFileSchema = Schema.Struct({
  path: RelativeDisplayPath,
  status: Schema.Literals(["unchanged", "ready", "blocked", "written", "write-failed"]),
  beforeSha256: Sha256,
  afterSha256: Sha256,
  proposedEditCount: NonNegativeSafeInteger,
  appliedEditCount: NonNegativeSafeInteger,
})
const SourceMigrationDiagnosticSchema = Schema.Struct({
  code: SourceMigrationDiagnosticCodeSchema,
  message: IdentifierText,
  path: Schema.optionalKey(RelativeDisplayPath),
  line: Schema.optionalKey(PositiveSafeInteger),
  column: Schema.optionalKey(PositiveSafeInteger),
  entityId: Schema.optionalKey(IdentifierText),
})
const SourceMigrationAnalysisLimitSchema = Schema.Struct({
  code: Schema.Literal("explicit-files-only"),
  message: IdentifierText,
})
const SourceMigrationReportSchema = Schema.Struct({
  format: Schema.Literal(SOURCE_MIGRATION_REPORT_FORMAT),
  schemaVersion: Schema.Literal(SOURCE_MIGRATION_REPORT_VERSION),
  migration: Schema.Struct({ id: IdentifierText, revision: PositiveSafeInteger }),
  provider: Schema.Struct({ name: PackageName, baselineVersion: SemVer, currentVersion: SemVer }),
  files: Schema.Array(SourceMigrationFileSchema),
  diagnostics: Schema.Array(SourceMigrationDiagnosticSchema),
  analysisLimits: Schema.Array(SourceMigrationAnalysisLimitSchema),
})

const sourceMigrationCodec = makeDataCodec("source migration v1", SourceMigrationSchema)
const sourceMigrationReportCodec = makeDataCodec("source migration report v1", SourceMigrationReportSchema)

function decodeWith<T>(codec: DataCodec<T>, input: unknown, boundary: string): T {
  const decoded = codec.decode(input)
  if (decoded.ok) return decoded.value
  const detail = decoded.issues.map(issue => {
    const path = issue.path.length === 0 ? "<root>" : issue.path.join(".")
    return `${path}: ${issue.message}`
  }).join("; ")
  throw new TypeError(`Invalid ${boundary}: ${detail}`)
}

function bindingKey(binding: { readonly moduleSpecifier: string; readonly importedName: string }): string {
  return `${binding.moduleSpecifier}\u0000${binding.importedName}`
}

function targetKey(binding: { readonly moduleSpecifier: string; readonly importedName: string }): string {
  return `${binding.moduleSpecifier}\u0000${binding.importedName}`
}

/** Decode the strict, versioned migration map and reject duplicate or conflicting edits. */
export function decodeSourceMigration(input: unknown): SourceMigration {
  const migration = decodeWith(sourceMigrationCodec, input, "source migration")
  if (migration.tokens.length + migration.components.length === 0) {
    throw new TypeError("Invalid source migration: at least one token or component mapping is required.")
  }

  const seenTokenIds = new Set<string>()
  for (const item of migration.tokens) {
    if (seenTokenIds.has(item.fromId)) throw new TypeError(`Invalid source migration: duplicate token mapping for ${JSON.stringify(item.fromId)}.`)
    seenTokenIds.add(item.fromId)
  }
  const seenComponentIds = new Set<string>()
  for (const item of migration.components) {
    if (seenComponentIds.has(item.fromId)) throw new TypeError(`Invalid source migration: duplicate component mapping for ${JSON.stringify(item.fromId)}.`)
    seenComponentIds.add(item.fromId)
  }

  const targetsByBinding = new Map<string, string>()
  for (const item of [...migration.tokens, ...migration.components]) {
    const source = bindingKey(item.fromImport)
    const target = targetKey(item.toImport)
    const existing = targetsByBinding.get(source)
    if (existing !== undefined && existing !== target) {
      throw new TypeError(`Invalid source migration: conflicting target import for source binding ${JSON.stringify(item.fromImport.moduleSpecifier)}#${item.fromImport.importedName}.`)
    }
    targetsByBinding.set(source, target)
  }
  return migration
}

/** Decode a strict, versioned migration report. */
export function decodeSourceMigrationReport(input: unknown): SourceMigrationReport {
  const report = decodeWith(sourceMigrationReportCodec, input, "source migration report")
  if (!report.analysisLimits.some(limit => limit.code === "explicit-files-only")) {
    throw new TypeError("Invalid source migration report: explicit-files-only analysis limit is required.")
  }
  return report
}
