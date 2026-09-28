import { indexDtcgDocuments } from "./documents"
import { resolveDtcgTokenIndex } from "./format"
import type { CrumbsDtcgImportRequest, CrumbsDtcgImportResult } from "./model"
import { selectDtcgSources } from "./resolver"
import { decodeDtcgImportRequest } from "./schema"
import { convertDtcgTokenIndex } from "./convert"

/** Synchronously import one explicitly supplied DTCG Resolver/document snapshot into a Crumbs theme payload. */
export function importDtcgTheme(input: CrumbsDtcgImportRequest): CrumbsDtcgImportResult {
  const decoded = decodeDtcgImportRequest(input)
  if (!decoded.ok) return decoded
  const request = decoded.value

  const documents = indexDtcgDocuments(request.documents)
  if (!documents.ok) return documents

  const selection = selectDtcgSources(request.resolver, request.resolverUri, documents.value, request.modifiers)
  if (!selection.ok) return selection

  // Inline Resolver sources use pointers into the Resolver snapshot itself.
  const canonicalResolverUri = new URL(request.resolverUri).href
  const formatDocuments = new Map(documents.value)
  formatDocuments.set(canonicalResolverUri, request.resolver)
  const tokenIndex = resolveDtcgTokenIndex(selection.value, formatDocuments)
  if (!tokenIndex.ok) return tokenIndex

  return convertDtcgTokenIndex(request.manifest, request.contractIdentity, tokenIndex.value, {
    resolverUri: canonicalResolverUri,
    resolverVersion: selection.value.resolverVersion,
    modifiers: selection.value.selectedModifiers,
    ...(request.remBasePx === undefined ? {} : { remBasePx: request.remBasePx }),
  })
}
