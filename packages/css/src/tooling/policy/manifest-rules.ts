import type {
  DesignSystemManifest,
  ManifestCapability,
  ManifestComponent,
  ManifestLifecycle,
  ManifestToken,
} from "../manifest/model"
import type {
  DesignSystemPolicy,
  PolicyAnalysisLimit,
  PolicyMeasurement,
  PolicyRuleCandidate,
  PolicyRuleEvaluation,
} from "./model"

type EvaluateManifestPolicyRulesInput = {
  readonly policy: DesignSystemPolicy
  readonly current: DesignSystemManifest
  readonly measurements: ReadonlyArray<PolicyMeasurement>
}

function addLimit(
  limits: PolicyAnalysisLimit[],
  seen: Set<string>,
  limit: PolicyAnalysisLimit,
): void {
  const key = limit.code + "\u0000" + (limit.subjectId ?? "") + "\u0000" + limit.message
  if (seen.has(key)) return
  seen.add(key)
  limits.push(limit)
}

function capabilitySubjectId(profileId: string, capability: ManifestCapability): string {
  return "capability#" + JSON.stringify([
    profileId,
    capability.moduleId,
    capability.exportPath,
    capability.property,
    capability.primitive,
  ])
}

function evaluateCapabilities(
  policy: DesignSystemPolicy,
  manifest: DesignSystemManifest,
  findings: PolicyRuleCandidate[],
  limits: PolicyAnalysisLimit[],
  seenLimits: Set<string>,
): void {
  const observedCapabilities = manifest.capabilities.filter(capability => capability.evidence === "compiler-observed")
  if (observedCapabilities.length === 0) {
    if (policy.targetProfiles.length > 0) {
      for (const profile of policy.targetProfiles) {
        addLimit(limits, seenLimits, {
          code: "capability-evidence-missing",
          subjectId: profile.id,
          message: "No compiler-observed capability evidence was supplied for target profile " +
            JSON.stringify(profile.id) + ".",
        })
      }
    }
    return
  }

  if (policy.targetProfiles.length === 0) {
    addLimit(limits, seenLimits, {
      code: "target-profile-missing",
      message: "Compiler-observed capabilities were supplied but no explicit target profiles were configured.",
    })
    return
  }

  for (const profile of policy.targetProfiles) {
    const supported = new Set(profile.supportedCapabilities.map(capability =>
      capability.property + "\u0000" + capability.primitive))
    for (const capability of observedCapabilities) {
      if (supported.has(capability.property + "\u0000" + capability.primitive)) continue
      findings.push({
        ruleId: "capability.not-supported",
        subjectId: capabilitySubjectId(profile.id, capability),
        fieldPath: "capabilities." + capability.property + "." + capability.primitive,
        message: "Target profile " + JSON.stringify(profile.id) + " does not support " +
          JSON.stringify(capability.primitive) + " primitive property " +
          JSON.stringify(capability.property) + ".",
        evidence: { profileId: profile.id, capability },
      })
    }
  }
}

function lifecycleEvidence(
  entityKind: "token" | "component",
  entity: ManifestToken | ManifestComponent,
  lifecycle: ManifestLifecycle,
): PolicyRuleCandidate {
  return {
    ruleId: "entity.deprecated",
    subjectId: entity.id,
    fieldPath: entityKind + ".lifecycle",
    message: entityKind + " " + JSON.stringify(entity.id) + " is deprecated since " +
      JSON.stringify(lifecycle.deprecatedSince) + ".",
    evidence: {
      entityKind,
      entityId: entity.id,
      deprecatedSince: lifecycle.deprecatedSince,
      ...(lifecycle.reason === undefined ? {} : { reason: lifecycle.reason }),
      ...(lifecycle.replacement === undefined ? {} : { replacement: lifecycle.replacement }),
    },
  }
}

function evaluateLifecycle(
  manifest: DesignSystemManifest,
  findings: PolicyRuleCandidate[],
): void {
  for (const token of manifest.tokens) {
    if (token.lifecycle !== undefined) findings.push(lifecycleEvidence("token", token, token.lifecycle))
  }
  for (const component of manifest.components) {
    if (component.lifecycle !== undefined) findings.push(lifecycleEvidence("component", component, component.lifecycle))
  }
}

function budgetSubjectId(metricId: string, scopeId: string, unit: string): string {
  return "budget#" + JSON.stringify([metricId, scopeId, unit])
}

function measurementKey(metricId: string, scopeId: string, unit: string): string {
  return metricId + "\u0000" + scopeId + "\u0000" + unit
}

function evaluateBudgets(
  policy: DesignSystemPolicy,
  measurements: ReadonlyArray<PolicyMeasurement>,
  findings: PolicyRuleCandidate[],
  limits: PolicyAnalysisLimit[],
  seenLimits: Set<string>,
): void {
  const measurementByKey = new Map(measurements.map(measurement => [
    measurementKey(measurement.metricId, measurement.scopeId, measurement.unit),
    measurement,
  ]))
  for (const budget of policy.outputBudgets) {
    const subjectId = budgetSubjectId(budget.metricId, budget.scopeId, budget.unit)
    const measurement = measurementByKey.get(measurementKey(budget.metricId, budget.scopeId, budget.unit))
    if (measurement === undefined) {
      addLimit(limits, seenLimits, {
        code: "measurement-missing",
        subjectId,
        message: "No supplied measurement matches metric " + JSON.stringify(budget.metricId) +
          ", scope " + JSON.stringify(budget.scopeId) + ", and unit " + JSON.stringify(budget.unit) + ".",
      })
      continue
    }
    if (measurement.value <= budget.maximum) continue

    findings.push({
      ruleId: "output.budget-exceeded",
      subjectId,
      fieldPath: "measurements." + budget.metricId + "." + budget.scopeId + "." + budget.unit,
      message: "Measured output " + JSON.stringify(budget.metricId) + " for scope " +
        JSON.stringify(budget.scopeId) + " is " + measurement.value + " " +
        JSON.stringify(budget.unit) + ", above the budget of " + budget.maximum + ".",
      evidence: { budget, measurement },
    })
  }
}

/** Evaluate manifest, lifecycle, capability, and explicit output-budget rules. */
export function evaluateManifestPolicyRules(input: EvaluateManifestPolicyRulesInput): PolicyRuleEvaluation {
  const findings: PolicyRuleCandidate[] = []
  const analysisLimits: PolicyAnalysisLimit[] = []
  const seenLimits = new Set<string>()
  evaluateCapabilities(input.policy, input.current, findings, analysisLimits, seenLimits)
  evaluateLifecycle(input.current, findings)
  evaluateBudgets(input.policy, input.measurements, findings, analysisLimits, seenLimits)
  return { findings, analysisLimits }
}
