import {
  type CrumbsDtcgDiagnostic,
  type DtcgGroupMetadata,
  type DtcgJsonObject,
  type DtcgJsonValue,
  type DtcgOperationResult,
  type DtcgOrigin,
  type DtcgTokenMetadata,
} from "./model"
import { resolveDtcgReference } from "./documents"
import { decodeDtcgFormatSource } from "./schema"
import type { DtcgSourceSelection } from "./resolver"

const MAX_FORMAT_NODES = 100_000
const MAX_FORMAT_GRAPH_DEPTH = 256

export type DtcgResolvedToken = {
  readonly path: ReadonlyArray<string>
  readonly value: DtcgJsonValue
  readonly type?: string
  readonly origin: DtcgOrigin
  readonly sourceChain: ReadonlyArray<DtcgOrigin>
  /** Immediate DTCG token path referenced by this token, when it aliases a token. */
  readonly aliasTargetPath?: ReadonlyArray<string>
  readonly metadata: DtcgTokenMetadata
  readonly groupMetadata: ReadonlyArray<DtcgGroupMetadata>
}

export type DtcgResolvedTokenIndex = ReadonlyMap<string, DtcgResolvedToken>

type AliasReference = { readonly kind: "curly" | "pointer"; readonly reference: string }
type FormatNode = GroupNode | TokenNode
type GroupNode = {
  readonly kind: "group"
  readonly path: ReadonlyArray<string>
  readonly origin: DtcgOrigin
  readonly sourceChain: ReadonlyArray<DtcgOrigin>
  readonly type?: string
  readonly metadata: DtcgTokenMetadata
  readonly children: ReadonlyMap<string, FormatNode>
}
type TokenNode = {
  readonly kind: "token"
  readonly path: ReadonlyArray<string>
  readonly origin: DtcgOrigin
  readonly sourceChain: ReadonlyArray<DtcgOrigin>
  readonly declaredType?: string
  readonly effectiveType?: string
  readonly rawValue?: DtcgJsonValue
  readonly alias?: AliasReference
  readonly metadata: DtcgTokenMetadata
  readonly groupMetadata: ReadonlyArray<DtcgGroupMetadata>
}
type ResolvedTokenValue = {
  readonly value: DtcgJsonValue
  readonly type?: string
  readonly sourceChain: ReadonlyArray<DtcgOrigin>
  readonly aliasTargetPath?: ReadonlyArray<string>
}
type RecordValue = Record<string, DtcgJsonValue>
type SourcePrefix = { readonly documentUri: string; readonly segments: ReadonlyArray<string> }

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function own(value: RecordValue, key: string): DtcgJsonValue | undefined {
  return Object.hasOwn(value, key) ? value[key] : undefined
}

function pointerChild(pointer: string, segment: string | number): string {
  const encoded = String(segment).replace(/~/gu, "~0").replace(/\//gu, "~1")
  return `${pointer}/${encoded}`
}

function pointerSegments(pointer: string): ReadonlyArray<string> {
  if (pointer === "") return []
  return pointer.slice(1).split("/").map(segment => segment.replace(/~1/gu, "/").replace(/~0/gu, "~"))
}

function pathKey(path: ReadonlyArray<string>): string {
  return JSON.stringify(path)
}

function pathLabel(path: ReadonlyArray<string>): string {
  return path.join(".")
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sameOrigin(left: DtcgOrigin, right: DtcgOrigin): boolean {
  return left.documentUri === right.documentUri && left.jsonPointer === right.jsonPointer
}

function appendOrigin(origins: ReadonlyArray<DtcgOrigin>, origin: DtcgOrigin): ReadonlyArray<DtcgOrigin> {
  if (origins.length > 0 && sameOrigin(origins[origins.length - 1]!, origin)) return origins
  return [...origins, origin]
}

function makeFailure<T>(
  code: CrumbsDtcgDiagnostic["code"],
  message: string,
  origin: DtcgOrigin,
  dtcgPath?: ReadonlyArray<string>,
  referenceChain?: ReadonlyArray<string>,
): DtcgOperationResult<T> {
  const diagnostic: CrumbsDtcgDiagnostic = {
    code,
    severity: "error",
    message,
    documentUri: origin.documentUri,
    jsonPointer: origin.jsonPointer,
    ...(dtcgPath === undefined ? {} : { dtcgPath }),
    ...(referenceChain === undefined ? {} : { referenceChain }),
  }
  return { ok: false, diagnostics: [diagnostic] }
}

function passFailure<T>(result: DtcgOperationResult<unknown>): DtcgOperationResult<T> {
  return { ok: false, diagnostics: result.diagnostics }
}

function sourceReferenceUri(uri: string, pointer: string): string {
  return pointer === "" ? uri : `${uri}#${encodeURIComponent(pointer)}`
}

function pathToPointer(path: ReadonlyArray<string>): string {
  if (path.length === 0) return ""
  return `/${path.map(segment => segment.replace(/~/gu, "~0").replace(/\//gu, "~1")).join("/")}`
}

function isTokenRecord(value: RecordValue): boolean {
  if (Object.hasOwn(value, "$value")) return true
  if (!Object.hasOwn(value, "$ref") || Object.hasOwn(value, "$extends")) return false
  const allowed = new Set(["$ref", "$type", "$description", "$deprecated", "$extensions"])
  return Object.keys(value).every(key => allowed.has(key))
}

function metadataFromRecord(value: RecordValue): DtcgTokenMetadata {
  const metadata: {
    description?: string
    deprecated?: boolean
    deprecationMessage?: string
    extensions?: DtcgJsonObject
  } = {}
  const description = own(value, "$description")
  if (typeof description === "string") metadata.description = description
  const deprecated = own(value, "$deprecated")
  if (typeof deprecated === "boolean") metadata.deprecated = deprecated
  else if (typeof deprecated === "string") {
    metadata.deprecated = true
    metadata.deprecationMessage = deprecated
  }
  const extensions = own(value, "$extensions")
  if (isRecord(extensions)) metadata.extensions = extensions
  return metadata
}

function mergeJsonObjects(
  inherited: DtcgJsonObject | undefined,
  local: DtcgJsonObject | undefined,
): DtcgJsonObject | undefined {
  if (inherited === undefined) return local
  if (local === undefined) return inherited
  const output: Record<string, DtcgJsonValue> = Object.create(null) as Record<string, DtcgJsonValue>
  for (const key of Object.keys(inherited).sort(compareText)) {
    Object.defineProperty(output, key, { value: inherited[key], enumerable: true, configurable: true, writable: true })
  }
  for (const key of Object.keys(local).sort(compareText)) {
    const before = inherited[key]
    const after = local[key]!
    const merged = isRecord(before) && isRecord(after)
      ? mergeJsonObjects(before, after)!
      : after
    Object.defineProperty(output, key, { value: merged, enumerable: true, configurable: true, writable: true })
  }
  return output
}

function mergeMetadata(inherited: DtcgTokenMetadata, local: DtcgTokenMetadata): DtcgTokenMetadata {
  const output: {
    description?: string
    deprecated?: boolean
    deprecationMessage?: string
    extensions?: DtcgJsonObject
  } = { ...inherited }
  if (local.description !== undefined) output.description = local.description
  if (local.deprecated !== undefined) {
    output.deprecated = local.deprecated
    if (local.deprecationMessage === undefined) delete output.deprecationMessage
    else output.deprecationMessage = local.deprecationMessage
  }
  const extensions = mergeJsonObjects(inherited.extensions, local.extensions)
  if (extensions === undefined) delete output.extensions
  else output.extensions = extensions
  return output
}

function isCurlyReference(reference: string): boolean {
  return reference.startsWith("{") && reference.endsWith("}")
}

function parseCurlyPath(reference: string): ReadonlyArray<string> | undefined {
  if (!isCurlyReference(reference)) return undefined
  const body = reference.slice(1, -1)
  if (body.length === 0) return undefined
  const segments = body.split(".")
  if (segments.some(segment => segment.length === 0)) return undefined
  if (segments[segments.length - 1] === "$root") return segments.slice(0, -1)
  return segments
}

function groupReference(reference: string, baseUri: string): string | undefined {
  if (!isCurlyReference(reference)) return reference
  const segments = parseCurlyPath(reference)
  if (segments === undefined) return undefined
  const pointer = pathToPointer(segments)
  return `${baseUri}#${encodeURIComponent(pointer)}`
}

function sourcePathForPointer(
  documentUri: string,
  pointer: string,
  prefixes: ReadonlyArray<SourcePrefix>,
  drafts: ReadonlyMap<string, TokenNode>,
): string | undefined {
  const targetSegments = pointerSegments(pointer)
  let tokenSegments = [...targetSegments]
  if (tokenSegments[tokenSegments.length - 1] === "$value") tokenSegments.pop()
  if (tokenSegments[tokenSegments.length - 1] === "$root") tokenSegments.pop()

  const candidates = prefixes
    .filter(prefix => prefix.documentUri === documentUri
      && prefix.segments.length <= tokenSegments.length
      && prefix.segments.every((segment, index) => tokenSegments[index] === segment))
    .sort((left, right) => right.segments.length - left.segments.length)
  for (const prefix of candidates) {
    const candidate = pathKey(tokenSegments.slice(prefix.segments.length))
    if (drafts.has(candidate)) return candidate
  }
  const fullPath = pathKey(tokenSegments)
  return drafts.has(fullPath) ? fullPath : undefined
}

function typeAtPointerValue(
  documentUri: string,
  pointer: string,
  documents: ReadonlyMap<string, DtcgJsonObject>,
): string | undefined {
  const document = documents.get(documentUri)
  if (document === undefined) return undefined
  const segments = pointerSegments(pointer)
  const valueIndex = segments.indexOf("$value")
  if (valueIndex !== -1 && valueIndex !== segments.length - 1) return undefined
  const tokenSegments = valueIndex === -1 ? segments : segments.slice(0, valueIndex)
  let current: DtcgJsonValue = document
  let inheritedType: string | undefined
  for (const segment of tokenSegments) {
    if (!isRecord(current)) return undefined
    const groupType = own(current, "$type")
    if (typeof groupType === "string") inheritedType = groupType
    const next = own(current, segment)
    if (next === undefined) return undefined
    current = next
  }
  if (isRecord(current)) {
    const tokenType = own(current, "$type")
    if (typeof tokenType === "string") return tokenType
  }
  return inheritedType
}

/** Apply DTCG group extensions and resolve aliases over the selected source order. */
export function resolveDtcgTokenIndex(
  selection: DtcgSourceSelection,
  documents: ReadonlyMap<string, DtcgJsonObject>,
): DtcgOperationResult<DtcgResolvedTokenIndex> {
  let work = 0
  const prefixes: Array<SourcePrefix> = []
  const groupMemo = new Map<string, GroupNode>()
  const countWork = (origin: DtcgOrigin, path: ReadonlyArray<string>, depth: number): DtcgOperationResult<void> | undefined => {
    work += 1
    if (work > MAX_FORMAT_NODES) {
      return makeFailure("resource.limit-exceeded", "DTCG Format resolution exceeds the 100,000-node limit.", origin, path)
    }
    if (depth > MAX_FORMAT_GRAPH_DEPTH) {
      return makeFailure("resource.limit-exceeded", "DTCG Format graph depth exceeds the 256-container limit.", origin, path)
    }
    return undefined
  }

  const buildToken = (
    value: RecordValue,
    documentUri: string,
    jsonPointer: string,
    path: ReadonlyArray<string>,
    parentSourceChain: ReadonlyArray<DtcgOrigin>,
    groupMetadata: ReadonlyArray<DtcgGroupMetadata>,
  ): DtcgOperationResult<TokenNode> => {
    const origin = { documentUri, jsonPointer }
    const limit = countWork(origin, path, path.length)
    if (limit !== undefined) return passFailure(limit)

    const declaredType = own(value, "$type")
    const pointerRef = own(value, "$ref")
    const rawValue = own(value, "$value")
    let alias: AliasReference | undefined
    if (typeof pointerRef === "string") alias = { kind: "pointer", reference: pointerRef }
    else if (typeof rawValue === "string" && rawValue.startsWith("{") && rawValue.endsWith("}")) {
      if (parseCurlyPath(rawValue) === undefined) {
        return makeFailure("token.alias-unresolved", "Invalid DTCG curly-brace token reference.", origin, path, [pathLabel(path), rawValue])
      }
      alias = { kind: "curly", reference: rawValue }
    }

    const sourceChain = appendOrigin(parentSourceChain, origin)
    return {
      ok: true,
      value: {
        kind: "token",
        path,
        origin,
        sourceChain,
        ...(typeof declaredType === "string" ? { declaredType } : {}),
        ...(rawValue === undefined ? {} : { rawValue }),
        ...(alias === undefined ? {} : { alias }),
        metadata: metadataFromRecord(value),
        groupMetadata,
      },
      diagnostics: [],
    }
  }

  const mergeNode = (inherited: FormatNode | undefined, local: FormatNode): FormatNode => {
    if (inherited === undefined) return local
    if (inherited.kind === "group" && local.kind === "group") return mergeGroups(inherited, local)
    if (inherited.kind === "token" && local.kind === "token") {
      return { ...local, sourceChain: [...inherited.sourceChain, ...local.sourceChain] }
    }
    return { ...local, sourceChain: [...inherited.sourceChain, ...local.sourceChain] }
  }

  const mergeGroups = (inherited: GroupNode, local: GroupNode): GroupNode => {
    const children = new Map<string, FormatNode>()
    const names = new Set([...inherited.children.keys(), ...local.children.keys()])
    for (const name of [...names].sort(compareText)) {
      const oldChild = inherited.children.get(name)
      const newChild = local.children.get(name)
      if (newChild !== undefined) children.set(name, mergeNode(oldChild, newChild))
      else if (oldChild !== undefined) children.set(name, oldChild)
    }
    return {
      kind: "group",
      path: local.path,
      origin: local.origin,
      sourceChain: [...inherited.sourceChain, ...local.sourceChain],
      ...(local.type === undefined ? (inherited.type === undefined ? {} : { type: inherited.type }) : { type: local.type }),
      metadata: mergeMetadata(inherited.metadata, local.metadata),
      children,
    }
  }

  const buildGroup = (
    value: DtcgJsonObject,
    documentUri: string,
    jsonPointer: string,
    path: ReadonlyArray<string>,
    parentSourceChain: ReadonlyArray<DtcgOrigin>,
    activeExtensions: ReadonlyArray<string>,
    depth: number,
  ): DtcgOperationResult<GroupNode> => {
    const origin = { documentUri, jsonPointer }
    const identity = `${documentUri}#${jsonPointer}`
    const sourceChainKey = parentSourceChain.map(item => `${item.documentUri}#${item.jsonPointer}`).join("\u0000")
    const memoKey = `${identity}\u0000${pathKey(path)}\u0000${sourceChainKey}`
    const memoized = groupMemo.get(memoKey)
    if (memoized !== undefined) return { ok: true, value: memoized, diagnostics: [] }

    const limit = countWork(origin, path, depth)
    if (limit !== undefined) return passFailure(limit)
    if (activeExtensions.includes(identity)) {
      return makeFailure("format.cycle", "DTCG group extension contains a cycle.", origin, path, [...activeExtensions, identity])
    }
    const nextActive = [...activeExtensions, identity]
    const sourceChain = appendOrigin(parentSourceChain, origin)
    const rawType = own(value, "$type")
    const localChildren = new Map<string, FormatNode>()

    for (const name of Object.keys(value).filter(key => !key.startsWith("$")).sort(compareText)) {
      const child = value[name]
      if (!isRecord(child)) {
        return makeFailure("format.structure-invalid", "DTCG groups may contain only nested groups or token objects.", {
          documentUri,
          jsonPointer: pointerChild(jsonPointer, name),
        }, [...path, name])
      }
      if (name.length === 0 || name.includes(".")) {
        return makeFailure("format.structure-invalid", "DTCG group and token names must not contain periods.", {
          documentUri,
          jsonPointer: pointerChild(jsonPointer, name),
        }, [...path, name])
      }
      const childPointer = pointerChild(jsonPointer, name)
      const childPath = [...path, name]
      if (isTokenRecord(child)) {
        const built = buildToken(child, documentUri, childPointer, childPath, sourceChain, [])
        if (!built.ok) return built
        localChildren.set(name, built.value)
      } else {
        const built = buildGroup(child as DtcgJsonObject, documentUri, childPointer, childPath, sourceChain, nextActive, depth + 1)
        if (!built.ok) return built
        localChildren.set(name, built.value)
      }
    }

    const rootToken = own(value, "$root")
    if (rootToken !== undefined) {
      if (!isRecord(rootToken) || !isTokenRecord(rootToken)) {
        return makeFailure("format.structure-invalid", "DTCG $root must contain a token object.", {
          documentUri,
          jsonPointer: pointerChild(jsonPointer, "$root"),
        }, path)
      }
      const built = buildToken(rootToken, documentUri, pointerChild(jsonPointer, "$root"), path, sourceChain, [])
      if (!built.ok) return built
      localChildren.set("$root", built.value)
    }

    const local: GroupNode = {
      kind: "group",
      path,
      origin,
      sourceChain,
      ...(typeof rawType === "string" ? { type: rawType } : {}),
      metadata: metadataFromRecord(value),
      children: localChildren,
    }

    const extensionValue = own(value, "$extends") ?? own(value, "$ref")
    if (typeof extensionValue !== "string") {
      groupMemo.set(memoKey, local)
      return { ok: true, value: local, diagnostics: [] }
    }
    const extensionProperty = Object.hasOwn(value, "$extends") ? "$extends" : "$ref"
    const referenceOrigin = { documentUri, jsonPointer: pointerChild(jsonPointer, extensionProperty) }
    const normalizedReference = groupReference(extensionValue, documentUri)
    if (normalizedReference === undefined) {
      return makeFailure("format.structure-invalid", "Invalid DTCG group extension reference.", referenceOrigin, path, [extensionValue])
    }
    const target = resolveDtcgReference(normalizedReference, documentUri, documents, referenceOrigin)
    if (!target.ok) return passFailure(target)
    if (!isRecord(target.value.value)) {
      return makeFailure("format.structure-invalid", "DTCG group extension must target a group object.", referenceOrigin, path, [extensionValue])
    }
    const targetOrigin = { documentUri: target.value.documentUri, jsonPointer: target.value.jsonPointer }
    const decodedTarget = decodeDtcgFormatSource(target.value.value, targetOrigin)
    if (!decodedTarget.ok) return passFailure(decodedTarget)
    const inherited = buildGroup(
      decodedTarget.value,
      targetOrigin.documentUri,
      targetOrigin.jsonPointer,
      path,
      parentSourceChain,
      nextActive,
      depth + 1,
    )
    if (!inherited.ok) return inherited
    const merged = mergeGroups(inherited.value, local)
    groupMemo.set(memoKey, merged)
    return { ok: true, value: merged, diagnostics: [] }
  }

  let effectiveRoot: GroupNode | undefined
  for (const selectedSource of selection.sources) {
    const selectedOrigin = { documentUri: selectedSource.documentUri, jsonPointer: selectedSource.jsonPointer }
    prefixes.push({ documentUri: selectedSource.documentUri, segments: pointerSegments(selectedSource.jsonPointer) })
    const resolved = resolveDtcgReference(
      sourceReferenceUri(selectedSource.documentUri, selectedSource.jsonPointer),
      selectedSource.documentUri,
      documents,
      selectedOrigin,
    )
    if (!resolved.ok) return passFailure(resolved)
    const decoded = decodeDtcgFormatSource(resolved.value.value, selectedOrigin)
    if (!decoded.ok) return passFailure(decoded)
    const root = buildGroup(
      decoded.value,
      resolved.value.documentUri,
      resolved.value.jsonPointer,
      [],
      selectedSource.sourceChain ?? [selectedOrigin],
      [],
      0,
    )
    if (!root.ok) return root
    effectiveRoot = effectiveRoot === undefined ? root.value : mergeGroups(effectiveRoot, root.value)
  }

  if (effectiveRoot === undefined) {
    effectiveRoot = {
      kind: "group",
      path: [],
      origin: { documentUri: "", jsonPointer: "" },
      sourceChain: [],
      metadata: {},
      children: new Map(),
    }
  }

  const drafts = new Map<string, TokenNode>()
  const originToToken = new Map<string, string>()
  const addOriginMapping = (origin: DtcgOrigin, key: string) => {
    originToToken.set(`${origin.documentUri}#${origin.jsonPointer}`, key)
  }

  const collectTokens = (
    group: GroupNode,
    inheritedType: string | undefined,
    groupMetadata: ReadonlyArray<DtcgGroupMetadata>,
    depth: number,
  ): DtcgOperationResult<void> => {
    const limit = countWork(group.origin, group.path, depth)
    if (limit !== undefined) return passFailure(limit)
    const effectiveType = group.type ?? inheritedType
    const metadataChain = Object.keys(group.metadata).length === 0
      ? groupMetadata
      : [...groupMetadata, { path: group.path, metadata: group.metadata }]
    for (const [name, child] of [...group.children.entries()].sort(([left], [right]) => compareText(left, right))) {
      const result = child.kind === "group"
        ? collectTokens(child, effectiveType, metadataChain, depth + 1)
        : (() => {
          const key = pathKey(child.path)
          const draft: TokenNode = {
            ...child,
            ...(child.declaredType === undefined && effectiveType !== undefined ? { effectiveType } : {}),
            ...(child.declaredType !== undefined ? { effectiveType: child.declaredType } : {}),
            groupMetadata: metadataChain,
          }
          drafts.set(key, draft)
          addOriginMapping(child.origin, key)
          addOriginMapping({ documentUri: child.origin.documentUri, jsonPointer: pointerChild(child.origin.jsonPointer, "$value") }, key)
          return { ok: true as const, value: undefined, diagnostics: [] }
        })()
      if (!result.ok) return result
    }
    return { ok: true, value: undefined, diagnostics: [] }
  }

  const collected = collectTokens(effectiveRoot, undefined, [], 0)
  if (!collected.ok) return passFailure(collected)

  const resolvedTokenMemo = new Map<string, ResolvedTokenValue>()
  const resolveToken = (
    key: string,
    active: ReadonlyArray<string>,
    depth: number,
  ): DtcgOperationResult<ResolvedTokenValue> => {
    const draft = drafts.get(key)
    if (draft === undefined) {
      return makeFailure("token.alias-unresolved", "DTCG token reference target was not found.", { documentUri: "", jsonPointer: "" }, [], active.map(item => pathLabel(JSON.parse(item) as Array<string>)))
    }
    if (active.includes(key)) {
      const cycle = [...active.slice(active.indexOf(key)), key].map(item => pathLabel(JSON.parse(item) as Array<string>))
      return makeFailure("token.alias-cycle", "DTCG token aliases contain a cycle.", draft.origin, draft.path, cycle)
    }
    const memoized = resolvedTokenMemo.get(key)
    if (memoized !== undefined) return { ok: true, value: memoized, diagnostics: [] }
    const limit = countWork(draft.origin, draft.path, depth)
    if (limit !== undefined) return passFailure(limit)

    if (draft.alias === undefined) {
      if (draft.rawValue === undefined) {
        return makeFailure("format.structure-invalid", "DTCG token has neither a value nor a reference.", draft.origin, draft.path)
      }
      const resolvedValue: ResolvedTokenValue = {
        value: draft.rawValue,
        ...(draft.effectiveType === undefined ? {} : { type: draft.effectiveType }),
        sourceChain: draft.sourceChain,
      }
      resolvedTokenMemo.set(key, resolvedValue)
      return {
        ok: true,
        value: resolvedValue,
        diagnostics: [],
      }
    }

    const nextActive = [...active, key]
    let targetValue: DtcgJsonValue
    let targetType: string | undefined
    let targetSourceChain: ReadonlyArray<DtcgOrigin>
    let targetLabel: string
    let aliasTargetPath: ReadonlyArray<string> | undefined

    if (draft.alias.kind === "curly") {
      const targetPath = parseCurlyPath(draft.alias.reference)
      if (targetPath === undefined) {
        return makeFailure("token.alias-unresolved", "Invalid DTCG curly-brace token reference.", draft.origin, draft.path, [pathLabel(draft.path), draft.alias.reference])
      }
      aliasTargetPath = targetPath
      const targetKey = pathKey(targetPath)
      const target = resolveToken(targetKey, nextActive, depth + 1)
      if (!target.ok) {
        const issue = target.diagnostics[0]!
        if (issue.code === "token.alias-unresolved") {
          return makeFailure("token.alias-unresolved", "DTCG curly-brace token reference was not found.", draft.origin, draft.path, [pathLabel(draft.path), pathLabel(targetPath)])
        }
        return passFailure(target)
      }
      targetValue = target.value.value
      targetType = target.value.type
      targetSourceChain = target.value.sourceChain
      targetLabel = pathLabel(targetPath)
    } else {
      const target = resolveDtcgReference(draft.alias.reference, draft.origin.documentUri, documents, draft.origin)
      if (!target.ok) {
        return makeFailure("token.alias-unresolved", "DTCG JSON Pointer alias target was not found.", draft.origin, draft.path, [pathLabel(draft.path), draft.alias.reference])
      }
      const resolvedTarget = target.value
      const targetKey = originToToken.get(`${resolvedTarget.documentUri}#${resolvedTarget.jsonPointer}`)
        ?? sourcePathForPointer(resolvedTarget.documentUri, resolvedTarget.jsonPointer, prefixes, drafts)
      if (targetKey !== undefined && targetKey !== key) {
        aliasTargetPath = drafts.get(targetKey)?.path
        const linked = resolveToken(targetKey, nextActive, depth + 1)
        if (!linked.ok) return passFailure(linked)
        targetValue = linked.value.value
        targetType = linked.value.type
        targetSourceChain = linked.value.sourceChain
        const linkedDraft = drafts.get(targetKey)!
        targetLabel = pathLabel(linkedDraft.path)
      } else {
        targetValue = resolvedTarget.value
        targetType = typeAtPointerValue(resolvedTarget.documentUri, resolvedTarget.jsonPointer, documents)
        targetSourceChain = [
          ...draft.sourceChain,
          { documentUri: resolvedTarget.documentUri, jsonPointer: resolvedTarget.jsonPointer },
        ]
        targetLabel = `${resolvedTarget.documentUri}#${resolvedTarget.jsonPointer}`
        if (isRecord(targetValue) && Object.hasOwn(targetValue, "$value")) {
          const directValue = own(targetValue, "$value")
          if (directValue === undefined) {
            return makeFailure("token.alias-unresolved", "DTCG JSON Pointer target has no token value.", draft.origin, draft.path, [pathLabel(draft.path), targetLabel])
          }
          targetValue = directValue
          targetType = typeAtPointerValue(resolvedTarget.documentUri, resolvedTarget.jsonPointer, documents)
        }
      }
    }

    if (draft.effectiveType !== undefined && targetType !== undefined && draft.effectiveType !== targetType) {
      return makeFailure(
        "token.alias-domain-mismatch",
        `DTCG alias type ${targetType} does not match declared type ${draft.effectiveType}.`,
        draft.origin,
        draft.path,
        [pathLabel(draft.path), targetLabel],
      )
    }
    const type = draft.effectiveType ?? targetType
    const resolvedValue: ResolvedTokenValue = {
      value: targetValue,
      ...(type === undefined ? {} : { type }),
      sourceChain: [...draft.sourceChain, ...targetSourceChain],
      ...(aliasTargetPath === undefined ? {} : { aliasTargetPath }),
    }
    resolvedTokenMemo.set(key, resolvedValue)
    return {
      ok: true,
      value: resolvedValue,
      diagnostics: [],
    }
  }

  const index = new Map<string, DtcgResolvedToken>()
  for (const key of [...drafts.keys()].sort(compareText)) {
    const draft = drafts.get(key)!
    const resolved = resolveToken(key, [], 0)
    if (!resolved.ok) return passFailure(resolved)
    index.set(key, {
      path: draft.path,
      value: resolved.value.value,
      ...(resolved.value.type === undefined ? {} : { type: resolved.value.type }),
      origin: draft.origin,
      sourceChain: resolved.value.sourceChain,
      ...(resolved.value.aliasTargetPath === undefined ? {} : { aliasTargetPath: resolved.value.aliasTargetPath }),
      metadata: draft.metadata,
      groupMetadata: draft.groupMetadata,
    })
  }

  return { ok: true, value: index, diagnostics: [] }
}
