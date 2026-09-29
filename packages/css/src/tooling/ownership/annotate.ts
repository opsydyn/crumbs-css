import type { DesignSystemManifest } from "../manifest/model"
import {
  MANIFEST_COMPATIBILITY_REPORT_FORMAT,
  type ManifestCompatibilityReport,
} from "../manifest/comparison-report-model"
import { decodeManifestCompatibilityReport } from "../manifest/comparison-report-schema"
import {
  DESIGN_SYSTEM_OWNED_REPORT_FORMAT,
  DESIGN_SYSTEM_OWNED_REPORT_VERSION,
  DESIGN_SYSTEM_OWNERSHIP_FORMAT,
  DESIGN_SYSTEM_OWNERSHIP_VERSION,
  type DesignSystemOwnership,
  type OwnedReport,
  type OwnershipAnalysisLimit,
  type OwnershipAttribution,
  type SupportedSourceReport,
} from "./model"
import {
  buildOwnershipAssignmentIndex,
  buildOwnershipEntityIndex,
  resolveOwnershipEntity,
} from "./entity-index"
import { adaptCompatibilityReport, adaptMigrationReport, adaptPolicyReport, type ReportReference } from "./report-adapters"
import { decodeDesignSystemOwnership, decodeOwnedReport } from "./schema"
import {
  DESIGN_SYSTEM_POLICY_REPORT_FORMAT,
  type DesignSystemPolicyReport,
} from "../policy/model"
import { decodeDesignSystemPolicyReport } from "../policy/schema"
import {
  SOURCE_MIGRATION_REPORT_FORMAT,
  type SourceMigrationReport,
} from "../migrations/model"
import { decodeSourceMigrationReport } from "../migrations/schema"

const EXPLICIT_MANIFESTS_MESSAGE = "Attribution is limited to the manifests explicitly supplied to this operation."
const UNRESOLVED_MANIFEST_MESSAGE = "One or more supplied manifests contain unresolved references."
const UNRESOLVED_SUBJECT_MESSAGE = "One or more report references could not be resolved to supplied token or component identities."

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function readOwnDataProperty(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined
}

function assertProviderVersions(
  requirements: ReadonlyArray<{ readonly name: string; readonly version: string }>,
  manifests: ReadonlyArray<DesignSystemManifest>,
): void {
  const supplied = new Set(manifests.map(manifest => JSON.stringify([manifest.package.name, manifest.package.version])))
  for (const required of requirements) {
    if (!supplied.has(JSON.stringify([required.name, required.version]))) {
      throw new TypeError(`Source report provider ${JSON.stringify(`${required.name}@${required.version}`)} has no matching explicitly supplied manifest.`)
    }
  }
}

function assertCompatibilityProvider(report: ManifestCompatibilityReport, manifests: ReadonlyArray<DesignSystemManifest>): void {
  const requirements = [
    { name: report.provider.name, version: report.provider.currentVersion },
    ...(report.provider.baselineVersion === undefined
      ? []
      : [{ name: report.provider.name, version: report.provider.baselineVersion }]),
  ]
  assertProviderVersions(requirements, manifests)
}

function assertPolicyProvider(report: DesignSystemPolicyReport, manifests: ReadonlyArray<DesignSystemManifest>): void {
  assertProviderVersions([{ name: report.provider.name, version: report.provider.version }], manifests)
}

function assertMigrationProvider(report: SourceMigrationReport, manifests: ReadonlyArray<DesignSystemManifest>): void {
  assertProviderVersions([
    { name: report.provider.name, version: report.provider.baselineVersion },
    { name: report.provider.name, version: report.provider.currentVersion },
  ], manifests)
}

function resolveReferences(
  references: ReadonlyArray<ReportReference>,
  ownership: DesignSystemOwnership,
  manifests: ReadonlyArray<DesignSystemManifest>,
): ReadonlyArray<OwnershipAttribution> {
  const entityIndex = buildOwnershipEntityIndex(manifests)
  const assignmentIndex = buildOwnershipAssignmentIndex(ownership)
  const attributions = references.map((reference): OwnershipAttribution => {
    if ("unresolvedReason" in reference) {
      return {
        jsonPointer: reference.jsonPointer,
        status: "unresolved",
        reason: reference.unresolvedReason,
      }
    }
    return {
      jsonPointer: reference.jsonPointer,
      ...resolveOwnershipEntity(reference.entityId, ownership, entityIndex, assignmentIndex),
    }
  })
  assertUniqueAttributionPointers(attributions)
  return [...attributions].sort((left, right) => {
    const pointerOrder = compareStrings(left.jsonPointer, right.jsonPointer)
    if (pointerOrder !== 0) return pointerOrder
    const entityOrder = compareStrings(left.entityId ?? "", right.entityId ?? "")
    return entityOrder !== 0 ? entityOrder : compareStrings(left.status, right.status)
  })
}

export function assertUniqueAttributionPointers(attributions: ReadonlyArray<OwnershipAttribution>): void {
  const pointers = new Set<string>()
  for (const attribution of attributions) {
    if (pointers.has(attribution.jsonPointer)) {
      throw new TypeError(`Duplicate ownership attribution JSON Pointer ${JSON.stringify(attribution.jsonPointer)}.`)
    }
    pointers.add(attribution.jsonPointer)
  }
}

function buildAnalysisLimits(
  manifests: ReadonlyArray<DesignSystemManifest>,
  attributions: ReadonlyArray<OwnershipAttribution>,
): ReadonlyArray<OwnershipAnalysisLimit> {
  const limits: OwnershipAnalysisLimit[] = [{ code: "explicit-manifests-only", message: EXPLICIT_MANIFESTS_MESSAGE }]
  if (manifests.some(manifest => manifest.coverage.unresolved.length > 0)) {
    limits.push({ code: "manifest-unresolved-references", message: UNRESOLVED_MANIFEST_MESSAGE })
  }
  if (attributions.some(attribution => attribution.status === "unresolved")) {
    limits.push({ code: "report-subject-unresolved", message: UNRESOLVED_SUBJECT_MESSAGE })
  }
  return limits.sort((left, right) => {
    const codeOrder = compareStrings(left.code, right.code)
    return codeOrder !== 0 ? codeOrder : compareStrings(left.message, right.message)
  })
}

function makeOwnedReport(
  ownership: DesignSystemOwnership,
  manifests: ReadonlyArray<DesignSystemManifest>,
  source: { readonly format: string; readonly schemaVersion: number; readonly data: SupportedSourceReport },
  references: ReadonlyArray<ReportReference>,
): OwnedReport {
  const attributions = resolveReferences(references, ownership, manifests)
  return decodeOwnedReport({
    format: DESIGN_SYSTEM_OWNED_REPORT_FORMAT,
    schemaVersion: DESIGN_SYSTEM_OWNED_REPORT_VERSION,
    source,
    ownership: {
      format: DESIGN_SYSTEM_OWNERSHIP_FORMAT,
      schemaVersion: DESIGN_SYSTEM_OWNERSHIP_VERSION,
    },
    attributions,
    analysisLimits: buildAnalysisLimits(manifests, attributions),
  })
}

function sourceFormat(report: unknown): string | undefined {
  const value = readOwnDataProperty(report, "format")
  return typeof value === "string" ? value : undefined
}

/** Purely annotate a supported, versioned source report against explicit manifests. */
export function annotateDesignSystemReport(input: {
  readonly ownership: DesignSystemOwnership
  readonly manifests: ReadonlyArray<DesignSystemManifest>
  readonly report: SupportedSourceReport
}): OwnedReport {
  const rawOwnership = readOwnDataProperty(input, "ownership")
  const rawManifests = readOwnDataProperty(input, "manifests")
  const rawReport = readOwnDataProperty(input, "report")
  if (!Array.isArray(rawManifests)) throw new TypeError("Ownership annotation requires an explicit manifest array.")
  const manifests = rawManifests as ReadonlyArray<DesignSystemManifest>
  const ownership = decodeDesignSystemOwnership(rawOwnership)
  const reportFormat = sourceFormat(rawReport)

  if (reportFormat === MANIFEST_COMPATIBILITY_REPORT_FORMAT) {
    const report = decodeManifestCompatibilityReport(rawReport)
    assertCompatibilityProvider(report, manifests)
    return makeOwnedReport(ownership, manifests, {
      format: report.format,
      schemaVersion: report.schemaVersion,
      data: report,
    }, adaptCompatibilityReport(report))
  }

  if (reportFormat === DESIGN_SYSTEM_POLICY_REPORT_FORMAT) {
    const report = decodeDesignSystemPolicyReport(rawReport)
    assertPolicyProvider(report, manifests)
    return makeOwnedReport(ownership, manifests, {
      format: report.format,
      schemaVersion: report.schemaVersion,
      data: report,
    }, adaptPolicyReport(report))
  }

  if (reportFormat === SOURCE_MIGRATION_REPORT_FORMAT) {
    const report = decodeSourceMigrationReport(rawReport)
    assertMigrationProvider(report, manifests)
    return makeOwnedReport(ownership, manifests, {
      format: report.format,
      schemaVersion: report.schemaVersion,
      data: report,
    }, adaptMigrationReport(report))
  }

  if (rawReport === undefined) throw new TypeError("Ownership annotation requires a source report.")
  throw new TypeError(`Unsupported ownership source report format ${JSON.stringify(reportFormat ?? "<missing>")}.`)
}
