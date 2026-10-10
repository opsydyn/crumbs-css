import { f as NativePrimitiveDomain } from "./model-DAuWjF1q.mjs";

//#region src/tooling/policy/model.d.ts
declare const DESIGN_SYSTEM_POLICY_FORMAT: "crumbs.css.design-system-policy";
declare const DESIGN_SYSTEM_POLICY_VERSION: 1;
declare const DESIGN_SYSTEM_POLICY_REPORT_FORMAT: "crumbs.css.design-system-policy-report";
declare const DESIGN_SYSTEM_POLICY_REPORT_VERSION: 1;
declare const DESIGN_SYSTEM_POLICY_PRESET_VERSION: 1;
declare const POLICY_RULE_IDS: readonly ["style.literal-value", "style.semantic-token-required", "consumer.private-token", "capability.not-supported", "entity.deprecated", "output.budget-exceeded"];
type PolicyRuleId = typeof POLICY_RULE_IDS[number];
type PolicyLevel = "info" | "warning" | "error";
type PolicyPresetName = "migration" | "enforce";
type PolicyPresetIdentity = {
  readonly name: PolicyPresetName;
  readonly version: typeof DESIGN_SYSTEM_POLICY_PRESET_VERSION;
};
type PolicyPropertyScope = {
  readonly property: string;
  readonly domain?: NativePrimitiveDomain;
};
type PolicyTargetCapability = {
  readonly property: string;
  readonly primitive: string;
};
type PolicyTargetProfile = {
  readonly id: string;
  readonly supportedCapabilities: ReadonlyArray<PolicyTargetCapability>;
};
type PolicyOutputBudget = {
  readonly metricId: string;
  readonly scopeId: string;
  readonly unit: string;
  readonly maximum: number;
};
type PolicyMeasurement = {
  readonly metricId: string;
  readonly scopeId: string;
  readonly unit: string;
  readonly value: number;
};
type PolicyException = {
  readonly ruleId: PolicyRuleId;
  readonly subjectId: string;
  readonly reason: string;
  readonly expiresOn?: string;
};
type DesignSystemPolicy = {
  readonly format: typeof DESIGN_SYSTEM_POLICY_FORMAT;
  readonly schemaVersion: typeof DESIGN_SYSTEM_POLICY_VERSION;
  readonly policyId: string;
  readonly version: number;
  readonly preset: PolicyPresetIdentity;
  readonly severityOverrides: Partial<Record<PolicyRuleId, PolicyLevel>>;
  readonly literalValueScopes: ReadonlyArray<PolicyPropertyScope>;
  readonly semanticTokenScopes: ReadonlyArray<PolicyPropertyScope>;
  readonly semanticTokenIds: ReadonlyArray<string>;
  readonly targetProfiles: ReadonlyArray<PolicyTargetProfile>;
  readonly outputBudgets: ReadonlyArray<PolicyOutputBudget>;
  readonly exceptions: ReadonlyArray<PolicyException>;
};
type PolicyReportJson = null | boolean | number | string | ReadonlyArray<PolicyReportJson> | {
  readonly [key: string]: PolicyReportJson;
};
type PolicyProviderIdentity = {
  readonly name: string;
  readonly version: string;
};
type PolicyFindingException = {
  readonly reason: string;
  readonly expiresOn?: string;
};
type DesignSystemPolicyFinding = {
  readonly ruleId: PolicyRuleId;
  readonly level: PolicyLevel;
  readonly subjectId: string;
  readonly fieldPath: string;
  readonly message: string;
  readonly evidence: PolicyReportJson;
  readonly disposition: "active" | "excepted";
  readonly exception?: PolicyFindingException;
};
type PolicyExceptionDiagnostic = {
  readonly code: "exception.expired" | "exception.unused";
  readonly level: "warning" | "info";
  readonly ruleId: PolicyRuleId;
  readonly subjectId: string;
  readonly reason: string;
  readonly expiresOn?: string;
};
type PolicyAnalysisLimitCode = "consumer-coverage" | "style-metadata-missing" | "style-metadata-incomplete" | "token-identity-unknown" | "target-profile-missing" | "capability-evidence-missing" | "measurement-missing";
type PolicyAnalysisLimit = {
  readonly code: PolicyAnalysisLimitCode;
  readonly message: string;
  readonly subjectId?: string;
};
type DesignSystemPolicyReport = {
  readonly format: typeof DESIGN_SYSTEM_POLICY_REPORT_FORMAT;
  readonly schemaVersion: typeof DESIGN_SYSTEM_POLICY_REPORT_VERSION;
  readonly provider: PolicyProviderIdentity;
  readonly policy: {
    readonly policyId: string;
    readonly version: number;
  };
  readonly preset: PolicyPresetIdentity;
  readonly suppliedConsumers: ReadonlyArray<PolicyProviderIdentity>;
  readonly evaluatedOn?: string;
  readonly findings: ReadonlyArray<DesignSystemPolicyFinding>;
  readonly exceptionDiagnostics: ReadonlyArray<PolicyExceptionDiagnostic>;
  readonly analysisLimits: ReadonlyArray<PolicyAnalysisLimit>;
};
type BuiltInPolicyPreset = {
  readonly name: PolicyPresetName;
  readonly version: typeof DESIGN_SYSTEM_POLICY_PRESET_VERSION;
  readonly severityByRule: Readonly<Record<PolicyRuleId, PolicyLevel>>;
};
//#endregion
export { PolicyReportJson as C, PolicyTargetProfile as E, PolicyProviderIdentity as S, PolicyTargetCapability as T, PolicyMeasurement as _, DESIGN_SYSTEM_POLICY_REPORT_VERSION as a, PolicyPresetName as b, DesignSystemPolicyFinding as c, PolicyAnalysisLimit as d, PolicyAnalysisLimitCode as f, PolicyLevel as g, PolicyFindingException as h, DESIGN_SYSTEM_POLICY_REPORT_FORMAT as i, DesignSystemPolicyReport as l, PolicyExceptionDiagnostic as m, DESIGN_SYSTEM_POLICY_FORMAT as n, DESIGN_SYSTEM_POLICY_VERSION as o, PolicyException as p, DESIGN_SYSTEM_POLICY_PRESET_VERSION as r, DesignSystemPolicy as s, BuiltInPolicyPreset as t, POLICY_RULE_IDS as u, PolicyOutputBudget as v, PolicyRuleId as w, PolicyPropertyScope as x, PolicyPresetIdentity as y };