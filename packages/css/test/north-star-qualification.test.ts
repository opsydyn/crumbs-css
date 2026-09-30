import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { compareManifests } from "../src/tooling/manifest"
import { planSourceMigration } from "../src/tooling/migrations"
import type { DesignSystemManifest } from "../src/tooling/manifest/model"
import type { SourceMigration } from "../src/tooling/migrations/model"

const fixtureRoot = resolve(import.meta.dir, "../fixtures/m10-4-north-star")
const readJson = (name: string): unknown => JSON.parse(readFileSync(resolve(fixtureRoot, name), "utf8"))
const baseline = readJson("baseline.json") as DesignSystemManifest
const current = readJson("current.json") as DesignSystemManifest
const consumer = readJson("consumer.json") as DesignSystemManifest
const migration = readJson("migration.json") as SourceMigration

describe("M10.4 North Star compatibility and migration evidence", () => {
  it("reports a public alias target change and attributes it to an explicitly supplied consumer", () => {
    const report = compareManifests({ baseline, current, consumers: [consumer] })
    const alias = report.findings.find(finding => finding.code === "token.alias-changed")
    const removed = report.findings.find(finding => finding.code === "token.removed")

    expect(alias).toMatchObject({
      level: "warning",
      entityId: "@acme/design-system#token:color.action",
      fieldPath: "alias",
      before: {
        targetId: "@acme/design-system#token:color.blue",
        targetPath: ["color", "blue"],
        resolution: "internal",
      },
      after: {
        targetId: "@acme/design-system#token:color.brand",
        targetPath: ["color", "brand"],
        resolution: "internal",
      },
      affectedConsumers: [{
        package: { name: "@acme/mobile-app", version: "1.0.0" },
        dependency: { to: "@acme/design-system#token:color.action", kind: "style-token" },
      }],
    })
    expect(removed).toMatchObject({
      code: "token.removed",
      entityId: "@acme/design-system#token:color.legacy",
      affectedConsumers: [{
        package: { name: "@acme/mobile-app", version: "1.0.0" },
        dependency: { to: "@acme/design-system#token:color.legacy", kind: "style-token" },
      }],
    })
  })

  it("plans only explicit consumer source and is unchanged after the migration is applied", () => {
    const path = "src/ActionCard.css.ts"
    const source = readFileSync(resolve(fixtureRoot, path), "utf8")
    const first = planSourceMigration({ migration, baseline, current, files: [{ path, source }] })
    const migrated = first.outputs[0]!.source

    expect(first.report.diagnostics).toEqual([])
    expect(first.outputs).toHaveLength(1)
    expect(first.outputs[0]).toMatchObject({ path, changed: true })
    expect(migrated).toContain('import { tokens as palette } from "../tokens.css";')
    expect(migrated).toContain("palette.color.brand")
    expect(migrated).toContain("palette.color.action")

    const second = planSourceMigration({ migration, baseline, current, files: [{ path, source: migrated }] })
    expect(second.report.diagnostics).toEqual([])
    expect(second.outputs).toEqual([{ path, source: migrated, changed: false }])
    expect(second.report.files[0]?.beforeSha256).toBe(first.report.files[0]?.afterSha256)
  })
})
