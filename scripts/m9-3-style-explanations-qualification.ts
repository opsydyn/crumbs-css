import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { runInNewContext } from "node:vm"
import { explainStyle, type StyleExplanationReport } from "../packages/css/src/devtools"
import { transformCssTsToStyleSheet } from "../packages/css/src/transformer"

const REPOSITORY_ROOT = resolve(import.meta.dir, "..")
const PACKAGE_ROOT = resolve(REPOSITORY_ROOT, "packages/css")
const FIXTURE_PATH = "packages/css/fixtures/m9-3-style-explanations.css.ts"
const REPORT_PATH = "docs/evidence/2026-09-27-m9-3-style-explanations/style-explanation-report-v1.json"
const RECEIPT_PATH = "docs/evidence/2026-09-27-m9-3-style-explanations/qualification.json"

export type StyleExplanationQualificationEvidence = Readonly<{
  format: "crumbs.m9-3-style-explanation-evidence"
  schemaVersion: 1
  fixturePath: string
  fixtureSha256: string
  canonicalReportJson: string
  reportSha256: string
  coverage: StyleExplanationReport["coverage"]
}>

/** Build reproducible M9.3 report evidence from the checked-in compiler fixture. */
export async function buildStyleExplanationQualificationEvidence(): Promise<StyleExplanationQualificationEvidence> {
  const fixtureBytes = readFileSync(resolve(REPOSITORY_ROOT, FIXTURE_PATH))
  const compiled = await transformCssTsToStyleSheet(resolve(REPOSITORY_ROOT, FIXTURE_PATH), PACKAGE_ROOT, {
    dev: true,
    useStyleSheet: false,
  })
  const exports: Record<string, unknown> = Object.create(null)
  const executable = compiled
    .replace(/^import .*;$/gmu, "")
    .replace(/export const (\w+) =/gu, "exports.$1 =")
  runInNewContext(executable, {
    exports,
    StyleSheet: { create: (styles: unknown) => styles },
  })
  // Schema decoding intentionally accepts current-realm plain records only.
  const moduleNamespace = structuredClone(exports) as Readonly<Record<string, unknown>>
  const contract = {}
  const currentTheme = { contract, values: {}, tokens: { "--crumbs-space-small": 16 } }
  const previousTheme = { contract, values: {}, tokens: { "--crumbs-space-small": 8 } }
  const report = explainStyle({
    module: moduleNamespace,
    exportPath: ["card"],
    current: { theme: currentTheme },
    previous: { theme: previousTheme },
  })
  const canonicalReportJson = `${JSON.stringify(canonicalize(report), null, 2)}\n`
  const evidence = {
    format: "crumbs.m9-3-style-explanation-evidence" as const,
    schemaVersion: 1 as const,
    fixturePath: FIXTURE_PATH,
    fixtureSha256: sha256(fixtureBytes),
    canonicalReportJson,
    reportSha256: sha256(canonicalReportJson),
    coverage: report.coverage,
  }
  const serialized = JSON.stringify(evidence)
  if (serialized.includes(REPOSITORY_ROOT) || /(?:\/Users\/|\/private\/tmp\/|\/var\/folders\/)/u.test(serialized)) {
    throw new Error("M9.3 qualification evidence contains an absolute machine path.")
  }
  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u.test(serialized)) {
    throw new Error("M9.3 qualification evidence must not contain timestamps.")
  }
  return evidence
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!isRecord(value)) return value
  return Object.fromEntries(Object.entries(value)
    .sort(([left], [right]) => compareOrdinal(left, right))
    .map(([key, child]) => [key, canonicalize(child)]))
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function readPreviousReceipt(): Readonly<Record<string, unknown>> | undefined {
  const path = resolve(REPOSITORY_ROOT, RECEIPT_PATH)
  if (!existsSync(path)) return undefined
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown
    return isRecord(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

async function main(): Promise<void> {
  const evidence = await buildStyleExplanationQualificationEvidence()
  const evidenceDirectory = resolve(REPOSITORY_ROOT, "docs/evidence/2026-09-27-m9-3-style-explanations")
  const previous = readPreviousReceipt()
  const matchingPrevious = previous?.reportSha256 === evidence.reportSha256 &&
    previous.fixtureSha256 === evidence.fixtureSha256
  const verification = matchingPrevious && Array.isArray(previous?.verification) ? previous.verification : []
  const status = matchingPrevious && previous?.status === "qualified" ? "qualified" : "evidence-generated"
  const receipt = {
    format: "crumbs.m9-3-style-explanation-qualification",
    schemaVersion: 1,
    roadmapItem: "M9.3",
    status,
    reportPath: REPORT_PATH,
    reportSha256: evidence.reportSha256,
    fixturePath: evidence.fixturePath,
    fixtureSha256: evidence.fixtureSha256,
    coverage: evidence.coverage,
    verification,
  }

  mkdirSync(evidenceDirectory, { recursive: true })
  writeFileSync(resolve(REPOSITORY_ROOT, REPORT_PATH), evidence.canonicalReportJson, "utf8")
  writeFileSync(resolve(REPOSITORY_ROOT, RECEIPT_PATH), `${JSON.stringify(receipt, null, 2)}\n`, "utf8")
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    reportSha256: evidence.reportSha256,
    fixtureSha256: evidence.fixtureSha256,
    coverageReasons: evidence.coverage.reasons,
    reportPath: REPORT_PATH,
    receiptPath: RECEIPT_PATH,
  }, null, 2)}\n`)
}

if (import.meta.main) await main()
