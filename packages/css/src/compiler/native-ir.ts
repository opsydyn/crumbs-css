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
  readonly property: MigratedNumericProperty
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
  readonly authoredProperty: MigratedNumericProperty
  readonly canonicalProperty: MigratedNumericProperty
  readonly shorthandExpansionPath: ReadonlyArray<string>
}
export type MigratedNumericProperty = "opacity" | "zIndex" | "elevation" | "flexGrow" | "flexShrink"
export type NumericDeclaration = {
  readonly _tag: "NativeDeclaration"
  readonly property: MigratedNumericProperty
  readonly value: number | LegacyTokenReference
  readonly provenance: PropertyProvenance
}
export type NumericDeclarationBlock = {
  readonly _tag: "DeclarationBlock"
  readonly primitiveDomain: NativePrimitiveDomain
  readonly declarations: readonly [NumericDeclaration, ...NumericDeclaration[]]
  readonly provenance: SourceProvenance
}
export type OpacityDeclarationBlock = NumericDeclarationBlock & {
  readonly declarations: readonly [NumericDeclaration & {
    readonly property: "opacity"
    readonly provenance: PropertyProvenance & {
      readonly authoredProperty: "opacity"
      readonly canonicalProperty: "opacity"
    }
  }]
}
export type NumericCaptureContext = {
  readonly packageOwner: string
  readonly sourceId: string
  readonly className: string
}
export type OpacityCaptureContext = NumericCaptureContext

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
const MigratedNumericPropertySchema = Schema.Literals(["opacity", "zIndex", "elevation", "flexGrow", "flexShrink"])
const PropertyProvenanceSchema = Schema.Struct({
  packageOwner: Schema.NonEmptyString,
  sourceId: Schema.NonEmptyString,
  exportPath: Schema.Array(PathSegment),
  logicalPath: Schema.Array(PathSegment),
  origin: Schema.Literal("crumbs-native"),
  authoredProperty: MigratedNumericPropertySchema,
  canonicalProperty: MigratedNumericPropertySchema,
  shorthandExpansionPath: Schema.Array(Schema.String),
})
const NumericDeclarationSchema = Schema.Struct({
  _tag: Schema.Literal("NativeDeclaration"),
  property: MigratedNumericPropertySchema,
  value: Schema.Union([Schema.Finite, LegacyTokenReferenceSchema]),
  provenance: PropertyProvenanceSchema,
}).check(Schema.makeFilter(declaration =>
  declaration.property === declaration.provenance.authoredProperty &&
  declaration.property === declaration.provenance.canonicalProperty
    ? undefined
    : { path: ["provenance"], issue: "Declaration property and provenance property names must match" },
))
export const NumericDeclarationBlockSchema = Schema.Struct({
  _tag: Schema.Literal("DeclarationBlock"),
  primitiveDomain: PrimitiveDomainSchema,
  declarations: Schema.Array(NumericDeclarationSchema).check(Schema.isMinLength(1)),
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

const migratedNumericProperties = ["opacity", "zIndex", "elevation", "flexGrow", "flexShrink"] as const
const migratedNumericPropertySet = new Set<string>(migratedNumericProperties)
const allPrimitives = ["view", "text", "image"] as const
const propertyPrimitives: Readonly<Record<MigratedNumericProperty, NativePrimitiveDomain>> = {
  opacity: ["view", "text", "image"],
  zIndex: ["view", "text", "image"],
  elevation: ["view", "text"],
  flexGrow: ["view", "text", "image"],
  flexShrink: ["view", "text", "image"],
}

export function decodeNumericBlock(input: unknown, sourceId = "<unknown>"): NumericDeclarationBlock {
  const result = Schema.decodeUnknownResult(NumericDeclarationBlockSchema, schemaOptions)(input)
  if (Result.isSuccess(result)) return freezeNumericBlock(result.success as NumericDeclarationBlock)
  const detail = formatIssues(result.failure.issue).issues.map(issue => issue.message).join("; ")
  throw admissionError("CRUMBS_IR_INVALID_NODE", "opacity", sourceId, `Invalid numeric IR node in ${sourceId}: ${detail}`)
}

export function decodeOpacityBlock(input: unknown, sourceId = "<unknown>"): OpacityDeclarationBlock {
  const result = Schema.decodeUnknownResult(OpacityDeclarationBlockSchema, schemaOptions)(input)
  if (Result.isSuccess(result)) return freezeNumericBlock(result.success as OpacityDeclarationBlock) as OpacityDeclarationBlock
  const detail = formatIssues(result.failure.issue).issues.map(issue => issue.message).join("; ")
  throw admissionError("CRUMBS_IR_INVALID_NODE", "opacity", sourceId, `Invalid opacity IR node in ${sourceId}: ${detail}`)
}

export function captureNumericIntoNativeIr(
  rule: Readonly<Record<string, unknown>>,
  context: NumericCaptureContext,
): { readonly cssRule: Record<string, unknown>; readonly block?: NumericDeclarationBlock } {
  return captureSelectedNumeric(rule, context, migratedNumericPropertySet)
}

export function captureOpacityIntoNativeIr(
  rule: Readonly<Record<string, unknown>>,
  context: OpacityCaptureContext,
): { readonly cssRule: Record<string, unknown>; readonly block?: OpacityDeclarationBlock } {
  const captured = captureSelectedNumeric(rule, context, new Set(["opacity"]))
  return captured.block === undefined
    ? { cssRule: captured.cssRule }
    : { cssRule: captured.cssRule, block: decodeOpacityBlock(captured.block, context.sourceId) }
}

function captureSelectedNumeric(
  rule: Readonly<Record<string, unknown>>,
  context: NumericCaptureContext,
  selectedProperties: ReadonlySet<string>,
): { readonly cssRule: Record<string, unknown>; readonly block?: NumericDeclarationBlock } {
  const metadata = getNativeCaptureMetadata(rule)
  if (metadata === undefined) return { cssRule: rule as Record<string, unknown> }
  const descriptors = Object.getOwnPropertyDescriptors(rule)
  const selected = Object.keys(descriptors).filter(property =>
    selectedProperties.has(property) && descriptors[property]?.enumerable === true,
  ) as MigratedNumericProperty[]
  const cssRule = withoutSelectedProperties(rule, selectedProperties)
  const declarations: NumericDeclaration[] = []
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
    const value = admitNumericValue(property, descriptor.value, context)
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
    block: decodeNumericBlock({
      _tag: "DeclarationBlock",
      primitiveDomain,
      declarations,
      provenance,
    }, context.sourceId),
  }
}

export function normalizeNumericBlocks(blocks: ReadonlyArray<NumericDeclarationBlock>): NumericDeclarationBlock {
  if (blocks.length === 0) throw new TypeError("Numeric composition requires at least one block")
  const admitted = blocks.map(block => decodeNumericBlock(block, block.provenance.sourceId))
  const last = admitted[admitted.length - 1]!
  const primitiveDomain = allPrimitives.filter(kind => admitted.every(block => block.primitiveDomain.includes(kind)))
  if (primitiveDomain.length === 0) {
    throw admissionError("CRUMBS_IR_PRIMITIVE_MISMATCH", last.declarations[0].property, last.provenance.sourceId,
      `Numeric composition in ${last.provenance.sourceId} has no shared primitive domain.`)
  }
  const winners = new Map<MigratedNumericProperty, NumericDeclaration>()
  for (const block of admitted) {
    for (const declaration of block.declarations) {
      winners.delete(declaration.property)
      winners.set(declaration.property, declaration)
    }
  }
  return decodeNumericBlock({
    ...last,
    primitiveDomain,
    declarations: [...winners.values()],
  }, last.provenance.sourceId)
}

export function composeOpacityBlocks(blocks: ReadonlyArray<OpacityDeclarationBlock>): OpacityDeclarationBlock {
  if (blocks.length === 0) throw new TypeError("Opacity composition requires at least one block")
  return decodeOpacityBlock(normalizeNumericBlocks(blocks), blocks.at(-1)!.provenance.sourceId)
}

export function lowerNumericBlock(
  block: NumericDeclarationBlock,
): Readonly<Partial<Record<MigratedNumericProperty, number | ReturnType<typeof createThemeTokenReference>>>> {
  const admitted = decodeNumericBlock(block, block.provenance.sourceId)
  return Object.freeze(Object.fromEntries(admitted.declarations.map(declaration => [
    declaration.property,
    typeof declaration.value === "number"
      ? declaration.value
      : createThemeTokenReference(declaration.value.varName),
  ])))
}

export function lowerOpacityBlock(block: OpacityDeclarationBlock): { readonly opacity: number | ReturnType<typeof createThemeTokenReference> } {
  return lowerNumericBlock(decodeOpacityBlock(block, block.provenance.sourceId)) as { readonly opacity: number | ReturnType<typeof createThemeTokenReference> }
}

function admitNumericValue(
  property: MigratedNumericProperty,
  value: unknown,
  context: NumericCaptureContext,
): number | LegacyTokenReference {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const match = /^var\((--crumbs-[A-Za-z0-9_-]+)\)$/.exec(value)
    if (match?.[1] !== undefined) return Object.freeze({ _tag: "LegacyTokenReference", varName: match[1] })
  }
  throw admissionError("CRUMBS_IR_INVALID_VALUE", property, context.sourceId,
    `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}. Expected a finite number or a legacy var(--crumbs-*) token reference; the declaration was not sent to the CSS fallback.`)
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
  property: MigratedNumericProperty,
  sourceId: string,
  detail: string,
): NativeIrAdmissionError {
  return new NativeIrAdmissionError([{ code, phase: "admission", property, sourceId, detail }])
}

function freezeNumericBlock(block: NumericDeclarationBlock): NumericDeclarationBlock {
  const source = Object.freeze({
    ...block.provenance,
    exportPath: Object.freeze([...block.provenance.exportPath]),
    logicalPath: Object.freeze([...block.provenance.logicalPath]),
  })
  const declarations = block.declarations.map(declaration => {
    const value = typeof declaration.value === "number"
      ? declaration.value
      : Object.freeze({ ...declaration.value })
    const provenance = Object.freeze({
      ...declaration.provenance,
      exportPath: Object.freeze([...declaration.provenance.exportPath]),
      logicalPath: Object.freeze([...declaration.provenance.logicalPath]),
      shorthandExpansionPath: Object.freeze([...declaration.provenance.shorthandExpansionPath]),
    })
    return Object.freeze({ ...declaration, value, provenance })
  }) as [NumericDeclaration, ...NumericDeclaration[]]
  return Object.freeze({
    ...block,
    primitiveDomain: Object.freeze([...block.primitiveDomain]) as NativePrimitiveDomain,
    declarations: Object.freeze(declarations),
    provenance: source,
  })
}
