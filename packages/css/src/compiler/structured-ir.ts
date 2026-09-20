import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as SchemaIssue from "effect/SchemaIssue"
import {
  getNativeCaptureMetadata,
  type NativePrimitiveDomain,
} from "./native-capture"

export type StructuredNativeProperty = "shadowOffset"
export type StructuredIrDiagnosticCode =
  | "CRUMBS_STRUCTURED_IR_INVALID_NODE"
  | "CRUMBS_STRUCTURED_IR_INVALID_VALUE"
  | "CRUMBS_STRUCTURED_IR_PRIMITIVE_MISMATCH"
export type StructuredIrDiagnostic = {
  readonly code: StructuredIrDiagnosticCode
  readonly phase: "admission"
  readonly property: StructuredNativeProperty
  readonly sourceId: string
  readonly detail: string
}

export class StructuredIrAdmissionError extends Error {
  override readonly name = "StructuredIrAdmissionError"

  constructor(readonly diagnostics: readonly [StructuredIrDiagnostic, ...StructuredIrDiagnostic[]]) {
    super(`[crumbs-css:${diagnostics[0].code}] ${diagnostics[0].detail}`)
  }
}

export type StructuredSourceProvenance = {
  readonly packageOwner: string
  readonly sourceId: string
  readonly exportPath: ReadonlyArray<string | number>
  readonly logicalPath: ReadonlyArray<string | number>
  readonly origin: "crumbs-native"
}
export type StructuredPropertyProvenance = StructuredSourceProvenance & {
  readonly property: StructuredNativeProperty
}
export type ShadowOffsetValue = {
  readonly width: number
  readonly height: number
}
export type StructuredDeclaration = {
  readonly _tag: "NativeStructuredDeclaration"
  readonly property: StructuredNativeProperty
  readonly value: ShadowOffsetValue
  readonly provenance: StructuredPropertyProvenance
}
export type StructuredDeclarationBlock = {
  readonly _tag: "StructuredDeclarationBlock"
  readonly primitiveDomain: NativePrimitiveDomain
  readonly declarations: readonly [StructuredDeclaration, ...StructuredDeclaration[]]
  readonly provenance: StructuredSourceProvenance
}
export type StructuredCaptureContext = {
  readonly packageOwner: string
  readonly sourceId: string
  readonly className: string
}

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
const SourceProvenanceSchema = Schema.Struct({
  packageOwner: Schema.NonEmptyString,
  sourceId: Schema.NonEmptyString,
  exportPath: Schema.Array(PathSegment),
  logicalPath: Schema.Array(PathSegment),
  origin: Schema.Literal("crumbs-native"),
})
const ShadowOffsetValueSchema = Schema.Struct({
  width: Schema.Finite,
  height: Schema.Finite,
})
const StructuredPropertyProvenanceSchema = Schema.Struct({
  packageOwner: Schema.NonEmptyString,
  sourceId: Schema.NonEmptyString,
  exportPath: Schema.Array(PathSegment),
  logicalPath: Schema.Array(PathSegment),
  origin: Schema.Literal("crumbs-native"),
  property: Schema.Literal("shadowOffset"),
})
const StructuredDeclarationSchema = Schema.Struct({
  _tag: Schema.Literal("NativeStructuredDeclaration"),
  property: Schema.Literal("shadowOffset"),
  value: ShadowOffsetValueSchema,
  provenance: StructuredPropertyProvenanceSchema,
}).check(Schema.makeFilter(declaration => declaration.property === declaration.provenance.property
  ? undefined : { path: ["provenance"], issue: "Structured declaration property and provenance must match" }))
export const StructuredDeclarationBlockSchema = Schema.Struct({
  _tag: Schema.Literal("StructuredDeclarationBlock"),
  primitiveDomain: PrimitiveDomainSchema,
  declarations: Schema.Array(StructuredDeclarationSchema).check(Schema.isMinLength(1)),
  provenance: SourceProvenanceSchema,
})

const schemaOptions = { onExcessProperty: "error", errors: "all" } as const
const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1()

export function decodeStructuredBlock(input: unknown, sourceId = "<unknown>"): StructuredDeclarationBlock {
  const result = Schema.decodeUnknownResult(StructuredDeclarationBlockSchema, schemaOptions)(input)
  if (Result.isSuccess(result)) return freezeStructuredBlock(result.success as StructuredDeclarationBlock)
  const detail = formatIssues(result.failure.issue).issues.map(issue => issue.message).join("; ")
  throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_NODE", sourceId,
    `Invalid structured IR node in ${sourceId}: ${detail}`)
}

export function captureStructuredIntoNativeIr(
  rule: Readonly<Record<string, unknown>>,
  context: StructuredCaptureContext,
): { readonly cssRule: Record<string, unknown>; readonly block?: StructuredDeclarationBlock } {
  const metadata = getNativeCaptureMetadata(rule)
  if (metadata === undefined) return { cssRule: rule as Record<string, unknown> }
  const descriptors = Object.getOwnPropertyDescriptors(rule)
  const descriptor = descriptors.shadowOffset
  if (descriptor === undefined || descriptor.enumerable !== true) return { cssRule: rule as Record<string, unknown> }
  if (!("value" in descriptor)) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid shadowOffset in ${context.sourceId} at ${context.className}.shadowOffset: accessors cannot enter native IR.`)
  }
  const value = admitShadowOffset(descriptor.value, context)
  const cssRule = withoutSelectedProperties(rule)
  const block = decodeStructuredBlock({
    _tag: "StructuredDeclarationBlock",
    primitiveDomain: metadata.primitiveDomain,
    declarations: [{
      _tag: "NativeStructuredDeclaration",
      property: "shadowOffset",
      value,
      provenance: {
        packageOwner: context.packageOwner,
        sourceId: context.sourceId,
        exportPath: [],
        logicalPath: [context.className, "shadowOffset"],
        origin: "crumbs-native",
        property: "shadowOffset",
      },
    }],
    provenance: {
      packageOwner: context.packageOwner,
      sourceId: context.sourceId,
      exportPath: [],
      logicalPath: [context.className],
      origin: "crumbs-native",
    },
  }, context.sourceId)
  return { cssRule, block }
}

export function normalizeStructuredBlocks(blocks: ReadonlyArray<StructuredDeclarationBlock>): StructuredDeclarationBlock {
  if (blocks.length === 0) throw new TypeError("Structured composition requires at least one block")
  const admitted = blocks.map(block => decodeStructuredBlock(block, block.provenance.sourceId))
  const last = admitted[admitted.length - 1]!
  const primitiveDomain = (["view", "text", "image"] as const).filter(kind => admitted.every(block => block.primitiveDomain.includes(kind)))
  if (primitiveDomain.length === 0) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_PRIMITIVE_MISMATCH", last.provenance.sourceId,
      `Structured composition in ${last.provenance.sourceId} has no shared primitive domain.`)
  }
  const winner = admitted.flatMap(block => block.declarations).at(-1)!
  return decodeStructuredBlock({ ...last, primitiveDomain, declarations: [winner] }, last.provenance.sourceId)
}

export function lowerStructuredBlock(
  block: StructuredDeclarationBlock,
): Readonly<{ shadowOffset: ShadowOffsetValue }> {
  const admitted = decodeStructuredBlock(block, block.provenance.sourceId)
  const value = admitted.declarations.at(-1)!.value
  return Object.freeze({ shadowOffset: Object.freeze({ width: value.width, height: value.height }) })
}

function admitShadowOffset(value: unknown, context: StructuredCaptureContext): ShadowOffsetValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid shadowOffset in ${context.sourceId} at ${context.className}.shadowOffset: expected a fixed finite width/height object.`)
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null && Object.getPrototypeOf(prototype) !== null) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid shadowOffset in ${context.sourceId} at ${context.className}.shadowOffset: expected a plain object.`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Object.keys(descriptors)
  if (keys.length !== 2 || !keys.includes("width") || !keys.includes("height")) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid shadowOffset in ${context.sourceId} at ${context.className}.shadowOffset: expected exactly width and height.`)
  }
  const width = descriptors.width
  const height = descriptors.height
  if (width === undefined || height === undefined || !width.enumerable || !height.enumerable || !("value" in width) || !("value" in height) ||
    typeof width.value !== "number" || !Number.isFinite(width.value) || typeof height.value !== "number" || !Number.isFinite(height.value)) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid shadowOffset in ${context.sourceId} at ${context.className}.shadowOffset: width and height must be finite numbers.`)
  }
  return Object.freeze({ width: width.value, height: height.value })
}

function withoutSelectedProperties(rule: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const descriptors = Object.getOwnPropertyDescriptors(rule)
  delete descriptors.shadowOffset
  return Object.create(Object.getPrototypeOf(rule), descriptors) as Record<string, unknown>
}

function structuredAdmissionError(
  code: StructuredIrDiagnosticCode,
  sourceId: string,
  detail: string,
): StructuredIrAdmissionError {
  return new StructuredIrAdmissionError([{ code, phase: "admission", property: "shadowOffset", sourceId, detail }])
}

function freezeStructuredBlock(block: StructuredDeclarationBlock): StructuredDeclarationBlock {
  const provenance = Object.freeze({
    ...block.provenance,
    exportPath: Object.freeze([...block.provenance.exportPath]),
    logicalPath: Object.freeze([...block.provenance.logicalPath]),
  })
  const declarations = block.declarations.map(declaration => Object.freeze({
    ...declaration,
    value: Object.freeze({ ...declaration.value }),
    provenance: Object.freeze({
      ...declaration.provenance,
      exportPath: Object.freeze([...declaration.provenance.exportPath]),
      logicalPath: Object.freeze([...declaration.provenance.logicalPath]),
    }),
  }))
  return Object.freeze({
    ...block,
    primitiveDomain: Object.freeze([...block.primitiveDomain]) as NativePrimitiveDomain,
    declarations: Object.freeze(declarations) as StructuredDeclarationBlock["declarations"],
    provenance,
  })
}
