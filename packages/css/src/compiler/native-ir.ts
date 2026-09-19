import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as SchemaIssue from "effect/SchemaIssue"
import {
  getNativeCaptureMetadata,
  NativeCaptureMetadataSymbol,
  type NativePrimitiveDomain,
} from "./native-capture"
import { createThemeTokenReference } from "../theme-token"

export type NativeIrDiagnosticCode =
  | "CRUMBS_IR_INVALID_NODE"
  | "CRUMBS_IR_INVALID_PROPERTY"
  | "CRUMBS_IR_INVALID_VALUE"
  | "CRUMBS_IR_PRIMITIVE_MISMATCH"
export type NativeIrDiagnostic = {
  readonly code: NativeIrDiagnosticCode
  readonly phase: "admission"
  readonly property: MigratedScalarProperty
  readonly sourceId: string
  readonly detail: string
}

export class NativeIrAdmissionError extends Error {
  override readonly name = "NativeIrAdmissionError"

  constructor(readonly diagnostics: readonly [NativeIrDiagnostic, ...NativeIrDiagnostic[]]) {
    super(`[crumbs-css:${diagnostics[0].code}] ${diagnostics[0].detail}`)
  }
}

export type LegacyTokenReference = {
  readonly _tag: "LegacyTokenReference"
  readonly varName: string
}
export type SourceProvenance = {
  readonly packageOwner: string
  readonly sourceId: string
  readonly exportPath: ReadonlyArray<string | number>
  readonly logicalPath: ReadonlyArray<string | number>
  readonly origin: "crumbs-native"
}
export type PropertyProvenance = SourceProvenance & {
  readonly authoredProperty: MigratedScalarProperty
  readonly canonicalProperty: MigratedScalarProperty
  readonly shorthandExpansionPath: ReadonlyArray<string>
}
export type MigratedScalarProperty =
  | "opacity" | "zIndex" | "elevation"
  | "flex" | "flexBasis" | "flexGrow" | "flexShrink"
  | "width" | "height" | "minWidth" | "minHeight" | "maxWidth" | "maxHeight"
export type PercentageValue = `${number}%`
export type ScalarDeclarationValue = number | "auto" | PercentageValue | LegacyTokenReference
export type ScalarDeclaration = {
  readonly _tag: "NativeDeclaration"
  readonly property: MigratedScalarProperty
  readonly value: ScalarDeclarationValue
  readonly provenance: PropertyProvenance
}
export type ScalarDeclarationBlock = {
  readonly _tag: "DeclarationBlock"
  readonly primitiveDomain: NativePrimitiveDomain
  readonly declarations: readonly [ScalarDeclaration, ...ScalarDeclaration[]]
  readonly provenance: SourceProvenance
}
export type OpacityDeclarationBlock = ScalarDeclarationBlock & {
  readonly declarations: readonly [ScalarDeclaration & {
    readonly property: "opacity"
    readonly provenance: PropertyProvenance & {
      readonly authoredProperty: "opacity"
      readonly canonicalProperty: "opacity"
    }
  }]
}
export type ScalarCaptureContext = {
  readonly packageOwner: string
  readonly sourceId: string
  readonly className: string
}
export type OpacityCaptureContext = ScalarCaptureContext

const dimensionValueProperties: ReadonlySet<MigratedScalarProperty> = new Set([
  "flexBasis", "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
])

const Index = Schema.Finite.check(Schema.makeFilter<number>(value => Number.isSafeInteger(value) && value >= 0
  ? undefined : { path: [], issue: "Expected a non-negative safe integer" }))
const PathSegment = Schema.Union([Schema.String, Index])
const PrimitiveDomainSchema = Schema.Array(Schema.Literals(["view", "text", "image"])).check(
  Schema.isMinLength(1),
  Schema.makeFilter<ReadonlyArray<string>>(value => {
    const canonical = ["view", "text", "image"].filter(kind => value.includes(kind))
    return canonical.length === value.length && canonical.every((kind, index) => value[index] === kind)
      ? undefined : { path: [], issue: "Expected a unique primitive domain in view, text, image order" }
  }),
)
const TokenName = Schema.String.check(Schema.isPattern(/^--crumbs-[A-Za-z0-9_-]+$/))
const LegacyTokenReferenceSchema = Schema.Struct({
  _tag: Schema.Literal("LegacyTokenReference"),
  varName: TokenName,
})
const SourceProvenanceSchema = Schema.Struct({
  packageOwner: Schema.NonEmptyString,
  sourceId: Schema.NonEmptyString,
  exportPath: Schema.Array(PathSegment),
  logicalPath: Schema.Array(PathSegment),
  origin: Schema.Literal("crumbs-native"),
})
const MigratedScalarPropertySchema = Schema.Literals([
  "opacity", "zIndex", "elevation", "flex", "flexBasis", "flexGrow", "flexShrink",
  "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
])
const PercentageValueSchema = Schema.String.check(Schema.makeFilter<string>(value => {
  const match = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)%$/i.exec(value)
  return match?.[1] !== undefined && Number.isFinite(Number(match[1]))
    ? undefined
    : { path: [], issue: "Expected a finite percentage" }
}))
const PropertyProvenanceSchema = Schema.Struct({
  packageOwner: Schema.NonEmptyString,
  sourceId: Schema.NonEmptyString,
  exportPath: Schema.Array(PathSegment),
  logicalPath: Schema.Array(PathSegment),
  origin: Schema.Literal("crumbs-native"),
  authoredProperty: MigratedScalarPropertySchema,
  canonicalProperty: MigratedScalarPropertySchema,
  shorthandExpansionPath: Schema.Array(Schema.String),
})
const ScalarDeclarationSchema = Schema.Struct({
  _tag: Schema.Literal("NativeDeclaration"),
  property: MigratedScalarPropertySchema,
  value: Schema.Union([Schema.Finite, Schema.Literal("auto"), PercentageValueSchema, LegacyTokenReferenceSchema]),
  provenance: PropertyProvenanceSchema,
}).check(
  Schema.makeFilter(declaration => declaration.property === declaration.provenance.authoredProperty &&
    declaration.property === declaration.provenance.canonicalProperty
      ? undefined
      : { path: ["provenance"], issue: "Declaration property and provenance property names must match" }),
  Schema.makeFilter(declaration => dimensionValueProperties.has(declaration.property) ||
    typeof declaration.value === "number" || typeof declaration.value === "object"
      ? undefined
      : { path: ["value"], issue: `${declaration.property} requires a finite number or token reference` }),
)
export const ScalarDeclarationBlockSchema = Schema.Struct({
  _tag: Schema.Literal("DeclarationBlock"),
  primitiveDomain: PrimitiveDomainSchema,
  declarations: Schema.Array(ScalarDeclarationSchema).check(Schema.isMinLength(1)),
  provenance: SourceProvenanceSchema,
}).check(Schema.makeFilter(block => block.declarations.flatMap((declaration, index) => {
  const allowed = declaration.property === "elevation" ? ["view", "text"] : ["view", "text", "image"]
  return block.primitiveDomain.every(kind => allowed.includes(kind))
    ? []
    : [{ path: ["declarations", index, "property"], issue: `${declaration.property} is invalid for this primitive domain` }]
})))
export const OpacityDeclarationBlockSchema = Schema.Struct({
  _tag: Schema.Literal("DeclarationBlock"),
  primitiveDomain: PrimitiveDomainSchema,
  declarations: Schema.Tuple([Schema.Struct({
    _tag: Schema.Literal("NativeDeclaration"),
    property: Schema.Literal("opacity"),
    value: Schema.Union([Schema.Finite, LegacyTokenReferenceSchema]),
    provenance: Schema.Struct({
      packageOwner: Schema.NonEmptyString,
      sourceId: Schema.NonEmptyString,
      exportPath: Schema.Array(PathSegment),
      logicalPath: Schema.Array(PathSegment),
      origin: Schema.Literal("crumbs-native"),
      authoredProperty: Schema.Literal("opacity"),
      canonicalProperty: Schema.Literal("opacity"),
      shorthandExpansionPath: Schema.Array(Schema.String),
    }),
  })]),
  provenance: SourceProvenanceSchema,
})

const schemaOptions = { onExcessProperty: "error", errors: "all" } as const
const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1()

const migratedScalarProperties = [
  "opacity", "zIndex", "elevation", "flex", "flexBasis", "flexGrow", "flexShrink",
  "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
] as const
const migratedScalarPropertySet = new Set<string>(migratedScalarProperties)
const allPrimitives = ["view", "text", "image"] as const
const propertyPrimitives: Readonly<Record<MigratedScalarProperty, NativePrimitiveDomain>> = {
  opacity: ["view", "text", "image"],
  zIndex: ["view", "text", "image"],
  elevation: ["view", "text"],
  flex: ["view", "text", "image"],
  flexBasis: ["view", "text", "image"],
  flexGrow: ["view", "text", "image"],
  flexShrink: ["view", "text", "image"],
  width: ["view", "text", "image"],
  height: ["view", "text", "image"],
  minWidth: ["view", "text", "image"],
  minHeight: ["view", "text", "image"],
  maxWidth: ["view", "text", "image"],
  maxHeight: ["view", "text", "image"],
}

export function decodeScalarBlock(input: unknown, sourceId = "<unknown>"): ScalarDeclarationBlock {
  const result = Schema.decodeUnknownResult(ScalarDeclarationBlockSchema, schemaOptions)(input)
  if (Result.isSuccess(result)) return freezeScalarBlock(result.success as ScalarDeclarationBlock)
  const detail = formatIssues(result.failure.issue).issues.map(issue => issue.message).join("; ")
  throw admissionError("CRUMBS_IR_INVALID_NODE", "opacity", sourceId, `Invalid scalar IR node in ${sourceId}: ${detail}`)
}

export function decodeOpacityBlock(input: unknown, sourceId = "<unknown>"): OpacityDeclarationBlock {
  const result = Schema.decodeUnknownResult(OpacityDeclarationBlockSchema, schemaOptions)(input)
  if (Result.isSuccess(result)) return freezeScalarBlock(result.success as OpacityDeclarationBlock) as OpacityDeclarationBlock
  const detail = formatIssues(result.failure.issue).issues.map(issue => issue.message).join("; ")
  throw admissionError("CRUMBS_IR_INVALID_NODE", "opacity", sourceId, `Invalid opacity IR node in ${sourceId}: ${detail}`)
}

export function captureScalarIntoNativeIr(
  rule: Readonly<Record<string, unknown>>,
  context: ScalarCaptureContext,
): { readonly cssRule: Record<string, unknown>; readonly block?: ScalarDeclarationBlock } {
  return captureSelectedScalar(rule, context, migratedScalarPropertySet)
}

export function captureOpacityIntoNativeIr(
  rule: Readonly<Record<string, unknown>>,
  context: OpacityCaptureContext,
): { readonly cssRule: Record<string, unknown>; readonly block?: OpacityDeclarationBlock } {
  const captured = captureSelectedScalar(rule, context, new Set(["opacity"]))
  return captured.block === undefined
    ? { cssRule: captured.cssRule }
    : { cssRule: captured.cssRule, block: decodeOpacityBlock(captured.block, context.sourceId) }
}

function captureSelectedScalar(
  rule: Readonly<Record<string, unknown>>,
  context: ScalarCaptureContext,
  selectedProperties: ReadonlySet<string>,
): { readonly cssRule: Record<string, unknown>; readonly block?: ScalarDeclarationBlock } {
  const metadata = getNativeCaptureMetadata(rule)
  if (metadata === undefined) return { cssRule: rule as Record<string, unknown> }
  const descriptors = Object.getOwnPropertyDescriptors(rule)
  const selected = Object.keys(descriptors).filter(property =>
    selectedProperties.has(property) && descriptors[property]?.enumerable === true,
  ) as MigratedScalarProperty[]
  const cssRule = withoutSelectedProperties(rule, selectedProperties)
  const declarations: ScalarDeclaration[] = []
  let primitiveDomain = [...metadata.primitiveDomain]
  for (const property of selected) {
    const descriptor = descriptors[property]!
    if (!("value" in descriptor)) {
      throw admissionError("CRUMBS_IR_INVALID_VALUE", property, context.sourceId,
        `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}: accessors cannot enter native IR.`)
    }
    if (descriptor.value === undefined) continue
    primitiveDomain = primitiveDomain.filter(kind => propertyPrimitives[property].includes(kind))
    if (primitiveDomain.length === 0) {
      throw admissionError("CRUMBS_IR_INVALID_PROPERTY", property, context.sourceId,
        `Invalid ${property} primitive domain in ${context.sourceId} at ${context.className}.${property}. ` +
        `${property} supports ${propertyPrimitives[property].join(", ")}; the authored helper provides ${metadata.primitiveDomain.join(", ")}.`)
    }
    const value = admitScalarValue(property, descriptor.value, context)
    const propertyProvenance: PropertyProvenance = Object.freeze({
      packageOwner: context.packageOwner,
      sourceId: context.sourceId,
      exportPath: Object.freeze([]),
      logicalPath: Object.freeze([context.className, property]),
      origin: "crumbs-native",
      authoredProperty: property,
      canonicalProperty: property,
      shorthandExpansionPath: Object.freeze([]),
    })
    declarations.push(Object.freeze({
      _tag: "NativeDeclaration",
      property,
      value,
      provenance: propertyProvenance,
    }))
  }
  if (declarations.length === 0) return { cssRule }
  const provenance: SourceProvenance = Object.freeze({
    packageOwner: context.packageOwner,
    sourceId: context.sourceId,
    exportPath: Object.freeze([]),
    logicalPath: Object.freeze([context.className]),
    origin: "crumbs-native",
  })
  return {
    cssRule,
    block: decodeScalarBlock({
      _tag: "DeclarationBlock",
      primitiveDomain,
      declarations,
      provenance,
    }, context.sourceId),
  }
}

export function normalizeScalarBlocks(blocks: ReadonlyArray<ScalarDeclarationBlock>): ScalarDeclarationBlock {
  if (blocks.length === 0) throw new TypeError("Scalar composition requires at least one block")
  const admitted = blocks.map(block => decodeScalarBlock(block, block.provenance.sourceId))
  const last = admitted[admitted.length - 1]!
  const primitiveDomain = allPrimitives.filter(kind => admitted.every(block => block.primitiveDomain.includes(kind)))
  if (primitiveDomain.length === 0) {
    throw admissionError("CRUMBS_IR_PRIMITIVE_MISMATCH", last.declarations[0].property, last.provenance.sourceId,
      `Scalar composition in ${last.provenance.sourceId} has no shared primitive domain.`)
  }
  const winners = new Map<MigratedScalarProperty, ScalarDeclaration>()
  for (const block of admitted) {
    for (const declaration of block.declarations) {
      winners.delete(declaration.property)
      winners.set(declaration.property, declaration)
    }
  }
  return decodeScalarBlock({
    ...last,
    primitiveDomain,
    declarations: [...winners.values()],
  }, last.provenance.sourceId)
}

export function composeOpacityBlocks(blocks: ReadonlyArray<OpacityDeclarationBlock>): OpacityDeclarationBlock {
  if (blocks.length === 0) throw new TypeError("Opacity composition requires at least one block")
  return decodeOpacityBlock(normalizeScalarBlocks(blocks), blocks.at(-1)!.provenance.sourceId)
}

export function lowerScalarBlock(
  block: ScalarDeclarationBlock,
): Readonly<Partial<Record<MigratedScalarProperty, number | string | ReturnType<typeof createThemeTokenReference>>>> {
  const admitted = decodeScalarBlock(block, block.provenance.sourceId)
  return Object.freeze(Object.fromEntries(admitted.declarations.map(declaration => [
    declaration.property,
    typeof declaration.value === "object"
      ? createThemeTokenReference(declaration.value.varName)
      : declaration.value,
  ])))
}

export function lowerOpacityBlock(block: OpacityDeclarationBlock): { readonly opacity: number | ReturnType<typeof createThemeTokenReference> } {
  return lowerScalarBlock(decodeOpacityBlock(block, block.provenance.sourceId)) as { readonly opacity: number | ReturnType<typeof createThemeTokenReference> }
}

function admitScalarValue(
  property: MigratedScalarProperty,
  value: unknown,
  context: ScalarCaptureContext,
): ScalarDeclarationValue {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const match = /^var\((--crumbs-[A-Za-z0-9_-]+)\)$/.exec(value)
    if (match?.[1] !== undefined) return Object.freeze({ _tag: "LegacyTokenReference", varName: match[1] })
    if (dimensionValueProperties.has(property)) {
      if (value === "auto") return value
      const percentage = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)%$/i.exec(value)
      if (percentage?.[1] !== undefined && Number.isFinite(Number(percentage[1]))) return value as PercentageValue
    }
  }
  throw admissionError("CRUMBS_IR_INVALID_VALUE", property, context.sourceId,
    `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}. Expected ${dimensionValueProperties.has(property) ? "a finite number, auto, a finite percentage or" : "a finite number or"} a legacy var(--crumbs-*) token reference; the declaration was not sent to the CSS fallback.`)
}

function withoutSelectedProperties(
  rule: Readonly<Record<string, unknown>>,
  selectedProperties: ReadonlySet<string>,
): Record<string, unknown> {
  const descriptors = Object.getOwnPropertyDescriptors(rule)
  for (const property of selectedProperties) delete descriptors[property]
  Reflect.deleteProperty(descriptors, NativeCaptureMetadataSymbol)
  return Object.create(Object.getPrototypeOf(rule), descriptors) as Record<string, unknown>
}

function admissionError(
  code: NativeIrDiagnosticCode,
  property: MigratedScalarProperty,
  sourceId: string,
  detail: string,
): NativeIrAdmissionError {
  return new NativeIrAdmissionError([{ code, phase: "admission", property, sourceId, detail }])
}

function freezeScalarBlock(block: ScalarDeclarationBlock): ScalarDeclarationBlock {
  const source = Object.freeze({
    ...block.provenance,
    exportPath: Object.freeze([...block.provenance.exportPath]),
    logicalPath: Object.freeze([...block.provenance.logicalPath]),
  })
  const declarations = block.declarations.map(declaration => {
    const value = typeof declaration.value === "object"
      ? Object.freeze({ ...declaration.value })
      : declaration.value
    const provenance = Object.freeze({
      ...declaration.provenance,
      exportPath: Object.freeze([...declaration.provenance.exportPath]),
      logicalPath: Object.freeze([...declaration.provenance.logicalPath]),
      shorthandExpansionPath: Object.freeze([...declaration.provenance.shorthandExpansionPath]),
    })
    return Object.freeze({ ...declaration, value, provenance })
  }) as [ScalarDeclaration, ...ScalarDeclaration[]]
  return Object.freeze({
    ...block,
    primitiveDomain: Object.freeze([...block.primitiveDomain]) as NativePrimitiveDomain,
    declarations: Object.freeze(declarations),
    provenance: source,
  })
}
