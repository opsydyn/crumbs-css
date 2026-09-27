import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { checkManifestConsumers } from "../packages/css/src/tooling/manifest/consumer-check"
import { encodeCanonicalManifestCompatibilityReport } from "../packages/css/src/tooling/manifest/comparison-report-canonical-json"
import { compareManifests } from "../packages/css/src/tooling/manifest/comparison"
import { decodeManifest } from "../packages/css/src/tooling/manifest/schema"
import { encodeCanonicalManifest } from "../packages/css/src/tooling/manifest/canonical-json"
import type { DesignSystemManifest } from "../packages/css/src/tooling/manifest/model"
import type {
  ManifestAnalysisLimitCode,
  ManifestCompatibilityFindingLevel,
} from "../packages/css/src/tooling/manifest/comparison-report-model"

const repositoryRoot = resolve(import.meta.dir, "..")
const fixturePaths = [
  "packages/css/fixtures/m9-2-manifest/baseline.json",
  "packages/css/fixtures/m9-2-manifest/current.json",
  "packages/css/fixtures/m9-2-manifest/consumer.json",
  "packages/css/fixtures/m9-2-manifest/consumer-mobile.json",
] as const
const evidenceDirectory = "docs/evidence/2026-09-27-m9-2-manifest-compatibility"
const reportPath = `${evidenceDirectory}/manifest-compatibility-report-v1.json`
const receiptPath = `${evidenceDirectory}/qualification-v1.json`

type FindingCounts = Readonly<Record<ManifestCompatibilityFindingLevel, number>>

export type ManifestQualificationEvidence = {
  readonly commandModes: ReadonlyArray<"check" | "compare">
  readonly canonicalReportJson: string
  readonly reportSha256: string
  readonly checkReportSha256: string
  readonly fixtureSha256: ReadonlyArray<{ readonly path: string; readonly sha256: string }>
  readonly findingCounts: Readonly<{ check: FindingCounts; compare: FindingCounts }>
  readonly suppliedConsumerIdentities: ReadonlyArray<{ readonly name: string; readonly version: string }>
  readonly analysisLimitCodes: Readonly<{
    check: ReadonlyArray<ManifestAnalysisLimitCode>
    compare: ReadonlyArray<ManifestAnalysisLimitCode>
  }>
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

function readFixture(path: string): { readonly manifest: DesignSystemManifest; readonly bytes: Buffer } {
  const bytes = readFileSync(resolve(repositoryRoot, path))
  const parsed = JSON.parse(bytes.toString("utf8")) as unknown
  return { manifest: decodeManifest(parsed), bytes }
}

function assertFixtureMatches(label: string, input: unknown, fixture: DesignSystemManifest): DesignSystemManifest {
  const decoded = decodeManifest(input)
  if (encodeCanonicalManifest(decoded) !== encodeCanonicalManifest(fixture)) {
    throw new TypeError(`${label} input does not match its checked-in M9.2 qualification fixture.`)
  }
  return decoded
}

function findingCounts(report: { readonly findings: ReadonlyArray<{ readonly level: ManifestCompatibilityFindingLevel }> }): FindingCounts {
  return {
    error: report.findings.filter(finding => finding.level === "error").length,
    warning: report.findings.filter(finding => finding.level === "warning").length,
    info: report.findings.filter(finding => finding.level === "info").length,
  }
}

function sortCodes(codes: ReadonlyArray<ManifestAnalysisLimitCode>): ReadonlyArray<ManifestAnalysisLimitCode> {
  return [...new Set(codes)].sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
}

/** Build reproducible M9.2 evidence only for the checked-in qualification fixtures. */
export function buildManifestQualificationEvidence(input: {
  readonly baseline: unknown
  readonly current: unknown
  readonly consumers: ReadonlyArray<unknown>
}): ManifestQualificationEvidence {
  const [baselineFixture, currentFixture, ...consumerFixtures] = fixturePaths.map(readFixture)
  if (baselineFixture === undefined || currentFixture === undefined || consumerFixtures.length !== input.consumers.length) {
    throw new TypeError("M9.2 qualification inputs must match all checked-in fixture manifests.")
  }
  const baseline = assertFixtureMatches("Baseline", input.baseline, baselineFixture.manifest)
  const current = assertFixtureMatches("Current", input.current, currentFixture.manifest)
  const expectedConsumers = new Map(consumerFixtures.map(fixture => [
    `${fixture.manifest.package.name}\u0000${fixture.manifest.package.version}`,
    fixture.manifest,
  ]))
  const consumers = input.consumers.map(value => {
    const consumer = decodeManifest(value)
    const identity = `${consumer.package.name}\u0000${consumer.package.version}`
    const fixture = expectedConsumers.get(identity)
    if (fixture === undefined || encodeCanonicalManifest(consumer) !== encodeCanonicalManifest(fixture)) {
      throw new TypeError(`Consumer ${JSON.stringify(`${consumer.package.name}@${consumer.package.version}`)} does not match a checked-in M9.2 qualification fixture.`)
    }
    expectedConsumers.delete(identity)
    return consumer
  })
  if (expectedConsumers.size > 0) throw new TypeError("M9.2 qualification inputs omit a checked-in consumer fixture.")

  const checkReport = checkManifestConsumers({ current, consumers })
  const compareReport = compareManifests({ baseline, current, consumers })
  const canonicalReportJson = encodeCanonicalManifestCompatibilityReport(compareReport)
  const canonicalCheckReportJson = encodeCanonicalManifestCompatibilityReport(checkReport)
  const fixtureSha256 = fixturePaths.map((path, index) => ({
    path,
    sha256: sha256(fixturePaths.map(readFixture)[index]!.bytes),
  }))

  return {
    commandModes: ["check", "compare"],
    canonicalReportJson,
    reportSha256: sha256(canonicalReportJson),
    checkReportSha256: sha256(canonicalCheckReportJson),
    fixtureSha256,
    findingCounts: {
      check: findingCounts(checkReport),
      compare: findingCounts(compareReport),
    },
    suppliedConsumerIdentities: compareReport.suppliedConsumers,
    analysisLimitCodes: {
      check: sortCodes(checkReport.analysisLimits.map(limit => limit.code)),
      compare: sortCodes(compareReport.analysisLimits.map(limit => limit.code)),
    },
  }
}

function runQualification(): void {
  const [baseline, current, ...consumers] = fixturePaths.map(path => JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8")) as unknown)
  if (baseline === undefined || current === undefined) throw new Error("M9.2 provider fixtures are missing.")
  const evidence = buildManifestQualificationEvidence({ baseline, current, consumers })
  mkdirSync(resolve(repositoryRoot, evidenceDirectory), { recursive: true })
  writeFileSync(resolve(repositoryRoot, reportPath), evidence.canonicalReportJson, "utf8")
  const receipt = {
    format: "crumbs.design-system-compatibility-qualification",
    schemaVersion: 1,
    reportPath,
    reportSha256: evidence.reportSha256,
    checkReportSha256: evidence.checkReportSha256,
    fixtureSha256: evidence.fixtureSha256,
    commandModes: evidence.commandModes,
    findingCounts: evidence.findingCounts,
    suppliedConsumerIdentities: evidence.suppliedConsumerIdentities,
    analysisLimitCodes: evidence.analysisLimitCodes,
  }
  writeFileSync(resolve(repositoryRoot, receiptPath), `${JSON.stringify(receipt, null, 2)}\n`, "utf8")
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`)
}

if (import.meta.main) runQualification()
