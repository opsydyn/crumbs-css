import { createHash } from "node:crypto"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { executeSourceMigrationCommand } from "./m9-5-migrations"
import {
  SOURCE_MIGRATION_FORMAT,
  SOURCE_MIGRATION_VERSION,
  type SourceMigrationReport,
} from "../packages/css/src/tooling/migrations/model"

const repositoryRoot = resolve(import.meta.dir, "..")
const fixtureRoot = resolve(repositoryRoot, "packages/css/fixtures/m9-5-migrations")
const evidenceDirectory = "docs/evidence/2026-09-28-m9-5-safe-migrations"
const reportPath = `${evidenceDirectory}/dry-run-report-v1.json`
const receiptPath = `${evidenceDirectory}/qualification.json`
const fixturePaths = [
  "baseline.json",
  "current.json",
  "migration.json",
  "src/blocked-consumer.tsx",
  "src/consumer.tsx",
  "src/not-listed.ts",
] as const
const sourcePath = "src/consumer.tsx"
const blockedSourcePath = "src/blocked-consumer.tsx"
const notListedSourcePath = "src/not-listed.ts"

export type MigrationQualification = Readonly<{
  reportJson: string
  receiptJson: string
  writeOutputs: ReadonlyArray<Readonly<{ path: string; source: string }>>
}>

type Fixture = Readonly<{ path: string; bytes: Buffer }>
type SuccessfulRun = Readonly<{
  report: SourceMigrationReport
  reportJson: string
  writeReport: SourceMigrationReport
  writeReportJson: string
  sourceBefore: Buffer
  sourceAfter: Buffer
  notListedBefore: Buffer
  notListedAfter: Buffer
  output: string
}>

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

function loadFixtures(): ReadonlyArray<Fixture> {
  return fixturePaths.map(path => ({ path, bytes: readFileSync(resolve(fixtureRoot, path)) }))
}

function stageFixtures(root: string, fixtures: ReadonlyArray<Fixture>): void {
  for (const fixture of fixtures) {
    const destination = resolve(root, fixture.path)
    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, fixture.bytes)
  }
}

function sourceArgs(filePaths: ReadonlyArray<string>, write: boolean): string[] {
  return [
    "--migration", "migration.json",
    "--baseline", "baseline.json",
    "--current", "current.json",
    ...filePaths.flatMap(filePath => ["--file", filePath]),
    ...(write ? ["--write"] : []),
    "--format", "json",
  ]
}

function requireReport(
  execution: ReturnType<typeof executeSourceMigrationCommand>,
  expectedExitCode: 0 | 1,
  phase: string,
): Readonly<{ report: SourceMigrationReport; reportJson: string }> {
  if (execution.exitCode !== expectedExitCode || execution.report === undefined || execution.stdout.length === 0) {
    throw new Error(`M9.5 ${phase} fixture qualification did not produce its expected report.`)
  }
  return { report: execution.report, reportJson: execution.stdout }
}

function totalEdits(report: SourceMigrationReport, field: "proposedEditCount" | "appliedEditCount"): number {
  return report.files.reduce((sum, file) => sum + file[field], 0)
}

function encodeStableJson(value: unknown): string {
  return `${JSON.stringify(sortJsonKeys(value), null, 2)}\n`
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys)
  if (value === null || typeof value !== "object") return value
  const record = value as Record<string, unknown>
  return Object.fromEntries(Object.keys(record).sort().map(key => [key, sortJsonKeys(record[key])]))
}

function qualifySuccessfulRun(fixtures: ReadonlyArray<Fixture>): SuccessfulRun {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "crumbs-css-m9-5-qualify-"))
  try {
    stageFixtures(temporaryRoot, fixtures)
    const sourceAbsolute = resolve(temporaryRoot, sourcePath)
    const notListedAbsolute = resolve(temporaryRoot, notListedSourcePath)
    const sourceBefore = readFileSync(sourceAbsolute)
    const notListedBefore = readFileSync(notListedAbsolute)
    const dry = executeSourceMigrationCommand(sourceArgs([sourcePath], false), { cwd: temporaryRoot })
    const dryResult = requireReport(dry, 0, "dry-run")
    const sourceAfterDryRun = readFileSync(sourceAbsolute)
    const notListedAfterDryRun = readFileSync(notListedAbsolute)
    if (!sourceBefore.equals(sourceAfterDryRun) || !notListedBefore.equals(notListedAfterDryRun)) {
      throw new Error("M9.5 dry-run changed an explicit or unlisted fixture source.")
    }
    if (dryResult.report.files.length !== 1 || dryResult.report.files[0]?.path !== sourcePath ||
      dryResult.report.files[0]?.status !== "ready" || totalEdits(dryResult.report, "proposedEditCount") === 0) {
      throw new Error("M9.5 safe fixture did not qualify a proposed token and recipe migration.")
    }

    const written = executeSourceMigrationCommand(sourceArgs([sourcePath], true), { cwd: temporaryRoot })
    const writeResult = requireReport(written, 0, "write")
    const output = readFileSync(sourceAbsolute, "utf8")
    const notListedAfterWrite = readFileSync(notListedAbsolute)
    if (notListedAfterWrite.compare(notListedBefore) !== 0) {
      throw new Error("M9.5 successful explicit-file write changed an unlisted fixture source.")
    }
    if (!output.includes("palette.color.brand") || !output.includes("result.container") ||
      !output.includes("../tokens.css") || !output.includes("../action-button.css")) {
      throw new Error("M9.5 successful fixture write omitted a mapped token or recipe slot change.")
    }
    const expectedApplied = totalEdits(writeResult.report, "proposedEditCount")
    if (writeResult.report.files[0]?.status !== "written" ||
      totalEdits(writeResult.report, "appliedEditCount") !== expectedApplied ||
      !readFileSync(sourceAbsolute).equals(Buffer.from(output, "utf8"))) {
      throw new Error("M9.5 successful fixture write did not apply its complete plan.")
    }
    return {
      report: dryResult.report,
      reportJson: dryResult.reportJson,
      writeReport: writeResult.report,
      writeReportJson: writeResult.reportJson,
      sourceBefore,
      sourceAfter: sourceAfterDryRun,
      notListedBefore,
      notListedAfter: notListedAfterWrite,
      output,
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

type BlockedRun = Readonly<{
  readonly report: SourceMigrationReport
  readonly reportJson: string
  readonly files: ReadonlyArray<Readonly<{
    readonly path: string
    readonly beforeSha256: string
    readonly afterSha256: string
  }>>
}>

function qualifyBlockedRun(fixtures: ReadonlyArray<Fixture>): BlockedRun {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "crumbs-css-m9-5-blocked-"))
  try {
    stageFixtures(temporaryRoot, fixtures)
    const paths = [sourcePath, blockedSourcePath] as const
    const before = new Map<string, Buffer>(paths.map(path => [path, readFileSync(resolve(temporaryRoot, path))] as const))
    const execution = executeSourceMigrationCommand(sourceArgs(paths, true), { cwd: temporaryRoot })
    const result = requireReport(execution, 1, "blocked-write")
    const after = new Map<string, Buffer>(paths.map(path => [path, readFileSync(resolve(temporaryRoot, path))] as const))
    for (const path of paths) {
      if (!before.get(path)!.equals(after.get(path)!)) {
        throw new Error("M9.5 blocked whole-invocation preflight changed a source fixture.")
      }
    }
    if (result.report.files.some(file => file.status !== "blocked" || file.appliedEditCount !== 0) ||
      result.report.diagnostics.length === 0 || totalEdits(result.report, "proposedEditCount") === 0) {
      throw new Error("M9.5 blocked fixture did not suppress every proposed write.")
    }
    return {
      report: result.report,
      reportJson: result.reportJson,
      files: result.report.files.map(file => ({
        path: file.path,
        status: file.status,
        beforeSha256: sha256(before.get(file.path)!),
        afterSha256: sha256(after.get(file.path)!),
        appliedEditCount: file.appliedEditCount,
      })),
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

/** Qualify only the fixed M9.5 fixtures using the CLI's dry-run and write paths. */
export function generateMigrationQualification(): MigrationQualification {
  const fixtures = loadFixtures()
  const successful = qualifySuccessfulRun(fixtures)
  const blocked = qualifyBlockedRun(fixtures)
  const repeatedSuccessful = qualifySuccessfulRun(fixtures)
  const repeatedBlocked = qualifyBlockedRun(fixtures)
  if (successful.reportJson !== repeatedSuccessful.reportJson ||
    successful.writeReportJson !== repeatedSuccessful.writeReportJson ||
    successful.output !== repeatedSuccessful.output ||
    blocked.reportJson !== repeatedBlocked.reportJson ||
    JSON.stringify(blocked.files) !== JSON.stringify(repeatedBlocked.files)) {
    throw new Error("M9.5 migration fixture qualification was not byte-identical on repeat evaluation.")
  }
  const dryRunProposed = totalEdits(successful.report, "proposedEditCount")
  const writeProposed = totalEdits(successful.writeReport, "proposedEditCount")
  const writeApplied = totalEdits(successful.writeReport, "appliedEditCount")

  const receipt = {
    format: "crumbs.source-migration-qualification",
    schemaVersion: 1,
    roadmapItem: "M9.5",
    status: "qualified-source-tooling",
    migration: {
      id: successful.report.migration.id,
      revision: successful.report.migration.revision,
      format: SOURCE_MIGRATION_FORMAT,
      schemaVersion: SOURCE_MIGRATION_VERSION,
    },
    report: {
      format: successful.report.format,
      schemaVersion: successful.report.schemaVersion,
    },
    fixtures: fixtures.map(fixture => ({
      path: `packages/css/fixtures/m9-5-migrations/${fixture.path}`,
      sha256: sha256(fixture.bytes),
    })),
    reports: {
      dryRun: { path: reportPath, sha256: sha256(successful.reportJson) },
      writeSha256: sha256(successful.writeReportJson),
      blockedWriteSha256: sha256(blocked.reportJson),
    },
    dryRun: {
      exitCode: 0,
      fileCount: successful.report.files.length,
      proposedEditCount: dryRunProposed,
      appliedEditCount: totalEdits(successful.report, "appliedEditCount"),
      sourceSha256Before: sha256(successful.sourceBefore),
      sourceSha256AfterDryRun: sha256(successful.sourceAfter),
      unlistedSourceSha256Before: sha256(successful.notListedBefore),
      unlistedSourceSha256After: sha256(successful.notListedAfter),
    },
    write: {
      exitCode: 0,
      proposedEditCount: writeProposed,
      appliedEditCount: writeApplied,
      sourceSha256Before: sha256(successful.sourceBefore),
      sourceSha256After: sha256(successful.output),
    },
    blockedWrite: {
      exitCode: 1,
      proposedEditCount: totalEdits(blocked.report, "proposedEditCount"),
      appliedEditCount: totalEdits(blocked.report, "appliedEditCount"),
      diagnosticCodes: [...new Set(blocked.report.diagnostics.map(diagnostic => diagnostic.code))].sort(),
      files: blocked.files,
    },
    coverage: {
      explicitFiles: [sourcePath],
      blockedPreflightFiles: [blockedSourcePath, sourcePath],
      notSuppliedToSuccessfulRun: [blockedSourcePath, notListedSourcePath],
      analysisLimitCodes: [...new Set(successful.report.analysisLimits.map(limit => limit.code))].sort(),
    },
    passedGates: [
      "explicit-fixture-inputs-only",
      "dry-run-made-no-source-changes",
      "write-applied-proposed-token-and-slot-edits",
      "unlisted-source-remained-byte-identical",
      "blocked-invocation-made-no-source-changes",
      "canonical-report-v1",
      "repeat-run-byte-identical",
      "explicit-files-only-coverage-retained",
    ],
  }

  return {
    reportJson: successful.reportJson,
    receiptJson: encodeStableJson(receipt),
    writeOutputs: [{ path: sourcePath, source: successful.output }],
  }
}

/** Write the canonical dry-run report and stable receipt to the repository evidence directory. */
export function writeMigrationQualificationArtifacts(): Readonly<{ reportPath: string; receiptPath: string }> {
  const evidence = generateMigrationQualification()
  const directory = resolve(repositoryRoot, evidenceDirectory)
  mkdirSync(directory, { recursive: true })
  writeFileSync(resolve(repositoryRoot, reportPath), evidence.reportJson, "utf8")
  writeFileSync(resolve(repositoryRoot, receiptPath), evidence.receiptJson, "utf8")
  return { reportPath, receiptPath }
}

if (import.meta.main) {
  const artifacts = writeMigrationQualificationArtifacts()
  process.stdout.write(`Wrote ${artifacts.reportPath} and ${artifacts.receiptPath}\n`)
}
