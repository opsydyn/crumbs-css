import { n as ExternalTokenThemePayload } from "./theme-token-5fLFCMug.mjs";
import { c as ManifestContractIdentity, r as DesignSystemManifest } from "./model-C3BKvFKH.mjs";

//#region src/tooling/dtcg/model.d.ts
declare const CRUMBS_DTCG_IMPORT_FORMAT: "crumbs.dtcg-theme-import";
declare const CRUMBS_DTCG_IMPORT_VERSION: 1;
declare const CRUMBS_DTCG_METADATA_FORMAT: "crumbs.dtcg-theme-import-metadata";
declare const CRUMBS_DTCG_METADATA_VERSION: 1;
declare const CRUMBS_DTCG_FORMAT_PROFILE: "2025.10";
declare const CRUMBS_DTCG_RESOLVER_VERSIONS: readonly ["2025-10-01", "2025-11-01", "2025.10"];
declare const CRUMBS_DTCG_DIAGNOSTIC_CODES: readonly ["input.invalid", "resolver.version-unsupported", "resolver.selection-invalid", "reference.missing", "format.structure-invalid", "format.cycle", "token.alias-unresolved", "token.alias-cycle", "token.alias-domain-mismatch", "contract.definition-missing", "contract.alias-mismatch", "token.unmapped", "token.type-unsupported", "token.domain-invalid", "conversion.option-invalid", "resource.limit-exceeded"];
type CrumbsDtcgResolverVersion = typeof CRUMBS_DTCG_RESOLVER_VERSIONS[number];
type CrumbsDtcgDiagnosticCode = typeof CRUMBS_DTCG_DIAGNOSTIC_CODES[number];
type DtcgJsonPrimitive = null | string | boolean | number;
type DtcgJsonValue = DtcgJsonPrimitive | ReadonlyArray<DtcgJsonValue> | DtcgJsonObject;
type DtcgJsonObject = {
  readonly [key: string]: DtcgJsonValue;
};
type DtcgOrigin = {
  readonly documentUri: string;
  readonly jsonPointer: string;
};
type DtcgTokenMetadata = {
  readonly description?: string;
  readonly deprecated?: boolean;
  readonly deprecationMessage?: string;
  readonly extensions?: DtcgJsonObject;
};
type DtcgGroupMetadata = {
  readonly path: ReadonlyArray<string>;
  readonly metadata: DtcgTokenMetadata;
};
type DtcgTokenProvenance = {
  readonly tokenId: string;
  readonly path: ReadonlyArray<string>;
  readonly visibility: "public" | "private";
  readonly origin: DtcgOrigin;
  readonly sourceChain: ReadonlyArray<DtcgOrigin>; /** Resolved DTCG `$value`, retained for audit and optional fallback preservation. */
  readonly sourceValue: DtcgJsonValue;
  readonly metadata: DtcgTokenMetadata;
  readonly groupMetadata: ReadonlyArray<DtcgGroupMetadata>;
};
type DtcgImportSidecar = {
  readonly format: typeof CRUMBS_DTCG_METADATA_FORMAT;
  readonly schemaVersion: typeof CRUMBS_DTCG_METADATA_VERSION;
  readonly contract: ManifestContractIdentity;
  readonly formatProfile: typeof CRUMBS_DTCG_FORMAT_PROFILE;
  readonly resolverVersion: CrumbsDtcgResolverVersion;
  readonly resolverUri: string;
  readonly modifiers: Readonly<Record<string, string>>;
  readonly remBasePx?: number;
  readonly tokens: ReadonlyArray<DtcgTokenProvenance>;
};
type CrumbsDtcgImportRequest = {
  readonly resolver: DtcgJsonObject;
  readonly resolverUri: string;
  readonly documents: Readonly<Record<string, DtcgJsonObject>>;
  readonly manifest: DesignSystemManifest;
  readonly contractIdentity: ManifestContractIdentity;
  readonly modifiers?: Readonly<Record<string, string>>;
  readonly remBasePx?: number;
};
type CrumbsDtcgDiagnostic = {
  readonly code: CrumbsDtcgDiagnosticCode;
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
  readonly documentUri?: string;
  readonly jsonPointer?: string;
  readonly dtcgPath?: ReadonlyArray<string>;
  readonly crumbsTokenId?: string;
  readonly referenceChain?: ReadonlyArray<string>;
};
type DtcgOperationResult<T> = {
  readonly ok: true;
  readonly value: T;
  readonly diagnostics: ReadonlyArray<CrumbsDtcgDiagnostic>;
} | {
  readonly ok: false;
  readonly diagnostics: ReadonlyArray<CrumbsDtcgDiagnostic>;
};
type CrumbsDtcgThemeImport = {
  readonly format: typeof CRUMBS_DTCG_IMPORT_FORMAT;
  readonly schemaVersion: typeof CRUMBS_DTCG_IMPORT_VERSION;
  readonly payload: ExternalTokenThemePayload;
  readonly sidecar: DtcgImportSidecar;
};
type CrumbsDtcgImportResult = DtcgOperationResult<CrumbsDtcgThemeImport>;
//#endregion
export { DtcgTokenProvenance as S, DtcgJsonPrimitive as _, CRUMBS_DTCG_METADATA_FORMAT as a, DtcgOrigin as b, CrumbsDtcgDiagnostic as c, CrumbsDtcgImportResult as d, CrumbsDtcgResolverVersion as f, DtcgJsonObject as g, DtcgImportSidecar as h, CRUMBS_DTCG_IMPORT_VERSION as i, CrumbsDtcgDiagnosticCode as l, DtcgGroupMetadata as m, CRUMBS_DTCG_FORMAT_PROFILE as n, CRUMBS_DTCG_METADATA_VERSION as o, CrumbsDtcgThemeImport as p, CRUMBS_DTCG_IMPORT_FORMAT as r, CRUMBS_DTCG_RESOLVER_VERSIONS as s, CRUMBS_DTCG_DIAGNOSTIC_CODES as t, CrumbsDtcgImportRequest as u, DtcgJsonValue as v, DtcgTokenMetadata as x, DtcgOperationResult as y };