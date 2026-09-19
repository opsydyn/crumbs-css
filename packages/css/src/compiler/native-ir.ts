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
  | "CRUMBS_IR_INVALID_VALUE"
  | "CRUMBS_IR_PRIMITIVE_MISMATCH"
export type NativeIrDiagnostic = {
  readonly code: NativeIrDiagnosticCode
  readonly phase: "admission"
  readonly property: "opacity"
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
  readonly authoredProperty: "opacity"
  readonly canonicalProperty: "opacity"
  readonly shorthandExpansionPath: ReadonlyArray<string>
}
export type OpacityDeclarationBlock = {
  readonly _tag: "DeclarationBlock"
  readonly primitiveDomain: NativePrimitiveDomain
  readonly declarations: readonly [{
    readonly _tag: "NativeDeclaration"
    readonly property: "opacity"
    readonly value: number | LegacyTokenReference
    readonly provenance: PropertyProvenance
  }]
  readonly provenance: SourceProvenance
}
export type OpacityCaptureContext = {
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
const PropertyProvenanceSchema = Schema.Struct({
  packageOwner: Schema.NonEmptyString,
  sourceId: Schema.NonEmptyString,
  exportPath: Schema.Array(PathSegment),
  logicalPath: Schema.Array(PathSegment),
  origin: Schema.Literal("crumbs-native"),
  authoredProperty: Schema.Literal("opacity"),
  canonicalProperty: Schema.Literal("opacity"),
  shorthandExpansionPath: Schema.Array(Schema.String),
})
export const OpacityDeclarationBlockSchema = Schema.Struct({
  _tag: Schema.Literal("DeclarationBlock"),
  primitiveDomain: PrimitiveDomainSchema,
  declarations: Schema.Tuple([Schema.Struct({
    _tag: Schema.Literal("NativeDeclaration"),
    property: Schema.Literal("opacity"),
    value: Schema.Union([Schema.Finite, LegacyTokenReferenceSchema]),
    provenance: PropertyProvenanceSchema,
  })]),
  provenance: SourceProvenanceSchema,
})

const schemaOptions = { onExcessProperty: "error", errors: "all" } as const
const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1()

export function decodeOpacityBlock(input: unknown, sourceId = "<unknown>"): OpacityDeclarationBlock {
  const result = Schema.decodeUnknownResult(OpacityDeclarationBlockSchema, schemaOptions)(input)
  if (Result.isSuccess(result)) return freezeOpacityBlock(result.success as OpacityDeclarationBlock)
  const detail = formatIssues(result.failure.issue).issues.map(issue => issue.message).join("; ")
  throw admissionError("CRUMBS_IR_INVALID_NODE", sourceId, `Invalid opacity IR node in ${sourceId}: ${detail}`)
}

export function captureOpacityIntoNativeIr(
  rule: Readonly<Record<string, unknown>>,
  context: OpacityCaptureContext,
): { readonly cssRule: Record<string, unknown>; readonly block?: OpacityDeclarationBlock } {
  const metadata = getNativeCaptureMetadata(rule)
  if (metadata === undefined) return { cssRule: rule as Record<string, unknown> }
  const descriptor = Object.getOwnPropertyDescriptor(rule, "opacity")
  if (descriptor === undefined) return { cssRule: withoutCaptureMetadata(rule) }
  if (!("value" in descriptor)) {
    throw admissionError("CRUMBS_IR_INVALID_VALUE", context.sourceId,
      `Invalid opacity in ${context.sourceId} at ${context.className}.opacity: accessors cannot enter native IR.`)
  }
  const cssRule = withoutOpacity(rule)
  if (descriptor.value === undefined) return { cssRule }
  const value = admitOpacityValue(descriptor.value, context)
  const provenance: SourceProvenance = Object.freeze({
    packageOwner: context.packageOwner,
    sourceId: context.sourceId,
    exportPath: Object.freeze([]),
    logicalPath: Object.freeze([context.className]),
    origin: "crumbs-native",
  })
  const propertyProvenance: PropertyProvenance = Object.freeze({
    ...provenance,
    logicalPath: Object.freeze([context.className, "opacity"]),
    authoredProperty: "opacity",
    canonicalProperty: "opacity",
    shorthandExpansionPath: Object.freeze([]),
  })
  const block = {
    _tag: "DeclarationBlock",
    primitiveDomain: metadata.primitiveDomain,
    declarations: Object.freeze([Object.freeze({
      _tag: "NativeDeclaration",
      property: "opacity",
      value,
      provenance: propertyProvenance,
    })]),
    provenance,
  } as const
  return { cssRule, block: decodeOpacityBlock(block, context.sourceId) }
}

export function composeOpacityBlocks(blocks: ReadonlyArray<OpacityDeclarationBlock>): OpacityDeclarationBlock {
  if (blocks.length === 0) throw new TypeError("Opacity composition requires at least one block")
  const last = blocks[blocks.length - 1]!
  const primitiveDomain = (["view", "text", "image"] as const)
    .filter(kind => blocks.every(block => block.primitiveDomain.includes(kind)))
  if (primitiveDomain.length === 0) {
    throw admissionError("CRUMBS_IR_PRIMITIVE_MISMATCH", last.provenance.sourceId,
      `Opacity composition in ${last.provenance.sourceId} has no shared primitive domain.`)
  }
  return decodeOpacityBlock({ ...last, primitiveDomain, declarations: [last.declarations[0]] }, last.provenance.sourceId)
}

export function lowerOpacityBlock(block: OpacityDeclarationBlock): { readonly opacity: number | ReturnType<typeof createThemeTokenReference> } {
  const admitted = decodeOpacityBlock(block, block.provenance.sourceId)
  const value = admitted.declarations[0].value
  return { opacity: typeof value === "number" ? value : createThemeTokenReference(value.varName) }
}

function admitOpacityValue(value: unknown, context: OpacityCaptureContext): number | LegacyTokenReference {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const match = /^var\((--crumbs-[A-Za-z0-9_-]+)\)$/.exec(value)
    if (match?.[1] !== undefined) return Object.freeze({ _tag: "LegacyTokenReference", varName: match[1] })
  }
  throw admissionError("CRUMBS_IR_INVALID_VALUE", context.sourceId,
    `Invalid opacity in ${context.sourceId} at ${context.className}.opacity. Expected a finite number or a legacy var(--crumbs-*) token reference; the declaration was not sent to the CSS fallback.`)
}

function withoutOpacity(rule: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const descriptors = Object.getOwnPropertyDescriptors(rule)
  delete descriptors.opacity
  Reflect.deleteProperty(descriptors, NativeCaptureMetadataSymbol)
  return Object.create(Object.getPrototypeOf(rule), descriptors) as Record<string, unknown>
}

function withoutCaptureMetadata(rule: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const descriptors = Object.getOwnPropertyDescriptors(rule)
  Reflect.deleteProperty(descriptors, NativeCaptureMetadataSymbol)
  return Object.create(Object.getPrototypeOf(rule), descriptors) as Record<string, unknown>
}

function admissionError(code: NativeIrDiagnosticCode, sourceId: string, detail: string): NativeIrAdmissionError {
  return new NativeIrAdmissionError([{ code, phase: "admission", property: "opacity", sourceId, detail }])
}

function freezeOpacityBlock(block: OpacityDeclarationBlock): OpacityDeclarationBlock {
  const source = Object.freeze({
    ...block.provenance,
    exportPath: Object.freeze([...block.provenance.exportPath]),
    logicalPath: Object.freeze([...block.provenance.logicalPath]),
  })
  const declaration = block.declarations[0]
  const value = typeof declaration.value === "number"
    ? declaration.value
    : Object.freeze({ ...declaration.value })
  const provenance = Object.freeze({
    ...declaration.provenance,
    exportPath: Object.freeze([...declaration.provenance.exportPath]),
    logicalPath: Object.freeze([...declaration.provenance.logicalPath]),
    shorthandExpansionPath: Object.freeze([...declaration.provenance.shorthandExpansionPath]),
  })
  const frozenDeclaration = Object.freeze({ ...declaration, value, provenance })
  return Object.freeze({
    ...block,
    primitiveDomain: Object.freeze([...block.primitiveDomain]) as NativePrimitiveDomain,
    declarations: Object.freeze([frozenDeclaration] as [typeof frozenDeclaration]),
    provenance: source,
  })
}
