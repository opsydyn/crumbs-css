import * as Schema from "effect/Schema"
import { makeDataCodec } from "../../contracts/data-codec"
import { decodeStyleExplanationReport } from "../../devtools/style-explanation-schema"
import { STYLE_EXPLANATION_REPORT_TYPE, STYLE_EXPLANATION_VERSION } from "../../devtools/style-explanation-model"
import { decodeManifestCompatibilityReport } from "../manifest/comparison-report-schema"
import {
  MANIFEST_COMPATIBILITY_REPORT_FORMAT,
  MANIFEST_COMPATIBILITY_REPORT_VERSION,
} from "../manifest/comparison-report-model"
import { decodeDesignSystemPolicyReport } from "../policy/schema"
import { DESIGN_SYSTEM_POLICY_REPORT_FORMAT, DESIGN_SYSTEM_POLICY_REPORT_VERSION } from "../policy/model"
import { decodeSourceMigrationReport } from "../migrations/schema"
import { SOURCE_MIGRATION_REPORT_FORMAT, SOURCE_MIGRATION_REPORT_VERSION } from "../migrations/model"
import { decodeDtcgImportResult } from "./dtcg-adapter"
import {
  DESIGN_SYSTEM_OWNED_REPORT_FORMAT,
  DESIGN_SYSTEM_OWNED_REPORT_VERSION,
  DESIGN_SYSTEM_OWNERSHIP_FORMAT,
  DESIGN_SYSTEM_OWNERSHIP_VERSION,
  OWNERSHIP_ANALYSIS_LIMIT_CODES,
  OWNERSHIP_UNRESOLVED_REASON_CODES,
  type DesignSystemOwnership,
  type OwnedReport,
  type OwnershipAssignment,
  type OwnershipAttribution,
  type OwnershipAnalysisLimit,
  type OwnershipOwner,
  type SupportedSourceReport,
} from "./model"
import { assertOwnershipReferenceLimit, readOwnArrayLength } from "./resource-limit"

const SafeText = Schema.NonEmptyString.check(Schema.makeFilter<string>(value =>
  value === value.trim() && !/[\u0000-\u001f\u007f-\u009f]/u.test(value)))

const OwnerSchema = Schema.Struct({ id: SafeText, displayName: SafeText })
const AssignmentSchema = Schema.Struct({ entityId: SafeText, ownerId: SafeText })
const OwnershipSchema = Schema.Struct({
  format: Schema.Literal(DESIGN_SYSTEM_OWNERSHIP_FORMAT),
  schemaVersion: Schema.Literal(DESIGN_SYSTEM_OWNERSHIP_VERSION),
  owners: Schema.Array(OwnerSchema),
  assignments: Schema.Array(AssignmentSchema),
})
const ownershipCodec = makeDataCodec("design-system-ownership-v1", OwnershipSchema)

function containsCanonicalNumbers(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && !Object.is(value, -0)
  if (Array.isArray(value)) return value.every(containsCanonicalNumbers)
  if (value === null || typeof value !== "object") return true
  return Object.values(value).every(containsCanonicalNumbers)
}

const CanonicalJson = Schema.Json.check(Schema.makeFilter(value => containsCanonicalNumbers(value)))
const PositiveSafeInteger = Schema.Finite.check(
  Schema.makeFilter<number>(value => Number.isSafeInteger(value) && value > 0),
)
const JsonPointer = Schema.String.check(Schema.makeFilter<string>(value =>
  (value === "" || value.startsWith("/")) && !/[\u0000-\u001f\u007f-\u009f]/u.test(value) && !/~(?![01])/u.test(value)))
const OwnedReportSchema = Schema.Struct({
  format: Schema.Literal(DESIGN_SYSTEM_OWNED_REPORT_FORMAT),
  schemaVersion: Schema.Literal(DESIGN_SYSTEM_OWNED_REPORT_VERSION),
  source: Schema.Struct({ format: SafeText, schemaVersion: PositiveSafeInteger, data: CanonicalJson }),
  ownership: Schema.Struct({
    format: Schema.Literal(DESIGN_SYSTEM_OWNERSHIP_FORMAT),
    schemaVersion: Schema.Literal(DESIGN_SYSTEM_OWNERSHIP_VERSION),
  }),
  attributions: Schema.Array(Schema.Union([
    Schema.Struct({
      jsonPointer: JsonPointer,
      entityId: SafeText,
      status: Schema.Literal("assigned"),
      owner: OwnerSchema,
    }),
    Schema.Struct({
      jsonPointer: JsonPointer,
      entityId: SafeText,
      status: Schema.Literal("unassigned"),
    }),
    Schema.Struct({
      jsonPointer: JsonPointer,
      entityId: Schema.optionalKey(SafeText),
      status: Schema.Literal("unresolved"),
      reason: Schema.Literals(OWNERSHIP_UNRESOLVED_REASON_CODES),
    }),
  ])),
  analysisLimits: Schema.Array(Schema.Struct({
    code: Schema.Literals(OWNERSHIP_ANALYSIS_LIMIT_CODES),
    message: SafeText,
  })),
})
const ownedReportCodec = makeDataCodec("design-system-owned-report-v1", OwnedReportSchema)

function decodeSourceData(source: OwnedReport["source"]): SupportedSourceReport {
  if (source.format === MANIFEST_COMPATIBILITY_REPORT_FORMAT) {
    if (source.schemaVersion !== MANIFEST_COMPATIBILITY_REPORT_VERSION) {
      throw new TypeError("Owned-report source compatibility report descriptor does not match source.data.")
    }
    return decodeManifestCompatibilityReport(source.data)
  }
  if (source.format === DESIGN_SYSTEM_POLICY_REPORT_FORMAT) {
    if (source.schemaVersion !== DESIGN_SYSTEM_POLICY_REPORT_VERSION) {
      throw new TypeError("Owned-report source policy report descriptor does not match source.data.")
    }
    return decodeDesignSystemPolicyReport(source.data)
  }
  if (source.format === SOURCE_MIGRATION_REPORT_FORMAT) {
    if (source.schemaVersion !== SOURCE_MIGRATION_REPORT_VERSION) {
      throw new TypeError("Owned-report source migration report descriptor does not match source.data.")
    }
    return decodeSourceMigrationReport(source.data)
  }
  if (source.format === "crumbs.dtcg-import-result") {
    if (source.schemaVersion !== 1) {
      throw new TypeError("Owned-report source DTCG import result descriptor does not match source.data.")
    }
    return decodeDtcgImportResult(source.data)
  }
  if (source.format === STYLE_EXPLANATION_REPORT_TYPE) {
    if (source.schemaVersion !== STYLE_EXPLANATION_VERSION) {
      throw new TypeError("Owned-report source style explanation descriptor does not match source.data.")
    }
    return decodeStyleExplanationReport(source.data)
  }
  throw new TypeError(`Invalid Crumbs design-system owned report v1: unsupported source format ${JSON.stringify(source.format)}.`)
}

function hasJsonPointerTarget(root: unknown, pointer: string): boolean {
  if (pointer === "") return true
  let current = root
  for (const encodedSegment of pointer.slice(1).split("/")) {
    const segment = encodedSegment.replace(/~1/gu, "/").replace(/~0/gu, "~")
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/u.test(segment)) return false
      const descriptor = Object.getOwnPropertyDescriptor(current, segment)
      if (descriptor === undefined || !("value" in descriptor)) return false
      current = descriptor.value
      continue
    }
    if (typeof current !== "object" || current === null) return false
    const descriptor = Object.getOwnPropertyDescriptor(current, segment)
    if (descriptor === undefined || !("value" in descriptor)) return false
    current = descriptor.value
  }
  return true
}

function decodeError(
  boundary: string,
  issues: ReadonlyArray<{ readonly path: ReadonlyArray<string | number>; readonly message: string }>,
): TypeError {
  const detail = issues.map(issue => {
    const path = issue.path.length === 0 ? "<root>" : issue.path.join(".")
    return `${path}: ${issue.message}`
  }).join("; ")
  return new TypeError(`Invalid ${boundary}: ${detail}`)
}

/** Validate the strict v1 ownership document and return detached plain data. */
export function decodeDesignSystemOwnership(input: unknown): DesignSystemOwnership {
  const decoded = ownershipCodec.decode(input)
  if (!decoded.ok) throw decodeError("Crumbs design-system ownership v1", decoded.issues)

  const ownership = decoded.value as DesignSystemOwnership
  const ownerIds = new Set<string>()
  for (const owner of ownership.owners as ReadonlyArray<OwnershipOwner>) {
    if (ownerIds.has(owner.id)) {
      throw new TypeError(`Invalid Crumbs design-system ownership v1: duplicate owner ID ${JSON.stringify(owner.id)}.`)
    }
    ownerIds.add(owner.id)
  }

  const entityIds = new Set<string>()
  for (const assignment of ownership.assignments as ReadonlyArray<OwnershipAssignment>) {
    if (entityIds.has(assignment.entityId)) {
      throw new TypeError(`Invalid Crumbs design-system ownership v1: duplicate entity assignment ${JSON.stringify(assignment.entityId)}.`)
    }
    entityIds.add(assignment.entityId)
    if (!ownerIds.has(assignment.ownerId)) {
      throw new TypeError(`Invalid Crumbs design-system ownership v1: unknown owner ID ${JSON.stringify(assignment.ownerId)}.`)
    }
  }

  return ownership
}

/** Validate and detach the versioned ownership/report envelope. */
export function decodeOwnedReport(input: unknown): OwnedReport {
  const inputAttributionCount = readOwnArrayLength(input, "attributions")
  if (inputAttributionCount !== undefined) assertOwnershipReferenceLimit(inputAttributionCount)
  const decoded = ownedReportCodec.decode(input)
  if (!decoded.ok) throw decodeError("Crumbs design-system owned report v1", decoded.issues)

  const decodedReport = decoded.value as OwnedReport
  const report: OwnedReport = {
    ...decodedReport,
    source: {
      ...decodedReport.source,
      data: decodeSourceData(decodedReport.source),
    },
  }
  assertOwnershipReferenceLimit(report.attributions.length)
  const pointers = new Set<string>()
  for (const attribution of report.attributions as ReadonlyArray<OwnershipAttribution>) {
    if (pointers.has(attribution.jsonPointer)) {
      throw new TypeError(`Invalid Crumbs design-system owned report v1: duplicate attribution pointer ${JSON.stringify(attribution.jsonPointer)}.`)
    }
    pointers.add(attribution.jsonPointer)
  }

  for (const attribution of report.attributions as ReadonlyArray<OwnershipAttribution>) {
    if (!hasJsonPointerTarget(report.source.data, attribution.jsonPointer)) {
      throw new TypeError(`Invalid Crumbs design-system owned report v1: attribution pointer ${JSON.stringify(attribution.jsonPointer)} does not resolve in source.data.`)
    }
  }

  const limitCodes = new Set<string>()
  for (const limit of report.analysisLimits as ReadonlyArray<OwnershipAnalysisLimit>) {
    if (limitCodes.has(limit.code)) {
      throw new TypeError(`Invalid Crumbs design-system owned report v1: duplicate analysis limit ${JSON.stringify(limit.code)}.`)
    }
    limitCodes.add(limit.code)
  }
  if (!limitCodes.has("explicit-manifests-only")) {
    throw new TypeError("Invalid Crumbs design-system owned report v1: explicit-manifests-only analysis limit is required.")
  }

  return report
}
