import {
  traceNativeConditionBranches,
  type NativeConditionBranch,
  type NativeConditionMatcher,
  type NativeConditionSnapshot,
} from "../conditions"
import { isNativeExpression, evaluateNativeExpressionWithTrace } from "../expressions"
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
import { nativeComponentContractIdentityKey } from "../components/contracts"
import {
  createRecipeResolutionPlan,
  resolveRecipeResolutionPlan,
} from "../runtime/recipe-resolution-plan"
import {
  createComponentRecipeResolutionPlan,
  matchesComponentRecipeSelectedState,
  resolveComponentRecipeResolutionPlan,
} from "../runtime/component-recipe-resolution-plan"
import {
  createSprinklesResolutionPlan,
  resolveSprinklesLookupPlan,
} from "../runtime/sprinkles-resolution-plan"
import {
  STYLE_EXPLANATION_REPORT_TYPE,
  STYLE_EXPLANATION_VALUE_TYPE,
  STYLE_EXPLANATION_VERSION,
  type ExplainStyleInput,
  type StyleExplanationCoverage,
  type StyleExplanationCoverageReason,
  type StyleExplanationDeclaration,
  type StyleExplanationBranchDecision,
  type StyleExplanationConditionDecision,
  type StyleExplanationExportMetadata,
  type StyleExplanationExpressionDecision,
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
type TargetResolution = {
  readonly flattened: FlattenedStyle
  readonly slots?: ReadonlyArray<string>
  readonly branches: ReadonlyArray<StyleExplanationBranchDecision>
  readonly conditionDecisions: ReadonlyArray<StyleExplanationConditionDecision>
  readonly expressionMatches: ReadonlyArray<StyleExplanationExpressionDecision>
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
      if (exportMetadata === undefined && !isDynamicStyleDescriptor(sourceStyle)) {
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
  const currentTheme = readSnapshotTheme(currentSnapshot)
  const previousSnapshotField = readOptionalOwnData(input, "previous")
  const previousSnapshot = previousSnapshotField.present ? previousSnapshotField.value : undefined
  const previousTheme = previousSnapshot === undefined ? undefined : readSnapshotTheme(previousSnapshot)
  const currentResolution = resolveStyleTarget(sourceStyle, currentSnapshot, normalizedPath, metadata, context)
  const flattened = currentResolution.flattened
  const currentMetadata = composeExportMetadata(metadata, normalizedPath, currentResolution)
  const dependencyPlan = readDependencyPlan(module)
  const declaredTokens = [...(currentMetadata?.tokenDependencies ?? [])].sort()
  const activeTokens = collectActiveTokens(flattened.style, context)
  const selectedDependencyEntries = dependencyPlan?.entries.filter(entry =>
    samePath(entry.path, normalizedPath) || currentResolution.branches.some(branch =>
      branch.selected && isPathPrefix(branch.path, entry.path))) ?? []
  const dependencyTokens = [...new Set(selectedDependencyEntries.flatMap(entry => entry.tokens))].sort()
  const dependencyEntry = selectedDependencyEntries.length === 0 ? undefined : {
    path: normalizedPath,
    tokens: dependencyTokens,
  }
  const dependencyMetadataMissing = metadata !== undefined && (
    activeTokens.some(token => !declaredTokens.includes(token)) ||
    (declaredTokens.length > 0 && dependencyEntry === undefined) ||
    (dependencyEntry !== undefined && !sameStrings(dependencyTokens, declaredTokens))
  )
  const coverage = combineCoverage(
    metadata === undefined
      ? { status: "unavailable", reasons: ["metadata-missing"] }
      : currentMetadata?.coverage ?? { status: "partial", reasons: ["compatibility-only"] },
    [
      ...(context.opaqueFound ? ["opaque-value" as const] : []),
      ...(dependencyMetadataMissing ? ["dependency-metadata-missing" as const] : []),
    ],
  )

  const resolvedStyle = resolveStyleOutput(flattened, currentResolution.slots, currentTheme)

  const encodedResolution = encodeStyleOutput(
    resolvedStyle,
    flattened.style,
    currentResolution.slots,
    currentTheme,
    context,
  )
  const propertyExplanations = createStylePropertyExplanations(
    flattened.style,
    resolvedStyle,
    currentResolution.slots,
    currentMetadata,
    metadata,
    normalizedPath,
    currentResolution,
    currentTheme,
    context,
  )
  const themeTransition = createThemeTransition({
    exportPath: normalizedPath,
    currentTheme,
    previousTheme,
    previousWasProvided: previousSnapshot !== undefined,
    dependencyEntry,
    dependencyMetadataMissing,
    metadataAvailable: metadata !== undefined,
    style: flattenSlotsForDependencyResolution(flattened.style, currentResolution.slots),
  }, context)

  const transition = createExplicitInputTransition({
    exportPath: normalizedPath,
    sourceStyle,
    metadata,
    currentSnapshot,
    previousSnapshot,
    currentResolution,
    currentResolvedStyle: encodedResolution,
    previousTheme,
    metadataAvailable: metadata !== undefined,
    themeTransition,
    context,
  })

  const conditions = readSnapshotConditions(currentSnapshot)

  const report: StyleExplanationReport = {
    $$type: STYLE_EXPLANATION_REPORT_TYPE,
    version: STYLE_EXPLANATION_VERSION,
    target: {
      ...(metadata === undefined ? {} : { moduleId: metadata.moduleId }),
      exportPath: normalizedPath,
    },
    resolution: { value: encodedResolution, branches: currentResolution.branches },
    conditions: {
      ...(conditions === undefined ? {} : { snapshot: conditions }),
      decisions: currentResolution.conditionDecisions,
      expressionMatches: currentResolution.expressionMatches,
    },
    composition: { properties: propertyExplanations },
    dependencies: {
      declaredTokens,
      activeTokens,
      changedTokens: themeTransition.changedTokens,
    },
    transition,
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

function resolveStyleTarget(
  source: unknown,
  snapshot: unknown,
  exportPath: StyleExplanationPath,
  metadata: StyleExplanationMetadata | undefined,
  context: EncodingContext,
): TargetResolution {
  const tag = readOptionalOwnData(source, "$$type")
  let flattened: FlattenedStyle
  let slots: ReadonlyArray<string> | undefined
  let branches: StyleExplanationBranchDecision[] = []

  if (tag.present && tag.value === "crumbs.css.recipe") {
    const recipe = cloneRuntimeValue(source, context, new Set(), 0)
    if (!isPlainRecord(recipe)) return emptyTargetResolution(source, exportPath, metadata, snapshot, context)
    const plan = createRecipeResolutionPlan(recipe as never)
    const selection = readSnapshotSelection(snapshot)
    const selected = { ...plan.defaultSelection, ...selection }
    const styles = resolveRecipeResolutionPlan(plan, selection)
    flattened = flattenStyle(styles, context)
    branches = recipeBranchDecisions(plan, selected, exportPath, metadata?.moduleId)
  } else if (tag.present && tag.value === "crumbs.css.component-recipe") {
    const recipe = cloneRuntimeValue(source, context, new Set(), 0)
    if (!isPlainRecord(recipe)) return emptyTargetResolution(source, exportPath, metadata, snapshot, context)
    const extensions = readSnapshotExtensions(snapshot)
    const plan = createComponentRecipeResolutionPlan(recipe as never, { extensions: extensions as never })
    const selection = readSnapshotSelection(snapshot)
    const selected = { ...plan.defaultSelection, ...selection }
    const resolved = resolveComponentRecipeResolutionPlan(plan, selection)
    slots = plan.slotOrder
    const slotStyles = emptyRecord()
    for (const slot of slots) {
      const styles = readOptionalOwnData(resolved, slot)
      setOwn(slotStyles, slot, flattenStyle(styles.present ? styles.value : [], context).style)
    }
    flattened = { style: slotStyles }
    branches = componentBranchDecisions(plan, selected, exportPath, metadata?.moduleId)
  } else if (tag.present && tag.value === "crumbs.css.sprinkles-lookup-plan") {
    const lookup = cloneRuntimeValue(source, context, new Set(), 0)
    if (!isPlainRecord(lookup)) return emptyTargetResolution(source, exportPath, metadata, snapshot, context)
    const plan = createSprinklesResolutionPlan(lookup as never)
    const selection = readSnapshotSelection(snapshot)
    const styles = resolveSprinklesLookupPlan(plan, selection as never)
    flattened = flattenStyle(styles, context)
    branches = sprinklesBranchDecisions(plan, selection, exportPath, metadata?.moduleId)
  } else {
    flattened = flattenStyle(source, context)
  }

  const conditions = readSnapshotConditions(snapshot)
  const conditionTrace = createConditionTrace(metadata, exportPath, conditions)
  const conditionBranches = conditionTrace.branches
  const expressionMatches = collectExpressionMatches(
    flattened.style,
    exportPath,
    conditions,
    readSnapshotTheme(snapshot),
    context,
  )
  branches = [...branches, ...conditionBranches, ...expressionMatches.map((match, order) => ({
    kind: "expression" as const,
    path: match.path,
    identity: `expression:${formatPath(match.path)}:${order}`,
    order,
    matched: true,
    selected: true,
  }))]
  return {
    flattened,
    ...(slots === undefined ? {} : { slots }),
    branches,
    conditionDecisions: conditionTrace.decisions,
    expressionMatches,
  }
}

function isDynamicStyleDescriptor(value: unknown): boolean {
  const tag = readOptionalOwnData(value, "$$type")
  return tag.present && (tag.value === "crumbs.css.recipe" ||
    tag.value === "crumbs.css.component-recipe" ||
    tag.value === "crumbs.css.sprinkles-lookup-plan")
}

function composeExportMetadata(
  metadata: StyleExplanationMetadata | undefined,
  exportPath: StyleExplanationPath,
  resolution: TargetResolution,
): StyleExplanationExportMetadata | undefined {
  if (metadata === undefined) return undefined
  const root = metadata.exports.find(entry => samePath(entry.path, exportPath))
  const related: StyleExplanationExportMetadata[] = []
  const seen = new Set<string>()
  const add = (entry: StyleExplanationExportMetadata): void => {
    const key = JSON.stringify(entry.path)
    if (seen.has(key)) return
    seen.add(key)
    related.push(entry)
  }
  if (root !== undefined) add(root)
  for (const branch of resolution.branches) {
    if (!branch.selected) continue
    const branchEntries = metadata.exports.filter(entry => isPathPrefix(branch.path, entry.path))
      .sort((left, right) => comparePath(left.path, right.path))
    for (const entry of branchEntries) add(entry)
  }
  const candidates = related.flatMap(entry => entry.candidates)
    .map((candidate, order) => ({ ...candidate, order }))
  const tokenDependencies = [...new Set(related.flatMap(entry => entry.tokenDependencies))].sort()
  const coverage = root?.coverage ?? { status: "partial" as const, reasons: ["compatibility-only" as const] }
  return {
    path: exportPath,
    candidates,
    branches: root?.branches ?? [],
    tokenDependencies,
    coverage,
  }
}

function emptyTargetResolution(
  source: unknown,
  exportPath: StyleExplanationPath,
  metadata: StyleExplanationMetadata | undefined,
  snapshot: unknown,
  context: EncodingContext,
): TargetResolution {
  const flattened = flattenStyle(source, context)
  const conditions = readSnapshotConditions(snapshot)
  const conditionTrace = createConditionTrace(metadata, exportPath, conditions)
  return {
    flattened,
    branches: conditionTrace.branches,
    conditionDecisions: conditionTrace.decisions,
    expressionMatches: collectExpressionMatches(flattened.style, exportPath, conditions, readSnapshotTheme(snapshot), context),
  }
}

function recipeBranchDecisions(
  plan: ReturnType<typeof createRecipeResolutionPlan>,
  selection: Readonly<Record<string, unknown>>,
  exportPath: StyleExplanationPath,
  moduleId: string | undefined,
): StyleExplanationBranchDecision[] {
  const decisions: StyleExplanationBranchDecision[] = []
  const add = (path: StyleExplanationPath, order: number, matched: boolean, reason?: StyleExplanationBranchDecision["reason"]) => {
    decisions.push({
      kind: "recipe", path, identity: branchIdentity(moduleId, path), order, matched, selected: matched,
      ...(reason === undefined ? {} : { reason }),
    })
  }
  if (plan.recipe.base !== undefined) add([...exportPath, "base"], 0, true)
  let order = decisions.length
  for (const variant of plan.variants) {
    const selectedValue = selection[variant.name]
    for (const value of Object.keys(variant.values)) {
      const matched = selectedValue !== undefined && String(selectedValue) === value
      add([...exportPath, "variants", variant.name, value], order++, matched,
        matched ? undefined : selectedValue === undefined ? "not-selected" : "selection-mismatch")
    }
  }
  for (let index = 0; index < plan.compoundMatchers.length; index += 1) {
    const matched = plan.compoundMatchers[index]!.matches(selection)
    add([...exportPath, "compoundVariants", index, "style"], order++, matched,
      matched ? undefined : "compound-mismatch")
  }
  return decisions
}

function componentBranchDecisions(
  plan: ReturnType<typeof createComponentRecipeResolutionPlan>,
  selection: Readonly<Record<string, unknown>>,
  exportPath: StyleExplanationPath,
  moduleId: string | undefined,
): StyleExplanationBranchDecision[] {
  const decisions: StyleExplanationBranchDecision[] = []
  let order = 0
  const stateRejected = plan.stateConstraint !== undefined &&
    !matchesComponentRecipeSelectedState(plan.stateConstraint, selection)
  for (const slot of plan.slotOrder) {
    if (plan.base[slot] !== undefined) {
      const path = [...exportPath, "base", slot]
      decisions.push({ kind: "component-recipe", path, identity: branchIdentity(moduleId, path), order: order++, matched: true, selected: true })
    }
  }
  for (const variant of plan.variants) {
    const selectedValue = selection[variant.name]
    for (const value of Object.keys(variant.values)) {
      const valid = (typeof selectedValue === "string" || typeof selectedValue === "boolean") &&
        String(selectedValue) === value
      const matched = valid && !stateRejected
      const path = [...exportPath, "variants", variant.name, value]
      decisions.push({
        kind: "component-recipe", path, identity: branchIdentity(moduleId, path), order: order++, matched,
        selected: matched,
        ...(!matched ? { reason: stateRejected ? "state-rejected" as const : selectedValue === undefined ? "not-selected" as const : "selection-mismatch" as const } : {}),
      })
    }
  }
  for (let index = 0; index < plan.compoundMatchers.length; index += 1) {
    const matched = !stateRejected && plan.compoundMatchers[index]!.matches(selection)
    const path = [...exportPath, "compoundVariants", index]
    decisions.push({
      kind: "component-recipe", path, identity: branchIdentity(moduleId, path), order: order++, matched, selected: matched,
      ...(!matched ? { reason: stateRejected ? "state-rejected" as const : "compound-mismatch" as const } : {}),
    })
  }
  for (let index = 0; index < (plan.extensionPlan?.extensions.length ?? 0); index += 1) {
    const extension = plan.extensionPlan!.extensions[index]!
    const identity = nativeComponentContractIdentityKey(extension.identity)
    const path = [...exportPath, "extensions", index]
    decisions.push({ kind: "extension", path, identity, order: order++, matched: true, selected: true })
  }
  if (stateRejected) {
    const path = [...exportPath, "state"]
    decisions.push({ kind: "component-recipe", path, identity: branchIdentity(moduleId, path), order: order++, matched: false, selected: false, reason: "state-rejected" })
  }
  return decisions
}

function sprinklesBranchDecisions(
  plan: ReturnType<typeof createSprinklesResolutionPlan>,
  selection: Readonly<Record<string, unknown>>,
  exportPath: StyleExplanationPath,
  moduleId: string | undefined,
): StyleExplanationBranchDecision[] {
  const decisions: StyleExplanationBranchDecision[] = []
  let order = 0
  for (const name of Object.keys(selection)) {
    const value = selection[name]
    if (value === undefined || value === null || value === false) continue
    const targets = Object.hasOwn(plan.properties, name)
      ? [name]
      : Object.hasOwn(plan.shorthands, name) ? plan.shorthands[name] ?? [] : []
    for (const target of targets) {
      const path = [...exportPath, "sprinkles", name, target]
      decisions.push({ kind: "sprinkles", path, identity: branchIdentity(moduleId, path), order: order++, matched: true, selected: true })
    }
  }
  return decisions
}

function createConditionTrace(
  metadata: StyleExplanationMetadata | undefined,
  exportPath: StyleExplanationPath,
  conditions: NativeConditionSnapshot | undefined,
): {
  readonly branches: ReadonlyArray<StyleExplanationBranchDecision>
  readonly decisions: ReadonlyArray<StyleExplanationConditionDecision>
} {
  if (metadata === undefined || conditions === undefined) return { branches: [], decisions: [] }
  const entries = metadata.exports.flatMap(entry => entry.branches)
    .filter(branch => isPathPrefix(exportPath, branch.path))
    .filter(branch => branch.kind === "condition")
    .sort((left, right) => left.order - right.order)
  const localEntries = entries.length > 0 ? entries : []
  const candidates: Array<NativeConditionBranch<number>> = localEntries.map((entry, index) => ({
    when: conditionMatcher(entry.selector),
    value: index,
  }))
  if (candidates.length === 0) return { branches: [], decisions: [] }
  const trace = traceNativeConditionBranches(candidates, conditions, -1)
  const decisions = trace.decisions.map((decision, index) => {
    const entry = localEntries[index]!
    const matchedAxes = Object.keys(decision.matcher).filter(axis =>
      (decision.matcher as Record<string, unknown>)[axis] === conditions[axis as keyof NativeConditionSnapshot]) as Array<keyof NativeConditionSnapshot>
    return {
      path: entry.path,
      identity: entry.identity,
      matcher: decision.matcher,
      matchedAxes,
      specificity: decision.specificity,
      declarationOrder: entry.order,
      matched: decision.matched,
      selected: decision.selected,
    }
  })
  const branches = decisions.map((decision, index) => {
    const entry = localEntries[index]!
    return {
      kind: "condition" as const,
      path: entry.path,
      identity: entry.identity,
      order: entry.order,
      matched: decision.matched,
      selected: decision.selected,
      ...(!decision.matched ? { reason: "condition-unmatched" as const } : !decision.selected ? { reason: "superseded" as const } : {}),
    }
  })
  return { branches, decisions }
}

function conditionMatcher(selector: Readonly<Record<string, StyleExplanationValue>>): NativeConditionMatcher {
  const matcher = emptyRecord()
  for (const [key, value] of Object.entries(selector)) {
    if (typeof value === "string") setOwn(matcher, key, value)
  }
  return matcher as NativeConditionMatcher
}

function collectExpressionMatches(
  value: unknown,
  basePath: StyleExplanationPath,
  conditions: NativeConditionSnapshot | undefined,
  theme: SafeTheme | undefined,
  context: EncodingContext,
): StyleExplanationExpressionDecision[] {
  if (conditions === undefined) return []
  const matches: StyleExplanationExpressionDecision[] = []
  const visited = new Set<object>()
  const visit = (candidate: unknown, path: StyleExplanationPath): void => {
    if (!isObject(candidate) || visited.has(candidate)) return
    if (isNativeExpression(candidate)) {
      try {
        const traced = evaluateNativeExpressionWithTrace(candidate, {
          conditions,
          ...(theme === undefined ? {} : { tokens: theme.tokens as Readonly<Record<string, unknown>> }),
        })
        for (const result of traced.matches) {
          matches.push({ path, ...result })
        }
      } catch {
        context.opaqueFound = true
      }
      return
    }
    visited.add(candidate)
    try {
      for (const key of Reflect.ownKeys(candidate)) {
        if (typeof key !== "string") continue
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key)
        if (descriptor !== undefined && descriptor.enumerable && "value" in descriptor) {
          visit(descriptor.value, [...path, key])
        }
      }
    } catch {
      context.opaqueFound = true
    }
  }
  visit(value, basePath)
  return matches
}

function readSnapshotSelection(snapshot: unknown): Readonly<Record<string, unknown>> {
  const field = readOptionalOwnData(snapshot, "selection")
  if (!field.present || field.value === undefined) return emptyRecord()
  if (!isPlainRecord(field.value)) throw new TypeError("Style explanation selection must be a plain data record")
  const selection = emptyRecord()
  for (const key of Reflect.ownKeys(field.value)) {
    if (typeof key !== "string") throw new TypeError("Style explanation selection keys must be strings")
    const descriptor = Object.getOwnPropertyDescriptor(field.value, key)
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError("Style explanation selection must contain enumerable data properties")
    }
    if (descriptor.value !== null && descriptor.value !== undefined &&
      typeof descriptor.value !== "string" && typeof descriptor.value !== "boolean" && typeof descriptor.value !== "number") {
      throw new TypeError("Style explanation selection values must be primitive variant values")
    }
    setOwn(selection, key, descriptor.value)
  }
  return selection
}

function readSnapshotExtensions(snapshot: unknown): ReadonlyArray<unknown> {
  const field = readOptionalOwnData(snapshot, "extensions")
  if (!field.present || field.value === undefined) return []
  const extensions = readSafeArray(field.value)
  if (extensions === undefined) throw new TypeError("Style explanation extensions must be a dense data array")
  return extensions
}

function branchIdentity(moduleId: string | undefined, path: StyleExplanationPath): string {
  return `${moduleId ?? "export"}#${formatPath(path)}`
}

function resolveStyleOutput(
  flattened: FlattenedStyle,
  slots: ReadonlyArray<string> | undefined,
  theme: SafeTheme | undefined,
): unknown {
  if (flattened.rootOpaque !== undefined) return flattened.rootOpaque
  if (slots === undefined) {
    return theme === undefined ? flattened.style : resolveThemeTokens(flattened.style, theme) ?? emptyRecord()
  }
  const output = emptyRecord()
  for (const slot of slots) {
    const style = readOptionalOwnData(flattened.style, slot)
    const slotStyle = style.present && isPlainRecord(style.value) ? style.value : emptyRecord()
    setOwn(output, slot, theme === undefined ? slotStyle : resolveThemeTokens(slotStyle, theme) ?? emptyRecord())
  }
  return output
}

function flattenSlotsForDependencyResolution(
  style: Readonly<Record<string, unknown>>,
  slots: ReadonlyArray<string> | undefined,
): Readonly<Record<string, unknown>> {
  if (slots === undefined) return style
  const flattened = emptyRecord()
  for (const slot of slots) {
    const slotField = readOptionalOwnData(style, slot)
    if (!slotField.present || !isPlainRecord(slotField.value)) continue
    for (const property of Object.keys(slotField.value)) {
      const descriptor = Object.getOwnPropertyDescriptor(slotField.value, property)
      if (descriptor !== undefined && "value" in descriptor) {
        setOwn(flattened, `${slot}.${property}`, descriptor.value)
      }
    }
  }
  return flattened
}

function encodeStyleOutput(
  resolvedStyle: unknown,
  originalStyle: Readonly<Record<string, unknown>>,
  slots: ReadonlyArray<string> | undefined,
  theme: SafeTheme | undefined,
  context: EncodingContext,
): StyleExplanationValue {
  if (slots === undefined || !isPlainRecord(resolvedStyle)) {
    return encodeResolvedStyle(resolvedStyle, originalStyle, theme, context)
  }
  const output = emptyRecord() as Record<string, StyleExplanationValue>
  for (const slot of slots) {
    const original = readOptionalOwnData(originalStyle, slot)
    const resolved = readOptionalOwnData(resolvedStyle, slot)
    setOwn(output, slot, encodeResolvedStyle(
      resolved.present ? resolved.value : emptyRecord(),
      original.present && isPlainRecord(original.value) ? original.value : emptyRecord(),
      theme,
      context,
    ))
  }
  return output
}

function createStylePropertyExplanations(
  originalStyle: Readonly<Record<string, unknown>>,
  resolvedStyle: unknown,
  slots: ReadonlyArray<string> | undefined,
  metadata: StyleExplanationExportMetadata | undefined,
  allMetadata: StyleExplanationMetadata | undefined,
  exportPath: StyleExplanationPath,
  resolution: TargetResolution,
  theme: SafeTheme | undefined,
  context: EncodingContext,
): StyleExplanationReport["composition"]["properties"] {
  if (slots === undefined || !isPlainRecord(resolvedStyle)) {
    return createPropertyExplanations(originalStyle, resolvedStyle, metadata, theme, context)
  }
  return slots.flatMap(slot => {
    const original = readOptionalOwnData(originalStyle, slot)
    const resolved = readOptionalOwnData(resolvedStyle, slot)
    if (!resolved.present || !isPlainRecord(resolved.value)) return []
    const slotMetadata = composeSlotMetadata(allMetadata, exportPath, slot, resolution)
    return createPropertyExplanations(
      original.present && isPlainRecord(original.value) ? original.value : emptyRecord(),
      resolved.value,
      slotMetadata ?? metadata,
      theme,
      context,
    ).map(property => ({ ...property, slot }))
  })
}

function composeSlotMetadata(
  metadata: StyleExplanationMetadata | undefined,
  exportPath: StyleExplanationPath,
  slot: string,
  resolution: TargetResolution,
): StyleExplanationExportMetadata | undefined {
  if (metadata === undefined) return undefined
  const selectedEntries: StyleExplanationExportMetadata[] = []
  const seen = new Set<string>()
  for (const branch of resolution.branches) {
    if (!branch.selected) continue
    const entries = metadata.exports.filter(entry =>
      isPathPrefix(branch.path, entry.path) && entry.path.slice(exportPath.length).includes(slot))
      .sort((left, right) => comparePath(left.path, right.path))
    for (const entry of entries) {
      const key = JSON.stringify(entry.path)
      if (seen.has(key)) continue
      seen.add(key)
      selectedEntries.push(entry)
    }
  }
  const root = metadata.exports.find(entry => samePath(entry.path, exportPath))
  return {
    path: [...exportPath, slot],
    candidates: selectedEntries.flatMap(entry => entry.candidates)
      .map((candidate, order) => ({ ...candidate, order })),
    branches: [],
    tokenDependencies: [...new Set(selectedEntries.flatMap(entry => entry.tokenDependencies))].sort(),
    coverage: root?.coverage ?? { status: "partial", reasons: ["compatibility-only"] },
  }
}

function createExplicitInputTransition(args: {
  readonly exportPath: StyleExplanationPath
  readonly sourceStyle: unknown
  readonly metadata: StyleExplanationMetadata | undefined
  readonly currentSnapshot: unknown
  readonly previousSnapshot: unknown
  readonly currentResolution: TargetResolution
  readonly currentResolvedStyle: StyleExplanationValue
  readonly previousTheme: SafeTheme | undefined
  readonly metadataAvailable: boolean
  readonly themeTransition: ReturnType<typeof createThemeTransition>
  readonly context: EncodingContext
}): StyleExplanationReport["transition"] {
  if (args.previousSnapshot === undefined) return args.themeTransition.report
  const changedInputs = compareExplicitInputs(args.previousSnapshot, args.currentSnapshot, args.context)
  if (changedInputs.length === 0) return args.themeTransition.report
  if (!args.metadataAvailable) return { status: "unavailable", changedInputs: [], affectedPaths: [] }
  const previousResolution = resolveStyleTarget(
    args.sourceStyle,
    args.previousSnapshot,
    args.exportPath,
    args.metadata,
    args.context,
  )
  const previousStyle = resolveStyleOutput(previousResolution.flattened, previousResolution.slots, args.previousTheme)
  const previousEncoded = encodeStyleOutput(previousStyle, previousResolution.flattened.style, previousResolution.slots, args.previousTheme, args.context)
  const previousFingerprint = resolutionFingerprint(previousEncoded, previousResolution)
  const currentFingerprint = resolutionFingerprint(args.currentResolvedStyle, args.currentResolution)
  const effectiveChange = previousFingerprint !== currentFingerprint
  const combined = [...args.themeTransition.report.changedInputs, ...changedInputs].sort(compareChangedInputs)
  return {
    status: effectiveChange ? "relevant-input-change" : "no-effective-change",
    changedInputs: combined,
    affectedPaths: effectiveChange ? [Object.freeze([...args.exportPath])] : [],
  }
}

function compareExplicitInputs(
  previous: unknown,
  current: unknown,
  context: EncodingContext,
): StyleExplanationReport["transition"]["changedInputs"] {
  const changes: StyleExplanationReport["transition"]["changedInputs"][number][] = []
  for (const [kind, field] of [["selection", "selection"], ["condition", "conditions"]] as const) {
    const before = readSnapshotRecord(previous, field)
    const after = readSnapshotRecord(current, field)
    for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      const previousValue = readOptionalOwnData(before, key)
      const currentValue = readOptionalOwnData(after, key)
      if ((!previousValue.present && !currentValue.present) ||
        (previousValue.present && currentValue.present && Object.is(previousValue.value, currentValue.value))) continue
      changes.push({
        kind,
        path: [key],
        previous: encodeValue(previousValue.present ? previousValue.value : undefined, context, new Set(), 0),
        current: encodeValue(currentValue.present ? currentValue.value : undefined, context, new Set(), 0),
      })
    }
  }
  const beforeExtensions = extensionIdentities(previous)
  const afterExtensions = extensionIdentities(current)
  if (JSON.stringify(beforeExtensions) !== JSON.stringify(afterExtensions)) {
    changes.push({
      kind: "extension",
      path: ["extensions"],
      previous: encodeValue(beforeExtensions, context, new Set(), 0),
      current: encodeValue(afterExtensions, context, new Set(), 0),
    })
  }
  return changes.sort(compareChangedInputs)
}

function readSnapshotRecord(snapshot: unknown, fieldName: string): Readonly<Record<string, unknown>> {
  const field = readOptionalOwnData(snapshot, fieldName)
  if (!field.present || !isPlainRecord(field.value)) return emptyRecord()
  const result = emptyRecord()
  for (const key of Object.keys(field.value)) {
    const entry = readOptionalOwnData(field.value, key)
    if (entry.present) setOwn(result, key, entry.value)
  }
  return result
}

function extensionIdentities(snapshot: unknown): ReadonlyArray<string> {
  return readSnapshotExtensions(snapshot).map((extension, index) => {
    const identity = readOptionalOwnData(extension, "identity")
    if (!identity.present) return `invalid-extension-${index}`
    const owner = readOptionalOwnData(identity.value, "owner")
    const name = readOptionalOwnData(identity.value, "name")
    const version = readOptionalOwnData(identity.value, "version")
    if (!owner.present || !name.present || !version.present ||
      typeof owner.value !== "string" || typeof name.value !== "string" || typeof version.value !== "number") {
      return `invalid-extension-${index}`
    }
    return nativeComponentContractIdentityKey({ owner: owner.value, name: name.value, version: version.value })
  })
}

function compareChangedInputs(
  left: StyleExplanationReport["transition"]["changedInputs"][number],
  right: StyleExplanationReport["transition"]["changedInputs"][number],
): number {
  return left.kind.localeCompare(right.kind) || formatPath(left.path).localeCompare(formatPath(right.path))
}

function resolutionFingerprint(value: StyleExplanationValue, resolution: TargetResolution): string {
  return JSON.stringify({
    value,
    branches: resolution.branches.map(branch => [branch.kind, branch.identity, branch.selected]),
    conditions: resolution.conditionDecisions.map(decision => [decision.identity, decision.selected]),
    expressions: resolution.expressionMatches.map(match => [match.path, match.value, match.selectedBranch, match.selectedCaseValue]),
  })
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

function collectActiveTokens(
  style: Readonly<Record<string, unknown>>,
  context: EncodingContext,
): ReadonlyArray<string> {
  const tokens = new Set<string>()
  const visited = new Set<object>()
  const visit = (value: unknown): void => {
    if (!isObject(value) || visited.has(value)) return
    const token = readTokenReference(value)
    if (token.kind === "valid") {
      const name = readOptionalOwnData(token.reference, "varName")
      if (name.present && typeof name.value === "string") tokens.add(name.value)
      return
    }
    visited.add(value)
    try {
      for (const key of Reflect.ownKeys(value)) {
        if (typeof key !== "string") {
          context.opaqueFound = true
          continue
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key)
        if (descriptor !== undefined && descriptor.enumerable && "value" in descriptor) visit(descriptor.value)
      }
    } catch {
      context.opaqueFound = true
      return
    }
  }
  visit(style)
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

function comparePath(left: ReadonlyArray<string | number>, right: ReadonlyArray<string | number>): number {
  const length = Math.min(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const a = left[index]!
    const b = right[index]!
    const order = typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b))
    if (order !== 0) return order
  }
  return left.length - right.length
}

function isPathPrefix(prefix: ReadonlyArray<string | number>, path: ReadonlyArray<string | number>): boolean {
  return prefix.length <= path.length && prefix.every((segment, index) => segment === path[index])
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
