import { afterEach, describe, expect, it } from "bun:test"
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const packageName = "@acme/design-system"
const contract = { owner: packageName, name: "foundation", version: 1 }
const knownTokenId = `${packageName}#token:color.accent`
const missingTokenId = `${packageName}#token:color.not-supplied`
const temporaryDirectories: string[] = []

function withTempDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "crumbs-ownership-cli-"))
  temporaryDirectories.push(directory)
  run(directory)
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

function writeJson(directory: string, filename: string, value: unknown): string {
  const path = join(directory, filename)
  writeFileSync(path, `${JSON.stringify(value)}\n`, "utf8")
  return path
}

function token(id = knownTokenId) {
  return {
    id,
    contract,
    path: ["color", "accent"],
    visibility: "public",
    domain: { kind: "color" },
    kind: "definition",
    origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
  }
}

function manifest(version = "1.0.0") {
  const root = `${contract.owner}#${contract.name}@${contract.version}`
  return {
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: packageName, version },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "1.2.3" },
      artifact: { name: "crumbs.native-style-artifact", version: 1 },
    },
    tokens: [token()],
    components: [],
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: { roots: [{ kind: "token-contract", id: root }], unresolved: [] },
  }
}

function ownership() {
  return {
    format: "crumbs.design-system-ownership",
    schemaVersion: 1,
    owners: [{ id: "team:tokens", displayName: "Tokens" }],
    assignments: [{ entityId: knownTokenId, ownerId: "team:tokens" }],
  }
}

function compatibilityReport(providerVersion = "1.0.0") {
  return {
    format: "crumbs.design-system-compatibility-report",
    schemaVersion: 1,
    mode: "check",
    provider: { name: packageName, currentVersion: providerVersion },
    suppliedConsumers: [],
    findings: [{
      code: "token.added",
      level: "info",
      entityId: missingTokenId,
      fieldPath: "token",
      message: "The token is not in the explicitly supplied manifest.",
      affectedConsumers: [],
    }],
    analysisLimits: [],
  }
}

function writeInputs(directory: string, providerVersion = "1.0.0") {
  return {
    ownershipPath: writeJson(directory, "ownership.json", ownership()),
    manifestPath: writeJson(directory, "manifest.json", manifest()),
    reportPath: writeJson(directory, "report.json", compatibilityReport(providerVersion)),
  }
}

async function getCli() {
  let cli: typeof import("../../../scripts/m9-7-ownership-annotate") | undefined
  try {
    cli = await import("../../../scripts/m9-7-ownership-annotate")
  } catch {
    cli = undefined
  }
  expect(cli?.parseOwnershipAnnotateArgs).toBeDefined()
  expect(cli?.executeOwnershipAnnotateCommand).toBeDefined()
  expect(cli?.formatOwnershipReportText).toBeDefined()
  return cli!
}

function runCli(args: ReadonlyArray<string>) {
  const result = Bun.spawnSync([process.execPath, "run", "ownership:annotate", "--", ...args], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() }
}

describe("ownership:annotate arguments", () => {
  it("requires ownership, at least one manifest, and a report, defaulting to text", async () => {
    const cli = await getCli()
    expect(cli.parseOwnershipAnnotateArgs([
      "--ownership", "ownership.json",
      "--manifest", "manifest.json",
      "--report", "report.json",
    ])).toEqual({
      ownershipPath: "ownership.json",
      manifestPaths: ["manifest.json"],
      reportPath: "report.json",
      format: "text",
    })
    expect(() => cli.parseOwnershipAnnotateArgs([])).toThrow(/--ownership/i)
    expect(() => cli.parseOwnershipAnnotateArgs(["--ownership", "ownership.json", "--report", "report.json"]))
      .toThrow(/--manifest/i)
    expect(() => cli.parseOwnershipAnnotateArgs(["--ownership", "ownership.json", "--manifest", "manifest.json"]))
      .toThrow(/--report/i)
  })

  it("accepts Bun's leading separator, repeated manifests, and JSON output", async () => {
    const cli = await getCli()
    expect(cli.parseOwnershipAnnotateArgs([
      "--", "--ownership", "ownership.json",
      "--manifest", "baseline.json",
      "--manifest", "current.json",
      "--report", "report.json",
      "--format", "json",
    ])).toEqual({
      ownershipPath: "ownership.json",
      manifestPaths: ["baseline.json", "current.json"],
      reportPath: "report.json",
      format: "json",
    })
  })

  it("rejects duplicate singleton flags, missing values, unknown options, and positionals", async () => {
    const cli = await getCli()
    const required = ["--ownership", "ownership.json", "--manifest", "manifest.json", "--report", "report.json"]
    expect(() => cli.parseOwnershipAnnotateArgs([...required, "--ownership", "other.json"])).toThrow(/duplicate.*--ownership/i)
    expect(() => cli.parseOwnershipAnnotateArgs([...required, "--format", "text", "--format", "json"])).toThrow(/duplicate.*--format/i)
    expect(() => cli.parseOwnershipAnnotateArgs(["--ownership"])).toThrow(/value.*--ownership|--ownership.*value/i)
    expect(() => cli.parseOwnershipAnnotateArgs([...required, "--manifest"])).toThrow(/value.*--manifest|--manifest.*value/i)
    expect(() => cli.parseOwnershipAnnotateArgs([...required, "--surprise", "value"])).toThrow(/unknown.*--surprise/i)
    expect(() => cli.parseOwnershipAnnotateArgs([...required, "extra.json"])).toThrow(/positional/i)
    expect(() => cli.parseOwnershipAnnotateArgs([...required, "--format", "yaml"])).toThrow(/format.*text.*json|unsupported.*format/i)
  })
})

describe("ownership:annotate execution", () => {
  it("uses only named files and returns unresolved references successfully", async () => {
    const cli = await getCli()
    withTempDirectory(directory => {
      const inputs = writeInputs(directory)
      writeFileSync(join(directory, "do-not-read.json"), "{ malformed", "utf8")
      const result = cli.executeOwnershipAnnotateCommand({
        ownershipPath: inputs.ownershipPath,
        manifestPaths: [inputs.manifestPath],
        reportPath: inputs.reportPath,
        format: "json",
      })

      expect(result.exitCode).toBe(0)
      expect(result.ownedReport.attributions).toEqual([{
        jsonPointer: "/findings/0/entityId",
        entityId: missingTokenId,
        status: "unresolved",
        reason: "entity-not-in-supplied-manifests",
      }])
      expect(readdirSync(directory).sort()).toEqual(["do-not-read.json", "manifest.json", "ownership.json", "report.json"])
    })
  })

  it("renders canonical JSON and text with the same statuses, counts, and RFC 6901 locations", async () => {
    const cli = await getCli()
    withTempDirectory(directory => {
      const inputs = writeInputs(directory)
      const json = runCli([
        "--ownership", inputs.ownershipPath,
        "--manifest", inputs.manifestPath,
        "--report", inputs.reportPath,
        "--format", "json",
      ])
      const text = runCli([
        "--ownership", inputs.ownershipPath,
        "--manifest", inputs.manifestPath,
        "--report", inputs.reportPath,
      ])
      const parsed = JSON.parse(json.stdout)

      expect(json.exitCode).toBe(0)
      expect(text.exitCode).toBe(0)
      expect(parsed.attributions).toEqual([{
        jsonPointer: "/findings/0/entityId",
        entityId: missingTokenId,
        status: "unresolved",
        reason: "entity-not-in-supplied-manifests",
      }])
      expect(json.stdout.endsWith("\n")).toBe(true)
      expect(text.stdout).toContain("Unresolved: 1")
      expect(text.stdout).toContain("/findings/0/entityId")
      expect(cli.formatOwnershipReportText(parsed)).toBe(text.stdout)
    })
  })

  it("qualifies provider mismatches and unreadable or malformed files with their paths", () => {
    withTempDirectory(directory => {
      const mismatch = writeInputs(directory, "2.0.0")
      const mismatchResult = runCli([
        "--ownership", mismatch.ownershipPath,
        "--manifest", mismatch.manifestPath,
        "--report", mismatch.reportPath,
      ])
      expect(mismatchResult.exitCode).toBe(2)
      expect(mismatchResult.stderr).toContain(mismatch.reportPath)
      expect(mismatchResult.stderr).toContain("2.0.0")

      const unreadablePath = join(directory, "missing.json")
      const unreadable = runCli([
        "--ownership", mismatch.ownershipPath,
        "--manifest", unreadablePath,
        "--report", mismatch.reportPath,
      ])
      expect(unreadable.exitCode).toBe(2)
      expect(unreadable.stderr).toContain(unreadablePath)

      writeFileSync(join(directory, "malformed-report.json"), "{bad", "utf8")
      const malformedReportPath = join(directory, "malformed-report.json")
      const malformed = runCli([
        "--ownership", mismatch.ownershipPath,
        "--manifest", mismatch.manifestPath,
        "--report", malformedReportPath,
      ])
      expect(malformed.exitCode).toBe(2)
      expect(malformed.stderr).toContain(malformedReportPath)
      expect(malformed.stderr).toContain("JSON")
    })
  })

  it("returns exit code 2 for unsupported source formats and schema versions", () => {
    withTempDirectory(directory => {
      const inputs = writeInputs(directory)
      const unsupportedPath = writeJson(directory, "unsupported.json", {
        ...compatibilityReport(),
        schemaVersion: 2,
      })
      const result = runCli([
        "--ownership", inputs.ownershipPath,
        "--manifest", inputs.manifestPath,
        "--report", unsupportedPath,
      ])
      expect(result.exitCode).toBe(2)
      expect(result.stderr).toContain(unsupportedPath)
      expect(result.stderr).toMatch(/schemaVersion|version/i)
    })
  })
})
