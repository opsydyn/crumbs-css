import { decodeSourceMigrationReport } from "./schema"
import type { SourceMigrationDiagnostic, SourceMigrationReport } from "./model"

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function compareDiagnostics(left: SourceMigrationDiagnostic, right: SourceMigrationDiagnostic): number {
  return compareOrdinal(left.code, right.code) ||
    compareOrdinal(left.path ?? "", right.path ?? "") ||
    (left.line ?? 0) - (right.line ?? 0) ||
    (left.column ?? 0) - (right.column ?? 0) ||
    compareOrdinal(left.entityId ?? "", right.entityId ?? "") ||
    compareOrdinal(left.message, right.message)
}

function sortJsonObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonObjectKeys)
  if (value === null || typeof value !== "object") return value
  const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>
  for (const key of Object.keys(value).sort(compareOrdinal)) {
    Object.defineProperty(output, key, {
      value: sortJsonObjectKeys((value as Record<string, unknown>)[key]),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return output
}

function canonicalReport(report: SourceMigrationReport): SourceMigrationReport {
  return {
    ...report,
    files: [...report.files].sort((left, right) =>
      compareOrdinal(left.path, right.path) ||
      compareOrdinal(left.beforeSha256, right.beforeSha256) ||
      compareOrdinal(left.afterSha256, right.afterSha256)),
    diagnostics: [...report.diagnostics].sort(compareDiagnostics),
    analysisLimits: [...report.analysisLimits].sort((left, right) =>
      compareOrdinal(left.code, right.code) || compareOrdinal(left.message, right.message)),
  }
}

/** Encode a validated source migration report as compact recursively key-sorted JSON. */
export function encodeCanonicalSourceMigrationReport(input: unknown): string {
  const report = decodeSourceMigrationReport(input)
  return `${JSON.stringify(sortJsonObjectKeys(canonicalReport(report)))}\n`
}
