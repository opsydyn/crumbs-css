import { v as StyleExplanationMetadata } from "./style-explanation-model-BZtfxy4g.mjs";
import { r as DesignSystemManifest } from "./model-CEh8hjok.mjs";
import { C as PolicyReportJson, E as PolicyTargetProfile, S as PolicyProviderIdentity, T as PolicyTargetCapability, _ as PolicyMeasurement, a as DESIGN_SYSTEM_POLICY_REPORT_VERSION, b as PolicyPresetName, c as DesignSystemPolicyFinding, d as PolicyAnalysisLimit, f as PolicyAnalysisLimitCode, g as PolicyLevel, h as PolicyFindingException, i as DESIGN_SYSTEM_POLICY_REPORT_FORMAT, l as DesignSystemPolicyReport, m as PolicyExceptionDiagnostic, n as DESIGN_SYSTEM_POLICY_FORMAT, o as DESIGN_SYSTEM_POLICY_VERSION, p as PolicyException, r as DESIGN_SYSTEM_POLICY_PRESET_VERSION, s as DesignSystemPolicy, t as BuiltInPolicyPreset, u as POLICY_RULE_IDS, v as PolicyOutputBudget, w as PolicyRuleId, x as PolicyPropertyScope, y as PolicyPresetIdentity } from "./model-BFKtS9b_.mjs";

//#region src/tooling/policy/canonical-json.d.ts
/** Encode a validated policy report as compact recursively key-sorted JSON. */
declare function encodeCanonicalDesignSystemPolicyReport(input: unknown): string;
//#endregion
//#region src/tooling/policy/check.d.ts
type CheckDesignSystemPolicyInput = {
  readonly policy: DesignSystemPolicy;
  readonly current: DesignSystemManifest;
  readonly consumers?: ReadonlyArray<DesignSystemManifest>;
  readonly styleMetadata?: ReadonlyArray<StyleExplanationMetadata>;
  readonly measurements?: ReadonlyArray<PolicyMeasurement>;
  readonly evaluatedOn?: string;
};
/** Validate explicit inputs and produce a deterministic, versioned policy report. */
declare function checkDesignSystemPolicy(input: CheckDesignSystemPolicyInput): DesignSystemPolicyReport;
//#endregion
//#region src/tooling/policy/presets.d.ts
/** Return the immutable, independently versioned defaults for a built-in preset. */
declare function getBuiltInPolicyPreset(name: PolicyPresetName): BuiltInPolicyPreset;
//#endregion
//#region src/tooling/policy/schema.d.ts
/** Validate and detach a plain version-1 policy document. */
declare function decodeDesignSystemPolicy(input: unknown): DesignSystemPolicy;
/** Validate an explicit calendar date for deterministic policy evaluation. */
declare function decodePolicyEvaluationDate(input: unknown): string;
/** Validate and detach explicit numeric output measurements. */
declare function decodePolicyMeasurements(input: unknown): ReadonlyArray<PolicyMeasurement>;
/** Validate and detach a version-1 policy report. */
declare function decodeDesignSystemPolicyReport(input: unknown): DesignSystemPolicyReport;
//#endregion
export { type BuiltInPolicyPreset, type CheckDesignSystemPolicyInput, DESIGN_SYSTEM_POLICY_FORMAT, DESIGN_SYSTEM_POLICY_PRESET_VERSION, DESIGN_SYSTEM_POLICY_REPORT_FORMAT, DESIGN_SYSTEM_POLICY_REPORT_VERSION, DESIGN_SYSTEM_POLICY_VERSION, type DesignSystemManifest, type DesignSystemPolicy, type DesignSystemPolicyFinding, type DesignSystemPolicyReport, POLICY_RULE_IDS, type PolicyAnalysisLimit, type PolicyAnalysisLimitCode, type PolicyException, type PolicyExceptionDiagnostic, type PolicyFindingException, type PolicyLevel, type PolicyMeasurement, type PolicyOutputBudget, type PolicyPresetIdentity, type PolicyPresetName, type PolicyPropertyScope, type PolicyProviderIdentity, type PolicyReportJson, type PolicyRuleId, type PolicyTargetCapability, type PolicyTargetProfile, type StyleExplanationMetadata, checkDesignSystemPolicy, decodeDesignSystemPolicy, decodeDesignSystemPolicyReport, decodePolicyEvaluationDate, decodePolicyMeasurements, encodeCanonicalDesignSystemPolicyReport, getBuiltInPolicyPreset };