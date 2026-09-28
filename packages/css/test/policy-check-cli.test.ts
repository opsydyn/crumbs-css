import { describe, expect, it } from "bun:test"
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"
import { parsePolicyCheckArgs } from "../../../scripts/m9-4-policy-check"

const repositoryRoot = resolve(import.meta.dir, "../../..")

function testManifest(name = "@acme/design-system") {
  return {
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name, version: "1.2.3" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "crumbs-native-style-artifact", version: 1 },
    },
    tokens: [],
    components: [],
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: { roots: [], unresolved: [] },
  }
}

function testPolicy(options: { readonly preset?: "migration" | "enforce"; readonly scope?: boolean } = {}) {
  return {
    format: "crumbs.css.design-system-policy",
    schemaVersion: 1,
    policyId: "acme.native-policy",
    version: 1,
    preset: { name: options.preset ?? "migration", version: 1 },
    severityOverrides: {},
    literalValueScopes: options.scope === true ? [{ property: "backgroundColor", domain: ["view"] }] : [],
    semanticTokenScopes: [],
    semanticTokenIds: [],
    targetProfiles: [],
    outputBudgets: [],
    exceptions: [],
  }
}

function testStyleMetadata(moduleId = "@acme/app#src/Card.css.ts", declarationId = "declaration-1", property = "backgroundColor") {
  return {
    $$type: "crumbs.css.style-explanation-metadata",
    version: 1,
    moduleId,
    exports: [{
      path: ["card"],
      candidates: [{
        id: declarationId,
        sourceId: moduleId.slice(moduleId.indexOf("#") + 1),
        packageOwner: "@acme/app",
        logicalPath: ["card"],
        authoredProperty: property,
        canonicalProperty: property,
        shorthandExpansionPath: [property],
        primitiveDomain: ["view"],
        order: 0,
        value: "#fff",
      }],
      branches: [],
      tokenDependencies: [],
      coverage: { status: "complete", reasons: [] },
    }],
  }
}

function withTempDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "crumbs-policy-check-"))
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
  const result = Bun.spawnSync([process.execPath, "run", "policy:check", "--", ...args], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() }
}

function basicPaths(directory: string, options: { readonly preset?: "migration" | "enforce"; readonly scope?: boolean } = {}) {
  return {
    policyPath: writeJson(directory, "policy.json", testPolicy(options)),
    currentPath: writeJson(directory, "manifest.json", testManifest()),
    stylePath: writeJson(directory, "styles.json", testStyleMetadata()),
  }
}

describe("policy:check arguments", () => {
  it("requires explicit policy and current files", () => {
    expect(parsePolicyCheckArgs([
      "--policy", "policy.json",
      "--current", "manifest.json",
    ])).toEqual({
      policyPath: "policy.json",
      currentPath: "manifest.json",
      consumerPaths: [],
      styleMetadataPaths: [],
      measurementPaths: [],
      format: "text",
    })
    expect(() => parsePolicyCheckArgs([])).toThrow(/--policy/i)
    expect(() => parsePolicyCheckArgs(["--policy", "policy.json"])).toThrow(/--current/i)
  })

  it("accepts repeatable evidence paths and an explicit evaluation date", () => {
    expect(parsePolicyCheckArgs([
      "--policy", "policy.json",
      "--current", "manifest.json",
      "--consumer", "app-a.json",
      "--consumer", "app-b.json",
      "--style-metadata", "styles-a.json",
      "--style-metadata", "styles-b.json",
      "--measurement", "measurements-a.json",
      "--measurement", "measurements-b.json",
      "--evaluated-on", "2026-09-28",
      "--format", "json",
    ])).toEqual({
      policyPath: "policy.json",
      currentPath: "manifest.json",
      consumerPaths: ["app-a.json", "app-b.json"],
      styleMetadataPaths: ["styles-a.json", "styles-b.json"],
      measurementPaths: ["measurements-a.json", "measurements-b.json"],
      evaluatedOn: "2026-09-28",
      format: "json",
    })
  })

  it("loads repeatable consumer, style-metadata, and measurement files", () => {
    withTempDirectory(directory => {
      const policyPath = writeJson(directory, "policy.json", {
        ...testPolicy({ preset: "enforce", scope: true }),
        outputBudgets: [{ metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "bytes", maximum: 10 }],
      })
      const currentPath = writeJson(directory, "manifest.json", testManifest())
      const consumerA = writeJson(directory, "consumer-a.json", testManifest("@acme/consumer-a"))
      const consumerB = writeJson(directory, "consumer-b.json", testManifest("@acme/consumer-b"))
      const stylesA = writeJson(directory, "styles-a.json", testStyleMetadata())
      const stylesB = writeJson(directory, "styles-b.json", testStyleMetadata("@acme/app#src/Badge.css.ts", "declaration-2", "borderColor"))
      const measurementsA = writeJson(directory, "measurements-a.json", [
        { metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "bytes", value: 11 },
      ])
      const measurementsB = writeJson(directory, "measurements-b.json", [
        { metricId: "unrelated-metric", scopeId: "mobile-entry", unit: "bytes", value: 500 },
      ])
      const result = runCli([
        "--policy", policyPath,
        "--current", currentPath,
        "--consumer", consumerA,
        "--consumer", consumerB,
        "--style-metadata", stylesA,
        "--style-metadata", stylesB,
        "--measurement", measurementsA,
        "--measurement", measurementsB,
        "--format", "json",
      ])
      const report = JSON.parse(result.stdout)
      expect(result.exitCode).toBe(1)
      expect(report.suppliedConsumers).toHaveLength(2)
      expect(report.findings.map((finding: { ruleId: string }) => finding.ruleId)).toEqual([
        "output.budget-exceeded",
        "style.literal-value",
      ])
      expect(report.analysisLimits.map((limit: { code: string }) => limit.code)).toEqual([
        "consumer-coverage",
        "consumer-coverage",
      ])
    })
  })

  it("rejects duplicate singleton options, missing values, and unknown arguments", () => {
    const required = ["--policy", "policy.json", "--current", "manifest.json"]
    expect(() => parsePolicyCheckArgs([...required, "--policy", "other.json"])).toThrow(/duplicate.*--policy/i)
    expect(() => parsePolicyCheckArgs([...required, "--format", "text", "--format", "json"])).toThrow(/duplicate.*--format/i)
    expect(() => parsePolicyCheckArgs([...required, "--surprise", "value"])).toThrow(/unknown.*--surprise/i)
    expect(() => parsePolicyCheckArgs([...required, "--measurement"])).toThrow(/value.*--measurement/i)
    expect(() => parsePolicyCheckArgs(["--policy", "--current", "manifest.json"])).toThrow(/value.*--policy/i)
    expect(() => parsePolicyCheckArgs([...required, "--format", "yaml"])).toThrow(/format.*text.*json/i)
  })

  it("keeps text and canonical JSON findings aligned", () => {
    withTempDirectory(directory => {
      const { policyPath, currentPath, stylePath } = basicPaths(directory, { preset: "enforce", scope: true })
      const text = runCli(["--policy", policyPath, "--current", currentPath, "--style-metadata", stylePath])
      const json = runCli(["--policy", policyPath, "--current", currentPath, "--style-metadata", stylePath, "--format", "json"])
      expect(text.exitCode).toBe(1)
      expect(json.exitCode).toBe(1)
      expect(text.stdout).toContain("style.literal-value")
      expect(text.stdout).toContain("Findings: 1 error, 0 warning, 0 info")
      expect(JSON.parse(json.stdout).findings).toEqual([
        expect.objectContaining({ ruleId: "style.literal-value", level: "error", disposition: "active" }),
      ])
    })
  })

  it("returns zero for warning-only results, one for active errors, and two for invalid inputs", () => {
    withTempDirectory(directory => {
      const warning = basicPaths(directory, { preset: "migration", scope: true })
      expect(runCli(["--policy", warning.policyPath, "--current", warning.currentPath, "--style-metadata", warning.stylePath]).exitCode).toBe(0)

      const error = basicPaths(directory, { preset: "enforce", scope: true })
      expect(runCli(["--policy", error.policyPath, "--current", error.currentPath, "--style-metadata", error.stylePath]).exitCode).toBe(1)

      expect(runCli([]).exitCode).toBe(2)
      const missing = runCli(["--policy", join(directory, "missing.json"), "--current", error.currentPath])
      expect(missing.exitCode).toBe(2)
      expect(missing.stderr).toContain("policy")
      expect(missing.stderr).toContain("missing.json")

      const malformed = writeJson(directory, "malformed-policy.json", { ...testPolicy(), schemaVersion: 2 })
      const invalid = runCli(["--policy", malformed, "--current", error.currentPath])
      expect(invalid.exitCode).toBe(2)
      expect(invalid.stderr).toMatch(/policy.*schemaVersion|schemaVersion/i)
    })
  })

  it("reads only explicitly named inputs and leaves neighboring files alone", () => {
    withTempDirectory(directory => {
      const policyPath = writeJson(directory, "policy.json", testPolicy())
      const currentPath = writeJson(directory, "manifest.json", testManifest())
      writeFileSync(join(directory, "unlisted-malformed.json"), "not json", "utf8")
      const before = readdirSync(directory).sort()
      const result = runCli(["--policy", policyPath, "--current", currentPath, "--format", "json"])
      expect(result.exitCode).toBe(0)
      expect(JSON.parse(result.stdout).findings).toEqual([])
      expect(readdirSync(directory).sort()).toEqual(before)
    })
  })
})
