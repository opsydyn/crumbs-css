import { describe, expect, it } from "bun:test"
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { isAbsolute, join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { executeSourceMigrationCommand, parseSourceMigrationArgs } from "../../../scripts/m9-5-migrations"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const provider = "@example/design-system"
const oldButtonId = provider + "#button@1"
const newActionId = provider + "#action-button@2"

function component(id: string, version: number, path: string, exportPath: string, slots: ReadonlyArray<string>) {
  return {
    id,
    contract: { owner: provider, name: "components", version },
    origin: { path, exportPath },
    slots,
    variants: {},
    extensionPoints: [],
    stateConstraints: [],
    defaults: {},
  }
}

function manifest(version: "1.0.0" | "2.0.0", components: ReadonlyArray<ReturnType<typeof component>>) {
  return {
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: provider, version },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "native-style-ir", version: 1 },
    },
    tokens: [],
    components,
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: { roots: components.map(item => ({ kind: "component-recipe", id: item.id })), unresolved: [] },
  }
}

const baseline = manifest("1.0.0", [component(oldButtonId, 1, "src/button.css.ts", "button", ["root", "label"])])
const current = manifest("2.0.0", [component(newActionId, 2, "src/action-button.css.ts", "actionButton", ["container", "label"])])
const migration = {
  format: "crumbs.source-migration",
  schemaVersion: 1,
  id: "design-system/2026-09-button-migration",
  revision: 1,
  provider,
  tokens: [],
  components: [{
    fromId: oldButtonId,
    toId: newActionId,
    fromImport: { moduleSpecifier: "../button.css", importedName: "button" },
    toImport: { moduleSpecifier: "../action-button.css", importedName: "actionButton" },
    slots: { root: "container", label: "label" },
  }],
}

const safeSource =
  'import { button as baseRecipe } from "../button.css";\n' +
  'import { useThemedStyles as useStyles } from "@opsydyn/crumbs-css/theme/core";\n' +
  'import { createComponentRecipeResolver as createResolver } from "@opsydyn/crumbs-css/theme";\n' +
  'const themed = useStyles({ baseRecipe });\n' +
  'const resolver = createResolver(themed.baseRecipe);\n' +
  'const result = resolver({});\n' +
  'export const rootStyle = result.root;\n'
const blockedSource = safeSource.replace("result.root", "result[slot]")

type Inputs = {
  readonly directory: string
  readonly migrationPath: string
  readonly baselinePath: string
  readonly currentPath: string
  readonly sourcePath: string
  readonly source: string
}

function withTempDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "crumbs-source-migrations-"))
  try {
    run(directory)
  } finally {
    chmodSync(directory, 0o700)
    rmSync(directory, { recursive: true, force: true })
  }
}

function writeJson(directory: string, name: string, value: unknown): string {
  const path = join(directory, name)
  writeFileSync(path, JSON.stringify(value) + "\n", "utf8")
  return path
}

function makeInputs(directory: string, source = safeSource, name = "consumer.tsx"): Inputs {
  const migrationPath = writeJson(directory, "migration.json", migration)
  const baselinePath = writeJson(directory, "baseline.json", baseline)
  const currentPath = writeJson(directory, "current.json", current)
  const sourcePath = join(directory, "src", name)
  mkdirSync(join(directory, "src"), { recursive: true })
  writeFileSync(sourcePath, source, "utf8")
  return { directory, migrationPath, baselinePath, currentPath, sourcePath, source }
}

function argsFor(inputs: Inputs, extra: ReadonlyArray<string> = []): string[] {
  return [
    "--migration", inputs.migrationPath,
    "--baseline", inputs.baselinePath,
    "--current", inputs.currentPath,
    "--file", inputs.sourcePath,
    ...extra,
  ]
}

function runCli(args: ReadonlyArray<string>) {
  const result = Bun.spawnSync([process.execPath, "run", "migrate:source", "--", ...args], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  }
}

describe("migrate:source arguments", () => {
  it("requires-all-migration-and-manifest-inputs-and-one-file", () => {
    expect(() => parseSourceMigrationArgs([])).toThrow(/--migration/i)
    expect(() => parseSourceMigrationArgs(["--migration", "migration.json"])).toThrow(/--baseline/i)
    expect(() => parseSourceMigrationArgs([
      "--migration", "migration.json",
      "--baseline", "baseline.json",
      "--current", "current.json",
    ])).toThrow(/--file/i)
    expect(parseSourceMigrationArgs([
      "--migration", "migration.json",
      "--baseline", "baseline.json",
      "--current", "current.json",
      "--file", "src/consumer.ts",
    ])).toEqual({
      migrationPath: "migration.json",
      baselinePath: "baseline.json",
      currentPath: "current.json",
      filePaths: ["src/consumer.ts"],
      format: "text",
    })
  })

  it("accepts-repeatable-file-flags-and-write-switch", () => {
    expect(parseSourceMigrationArgs([
      "--", "--migration", "migration.json",
      "--baseline", "baseline.json",
      "--current", "current.json",
      "--file", "src/one.ts",
      "--file", "src/two.tsx",
      "--write",
      "--format", "json",
    ])).toEqual({
      migrationPath: "migration.json",
      baselinePath: "baseline.json",
      currentPath: "current.json",
      filePaths: ["src/one.ts", "src/two.tsx"],
      write: true,
      format: "json",
    })
  })

  it("rejects-duplicate-singletons-unknown-options-and-duplicate-normalized-paths", () => {
    const common = ["--migration", "m.json", "--baseline", "b.json", "--current", "c.json"]
    expect(() => parseSourceMigrationArgs([...common, "--current", "other.json", "--file", "a.ts"])).toThrow(/duplicate.*--current/i)
    expect(() => parseSourceMigrationArgs([...common, "--file", "a.ts", "--write", "--write"])).toThrow(/duplicate.*--write/i)
    expect(() => parseSourceMigrationArgs([...common, "--file", "a.ts", "--surprise", "x"])).toThrow(/unknown.*--surprise/i)
    expect(() => parseSourceMigrationArgs([...common, "--file", "src/../src/a.ts", "--file", "src/a.ts"], "/repo")).toThrow(/duplicate.*file/i)
    expect(() => parseSourceMigrationArgs([...common, "--file", "a.ts", "--format", "yaml"])).toThrow(/format.*text.*json/i)
  })
})

describe("migrate:source execution", () => {
  it("malformed-source-and-unreadable-input-return-two", () => {
    withTempDirectory(directory => {
      const malformed = makeInputs(directory, "const = ;\n")
      const parseFailure = runCli([...argsFor(malformed), "--format", "json"])
      expect(parseFailure.exitCode).toBe(2)
      expect(JSON.parse(parseFailure.stdout).diagnostics).toEqual([
        expect.objectContaining({ code: "source.parse-error" }),
      ])

      const missing = { ...malformed, sourcePath: join(directory, "src", "missing.ts") }
      const readFailure = runCli([...argsFor(missing), "--format", "json"])
      expect(readFailure.exitCode).toBe(2)
      expect(readFailure.stderr).toMatch(/cannot read.*source/i)
    })
  })

  it("dry-run-leaves-source-and-sentinel-files-byte-identical", () => {
    withTempDirectory(directory => {
      const inputs = makeInputs(directory)
      const sentinelPath = join(directory, "src", "not-listed.ts")
      const sentinel = "export const preserveMe = true;\n"
      writeFileSync(sentinelPath, sentinel, "utf8")
      const result = runCli([...argsFor(inputs), "--format", "json"])
      expect(result.exitCode).toBe(0)
      expect(readFileSync(inputs.sourcePath, "utf8")).toBe(inputs.source)
      expect(readFileSync(sentinelPath, "utf8")).toBe(sentinel)
      expect(JSON.parse(result.stdout).files[0]).toMatchObject({ status: "ready", appliedEditCount: 0 })
      expect(Bun.spawnSync(["find", directory, "-type", "f"], { stdout: "pipe" }).stdout.toString().trim().split("\n").length).toBe(5)
    })
  })

  it("blocks-every-write-if-one-explicit-source-is-ambiguous", () => {
    withTempDirectory(directory => {
      const inputs = makeInputs(directory)
      const blockedPath = join(directory, "src", "blocked.ts")
      writeFileSync(blockedPath, blockedSource, "utf8")
      const safeBefore = readFileSync(inputs.sourcePath, "utf8")
      const blockedBefore = readFileSync(blockedPath, "utf8")
      const result = runCli([
        "--migration", inputs.migrationPath,
        "--baseline", inputs.baselinePath,
        "--current", inputs.currentPath,
        "--file", inputs.sourcePath,
        "--file", blockedPath,
        "--write",
        "--format", "json",
      ])
      expect(result.exitCode).toBe(1)
      expect(readFileSync(inputs.sourcePath, "utf8")).toBe(safeBefore)
      expect(readFileSync(blockedPath, "utf8")).toBe(blockedBefore)
      expect(JSON.parse(result.stdout).files.every((file: { status: string }) => file.status === "blocked")).toBe(true)
    })
  })

  it("writes-only-named-files-after-clear-preflight", () => {
    withTempDirectory(directory => {
      const inputs = makeInputs(directory)
      const sentinelPath = join(directory, "src", "not-listed.ts")
      writeFileSync(sentinelPath, "export const sentinel = true;\n", "utf8")
      chmodSync(inputs.sourcePath, 0o640)
      const result = runCli([...argsFor(inputs), "--write", "--format", "json"])
      expect(result.exitCode).toBe(0)
      const output = readFileSync(inputs.sourcePath, "utf8")
      expect(output).toContain('import { actionButton as baseRecipe } from "../action-button.css";')
      expect(output).toContain("result.container")
      expect(readFileSync(sentinelPath, "utf8")).toBe("export const sentinel = true;\n")
      expect(statSync(inputs.sourcePath).mode & 0o777).toBe(0o640)
      expect(JSON.parse(result.stdout).files[0]).toMatchObject({ status: "written", appliedEditCount: 3 })
    })
  })

  it("second-cli-run-writes-no-change", () => {
    withTempDirectory(directory => {
      const inputs = makeInputs(directory)
      const first = runCli([...argsFor(inputs), "--write", "--format", "json"])
      const second = runCli([...argsFor(inputs), "--write", "--format", "json"])
      expect(first.exitCode).toBe(0)
      expect(second.exitCode).toBe(0)
      expect(JSON.parse(second.stdout).files[0]).toMatchObject({
        status: "unchanged",
        proposedEditCount: 0,
        appliedEditCount: 0,
      })
      expect(JSON.parse(second.stdout).files[0].beforeSha256).toBe(JSON.parse(second.stdout).files[0].afterSha256)
    })
  })

  it("reports-before-after-digests-and-applied-counts", () => {
    withTempDirectory(directory => {
      const inputs = makeInputs(directory)
      const result = runCli([...argsFor(inputs), "--write", "--format", "json"])
      const report = JSON.parse(result.stdout)
      expect(result.exitCode).toBe(0)
      expect(report.files[0]).toMatchObject({
        status: "written",
        beforeSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        afterSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        proposedEditCount: 3,
        appliedEditCount: 3,
      })
      expect(report.files[0].beforeSha256).not.toBe(report.files[0].afterSha256)
      expect(report.files.every((file: { path: string }) => !isAbsolute(file.path))).toBe(true)
      expect(JSON.stringify(report)).not.toContain(JSON.stringify(inputs.directory))
    })
  })

  it("returns-defined-zero-one-two-exit-codes", () => {
    withTempDirectory(directory => {
      const clean = makeInputs(directory)
      expect(runCli(argsFor(clean)).exitCode).toBe(0)
      const blocked = makeInputs(directory, blockedSource, "blocked.ts")
      expect(runCli(argsFor(blocked)).exitCode).toBe(1)
      expect(runCli(["--migration", clean.migrationPath]).exitCode).toBe(2)
    })
  })

  it("reports-write-failure-with-stable-code", () => {
    withTempDirectory(directory => {
      const inputs = makeInputs(directory)
      const laterPath = join(directory, "src", "later.ts")
      writeFileSync(laterPath, safeSource, "utf8")
      let writes = 0
      const args = [
        "--migration", "migration.json",
        "--baseline", "baseline.json",
        "--current", "current.json",
        "--file", "src/consumer.tsx",
        "--file", "src/later.ts",
        "--write",
        "--format", "json",
      ]
      const execution = executeSourceMigrationCommand(args, {
        cwd: directory,
        atomicWrite: (path, source) => {
          writes += 1
          if (writes === 1) writeFileSync(path, source, "utf8")
          else throw new Error("sensitive platform write error")
        },
      })
      expect(execution.exitCode).toBe(2)
      expect(execution.stderr).toBe("")
      expect(execution.stdout).not.toContain("sensitive platform write error")
      expect(writes).toBe(2)
      expect(readFileSync(inputs.sourcePath, "utf8")).toContain("result.container")
      expect(readFileSync(laterPath, "utf8")).toBe(safeSource)
      const report = JSON.parse(execution.stdout)
      expect(report.diagnostics).toEqual([
        expect.objectContaining({ code: "io.write-failed", path: "src/later.ts" }),
      ])
      expect(report.files).toEqual([
        expect.objectContaining({ path: "src/consumer.tsx", status: "written", appliedEditCount: 3 }),
        expect.objectContaining({ path: "src/later.ts", status: "write-failed", appliedEditCount: 0 }),
      ])
    })
  })

  it("renders-equivalent-text-and-canonical-json", () => {
    withTempDirectory(directory => {
      const inputs = makeInputs(directory)
      const text = runCli(argsFor(inputs))
      const json = runCli([...argsFor(inputs), "--format", "json"])
      const report = JSON.parse(json.stdout)
      expect(text.exitCode).toBe(0)
      expect(json.exitCode).toBe(0)
      expect(text.stdout).toContain("Findings: none")
      expect(text.stdout).toContain("explicit-files-only")
      expect(text.stdout).toContain(report.migration.id)
      expect(text.stdout).toContain("consumer.tsx")
      expect(json.stdout.endsWith("\n")).toBe(true)
      expect(JSON.parse(json.stdout)).toEqual(report)
    })
  })
})
