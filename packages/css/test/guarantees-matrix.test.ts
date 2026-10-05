import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

type Issue = { readonly code: string; readonly message: string; readonly path?: string }
type MatrixApi = {
  readonly decodeGuaranteesMatrix: (input: unknown) => Matrix
  readonly validateGuaranteesMatrix: (matrix: Matrix, repositoryRoot: string, currentSourceRevision?: string) => ReadonlyArray<Issue>
  readonly renderGuaranteesMatrix: (matrix: Matrix) => string
  readonly generatedPageCheckIssues: (expected: string, actual: string) => ReadonlyArray<Issue>
  readonly runGuaranteesMatrixCommand: (command: "check" | "render", repositoryRoot: string) => string
}
type Matrix = {
  readonly format: string
  readonly schemaVersion: number
  readonly rows: ReadonlyArray<Record<string, unknown>>
}

const domains = ["compatibility", "property", "type-editor", "package-runtime", "documentation", "visual", "device"] as const
const sourcePath = resolve(dirname(new URL(import.meta.url).pathname), "../../../scripts/guarantees-matrix/model.ts")
const validatePath = resolve(dirname(new URL(import.meta.url).pathname), "../../../scripts/guarantees-matrix/validate.ts")
const renderPath = resolve(dirname(new URL(import.meta.url).pathname), "../../../scripts/guarantees-matrix/render.ts")
const commandPath = resolve(dirname(new URL(import.meta.url).pathname), "../../../scripts/guarantees-matrix.ts")
const evidenceBytes = Buffer.from("{\"captured\":true}\n")
let repositoryRoot = ""

async function loadApi(): Promise<MatrixApi | undefined> {
  if (![sourcePath, validatePath, renderPath, commandPath].every(existsSync)) return undefined
  const [model, validation, renderer, command] = await Promise.all([
    import(pathToFileURL(sourcePath).href),
    import(pathToFileURL(validatePath).href),
    import(pathToFileURL(renderPath).href),
    import(pathToFileURL(commandPath).href),
  ])
  return {
    decodeGuaranteesMatrix: model.decodeGuaranteesMatrix,
    validateGuaranteesMatrix: (matrix, root, currentSourceRevision = repositoryHeadFor(root)) =>
      validation.validateGuaranteesMatrix(matrix, root, currentSourceRevision),
    renderGuaranteesMatrix: renderer.renderGuaranteesMatrix,
    generatedPageCheckIssues: renderer.generatedPageCheckIssues,
    runGuaranteesMatrixCommand: command.runGuaranteesMatrixCommand,
  } as MatrixApi
}

function baseMatrix(): Record<string, unknown> {
  const evidence = {
    path: "docs/evidence/test/sample.json",
    sha256: createHash("sha256").update(evidenceBytes).digest("hex"),
    sourceRevision: repositoryHeadFor(repositoryRoot),
    command: "bun test fixture",
    environment: { name: "Node host", versions: { node: "22.0.0" } },
    resultStatus: "passed",
    result: "passed",
    scopeLimit: "A deterministic unit-test fixture only.",
  }

  return {
    format: "crumbs.guarantees-matrix",
    schemaVersion: 1,
    rows: domains.map((domain, index) => ({
      id: `${domain}.baseline`,
      domain,
      claim: `The ${domain} contract is declared for this exact scope.`,
      supportStatus: "supported",
      measurementStatus: index === 0 ? "passed" : "not-run",
      ...(index === 0 ? {} : { measurementNote: "No current run is attached to this row." }),
      basis: [{ path: "packages/css/src/contracts/reference.md", role: "contract" }],
      evidence: index === 0 ? [evidence] : [],
      ...(index === 0 ? { budget: { metricId: "js-frame-time", thresholdStatus: "pending-review" } } : {}),
    })),
  }
}

function issueCodes(issues: ReadonlyArray<Issue>): ReadonlyArray<string> {
  return issues.map(({ code }) => code)
}

function repositoryHeadFor(root: string): string {
  return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim()
}

describe("M10.5 guarantees matrix contract and renderer", () => {
  beforeEach(() => {
    repositoryRoot = mkdtempSync(join(tmpdir(), "crumbs-guarantees-matrix-"))
    mkdirSync(join(repositoryRoot, "packages/css/src/contracts"), { recursive: true })
    mkdirSync(join(repositoryRoot, "packages/css/bench"), { recursive: true })
    mkdirSync(join(repositoryRoot, "packages/css/src"), { recursive: true })
    mkdirSync(join(repositoryRoot, "docs/evidence/test"), { recursive: true })
    writeFileSync(join(repositoryRoot, "packages/css/src/contracts/reference.md"), "Fixture contract source.\n")
    writeFileSync(join(repositoryRoot, "packages/css/src/source.ts"), "export const source = true\n")
    writeFileSync(join(repositoryRoot, "packages/css/bench/budgets.json"), JSON.stringify({
      metrics: [{ id: "js-frame-time", threshold: { status: "pending-review" } }],
    }))
    writeFileSync(join(repositoryRoot, "docs/evidence/test/sample.json"), evidenceBytes)
    execFileSync("git", ["init", "-q", repositoryRoot], { stdio: "ignore" })
    execFileSync("git", ["-C", repositoryRoot, "add", "packages/css/src/source.ts"], { stdio: "ignore" })
    execFileSync("git", ["-C", repositoryRoot, "-c", "user.name=Crumbs test", "-c", "user.email=crumbs-test@example.invalid", "commit", "-m", "source fixture"], { stdio: "ignore" })
  })

  afterEach(() => {
    if (repositoryRoot !== "") rmSync(repositoryRoot, { recursive: true, force: true })
  })

  it("accepts content-pinned evidence across commits and rejects source drift even at the same revision", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }
    const { captureGuaranteesSourceIdentity } = await import("../../../scripts/guarantees-matrix/source-identity")
    const input = baseMatrix() as any
    input.rows[0].evidence[0].sourceDigest = captureGuaranteesSourceIdentity(repositoryRoot).sha256
    input.rows[0].evidence[0].sourceRevision = "0".repeat(40)
    const matrix = api.decodeGuaranteesMatrix(input)
    expect(issueCodes(api.validateGuaranteesMatrix(matrix, repositoryRoot))).toEqual([])
    writeFileSync(join(repositoryRoot, "packages/css/src/source.ts"), "export const source = false\n")
    expect(issueCodes(api.validateGuaranteesMatrix(matrix, repositoryRoot))).toContain("evidence-source-revision-mismatch")
  })

  it("accepts a complete representative matrix", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = api.decodeGuaranteesMatrix(baseMatrix())
    expect(issueCodes(api.validateGuaranteesMatrix(matrix, repositoryRoot))).toEqual([])
  })

  it("retains historical evidence revision, environment, and scope", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrixPath = resolve(dirname(new URL(import.meta.url).pathname), "../../../docs/guarantees/matrix.v1.json")
    const matrix = api.decodeGuaranteesMatrix(JSON.parse(readFileSync(matrixPath, "utf8")) as unknown)
    const historicalRow = matrix.rows.find(row => row.id === "compatibility.m10-4-report")
    const evidence = (historicalRow?.evidence as Array<Record<string, unknown>> | undefined)?.[0]
    const environment = evidence?.environment as { readonly name?: unknown; readonly versions?: Record<string, unknown> } | undefined

    expect(historicalRow?.measurementStatus).toBe("stale")
    expect(evidence?.sourceRevision).toBe("b5faf33f43895ad827a4eba2e45c0064508e6beb")
    expect(environment?.name).toBe("macOS arm64 host with packed Expo consumer")
    expect(environment?.versions).toMatchObject({ expo: "56.0.4", "react-native": "0.85.3" })
    expect(evidence?.scopeLimit).toContain("not a current or universal consumer-compatibility pass")

    const implementedApiRow = matrix.rows.find(row => row.id === "type-editor.condition-slot-api")
    expect(implementedApiRow?.supportStatus).toBe("supported")
    expect(implementedApiRow?.measurementStatus).toBe("not-run")
  })

  it("rejects unknown versions and fields", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    expect(() => api.decodeGuaranteesMatrix({ ...baseMatrix(), schemaVersion: 2 })).toThrow()
    expect(() => api.decodeGuaranteesMatrix({ ...baseMatrix(), surprise: true })).toThrow()
    const matrix = baseMatrix()
    const rows = matrix.rows as Array<Record<string, unknown>>
    expect(() => api.decodeGuaranteesMatrix({ ...matrix, rows: [{ ...rows[0], surprise: true }, ...rows.slice(1)] })).toThrow()
  })

  it("rejects duplicate row IDs and missing required domains", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = baseMatrix()
    const rows = matrix.rows as Array<Record<string, unknown>>
    const duplicates = rows.map(row => ({ ...row }))
    duplicates[1] = { ...duplicates[1]!, id: duplicates[0]!.id }
    expect(issueCodes(api.validateGuaranteesMatrix(api.decodeGuaranteesMatrix({ ...matrix, rows: duplicates }), repositoryRoot))).toContain("duplicate-row-id")
    expect(issueCodes(api.validateGuaranteesMatrix(api.decodeGuaranteesMatrix({ ...matrix, rows: rows.slice(1) }), repositoryRoot))).toContain("missing-domain")
  })

  it("rejects invalid status combinations and unsupported claims without a contract or policy basis", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = baseMatrix()
    const rows = matrix.rows as Array<Record<string, unknown>>
    for (const measurementStatus of ["passed", "failed"] as const) {
      const withoutEvidence = rows.map(row => ({ ...row }))
      withoutEvidence[0] = { ...withoutEvidence[0]!, measurementStatus, evidence: [] }
      expect(issueCodes(api.validateGuaranteesMatrix(api.decodeGuaranteesMatrix({ ...matrix, rows: withoutEvidence }), repositoryRoot))).toContain("measurement-evidence-required")
    }

    const unsupportedWithoutPolicy = rows.map(row => ({ ...row }))
    unsupportedWithoutPolicy[0] = {
      ...unsupportedWithoutPolicy[0]!,
      supportStatus: "unsupported",
      basis: [{ path: "packages/css/src/contracts/reference.md", role: "test" }],
    }
    expect(issueCodes(api.validateGuaranteesMatrix(api.decodeGuaranteesMatrix({ ...matrix, rows: unsupportedWithoutPolicy }), repositoryRoot))).toContain("unsupported-basis-required")
  })

  it("rejects absolute, traversing, Windows-style, and symlink-escaping references", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = baseMatrix()
    const rows = matrix.rows as Array<Record<string, unknown>>
    for (const path of ["/etc/passwd", "../outside.md", "C:\\outside.md"]) {
      const invalid = rows.map(row => ({ ...row }))
      invalid[0] = { ...invalid[0]!, basis: [{ path, role: "contract" }] }
      expect(issueCodes(api.validateGuaranteesMatrix(api.decodeGuaranteesMatrix({ ...matrix, rows: invalid }), repositoryRoot))).toContain("unsafe-reference-path")
    }

    const outside = join(tmpdir(), `crumbs-outside-${Date.now()}.md`)
    const link = join(repositoryRoot, "packages/css/src/contracts/escape.md")
    writeFileSync(outside, "outside root\n")
    symlinkSync(outside, link)
    try {
      const escaped = rows.map(row => ({ ...row }))
      escaped[0] = { ...escaped[0]!, basis: [{ path: "packages/css/src/contracts/escape.md", role: "contract" }] }
      expect(issueCodes(api.validateGuaranteesMatrix(api.decodeGuaranteesMatrix({ ...matrix, rows: escaped }), repositoryRoot))).toContain("reference-outside-root")
    } finally {
      rmSync(link, { force: true })
      rmSync(outside, { force: true })
    }
  })

  it("keeps evidence paths below docs/evidence and rejects evidence symlink escapes", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = baseMatrix()
    const rows = matrix.rows as Array<Record<string, unknown>>
    const evidence = (rows[0]!.evidence as Array<Record<string, unknown>>)[0]!
    const outsideEvidence = rows.map(row => ({ ...row }))
    outsideEvidence[0] = { ...outsideEvidence[0]!, evidence: [{ ...evidence, path: "packages/css/src/contracts/reference.md" }] }
    expect(issueCodes(api.validateGuaranteesMatrix(api.decodeGuaranteesMatrix({ ...matrix, rows: outsideEvidence }), repositoryRoot))).toContain("evidence-outside-root")

    const outside = join(tmpdir(), `crumbs-evidence-outside-${Date.now()}.json`)
    const link = join(repositoryRoot, "docs/evidence/test/escape.json")
    writeFileSync(outside, evidenceBytes)
    symlinkSync(outside, link)
    try {
      const escapedEvidence = rows.map(row => ({ ...row }))
      escapedEvidence[0] = { ...escapedEvidence[0]!, evidence: [{ ...evidence, path: "docs/evidence/test/escape.json" }] }
      expect(issueCodes(api.validateGuaranteesMatrix(api.decodeGuaranteesMatrix({ ...matrix, rows: escapedEvidence }), repositoryRoot))).toContain("reference-outside-root")
    } finally {
      rmSync(link, { force: true })
      rmSync(outside, { force: true })
    }
  })

  it("requires complete evidence identity and scope metadata", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = baseMatrix()
    const rows = matrix.rows as Array<Record<string, unknown>>
    const evidence = (rows[0]!.evidence as Array<Record<string, unknown>>)[0]!
    const invalidRows = rows.map(row => ({ ...row }))
    invalidRows[0] = { ...invalidRows[0]!, evidence: [{ ...evidence, sourceRevision: "", environment: { name: "", versions: {} }, scopeLimit: "" }] }
    expect(() => api.decodeGuaranteesMatrix({ ...matrix, rows: invalidRows })).toThrow()
  })

  it("detects evidence hash mismatches", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = baseMatrix()
    const rows = matrix.rows as Array<Record<string, unknown>>
    const evidence = (rows[0]!.evidence as Array<Record<string, unknown>>)[0]!
    const invalidRows = rows.map(row => ({ ...row }))
    invalidRows[0] = { ...invalidRows[0]!, evidence: [{ ...evidence, sha256: "0".repeat(64) }] }
    expect(issueCodes(api.validateGuaranteesMatrix(api.decodeGuaranteesMatrix({ ...matrix, rows: invalidRows }), repositoryRoot))).toContain("evidence-hash-mismatch")
  })

  it("does not promote evidence from a historical revision to a current measurement", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = api.decodeGuaranteesMatrix(baseMatrix())
    const currentRevision = "b".repeat(40)
    expect(issueCodes(api.validateGuaranteesMatrix(matrix, repositoryRoot, currentRevision))).toContain("evidence-source-revision-mismatch")

    const staleRows = matrix.rows.map((row, index) => index === 0
      ? { ...row, measurementStatus: "stale", measurementNote: "The retained result belongs to an earlier source revision." }
      : row)
    expect(issueCodes(api.validateGuaranteesMatrix({ ...matrix, rows: staleRows }, repositoryRoot, currentRevision))).not.toContain("evidence-source-revision-mismatch")
  })

  it("rejects evidence outcomes that contradict the row measurement status", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = baseMatrix()
    const rows = matrix.rows as Array<Record<string, unknown>>
    const evidence = (rows[0]!.evidence as Array<Record<string, unknown>>)[0]!
    const contradictoryRows = rows.map((row, index) => index === 0
      ? { ...row, evidence: [{ ...evidence, resultStatus: "failed" }] }
      : row)
    const contradictory = api.decodeGuaranteesMatrix({ ...matrix, rows: contradictoryRows })
    expect(issueCodes(api.validateGuaranteesMatrix(contradictory, repositoryRoot))).toContain("measurement-evidence-outcome-mismatch")

    const failedRows = rows.map((row, index) => index === 0
      ? { ...row, measurementStatus: "failed", measurementNote: "The row claims failure but its evidence says passed." }
      : row)
    const failedWithoutFailedEvidence = api.decodeGuaranteesMatrix({ ...matrix, rows: failedRows })
    expect(issueCodes(api.validateGuaranteesMatrix(failedWithoutFailedEvidence, repositoryRoot))).toContain("measurement-evidence-outcome-mismatch")
  })

  it("does not promote absent, stale, failed, or uncalibrated evidence to a passed guarantee", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = api.decodeGuaranteesMatrix(baseMatrix())
    const failedEvidence = (matrix.rows[0]!.evidence as Array<Record<string, unknown>>).map((evidence: Record<string, unknown>) => ({
      ...evidence,
      resultStatus: "failed",
      result: "The fixture runner exited with status 1.",
    }))
    const rows = matrix.rows.map((row, index) => index === 0
      ? { ...row, measurementStatus: "stale", measurementNote: "Historical evidence only." }
      : index === 2
        ? { ...row, measurementStatus: "not-calibrated", measurementNote: "No approved threshold is available." }
        : index === 3
          ? { ...row, measurementStatus: "failed", measurementNote: "The fixture runner exited with status 1.", evidence: failedEvidence }
        : row)
    const output = api.renderGuaranteesMatrix({ ...matrix, rows })
    expect(output).toContain("stale")
    expect(output).toContain("not-run")
    expect(output).toContain("not-calibrated")
    expect(output).toContain("The fixture runner exited with status 1.")
    expect(output).toContain("| package-runtime.baseline | package-runtime | The package-runtime contract is declared for this exact scope. | supported | failed Note: The fixture runner exited with status 1. |")
    expect(output).not.toContain("**Measurement status:** passed")
  })

  it("keeps a pending budget out of performance guarantees", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const output = api.renderGuaranteesMatrix(api.decodeGuaranteesMatrix(baseMatrix()))
    expect(output).toContain("pending-review")
    expect(output).toContain("not an approved performance guarantee")
  })

  it("escapes MDX-sensitive text and preserves declared row order", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = api.decodeGuaranteesMatrix(baseMatrix())
    const rows = matrix.rows.map((row, index) => index === 0
      ? { ...row, claim: "A <safe> {claim} | line\nnext" }
      : row)
    const output = api.renderGuaranteesMatrix({ ...matrix, rows })
    expect(output).toContain("&lt;safe&gt;")
    expect(output).toContain("&#123;claim&#125;")
    expect(output.indexOf("compatibility.baseline")).toBeLessThan(output.indexOf("property.baseline"))
    expect(output).not.toContain("A <safe> {claim}")
  })

  it("renders byte-identically for repeated input", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const matrix = api.decodeGuaranteesMatrix(baseMatrix())
    expect(api.renderGuaranteesMatrix(matrix)).toBe(api.renderGuaranteesMatrix(matrix))
  })

  it("detects stale generated MDX", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    expect(issueCodes(api.generatedPageCheckIssues("# Current matrix\n", "# Old matrix\n"))).toContain("generated-page-stale")
    expect(api.generatedPageCheckIssues("# Current matrix\n", "# Current matrix\n")).toEqual([])
  })

  it("keeps source evidence current across a docs-only commit and rejects a generated-page symlink", async () => {
    const api = await loadApi()
    if (!api) { expect(api).toBeDefined(); return }

    const sourceRevision = repositoryHeadFor(repositoryRoot)

    const matrix = baseMatrix()
    const rows = matrix.rows as Array<Record<string, unknown>>
    const evidence = (rows[0]!.evidence as Array<Record<string, unknown>>)[0]!
    rows[0] = { ...rows[0]!, evidence: [{ ...evidence, sourceRevision }] }
    mkdirSync(join(repositoryRoot, "docs/guarantees"), { recursive: true })
    mkdirSync(join(repositoryRoot, "docs/src/content/docs/reference"), { recursive: true })
    writeFileSync(join(repositoryRoot, "docs/guarantees/matrix.v1.json"), JSON.stringify(matrix))
    writeFileSync(join(repositoryRoot, "docs/qualification-note.md"), "Documentation-only change.\n")
    execFileSync("git", ["-C", repositoryRoot, "add", "docs/qualification-note.md"], { stdio: "ignore" })
    execFileSync("git", ["-C", repositoryRoot, "-c", "user.name=Crumbs test", "-c", "user.email=crumbs-test@example.invalid", "commit", "-m", "docs-only qualification update"], { stdio: "ignore" })

    const outsideTarget = join(tmpdir(), `crumbs-guarantees-output-${Date.now()}.mdx`)
    const pagePath = join(repositoryRoot, "docs/src/content/docs/reference/guarantees.mdx")
    writeFileSync(outsideTarget, "Keep this file unchanged.\n")
    symlinkSync(outsideTarget, pagePath)
    try {
      expect(() => api.runGuaranteesMatrixCommand("render", repositoryRoot)).toThrow("must not be a symlink")
      expect(readFileSync(outsideTarget, "utf8")).toBe("Keep this file unchanged.\n")
    } finally {
      rmSync(outsideTarget, { force: true })
    }
  })
})
