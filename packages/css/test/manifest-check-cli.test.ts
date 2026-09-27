import { describe, expect, it } from "bun:test"
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { parseManifestCheckArgs } from "../../../scripts/m9-2-manifest-check"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const providerName = "@acme/design-system"

function testManifest(input: {
  readonly name?: string
  readonly version?: string
  readonly schemaVersion?: number
  readonly tokens?: ReadonlyArray<Record<string, unknown>>
  readonly components?: ReadonlyArray<Record<string, unknown>>
  readonly modules?: ReadonlyArray<Record<string, unknown>>
  readonly dependencies?: ReadonlyArray<Record<string, unknown>>
}) {
  const name = input.name ?? providerName
  const tokens = input.tokens ?? []
  const components = input.components ?? []
  const modules = input.modules ?? []
  return {
    format: "crumbs.design-system-manifest",
    schemaVersion: input.schemaVersion ?? 1,
    package: { name, version: input.version ?? "1.3.0" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "1.2.0" },
      artifact: { name: "crumbs-native-style-artifact", version: 1 },
    },
    tokens,
    components,
    modules,
    dependencies: input.dependencies ?? [],
    capabilities: [],
    coverage: {
      roots: [
        ...(tokens.length === 0 ? [] : [{ kind: "token-contract", id: `${name}#foundation@1` }]),
        ...components.map(component => ({ kind: "component-recipe", id: component.id as string })),
        ...modules.map(module => ({ kind: "style-module", id: module.id as string })),
      ],
      unresolved: [],
    },
  }
}

function testToken(visibility: "public" | "private" = "public") {
  return {
    id: `${providerName}#token:color.surface`,
    contract: { owner: providerName, name: "foundation", version: 1 },
    path: ["color", "surface"],
    visibility,
    domain: { kind: "color" },
    kind: "definition",
    origin: { path: "src/tokens/color-surface.css.ts" },
  }
}

function testComponent(defaultValue: string) {
  return {
    id: `${providerName}#component:Button`,
    contract: { owner: providerName, name: "Button", version: 1 },
    origin: { path: "src/Button.css.ts", exportPath: "Button" },
    slots: ["root"],
    variants: { size: ["small", "large"] },
    extensionPoints: [],
    stateConstraints: [],
    defaults: { size: defaultValue },
  }
}

function withTempDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "crumbs-manifest-check-"))
  try {
    run(directory)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function writeJson(directory: string, filename: string, value: unknown): string {
  const path = join(directory, filename)
  writeFileSync(path, `${JSON.stringify(value)}\n`, "utf8")
  return path
}

function runCli(args: ReadonlyArray<string>) {
  const result = Bun.spawnSync([process.execPath, "run", "manifest:check", "--", ...args], {
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

describe("manifest:check arguments", () => {
  it("requires current and defaults to text with no consumers", () => {
    expect(parseManifestCheckArgs(["--current", "current.json"])).toEqual({
      currentPath: "current.json",
      consumerPaths: [],
      format: "text",
    })
    expect(() => parseManifestCheckArgs([])).toThrow(/--current/i)
  })

  it("accepts a baseline, repeated consumer paths, and JSON format", () => {
    expect(parseManifestCheckArgs([
      "--current", "current.json",
      "--baseline", "baseline.json",
      "--consumer", "app-a.json",
      "--consumer", "app-b.json",
      "--format", "json",
    ])).toEqual({
      currentPath: "current.json",
      baselinePath: "baseline.json",
      consumerPaths: ["app-a.json", "app-b.json"],
      format: "json",
    })
  })

  it("accepts Bun's leading argument separator", () => {
    expect(parseManifestCheckArgs(["--", "--current", "current.json"])).toMatchObject({
      currentPath: "current.json",
      format: "text",
    })
  })

  it("rejects invalid formats, duplicate/unknown flags, and missing values", () => {
    expect(() => parseManifestCheckArgs(["--current", "current.json", "--format", "yaml"])).toThrow(/format.*text.*json|unsupported.*format/i)
    expect(() => parseManifestCheckArgs(["--current", "one.json", "--current", "two.json"])).toThrow(/duplicate.*--current/i)
    expect(() => parseManifestCheckArgs(["--current", "current.json", "--surprise", "value"])).toThrow(/unknown.*--surprise/i)
    expect(() => parseManifestCheckArgs(["--current"])).toThrow(/value.*--current|--current.*value/i)
    expect(() => parseManifestCheckArgs(["--current", "--baseline", "baseline.json"])).toThrow(/value.*--current|--current.*value/i)
    expect(() => parseManifestCheckArgs(["--current", "current.json", "--consumer"])).toThrow(/value.*--consumer|--consumer.*value/i)
  })

  it("runs clean checks with matching text and canonical JSON output without writing reports", () => {
    withTempDirectory(directory => {
      const currentPath = writeJson(directory, "current.json", testManifest({}))
      const text = runCli(["--current", currentPath, "--format", "text"])
      const json = runCli(["--current", currentPath, "--format", "json"])
      expect(text.exitCode).toBe(0)
      expect(json.exitCode).toBe(0)
      expect(text.stdout).toContain("Mode: check")
      expect(text.stdout).toContain("Findings: none")
      expect(text.stdout).toContain("explicit-coverage")
      expect(JSON.parse(json.stdout)).toMatchObject({ mode: "check", findings: [] })
      expect(readdirSync(directory).sort()).toEqual(["current.json"])
    })
  })

  it("returns zero for warning-only comparisons and keeps text and JSON findings aligned", () => {
    withTempDirectory(directory => {
      const baselinePath = writeJson(directory, "baseline.json", testManifest({ version: "1.2.0", components: [testComponent("small")] }))
      const currentPath = writeJson(directory, "current.json", testManifest({ components: [testComponent("large")] }))
      const text = runCli(["--baseline", baselinePath, "--current", currentPath])
      const json = runCli(["--baseline", baselinePath, "--current", currentPath, "--format", "json"])
      const report = JSON.parse(json.stdout)
      expect(text.exitCode).toBe(0)
      expect(json.exitCode).toBe(0)
      expect(text.stdout).toContain("component.default-changed")
      expect(report.findings).toEqual([expect.objectContaining({ code: "component.default-changed", level: "warning" })])
    })
  })

  it("returns one for structural errors and private-token dependencies", () => {
    withTempDirectory(directory => {
      const baselinePath = writeJson(directory, "breaking-baseline.json", testManifest({ version: "1.2.0", tokens: [testToken()] }))
      const currentPath = writeJson(directory, "current.json", testManifest({}))
      const breaking = runCli(["--baseline", baselinePath, "--current", currentPath, "--format", "json"])
      expect(breaking.exitCode).toBe(1)
      expect(JSON.parse(breaking.stdout).findings).toEqual([expect.objectContaining({ code: "token.removed", level: "error" })])

      const privateToken = testToken("private")
      const privateCurrent = writeJson(directory, "private-current.json", testManifest({ tokens: [privateToken] }))
      const moduleId = "@acme/app#src/styles.css.ts"
      const consumer = testManifest({
        name: "@acme/app",
        version: "2.0.0",
        modules: [{ id: moduleId, origin: { path: "src/styles.css.ts" }, exports: ["Card"] }],
        dependencies: [{
          from: moduleId,
          to: privateToken.id,
          kind: "style-token",
          resolution: "external",
          origin: { moduleId, exportPath: "Card", property: "backgroundColor" },
        }],
      })
      const consumerPath = writeJson(directory, "consumer.json", consumer)
      const privateCheck = runCli(["--current", privateCurrent, "--consumer", consumerPath, "--format", "json"])
      expect(privateCheck.exitCode).toBe(1)
      expect(JSON.parse(privateCheck.stdout).findings).toEqual([expect.objectContaining({
        code: "consumer.private-token-dependency",
        entityId: privateToken.id,
        affectedConsumers: [expect.objectContaining({ package: { name: "@acme/app", version: "2.0.0" } })],
      })])
    })
  })

  it("returns two for invalid invocation, unreadable or malformed files, unsupported versions, and package mismatch", () => {
    withTempDirectory(directory => {
      const missingInvocation = runCli([])
      expect(missingInvocation.exitCode).toBe(2)
      expect(missingInvocation.stderr).toMatch(/--current/i)

      const missingPath = join(directory, "missing.json")
      const unreadable = runCli(["--current", missingPath])
      expect(unreadable.exitCode).toBe(2)
      expect(unreadable.stderr).toContain(missingPath)
      expect(unreadable.stderr).toContain("current manifest")

      const malformedPath = join(directory, "malformed.json")
      writeFileSync(malformedPath, "{broken", "utf8")
      const malformed = runCli(["--current", malformedPath])
      expect(malformed.exitCode).toBe(2)
      expect(malformed.stderr).toContain("Invalid JSON")
      expect(malformed.stderr).toContain(malformedPath)

      const unsupportedPath = writeJson(directory, "unsupported.json", testManifest({ schemaVersion: 2 }))
      const unsupported = runCli(["--current", unsupportedPath])
      expect(unsupported.exitCode).toBe(2)
      expect(unsupported.stderr).toContain(unsupportedPath)
      expect(unsupported.stderr).toMatch(/schemaVersion|version/i)

      const baselinePath = writeJson(directory, "other-baseline.json", testManifest({ name: "@acme/other", version: "1.2.0" }))
      const currentPath = writeJson(directory, "identity-current.json", testManifest({}))
      const incompatible = runCli(["--baseline", baselinePath, "--current", currentPath])
      expect(incompatible.exitCode).toBe(2)
      expect(incompatible.stderr).toContain(baselinePath)
      expect(incompatible.stderr).toContain(currentPath)
      expect(incompatible.stderr).toMatch(/package names must match/i)
    })
  })
})
