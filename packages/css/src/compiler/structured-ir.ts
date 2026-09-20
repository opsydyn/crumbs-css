import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as SchemaIssue from "effect/SchemaIssue"
import {
  getNativeCaptureMetadata,
  type NativePrimitiveDomain,
} from "./native-capture"

export type StructuredNativeProperty =
  | "transform"
  | "shadowOffset"
  | "textShadowOffset"
  | "transformOrigin"
  | "transformMatrix"
  | "fontVariant"
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
export type TransformOriginEntry = number | `${number}%`
export type TransformOriginValue =
  | readonly [TransformOriginEntry, TransformOriginEntry]
  | readonly [TransformOriginEntry, TransformOriginEntry, TransformOriginEntry]
export type TransformMatrixValue = ReadonlyArray<number>
export type TransformAngle = `${number}deg` | `${number}rad`
export type TransformTranslation = number | `${number}%`
export type TransformOperation =
  | { readonly perspective: number }
  | { readonly rotate: TransformAngle }
  | { readonly rotateX: TransformAngle }
  | { readonly rotateY: TransformAngle }
  | { readonly rotateZ: TransformAngle }
  | { readonly scale: number }
  | { readonly scaleX: number }
  | { readonly scaleY: number }
  | { readonly translateX: TransformTranslation }
  | { readonly translateY: TransformTranslation }
  | { readonly skewX: TransformAngle }
  | { readonly skewY: TransformAngle }
  | { readonly matrix: TransformMatrixValue }
export type TransformValue = ReadonlyArray<TransformOperation>
export type FontVariant =
  | "small-caps"
  | "oldstyle-nums"
  | "lining-nums"
  | "tabular-nums"
  | "common-ligatures"
  | "no-common-ligatures"
  | "discretionary-ligatures"
  | "no-discretionary-ligatures"
  | "historical-ligatures"
  | "no-historical-ligatures"
  | "contextual"
  | "no-contextual"
  | "proportional-nums"
  | "stylistic-one"
  | "stylistic-two"
  | "stylistic-three"
  | "stylistic-four"
  | "stylistic-five"
  | "stylistic-six"
  | "stylistic-seven"
  | "stylistic-eight"
  | "stylistic-nine"
  | "stylistic-ten"
  | "stylistic-eleven"
  | "stylistic-twelve"
  | "stylistic-thirteen"
  | "stylistic-fourteen"
  | "stylistic-fifteen"
  | "stylistic-sixteen"
  | "stylistic-seventeen"
  | "stylistic-eighteen"
  | "stylistic-nineteen"
  | "stylistic-twenty"
export type FontVariantValue = ReadonlyArray<FontVariant>
export type StructuredValue = ShadowOffsetValue | TransformOriginValue | TransformMatrixValue | TransformValue | FontVariantValue
export type StructuredDeclaration = {
  readonly _tag: "NativeStructuredDeclaration"
  readonly property: StructuredNativeProperty
  readonly value: StructuredValue
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

const structuredProperties = [
  "transform", "shadowOffset", "textShadowOffset", "transformOrigin", "transformMatrix", "fontVariant",
] as const satisfies ReadonlyArray<StructuredNativeProperty>
const allPrimitives = ["view", "text", "image"] as const
const structuredPropertyPrimitives: Readonly<Record<StructuredNativeProperty, NativePrimitiveDomain>> = {
  transform: ["view", "text", "image"],
  shadowOffset: ["view", "text", "image"],
  textShadowOffset: ["text"],
  transformOrigin: ["view", "text", "image"],
  transformMatrix: ["view", "text", "image"],
  fontVariant: ["text"],
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
const AngleValueSchema = Schema.String.check(
  Schema.isPattern(/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:deg|rad)$/),
  Schema.makeFilter<string>(value => Number.isFinite(Number.parseFloat(value.slice(0, -3)))
    ? undefined : { path: [], issue: "Expected a finite angle" }),
)
const PercentageValueSchema = Schema.String.check(
  Schema.isPattern(/^-?(?:\d+(?:\.\d+)?|\.\d+)%$/),
  Schema.makeFilter<string>(value => Number.isFinite(Number.parseFloat(value.slice(0, -1)))
    ? undefined : { path: [], issue: "Expected a finite percentage" }),
)
const TransformOriginEntrySchema = Schema.Union([Schema.Finite, PercentageValueSchema])
const TransformOriginValueSchema = Schema.Union([
  Schema.Tuple([TransformOriginEntrySchema, TransformOriginEntrySchema]),
  Schema.Tuple([TransformOriginEntrySchema, TransformOriginEntrySchema, TransformOriginEntrySchema]),
])
const TransformMatrixValueSchema = Schema.Array(Schema.Finite).check(Schema.makeFilter<ReadonlyArray<number>>(value =>
  value.length === 16 ? undefined : { path: [], issue: "Expected exactly 16 finite matrix entries" },
))
const TransformTranslationSchema = Schema.Union([Schema.Finite, PercentageValueSchema])
const TransformOperationSchema = Schema.Union([
  Schema.Struct({ perspective: Schema.Finite }),
  Schema.Struct({ rotate: AngleValueSchema }),
  Schema.Struct({ rotateX: AngleValueSchema }),
  Schema.Struct({ rotateY: AngleValueSchema }),
  Schema.Struct({ rotateZ: AngleValueSchema }),
  Schema.Struct({ scale: Schema.Finite }),
  Schema.Struct({ scaleX: Schema.Finite }),
  Schema.Struct({ scaleY: Schema.Finite }),
  Schema.Struct({ translateX: TransformTranslationSchema }),
  Schema.Struct({ translateY: TransformTranslationSchema }),
  Schema.Struct({ skewX: AngleValueSchema }),
  Schema.Struct({ skewY: AngleValueSchema }),
  Schema.Struct({ matrix: TransformMatrixValueSchema }),
])
const TransformValueSchema = Schema.Array(TransformOperationSchema)
const fontVariantValues = [
  "small-caps", "oldstyle-nums", "lining-nums", "tabular-nums", "common-ligatures",
  "no-common-ligatures", "discretionary-ligatures", "no-discretionary-ligatures", "historical-ligatures",
  "no-historical-ligatures", "contextual", "no-contextual", "proportional-nums", "stylistic-one",
  "stylistic-two", "stylistic-three", "stylistic-four", "stylistic-five", "stylistic-six",
  "stylistic-seven", "stylistic-eight", "stylistic-nine", "stylistic-ten", "stylistic-eleven",
  "stylistic-twelve", "stylistic-thirteen", "stylistic-fourteen", "stylistic-fifteen", "stylistic-sixteen",
  "stylistic-seventeen", "stylistic-eighteen", "stylistic-nineteen", "stylistic-twenty",
] as const
const FontVariantValueSchema = Schema.Array(Schema.Literals(fontVariantValues))
const StructuredValueSchema = Schema.Union([
  ShadowOffsetValueSchema,
  TransformOriginValueSchema,
  TransformMatrixValueSchema,
  TransformValueSchema,
  FontVariantValueSchema,
])
const StructuredNativePropertySchema = Schema.Literals([
  "transform", "shadowOffset", "textShadowOffset", "transformOrigin", "transformMatrix", "fontVariant",
])
const StructuredPropertyProvenanceSchema = Schema.Struct({
  packageOwner: Schema.NonEmptyString,
  sourceId: Schema.NonEmptyString,
  exportPath: Schema.Array(PathSegment),
  logicalPath: Schema.Array(PathSegment),
  origin: Schema.Literal("crumbs-native"),
  property: StructuredNativePropertySchema,
})
const StructuredDeclarationSchema = Schema.Struct({
  _tag: Schema.Literal("NativeStructuredDeclaration"),
  property: StructuredNativePropertySchema,
  value: StructuredValueSchema,
  provenance: StructuredPropertyProvenanceSchema,
}).check(Schema.makeFilter(declaration => {
  if (declaration.property !== declaration.provenance.property) {
    return { path: ["provenance"], issue: "Structured declaration property and provenance must match" }
  }
  return isStructuredValueForProperty(declaration.property, declaration.value)
    ? undefined
    : { path: ["value"], issue: `${declaration.property} has an invalid structured value` }
}))
export const StructuredDeclarationBlockSchema = Schema.Struct({
  _tag: Schema.Literal("StructuredDeclarationBlock"),
  primitiveDomain: PrimitiveDomainSchema,
  declarations: Schema.Array(StructuredDeclarationSchema).check(Schema.isMinLength(1)),
  provenance: SourceProvenanceSchema,
}).check(Schema.makeFilter(block => block.declarations.flatMap((declaration, index) => {
  const allowed = structuredPropertyPrimitives[declaration.property]
  return block.primitiveDomain.every(kind => allowed.includes(kind))
    ? []
    : [{ path: ["declarations", index], issue: `${declaration.property} is invalid for this primitive domain` }]
})))

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
  const selectedProperties = structuredProperties.filter(property => {
    const descriptor = descriptors[property]
    if (descriptor?.enumerable !== true) return false
    // React Native also exposes a string transform form. Leave that form on
    // the compatibility route while taking only ordered static arrays into IR.
    return property !== "transform" || !("value" in descriptor) || Array.isArray(descriptor.value)
  })
  if (selectedProperties.length === 0) return { cssRule: rule as Record<string, unknown> }
  let primitiveDomain = [...metadata.primitiveDomain]
  const declarations: StructuredDeclaration[] = []
  for (const property of selectedProperties) {
    const descriptor = descriptors[property]!
    if (!("value" in descriptor)) {
      throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
        `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}: accessors cannot enter native IR.`, property)
    }
    primitiveDomain = primitiveDomain.filter(kind => structuredPropertyPrimitives[property].includes(kind))
    if (primitiveDomain.length === 0) {
      throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_PRIMITIVE_MISMATCH", context.sourceId,
        `Invalid ${property} primitive domain in ${context.sourceId} at ${context.className}.${property}.`, property)
    }
    const value = admitStructuredValue(descriptor.value, context, property)
    declarations.push({
      _tag: "NativeStructuredDeclaration",
      property,
      value,
      provenance: {
        packageOwner: context.packageOwner,
        sourceId: context.sourceId,
        exportPath: [],
        logicalPath: [context.className, property],
        origin: "crumbs-native",
        property,
      },
    })
  }
  const cssRule = withoutSelectedProperties(rule, selectedProperties)
  const block = decodeStructuredBlock({
    _tag: "StructuredDeclarationBlock",
    primitiveDomain,
    declarations,
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
  const primitiveDomain = allPrimitives.filter(kind => admitted.every(block => block.primitiveDomain.includes(kind)))
  if (primitiveDomain.length === 0) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_PRIMITIVE_MISMATCH", last.provenance.sourceId,
      `Structured composition in ${last.provenance.sourceId} has no shared primitive domain.`)
  }
  const winners = new Map<StructuredNativeProperty, StructuredDeclaration>()
  for (const block of admitted) {
    for (const declaration of block.declarations) {
      winners.delete(declaration.property)
      winners.set(declaration.property, declaration)
    }
  }
  return decodeStructuredBlock({ ...last, primitiveDomain, declarations: [...winners.values()] }, last.provenance.sourceId)
}

export function lowerStructuredBlock(
  block: StructuredDeclarationBlock,
): Readonly<Partial<Record<StructuredNativeProperty, StructuredValue>>> {
  const admitted = decodeStructuredBlock(block, block.provenance.sourceId)
  const lowered: Partial<Record<StructuredNativeProperty, StructuredValue>> = {}
  for (const declaration of admitted.declarations) {
    lowered[declaration.property] = freezeStructuredValue(declaration.value)
  }
  return Object.freeze(lowered)
}

function admitStructuredValue(
  value: unknown,
  context: StructuredCaptureContext,
  property: StructuredNativeProperty,
): StructuredValue {
  if (property === "transform") {
    return admitTransform(value, context, property)
  }
  if (property === "shadowOffset" || property === "textShadowOffset") {
    return admitOffsetValue(value, context, property)
  }
  if (property === "transformOrigin") {
    return admitTransformOrigin(value, context, property)
  }
  if (property === "transformMatrix") {
    return admitTransformMatrix(value, context, property)
  }
  return admitFontVariant(value, context, property)
}

function admitTransform(
  value: unknown,
  context: StructuredCaptureContext,
  property: "transform",
): TransformValue {
  const operations = admitDenseArray(value, context, property)
  return Object.freeze(operations.map((operation, index) => admitTransformOperation(operation, context, index)))
}

function admitTransformOperation(
  value: unknown,
  context: StructuredCaptureContext,
  index: number,
): TransformOperation {
  const invalid = (detail: string): never => {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid transform in ${context.sourceId} at ${context.className}.transform[${index}]: ${detail}.`, "transform")
  }
  if (!isPlainStructuredObject(value)) return invalid("expected one plain operation object")
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 1) {
    return invalid("expected exactly one operation key")
  }
  const key = names[0]!
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) {
    return invalid("operation values must be enumerable data properties")
  }
  const entry = descriptor.value
  if (numericTransformKeys.has(key)) {
    if (!isFiniteNumber(entry)) return invalid(`${key} must be a finite number`)
    return Object.freeze({ [key]: entry }) as TransformOperation
  }
  if (angularTransformKeys.has(key)) {
    if (!isAngle(entry)) return invalid(`${key} must be a finite deg or rad angle`)
    return Object.freeze({ [key]: entry }) as TransformOperation
  }
  if (key === "translateX" || key === "translateY") {
    if (!isFiniteNumber(entry) && !isPercentage(entry)) return invalid(`${key} must be a finite number or percentage`)
    return Object.freeze({ [key]: entry }) as TransformOperation
  }
  if (key === "matrix") {
    const matrix = admitDenseArray(entry, context, "transform", [16])
    if (!matrix.every(isFiniteNumber)) return invalid("matrix must contain exactly 16 finite numbers")
    return Object.freeze({ matrix: Object.freeze([...matrix]) as TransformMatrixValue })
  }
  return invalid(`unsupported operation ${JSON.stringify(key)}`)
}

function admitOffsetValue(
  value: unknown,
  context: StructuredCaptureContext,
  property: StructuredNativeProperty,
): ShadowOffsetValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}: expected a fixed finite width/height object.`, property)
  }
  if (!isPlainStructuredObject(value)) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}: expected a plain object.`, property)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Object.keys(descriptors)
  if (keys.length !== 2 || !keys.includes("width") || !keys.includes("height")) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}: expected exactly width and height.`, property)
  }
  const width = descriptors.width
  const height = descriptors.height
  if (width === undefined || height === undefined || !width.enumerable || !height.enumerable || !("value" in width) || !("value" in height) ||
    typeof width.value !== "number" || !Number.isFinite(width.value) || typeof height.value !== "number" || !Number.isFinite(height.value)) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}: width and height must be finite numbers.`, property)
  }
  return Object.freeze({ width: width.value, height: height.value })
}

function admitTransformOrigin(
  value: unknown,
  context: StructuredCaptureContext,
  property: "transformOrigin",
): TransformOriginValue {
  const entries = admitDenseArray(value, context, property, [2, 3])
  if (!entries.every(isTransformOriginEntry)) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}: expected finite numbers or percentage strings.`, property)
  }
  return Object.freeze([...entries]) as TransformOriginValue
}

function admitTransformMatrix(
  value: unknown,
  context: StructuredCaptureContext,
  property: "transformMatrix",
): TransformMatrixValue {
  const entries = admitDenseArray(value, context, property, [16])
  if (!entries.every(entry => typeof entry === "number" && Number.isFinite(entry))) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}: expected exactly 16 finite numbers.`, property)
  }
  return Object.freeze(entries as number[]) as TransformMatrixValue
}

function admitFontVariant(
  value: unknown,
  context: StructuredCaptureContext,
  property: "fontVariant",
): FontVariantValue {
  const entries = admitDenseArray(value, context, property)
  if (!entries.every(isFontVariant)) {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}: expected React Native font-variant literals.`, property)
  }
  return Object.freeze(entries as FontVariant[]) as FontVariantValue
}

function admitDenseArray(
  value: unknown,
  context: StructuredCaptureContext,
  property: StructuredNativeProperty,
  expectedLengths?: ReadonlyArray<number>,
): ReadonlyArray<unknown> {
  const entries = inspectDenseArray(value, expectedLengths)
  if (entries === undefined) {
    const expected = expectedLengths === undefined ? "a dense array" : `an array of length ${expectedLengths.join(" or ")}`
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid ${property} in ${context.sourceId} at ${context.className}.${property}: expected ${expected}.`, property)
  }
  return entries
}

function inspectDenseArray(
  value: unknown,
  expectedLengths?: ReadonlyArray<number>,
): ReadonlyArray<unknown> | undefined {
  if (!Array.isArray(value)) return undefined
  const prototype = Object.getPrototypeOf(value)
  const prototypeParent = prototype === null ? null : Object.getPrototypeOf(prototype)
  if (prototype !== Array.prototype && prototype !== null && prototypeParent !== null && Object.getPrototypeOf(prototypeParent) !== null) {
    return undefined
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length")
  const length = lengthDescriptor?.value
  if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0 ||
    (expectedLengths !== undefined && !expectedLengths.includes(length))) {
    return undefined
  }
  const names = Object.getOwnPropertyNames(value)
  const symbols = Object.getOwnPropertySymbols(value)
  if (symbols.length > 0 || names.length !== length + 1 || !names.every(name =>
    name === "length" || (Number.isSafeInteger(Number(name)) && Number(name) >= 0 && String(Number(name)) === name && Number(name) < length),
  )) {
    return undefined
  }
  const entries: unknown[] = []
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)]
    if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) return undefined
    entries.push(descriptor.value)
  }
  return entries
}

function isPlainStructuredObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === null || Object.getPrototypeOf(prototype) === null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isPercentage(value: unknown): value is `${number}%` {
  return typeof value === "string" && /^-?(?:\d+(?:\.\d+)?|\.\d+)%$/.test(value) &&
    Number.isFinite(Number.parseFloat(value.slice(0, -1)))
}

function isAngle(value: unknown): value is TransformAngle {
  return typeof value === "string" && /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:deg|rad)$/.test(value) &&
    Number.isFinite(Number.parseFloat(value.slice(0, -3)))
}

const numericTransformKeys = new Set(["perspective", "scale", "scaleX", "scaleY"])
const angularTransformKeys = new Set(["rotate", "rotateX", "rotateY", "rotateZ", "skewX", "skewY"])

function isTransformOriginEntry(value: unknown): value is TransformOriginEntry {
  return isFiniteNumber(value) || isPercentage(value)
}

const fontVariantSet: ReadonlySet<string> = new Set(fontVariantValues)
function isFontVariant(value: unknown): value is FontVariant {
  return typeof value === "string" && fontVariantSet.has(value)
}

function isStructuredValueForProperty(property: StructuredNativeProperty, value: unknown): boolean {
  if (property === "transform") return isTransformValue(value)
  if (property === "shadowOffset" || property === "textShadowOffset") {
    return typeof value === "object" && value !== null && !Array.isArray(value) &&
      Object.keys(value).length === 2 && "width" in value && "height" in value &&
      typeof value.width === "number" && Number.isFinite(value.width) &&
      typeof value.height === "number" && Number.isFinite(value.height)
  }
  if (property === "transformOrigin") {
    return inspectDenseArray(value, [2, 3])?.every(isTransformOriginEntry) === true
  }
  if (property === "transformMatrix") {
    return inspectDenseArray(value, [16])?.every(isFiniteNumber) === true
  }
  return inspectDenseArray(value)?.every(isFontVariant) === true
}

function isTransformValue(value: unknown): value is TransformValue {
  const operations = inspectDenseArray(value)
  return operations !== undefined && operations.every(isTransformOperation)
}

function isTransformOperation(value: unknown): value is TransformOperation {
  if (!isPlainStructuredObject(value)) return false
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 1) return false
  const key = names[0]!
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) return false
  const entry = descriptor.value
  if (numericTransformKeys.has(key)) return isFiniteNumber(entry)
  if (angularTransformKeys.has(key)) return isAngle(entry)
  if (key === "translateX" || key === "translateY") return isFiniteNumber(entry) || isPercentage(entry)
  if (key === "matrix") return inspectDenseArray(entry, [16])?.every(isFiniteNumber) === true
  return false
}

function freezeStructuredValue(value: StructuredValue): StructuredValue {
  if (Array.isArray(value)) return freezeStructuredArray(value) as StructuredValue
  return Object.freeze({ ...value })
}

function freezeStructuredArray(value: ReadonlyArray<unknown>): ReadonlyArray<unknown> {
  return Object.freeze(value.map(entry => {
    if (Array.isArray(entry)) return freezeStructuredArray(entry)
    if (typeof entry === "object" && entry !== null) {
      return Object.freeze(Object.fromEntries(Object.entries(entry).map(([key, nested]) => [key,
        Array.isArray(nested) ? freezeStructuredArray(nested) : nested])))
    }
    return entry
  }))
}

function withoutSelectedProperties(
  rule: Readonly<Record<string, unknown>>,
  selectedProperties: ReadonlyArray<StructuredNativeProperty>,
): Record<string, unknown> {
  const descriptors = Object.getOwnPropertyDescriptors(rule)
  for (const property of selectedProperties) delete descriptors[property]
  return Object.create(Object.getPrototypeOf(rule), descriptors) as Record<string, unknown>
}

function structuredAdmissionError(
  code: StructuredIrDiagnosticCode,
  sourceId: string,
  detail: string,
  property: StructuredNativeProperty = "shadowOffset",
): StructuredIrAdmissionError {
  return new StructuredIrAdmissionError([{ code, phase: "admission", property, sourceId, detail }])
}

function freezeStructuredBlock(block: StructuredDeclarationBlock): StructuredDeclarationBlock {
  const provenance = Object.freeze({
    ...block.provenance,
    exportPath: Object.freeze([...block.provenance.exportPath]),
    logicalPath: Object.freeze([...block.provenance.logicalPath]),
  })
  const declarations = block.declarations.map(declaration => Object.freeze({
    ...declaration,
    value: freezeStructuredValue(declaration.value),
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
