import { decodeStyleExplanationMetadata } from "../../devtools/style-explanation-schema"
import type {
  StyleExplanationDeclaration,
  StyleExplanationMetadata,
  StyleExplanationThemeToken,
  StyleExplanationValue,
} from "../../devtools/style-explanation-model"
import { tokenPublicId, tokenVariableName } from "../../tokens/identity"
import type { TokenContractIdentity } from "../../tokens/identity"
import { checkManifestConsumers } from "../manifest/consumer-check"
import type { DesignSystemManifest } from "../manifest/model"
import type {
  DesignSystemPolicy,
  PolicyAnalysisLimit,
  PolicyReportJson,
  PolicyRuleCandidate,
  PolicyRuleEvaluation,
} from "./model"

type EvaluateStylePolicyRulesInput = {
  readonly policy: DesignSystemPolicy
  readonly current: DesignSystemManifest
  readonly consumers: ReadonlyArray<DesignSystemManifest>
  readonly styleMetadata: ReadonlyArray<StyleExplanationMetadata>
}

type TokenLookup =
  | { readonly status: "matched"; readonly tokenId: string }
  | { readonly status: "unknown" }

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isThemeToken(value: StyleExplanationValue): value is StyleExplanationThemeToken {
  if (!isRecord(value) || value.kind !== "theme-token") return false
  const identity: unknown = value["identity"]
  return isRecord(identity) && typeof identity["varName"] === "string"
}

function containsOpaqueValue(value: StyleExplanationValue): boolean {
  if (!isRecord(value) && !Array.isArray(value)) return false
  if (isRecord(value) && value.kind === "opaque") return true
  return Object.values(value).some(item => containsOpaqueValue(item as StyleExplanationValue))
}

function sameContract(left: TokenContractIdentity, right: TokenContractIdentity): boolean {
  return left.owner === right.owner && left.name === right.name && left.version === right.version
}

function lookupToken(
  value: StyleExplanationThemeToken,
  current: DesignSystemManifest,
): TokenLookup {
  let candidates = current.tokens.filter(token =>
    tokenVariableName(token.contract, token.path) === value.identity.varName)
  if (value.identity.contract !== undefined) {
    candidates = candidates.filter(token => sameContract(token.contract, value.identity.contract!))
  }
  if (candidates.length !== 1) return { status: "unknown" }
  const token = candidates[0]!
  if (tokenPublicId(token.contract, token.path) !== token.id) return { status: "unknown" }
  return { status: "matched", tokenId: token.id }
}

function scopeMatches(
  declaration: StyleExplanationDeclaration,
  scopes: DesignSystemPolicy["literalValueScopes"],
): boolean {
  return scopes.some(scope =>
    scope.property === declaration.canonicalProperty &&
    (scope.domain === undefined || scope.domain.some(kind => declaration.primitiveDomain.includes(kind))),
  )
}

function fieldPath(declaration: StyleExplanationDeclaration): string {
  const prefix = declaration.logicalPath.map(String).join(".")
  return prefix === "" ? declaration.canonicalProperty : prefix + "." + declaration.canonicalProperty
}

function declarationSubjectId(
  metadata: StyleExplanationMetadata,
  exportPath: ReadonlyArray<string | number>,
  declaration: StyleExplanationDeclaration,
): string {
  return metadata.moduleId + "#" + JSON.stringify(exportPath) + "#" + declaration.id
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

function addStyleCoverageLimits(
  metadata: StyleExplanationMetadata,
  limits: PolicyAnalysisLimit[],
  seen: Set<string>,
): void {
  for (const exportMetadata of metadata.exports) {
    if (exportMetadata.coverage.status === "complete") continue
    addLimit(limits, seen, {
      code: "style-metadata-incomplete",
      subjectId: metadata.moduleId + "#" + JSON.stringify(exportMetadata.path),
      message: "M9.3 style metadata coverage is " + exportMetadata.coverage.status +
        ": " + exportMetadata.coverage.reasons.join(", ") + ".",
    })
  }
}

function evaluateDeclarations(
  policy: DesignSystemPolicy,
  current: DesignSystemManifest,
  metadata: StyleExplanationMetadata,
  findings: PolicyRuleCandidate[],
  limits: PolicyAnalysisLimit[],
  seenLimits: Set<string>,
): void {
  addStyleCoverageLimits(metadata, limits, seenLimits)
  for (const exportMetadata of metadata.exports) {
    for (const declaration of exportMetadata.candidates) {
      const literalScopeMatches = scopeMatches(declaration, policy.literalValueScopes)
      const semanticScopeMatches = scopeMatches(declaration, policy.semanticTokenScopes)
      if (!literalScopeMatches && !semanticScopeMatches) continue

      const subjectId = declarationSubjectId(metadata, exportMetadata.path, declaration)
      if (containsOpaqueValue(declaration.value)) {
        addLimit(limits, seenLimits, {
          code: "style-metadata-incomplete",
          subjectId,
          message: "The declaration contains an opaque value that policy rules cannot classify.",
        })
        continue
      }

      const themeToken = isThemeToken(declaration.value) ? declaration.value : undefined
      if (literalScopeMatches && themeToken === undefined) {
        findings.push({
          ruleId: "style.literal-value",
          subjectId,
          fieldPath: fieldPath(declaration),
          message: "A non-token value is used in a configured style scope for " +
            JSON.stringify(declaration.canonicalProperty) + ".",
          evidence: {
            moduleId: metadata.moduleId,
            exportPath: exportMetadata.path,
            declarationId: declaration.id,
            property: declaration.canonicalProperty,
            primitiveDomain: declaration.primitiveDomain,
            value: declaration.value as unknown as PolicyReportJson,
          },
        })
      }

      if (!semanticScopeMatches) continue
      if (themeToken === undefined) {
        findings.push({
          ruleId: "style.semantic-token-required",
          subjectId,
          fieldPath: fieldPath(declaration),
          message: "A semantic token is required for " +
            JSON.stringify(declaration.canonicalProperty) + " in this scope.",
          evidence: {
            moduleId: metadata.moduleId,
            exportPath: exportMetadata.path,
            declarationId: declaration.id,
            property: declaration.canonicalProperty,
            primitiveDomain: declaration.primitiveDomain,
            value: declaration.value as unknown as PolicyReportJson,
          },
        })
        continue
      }

      const token = lookupToken(themeToken, current)
      if (token.status === "unknown") {
        addLimit(limits, seenLimits, {
          code: "token-identity-unknown",
          subjectId,
          message: "Theme token variable " + JSON.stringify(themeToken.identity.varName) +
            " could not be joined unambiguously to a supplied manifest token.",
        })
        continue
      }
      if (policy.semanticTokenIds.includes(token.tokenId)) continue

      findings.push({
        ruleId: "style.semantic-token-required",
        subjectId,
        fieldPath: fieldPath(declaration),
        message: "Token " + JSON.stringify(token.tokenId) +
          " is not classified as semantic by policy " + JSON.stringify(policy.policyId) + ".",
        evidence: {
          moduleId: metadata.moduleId,
          exportPath: exportMetadata.path,
          declarationId: declaration.id,
          property: declaration.canonicalProperty,
          primitiveDomain: declaration.primitiveDomain,
          tokenId: token.tokenId,
          semanticTokenIds: policy.semanticTokenIds,
        },
      })
    }
  }
}

function evaluatePrivateTokenRule(
  current: DesignSystemManifest,
  consumers: ReadonlyArray<DesignSystemManifest>,
  findings: PolicyRuleCandidate[],
  limits: PolicyAnalysisLimit[],
  seenLimits: Set<string>,
): void {
  const report = checkManifestConsumers({ current, consumers })
  for (const finding of report.findings) {
    if (finding.code !== "consumer.private-token-dependency") continue
    findings.push({
      ruleId: "consumer.private-token",
      subjectId: finding.entityId,
      fieldPath: finding.fieldPath,
      message: finding.message,
      evidence: {
        source: report.format,
        code: finding.code,
        ...(finding.before === undefined ? {} : { before: finding.before }),
        ...(finding.after === undefined ? {} : { after: finding.after }),
        affectedConsumers: finding.affectedConsumers,
      },
    })
  }
  for (const limit of report.analysisLimits) {
    addLimit(limits, seenLimits, {
      code: "consumer-coverage",
      message: limit.code + ": " + limit.message,
    })
  }
}

/** Evaluate style and explicit consumer rules without applying severities or exceptions. */
export function evaluateStylePolicyRules(input: EvaluateStylePolicyRulesInput): PolicyRuleEvaluation {
  const findings: PolicyRuleCandidate[] = []
  const analysisLimits: PolicyAnalysisLimit[] = []
  const seenLimits = new Set<string>()
  const styleRulesConfigured = input.policy.literalValueScopes.length > 0 || input.policy.semanticTokenScopes.length > 0

  if (styleRulesConfigured && input.styleMetadata.length === 0) {
    addLimit(analysisLimits, seenLimits, {
      code: "style-metadata-missing",
      message: "Style policy scopes are configured but no M9.3 style metadata sidecars were supplied.",
    })
  } else if (styleRulesConfigured) {
    const metadata = input.styleMetadata.map(decodeStyleExplanationMetadata)
    for (const sidecar of metadata) {
      evaluateDeclarations(input.policy, input.current, sidecar, findings, analysisLimits, seenLimits)
    }
  }

  evaluatePrivateTokenRule(input.current, input.consumers, findings, analysisLimits, seenLimits)
  return { findings, analysisLimits }
}
