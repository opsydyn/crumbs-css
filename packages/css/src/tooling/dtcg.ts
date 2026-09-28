/**
 * Opt-in DTCG Format/Resolver import tooling.
 * This entrypoint is intentionally isolated from Crumbs application runtime APIs.
 */
export {
  CRUMBS_DTCG_DIAGNOSTIC_CODES,
  CRUMBS_DTCG_FORMAT_PROFILE,
  CRUMBS_DTCG_IMPORT_FORMAT,
  CRUMBS_DTCG_IMPORT_VERSION,
  CRUMBS_DTCG_METADATA_FORMAT,
  CRUMBS_DTCG_METADATA_VERSION,
  CRUMBS_DTCG_RESOLVER_VERSIONS,
  type CrumbsDtcgDiagnostic,
  type CrumbsDtcgDiagnosticCode,
  type CrumbsDtcgImportRequest,
  type CrumbsDtcgImportResult,
  type CrumbsDtcgResolverVersion,
  type CrumbsDtcgThemeImport,
  type DtcgGroupMetadata,
  type DtcgImportSidecar,
  type DtcgJsonObject,
  type DtcgJsonPrimitive,
  type DtcgJsonValue,
  type DtcgOperationResult,
  type DtcgOrigin,
  type DtcgTokenMetadata,
  type DtcgTokenProvenance,
} from "./dtcg/model"
export { importDtcgTheme } from "./dtcg/import-theme"
