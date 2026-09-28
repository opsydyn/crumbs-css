import { decodeStyleExplanationMetadata } from "../../devtools/style-explanation-schema"
import type { StyleExplanationMetadata } from "../../devtools/style-explanation-model"
import { decodeManifest } from "../manifest/schema"
import type { DesignSystemManifest } from "../manifest/model"
import { applyPolicyExceptions } from "./exceptions"
import type { PolicyReportJson } from "./model"
import { evaluateManifestPolicyRules } from "./manifest-rules"
import { getBuiltInPolicyPreset } from "./presets"
import { evaluateStylePolicyRules } from "./style-rules"
import {
  decodeDesignSystemPolicy,
  decodeDesignSystemPolicyReport,
  decodePolicyEvaluationDate,
  decodePolicyMeasurements,
} from "./schema"
import type {
  DesignSystemPolicy,
  DesignSystemPolicyReport,
  PolicyLevel,
  PolicyMeasurement,
  PolicyRuleId,
} from "./model"

export type CheckDesignSystemPolicyInput = {
  readonly policy: DesignSystemPolicy
  readonly current: DesignSystemManifest
  readonly consumers?: ReadonlyArray<DesignSystemManifest>
  readonly styleMetadata?: ReadonlyArray<StyleExplanationMetadata>
  readonly measurements?: ReadonlyArray<PolicyMeasurement>
  readonly evaluatedOn?: string
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function canonicalizeJson(value: PolicyReportJson): PolicyReportJson {
  if (Array.isArray(value)) return value.map(canonicalizeJson)
  if (value === null || typeof value !== "object") return value
  const output: Record<string, PolicyReportJson> = Object.create(null) as Record<string, PolicyReportJson>
  const record = value as { readonly [key: string]: PolicyReportJson }
  for (const key of Object.keys(record).sort(compareOrdinal)) {
    Object.defineProperty(output, key, {
      value: canonicalizeJson(record[key]!),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return output
}

function canonicalJson(value: PolicyReportJson): string {
  return JSON.stringify(canonicalizeJson(value))
}

function compareFindings(
  left: DesignSystemPolicyReport["findings"][number],
  right: DesignSystemPolicyReport["findings"][number],
): number {
  const keys = [
    [left.ruleId, right.ruleId],
    [left.subjectId, right.subjectId],
    [left.fieldPath, right.fieldPath],
    [left.message, right.message],
    [canonicalJson(left.evidence), canonicalJson(right.evidence)],
  ] as const
  for (const [leftKey, rightKey] of keys) {
    const order = compareOrdinal(leftKey, rightKey)
    if (order !== 0) return order
  }
  return 0
}

function compareLimits(
  left: DesignSystemPolicyReport["analysisLimits"][number],
  right: DesignSystemPolicyReport["analysisLimits"][number],
): number {
  return compareOrdinal(left.code, right.code) ||
    compareOrdinal(left.subjectId ?? "", right.subjectId ?? "") ||
    compareOrdinal(left.message, right.message)
}

function compareDiagnostics(
  left: DesignSystemPolicyReport["exceptionDiagnostics"][number],
  right: DesignSystemPolicyReport["exceptionDiagnostics"][number],
): number {
  return compareOrdinal(left.code, right.code) ||
    compareOrdinal(left.ruleId, right.ruleId) ||
    compareOrdinal(left.subjectId, right.subjectId) ||
    compareOrdinal(left.expiresOn ?? "", right.expiresOn ?? "") ||
    compareOrdinal(left.reason, right.reason)
}

function assertUnique(values: ReadonlyArray<string>, label: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new TypeError(`Invalid design-system policy input: duplicate ${label} ${JSON.stringify(value)}.`)
    seen.add(value)
  }
}

function consumerIdentity(manifest: DesignSystemManifest): string {
  return manifest.package.name + "\u0000" + manifest.package.version
}

function validateConsumers(current: DesignSystemManifest, consumers: ReadonlyArray<DesignSystemManifest>): void {
  assertUnique(consumers.map(consumerIdentity), "consumer identity")
  if (consumers.some(consumer => consumer.package.name === current.package.name)) {
    throw new TypeError(`Invalid design-system policy input: provider ${JSON.stringify(current.package.name)} cannot also be a supplied consumer.`)
  }
}

function validateExceptionsBeforeEvaluation(
  policy: DesignSystemPolicy,
  evaluatedOn: string | undefined,
): void {
  if (evaluatedOn !== undefined) return
  if (policy.exceptions.some(exception => exception.expiresOn !== undefined)) {
    throw new TypeError("Invalid design-system policy evaluation: evaluatedOn is required when an exception has expiresOn.")
  }
}

/** Validate explicit inputs and produce a deterministic, versioned policy report. */
export function checkDesignSystemPolicy(input: CheckDesignSystemPolicyInput): DesignSystemPolicyReport {
  const policy = decodeDesignSystemPolicy(input.policy)
  const current = decodeManifest(input.current)
  const consumers = (input.consumers ?? []).map(decodeManifest)
  const styleMetadata = (input.styleMetadata ?? []).map(decodeStyleExplanationMetadata)
  const measurements = decodePolicyMeasurements(input.measurements ?? [])
  const evaluatedOn = input.evaluatedOn === undefined
    ? undefined
    : decodePolicyEvaluationDate(input.evaluatedOn)

  validateExceptionsBeforeEvaluation(policy, evaluatedOn)
  validateConsumers(current, consumers)
  assertUnique(styleMetadata.map(metadata => metadata.moduleId), "style metadata module identity")

  const styleEvaluation = evaluateStylePolicyRules({ policy, current, consumers, styleMetadata })
  const manifestEvaluation = evaluateManifestPolicyRules({ policy, current, measurements })
  const preset = getBuiltInPolicyPreset(policy.preset.name)
  const levelFor = (ruleId: PolicyRuleId): PolicyLevel =>
    policy.severityOverrides[ruleId] ?? preset.severityByRule[ruleId]
  const composed = applyPolicyExceptions({
    policy,
    candidates: [...styleEvaluation.findings, ...manifestEvaluation.findings],
    ...(evaluatedOn === undefined ? {} : { evaluatedOn }),
    levelFor,
  })
  const report = {
    format: "crumbs.css.design-system-policy-report",
    schemaVersion: 1,
    provider: { name: current.package.name, version: current.package.version },
    policy: { policyId: policy.policyId, version: policy.version },
    preset: policy.preset,
    suppliedConsumers: consumers.map(consumer => ({
      name: consumer.package.name,
      version: consumer.package.version,
    })).sort((left, right) =>
      compareOrdinal(left.name, right.name) || compareOrdinal(left.version, right.version)),
    ...(evaluatedOn === undefined ? {} : { evaluatedOn }),
    findings: [...composed.findings].sort(compareFindings),
    exceptionDiagnostics: [...composed.diagnostics].sort(compareDiagnostics),
    analysisLimits: [...styleEvaluation.analysisLimits, ...manifestEvaluation.analysisLimits].sort(compareLimits),
  }
  return decodeDesignSystemPolicyReport(report)
}
