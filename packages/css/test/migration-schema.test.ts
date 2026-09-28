import { describe, expect, it } from "bun:test"
import {
  SOURCE_MIGRATION_FORMAT,
  SOURCE_MIGRATION_REPORT_FORMAT,
  SOURCE_MIGRATION_REPORT_VERSION,
  SOURCE_MIGRATION_VERSION,
} from "../src/tooling/migrations/model"
import { encodeCanonicalSourceMigrationReport } from "../src/tooling/migrations/canonical-json"
import { decodeSourceMigration, decodeSourceMigrationReport } from "../src/tooling/migrations/schema"

const migration = {
  format: "crumbs.source-migration",
  schemaVersion: 1,
  id: "design-system/2026-09-token-and-button-migration",
  revision: 1,
  provider: "@example/design-system",
  tokens: [{
    fromId: "@example/design-system/tokens@1#5:color/6:accent",
    toId: "@example/design-system/tokens@2#5:color/5:brand",
    fromImport: { moduleSpecifier: "../tokens-v1.css", importedName: "tokens" },
    toImport: { moduleSpecifier: "../tokens.css", importedName: "tokens" },
  }],
  components: [{
    fromId: "@example/design-system#button@1",
    toId: "@example/design-system#action-button@2",
    fromImport: { moduleSpecifier: "../button.css", importedName: "button" },
    toImport: { moduleSpecifier: "../action-button.css", importedName: "actionButton" },
    slots: { root: "container", label: "label" },
  }],
} as const

function file(path: string, status: "unchanged" | "ready") {
  return {
    path,
    status,
    beforeSha256: "a".repeat(64),
    afterSha256: status === "unchanged" ? "a".repeat(64) : "b".repeat(64),
    proposedEditCount: status === "unchanged" ? 0 : 1,
    appliedEditCount: 0,
  }
}

const report = {
  format: "crumbs.source-migration-report",
  schemaVersion: 1,
  migration: { id: migration.id, revision: 1 },
  provider: { name: "@example/design-system", baselineVersion: "1.0.0", currentVersion: "2.0.0" },
  files: [file("src/z.ts", "ready"), file("src/a.ts", "unchanged")],
  diagnostics: [
    { code: "source.unsupported-syntax", message: "Unsupported target reference.", path: "src/z.ts", line: 2, column: 3, entityId: "token.z" },
    { code: "source.parse-error", message: "Source could not be parsed.", path: "src/a.ts", line: 1, column: 1 },
  ],
  analysisLimits: [{ code: "explicit-files-only", message: "Only explicitly named source files were analyzed." }],
} as const

describe("safe source migration v1 contracts", () => {
  it("accepts-exact-migration-and-report-v1", () => {
    expect(SOURCE_MIGRATION_FORMAT).toBe("crumbs.source-migration")
    expect(SOURCE_MIGRATION_VERSION).toBe(1)
    expect(SOURCE_MIGRATION_REPORT_FORMAT).toBe("crumbs.source-migration-report")
    expect(SOURCE_MIGRATION_REPORT_VERSION).toBe(1)
    expect(decodeSourceMigration(migration)).toEqual(migration)
    expect(decodeSourceMigrationReport(report)).toEqual(report)
  })

  it("rejects-unknown-fields-empty-maps-and-invalid-bindings", () => {
    expect(() => decodeSourceMigration({ ...migration, surprise: true })).toThrow("Invalid source migration")
    expect(() => decodeSourceMigration({ ...migration, tokens: [], components: [] })).toThrow("at least one token or component mapping")
    expect(() => decodeSourceMigration({
      ...migration,
      tokens: [{ ...migration.tokens[0], fromImport: { ...migration.tokens[0].fromImport, importedName: "not an identifier" } }],
    })).toThrow("Invalid source migration")
    expect(() => decodeSourceMigration({ ...migration, revision: 0 })).toThrow("Invalid source migration")
    expect(() => decodeSourceMigrationReport({ ...report, extra: true })).toThrow("Invalid source migration report")
    expect(() => decodeSourceMigrationReport({ ...report, files: [file("/absolute/path.ts", "ready")] })).toThrow("Invalid source migration report")
  })

  it("rejects-duplicate-or-conflicting-source-mappings", () => {
    expect(() => decodeSourceMigration({
      ...migration,
      tokens: [migration.tokens[0], migration.tokens[0]],
    })).toThrow("duplicate")
    expect(() => decodeSourceMigration({
      ...migration,
      components: [],
      tokens: [
        migration.tokens[0],
        {
          ...migration.tokens[0],
          fromId: "@example/design-system/tokens@1#5:color/5:other",
          toId: "@example/design-system/tokens@2#5:color/5:other",
          toImport: { moduleSpecifier: "../other-tokens.css", importedName: "tokens" },
        },
      ],
    })).toThrow("conflicting")
  })

  it("canonicalizes-report-order-and-object-keys", () => {
    const reversed = {
      ...report,
      provider: { currentVersion: "2.0.0", name: "@example/design-system", baselineVersion: "1.0.0" },
      files: [...report.files].reverse(),
      diagnostics: [...report.diagnostics].reverse(),
      migration: { revision: 1, id: migration.id },
    }
    const encoded = encodeCanonicalSourceMigrationReport(report)
    expect(encodeCanonicalSourceMigrationReport(reversed)).toBe(encoded)
    expect(encoded.indexOf("src/a.ts")).toBeLessThan(encoded.indexOf("src/z.ts"))
    expect(encoded.indexOf("source.parse-error")).toBeLessThan(encoded.indexOf("source.unsupported-syntax"))
    expect(encoded).toContain('"migration":{"id":"design-system/2026-09-token-and-button-migration","revision":1}')
    expect(encoded.endsWith("\n")).toBe(true)
  })
})
