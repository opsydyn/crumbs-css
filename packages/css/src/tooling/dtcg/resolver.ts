import {
  type CrumbsDtcgDiagnostic,
  type CrumbsDtcgResolverVersion,
  type DtcgJsonObject,
  type DtcgJsonValue,
  type DtcgOperationResult,
  type DtcgOrigin,
} from "./model"
import { resolveDtcgReference } from "./documents"
import { decodeCrumbsDtcgResolverVersion, decodeDtcgResolverStructure } from "./schema"

const MAX_RESOLVER_STEPS = 100_000

type DtcgSource = {
  readonly setName: string
  readonly documentUri: string
  readonly jsonPointer: string
}

export type DtcgSourceSelection = {
  readonly resolverVersion: CrumbsDtcgResolverVersion
  readonly selectedModifiers: Readonly<Record<string, string>>
  readonly sources: ReadonlyArray<DtcgSource>
  readonly resolutionOrder: ReadonlyArray<string>
}

type RecordValue = Record<string, DtcgJsonValue>
type Definition = {
  readonly kind: "set" | "modifier"
  readonly name: string
  readonly value: DtcgJsonObject
  readonly documentUri: string
  readonly jsonPointer: string
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

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

function resolverUriCanonical(input: string): string | undefined {
  try {
    const uri = new URL(input)
    if (uri.hash !== "") return undefined
    return uri.href
  } catch {
    return undefined
  }
}

function makeFailure<T>(
  code: CrumbsDtcgDiagnostic["code"],
  message: string,
  origin: DtcgOrigin,
  referenceChain?: ReadonlyArray<string>,
): DtcgOperationResult<T> {
  const diagnostic: CrumbsDtcgDiagnostic = {
    code,
    severity: "error",
    message,
    documentUri: origin.documentUri,
    jsonPointer: origin.jsonPointer,
    ...(referenceChain === undefined ? {} : { referenceChain }),
  }
  return { ok: false, diagnostics: [diagnostic] }
}

function isSourceReference(value: unknown): value is { readonly $ref: string } {
  return isRecord(value) && Object.keys(value).length === 1 && typeof value.$ref === "string"
}

function isSetDefinition(value: unknown): value is DtcgJsonObject & { readonly sources: ReadonlyArray<unknown> } {
  if (!isRecord(value) || !Array.isArray(value.sources)) return false
  const keys = Object.keys(value)
  return (keys.length === 1 && keys[0] === "sources")
    || (keys.length === 3 && keys.includes("type") && keys.includes("name") && value.type === "set" && typeof value.name === "string")
}

function isModifierDefinition(value: unknown): value is DtcgJsonObject & {
  readonly contexts: DtcgJsonObject
  readonly default?: string
} {
  if (!isRecord(value)) return false
  const keys = Object.keys(value)
  const rootModifierKeys = keys.every(key => key === "contexts" || key === "default")
  const inlineModifierKeys = keys.every(key => key === "type" || key === "name" || key === "contexts" || key === "default")
    && value.type === "modifier"
    && typeof value.name === "string"
  return (rootModifierKeys || inlineModifierKeys)
    && isRecord(value.contexts)
    && (value.default === undefined || typeof value.default === "string")
}

function sourceArray(value: DtcgJsonObject, key: string): ReadonlyArray<unknown> {
  const sources = own(value, key)
  return Array.isArray(sources) ? sources : []
}

function contextMap(value: DtcgJsonObject): DtcgJsonObject | undefined {
  const contexts = own(value, "contexts")
  return isRecord(contexts) ? contexts : undefined
}

function isPlainSource(value: unknown): value is DtcgJsonObject {
  return isRecord(value) && !Object.hasOwn(value, "$ref")
}

function pointerSegments(pointer: string): ReadonlyArray<string> {
  if (pointer === "") return []
  return pointer.slice(1).split("/").map(segment => segment.replace(/~1/gu, "/").replace(/~0/gu, "~"))
}

function definitionKindAtOrigin(origin: DtcgOrigin, resolverUri: string | undefined): "set" | "modifier" | undefined {
  if (resolverUri === undefined || origin.documentUri !== resolverUri) return undefined
  const segments = pointerSegments(origin.jsonPointer)
  if (segments.length === 2 && segments[0] === "sets") return "set"
  if (segments.length === 2 && segments[0] === "modifiers") return "modifier"
  return undefined
}

function definitionNameAtOrigin(origin: DtcgOrigin, fallback: string): string {
  const segments = pointerSegments(origin.jsonPointer)
  return segments[segments.length - 1] ?? fallback
}

/** Select one context per modifier and expand only the sources in declared order. */
export function selectDtcgSources(
  resolver: DtcgJsonObject,
  resolverUri: string,
  documents: ReadonlyMap<string, DtcgJsonObject>,
  modifiers?: Readonly<Record<string, string>>,
): DtcgOperationResult<DtcgSourceSelection> {
  const canonicalResolverUri = resolverUriCanonical(resolverUri)
  if (canonicalResolverUri === undefined) {
    return makeFailure("format.structure-invalid", "Invalid DTCG Resolver URI.", { documentUri: resolverUri, jsonPointer: "" })
  }

  const decoded = decodeDtcgResolverStructure(resolver, canonicalResolverUri)
  if (!decoded.ok) return decoded
  const safeResolver = decoded.value
  const versionResult = decodeCrumbsDtcgResolverVersion(own(safeResolver, "version"))
  if (!versionResult.ok) {
    return makeFailure(
      versionResult.diagnostics[0]!.code,
      versionResult.diagnostics[0]!.message,
      { documentUri: canonicalResolverUri, jsonPointer: "/version" },
    )
  }

  if (documents.has(canonicalResolverUri)) {
    return makeFailure(
      "format.structure-invalid",
      "The explicit document map must not contain a second value for the Resolver URI.",
      { documentUri: canonicalResolverUri, jsonPointer: "" },
    )
  }
  const resolverDocuments = new Map(documents)
  resolverDocuments.set(canonicalResolverUri, safeResolver)

  const suppliedModifiers: Record<string, string> = Object.create(null) as Record<string, string>
  if (modifiers !== undefined) {
    if (!isRecord(modifiers)) {
      return makeFailure("resolver.selection-invalid", "Invalid DTCG modifier selections.", { documentUri: canonicalResolverUri, jsonPointer: "" })
    }
    for (const key of Object.keys(modifiers)) {
      const value = modifiers[key]
      if (typeof value !== "string") {
        return makeFailure("resolver.selection-invalid", "Invalid DTCG modifier selections.", { documentUri: canonicalResolverUri, jsonPointer: "" })
      }
      suppliedModifiers[key] = value
    }
  }

  const rootModifiers = own(safeResolver, "modifiers")
  const knownModifierNames = new Set<string>(isRecord(rootModifiers) ? Object.keys(rootModifiers) : [])
  const resolutionOrder = own(safeResolver, "resolutionOrder") as ReadonlyArray<DtcgJsonValue>
  for (const entry of resolutionOrder) {
    if (isRecord(entry) && entry.type === "modifier" && typeof entry.name === "string") {
      knownModifierNames.add(entry.name)
    }
  }
  const unknownSelection = Object.keys(suppliedModifiers).find(name => !knownModifierNames.has(name))
  if (unknownSelection !== undefined) {
    return makeFailure(
      "resolver.selection-invalid",
      `Unknown DTCG modifier selection: ${unknownSelection}.`,
      { documentUri: canonicalResolverUri, jsonPointer: "" },
    )
  }

  const sources: Array<DtcgSource> = []
  const selectedModifiers: Record<string, string> = Object.create(null) as Record<string, string>
  const orderNames: Array<string> = []
  let steps = 0

  function appendResolvedSource(
    source: unknown,
    sourceOrigin: DtcgOrigin,
    setName: string,
    activeSets: ReadonlyArray<string>,
  ): DtcgOperationResult<void> {
    steps += 1
    if (steps > MAX_RESOLVER_STEPS) {
      return makeFailure("resource.limit-exceeded", "DTCG Resolver expansion exceeds the 100,000-step limit.", sourceOrigin)
    }

    if (isSourceReference(source)) {
      const resolved = resolveDtcgReference(source.$ref, sourceOrigin.documentUri, resolverDocuments, sourceOrigin)
      if (!resolved.ok) return resolved
      const target = resolved.value.value
      const targetOrigin: DtcgOrigin = {
        documentUri: resolved.value.documentUri,
        jsonPointer: resolved.value.jsonPointer,
      }
      if (targetOrigin.documentUri === canonicalResolverUri && pointerSegments(targetOrigin.jsonPointer)[0] === "resolutionOrder") {
        return makeFailure("resolver.selection-invalid", "DTCG references must not target resolutionOrder entries.", sourceOrigin, [source.$ref])
      }
      const declaredKind = definitionKindAtOrigin(targetOrigin, canonicalResolverUri)
      if (declaredKind === "modifier") {
        return makeFailure("resolver.selection-invalid", "A modifier context may reference a set, not another modifier.", sourceOrigin, [source.$ref])
      }
      if (isRecord(target) && isSetDefinition(target) && (declaredKind === "set" || declaredKind === undefined)) {
        return expandSet({
          kind: "set",
          name: definitionNameAtOrigin(targetOrigin, setName),
          value: target as DtcgJsonObject,
          documentUri: targetOrigin.documentUri,
          jsonPointer: targetOrigin.jsonPointer,
        }, activeSets)
      }
      if (isRecord(target) && Object.hasOwn(target, "$ref")) {
        return makeFailure("format.structure-invalid", "Resolved DTCG source contains an invalid $ref object.", sourceOrigin, [source.$ref])
      }
      sources.push({ setName, documentUri: targetOrigin.documentUri, jsonPointer: targetOrigin.jsonPointer })
      return { ok: true, value: undefined, diagnostics: [] }
    }

    if (!isPlainSource(source)) {
      return makeFailure("format.structure-invalid", "DTCG Resolver sources must be objects or $ref objects.", sourceOrigin)
    }
    sources.push({ setName, documentUri: sourceOrigin.documentUri, jsonPointer: sourceOrigin.jsonPointer })
    return { ok: true, value: undefined, diagnostics: [] }
  }

  function expandSet(definition: Definition, activeSets: ReadonlyArray<string>): DtcgOperationResult<void> {
    const identity = `${definition.documentUri}#${definition.jsonPointer}`
    if (activeSets.includes(identity)) {
      return makeFailure(
        "format.cycle",
        "DTCG Resolver set references contain a cycle.",
        { documentUri: definition.documentUri, jsonPointer: definition.jsonPointer },
        [...activeSets, identity],
      )
    }
    if (!isSetDefinition(definition.value)) {
      return makeFailure("format.structure-invalid", "Invalid DTCG Resolver set definition.", { documentUri: definition.documentUri, jsonPointer: definition.jsonPointer })
    }
    const nextActive = [...activeSets, identity]
    const setSources = sourceArray(definition.value, "sources")
    for (let index = 0; index < setSources.length; index += 1) {
      const sourceOrigin = { documentUri: definition.documentUri, jsonPointer: pointerChild(pointerChild(definition.jsonPointer, "sources"), index) }
      const result = appendResolvedSource(setSources[index], sourceOrigin, definition.name, nextActive)
      if (!result.ok) return result
    }
    return { ok: true, value: undefined, diagnostics: [] }
  }

  const selectModifier = (definition: Definition): DtcgOperationResult<void> => {
    if (!isModifierDefinition(definition.value)) {
      return makeFailure("format.structure-invalid", "Invalid DTCG Resolver modifier definition.", { documentUri: definition.documentUri, jsonPointer: definition.jsonPointer })
    }
    const contexts = contextMap(definition.value)
    if (contexts === undefined) {
      return makeFailure("format.structure-invalid", "Invalid DTCG Resolver modifier contexts.", { documentUri: definition.documentUri, jsonPointer: definition.jsonPointer })
    }
    const explicit = Object.hasOwn(suppliedModifiers, definition.name) ? suppliedModifiers[definition.name] : undefined
    const defaultValue = own(definition.value, "default")
    if (typeof defaultValue === "string" && !Object.hasOwn(contexts, defaultValue)) {
      return makeFailure(
        "resolver.selection-invalid",
        `Modifier ${definition.name} declares an unknown default context ${defaultValue}.`,
        { documentUri: definition.documentUri, jsonPointer: definition.jsonPointer },
      )
    }
    const contextName = explicit ?? (typeof defaultValue === "string" ? defaultValue : undefined)
    if (contextName === undefined || !Object.hasOwn(contexts, contextName)) {
      return makeFailure(
        "resolver.selection-invalid",
        contextName === undefined
          ? `A context must be selected for modifier ${definition.name}.`
          : `Modifier ${definition.name} does not declare context ${contextName}.`,
        contextName !== undefined && explicit !== undefined
          ? { documentUri: canonicalResolverUri, jsonPointer: "" }
          : { documentUri: definition.documentUri, jsonPointer: definition.jsonPointer },
      )
    }
    selectedModifiers[definition.name] = contextName
    const contextSources = contexts[contextName]
    if (!Array.isArray(contextSources)) {
      return makeFailure("format.structure-invalid", "Invalid DTCG Resolver context source list.", {
        documentUri: definition.documentUri,
        jsonPointer: pointerChild(pointerChild(pointerChild(definition.jsonPointer, "contexts"), contextName), ""),
      })
    }
    for (let index = 0; index < contextSources.length; index += 1) {
      const sourceOrigin = {
        documentUri: definition.documentUri,
        jsonPointer: `${pointerChild(pointerChild(definition.jsonPointer, "contexts"), contextName)}/${index}`,
      }
      const result = appendResolvedSource(contextSources[index], sourceOrigin, definition.name, [])
      if (!result.ok) return result
    }
    return { ok: true, value: undefined, diagnostics: [] }
  }

  for (let orderIndex = 0; orderIndex < resolutionOrder.length; orderIndex += 1) {
    const entry = resolutionOrder[orderIndex]
    const entryOrigin = { documentUri: canonicalResolverUri, jsonPointer: pointerChild("/resolutionOrder", orderIndex) }
    let definition: Definition
    if (isSourceReference(entry)) {
      const target = resolveDtcgReference(entry.$ref, canonicalResolverUri, resolverDocuments, entryOrigin)
      if (!target.ok) return target
      const targetOrigin = { documentUri: target.value.documentUri, jsonPointer: target.value.jsonPointer }
      if (targetOrigin.documentUri === canonicalResolverUri && pointerSegments(targetOrigin.jsonPointer)[0] === "resolutionOrder") {
        return makeFailure("resolver.selection-invalid", "DTCG references must not target resolutionOrder entries.", entryOrigin, [entry.$ref])
      }
      const kind = definitionKindAtOrigin(targetOrigin, canonicalResolverUri)
      if (!isRecord(target.value.value)) {
        return makeFailure("resolver.selection-invalid", "Resolution order references must target a set or modifier.", entryOrigin, [entry.$ref])
      }
      if (kind === "set" && isSetDefinition(target.value.value)) {
        definition = {
          kind,
          name: definitionNameAtOrigin(targetOrigin, ""),
          value: target.value.value as DtcgJsonObject,
          documentUri: targetOrigin.documentUri,
          jsonPointer: targetOrigin.jsonPointer,
        }
      } else if (kind === "modifier" && isModifierDefinition(target.value.value)) {
        definition = {
          kind,
          name: definitionNameAtOrigin(targetOrigin, ""),
          value: target.value.value as DtcgJsonObject,
          documentUri: targetOrigin.documentUri,
          jsonPointer: targetOrigin.jsonPointer,
        }
      } else if (kind === undefined && isSetDefinition(target.value.value)) {
        definition = {
          kind: "set",
          name: definitionNameAtOrigin(targetOrigin, `set${orderIndex}`),
          value: target.value.value as DtcgJsonObject,
          documentUri: targetOrigin.documentUri,
          jsonPointer: targetOrigin.jsonPointer,
        }
      } else if (kind === undefined && isModifierDefinition(target.value.value)) {
        definition = {
          kind: "modifier",
          name: definitionNameAtOrigin(targetOrigin, `modifier${orderIndex}`),
          value: target.value.value as DtcgJsonObject,
          documentUri: targetOrigin.documentUri,
          jsonPointer: targetOrigin.jsonPointer,
        }
      } else {
        return makeFailure("resolver.selection-invalid", "Resolution order references must target a set or modifier.", entryOrigin, [entry.$ref])
      }
    } else if (isRecord(entry) && (entry.type === "set" || entry.type === "modifier") && typeof entry.name === "string") {
      definition = {
        kind: entry.type,
        name: entry.name,
        value: entry as DtcgJsonObject,
        documentUri: canonicalResolverUri,
        jsonPointer: entryOrigin.jsonPointer,
      }
    } else {
      return makeFailure("format.structure-invalid", "Invalid DTCG Resolver resolution-order entry.", entryOrigin)
    }

    orderNames.push(`${definition.kind}:${definition.name}`)
    if (definition.kind === "set") {
      const result = expandSet(definition, [])
      if (!result.ok) return result
    } else {
      const result = selectModifier(definition)
      if (!result.ok) return result
    }
  }

  const stableModifiers: Record<string, string> = Object.create(null) as Record<string, string>
  for (const name of Object.keys(selectedModifiers).sort(compareText)) stableModifiers[name] = selectedModifiers[name]!
  return {
    ok: true,
    value: {
      resolverVersion: versionResult.value,
      selectedModifiers: stableModifiers,
      sources,
      resolutionOrder: orderNames,
    },
    diagnostics: [],
  }
}
