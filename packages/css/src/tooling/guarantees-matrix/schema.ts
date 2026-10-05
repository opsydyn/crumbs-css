import * as Schema from "effect/Schema"
import { makeDataCodec, type ContractIssue } from "../../contracts/data-codec"

export const GUARANTEES_MATRIX_FORMAT = "crumbs.guarantees-matrix" as const
export const GUARANTEES_MATRIX_VERSION = 1 as const

export const GUARANTEES_DOMAINS = [
  "compatibility",
  "property",
  "type-editor",
  "package-runtime",
  "documentation",
  "visual",
  "device",
] as const

export const SUPPORT_STATUSES = ["supported", "conditional", "unsupported", "unspecified"] as const
export const MEASUREMENT_STATUSES = ["passed", "failed", "not-run", "not-calibrated", "stale", "not-applicable"] as const

export type GuaranteesDomain = typeof GUARANTEES_DOMAINS[number]
export type GuaranteesSupportStatus = typeof SUPPORT_STATUSES[number]
export type GuaranteesMeasurementStatus = typeof MEASUREMENT_STATUSES[number]

const NonEmptyText = Schema.NonEmptyString.check(Schema.makeFilter<string>(value => value.trim().length > 0))
const Identifier = NonEmptyText.check(Schema.isPattern(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u))
const Sha256 = Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/u))
const Revision = Schema.String.check(Schema.isPattern(/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u))
const DomainSchema = Schema.Literals(GUARANTEES_DOMAINS)
const SupportStatusSchema = Schema.Literals(SUPPORT_STATUSES)
const MeasurementStatusSchema = Schema.Literals(MEASUREMENT_STATUSES)

const EnvironmentSchema = Schema.Struct({
  name: NonEmptyText,
  versions: Schema.Record(Identifier, NonEmptyText).check(
    Schema.makeFilter<Readonly<Record<string, string>>>(versions => Object.keys(versions).length > 0),
  ),
})

const BasisReferenceSchema = Schema.Struct({
  path: NonEmptyText,
  role: Schema.Literals(["contract", "policy", "test", "scope"]),
})

const EvidenceSchema = Schema.Struct({
  path: NonEmptyText,
  sha256: Sha256,
  sourceRevision: Revision,
  sourceDigest: Schema.optional(Sha256),
  command: NonEmptyText,
  environment: EnvironmentSchema,
  resultStatus: Schema.Literals(["passed", "failed"]),
  result: NonEmptyText,
  scopeLimit: NonEmptyText,
})

const BudgetSchema = Schema.Struct({
  metricId: Identifier,
  thresholdStatus: Schema.Literals(["approved", "pending-review"]),
})

const RowSchema = Schema.Struct({
  id: Identifier,
  domain: DomainSchema,
  claim: NonEmptyText,
  supportStatus: SupportStatusSchema,
  measurementStatus: MeasurementStatusSchema,
  measurementNote: Schema.optionalKey(NonEmptyText),
  basis: Schema.Array(BasisReferenceSchema).check(Schema.isMinLength(1)),
  evidence: Schema.Array(EvidenceSchema),
  budget: Schema.optionalKey(BudgetSchema),
})

export const guaranteesMatrixSchema = Schema.Struct({
  format: Schema.Literal(GUARANTEES_MATRIX_FORMAT),
  schemaVersion: Schema.Literal(GUARANTEES_MATRIX_VERSION),
  rows: Schema.Array(RowSchema).check(Schema.isMinLength(1)),
})

export type GuaranteesMatrix = typeof guaranteesMatrixSchema.Type
export type GuaranteesMatrixRow = GuaranteesMatrix["rows"][number]
export type GuaranteesBasisReference = GuaranteesMatrixRow["basis"][number]
export type GuaranteesEvidence = GuaranteesMatrixRow["evidence"][number]
export type GuaranteesMatrixIssue = {
  readonly code: string
  readonly message: string
  readonly path?: string
}

const matrixCodec = makeDataCodec("crumbs-guarantees-matrix-v1", guaranteesMatrixSchema)

function formatIssue(issue: ContractIssue): string {
  const path = issue.path.length === 0 ? "<root>" : issue.path.join(".")
  return `${path}: ${issue.message}`
}

/** Decode the strict, versioned JSON wire contract and detach it from its input. */
export function decodeGuaranteesMatrix(input: unknown): GuaranteesMatrix {
  const result = matrixCodec.decode(input)
  if (result.ok) return result.value
  throw new TypeError(`Invalid Crumbs guarantees matrix v1: ${result.issues.map(formatIssue).join("; ")}`)
}
