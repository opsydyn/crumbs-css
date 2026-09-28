import type { NativePrimitiveDomain } from "../../compiler/native-capture"

export const DESIGN_SYSTEM_POLICY_FORMAT = "crumbs.css.design-system-policy" as const
export const DESIGN_SYSTEM_POLICY_VERSION = 1 as const
export const DESIGN_SYSTEM_POLICY_REPORT_FORMAT = "crumbs.css.design-system-policy-report" as const
export const DESIGN_SYSTEM_POLICY_REPORT_VERSION = 1 as const
export const DESIGN_SYSTEM_POLICY_PRESET_VERSION = 1 as const

export const POLICY_RULE_IDS = [
  "style.literal-value",
  "style.semantic-token-required",
  "consumer.private-token",
  "capability.not-supported",
  "entity.deprecated",
  "output.budget-exceeded",
] as const

export type PolicyRuleId = typeof POLICY_RULE_IDS[number]
export type PolicyLevel = "info" | "warning" | "error"
export type PolicyPresetName = "migration" | "enforce"

export type PolicyPresetIdentity = {
  readonly name: PolicyPresetName
  readonly version: typeof DESIGN_SYSTEM_POLICY_PRESET_VERSION
}

export type PolicyPropertyScope = {
  readonly property: string
  readonly domain?: NativePrimitiveDomain
}

export type PolicyTargetCapability = {
  readonly property: string
  readonly primitive: string
}

export type PolicyTargetProfile = {
  readonly id: string
  readonly supportedCapabilities: ReadonlyArray<PolicyTargetCapability>
}

export type PolicyOutputBudget = {
  readonly metricId: string
  readonly scopeId: string
  readonly unit: string
  readonly maximum: number
}

export type PolicyMeasurement = {
  readonly metricId: string
  readonly scopeId: string
  readonly unit: string
  readonly value: number
}

export type PolicyException = {
  readonly ruleId: PolicyRuleId
  readonly subjectId: string
  readonly reason: string
  readonly expiresOn?: string
}

export type DesignSystemPolicy = {
  readonly format: typeof DESIGN_SYSTEM_POLICY_FORMAT
  readonly schemaVersion: typeof DESIGN_SYSTEM_POLICY_VERSION
  readonly policyId: string
  readonly version: number
  readonly preset: PolicyPresetIdentity
  readonly severityOverrides: Partial<Record<PolicyRuleId, PolicyLevel>>
  readonly literalValueScopes: ReadonlyArray<PolicyPropertyScope>
  readonly semanticTokenScopes: ReadonlyArray<PolicyPropertyScope>
  readonly semanticTokenIds: ReadonlyArray<string>
  readonly targetProfiles: ReadonlyArray<PolicyTargetProfile>
  readonly outputBudgets: ReadonlyArray<PolicyOutputBudget>
  readonly exceptions: ReadonlyArray<PolicyException>
}

export type PolicyReportJson = null | boolean | number | string
  | ReadonlyArray<PolicyReportJson>
  | { readonly [key: string]: PolicyReportJson }

export type PolicyProviderIdentity = {
  readonly name: string
  readonly version: string
}

export type PolicyFindingException = {
  readonly reason: string
  readonly expiresOn?: string
}

export type DesignSystemPolicyFinding = {
  readonly ruleId: PolicyRuleId
  readonly level: PolicyLevel
  readonly subjectId: string
  readonly fieldPath: string
  readonly message: string
  readonly evidence: PolicyReportJson
  readonly disposition: "active" | "excepted"
  readonly exception?: PolicyFindingException
}

export type PolicyExceptionDiagnostic = {
  readonly code: "exception.expired" | "exception.unused"
  readonly level: "warning" | "info"
  readonly ruleId: PolicyRuleId
  readonly subjectId: string
  readonly reason: string
  readonly expiresOn?: string
}

export type PolicyAnalysisLimitCode =
  | "consumer-coverage"
  | "style-metadata-missing"
  | "style-metadata-incomplete"
  | "token-identity-unknown"
  | "target-profile-missing"
  | "measurement-missing"

export type PolicyAnalysisLimit = {
  readonly code: PolicyAnalysisLimitCode
  readonly message: string
  readonly subjectId?: string
}

export type DesignSystemPolicyReport = {
  readonly format: typeof DESIGN_SYSTEM_POLICY_REPORT_FORMAT
  readonly schemaVersion: typeof DESIGN_SYSTEM_POLICY_REPORT_VERSION
  readonly provider: PolicyProviderIdentity
  readonly policy: { readonly policyId: string; readonly version: number }
  readonly preset: PolicyPresetIdentity
  readonly suppliedConsumers: ReadonlyArray<PolicyProviderIdentity>
  readonly evaluatedOn?: string
  readonly findings: ReadonlyArray<DesignSystemPolicyFinding>
  readonly exceptionDiagnostics: ReadonlyArray<PolicyExceptionDiagnostic>
  readonly analysisLimits: ReadonlyArray<PolicyAnalysisLimit>
}

export type BuiltInPolicyPreset = {
  readonly name: PolicyPresetName
  readonly version: typeof DESIGN_SYSTEM_POLICY_PRESET_VERSION
  readonly severityByRule: Readonly<Record<PolicyRuleId, PolicyLevel>>
}
