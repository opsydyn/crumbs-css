import { createHash } from "node:crypto"
import type { DesignSystemManifest } from "../manifest/model"
import { applySourceEdits, migrationDiagnosticAt, parseMigrationSource, type SourceEdit } from "./ast"
import { planComponentDeclarationEdits, planComponentExtensionEdits, planComponentResolverEdits } from "./component-codemod"
import { decodeSourceMigrationReport } from "./schema"
import type { SourceMigration, SourceMigrationDiagnostic, SourceMigrationPlan, SourceMigrationReport } from "./model"
import { planTokenReferenceEdits } from "./token-codemod"
import { validateSourceMigration } from "./validate"

type ExplicitSourceFile = {
  readonly path: string
  readonly source: string
}

type PlannedFile = {
  readonly path: string
  readonly source: string
  readonly tentativeSource: string
  readonly edits: ReadonlyArray<SourceEdit>
  readonly diagnostics: ReadonlyArray<SourceMigrationDiagnostic>
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function compareDiagnostics(left: SourceMigrationDiagnostic, right: SourceMigrationDiagnostic): number {
  return compareOrdinal(left.path ?? "", right.path ?? "") ||
    compareOrdinal(left.code, right.code) ||
    (left.line ?? 0) - (right.line ?? 0) ||
    (left.column ?? 0) - (right.column ?? 0) ||
    compareOrdinal(left.entityId ?? "", right.entityId ?? "") ||
    compareOrdinal(left.message, right.message)
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function deduplicateEdits(edits: ReadonlyArray<SourceEdit>): ReadonlyArray<SourceEdit> {
  const seen = new Set<string>()
  const unique: SourceEdit[] = []
  for (const edit of edits) {
    const key = [edit.start, edit.end, edit.replacement, edit.code].join("\u0000")
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(edit)
  }
  return unique.sort((left, right) =>
    left.start - right.start || left.end - right.end ||
    compareOrdinal(left.replacement, right.replacement) || compareOrdinal(left.code, right.code))
}

function deduplicateDiagnostics(diagnostics: ReadonlyArray<SourceMigrationDiagnostic>): ReadonlyArray<SourceMigrationDiagnostic> {
  const seen = new Set<string>()
  const unique: SourceMigrationDiagnostic[] = []
  for (const diagnostic of diagnostics) {
    const key = [
      diagnostic.code,
      diagnostic.path ?? "",
      diagnostic.line ?? "",
      diagnostic.column ?? "",
      diagnostic.entityId ?? "",
      diagnostic.message,
    ].join("\u0000")
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(diagnostic)
  }
  return unique.sort(compareDiagnostics)
}

/**
 * Plan explicit TypeScript source edits without filesystem access or writes.
 * A blocker anywhere in the invocation suppresses every tentative output.
 */
export function planSourceMigration(input: {
  readonly migration: SourceMigration
  readonly baseline: DesignSystemManifest
  readonly current: DesignSystemManifest
  readonly files: ReadonlyArray<ExplicitSourceFile>
}): SourceMigrationPlan {
  const validated = validateSourceMigration({
    migration: input.migration,
    baseline: input.baseline,
    current: input.current,
  })

  const plannedFiles: PlannedFile[] = input.files.map(file => {
    const parsed = parseMigrationSource(file.path, file.source)
    if (parsed.diagnostics.length > 0) {
      return {
        path: file.path,
        source: file.source,
        tentativeSource: file.source,
        edits: [],
        diagnostics: parsed.diagnostics,
      }
    }

    const token = planTokenReferenceEdits({ parsed, validated })
    const declaration = planComponentDeclarationEdits({ parsed, validated })
    const extension = planComponentExtensionEdits({ parsed, validated })
    const resolver = planComponentResolverEdits({ parsed, validated })
    const edits = deduplicateEdits([
      ...token.edits,
      ...declaration.edits,
      ...extension.edits,
      ...resolver.edits,
    ])
    const diagnostics = [
      ...token.diagnostics,
      ...declaration.diagnostics,
      ...extension.diagnostics,
      ...resolver.diagnostics,
    ]
    let tentativeSource = file.source
    try {
      tentativeSource = applySourceEdits(file.source, edits)
    } catch (error) {
      diagnostics.push(migrationDiagnosticAt(
        parsed,
        undefined,
        "source.unsupported-syntax",
        error instanceof Error ? error.message : "Combined source migration edits could not be applied safely.",
      ))
    }
    return { path: file.path, source: file.source, tentativeSource, edits, diagnostics }
  })

  const diagnostics = deduplicateDiagnostics(plannedFiles.flatMap(file => file.diagnostics))
  const blocked = diagnostics.length > 0
  const orderedFiles = [...plannedFiles].sort((left, right) =>
    compareOrdinal(left.path, right.path) ||
    compareOrdinal(sha256(left.source), sha256(right.source)))
  const outputs = orderedFiles.map(file => {
    const source = blocked ? file.source : file.tentativeSource
    return { path: file.path, source, changed: !blocked && source !== file.source }
  })
  const reports = orderedFiles.map(file => {
    const after = blocked ? file.source : file.tentativeSource
    return {
      path: file.path,
      status: blocked ? "blocked" as const : after === file.source ? "unchanged" as const : "ready" as const,
      beforeSha256: sha256(file.source),
      afterSha256: sha256(after),
      proposedEditCount: file.edits.length,
      appliedEditCount: 0,
    }
  })

  const report: SourceMigrationReport = {
    format: "crumbs.source-migration-report",
    schemaVersion: 1,
    migration: { id: validated.migration.id, revision: validated.migration.revision },
    provider: {
      name: validated.migration.provider,
      baselineVersion: validated.baseline.package.version,
      currentVersion: validated.current.package.version,
    },
    files: reports,
    diagnostics,
    analysisLimits: [{
      code: "explicit-files-only",
      message: "Only caller-supplied source files were analyzed; no repository discovery or omitted-file coverage is implied.",
    }],
  }

  return { report: decodeSourceMigrationReport(report), outputs }
}
