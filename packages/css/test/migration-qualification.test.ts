import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"
import { generateMigrationQualification } from "../../../scripts/m9-5-migrations-qualification"

const repositoryRoot = resolve(import.meta.dir, "../../..")

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

type Qualification = ReturnType<typeof generateMigrationQualification>
type Receipt = {
  readonly migration: Readonly<{ format: string; id: string; revision: number; schemaVersion: number }>
  readonly report: Readonly<{ format: string; schemaVersion: number }>
  readonly fixtures: ReadonlyArray<Readonly<{ path: string; sha256: string }>>
  readonly reports: Readonly<{
    dryRun: Readonly<{ path: string; sha256: string }>
    writeSha256: string
    blockedWriteSha256: string
  }>
  readonly dryRun: Readonly<{
    proposedEditCount: number
    appliedEditCount: number
    sourceSha256Before: string
    sourceSha256AfterDryRun: string
  }>
  readonly write: Readonly<{
    proposedEditCount: number
    appliedEditCount: number
    sourceSha256Before: string
    sourceSha256After: string
  }>
  readonly blockedWrite: Readonly<{
    exitCode: number
    proposedEditCount: number
    appliedEditCount: number
    diagnosticCodes: ReadonlyArray<string>
    files: ReadonlyArray<Readonly<{
      path: string
      status: string
      beforeSha256: string
      afterSha256: string
      appliedEditCount: number
    }>>
  }>
  readonly coverage: Readonly<{ explicitFiles: ReadonlyArray<string> }>
}

function receiptFor(evidence: Qualification): Receipt {
  return JSON.parse(evidence.receiptJson) as Receipt
}
describe("M9.5 source migration fixture qualification", () => {
  it("qualifies-explicit-token-and-recipe-slot-fixtures", () => {
    const evidence = generateMigrationQualification()
    const receipt = receiptFor(evidence)
    const report = JSON.parse(evidence.reportJson) as {
      readonly migration: { readonly id: string }
      readonly files: ReadonlyArray<{
        readonly path: string
        readonly status: string
        readonly proposedEditCount: number
        readonly appliedEditCount: number
      }>
      readonly analysisLimits: ReadonlyArray<{ readonly code: string }>
    }

    expect(report.migration.id).toBe("design-system/2026-09-source-migration")
    expect(receipt.migration).toEqual({
      format: "crumbs.source-migration",
      id: report.migration.id,
      revision: 1,
      schemaVersion: 1,
    })
    expect(receipt.report).toEqual({ format: "crumbs.source-migration-report", schemaVersion: 1 })
    expect(report.files).toHaveLength(1)
    expect(report.files[0]).toMatchObject({
      path: "src/consumer.tsx",
      status: "ready",
      appliedEditCount: 0,
    })
    expect(report.files[0]!.proposedEditCount).toBeGreaterThan(0)
    expect(report.analysisLimits.map(limit => limit.code)).toContain("explicit-files-only")

    expect(evidence.writeOutputs).toHaveLength(1)
    const migrated = evidence.writeOutputs[0]!.source
    expect(migrated).toContain('import { tokens as palette } from "../tokens.css";')
    expect(migrated).toContain("palette.color.brand")
    expect(migrated).toContain('import { actionButton as baseRecipe } from "../action-button.css";')
    expect(migrated).toContain("result.container")
    expect(receipt.coverage.explicitFiles).toEqual(["src/consumer.tsx"])
    expect(receipt.dryRun.appliedEditCount).toBe(0)
    expect(receipt.write.appliedEditCount).toBe(receipt.write.proposedEditCount)
  })

  it("records-digests-and-plan-write-counts", () => {
    const evidence = generateMigrationQualification()
    const receipt = receiptFor(evidence)
    expect(receipt.fixtures.length).toBeGreaterThanOrEqual(6)
    for (const fixture of receipt.fixtures) {
      expect(isAbsolute(fixture.path)).toBe(false)
      expect(fixture.sha256).toBe(sha256(readFileSync(resolve(repositoryRoot, fixture.path))))
    }
    expect(receipt.reports.dryRun.sha256).toBe(sha256(evidence.reportJson))

    const input = readFileSync(resolve(repositoryRoot, "packages/css/fixtures/m9-5-migrations/src/consumer.tsx"))
    const output = evidence.writeOutputs.find(file => file.path === "src/consumer.tsx")
    expect(output).toBeDefined()
    expect(receipt.dryRun).toMatchObject({
      proposedEditCount: JSON.parse(evidence.reportJson).files[0].proposedEditCount,
      appliedEditCount: 0,
      sourceSha256Before: sha256(input),
      sourceSha256AfterDryRun: sha256(input),
    })
    expect(receipt.write).toMatchObject({
      proposedEditCount: receipt.dryRun.proposedEditCount,
      appliedEditCount: receipt.dryRun.proposedEditCount,
      sourceSha256Before: sha256(input),
      sourceSha256After: sha256(output!.source),
    })
    expect(receipt.write.sourceSha256After).not.toBe(receipt.write.sourceSha256Before)
  })

  it("is-repeatable-without-absolute-paths-or-time", () => {
    const first = generateMigrationQualification()
    const second = generateMigrationQualification()

    expect(second.reportJson).toBe(first.reportJson)
    expect(second.receiptJson).toBe(first.receiptJson)
    expect(second.writeOutputs).toEqual(first.writeOutputs)
    expect(first.receiptJson).not.toContain(repositoryRoot)
    expect(first.receiptJson).not.toMatch(/"(?:generatedAt|timestamp|evaluatedOn)"/i)
    expect(first.receiptJson).not.toMatch(/\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}/)
    expect(first.receiptJson).not.toMatch(/\b(?:ENOENT|EACCES|EPERM)\b/)

    const receipt = receiptFor(first)
    for (const fixture of receipt.fixtures) {
      expect(isAbsolute(fixture.path)).toBe(false)
    }
    expect(isAbsolute(receipt.reports.dryRun.path)).toBe(false)
  })

  it("proves-blocked-fixture-does-not-change-any-source", () => {
    const receipt = receiptFor(generateMigrationQualification())
    const blocked = receipt.blockedWrite as {
      readonly exitCode: number
      readonly proposedEditCount: number
      readonly appliedEditCount: number
      readonly diagnosticCodes: ReadonlyArray<string>
      readonly files: ReadonlyArray<{
        readonly path: string
        readonly status: string
        readonly beforeSha256: string
        readonly afterSha256: string
        readonly appliedEditCount: number
      }>
    }

    expect(blocked.exitCode).toBe(1)
    expect(blocked.proposedEditCount).toBeGreaterThan(0)
    expect(blocked.appliedEditCount).toBe(0)
    expect(blocked.diagnosticCodes.length).toBeGreaterThan(0)
    expect(blocked.files.map(file => file.path)).toEqual([
      "src/blocked-consumer.tsx",
      "src/consumer.tsx",
    ])
    expect(blocked.files.every(file => file.status === "blocked" &&
      file.beforeSha256 === file.afterSha256 && file.appliedEditCount === 0)).toBe(true)
  })
})
