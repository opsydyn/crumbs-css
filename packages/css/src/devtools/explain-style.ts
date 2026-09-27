import type { NativeConditionSnapshot } from "../conditions"
import {
  createThemeDependencyResolver,
  resolveThemeTokens,
} from "../theme-runtime"
import {
  createThemeDependencyPlan,
  type ThemeDependencyPlan,
  type ThemeDependencyPlanEntry,
} from "../runtime/theme-dependency-plan"
import { getThemeContractIdentity, NativeThemeTokenReferenceType } from "../theme-token"
import type { NativeTheme } from "../native-style"
import {
  STYLE_EXPLANATION_REPORT_TYPE,
  STYLE_EXPLANATION_VALUE_TYPE,
  STYLE_EXPLANATION_VERSION,
  type ExplainStyleInput,
  type StyleExplanationCoverage,
  type StyleExplanationCoverageReason,
  type StyleExplanationDeclaration,
  type StyleExplanationExportMetadata,
  type StyleExplanationMetadata,
  type StyleExplanationPath,
  type StyleExplanationReport,
  type StyleExplanationValue,
} from "./style-explanation-model"
import {
  decodeStyleExplanationMetadata,
  decodeStyleExplanationReport,
} from "./style-explanation-schema"

const TOKEN_NAME = /^--crumbs-[A-Za-z0-9_-]+$/u
const MAX_VALUE_DEPTH = 64

export type StyleExplanationInputErrorCode =
  | "CRUMBS_EXPLANATION_INVALID_METADATA"
  | "CRUMBS_EXPLANATION_EXPORT_PATH_INVALID"

export class StyleExplanationInputError extends TypeError {
  readonly code: StyleExplanationInputErrorCode

  constructor(code: StyleExplanationInputErrorCode, message: string) {
    super(message)
    this.name = "StyleExplanationInputError"
    this.code = code
  }
}

type OwnData = { readonly present: false; readonly accessor?: boolean } | { readonly present: true; readonly value: unknown }
type EncodingContext = {
  readonly generatedNodes: WeakSet<object>
  opaqueFound: boolean
}
type SafeTheme = NativeTheme<Record<string, unknown>>
type FlattenedStyle = {
  readonly style: Record<string, unknown>
  readonly rootOpaque?: StyleExplanationValue
}

/** Explain one explicit exported style from a transformed module namespace. */
export function explainStyle(input: ExplainStyleInput): StyleExplanationReport {
  const module = readInputField(input, "module")
  const exportPath = readInputField(input, "exportPath")
  const currentSnapshot = readInputField(input, "current")
  const normalizedPath = validateExportPath(exportPath)
  const sourceStyle = readExportPath(module, normalizedPath)
  const sidecar = readOptionalOwnData(module, "__crumbsDev")

  let metadata: StyleExplanationMetadata | undefined
  let exportMetadata: StyleExplanationExportMetadata | undefined
  if (!sidecar.present && sidecar.accessor) {
    throw new StyleExplanationInputError(
      "CRUMBS_EXPLANATION_INVALID_METADATA",
      "The style explanation sidecar must be an own data property.",
    )
  }
  if (sidecar.present) {
    try {
      metadata = decodeStyleExplanationMetadata(sidecar.value)
      exportMetadata = metadata.exports.find(entry => samePath(entry.path, normalizedPath))
      if (exportMetadata === undefined) {
        throw new StyleExplanationInputError(
          "CRUMBS_EXPLANATION_EXPORT_PATH_INVALID",
          `The style explanation sidecar does not contain export path ${formatPath(normalizedPath)}.`,
        )
      }
    } catch (error) {
      if (error instanceof StyleExplanationInputError) throw error
      throw new StyleExplanationInputError(
        "CRUMBS_EXPLANATION_INVALID_METADATA",
        error instanceof Error ? error.message : "The style explanation sidecar is invalid.",
      )
    }
  }

  const context: EncodingContext = { generatedNodes: new WeakSet(), opaqueFound: false }
  const flattened = flattenStyle(sourceStyle, context)
  const currentTheme = readSnapshotTheme(currentSnapshot)
  const previousSnapshotField = readOptionalOwnData(input, "previous")
  const previousSnapshot = previousSnapshotField.present ? previousSnapshotField.value : undefined
  const previousTheme = previousSnapshot === undefined ? undefined : readSnapshotTheme(previousSnapshot)
  const dependencyPlan = readDependencyPlan(module)
  const declaredTokens = [...(exportMetadata?.tokenDependencies ?? [])].sort()
  const activeTokens = collectActiveTokens(flattened.style)
  const dependencyEntry = dependencyPlan?.entries.find(entry => samePath(entry.path, normalizedPath))
  const dependencyMetadataMissing = metadata !== undefined && (
    activeTokens.some(token => !declaredTokens.includes(token)) ||
    (declaredTokens.length > 0 && dependencyEntry === undefined) ||
    (dependencyEntry !== undefined && !sameStrings(dependencyEntry.tokens, declaredTokens))
  )
  const coverage = combineCoverage(
    metadata === undefined
      ? { status: "unavailable", reasons: ["metadata-missing"] }
      : exportMetadata!.coverage,
    [
      ...(context.opaqueFound ? ["opaque-value" as const] : []),
      ...(dependencyMetadataMissing ? ["dependency-metadata-missing" as const] : []),
    ],
  )

  let resolvedStyle: unknown = flattened.rootOpaque ?? flattened.style
  if (flattened.rootOpaque === undefined && currentTheme !== undefined) {
    resolvedStyle = resolveThemeTokens(flattened.style, currentTheme) ?? emptyRecord()
  }

  const encodedResolution = encodeResolvedStyle(
    resolvedStyle,
    flattened.style,
    currentTheme,
    context,
  )
  const propertyExplanations = createPropertyExplanations(
    flattened.style,
    resolvedStyle,
    exportMetadata,
    currentTheme,
    context,
  )
  const transition = createThemeTransition({
    exportPath: normalizedPath,
    currentTheme,
    previousTheme,
    previousWasProvided: previousSnapshot !== undefined,
    dependencyEntry,
    dependencyMetadataMissing,
    metadataAvailable: metadata !== undefined,
    style: flattened.style,
  }, context)

  const conditions = readSnapshotConditions(currentSnapshot)

  const report: StyleExplanationReport = {
    $$type: STYLE_EXPLANATION_REPORT_TYPE,
    version: STYLE_EXPLANATION_VERSION,
    target: {
      ...(metadata === undefined ? {} : { moduleId: metadata.moduleId }),
      exportPath: normalizedPath,
    },
    resolution: { value: encodedResolution, branches: [] },
    conditions: {
      ...(conditions === undefined ? {} : { snapshot: conditions }),
      decisions: [],
      expressionMatches: [],
    },
    composition: { properties: propertyExplanations },
    dependencies: {
      declaredTokens,
      activeTokens,
      changedTokens: transition.changedTokens,
    },
    transition: transition.report,
    coverage,
  }

  try {
    return deepFreeze(decodeStyleExplanationReport(report))
  } catch (error) {
    if (error instanceof StyleExplanationInputError) throw error
    throw new StyleExplanationInputError(
      "CRUMBS_EXPLANATION_INVALID_METADATA",
      error instanceof Error ? `The style explanation report could not be encoded: ${error.message}`
        : "The style explanation report could not be encoded.",
    )
  }
}

function readInputField(input: unknown, key: string): unknown {
  const field = readOptionalOwnData(input, key)
  if (!field.present) {
    throw new StyleExplanationInputError("CRUMBS_EXPLANATION_INVALID_METADATA", `Missing own data field "${key}".`)
  }
  return field.value
}

function validateExportPath(value: unknown): StyleExplanationPath {
  const segments = readSafeArray(value)
  if (segments === undefined || segments.length === 0 || segments.some(segment =>
    (typeof segment === "string" && segment.length === 0) ||
    (typeof segment === "number" && (!Number.isSafeInteger(segment) || segment < 0)) ||
    (typeof segment !== "string" && typeof segment !== "number"))) {
    throw new StyleExplanationInputError(
      "CRUMBS_EXPLANATION_EXPORT_PATH_INVALID",
      "The style explanation export path must be a non-empty array of non-empty strings and non-negative safe integers.",
    )
  }
  return Object.freeze([...segments] as Array<string | number>)
}

function readExportPath(module: unknown, path: StyleExplanationPath): unknown {
  if (!isObject(module) || Array.isArray(module)) invalidExportPath(path)
  let value: unknown = module
  for (const segment of path) {
    const next = readOptionalOwnData(value, segment)
    if (!next.present) invalidExportPath(path)
    value = next.value
  }
  return value
}

function invalidExportPath(path: StyleExplanationPath): never {
  throw new StyleExplanationInputError(
    "CRUMBS_EXPLANATION_EXPORT_PATH_INVALID",
    `The module has no safe own-data export at ${formatPath(path)}.`,
  )
}

function readOptionalOwnData(value: unknown, key: PropertyKey): OwnData {
  if (!isObject(value)) return { present: false }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined) return { present: false }
    if (!("value" in descriptor)) return { present: false, accessor: true }
    return { present: true, value: descriptor.value }
  } catch {
    return { present: false }
  }
}

function readSafeArray(value: unknown): ReadonlyArray<unknown> | undefined {
  if (!Array.isArray(value)) return undefined
  try {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length")
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor) ||
      !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0 || lengthDescriptor.value > 100_000) {
      return undefined
    }
    const result: unknown[] = []
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) return undefined
      result.push(descriptor.value)
    }
    return result
  } catch {
    return undefined
  }
}

function flattenStyle(input: unknown, context: EncodingContext): FlattenedStyle {
  const style = emptyRecord()
  const ancestors = new Set<object>()
  const flatten = (value: unknown, depth: number): StyleExplanationValue | undefined => {
    if (value === null || value === undefined || value === false) return undefined
    if (depth >= MAX_VALUE_DEPTH) return opaqueNode(context, "depth-limit")
    if (typeof value === "function") return opaqueNode(context, "function")
    if (typeof value === "symbol") return opaqueNode(context, "symbol")
    if (typeof value === "bigint") return opaqueNode(context, "bigint")
    if (typeof value !== "object") return opaqueNode(context, "unsupported-object")
    if (ancestors.has(value)) return opaqueNode(context, "cycle")

    let prototype: object | null
    let keys: ReadonlyArray<PropertyKey>
    try {
      prototype = Object.getPrototypeOf(value)
      keys = Reflect.ownKeys(value)
    } catch {
      return opaqueNode(context, "unsupported-object")
    }

    if (Array.isArray(value)) {
      const entries = readSafeArray(value)
      if (entries === undefined || keys.length !== entries.length + 1) return opaqueNode(context, "unsupported-object")
      ancestors.add(value)
      try {
        for (const entry of entries) {
          const result = flatten(entry, depth + 1)
          if (result !== undefined) {
            if (isOpaqueNode(result, context)) return result
            mergeStyle(style, result as Record<string, unknown>)
          }
        }
      } finally {
        ancestors.delete(value)
      }
      return undefined
    }

    if (prototype !== Object.prototype && prototype !== null) return opaqueNode(context, "unsupported-object")
    ancestors.add(value)
    try {
      for (const key of keys) {
        if (typeof key !== "string") {
          context.opaqueFound = true
          continue
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key)
        if (descriptor === undefined || !descriptor.enumerable) continue
        if (!("value" in descriptor)) {
          setOwn(style, key, opaqueNode(context, "accessor"))
          continue
        }
        setOwn(style, key, cloneRuntimeValue(descriptor.value, context, ancestors, depth + 1))
      }
    } catch {
      return opaqueNode(context, "unsupported-object")
    } finally {
      ancestors.delete(value)
    }
    return undefined
  }

  const rootOpaque = flatten(input, 0)
  return rootOpaque === undefined ? { style } : { style, rootOpaque }
}

function cloneRuntimeValue(
  value: unknown,
  context: EncodingContext,
  ancestors: Set<object>,
  depth: number,
): unknown {
  if (value === null || value === undefined || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value
  if (typeof value === "function") return opaqueNode(context, "function")
  if (typeof value === "symbol") return opaqueNode(context, "symbol")
  if (typeof value === "bigint") return opaqueNode(context, "bigint")
  if (!isObject(value)) return opaqueNode(context, "unsupported-object")
  if (depth >= MAX_VALUE_DEPTH) return opaqueNode(context, "depth-limit")
  if (ancestors.has(value)) return opaqueNode(context, "cycle")

  const token = readTokenReference(value)
  if (token.kind === "valid") return token.reference
  if (token.kind === "invalid") return opaqueNode(context, token.reason)

  let prototype: object | null
  let keys: ReadonlyArray<PropertyKey>
  try {
    prototype = Object.getPrototypeOf(value)
    keys = Reflect.ownKeys(value)
  } catch {
    return opaqueNode(context, "unsupported-object")
  }
  if (prototype !== Object.prototype && prototype !== null && prototype !== Array.prototype) {
    return opaqueNode(context, "unsupported-object")
  }
  if (keys.some(key => typeof key !== "string")) return opaqueNode(context, "symbol")

  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      const entries = readSafeArray(value)
      if (entries === undefined || keys.length !== entries.length + 1) return opaqueNode(context, "unsupported-object")
      return entries.map(entry => cloneRuntimeValue(entry, context, ancestors, depth + 1))
    }

    const output = emptyRecord()
    for (const key of keys as ReadonlyArray<string>) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (descriptor === undefined || !descriptor.enumerable) continue
      setOwn(output, key, "value" in descriptor
        ? cloneRuntimeValue(descriptor.value, context, ancestors, depth + 1)
        : opaqueNode(context, "accessor"))
    }
    return output
  } catch {
    return opaqueNode(context, "unsupported-object")
  } finally {
    ancestors.delete(value)
  }
}

function readTokenReference(value: object):
  | { readonly kind: "valid"; readonly reference: Readonly<Record<string, unknown>> }
  | { readonly kind: "invalid"; readonly reason: "accessor" | "unsupported-object" }
  | { readonly kind: "none" } {
  let keys: ReadonlyArray<PropertyKey>
  let prototype: object | null
  let tagDescriptor: PropertyDescriptor
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, "$$type")
    if (descriptor === undefined) return { kind: "none" }
    tagDescriptor = descriptor
    if (!("value" in tagDescriptor)) return { kind: "invalid", reason: "accessor" }
    if (tagDescriptor.value !== NativeThemeTokenReferenceType) return { kind: "none" }
    keys = Reflect.ownKeys(value)
    prototype = Object.getPrototypeOf(value)
  } catch {
    return { kind: "invalid", reason: "unsupported-object" }
  }
  const nameDescriptor = Object.getOwnPropertyDescriptor(value, "varName")
  if (prototype !== Object.prototype && prototype !== null) return { kind: "invalid", reason: "unsupported-object" }
  if (keys.length !== 2 || nameDescriptor === undefined || !("value" in nameDescriptor) ||
    !nameDescriptor.enumerable || !tagDescriptor.enumerable || typeof nameDescriptor.value !== "string" ||
    !TOKEN_NAME.test(nameDescriptor.value)) {
    return { kind: "invalid", reason: nameDescriptor !== undefined && !("value" in nameDescriptor) ? "accessor" : "unsupported-object" }
  }
  const reference = emptyRecord()
  setOwn(reference, "$$type", NativeThemeTokenReferenceType)
  setOwn(reference, "varName", nameDescriptor.value)
  return { kind: "valid", reference }
}

function readSnapshotTheme(snapshot: unknown): SafeTheme | undefined {
  const themeField = readOptionalOwnData(snapshot, "theme")
  if (!themeField.present || !isObject(themeField.value) || Array.isArray(themeField.value)) return undefined
  const contractField = readOptionalOwnData(themeField.value, "contract")
  const tokensField = readOptionalOwnData(themeField.value, "tokens")
  if (!contractField.present || !tokensField.present || !isPlainRecord(tokensField.value)) return undefined
  const tokens = emptyRecord() as Record<string, string | number>
  try {
    for (const key of Reflect.ownKeys(tokensField.value)) {
      if (typeof key !== "string") return undefined
      const descriptor = Object.getOwnPropertyDescriptor(tokensField.value, key)
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor) ||
        (typeof descriptor.value !== "string" && typeof descriptor.value !== "number")) return undefined
      setOwn(tokens, key, descriptor.value)
    }
  } catch {
    return undefined
  }
  return {
    contract: contractField.value,
    tokens,
    values: {},
  } as SafeTheme
}

function readSnapshotConditions(snapshot: unknown): NativeConditionSnapshot | undefined {
  const field = readOptionalOwnData(snapshot, "conditions")
  if (!field.present || field.value === undefined) return undefined
  if (!isPlainRecord(field.value)) return undefined
  const result = emptyRecord()
  try {
    for (const key of Reflect.ownKeys(field.value)) {
      if (typeof key !== "string") return undefined
      const descriptor = Object.getOwnPropertyDescriptor(field.value, key)
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) return undefined
      setOwn(result, key, descriptor.value)
    }
  } catch {
    return undefined
  }
  return result as NativeConditionSnapshot
}

function readDependencyPlan(module: unknown): ThemeDependencyPlan | undefined {
  const moduleDescriptor = readOptionalOwnData(module, "__crumbsModule")
  if (!moduleDescriptor.present || !isPlainRecord(moduleDescriptor.value)) return undefined
  const descriptor = moduleDescriptor.value
  const tag = readOptionalOwnData(descriptor, "$$type")
  const version = readOptionalOwnData(descriptor, "version")
  const planField = readOptionalOwnData(descriptor, "dependencyPlan")
  if (!tag.present || tag.value !== "crumbs.css.native-module" || !version.present || version.value !== 2 ||
    !planField.present || !isPlainRecord(planField.value)) return undefined
  const planTag = readOptionalOwnData(planField.value, "$$type")
  const planVersion = readOptionalOwnData(planField.value, "version")
  const entriesField = readOptionalOwnData(planField.value, "entries")
  if (!planTag.present || planTag.value !== "crumbs.css.theme-dependency-plan" ||
    !planVersion.present || planVersion.value !== 1 || !entriesField.present) return undefined
  const entries = readSafeArray(entriesField.value)
  if (entries === undefined) return undefined
  const copied: ThemeDependencyPlanEntry[] = []
  for (const entry of entries) {
    if (!isPlainRecord(entry)) return undefined
    const path = readOptionalOwnData(entry, "path")
    const tokens = readOptionalOwnData(entry, "tokens")
    const safePath = readSafeArray(path.present ? path.value : undefined)
    const safeTokens = readSafeArray(tokens.present ? tokens.value : undefined)
    if (safePath === undefined || safeTokens === undefined ||
      safePath.some(segment => typeof segment !== "string" && typeof segment !== "number") ||
      safeTokens.some(token => typeof token !== "string")) return undefined
    copied.push({ path: safePath as Array<string | number>, tokens: safeTokens as Array<string> })
  }
  try {
    return createThemeDependencyPlan(copied)
  } catch {
    return undefined
  }
}

function collectActiveTokens(style: Readonly<Record<string, unknown>>): ReadonlyArray<string> {
  const tokens = new Set<string>()
  for (const key of Object.keys(style)) {
    const descriptor = Object.getOwnPropertyDescriptor(style, key)
    if (descriptor === undefined || !("value" in descriptor)) continue
    const token = readTokenReference(descriptor.value)
    if (token.kind === "valid") {
      const name = readOptionalOwnData(token.reference, "varName")
      if (name.present && typeof name.value === "string") tokens.add(name.value)
    }
  }
  return [...tokens].sort()
}

function encodeResolvedStyle(
  value: unknown,
  originalStyle: Readonly<Record<string, unknown>>,
  theme: SafeTheme | undefined,
  context: EncodingContext,
): StyleExplanationValue {
  if (isStyleValueNode(value, context)) return value
  if (!isPlainRecord(value)) return encodeValue(value, context, new Set(), 0)
  const output = emptyRecord() as Record<string, StyleExplanationValue>
  for (const key of Object.keys(value).sort()) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !("value" in descriptor)) {
      setOwn(output, key, opaqueNode(context, "accessor"))
      continue
    }
    const original = readOptionalOwnData(originalStyle, key)
    const token = original.present && isObject(original.value)
      ? readTokenReference(original.value)
      : { kind: "none" as const }
    if (token.kind === "valid" && theme !== undefined) {
      const varName = readOptionalOwnData(token.reference, "varName")
      const contract = safeContractIdentity(theme.contract)
      const resolvedValue = encodeValue(descriptor.value, context, new Set(), 0)
      const identity = {
        varName: varName.present ? varName.value as string : "",
        ...(contract === undefined ? {} : { contract: encodeValue(contract, context, new Set(), 0) }),
      }
      setOwn(output, key, styleValueNode(context, { kind: "theme-token", identity, resolvedValue }))
    } else {
      setOwn(output, key, encodeValue(descriptor.value, context, new Set(), 0))
    }
  }
  return output
}

function createPropertyExplanations(
  originalStyle: Readonly<Record<string, unknown>>,
  resolvedStyle: unknown,
  metadata: StyleExplanationExportMetadata | undefined,
  theme: SafeTheme | undefined,
  context: EncodingContext,
): StyleExplanationReport["composition"]["properties"] {
  if (!isPlainRecord(resolvedStyle)) return []
  const byProperty = new Map<string, StyleExplanationDeclaration[]>()
  for (const candidate of metadata?.candidates ?? []) {
    const declarations = byProperty.get(candidate.canonicalProperty) ?? []
    declarations.push(candidate)
    byProperty.set(candidate.canonicalProperty, declarations)
  }
  const properties = Object.keys(resolvedStyle).sort()
  return properties.map(property => {
    const descriptor = Object.getOwnPropertyDescriptor(resolvedStyle, property)
    const value = descriptor !== undefined && "value" in descriptor
      ? encodeResolvedStyle({ [property]: descriptor.value }, originalStyle, theme, context)
      : opaqueNode(context, "accessor")
    const propertyValue = isPlainRecord(value)
      ? readOptionalOwnData(value, property)
      : { present: true as const, value }
    const declarations = [...(byProperty.get(property) ?? [])].sort((left, right) => left.order - right.order)
    const baseCoverage = metadata?.coverage ?? { status: "unavailable" as const, reasons: ["metadata-missing" as const] }
    const encodedValue = propertyValue.present ? propertyValue.value as StyleExplanationValue : opaqueNode(context, "unsupported-object")
    const propertyHasOpaque = containsOpaque(encodedValue)
    return {
      property,
      value: encodedValue,
      ...(declarations.length === 0 ? {} : { winner: declarations.at(-1)! }),
      overridden: declarations.slice(0, -1),
      coverage: combineCoverage(baseCoverage, propertyHasOpaque ? ["opaque-value"] : []),
    }
  })
}

function createThemeTransition(args: {
  readonly exportPath: StyleExplanationPath
  readonly currentTheme: SafeTheme | undefined
  readonly previousTheme: SafeTheme | undefined
  readonly previousWasProvided: boolean
  readonly dependencyEntry: ThemeDependencyPlanEntry | undefined
  readonly dependencyMetadataMissing: boolean
  readonly metadataAvailable: boolean
  readonly style: Readonly<Record<string, unknown>>
}, context: EncodingContext): {
  readonly report: StyleExplanationReport["transition"]
  readonly changedTokens: ReadonlyArray<string>
} {
  if (!args.metadataAvailable) {
    return { report: { status: "unavailable", changedInputs: [], affectedPaths: [] }, changedTokens: [] }
  }
  if (!args.previousWasProvided) {
    return { report: { status: "not-compared", changedInputs: [], affectedPaths: [] }, changedTokens: [] }
  }
  if (args.currentTheme === undefined || args.previousTheme === undefined || args.dependencyMetadataMissing) {
    return { report: { status: "unavailable", changedInputs: [], affectedPaths: [] }, changedTokens: [] }
  }

  const changedInputs = compareThemeInputs(args.previousTheme, args.currentTheme, context)
  const tokens = args.dependencyEntry?.tokens ?? []
  const plan = createThemeDependencyPlan([{ path: ["style"], tokens }])
  const resolver = createThemeDependencyResolver({ style: args.style }, plan)
  resolver.resolve(args.previousTheme)
  const resolution = resolver.resolve(args.currentTheme)
  const changedTokens = resolution.metrics.changedTokens
  const affectedPaths = changedTokens.length === 0 ? [] : [Object.freeze([...args.exportPath])]
  return {
    report: {
      status: resolution.metrics.notifications > 0 ? "relevant-input-change" : "no-effective-change",
      changedInputs,
      affectedPaths,
    },
    changedTokens,
  }
}

function compareThemeInputs(
  previous: SafeTheme,
  current: SafeTheme,
  context: EncodingContext,
): StyleExplanationReport["transition"]["changedInputs"] {
  if (previous.contract !== current.contract) {
    const previousIdentity = safeContractIdentity(previous.contract)
    const currentIdentity = safeContractIdentity(current.contract)
    return [{
      kind: "theme-contract",
      path: ["contract"],
      ...(previousIdentity === undefined ? {} : { previous: encodeValue(previousIdentity, context, new Set(), 0) }),
      ...(currentIdentity === undefined ? {} : { current: encodeValue(currentIdentity, context, new Set(), 0) }),
    }]
  }

  const names = new Set([...Object.keys(previous.tokens), ...Object.keys(current.tokens)])
  const changed: StyleExplanationReport["transition"]["changedInputs"][number][] = []
  for (const token of [...names].sort()) {
    const previousValue = readOptionalOwnData(previous.tokens, token)
    const currentValue = readOptionalOwnData(current.tokens, token)
    const previousRaw = previousValue.present ? previousValue.value : undefined
    const currentRaw = currentValue.present ? currentValue.value : undefined
    if (previousValue.present === currentValue.present && Object.is(previousRaw, currentRaw)) continue
    changed.push({
      kind: "theme-token",
      path: [token],
      previous: encodeValue(previousValue.present ? previousValue.value : undefined, context, new Set(), 0),
      current: encodeValue(currentValue.present ? currentValue.value : undefined, context, new Set(), 0),
    })
  }
  return changed
}

function safeContractIdentity(contract: unknown): unknown {
  try {
    return getThemeContractIdentity(contract)
  } catch {
    return undefined
  }
}

function encodeValue(
  value: unknown,
  context: EncodingContext,
  ancestors: Set<object>,
  depth: number,
): StyleExplanationValue {
  if (value === undefined) return styleValueNode(context, { kind: "undefined" })
  if (value === null || typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return opaqueNode(context, "non-finite-number")
    return Object.is(value, -0) ? styleValueNode(context, { kind: "negative-zero" }) : value
  }
  if (typeof value === "function") return opaqueNode(context, "function")
  if (typeof value === "symbol") return opaqueNode(context, "symbol")
  if (typeof value === "bigint") return opaqueNode(context, "bigint")
  if (!isObject(value)) return opaqueNode(context, "unsupported-object")
  if (context.generatedNodes.has(value)) return value as StyleExplanationValue
  if (depth >= MAX_VALUE_DEPTH) return opaqueNode(context, "depth-limit")
  if (ancestors.has(value)) return opaqueNode(context, "cycle")

  let prototype: object | null
  let keys: ReadonlyArray<PropertyKey>
  try {
    prototype = Object.getPrototypeOf(value)
    keys = Reflect.ownKeys(value)
  } catch {
    return opaqueNode(context, "unsupported-object")
  }
  if (prototype !== Object.prototype && prototype !== null && prototype !== Array.prototype) {
    return opaqueNode(context, "unsupported-object")
  }
  if (keys.some(key => typeof key !== "string")) return opaqueNode(context, "symbol")
  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      const entries = readSafeArray(value)
      if (entries === undefined || keys.length !== entries.length + 1) return opaqueNode(context, "unsupported-object")
      return entries.map(entry => encodeValue(entry, context, ancestors, depth + 1))
    }
    const result = emptyRecord() as Record<string, StyleExplanationValue>
    for (const key of keys as ReadonlyArray<string>) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (descriptor === undefined || !descriptor.enumerable) continue
      setOwn(result, key, "value" in descriptor
        ? encodeValue(descriptor.value, context, ancestors, depth + 1)
        : opaqueNode(context, "accessor"))
    }
    return result
  } catch {
    return opaqueNode(context, "unsupported-object")
  } finally {
    ancestors.delete(value)
  }
}

function styleValueNode(
  context: EncodingContext,
  node: { readonly kind: string; readonly [key: string]: unknown },
): StyleExplanationValue {
  const value = { $$type: STYLE_EXPLANATION_VALUE_TYPE, version: STYLE_EXPLANATION_VERSION, ...node }
  context.generatedNodes.add(value)
  return value as StyleExplanationValue
}

function opaqueNode(
  context: EncodingContext,
  reason: Extract<StyleExplanationValue, { readonly kind: "opaque" }> ["reason"],
): StyleExplanationValue {
  context.opaqueFound = true
  return styleValueNode(context, { kind: "opaque", reason })
}

function isStyleValueNode(value: unknown, context: EncodingContext): value is StyleExplanationValue {
  return isObject(value) && context.generatedNodes.has(value)
}

function isOpaqueNode(value: unknown, context: EncodingContext): boolean {
  return isStyleValueNode(value, context) && (value as { readonly kind?: unknown }).kind === "opaque"
}

function containsOpaque(value: StyleExplanationValue): boolean {
  if (value !== null && typeof value === "object") {
    if ("kind" in value && value.kind === "opaque") return true
    return Object.values(value).some(child => containsOpaque(child as StyleExplanationValue))
  }
  return false
}

function combineCoverage(
  base: StyleExplanationCoverage,
  extraReasons: ReadonlyArray<StyleExplanationCoverageReason>,
): StyleExplanationCoverage {
  const reasons = [...new Set([...base.reasons, ...extraReasons])].sort()
  if (base.status === "unavailable") return { status: "unavailable", reasons }
  if (base.status === "partial" || reasons.length > 0) return { status: "partial", reasons }
  return { status: "complete", reasons: [] }
}

function mergeStyle(target: Record<string, unknown>, source: Readonly<Record<string, unknown>>): void {
  for (const key of Object.keys(source)) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key)
    if (descriptor !== undefined && "value" in descriptor) setOwn(target, key, descriptor.value)
  }
}

function setOwn(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, { value, enumerable: true, configurable: true, writable: true })
}

function emptyRecord(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isObject(value) || Array.isArray(value)) return false
  try {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  } catch {
    return false
  }
}

function samePath(left: ReadonlyArray<string | number>, right: ReadonlyArray<string | number>): boolean {
  return left.length === right.length && left.every((segment, index) => segment === right[index])
}

function sameStrings(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function formatPath(path: StyleExplanationPath): string {
  return path.map(segment => typeof segment === "number" ? `[${segment}]` : segment).join(".")
}

function deepFreeze<T>(value: T, visited = new Set<object>()): T {
  if (!isObject(value) || visited.has(value)) return value
  visited.add(value)
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor !== undefined && "value" in descriptor) deepFreeze(descriptor.value, visited)
  }
  return Object.freeze(value)
}
