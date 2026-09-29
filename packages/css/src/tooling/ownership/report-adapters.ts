import type { ManifestCompatibilityReport } from "../manifest/comparison-report-model"
import type { DesignSystemPolicyReport } from "../policy/model"
import type { SourceMigrationReport } from "../migrations/model"
import type { OwnershipUnresolvedReason } from "./model"

export type ReportReference =
  | { readonly jsonPointer: string; readonly entityId: string }
  | {
    readonly jsonPointer: string
    readonly unresolvedReason: Extract<OwnershipUnresolvedReason, "stable-id-unavailable">
  }

function escapePointerSegment(segment: string | number): string {
  return String(segment).replace(/~/gu, "~0").replace(/\//gu, "~1")
}

/** Encode location segments as an RFC 6901 JSON Pointer. */
export function toJsonPointer(segments: ReadonlyArray<string | number>): string {
  return segments.length === 0 ? "" : `/${segments.map(escapePointerSegment).join("/")}`
}

export function adaptCompatibilityReport(report: ManifestCompatibilityReport): ReadonlyArray<ReportReference> {
  return report.findings.map((finding, index) => ({
    jsonPointer: toJsonPointer(["findings", index, "entityId"]),
    entityId: finding.entityId,
  }))
}

function isManifestEntityPolicyRule(ruleId: string): boolean {
  return ruleId === "entity.deprecated" || ruleId === "consumer.private-token"
}

export function adaptPolicyReport(report: DesignSystemPolicyReport): ReadonlyArray<ReportReference> {
  const findings = report.findings.map((finding, index): ReportReference => {
    const jsonPointer = toJsonPointer(["findings", index, "subjectId"])
    return isManifestEntityPolicyRule(finding.ruleId)
      ? { jsonPointer, entityId: finding.subjectId }
      : { jsonPointer, unresolvedReason: "stable-id-unavailable" }
  })
  const exceptionDiagnostics = report.exceptionDiagnostics.map((diagnostic, index): ReportReference => {
    const jsonPointer = toJsonPointer(["exceptionDiagnostics", index, "subjectId"])
    return isManifestEntityPolicyRule(diagnostic.ruleId)
      ? { jsonPointer, entityId: diagnostic.subjectId }
      : { jsonPointer, unresolvedReason: "stable-id-unavailable" }
  })
  return [...findings, ...exceptionDiagnostics]
}

export function adaptMigrationReport(report: SourceMigrationReport): ReadonlyArray<ReportReference> {
  return report.diagnostics.map((diagnostic, index): ReportReference => diagnostic.entityId === undefined
    ? {
      jsonPointer: toJsonPointer(["diagnostics", index]),
      unresolvedReason: "stable-id-unavailable",
    }
    : {
      jsonPointer: toJsonPointer(["diagnostics", index, "entityId"]),
      entityId: diagnostic.entityId,
    })
}
