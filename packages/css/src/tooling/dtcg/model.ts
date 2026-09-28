import type { ExternalTokenThemePayload } from "../../theme-token"
import type { DesignSystemManifest, ManifestContractIdentity } from "../manifest/model"

export const CRUMBS_DTCG_IMPORT_FORMAT = "crumbs.dtcg-theme-import" as const
export const CRUMBS_DTCG_IMPORT_VERSION = 1 as const
export const CRUMBS_DTCG_METADATA_FORMAT = "crumbs.dtcg-theme-import-metadata" as const
export const CRUMBS_DTCG_METADATA_VERSION = 1 as const
export const CRUMBS_DTCG_FORMAT_PROFILE = "2025.10" as const
export const CRUMBS_DTCG_RESOLVER_VERSIONS = ["2025-10-01", "2025-11-01", "2025.10"] as const

export const CRUMBS_DTCG_DIAGNOSTIC_CODES = [
  "input.invalid",
  "resolver.version-unsupported",
  "resolver.selection-invalid",
  "reference.missing",
  "format.structure-invalid",
  "format.cycle",
  "token.alias-unresolved",
  "token.alias-cycle",
  "token.alias-domain-mismatch",
  "contract.definition-missing",
  "contract.alias-mismatch",
  "token.unmapped",
  "token.type-unsupported",
  "token.domain-invalid",
  "conversion.option-invalid",
  "resource.limit-exceeded",
] as const

export type CrumbsDtcgResolverVersion = typeof CRUMBS_DTCG_RESOLVER_VERSIONS[number]
export type CrumbsDtcgDiagnosticCode = typeof CRUMBS_DTCG_DIAGNOSTIC_CODES[number]

export type DtcgJsonPrimitive = null | string | boolean | number
export type DtcgJsonValue = DtcgJsonPrimitive | ReadonlyArray<DtcgJsonValue> | DtcgJsonObject
export type DtcgJsonObject = { readonly [key: string]: DtcgJsonValue }

export type DtcgOrigin = {
  readonly documentUri: string
  readonly jsonPointer: string
}

export type DtcgTokenMetadata = {
  readonly description?: string
  readonly deprecated?: boolean
  readonly extensions?: DtcgJsonObject
}

export type DtcgGroupMetadata = {
  readonly path: ReadonlyArray<string>
  readonly metadata: DtcgTokenMetadata
}

export type DtcgTokenProvenance = {
  readonly tokenId: string
  readonly path: ReadonlyArray<string>
  readonly visibility: "public" | "private"
  readonly origin: DtcgOrigin
  readonly sourceChain: ReadonlyArray<DtcgOrigin>
  readonly metadata: DtcgTokenMetadata
  readonly groupMetadata: ReadonlyArray<DtcgGroupMetadata>
}

export type DtcgImportSidecar = {
  readonly format: typeof CRUMBS_DTCG_METADATA_FORMAT
  readonly schemaVersion: typeof CRUMBS_DTCG_METADATA_VERSION
  readonly contract: ManifestContractIdentity
  readonly formatProfile: typeof CRUMBS_DTCG_FORMAT_PROFILE
  readonly resolverVersion: CrumbsDtcgResolverVersion
  readonly resolverUri: string
  readonly modifiers: Readonly<Record<string, string>>
  readonly remBasePx?: number
  readonly tokens: ReadonlyArray<DtcgTokenProvenance>
}

export type CrumbsDtcgImportRequest = {
  readonly resolver: DtcgJsonObject
  readonly resolverUri: string
  readonly documents: Readonly<Record<string, DtcgJsonObject>>
  readonly manifest: DesignSystemManifest
  readonly contractIdentity: ManifestContractIdentity
  readonly modifiers?: Readonly<Record<string, string>>
  readonly remBasePx?: number
}

export type CrumbsDtcgDiagnostic = {
  readonly code: CrumbsDtcgDiagnosticCode
  readonly severity: "error" | "warning" | "info"
  readonly message: string
  readonly documentUri?: string
  readonly jsonPointer?: string
  readonly dtcgPath?: ReadonlyArray<string>
  readonly crumbsTokenId?: string
  readonly referenceChain?: ReadonlyArray<string>
}

export type DtcgOperationResult<T> =
  | {
    readonly ok: true
    readonly value: T
    readonly diagnostics: ReadonlyArray<CrumbsDtcgDiagnostic>
  }
  | {
    readonly ok: false
    readonly diagnostics: ReadonlyArray<CrumbsDtcgDiagnostic>
  }

export type CrumbsDtcgThemeImport = {
  readonly format: typeof CRUMBS_DTCG_IMPORT_FORMAT
  readonly schemaVersion: typeof CRUMBS_DTCG_IMPORT_VERSION
  readonly payload: ExternalTokenThemePayload
  readonly sidecar: DtcgImportSidecar
}

export type CrumbsDtcgImportResult = DtcgOperationResult<CrumbsDtcgThemeImport>
