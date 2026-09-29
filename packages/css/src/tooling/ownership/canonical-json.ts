import { decodeOwnedReport } from "./schema"
import type { OwnedReport, OwnershipAttribution, OwnershipAnalysisLimit } from "./model"

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function compareAttributions(left: OwnershipAttribution, right: OwnershipAttribution): number {
  return compareOrdinal(left.jsonPointer, right.jsonPointer) ||
    compareOrdinal(left.entityId ?? "", right.entityId ?? "") ||
    compareOrdinal(left.status, right.status)
}

function compareAnalysisLimits(left: OwnershipAnalysisLimit, right: OwnershipAnalysisLimit): number {
  return compareOrdinal(left.code, right.code) || compareOrdinal(left.message, right.message)
}

function sortJsonObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonObjectKeys)
  if (value === null || typeof value !== "object") return value
  const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>
  for (const key of Object.keys(value).sort(compareOrdinal)) {
    Object.defineProperty(output, key, {
      value: sortJsonObjectKeys((value as Record<string, unknown>)[key]),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return output
}

function normalizeOwnedReport(report: OwnedReport): OwnedReport {
  return {
    ...report,
    attributions: [...report.attributions].sort(compareAttributions),
    analysisLimits: [...report.analysisLimits].sort(compareAnalysisLimits),
  }
}

/** Encode a validated owned report as recursively key-sorted JSON with one newline. */
export function encodeCanonicalOwnedReport(input: unknown): string {
  const report = decodeOwnedReport(input)
  return `${JSON.stringify(sortJsonObjectKeys(normalizeOwnedReport(report)))}\n`
}
