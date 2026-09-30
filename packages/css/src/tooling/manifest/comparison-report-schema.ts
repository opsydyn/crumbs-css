import * as Schema from "effect/Schema"
import { makeDataCodec } from "../../contracts/data-codec"
import {
  MANIFEST_COMPATIBILITY_REPORT_FORMAT,
  MANIFEST_COMPATIBILITY_REPORT_VERSION,
  type ManifestAnalysisLimitCode,
  type ManifestCompatibilityFindingCode,
  type ManifestCompatibilityReport,
} from "./comparison-report-model"

const IdentifierText = Schema.NonEmptyString.check(Schema.makeFilter<string>(value =>
  value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value)))
const PackageName = Schema.String.check(Schema.isPattern(/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/))
const SemVer = Schema.String.check(Schema.isPattern(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/))

const FindingCodes = [
  "token.removed",
  "token.domain-changed",
  "token.alias-changed",
  "token.visibility-reduced",
  "token.added",
  "component.removed",
  "component.slot-removed",
  "component.variant-removed",
  "component.default-changed",
  "component.added",
  "component.slot-added",
  "component.variant-added",
  "consumer.private-token-dependency",
] as const satisfies ReadonlyArray<ManifestCompatibilityFindingCode>
const AnalysisLimitCodes = [
  "explicit-coverage",
  "unresolved-references",
  "component-use-unavailable",
  "consumer-manifests-not-supplied",
] as const satisfies ReadonlyArray<ManifestAnalysisLimitCode>

function containsCanonicalNumbers(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && !Object.is(value, -0)
  if (Array.isArray(value)) return value.every(containsCanonicalNumbers)
  if (value === null || typeof value !== "object") return true
  return Object.values(value).every(containsCanonicalNumbers)
}

const ReportJson = Schema.Json.check(Schema.makeFilter(value => containsCanonicalNumbers(value)))
const PackageIdentity = Schema.Struct({ name: PackageName, version: SemVer })
const DependencyOrigin = Schema.Struct({
  moduleId: IdentifierText,
  exportPath: IdentifierText,
  property: Schema.optionalKey(IdentifierText),
})
const ConsumerReference = Schema.Struct({
  package: PackageIdentity,
  dependency: Schema.Struct({
    from: IdentifierText,
    to: IdentifierText,
    kind: Schema.Literals(["token-alias", "style-token"]),
    origin: Schema.optionalKey(DependencyOrigin),
  }),
})
const Finding = Schema.Struct({
  code: Schema.Literals(FindingCodes),
  level: Schema.Literals(["error", "warning", "info"]),
  entityId: IdentifierText,
  fieldPath: IdentifierText,
  message: IdentifierText,
  before: Schema.optionalKey(ReportJson),
  after: Schema.optionalKey(ReportJson),
  affectedConsumers: Schema.Array(ConsumerReference),
})
const AnalysisLimit = Schema.Struct({ code: Schema.Literals(AnalysisLimitCodes), message: IdentifierText })
const CompatibilityReport = Schema.Struct({
  format: Schema.Literal(MANIFEST_COMPATIBILITY_REPORT_FORMAT),
  schemaVersion: Schema.Literal(MANIFEST_COMPATIBILITY_REPORT_VERSION),
  mode: Schema.Literals(["check", "compare"]),
  provider: Schema.Struct({
    name: PackageName,
    baselineVersion: Schema.optionalKey(SemVer),
    currentVersion: SemVer,
  }),
  suppliedConsumers: Schema.Array(PackageIdentity),
  findings: Schema.Array(Finding),
  analysisLimits: Schema.Array(AnalysisLimit),
})

const compatibilityReportCodec = makeDataCodec("design-system-compatibility-report-v2", CompatibilityReport)

/** Validate report data and cross-record relationships, returning detached plain data. */
export function decodeManifestCompatibilityReport(input: unknown): ManifestCompatibilityReport {
  const decoded = compatibilityReportCodec.decode(input)
  if (!decoded.ok) {
    const detail = decoded.issues.map(issue => {
      const path = issue.path.length === 0 ? "<root>" : issue.path.join(".")
      return `${path}: ${issue.message}`
    }).join("; ")
    throw new TypeError(`Invalid Crumbs design-system compatibility report v2: ${detail}`)
  }

  const report = decoded.value as ManifestCompatibilityReport
  if (report.mode === "compare" && report.provider.baselineVersion === undefined) {
    throw new TypeError("A compare report requires provider.baselineVersion.")
  }
  if (report.mode === "check" && report.provider.baselineVersion !== undefined) {
    throw new TypeError("A check report must not include provider.baselineVersion.")
  }

  const consumerIdentity = (name: string, version: string): string => `${name}\u0000${version}`
  const suppliedConsumers = new Set<string>()
  for (const consumer of report.suppliedConsumers) {
    if (consumer.name === report.provider.name) {
      throw new TypeError(`Provider package ${JSON.stringify(consumer.name)} cannot also be a supplied consumer.`)
    }
    const identity = consumerIdentity(consumer.name, consumer.version)
    if (suppliedConsumers.has(identity)) {
      throw new TypeError(`Duplicate consumer identity ${JSON.stringify(`${consumer.name}@${consumer.version}`)}.`)
    }
    suppliedConsumers.add(identity)
  }

  for (const finding of report.findings) {
    if (finding.code.startsWith("component.") && finding.affectedConsumers.length > 0) {
      throw new TypeError(`Component finding ${JSON.stringify(finding.code)} cannot attribute component use to consumers.`)
    }
    const requiresTokenTarget = finding.code.startsWith("token.") || finding.code === "consumer.private-token-dependency"
    if (finding.code === "consumer.private-token-dependency" && finding.affectedConsumers.length === 0) {
      throw new TypeError("A private-token dependency finding requires an affected consumer reference.")
    }
    for (const reference of finding.affectedConsumers) {
      const identity = consumerIdentity(reference.package.name, reference.package.version)
      if (!suppliedConsumers.has(identity)) {
        throw new TypeError(`Finding consumer ${JSON.stringify(`${reference.package.name}@${reference.package.version}`)} is not among the supplied consumers.`)
      }
      if (requiresTokenTarget && reference.dependency.to !== finding.entityId) {
        throw new TypeError(`Finding consumer dependency target ${JSON.stringify(reference.dependency.to)} must match finding entity ID ${JSON.stringify(finding.entityId)}.`)
      }
    }
  }
  return report
}
