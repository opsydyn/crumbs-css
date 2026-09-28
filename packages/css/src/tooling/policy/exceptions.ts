import type {
  DesignSystemPolicy,
  DesignSystemPolicyFinding,
  PolicyExceptionDiagnostic,
  PolicyLevel,
  PolicyRuleCandidate,
  PolicyRuleId,
} from "./model"

type ApplyPolicyExceptionsInput = {
  readonly policy: DesignSystemPolicy
  readonly candidates: ReadonlyArray<PolicyRuleCandidate>
  readonly evaluatedOn?: string
  readonly levelFor: (ruleId: PolicyRuleId) => PolicyLevel
}

type ApplyPolicyExceptionsResult = {
  readonly findings: ReadonlyArray<DesignSystemPolicyFinding>
  readonly diagnostics: ReadonlyArray<PolicyExceptionDiagnostic>
}

function exceptionKey(ruleId: string, subjectId: string): string {
  return ruleId + "\u0000" + subjectId
}

/** Apply exact-subject exceptions while keeping every underlying finding visible. */
export function applyPolicyExceptions(input: ApplyPolicyExceptionsInput): ApplyPolicyExceptionsResult {
  const exceptionByKey = new Map(input.policy.exceptions.map(exception => [
    exceptionKey(exception.ruleId, exception.subjectId),
    exception,
  ]))
  const matchedExceptions = new Set<string>()
  const expiredDiagnostics = new Map<string, PolicyExceptionDiagnostic>()
  const findings = input.candidates.map(candidate => {
    const key = exceptionKey(candidate.ruleId, candidate.subjectId)
    const exception = exceptionByKey.get(key)
    if (exception === undefined) {
      return { ...candidate, level: input.levelFor(candidate.ruleId), disposition: "active" as const }
    }

    matchedExceptions.add(key)
    if (exception.expiresOn === undefined || input.evaluatedOn! <= exception.expiresOn) {
      return {
        ...candidate,
        level: input.levelFor(candidate.ruleId),
        disposition: "excepted" as const,
        exception: {
          reason: exception.reason,
          ...(exception.expiresOn === undefined ? {} : { expiresOn: exception.expiresOn }),
        },
      }
    }

    if (!expiredDiagnostics.has(key)) {
      expiredDiagnostics.set(key, {
        code: "exception.expired",
        level: "warning",
        ruleId: exception.ruleId,
        subjectId: exception.subjectId,
        reason: exception.reason,
        expiresOn: exception.expiresOn,
      })
    }
    return { ...candidate, level: input.levelFor(candidate.ruleId), disposition: "active" as const }
  })

  const diagnostics = [...expiredDiagnostics.values()]
  for (const exception of input.policy.exceptions) {
    const key = exceptionKey(exception.ruleId, exception.subjectId)
    if (matchedExceptions.has(key)) continue
    diagnostics.push({
      code: "exception.unused",
      level: "info",
      ruleId: exception.ruleId,
      subjectId: exception.subjectId,
      reason: exception.reason,
    })
  }

  return { findings, diagnostics }
}
