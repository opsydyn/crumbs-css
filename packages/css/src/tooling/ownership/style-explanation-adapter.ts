import type { StyleExplanationReport } from "../../devtools/style-explanation-model"
import { decodeStyleExplanationReport } from "../../devtools/style-explanation-schema"
import type { OwnershipEntityIndex } from "./entity-index"
import { assertOwnershipReferenceLimit, readOwnDataField } from "./resource-limit"
import type { ReportReference } from "./report-adapters"

const DEPENDENCY_GROUPS = ["declaredTokens", "activeTokens", "changedTokens"] as const

function preflightReferenceCount(input: unknown): number | undefined {
  const dependencies = readOwnDataField(input, "dependencies")
  let count = 0
  let foundArray = false
  for (const group of DEPENDENCY_GROUPS) {
    const values = readOwnDataField(dependencies, group)
    if (Array.isArray(values)) {
      count += values.length
      foundArray = true
    }
  }
  return foundArray ? count : undefined
}

/** Match style-explanation token variables against exact supplied manifest identities. */
export function adaptStyleExplanationReport(input: unknown, index: OwnershipEntityIndex): {
  readonly format: StyleExplanationReport["$$type"]
  readonly schemaVersion: StyleExplanationReport["version"]
  readonly data: StyleExplanationReport
  readonly references: ReadonlyArray<ReportReference>
} {
  const inputReferenceCount = preflightReferenceCount(input)
  if (inputReferenceCount !== undefined) assertOwnershipReferenceLimit(inputReferenceCount)
  const report = decodeStyleExplanationReport(input)
  const referenceCount = DEPENDENCY_GROUPS.reduce((total, group) => total + report.dependencies[group].length, 0)
  assertOwnershipReferenceLimit(referenceCount)

  const references: ReportReference[] = []
  for (const group of DEPENDENCY_GROUPS) {
    report.dependencies[group].forEach((variableName, indexInGroup) => {
      const jsonPointer = `/dependencies/${group}/${indexInGroup}`
      const tokenIds = index.tokenIdsByVariableName.get(variableName) ?? []
      if (tokenIds.length === 1) {
        references.push({ jsonPointer, entityId: tokenIds[0]! })
      } else {
        references.push({
          jsonPointer,
          unresolvedReason: tokenIds.length === 0
            ? "entity-not-in-supplied-manifests"
            : "variable-name-ambiguous",
        })
      }
    })
  }

  return {
    format: report.$$type,
    schemaVersion: report.version,
    data: report,
    references,
  }
}
