import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { decodeStyleExplanationMetadata } from "../packages/css/src/devtools/style-explanation-schema"
import type { StyleExplanationMetadata } from "../packages/css/src/devtools/style-explanation-model"
import { decodeManifest } from "../packages/css/src/tooling/manifest/schema"
import type { DesignSystemManifest } from "../packages/css/src/tooling/manifest/model"
import {
  checkDesignSystemPolicy,
  decodeDesignSystemPolicy,
  decodePolicyMeasurements,
  encodeCanonicalDesignSystemPolicyReport,
} from "../packages/css/src/tooling/policy"
import type {
  DesignSystemPolicy,
  PolicyMeasurement,
} from "../packages/css/src/tooling/policy/model"

const repositoryRoot = resolve(import.meta.dir, "..")
const evaluatedOn = "2026-09-28"
const fixtureDefinitions = [
  { id: "current-manifest", path: "packages/css/fixtures/m9-4-policy/current-manifest.json" },
  { id: "consumer-manifest", path: "packages/css/fixtures/m9-4-policy/consumer-manifest.json" },
  { id: "style-metadata", path: "packages/css/fixtures/m9-4-policy/style-metadata.json" },
  { id: "measurements", path: "packages/css/fixtures/m9-4-policy/measurements.json" },
  { id: "policy", path: "packages/css/fixtures/m9-4-policy/policy.json" },
] as const
const reportPath = "docs/evidence/2026-09-28-m9-4-design-system-policies/policy-report-v1.json"
const receiptPath = "docs/evidence/2026-09-28-m9-4-design-system-policies/qualification.json"
const requiredRules = [
  "style.literal-value",
  "style.semantic-token-required",
  "consumer.private-token",
  "capability.not-supported",
  "entity.deprecated",
  "output.budget-exceeded",
] as const

type FixtureBytes = { readonly id: string; readonly path: string; readonly bytes: Buffer }
type PolicyFixtureSet = {
  readonly bytes: ReadonlyArray<FixtureBytes>
  readonly current: DesignSystemManifest
  readonly consumers: ReadonlyArray<DesignSystemManifest>
  readonly styleMetadata: ReadonlyArray<StyleExplanationMetadata>
  readonly measurements: ReadonlyArray<PolicyMeasurement>
  readonly policy: DesignSystemPolicy
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex")
}

function parseJson(bytes: Buffer, path: string): unknown {
  try {
    return JSON.parse(bytes.toString("utf8")) as unknown
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new TypeError(`Invalid M9.4 fixture JSON at ${path}: ${detail}`)
  }
}

function loadPolicyFixtures(): PolicyFixtureSet {
  const bytes = fixtureDefinitions.map(definition => ({
    ...definition,
    bytes: readFileSync(resolve(repositoryRoot, definition.path)),
  }))
  const parsed = new Map(bytes.map(fixture => [fixture.id, parseJson(fixture.bytes, fixture.path)]))
  const current = decodeManifest(parsed.get("current-manifest"))
  const consumer = decodeManifest(parsed.get("consumer-manifest"))
  const metadataInput = parsed.get("style-metadata")
  if (!Array.isArray(metadataInput)) throw new TypeError("M9.4 style-metadata fixture must be an explicit array.")
  const styleMetadata = metadataInput.map(decodeStyleExplanationMetadata)
  const policy = decodeDesignSystemPolicy(parsed.get("policy"))
  const measurements = decodePolicyMeasurements(parsed.get("measurements"))
  return { bytes, current, consumers: [consumer], styleMetadata, measurements, policy }
}

function countBy(values: ReadonlyArray<string>): Readonly<Record<string, number>> {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return Object.fromEntries([...counts].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0))
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys)
  if (value === null || typeof value !== "object") return value
  const record = value as Record<string, unknown>
  return Object.fromEntries(Object.keys(record).sort().map(key => [key, sortJsonKeys(record[key])]))
}

function encodeReceipt(receipt: unknown): string {
  return `${JSON.stringify(sortJsonKeys(receipt), null, 2)}\n`
}

function generateReport(fixtures: PolicyFixtureSet): string {
  const report = checkDesignSystemPolicy({
    policy: fixtures.policy,
    current: fixtures.current,
    consumers: fixtures.consumers,
    styleMetadata: fixtures.styleMetadata,
    measurements: fixtures.measurements,
    evaluatedOn,
  })
  return encodeCanonicalDesignSystemPolicyReport(report)
}

export function generatePolicyQualification(): { readonly reportJson: string; readonly receiptJson: string } {
  const fixtures = loadPolicyFixtures()
  const reportJson = generateReport(fixtures)
  const repeatReportJson = generateReport(loadPolicyFixtures())
  if (reportJson !== repeatReportJson) {
    throw new Error("M9.4 policy fixture qualification was not byte-identical on repeat evaluation.")
  }

  const report = JSON.parse(reportJson) as {
    readonly findings: ReadonlyArray<{ readonly ruleId: string; readonly disposition: string; readonly level: string }>
    readonly analysisLimits: ReadonlyArray<{ readonly code: string }>
    readonly exceptionDiagnostics: ReadonlyArray<{ readonly code: string }>
    readonly format: string
    readonly schemaVersion: number
  }
  const observedRules = new Set(report.findings.map(finding => finding.ruleId))
  const missingRules = requiredRules.filter(rule => !observedRules.has(rule))
  if (missingRules.length > 0) {
    throw new Error(`M9.4 policy fixtures did not exercise rules: ${missingRules.join(", ")}.`)
  }
  if (!report.exceptionDiagnostics.some(diagnostic => diagnostic.code === "exception.unused")) {
    throw new Error("M9.4 policy fixtures must retain the unused-exception diagnostic.")
  }
  if (!report.analysisLimits.some(limit => limit.code === "consumer-coverage")) {
    throw new Error("M9.4 policy fixtures must retain the consumer coverage limit.")
  }

  const findings = report.findings
  const receipt = {
    format: "crumbs.css.design-system-policy-qualification",
    schemaVersion: 1,
    roadmapItem: "M9.4",
    status: "qualified",
    evaluatedOn,
    policy: {
      policyId: fixtures.policy.policyId,
      version: fixtures.policy.version,
      schemaFormat: fixtures.policy.format,
      schemaVersion: fixtures.policy.schemaVersion,
      preset: fixtures.policy.preset,
    },
    fixtures: fixtures.bytes.map(fixture => ({
      id: fixture.id,
      path: fixture.path,
      sha256: sha256(fixture.bytes),
    })),
    report: {
      path: reportPath,
      format: report.format,
      schemaVersion: report.schemaVersion,
      sha256: sha256(reportJson),
    },
    counts: {
      findings: {
        total: findings.length,
        active: findings.filter(finding => finding.disposition === "active").length,
        excepted: findings.filter(finding => finding.disposition === "excepted").length,
        byRule: countBy(findings.map(finding => finding.ruleId)),
        byLevel: countBy(findings.map(finding => finding.level)),
      },
      coverage: {
        total: report.analysisLimits.length,
        byCode: countBy(report.analysisLimits.map(limit => limit.code)),
      },
      exceptionDiagnostics: {
        total: report.exceptionDiagnostics.length,
        byCode: countBy(report.exceptionDiagnostics.map(diagnostic => diagnostic.code)),
      },
    },
    passedGates: [
      "explicit-fixture-inputs-only",
      "all-six-policy-rules-exercised",
      "visible-exception-and-unused-diagnostic",
      "consumer-analysis-limits-retained",
      "canonical-report-v1",
      "repeat-run-byte-identical",
      "relative-paths-only",
    ],
  }

  return { reportJson, receiptJson: encodeReceipt(receipt) }
}

export function writePolicyQualificationArtifacts(): { readonly reportPath: string; readonly receiptPath: string } {
  const output = generatePolicyQualification()
  const absoluteReportPath = resolve(repositoryRoot, reportPath)
  const absoluteReceiptPath = resolve(repositoryRoot, receiptPath)
  mkdirSync(resolve(repositoryRoot, "docs/evidence/2026-09-28-m9-4-design-system-policies"), { recursive: true })
  writeFileSync(absoluteReportPath, output.reportJson, "utf8")
  writeFileSync(absoluteReceiptPath, output.receiptJson, "utf8")
  return { reportPath, receiptPath }
}

if (import.meta.main) {
  const paths = writePolicyQualificationArtifacts()
  process.stdout.write(`Wrote ${paths.reportPath} and ${paths.receiptPath}\n`)
}
