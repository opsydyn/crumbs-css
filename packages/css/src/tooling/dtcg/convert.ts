import type { ExternalTokenThemePayload } from "../../theme-token"
import type {
  DesignSystemManifest,
  ManifestContractIdentity,
  ManifestToken,
  ManifestTokenDomain,
} from "../manifest/model"
import {
  CRUMBS_DTCG_FORMAT_PROFILE,
  CRUMBS_DTCG_IMPORT_FORMAT,
  CRUMBS_DTCG_IMPORT_VERSION,
  CRUMBS_DTCG_METADATA_FORMAT,
  CRUMBS_DTCG_METADATA_VERSION,
  type CrumbsDtcgDiagnostic,
  type CrumbsDtcgResolverVersion,
  type CrumbsDtcgThemeImport,
  type DtcgJsonObject,
  type DtcgJsonValue,
  type DtcgOperationResult,
  type DtcgOrigin,
  type DtcgTokenProvenance,
} from "./model"
import type { DtcgResolvedToken, DtcgResolvedTokenIndex } from "./format"

export type DtcgConversionOptions = {
  readonly resolverUri: string
  readonly resolverVersion: CrumbsDtcgResolverVersion
  readonly modifiers: Readonly<Record<string, string>>
  readonly remBasePx?: number
}

type ConvertedValue = { readonly ok: true; readonly value: string | number } | {
  readonly ok: false
  readonly code: "token.type-unsupported" | "token.domain-invalid" | "conversion.option-invalid"
  readonly message: string
}
type RecordValue = Record<string, DtcgJsonValue>
type ConversionDiagnostic = CrumbsDtcgDiagnostic

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function pathKey(path: ReadonlyArray<string>): string {
  return JSON.stringify(path)
}

function pathLabel(path: ReadonlyArray<string>): string {
  return path.join(".")
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function canonicalJson(value: DtcgJsonValue): DtcgJsonValue {
  if (Array.isArray(value)) return value.map(canonicalJson)
  if (!isRecord(value)) return value
  return Object.fromEntries(Object.keys(value).sort(compareText).map(key => [key, canonicalJson(value[key]!)]))
}

function canonicalMetadata(metadata: DtcgTokenProvenance["metadata"]): DtcgTokenProvenance["metadata"] {
  return {
    ...(metadata.description === undefined ? {} : { description: metadata.description }),
    ...(metadata.deprecated === undefined ? {} : { deprecated: metadata.deprecated }),
    ...(metadata.deprecationMessage === undefined ? {} : { deprecationMessage: metadata.deprecationMessage }),
    ...(metadata.extensions === undefined ? {} : { extensions: canonicalJson(metadata.extensions) as DtcgJsonObject }),
  }
}

function hasOnlyKeys(value: RecordValue, allowed: ReadonlyArray<string>): boolean {
  const keys = new Set(allowed)
  return Reflect.ownKeys(value).every(key => typeof key === "string" && keys.has(key))
}

function sameIdentity(left: ManifestContractIdentity, right: ManifestContractIdentity): boolean {
  return left.owner === right.owner && left.name === right.name && left.version === right.version
}

function contractRootId(identity: ManifestContractIdentity): string {
  return `${identity.owner}#${identity.name}@${identity.version}`
}

function failure<T>(diagnostic: ConversionDiagnostic): DtcgOperationResult<T> {
  return { ok: false, diagnostics: [diagnostic] }
}

function makeDiagnostic(
  code: CrumbsDtcgDiagnostic["code"],
  message: string,
  token?: DtcgResolvedToken,
  tokenId?: string,
  severity: CrumbsDtcgDiagnostic["severity"] = "error",
): CrumbsDtcgDiagnostic {
  return {
    code,
    severity,
    message,
    ...(token === undefined ? {} : {
      documentUri: token.origin.documentUri,
      jsonPointer: token.origin.jsonPointer,
      dtcgPath: [...token.path],
    }),
    ...(tokenId === undefined ? {} : { crumbsTokenId: tokenId }),
  }
}

function sortDiagnostics(diagnostics: ReadonlyArray<CrumbsDtcgDiagnostic>): ReadonlyArray<CrumbsDtcgDiagnostic> {
  return [...diagnostics].sort((left, right) =>
    compareText(left.documentUri ?? "", right.documentUri ?? "")
    || compareText(left.jsonPointer ?? "", right.jsonPointer ?? "")
    || compareText(left.code, right.code)
    || compareText(left.crumbsTokenId ?? "", right.crumbsTokenId ?? "")
    || compareText(JSON.stringify(left.dtcgPath ?? []), JSON.stringify(right.dtcgPath ?? [])))
}

function invalidDomain(message: string): ConvertedValue {
  return { ok: false, code: "token.domain-invalid", message }
}

function colorValue(value: DtcgJsonValue): ConvertedValue {
  if (!isRecord(value) || !hasOnlyKeys(value, ["colorSpace", "components", "alpha", "hex"])) {
    return invalidDomain("DTCG color value must contain only colorSpace, components, alpha, and hex.")
  }
  if (value.colorSpace !== "srgb") {
    return invalidDomain("Only normalized sRGB DTCG colors can be converted.")
  }
  if (!Array.isArray(value.components) || value.components.length !== 3
    || value.components.some(component => typeof component !== "number" || !Number.isFinite(component) || component < 0 || component > 1)) {
    return invalidDomain("sRGB color components must be three finite numbers in the closed unit interval.")
  }
  if (Object.hasOwn(value, "alpha") && (typeof value.alpha !== "number" || !Number.isFinite(value.alpha) || value.alpha < 0 || value.alpha > 1)) {
    return invalidDomain("DTCG color alpha must be a finite number in the closed unit interval.")
  }
  if (Object.hasOwn(value, "hex") && (typeof value.hex !== "string" || !/^#[\da-fA-F]{6}$/u.test(value.hex))) {
    return invalidDomain("DTCG color hex fallback must use six-digit CSS hex notation.")
  }
  const channels = value.components.map(component => Math.round((component as number) * 255))
  const alpha = Object.hasOwn(value, "alpha") ? value.alpha as number : 1
  return {
    ok: true,
    value: alpha === 1
      ? `rgb(${channels.join(", ")})`
      : `rgba(${channels.join(", ")}, ${String(alpha)})`,
  }
}

function dimensionValue(
  value: DtcgJsonValue,
  domain: Extract<ManifestTokenDomain, { readonly kind: "length" }>,
  remBasePx: number | undefined,
): ConvertedValue {
  if (!isRecord(value) || !hasOnlyKeys(value, ["value", "unit"])
    || typeof value.value !== "number" || !Number.isFinite(value.value)
    || (value.unit !== "px" && value.unit !== "rem")) {
    return invalidDomain("DTCG dimension must contain a finite value and use px or rem.")
  }
  if (value.unit === "rem" && (remBasePx === undefined || !Number.isFinite(remBasePx) || remBasePx <= 0)) {
    return {
      ok: false,
      code: "conversion.option-invalid",
      message: "A positive finite remBasePx is required to convert rem dimensions.",
    }
  }
  const converted = value.unit === "px" ? value.value : value.value * remBasePx!
  if (!Number.isFinite(converted)) return invalidDomain("Converted DTCG dimension is not finite.")
  if (!domain.allowNegative && converted < 0) return invalidDomain("Converted length is negative but the Crumbs token domain disallows negative values.")
  return { ok: true, value: converted }
}

function durationValue(value: DtcgJsonValue): ConvertedValue {
  if (!isRecord(value) || !hasOnlyKeys(value, ["value", "unit"])
    || typeof value.value !== "number" || !Number.isFinite(value.value)
    || (value.unit !== "ms" && value.unit !== "s")) {
    return invalidDomain("DTCG duration must contain a finite value and use ms or s.")
  }
  const milliseconds = value.unit === "ms" ? value.value : value.value * 1000
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return invalidDomain("Converted DTCG duration must be finite and non-negative.")
  }
  return { ok: true, value: milliseconds }
}

function convertValue(
  token: DtcgResolvedToken,
  domain: ManifestTokenDomain,
  remBasePx: number | undefined,
): ConvertedValue {
  switch (token.type) {
    case "color":
      return domain.kind === "color" ? colorValue(token.value) : invalidDomain("DTCG color does not match the Crumbs token domain.")
    case "dimension":
      return domain.kind === "length"
        ? dimensionValue(token.value, domain, remBasePx)
        : invalidDomain("DTCG dimension does not match the Crumbs token domain.")
    case "duration":
      return domain.kind === "duration"
        ? durationValue(token.value)
        : invalidDomain("DTCG duration does not match the Crumbs token domain.")
    case "number":
      if (domain.kind !== "opacity") {
        return { ok: false, code: "token.type-unsupported", message: `DTCG number has no approved mapping to the Crumbs ${domain.kind} domain; generic numbers map only to opacity.` }
      }
      return typeof token.value === "number" && Number.isFinite(token.value) && token.value >= 0 && token.value <= 1
        ? { ok: true, value: token.value }
        : invalidDomain("DTCG opacity number must be finite and in the closed unit interval.")
    case "fontFamily":
    case "strokeStyle":
      if (domain.kind !== "enum") return invalidDomain(`DTCG ${token.type} does not match the Crumbs token domain.`)
      return typeof token.value === "string" && domain.values.includes(token.value)
        ? { ok: true, value: token.value }
        : invalidDomain(`DTCG ${token.type} must be one exact string member of the Crumbs enum domain.`)
    default:
      return {
        ok: false,
        code: "token.type-unsupported",
        message: `DTCG token type ${JSON.stringify(token.type)} is not supported for the Crumbs ${domain.kind} domain by the native conversion matrix.`,
      }
  }
}

function copyProvenance(token: DtcgResolvedToken, manifestToken: ManifestToken): DtcgTokenProvenance {
  return {
    tokenId: manifestToken.id,
    path: [...manifestToken.path],
    visibility: manifestToken.visibility,
    origin: { ...token.origin },
    sourceChain: token.sourceChain.map(origin => ({ ...origin })),
    sourceValue: canonicalJson(token.value),
    metadata: canonicalMetadata(token.metadata),
    groupMetadata: token.groupMetadata.map(group => ({ path: [...group.path], metadata: canonicalMetadata(group.metadata) })),
  }
}

function sortedRecord(values: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(values).sort(([left], [right]) => compareText(left, right)))
}

/** Match a validated manifest contract and convert its complete definition set without I/O. */
export function convertDtcgTokenIndex(
  manifest: DesignSystemManifest,
  contractIdentity: ManifestContractIdentity,
  tokenIndex: DtcgResolvedTokenIndex,
  options: DtcgConversionOptions,
): DtcgOperationResult<CrumbsDtcgThemeImport> {
  const diagnostics: Array<CrumbsDtcgDiagnostic> = []
  const rootId = contractRootId(contractIdentity)
  const matchingRoots = manifest.coverage.roots.filter(root => root.kind === "token-contract" && root.id === rootId)
  if (matchingRoots.length !== 1) {
    return failure(makeDiagnostic(
      "contract.definition-missing",
      "The manifest does not contain one unambiguous token-contract identity matching the requested contract.",
    ))
  }

  const contractTokens = manifest.tokens
    .filter(token => sameIdentity(token.contract, contractIdentity))
    .sort((left, right) => compareText(left.id, right.id))
  const contractTokensByPath = new Map<string, Array<ManifestToken>>()
  for (const token of contractTokens) {
    const key = pathKey(token.path)
    const previous = contractTokensByPath.get(key) ?? []
    previous.push(token)
    contractTokensByPath.set(key, previous)
  }
  const tokenByPath = new Map<string, DtcgResolvedToken>()
  for (const token of tokenIndex.values()) {
    const key = pathKey(token.path)
    if (tokenByPath.has(key)) {
      diagnostics.push(makeDiagnostic("input.invalid", "Resolved DTCG token index contains a duplicate exact path.", token))
    } else {
      tokenByPath.set(key, token)
    }
  }

  const values = new Map<string, string | number>()
  const targetPathKeys = new Set(contractTokens.map(token => pathKey(token.path)))
  const matchedTokens = new Map<string, DtcgTokenProvenance>()
  const requiredTokens = new Map<string, DtcgResolvedToken>()

  for (const token of contractTokens) {
    const key = pathKey(token.path)
    if ((contractTokensByPath.get(key)?.length ?? 0) > 1) {
      diagnostics.push(makeDiagnostic(
        "contract.definition-missing",
        `Manifest token path ${JSON.stringify(token.path)} is ambiguous within the selected contract.`,
        tokenByPath.get(key),
        token.id,
      ))
      continue
    }
    const resolved = tokenByPath.get(key)
    if (resolved !== undefined) matchedTokens.set(token.id, copyProvenance(resolved, token))
    if (token.kind === "alias") {
      if (resolved !== undefined && (resolved.aliasTargetPath === undefined
        || !samePath(resolved.aliasTargetPath, token.alias!.targetPath))) {
        diagnostics.push({
          ...makeDiagnostic(
            "contract.alias-mismatch",
            "DTCG token at a Crumbs alias path must reference the manifest alias target path.",
            resolved,
            token.id,
          ),
          referenceChain: [
            pathLabel(token.path),
            ...(resolved.aliasTargetPath === undefined ? ["<no DTCG token target>"] : [pathLabel(resolved.aliasTargetPath)]),
            pathLabel(token.alias!.targetPath),
          ],
        })
      }
      continue
    }
    if (resolved === undefined) {
      diagnostics.push({
        ...makeDiagnostic(
          "contract.definition-missing",
          `DTCG token value is missing for Crumbs definition ${JSON.stringify(token.id)}.`,
          undefined,
          token.id,
        ),
        dtcgPath: [...token.path],
      })
      continue
    }
    requiredTokens.set(key, resolved)
    const converted = convertValue(resolved, token.domain, options.remBasePx)
    if (!converted.ok) {
      diagnostics.push(makeDiagnostic(converted.code, converted.message, resolved, token.id))
      continue
    }
    values.set(token.id, converted.value)
  }

  if (options.remBasePx !== undefined && (!Number.isFinite(options.remBasePx) || options.remBasePx <= 0)
    && !diagnostics.some(item => item.code === "conversion.option-invalid")) {
    diagnostics.push(makeDiagnostic(
      "conversion.option-invalid",
      "remBasePx must be a positive finite number when supplied.",
    ))
  }

  const neededByAlias = new Set<string>()
  const pending = [...requiredTokens.values()]
  while (pending.length > 0) {
    const current = pending.pop()!
    const targetPath = current.aliasTargetPath
    if (targetPath === undefined) continue
    const targetKey = pathKey(targetPath)
    if (neededByAlias.has(targetKey)) continue
    neededByAlias.add(targetKey)
    const target = tokenByPath.get(targetKey)
    if (target !== undefined) pending.push(target)
  }

  const orderedResolved = [...tokenByPath.entries()].sort(([left], [right]) => compareText(left, right))
  for (const [key, token] of orderedResolved) {
    if (targetPathKeys.has(key) || neededByAlias.has(key)) continue
    diagnostics.push(makeDiagnostic(
      "token.unmapped",
      `DTCG token path ${JSON.stringify(token.path)} is not mapped to the selected Crumbs contract.`,
      token,
      undefined,
      "info",
    ))
  }

  const orderedDiagnostics = sortDiagnostics(diagnostics)
  if (orderedDiagnostics.some(item => item.severity === "error")) {
    return { ok: false, diagnostics: orderedDiagnostics }
  }

  const payload: ExternalTokenThemePayload = {
    _tag: "CrumbsTokenTheme",
    version: 1,
    contract: {
      owner: contractIdentity.owner,
      name: contractIdentity.name,
      version: contractIdentity.version,
    },
    values: Object.fromEntries([...values.entries()].sort(([left], [right]) => compareText(left, right))),
  }
  const sidecar: CrumbsDtcgThemeImport["sidecar"] = {
    format: CRUMBS_DTCG_METADATA_FORMAT,
    schemaVersion: CRUMBS_DTCG_METADATA_VERSION,
    contract: { ...contractIdentity },
    formatProfile: CRUMBS_DTCG_FORMAT_PROFILE,
    resolverVersion: options.resolverVersion,
    resolverUri: options.resolverUri,
    modifiers: sortedRecord(options.modifiers),
    ...(options.remBasePx === undefined ? {} : { remBasePx: options.remBasePx }),
    tokens: [...matchedTokens.entries()].sort(([left], [right]) => compareText(left, right)).map(([, token]) => token),
  }
  return {
    ok: true,
    value: {
      format: CRUMBS_DTCG_IMPORT_FORMAT,
      schemaVersion: CRUMBS_DTCG_IMPORT_VERSION,
      payload,
      sidecar,
    },
    diagnostics: orderedDiagnostics,
  }
}

function samePath(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
  return left.length === right.length && left.every((segment, index) => segment === right[index])
}
