import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { auditPackedRuntimeEntrypoints } from "../../../scripts/packed-runtime-graph"
import * as migrationApi from "../src/tooling/migrations"
import type { SourceMigration, SourceMigrationPlan, SourceMigrationReport } from "../src/tooling/migrations"

const packageRoot = resolve(import.meta.dir, "..")
const distRoot = resolve(packageRoot, "dist")
const requireFromPackage = createRequire(resolve(packageRoot, "package.json"))

const migrationMap: SourceMigration = {
  format: "crumbs.source-migration",
  schemaVersion: 1,
  id: "example/design-system-migration",
  revision: 1,
  provider: "@example/design-system",
  tokens: [{
    fromId: "@example/design-system#token:color.old",
    toId: "@example/design-system#token:color.new",
    fromImport: { moduleSpecifier: "../tokens.css", importedName: "oldColor" },
    toImport: { moduleSpecifier: "../tokens.css", importedName: "newColor" },
  }],
  components: [],
}

describe("isolated migration tooling export", () => {
  it("exports-plain-migration-api-and-version-tags", () => {
    expect(Object.keys(migrationApi).sort()).toEqual([
      "SOURCE_MIGRATION_DIAGNOSTIC_CODES",
      "SOURCE_MIGRATION_FORMAT",
      "SOURCE_MIGRATION_REPORT_FORMAT",
      "SOURCE_MIGRATION_REPORT_VERSION",
      "SOURCE_MIGRATION_VERSION",
      "decodeSourceMigration",
      "decodeSourceMigrationReport",
      "encodeCanonicalSourceMigrationReport",
      "planSourceMigration",
    ])
    expect(migrationApi.SOURCE_MIGRATION_FORMAT).toBe("crumbs.source-migration")
    expect(migrationApi.SOURCE_MIGRATION_VERSION).toBe(1)
    expect(migrationApi.SOURCE_MIGRATION_REPORT_FORMAT).toBe("crumbs.source-migration-report")
    expect(migrationApi.SOURCE_MIGRATION_REPORT_VERSION).toBe(1)
    expect(migrationApi.decodeSourceMigration(migrationMap)).toEqual(migrationMap)
    expect(Object.keys(migrationApi).some(name =>
      name.includes("Schema") || name.includes("Codec") || name.includes("TypeScript") || name === "ts")).toBe(false)

    const planConsumer = (_plan: SourceMigrationPlan, _report: SourceMigrationReport): void => {}
    expect(typeof planConsumer).toBe("function")
  })

  it("resolves-packed-migration-entry-in-esm-commonjs-and-types", async () => {
    const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
      readonly exports: Readonly<Record<string, unknown>>
    }
    expect(packageJson.exports["./tooling/migrations"]).toEqual({
      types: "./dist/tooling-migrations.d.mts",
      import: "./dist/tooling-migrations.mjs",
      require: "./dist/tooling-migrations.cjs",
    })

    const esmPath = resolve(distRoot, "tooling-migrations.mjs")
    const cjsPath = resolve(distRoot, "tooling-migrations.cjs")
    const typesPath = resolve(distRoot, "tooling-migrations.d.mts")
    expect(existsSync(esmPath)).toBe(true)
    expect(existsSync(cjsPath)).toBe(true)
    expect(existsSync(typesPath)).toBe(true)
    const esm = await import(pathToFileURL(esmPath).href) as typeof migrationApi
    const cjs = requireFromPackage(cjsPath) as typeof migrationApi
    for (const entry of [esm, cjs]) {
      expect(entry.decodeSourceMigration(migrationMap)).toEqual(migrationMap)
      expect(typeof entry.planSourceMigration).toBe("function")
      expect(Object.keys(entry).some(name => name.endsWith("Schema") || name.endsWith("Codec"))).toBe(false)
    }
    const declarations = readFileSync(typesPath, "utf8")
    expect(declarations).toContain("decodeSourceMigration")
    expect(declarations).toContain("planSourceMigration")
    expect(declarations).not.toMatch(/Schema\.|ts\.SourceFile|ts\.Node/)
  })

  it("declares-optional-typescript-tooling-peer", () => {
    const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
      readonly peerDependencies?: Readonly<Record<string, string>>
      readonly peerDependenciesMeta?: Readonly<Record<string, { readonly optional?: boolean }>>
    }
    expect(packageJson.peerDependencies?.typescript).toBe(">=5.9 <6")
    expect(packageJson.peerDependenciesMeta?.typescript?.optional).toBe(true)
  })

  it("keeps-migrations-typescript-and-effect-out-of-runtime-graphs", async () => {
    const graphs = await auditPackedRuntimeEntrypoints(packageRoot)
    const ordinarySubpaths = [".", "./style", "./theme", "./theme/core", "./tokens", "./tokens/optic"]
    for (const graph of graphs.filter(candidate => ordinarySubpaths.includes(candidate.subpath))) {
      expect(graph.files.some(file => file === "dist/tooling-migrations.mjs" || file === "dist/tooling-migrations.cjs")).toBe(false)
      expect(graph.externalSpecifiers).not.toContain("typescript")
      expect(graph.externalSpecifiers).not.toContain("effect/Schema")
    }

    const migrationGraphs = graphs.filter(candidate => candidate.subpath === "./tooling/migrations")
    expect(migrationGraphs).toHaveLength(2)
    expect(migrationGraphs.every(graph => graph.classification === "compiler-tooling")).toBe(true)
    expect(migrationGraphs.every(graph => graph.externalSpecifiers.includes("typescript"))).toBe(true)
    expect(migrationGraphs.every(graph => !graph.externalSpecifiers.includes("effect/Schema"))).toBe(true)
  })
})
