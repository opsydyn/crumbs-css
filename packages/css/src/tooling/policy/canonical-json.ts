import { decodeDesignSystemPolicyReport } from "./schema"
import type { PolicyReportJson } from "./model"

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sortJsonObjectKeys(value: PolicyReportJson): PolicyReportJson {
  if (Array.isArray(value)) return value.map(sortJsonObjectKeys)
  if (value === null || typeof value !== "object") return value
  const output: Record<string, PolicyReportJson> = Object.create(null) as Record<string, PolicyReportJson>
  const record = value as { readonly [key: string]: PolicyReportJson }
  for (const key of Object.keys(record).sort(compareOrdinal)) {
    Object.defineProperty(output, key, {
      value: sortJsonObjectKeys(record[key]!),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return output
}

/** Encode a validated policy report as compact recursively key-sorted JSON. */
export function encodeCanonicalDesignSystemPolicyReport(input: unknown): string {
  const report = decodeDesignSystemPolicyReport(input)
  return `${JSON.stringify(sortJsonObjectKeys(report as unknown as PolicyReportJson))}\n`
}
