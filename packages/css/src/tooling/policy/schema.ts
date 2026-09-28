import * as Schema from "effect/Schema"
import { makeDataCodec } from "../../contracts/data-codec"
import type { DataCodec } from "../../contracts/data-codec"
import {
  DESIGN_SYSTEM_POLICY_FORMAT,
  DESIGN_SYSTEM_POLICY_REPORT_FORMAT,
  DESIGN_SYSTEM_POLICY_REPORT_VERSION,
  DESIGN_SYSTEM_POLICY_VERSION,
  POLICY_RULE_IDS,
  type DesignSystemPolicy,
  type DesignSystemPolicyReport,
  type PolicyAnalysisLimitCode,
  type PolicyExceptionDiagnostic,
  type PolicyLevel,
  type PolicyMeasurement,
  type PolicyPresetName,
  type PolicyRuleId,
} from "./model"

const IdentifierText = Schema.NonEmptyString.check(Schema.makeFilter<string>(value =>
  value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value)))
const PackageName = Schema.String.check(Schema.isPattern(/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/))
const SemVer = Schema.String.check(Schema.isPattern(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/))
const PositiveSafeInteger = Schema.Finite.check(
  Schema.makeFilter<number>(value => Number.isSafeInteger(value) && value > 0),
)
const CanonicalNumber = Schema.Finite.check(Schema.makeFilter<number>(value => !Object.is(value, -0)))
const PolicyLevelSchema = Schema.Literals(["info", "warning", "error"] satisfies ReadonlyArray<PolicyLevel>)
const PolicyRuleIdSchema = Schema.Literals(POLICY_RULE_IDS satisfies ReadonlyArray<PolicyRuleId>)
const PolicyPresetNameSchema = Schema.Literals(["migration", "enforce"] satisfies ReadonlyArray<PolicyPresetName>)
const PolicyPresetSchema = Schema.Struct({
  name: PolicyPresetNameSchema,
  version: Schema.Literal(1),
})
const NativePrimitiveKindSchema = Schema.Literals(["view", "text", "image"])
const NativePrimitiveDomainSchema = Schema.TupleWithRest(
  Schema.Tuple([NativePrimitiveKindSchema]),
  [NativePrimitiveKindSchema],
).check(Schema.makeFilter<readonly ["view" | "text" | "image", ...Array<"view" | "text" | "image">]>(
  domain => new Set(domain).size === domain.length,
))
const PropertyScopeSchema = Schema.Struct({
  property: IdentifierText,
  domain: Schema.optionalKey(NativePrimitiveDomainSchema),
})
const TargetCapabilitySchema = Schema.Struct({ property: IdentifierText, primitive: IdentifierText })
const TargetProfileSchema = Schema.Struct({
  id: IdentifierText,
  supportedCapabilities: Schema.Array(TargetCapabilitySchema),
})
const OutputBudgetSchema = Schema.Struct({
  metricId: IdentifierText,
  scopeId: IdentifierText,
  unit: IdentifierText,
  maximum: CanonicalNumber,
})
const MeasurementSchema = Schema.Struct({
  metricId: IdentifierText,
  scopeId: IdentifierText,
  unit: IdentifierText,
  value: CanonicalNumber,
})
const ExceptionDateSchema = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/))
  .check(Schema.makeFilter<string>(isCalendarDate))
const PolicyExceptionSchema = Schema.Struct({
  ruleId: PolicyRuleIdSchema,
  subjectId: IdentifierText,
  reason: IdentifierText,
  expiresOn: Schema.optionalKey(ExceptionDateSchema),
})
const SeverityOverridesSchema = Schema.Struct({
  "style.literal-value": Schema.optionalKey(PolicyLevelSchema),
  "style.semantic-token-required": Schema.optionalKey(PolicyLevelSchema),
  "consumer.private-token": Schema.optionalKey(PolicyLevelSchema),
  "capability.not-supported": Schema.optionalKey(PolicyLevelSchema),
  "entity.deprecated": Schema.optionalKey(PolicyLevelSchema),
  "output.budget-exceeded": Schema.optionalKey(PolicyLevelSchema),
})
const PolicySchema = Schema.Struct({
  format: Schema.Literal(DESIGN_SYSTEM_POLICY_FORMAT),
  schemaVersion: Schema.Literal(DESIGN_SYSTEM_POLICY_VERSION),
  policyId: IdentifierText,
  version: PositiveSafeInteger,
  preset: PolicyPresetSchema,
  severityOverrides: SeverityOverridesSchema,
  literalValueScopes: Schema.Array(PropertyScopeSchema),
  semanticTokenScopes: Schema.Array(PropertyScopeSchema),
  semanticTokenIds: Schema.Array(IdentifierText),
  targetProfiles: Schema.Array(TargetProfileSchema),
  outputBudgets: Schema.Array(OutputBudgetSchema),
  exceptions: Schema.Array(PolicyExceptionSchema),
})

const PolicyProviderSchema = Schema.Struct({ name: PackageName, version: SemVer })
const ReportJsonSchema = Schema.Json.check(Schema.makeFilter(value => containsCanonicalNumbers(value)))
const FindingExceptionSchema = Schema.Struct({
  reason: IdentifierText,
  expiresOn: Schema.optionalKey(ExceptionDateSchema),
})
const PolicyFindingSchema = Schema.Struct({
  ruleId: PolicyRuleIdSchema,
  level: PolicyLevelSchema,
  subjectId: IdentifierText,
  fieldPath: IdentifierText,
  message: IdentifierText,
  evidence: ReportJsonSchema,
  disposition: Schema.Literals(["active", "excepted"]),
  exception: Schema.optionalKey(FindingExceptionSchema),
})
const ExceptionDiagnosticCodeSchema = Schema.Literals(["exception.expired", "exception.unused"])
const ExceptionDiagnosticSchema = Schema.Struct({
  code: ExceptionDiagnosticCodeSchema,
  level: Schema.Literals(["warning", "info"]),
  ruleId: PolicyRuleIdSchema,
  subjectId: IdentifierText,
  reason: IdentifierText,
  expiresOn: Schema.optionalKey(ExceptionDateSchema),
})
const AnalysisLimitCodeSchema = Schema.Literals([
  "consumer-coverage",
  "style-metadata-missing",
  "style-metadata-incomplete",
  "token-identity-unknown",
  "target-profile-missing",
  "capability-evidence-missing",
  "measurement-missing",
] satisfies ReadonlyArray<PolicyAnalysisLimitCode>)
const AnalysisLimitSchema = Schema.Struct({
  code: AnalysisLimitCodeSchema,
  message: IdentifierText,
  subjectId: Schema.optionalKey(IdentifierText),
})
const PolicyReportSchema = Schema.Struct({
  format: Schema.Literal(DESIGN_SYSTEM_POLICY_REPORT_FORMAT),
  schemaVersion: Schema.Literal(DESIGN_SYSTEM_POLICY_REPORT_VERSION),
  provider: PolicyProviderSchema,
  policy: Schema.Struct({ policyId: IdentifierText, version: PositiveSafeInteger }),
  preset: PolicyPresetSchema,
  suppliedConsumers: Schema.Array(PolicyProviderSchema),
  evaluatedOn: Schema.optionalKey(ExceptionDateSchema),
  findings: Schema.Array(PolicyFindingSchema),
  exceptionDiagnostics: Schema.Array(ExceptionDiagnosticSchema),
  analysisLimits: Schema.Array(AnalysisLimitSchema),
})

const policyCodec = makeDataCodec("design-system-policy-v1", PolicySchema)
const policyReportCodec = makeDataCodec("design-system-policy-report-v1", PolicyReportSchema)
const measurementsCodec = makeDataCodec("design-system-policy-measurements-v1", Schema.Array(MeasurementSchema))

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
  if (match === null) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12) return false
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysByMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day >= 1 && day <= daysByMonth[month - 1]!
}

function containsCanonicalNumbers(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && !Object.is(value, -0)
  if (Array.isArray(value)) return value.every(containsCanonicalNumbers)
  if (value === null || typeof value !== "object") return true
  return Object.values(value).every(containsCanonicalNumbers)
}

function decodeWith<T>(codec: DataCodec<T>, input: unknown, boundary: string): T {
  const decoded = codec.decode(input)
  if (decoded.ok) return decoded.value
  const detail = decoded.issues.map(issue => {
    const path = issue.path.length === 0 ? "<root>" : issue.path.join(".")
    return `${path}: ${issue.message}`
  }).join("; ")
  throw new TypeError(`Invalid ${boundary}: ${detail}`)
}

function assertUnique(values: ReadonlyArray<string>, label: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new TypeError(`Invalid design-system policy: duplicate ${label} ${JSON.stringify(value)}.`)
    seen.add(value)
  }
}

function assertUniqueReportValues(values: ReadonlyArray<string>, label: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new TypeError(`Invalid design-system policy report: duplicate ${label} ${JSON.stringify(value)}.`)
    seen.add(value)
  }
}

function validatePolicyIdentities(policy: DesignSystemPolicy): void {
  assertUnique(policy.semanticTokenIds, "semantic token ID")
  assertUnique(policy.targetProfiles.map(profile => profile.id), "target profile ID")
  assertUnique(policy.targetProfiles.flatMap(profile => profile.supportedCapabilities.map(capability =>
    `${profile.id}\u0000${capability.property}\u0000${capability.primitive}`)), "target capability")
  assertUnique(policy.outputBudgets.map(budget => `${budget.metricId}\u0000${budget.scopeId}\u0000${budget.unit}`), "output budget")
  assertUnique(policy.exceptions.map(exception => `${exception.ruleId}\u0000${exception.subjectId}`), "exception")
}

function validatePolicyReport(report: DesignSystemPolicyReport): void {
  assertUniqueReportValues(report.suppliedConsumers.map(consumer => `${consumer.name}\u0000${consumer.version}`), "consumer identity")
  if (report.suppliedConsumers.some(consumer => consumer.name === report.provider.name)) {
    throw new TypeError(`Invalid design-system policy report: provider ${JSON.stringify(report.provider.name)} cannot also be a supplied consumer.`)
  }
  for (const finding of report.findings) {
    if (finding.disposition === "active" && finding.exception !== undefined) {
      throw new TypeError(`Invalid design-system policy report: active finding ${JSON.stringify(finding.subjectId)} cannot carry an applied exception.`)
    }
    if (finding.disposition === "excepted" && finding.exception === undefined) {
      throw new TypeError(`Invalid design-system policy report: excepted finding ${JSON.stringify(finding.subjectId)} requires exception evidence.`)
    }
  }
  for (const diagnostic of report.exceptionDiagnostics as ReadonlyArray<PolicyExceptionDiagnostic>) {
    if (diagnostic.code === "exception.expired" && (diagnostic.level !== "warning" || diagnostic.expiresOn === undefined)) {
      throw new TypeError("Invalid design-system policy report: expired exceptions require warning level and expiresOn.")
    }
    if (diagnostic.code === "exception.unused" && (diagnostic.level !== "info" || diagnostic.expiresOn !== undefined)) {
      throw new TypeError("Invalid design-system policy report: unused exceptions require info level and no expiresOn.")
    }
  }
}

/** Validate and detach a plain version-1 policy document. */
export function decodeDesignSystemPolicy(input: unknown): DesignSystemPolicy {
  const policy = decodeWith(policyCodec, input, "design-system policy v1") as DesignSystemPolicy
  validatePolicyIdentities(policy)
  return policy
}

/** Validate and detach explicit numeric output measurements. */
export function decodePolicyMeasurements(input: unknown): ReadonlyArray<PolicyMeasurement> {
  const measurements = decodeWith(measurementsCodec, input, "design-system policy measurements v1") as ReadonlyArray<PolicyMeasurement>
  assertUnique(measurements.map(measurement => `${measurement.metricId}\u0000${measurement.scopeId}\u0000${measurement.unit}`), "measurement")
  return measurements
}

/** Validate and detach a version-1 policy report. */
export function decodeDesignSystemPolicyReport(input: unknown): DesignSystemPolicyReport {
  const report = decodeWith(policyReportCodec, input, "design-system policy report v1") as DesignSystemPolicyReport
  validatePolicyReport(report)
  return report
}
