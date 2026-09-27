import { decodeManifestCompatibilityReport } from "./comparison-report-schema"
import type {
  ManifestCompatibilityFinding,
  ManifestCompatibilityReport,
  ManifestConsumerReference,
  ManifestReportJson,
} from "./comparison-report-model"

/** Compare strings by Unicode code units, independent of the host locale. */
function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sortJsonObjectKeys(value: ManifestReportJson): ManifestReportJson {
  if (Array.isArray(value)) return value.map(sortJsonObjectKeys)
  if (value === null || typeof value !== "object") return value
  const output: Record<string, ManifestReportJson> = Object.create(null) as Record<string, ManifestReportJson>
  const record = value as { readonly [key: string]: ManifestReportJson }
  for (const key of Object.keys(record).sort(compareOrdinal)) {
    Object.defineProperty(output, key, {
      value: sortJsonObjectKeys(record[key]!),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return output
}

function canonicalValueForSort(value: unknown): string {
  return JSON.stringify(sortJsonObjectKeys(value as ManifestReportJson))
}

function normalizeConsumerReference(reference: ManifestConsumerReference): ManifestConsumerReference {
  const origin = reference.dependency.origin
  return {
    package: { name: reference.package.name, version: reference.package.version },
    dependency: {
      from: reference.dependency.from,
      to: reference.dependency.to,
      kind: reference.dependency.kind,
      ...(origin === undefined ? {} : {
        origin: {
          moduleId: origin.moduleId,
          exportPath: origin.exportPath,
          ...(origin.property === undefined ? {} : { property: origin.property }),
        },
      }),
    },
  }
}

function consumerReferenceSortKey(reference: ManifestConsumerReference): string {
  return canonicalValueForSort(normalizeConsumerReference(reference))
}

function normalizeFinding(finding: ManifestCompatibilityFinding): ManifestCompatibilityFinding {
  const affectedConsumers = finding.affectedConsumers
    .map(normalizeConsumerReference)
    .sort((left, right) => compareOrdinal(consumerReferenceSortKey(left), consumerReferenceSortKey(right)))
  return {
    code: finding.code,
    level: finding.level,
    entityId: finding.entityId,
    fieldPath: finding.fieldPath,
    message: finding.message,
    ...(finding.before === undefined ? {} : { before: sortJsonObjectKeys(finding.before) }),
    ...(finding.after === undefined ? {} : { after: sortJsonObjectKeys(finding.after) }),
    affectedConsumers,
  }
}

function findingSortKey(finding: ManifestCompatibilityFinding): string {
  return canonicalValueForSort(finding)
}

function normalizeReport(report: ManifestCompatibilityReport): ManifestCompatibilityReport {
  const suppliedConsumers = [...report.suppliedConsumers].sort((left, right) =>
    compareOrdinal(left.name, right.name) || compareOrdinal(left.version, right.version))
  const findings = report.findings.map(normalizeFinding).sort((left, right) =>
    compareOrdinal(left.code, right.code) ||
    compareOrdinal(left.entityId, right.entityId) ||
    compareOrdinal(left.fieldPath, right.fieldPath) ||
    compareOrdinal(left.level, right.level) ||
    compareOrdinal(findingSortKey(left), findingSortKey(right)))
  const analysisLimits = [...report.analysisLimits].sort((left, right) =>
    compareOrdinal(left.code, right.code) || compareOrdinal(left.message, right.message))

  return {
    format: report.format,
    schemaVersion: report.schemaVersion,
    mode: report.mode,
    provider: {
      name: report.provider.name,
      ...(report.provider.baselineVersion === undefined ? {} : { baselineVersion: report.provider.baselineVersion }),
      currentVersion: report.provider.currentVersion,
    },
    suppliedConsumers,
    findings,
    analysisLimits,
  }
}

/** Encode a validated compatibility report as compact canonical JSON with one trailing newline. */
export function encodeCanonicalManifestCompatibilityReport(input: unknown): string {
  return `${JSON.stringify(normalizeReport(decodeManifestCompatibilityReport(input)))}\n`
}
