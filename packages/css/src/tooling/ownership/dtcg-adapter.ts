import * as Schema from "effect/Schema"
import { makeDataCodec } from "../../contracts/data-codec"
import { ContractIdentitySchema } from "../../contracts/payloads"
import type { DesignSystemManifest } from "../manifest/model"
import {
  CRUMBS_DTCG_DIAGNOSTIC_CODES,
  CRUMBS_DTCG_FORMAT_PROFILE,
  CRUMBS_DTCG_IMPORT_FORMAT,
  CRUMBS_DTCG_IMPORT_VERSION,
  CRUMBS_DTCG_METADATA_FORMAT,
  CRUMBS_DTCG_METADATA_VERSION,
  CRUMBS_DTCG_RESOLVER_VERSIONS,
  type CrumbsDtcgImportResult,
} from "../dtcg/model"
import { assertOwnershipReferenceLimit, readOwnArrayLength, readOwnDataField } from "./resource-limit"
import type { ReportReference } from "./report-adapters"

const NonEmptyText = Schema.NonEmptyString
const CanonicalNumber = Schema.Finite.check(Schema.makeFilter<number>(value => !Object.is(value, -0)))
const Origin = Schema.Struct({ documentUri: NonEmptyText, jsonPointer: Schema.String })
const JsonRecord = Schema.Record(Schema.String, Schema.Json)
const TokenMetadata = Schema.Struct({
  description: Schema.optionalKey(Schema.String),
  deprecated: Schema.optionalKey(Schema.Boolean),
  deprecationMessage: Schema.optionalKey(Schema.String),
  extensions: Schema.optionalKey(JsonRecord),
})
const GroupMetadata = Schema.Struct({ path: Schema.Array(NonEmptyText), metadata: TokenMetadata })
const TokenProvenance = Schema.Struct({
  tokenId: NonEmptyText,
  path: Schema.Array(NonEmptyText),
  visibility: Schema.Literals(["public", "private"]),
  origin: Origin,
  sourceChain: Schema.Array(Origin),
  sourceValue: Schema.Json,
  metadata: TokenMetadata,
  groupMetadata: Schema.Array(GroupMetadata),
})
const Sidecar = Schema.Struct({
  format: Schema.Literal(CRUMBS_DTCG_METADATA_FORMAT),
  schemaVersion: Schema.Literal(CRUMBS_DTCG_METADATA_VERSION),
  contract: ContractIdentitySchema,
  formatProfile: Schema.Literal(CRUMBS_DTCG_FORMAT_PROFILE),
  resolverVersion: Schema.Literals(CRUMBS_DTCG_RESOLVER_VERSIONS),
  resolverUri: NonEmptyText,
  modifiers: Schema.Record(Schema.String, Schema.String),
  remBasePx: Schema.optionalKey(CanonicalNumber.check(Schema.isGreaterThan(0))),
  tokens: Schema.Array(TokenProvenance),
})
const ThemeImport = Schema.Struct({
  format: Schema.Literal(CRUMBS_DTCG_IMPORT_FORMAT),
  schemaVersion: Schema.Literal(CRUMBS_DTCG_IMPORT_VERSION),
  payload: Schema.Struct({
    _tag: Schema.Literal("CrumbsTokenTheme"),
    version: Schema.Literal(1),
    contract: ContractIdentitySchema,
    values: Schema.Record(Schema.String, Schema.Union([Schema.String, CanonicalNumber])),
  }),
  sidecar: Sidecar,
})
const Diagnostic = Schema.Struct({
  code: Schema.Literals(CRUMBS_DTCG_DIAGNOSTIC_CODES),
  severity: Schema.Literals(["error", "warning", "info"]),
  message: NonEmptyText,
  documentUri: Schema.optionalKey(Schema.String),
  jsonPointer: Schema.optionalKey(Schema.String),
  dtcgPath: Schema.optionalKey(Schema.Array(Schema.String)),
  crumbsTokenId: Schema.optionalKey(NonEmptyText),
  referenceChain: Schema.optionalKey(Schema.Array(Schema.String)),
})
const DtcgImportResultSchema = Schema.Union([
  Schema.Struct({ ok: Schema.Literal(true), value: ThemeImport, diagnostics: Schema.Array(Diagnostic) }),
  Schema.Struct({ ok: Schema.Literal(false), diagnostics: Schema.Array(Diagnostic) }),
])
const dtcgImportResultCodec = makeDataCodec("ownership-dtcg-import-result-v1", DtcgImportResultSchema)

function preflightReferenceCount(input: unknown): number | undefined {
  const ok = readOwnDataField(input, "ok")
  let count = readOwnArrayLength(input, "diagnostics")
  if (ok === true) {
    const value = readOwnDataField(input, "value")
    const sidecar = readOwnDataField(value, "sidecar")
    const tokenCount = readOwnArrayLength(sidecar, "tokens")
    if (tokenCount !== undefined) count = (count ?? 0) + tokenCount
  }
  return count
}

function decodeError(issues: ReadonlyArray<{ readonly path: ReadonlyArray<string | number>; readonly message: string }>): TypeError {
  const detail = issues.map(issue => {
    const path = issue.path.length === 0 ? "<root>" : issue.path.join(".")
    return `${path}: ${issue.message}`
  }).join("; ")
  return new TypeError(`Invalid Crumbs DTCG import result v1: ${detail}`)
}

function sameContract(left: { readonly owner: string; readonly name: string; readonly version: number }, right: { readonly owner: string; readonly name: string; readonly version: number }): boolean {
  return left.owner === right.owner && left.name === right.name && left.version === right.version
}

function assertCoveredContract(
  contract: { readonly owner: string; readonly name: string; readonly version: number },
  manifests: ReadonlyArray<DesignSystemManifest>,
): void {
  const contractId = `${contract.owner}#${contract.name}@${contract.version}`
  if (!manifests.some(manifest => manifest.coverage.roots.some(root => root.kind === "token-contract" && root.id === contractId))) {
    throw new TypeError(`DTCG sidecar contract ${JSON.stringify(contractId)} has no matching explicitly supplied manifest coverage root.`)
  }
}

function diagnosticReferences(report: CrumbsDtcgImportResult): ReadonlyArray<ReportReference> {
  return report.diagnostics.map((diagnostic, index): ReportReference => diagnostic.crumbsTokenId === undefined
    ? { jsonPointer: `/diagnostics/${index}`, unresolvedReason: "stable-id-unavailable" }
    : { jsonPointer: `/diagnostics/${index}/crumbsTokenId`, entityId: diagnostic.crumbsTokenId })
}

/** Validate a DTCG operation result and extract exact token/diagnostic references. */
export function decodeDtcgImportResult(input: unknown): CrumbsDtcgImportResult {
  const inputReferenceCount = preflightReferenceCount(input)
  if (inputReferenceCount !== undefined) assertOwnershipReferenceLimit(inputReferenceCount)
  const decoded = dtcgImportResultCodec.decode(input)
  if (!decoded.ok) throw decodeError(decoded.issues)
  const report = decoded.value as CrumbsDtcgImportResult
  if (report.ok) {
    const { payload, sidecar } = report.value
    if (!sameContract(payload.contract, sidecar.contract)) {
      throw new TypeError("DTCG payload contract does not match its sidecar contract.")
    }
    const tokenIds = new Set<string>()
    for (const token of sidecar.tokens) {
      if (tokenIds.has(token.tokenId)) {
        throw new TypeError(`DTCG sidecar contains duplicate token ID ${JSON.stringify(token.tokenId)}.`)
      }
      tokenIds.add(token.tokenId)
    }
    for (const tokenId of Object.keys(payload.values)) {
      if (!tokenIds.has(tokenId)) {
        throw new TypeError(`DTCG payload token ID ${JSON.stringify(tokenId)} has no sidecar provenance record.`)
      }
    }
  }
  return report
}

export function adaptDtcgImportResult(input: unknown, manifests: ReadonlyArray<DesignSystemManifest>): {
  readonly format: "crumbs.dtcg-import-result"
  readonly schemaVersion: 1
  readonly data: CrumbsDtcgImportResult
  readonly references: ReadonlyArray<ReportReference>
} {
  const report = decodeDtcgImportResult(input)
  const tokenCount = report.ok ? report.value.sidecar.tokens.length : 0
  assertOwnershipReferenceLimit(tokenCount + report.diagnostics.length)

  const references: ReportReference[] = []
  if (report.ok) {
    const { sidecar } = report.value
    assertCoveredContract(sidecar.contract, manifests)
    for (const [index, token] of sidecar.tokens.entries()) {
      references.push({ jsonPointer: `/value/sidecar/tokens/${index}/tokenId`, entityId: token.tokenId })
    }
  }
  references.push(...diagnosticReferences(report))
  return {
    format: "crumbs.dtcg-import-result",
    schemaVersion: 1,
    data: report,
    references,
  }
}
