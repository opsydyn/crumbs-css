import {structuredPropertyPrimitives,fontVariantValues,isNativeStructuredValue} from "../native-structured-policy"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as SchemaIssue from "effect/SchemaIssue"
import {
  getNativeCaptureMetadata,
  type NativeCaptureOrigin,
  type NativePrimitiveDomain,
} from "./native-capture"

export type StructuredNativeProperty =
  | "boxShadow"
  | "filter"
  | "experimental_backgroundRepeat"
  | "experimental_backgroundSize"
  | "experimental_backgroundPosition"
  | "experimental_backgroundImage"
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
  readonly origin: NativeCaptureOrigin
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
export type BoxShadowOffset = number | `${number}%`
export type BoxShadowItem = {
  readonly offsetX: BoxShadowOffset
  readonly offsetY: BoxShadowOffset
  readonly color?: string
  readonly blurRadius?: number
  readonly spreadDistance?: number
  readonly inset?: boolean
}
export type BoxShadowValue = ReadonlyArray<BoxShadowItem>
export type FilterAmount = number | `${number}` | `${number}%` | `${number}px`
export type FilterBlur = number | `${number}` | `${number}px`
export type FilterHueRotate = 0 | "0" | `${number}deg` | `${number}rad`
export type DropShadowOffset = number | "0" | `${number}px`
export type DropShadowStandardDeviation = number | "0" | `${number}px`
export type DropShadowItem = {
  readonly offsetX: DropShadowOffset
  readonly offsetY: DropShadowOffset
  readonly standardDeviation?: DropShadowStandardDeviation
  readonly color?: string | number
}
export type FilterFunction =
  | { readonly brightness: FilterAmount }
  | { readonly blur: FilterBlur }
  | { readonly contrast: FilterAmount }
  | { readonly grayscale: FilterAmount }
  | { readonly hueRotate: FilterHueRotate }
  | { readonly invert: FilterAmount }
  | { readonly opacity: FilterAmount }
  | { readonly saturate: FilterAmount }
  | { readonly sepia: FilterAmount }
  | { readonly dropShadow: DropShadowItem }
export type FilterValue = ReadonlyArray<FilterFunction>
export type BackgroundRepeatKeyword = "repeat" | "space" | "round" | "no-repeat"
export type BackgroundRepeatValue = {
  readonly x: BackgroundRepeatKeyword
  readonly y: BackgroundRepeatKeyword
}
export type BackgroundRepeatList = ReadonlyArray<BackgroundRepeatValue>
export type BackgroundSizeLength = number | "auto" | `${number}px` | `${number}%`
export type BackgroundSizeRecord = {
  readonly x: BackgroundSizeLength
  readonly y: BackgroundSizeLength
}
export type BackgroundSizeValue = BackgroundSizeRecord | "cover" | "contain"
export type BackgroundSizeList = ReadonlyArray<BackgroundSizeValue>
export type BackgroundPositionLength = number | "0" | `${number}px` | `${number}%`
export type BackgroundPositionTopLeft = {
  readonly top: BackgroundPositionLength
  readonly left: BackgroundPositionLength
}
export type BackgroundPositionTopRight = {
  readonly top: BackgroundPositionLength
  readonly right: BackgroundPositionLength
}
export type BackgroundPositionBottomLeft = {
  readonly bottom: BackgroundPositionLength
  readonly left: BackgroundPositionLength
}
export type BackgroundPositionBottomRight = {
  readonly bottom: BackgroundPositionLength
  readonly right: BackgroundPositionLength
}
export type BackgroundPositionValue =
  | BackgroundPositionTopLeft
  | BackgroundPositionTopRight
  | BackgroundPositionBottomLeft
  | BackgroundPositionBottomRight
export type BackgroundPositionList = ReadonlyArray<BackgroundPositionValue>
export type BackgroundGradientStopPosition = number | `${number}%`
export type BackgroundGradientColorStop = {
  readonly color: string | null
  readonly positions?: ReadonlyArray<BackgroundGradientStopPosition>
}
export type BackgroundLinearDirection =
  | `${number}deg`
  | `${number}grad`
  | `${number}rad`
  | `${number}turn`
  | "to top"
  | "to right"
  | "to bottom"
  | "to left"
  | "to top right"
  | "to right top"
  | "to bottom right"
  | "to right bottom"
  | "to top left"
  | "to left top"
  | "to bottom left"
  | "to left bottom"
export type BackgroundLinearGradientValue = {
  readonly type: "linear-gradient"
  readonly direction: BackgroundLinearDirection
  readonly colorStops: ReadonlyArray<BackgroundGradientColorStop>
}
export type BackgroundRadialShape = "circle" | "ellipse"
export type BackgroundRadialExtent = "closest-corner" | "closest-side" | "farthest-corner" | "farthest-side"
export type BackgroundRadialSizeLength = number | `${number}px` | `${number}%`
export type BackgroundRadialSize = BackgroundRadialExtent | {
  readonly x: BackgroundRadialSizeLength
  readonly y: BackgroundRadialSizeLength
}
export type BackgroundRadialGradientValue = {
  readonly type: "radial-gradient"
  readonly shape: BackgroundRadialShape
  readonly size: BackgroundRadialSize
  readonly position: BackgroundPositionValue
  readonly colorStops: ReadonlyArray<BackgroundGradientColorStop>
}
export type BackgroundImageValue = BackgroundLinearGradientValue | BackgroundRadialGradientValue
export type BackgroundImageList = ReadonlyArray<BackgroundImageValue>
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
export type StructuredValue = ShadowOffsetValue | TransformOriginValue | TransformMatrixValue | TransformValue | BoxShadowValue | FilterValue | BackgroundRepeatList | BackgroundSizeList | BackgroundPositionList | BackgroundImageList | FontVariantValue
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
  "boxShadow", "filter", "experimental_backgroundRepeat", "experimental_backgroundSize", "experimental_backgroundPosition", "experimental_backgroundImage", "transform", "shadowOffset", "textShadowOffset", "transformOrigin", "transformMatrix", "fontVariant",
] as const satisfies ReadonlyArray<StructuredNativeProperty>

export function isStructuredNativeProperty(value: string): value is StructuredNativeProperty {
  return (structuredProperties as readonly string[]).includes(value)
}

const allPrimitives = ["view", "text", "image"] as const

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
  origin: Schema.Literals(["crumbs-native", "vanilla-extract-adapter"]),
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
const BoxShadowOffsetSchema = Schema.Union([Schema.Finite, PercentageValueSchema])
const BoxShadowColorSchema = Schema.NonEmptyString.check(Schema.makeFilter<string>(value => /^var\s*\(/i.test(value)
  ? { path: [], issue: "Nested colour tokens are not static box-shadow values" }
  : undefined))
const BoxShadowBlurSchema = Schema.Finite.check(Schema.makeFilter<number>(value => value >= 0
  ? undefined : { path: [], issue: "Expected a non-negative blur radius" }))
const BoxShadowItemSchema = Schema.Struct({
  offsetX: BoxShadowOffsetSchema,
  offsetY: BoxShadowOffsetSchema,
  color: Schema.optional(BoxShadowColorSchema),
  blurRadius: Schema.optional(BoxShadowBlurSchema),
  spreadDistance: Schema.optional(Schema.Finite),
  inset: Schema.optional(Schema.Boolean),
})
const BoxShadowValueSchema = Schema.Array(BoxShadowItemSchema)
const FilterAmountStringSchema = Schema.String.check(
  Schema.isPattern(/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:%|px)?$/),
  Schema.makeFilter<string>(value => Number.isFinite(Number.parseFloat(value)) && Number.parseFloat(value) >= 0
    ? undefined : { path: [], issue: "Expected a non-negative finite filter amount" }),
)
const FilterAmountSchema = Schema.Union([
  Schema.Finite.check(Schema.makeFilter<number>(value => value >= 0
    ? undefined : { path: [], issue: "Expected a non-negative filter amount" })),
  FilterAmountStringSchema,
])
const FilterBlurStringSchema = Schema.String.check(
  Schema.isPattern(/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px)?$/),
  Schema.makeFilter<string>(value => Number.isFinite(Number.parseFloat(value)) && Number.parseFloat(value) >= 0
    ? undefined : { path: [], issue: "Expected a non-negative finite blur amount" }),
)
const FilterBlurSchema = Schema.Union([
  Schema.Finite.check(Schema.makeFilter<number>(value => value >= 0
    ? undefined : { path: [], issue: "Expected a non-negative blur amount" })),
  FilterBlurStringSchema,
])
const FilterHueRotateSchema = Schema.Union([Schema.Literal(0), Schema.Literal("0"), AngleValueSchema])
const DropShadowLengthStringSchema = Schema.String.check(
  Schema.isPattern(/^(?:0|-?(?:\d+(?:\.\d+)?|\.\d+)px)$/),
  Schema.makeFilter<string>(value => value === "0" || Number.isFinite(Number.parseFloat(value))
    ? undefined : { path: [], issue: "Expected a finite zero or pixel length" }),
)
const DropShadowOffsetSchema = Schema.Union([Schema.Finite, DropShadowLengthStringSchema])
const DropShadowStandardDeviationSchema = Schema.Union([
  Schema.Finite.check(Schema.makeFilter<number>(value => value >= 0
    ? undefined : { path: [], issue: "Expected a non-negative standard deviation" })),
  DropShadowLengthStringSchema.check(Schema.makeFilter<string>(value => value === "0" || !value.startsWith("-")
    ? undefined : { path: [], issue: "Expected a non-negative standard deviation" })),
])
const DropShadowColorSchema = Schema.Union([
  Schema.NonEmptyString.check(Schema.makeFilter<string>(value => /^var\s*\(/i.test(value)
    ? { path: [], issue: "Nested colour tokens are not static filter values" }
    : undefined)),
  Schema.Finite,
])
const DropShadowItemSchema = Schema.Struct({
  offsetX: DropShadowOffsetSchema,
  offsetY: DropShadowOffsetSchema,
  standardDeviation: Schema.optional(DropShadowStandardDeviationSchema),
  color: Schema.optional(DropShadowColorSchema),
})
const FilterFunctionSchema = Schema.Union([
  Schema.Struct({ brightness: FilterAmountSchema }),
  Schema.Struct({ blur: FilterBlurSchema }),
  Schema.Struct({ contrast: FilterAmountSchema }),
  Schema.Struct({ grayscale: FilterAmountSchema }),
  Schema.Struct({ hueRotate: FilterHueRotateSchema }),
  Schema.Struct({ invert: FilterAmountSchema }),
  Schema.Struct({ opacity: FilterAmountSchema }),
  Schema.Struct({ saturate: FilterAmountSchema }),
  Schema.Struct({ sepia: FilterAmountSchema }),
  Schema.Struct({ dropShadow: DropShadowItemSchema }),
])
const FilterValueSchema = Schema.Array(FilterFunctionSchema)
const BackgroundRepeatKeywordSchema = Schema.Literals(["repeat", "space", "round", "no-repeat"])
const BackgroundRepeatValueSchema = Schema.Struct({
  x: BackgroundRepeatKeywordSchema,
  y: BackgroundRepeatKeywordSchema,
})
const BackgroundRepeatListSchema = Schema.Array(BackgroundRepeatValueSchema)
const BackgroundSizeLengthStringSchema = Schema.String.check(
  Schema.isPattern(/^(?:auto|(?:\d+(?:\.\d+)?|\.\d+)(?:px|%))$/),
  Schema.makeFilter<string>(value => value === "auto" ||
    (Number.isFinite(Number.parseFloat(value)) && Number.parseFloat(value) >= 0)
    ? undefined : { path: [], issue: "Expected a finite non-negative px or percentage size" }),
)
const BackgroundSizeLengthSchema = Schema.Union([
  Schema.Finite.check(Schema.makeFilter<number>(value => value >= 0
    ? undefined : { path: [], issue: "Expected a non-negative size" })),
  BackgroundSizeLengthStringSchema,
])
const BackgroundSizeRecordSchema = Schema.Struct({
  x: BackgroundSizeLengthSchema,
  y: BackgroundSizeLengthSchema,
})
const BackgroundSizeValueSchema = Schema.Union([
  Schema.Literals(["cover", "contain"]),
  BackgroundSizeRecordSchema,
])
const BackgroundSizeListSchema = Schema.Array(BackgroundSizeValueSchema)
const BackgroundPositionLengthStringSchema = Schema.String.check(
  Schema.isPattern(/^(?:0|-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|%))$/),
  Schema.makeFilter<string>(value => value === "0" || Number.isFinite(Number.parseFloat(value))
    ? undefined : { path: [], issue: "Expected a finite zero, px or percentage position" }),
)
const BackgroundPositionLengthSchema = Schema.Union([Schema.Finite, BackgroundPositionLengthStringSchema])
const BackgroundPositionTopLeftSchema = Schema.Struct({
  top: BackgroundPositionLengthSchema,
  left: BackgroundPositionLengthSchema,
})
const BackgroundPositionTopRightSchema = Schema.Struct({
  top: BackgroundPositionLengthSchema,
  right: BackgroundPositionLengthSchema,
})
const BackgroundPositionBottomLeftSchema = Schema.Struct({
  bottom: BackgroundPositionLengthSchema,
  left: BackgroundPositionLengthSchema,
})
const BackgroundPositionBottomRightSchema = Schema.Struct({
  bottom: BackgroundPositionLengthSchema,
  right: BackgroundPositionLengthSchema,
})
const BackgroundPositionValueSchema = Schema.Union([
  BackgroundPositionTopLeftSchema,
  BackgroundPositionTopRightSchema,
  BackgroundPositionBottomLeftSchema,
  BackgroundPositionBottomRightSchema,
])
const BackgroundPositionListSchema = Schema.Array(BackgroundPositionValueSchema)
const BackgroundGradientColorSchema = Schema.String.check(Schema.makeFilter<string>(value =>
  value.length > 0 && !/^var\s*\(/i.test(value)
    ? undefined : { path: [], issue: "Expected a non-empty native gradient colour string" },
))
const BackgroundGradientStopPositionSchema = Schema.Union([Schema.Finite, PercentageValueSchema])
const BackgroundGradientColorStopSchema = Schema.Struct({
  color: Schema.Union([BackgroundGradientColorSchema, Schema.Null]),
  positions: Schema.optional(Schema.Array(BackgroundGradientStopPositionSchema)),
})
const BackgroundLinearDirectionSchema = Schema.String.check(Schema.makeFilter<string>(value =>
  isBackgroundLinearDirection(value)
    ? undefined : { path: [], issue: "Expected a finite deg/grad/rad/turn angle or supported direction keyword" },
))
const BackgroundLinearGradientSchema = Schema.Struct({
  type: Schema.Literal("linear-gradient"),
  direction: BackgroundLinearDirectionSchema,
  colorStops: Schema.Array(BackgroundGradientColorStopSchema),
})
const BackgroundRadialShapeSchema = Schema.Literals(["circle", "ellipse"])
const BackgroundRadialExtentSchema = Schema.Literals(["closest-corner", "closest-side", "farthest-corner", "farthest-side"])
const BackgroundRadialSizeLengthStringSchema = Schema.String.check(
  Schema.isPattern(/^(?:\d+(?:\.\d+)?|\.\d+)(?:px|%)$/),
  Schema.makeFilter<string>(value => Number.isFinite(Number.parseFloat(value)) && Number.parseFloat(value) >= 0
    ? undefined : { path: [], issue: "Expected a finite non-negative radial size length" }),
)
const BackgroundRadialSizeLengthSchema = Schema.Union([
  Schema.Finite.check(Schema.makeFilter<number>(value => value >= 0
    ? undefined : { path: [], issue: "Expected a non-negative radial size" })),
  BackgroundRadialSizeLengthStringSchema,
])
const BackgroundRadialSizeRecordSchema = Schema.Struct({
  x: BackgroundRadialSizeLengthSchema,
  y: BackgroundRadialSizeLengthSchema,
})
const BackgroundRadialSizeSchema = Schema.Union([BackgroundRadialExtentSchema, BackgroundRadialSizeRecordSchema])
const BackgroundRadialGradientSchema = Schema.Struct({
  type: Schema.Literal("radial-gradient"),
  shape: BackgroundRadialShapeSchema,
  size: BackgroundRadialSizeSchema,
  position: BackgroundPositionValueSchema,
  colorStops: Schema.Array(BackgroundGradientColorStopSchema),
})
const BackgroundImageValueSchema = Schema.Union([BackgroundLinearGradientSchema, BackgroundRadialGradientSchema])
const BackgroundImageListSchema = Schema.Array(BackgroundImageValueSchema)

const FontVariantValueSchema = Schema.Array(Schema.Literals(fontVariantValues))
const StructuredValueSchema = Schema.Union([
  ShadowOffsetValueSchema,
  TransformOriginValueSchema,
  TransformMatrixValueSchema,
  TransformValueSchema,
  BoxShadowValueSchema,
  FilterValueSchema,
  BackgroundRepeatListSchema,
  BackgroundSizeListSchema,
  BackgroundPositionListSchema,
  BackgroundImageListSchema,
  FontVariantValueSchema,
])
const StructuredNativePropertySchema = Schema.Literals([
  "boxShadow", "filter", "experimental_backgroundRepeat", "experimental_backgroundSize", "experimental_backgroundPosition", "experimental_backgroundImage", "transform", "shadowOffset", "textShadowOffset", "transformOrigin", "transformMatrix", "fontVariant",
])
const StructuredPropertyProvenanceSchema = Schema.Struct({
  packageOwner: Schema.NonEmptyString,
  sourceId: Schema.NonEmptyString,
  exportPath: Schema.Array(PathSegment),
  logicalPath: Schema.Array(PathSegment),
  origin: Schema.Literals(["crumbs-native", "vanilla-extract-adapter"]),
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
    // React Native also exposes string forms for transform, boxShadow, filter and
    // experimental background properties.
    // Leave those forms on the compatibility route while taking only ordered
    // static arrays into IR.
    return (property !== "transform" && property !== "boxShadow" && property !== "filter" && property !== "experimental_backgroundRepeat" && property !== "experimental_backgroundSize" && property !== "experimental_backgroundPosition" && property !== "experimental_backgroundImage") || !("value" in descriptor) || Array.isArray(descriptor.value)
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
        origin: metadata.origin,
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
      origin: metadata.origin,
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
  if (property === "boxShadow") {
    return admitBoxShadow(value, context, property)
  }
  if (property === "filter") {
    return admitFilter(value, context, property)
  }
  if (property === "experimental_backgroundRepeat") {
    return admitBackgroundRepeat(value, context, property)
  }
  if (property === "experimental_backgroundSize") {
    return admitBackgroundSize(value, context, property)
  }
  if (property === "experimental_backgroundPosition") {
    return admitBackgroundPosition(value, context, property)
  }
  if (property === "experimental_backgroundImage") {
    return admitBackgroundImage(value, context, property)
  }
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

function admitBoxShadow(
  value: unknown,
  context: StructuredCaptureContext,
  property: "boxShadow",
): BoxShadowValue {
  const items = admitDenseArray(value, context, property)
  return Object.freeze(items.map((item, index) => admitBoxShadowItem(item, context, index)))
}

function admitBoxShadowItem(
  value: unknown,
  context: StructuredCaptureContext,
  index: number,
): BoxShadowItem {
  const invalid = (detail: string): never => {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid boxShadow in ${context.sourceId} at ${context.className}.boxShadow[${index}]: ${detail}.`, "boxShadow")
  }
  if (!isPlainStructuredObject(value)) return invalid("expected one plain item object")
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length < 2 || names.length > 6 ||
    !names.includes("offsetX") || !names.includes("offsetY") || names.some(name => !boxShadowKeys.has(name))) {
    return invalid("expected offsetX and offsetY plus only supported optional fields")
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const entries: Record<string, unknown> = {}
  for (const name of names) {
    const descriptor = descriptors[name]
    if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) {
      return invalid(`${name} must be an enumerable data property`)
    }
    entries[name] = descriptor.value
  }
  if (!isBoxShadowOffset(entries.offsetX) || !isBoxShadowOffset(entries.offsetY)) {
    return invalid("offsetX and offsetY must be finite numbers or finite percentages")
  }
  if ("color" in entries && !isBoxShadowColor(entries.color)) {
    return invalid("color must be a non-empty native colour string")
  }
  if ("blurRadius" in entries && (!isFiniteNumber(entries.blurRadius) || entries.blurRadius < 0)) {
    return invalid("blurRadius must be a non-negative finite number")
  }
  if ("spreadDistance" in entries && !isFiniteNumber(entries.spreadDistance)) {
    return invalid("spreadDistance must be a finite number")
  }
  if ("inset" in entries && typeof entries.inset !== "boolean") {
    return invalid("inset must be a boolean")
  }
  return Object.freeze(entries) as BoxShadowItem
}

function admitFilter(
  value: unknown,
  context: StructuredCaptureContext,
  property: "filter",
): FilterValue {
  const entries = admitDenseArray(value, context, property)
  return Object.freeze(entries.map((entry, index) => admitFilterFunction(entry, context, index)))
}

function admitFilterFunction(
  value: unknown,
  context: StructuredCaptureContext,
  index: number,
): FilterFunction {
  const invalid = (detail: string): never => {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid filter in ${context.sourceId} at ${context.className}.filter[${index}]: ${detail}.`, "filter")
  }
  if (!isPlainStructuredObject(value)) return invalid("expected one plain filter function object")
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 1) {
    return invalid("expected exactly one filter function key")
  }
  const key = names[0]!
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) {
    return invalid("filter function values must be enumerable data properties")
  }
  const entry = descriptor.value
  if (filterAmountKeys.has(key)) {
    if (!isFilterAmount(entry)) return invalid(`${key} must be a non-negative finite number or supported string amount`)
    return Object.freeze({ [key]: entry }) as FilterFunction
  }
  if (key === "blur") {
    if (!isFilterBlur(entry)) return invalid("blur must be a non-negative finite number or pixel string")
    return Object.freeze({ blur: entry })
  }
  if (key === "hueRotate") {
    if (!isFilterHueRotate(entry)) return invalid("hueRotate must be zero or a finite deg/rad angle")
    return Object.freeze({ hueRotate: entry })
  }
  if (key === "dropShadow") {
    return Object.freeze({ dropShadow: admitDropShadow(entry, context, index) })
  }
  return invalid(`unsupported filter function ${JSON.stringify(key)}`)
}

function admitBackgroundRepeat(
  value: unknown,
  context: StructuredCaptureContext,
  property: "experimental_backgroundRepeat",
): BackgroundRepeatList {
  const entries = admitDenseArray(value, context, property)
  return Object.freeze(entries.map((entry, index) => admitBackgroundRepeatValue(entry, context, index)))
}

function admitBackgroundRepeatValue(
  value: unknown,
  context: StructuredCaptureContext,
  index: number,
): BackgroundRepeatValue {
  const invalid = (detail: string): never => {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid experimental_backgroundRepeat in ${context.sourceId} at ${context.className}.experimental_backgroundRepeat[${index}]: ${detail}.`, "experimental_backgroundRepeat")
  }
  if (!isPlainStructuredObject(value)) return invalid("expected one plain { x, y } record")
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 2 ||
    !names.includes("x") || !names.includes("y")) {
    return invalid("expected exactly x and y repeat-keyword fields")
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const x = descriptors.x
  const y = descriptors.y
  if (x === undefined || y === undefined || x.enumerable !== true || y.enumerable !== true ||
    !("value" in x) || !("value" in y)) {
    return invalid("x and y must be enumerable data properties")
  }
  if (!isBackgroundRepeatKeyword(x.value) || !isBackgroundRepeatKeyword(y.value)) {
    return invalid("x and y must be repeat, space, round or no-repeat")
  }
  return Object.freeze({ x: x.value, y: y.value })
}

function admitBackgroundSize(
  value: unknown,
  context: StructuredCaptureContext,
  property: "experimental_backgroundSize",
): BackgroundSizeList {
  const entries = admitDenseArray(value, context, property)
  return Object.freeze(entries.map((entry, index) => admitBackgroundSizeValue(entry, context, index)))
}

function admitBackgroundSizeValue(
  value: unknown,
  context: StructuredCaptureContext,
  index: number,
): BackgroundSizeValue {
  const invalid = (detail: string): never => {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid experimental_backgroundSize in ${context.sourceId} at ${context.className}.experimental_backgroundSize[${index}]: ${detail}.`, "experimental_backgroundSize")
  }
  if (value === "cover" || value === "contain") return value
  if (!isPlainStructuredObject(value)) return invalid("expected cover, contain or one plain { x, y } record")
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 2 ||
    !names.includes("x") || !names.includes("y")) {
    return invalid("expected exactly x and y size fields")
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const x = descriptors.x
  const y = descriptors.y
  if (x === undefined || y === undefined || x.enumerable !== true || y.enumerable !== true ||
    !("value" in x) || !("value" in y)) {
    return invalid("x and y must be enumerable data properties")
  }
  if (!isBackgroundSizeLength(x.value) || !isBackgroundSizeLength(y.value)) {
    return invalid("x and y must be finite non-negative numbers, auto, px or percentage lengths")
  }
  return Object.freeze({ x: x.value, y: y.value })
}

function admitBackgroundPosition(
  value: unknown,
  context: StructuredCaptureContext,
  property: "experimental_backgroundPosition",
): BackgroundPositionList {
  const entries = admitDenseArray(value, context, property)
  return Object.freeze(entries.map((entry, index) => admitBackgroundPositionValue(entry, context, index)))
}

function admitBackgroundPositionValue(
  value: unknown,
  context: StructuredCaptureContext,
  index: number,
): BackgroundPositionValue {
  const invalid = (detail: string): never => {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid experimental_backgroundPosition in ${context.sourceId} at ${context.className}.experimental_backgroundPosition[${index}]: ${detail}.`, "experimental_backgroundPosition")
  }
  if (!isPlainStructuredObject(value)) return invalid("expected one plain top/left, top/right, bottom/left or bottom/right record")
  const names = Object.getOwnPropertyNames(value)
  const shape = backgroundPositionShapes.find(candidate => candidate.every(name => names.includes(name)))
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 2 || shape === undefined || names.some(name => name !== shape[0] && name !== shape[1])) {
    return invalid("expected exactly one supported positional record shape")
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const first = descriptors[shape[0]]
  const second = descriptors[shape[1]]
  if (first === undefined || second === undefined || first.enumerable !== true || second.enumerable !== true ||
    !("value" in first) || !("value" in second)) {
    return invalid("position fields must be enumerable data properties")
  }
  if (!isBackgroundPositionLength(first.value) || !isBackgroundPositionLength(second.value)) {
    return invalid("position fields must be finite numbers, zero, px or percentage lengths")
  }
  return Object.freeze({ [shape[0]]: first.value, [shape[1]]: second.value }) as BackgroundPositionValue
}

function admitBackgroundImage(
  value: unknown,
  context: StructuredCaptureContext,
  property: "experimental_backgroundImage",
): BackgroundImageList {
  const entries = admitDenseArray(value, context, property)
  return Object.freeze(entries.map((entry, index) => admitBackgroundImageValue(entry, context, index)))
}

function admitBackgroundImageValue(
  value: unknown,
  context: StructuredCaptureContext,
  index: number,
): BackgroundImageValue {
  const invalid = (detail: string): never => {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid experimental_backgroundImage in ${context.sourceId} at ${context.className}.experimental_backgroundImage[${index}]: ${detail}.`, "experimental_backgroundImage")
  }
  if (!isPlainStructuredObject(value)) return invalid("expected one canonical linear-gradient or radial-gradient record")
  const typeDescriptor = Object.getOwnPropertyDescriptor(value, "type")
  if (typeDescriptor === undefined || typeDescriptor.enumerable !== true || !("value" in typeDescriptor)) {
    return invalid("type must be an enumerable data property")
  }
  if (typeDescriptor.value === "linear-gradient") return admitBackgroundLinearGradient(value, context, index)
  if (typeDescriptor.value === "radial-gradient") return admitBackgroundRadialGradient(value, context, index)
  return invalid("type must be linear-gradient or radial-gradient")
}

function admitBackgroundLinearGradient(
  value: Record<string, unknown>,
  context: StructuredCaptureContext,
  index: number,
): BackgroundLinearGradientValue {
  const invalid = (detail: string): never => {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid experimental_backgroundImage in ${context.sourceId} at ${context.className}.experimental_backgroundImage[${index}]: ${detail}.`, "experimental_backgroundImage")
  }
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 3 ||
    names.some(name => name !== "type" && name !== "direction" && name !== "colorStops")) {
    return invalid("linear gradients require exactly type, direction and colorStops")
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const direction = descriptors.direction
  const colorStops = descriptors.colorStops
  if (direction === undefined || colorStops === undefined || direction.enumerable !== true || colorStops.enumerable !== true ||
    !("value" in direction) || !("value" in colorStops)) {
    return invalid("linear gradient fields must be enumerable data properties")
  }
  if (!isBackgroundLinearDirection(direction.value)) {
    return invalid("direction must be a finite deg, grad, rad or turn angle or supported keyword")
  }
  return Object.freeze({
    type: "linear-gradient",
    direction: direction.value,
    colorStops: admitBackgroundGradientStops(colorStops.value, context, invalid),
  })
}

function admitBackgroundRadialGradient(
  value: Record<string, unknown>,
  context: StructuredCaptureContext,
  index: number,
): BackgroundRadialGradientValue {
  const invalid = (detail: string): never => {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid experimental_backgroundImage in ${context.sourceId} at ${context.className}.experimental_backgroundImage[${index}]: ${detail}.`, "experimental_backgroundImage")
  }
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 5 ||
    names.some(name => name !== "type" && name !== "shape" && name !== "size" && name !== "position" && name !== "colorStops")) {
    return invalid("radial gradients require exactly type, shape, size, position and colorStops")
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const shape = descriptors.shape
  const size = descriptors.size
  const position = descriptors.position
  const colorStops = descriptors.colorStops
  if (shape === undefined || size === undefined || position === undefined || colorStops === undefined ||
    shape.enumerable !== true || size.enumerable !== true || position.enumerable !== true || colorStops.enumerable !== true ||
    !("value" in shape) || !("value" in size) || !("value" in position) || !("value" in colorStops)) {
    return invalid("radial gradient fields must be enumerable data properties")
  }
  if (!isBackgroundRadialShape(shape.value)) return invalid("shape must be circle or ellipse")
  const radialSize = admitBackgroundRadialSize(size.value)
  if (radialSize === undefined) return invalid("size must be a radial extent or finite non-negative x/y lengths")
  const radialPosition = cloneBackgroundPositionRecord(position.value)
  if (radialPosition === undefined) return invalid("position must be one canonical top/left, top/right, bottom/left or bottom/right record")
  return Object.freeze({
    type: "radial-gradient",
    shape: shape.value,
    size: radialSize,
    position: radialPosition,
    colorStops: admitBackgroundGradientStops(colorStops.value, context, invalid),
  })
}

function admitBackgroundGradientStops(
  value: unknown,
  context: StructuredCaptureContext,
  invalid: (detail: string) => never,
): ReadonlyArray<BackgroundGradientColorStop> {
  const entries = inspectDenseArray(value)
  if (entries === undefined || entries.length < 2) return invalid("colorStops must be a dense array with at least two entries")
  const stops = entries.map((entry, stopIndex) => admitBackgroundGradientStop(entry, context, stopIndex, invalid))
  if (stops.filter(stop => stop.color !== null).length < 2) return invalid("colorStops must contain at least two colour stops")
  for (let index = 0; index < stops.length; index += 1) {
    if (stops[index]!.color === null &&
      (index === 0 || index === stops.length - 1 || stops[index - 1]!.color === null || stops[index + 1]!.color === null)) {
      return invalid("transition hints must sit between two colour stops")
    }
  }
  return Object.freeze(stops)
}

function admitBackgroundGradientStop(
  value: unknown,
  context: StructuredCaptureContext,
  stopIndex: number,
  invalid: (detail: string) => never,
): BackgroundGradientColorStop {
  if (!isPlainStructuredObject(value)) return invalid(`colorStops[${stopIndex}] must be a plain colour-stop object`)
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length < 1 || names.length > 2 ||
    !names.includes("color") || names.some(name => name !== "color" && name !== "positions")) {
    return invalid(`colorStops[${stopIndex}] must contain color and optional positions only`)
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const color = descriptors.color
  const positions = descriptors.positions
  if (color === undefined || color.enumerable !== true || !("value" in color) ||
    (positions !== undefined && (positions.enumerable !== true || !("value" in positions)))) {
    return invalid(`colorStops[${stopIndex}] fields must be enumerable data properties`)
  }
  if (color.value !== null && !isBackgroundGradientColor(color.value)) {
    return invalid(`colorStops[${stopIndex}].color must be null or a non-empty native colour string`)
  }
  let clonedPositions: ReadonlyArray<BackgroundGradientStopPosition> | undefined
  if (positions !== undefined) {
    const entries = inspectDenseArray(positions.value)
    if (entries === undefined || entries.length > 2 || !entries.every(isBackgroundGradientStopPosition)) {
      return invalid(`colorStops[${stopIndex}].positions must be a dense array of finite numbers or percentages`)
    }
    if (color.value === null && entries.length !== 1) {
      return invalid(`colorStops[${stopIndex}] transition hints require exactly one position`)
    }
    clonedPositions = Object.freeze(entries as BackgroundGradientStopPosition[])
  } else if (color.value === null) {
    return invalid(`colorStops[${stopIndex}] transition hints require exactly one position`)
  }
  return Object.freeze({
    color: color.value,
    ...(clonedPositions === undefined ? {} : { positions: clonedPositions }),
  })
}

function admitBackgroundRadialSize(
  value: unknown,
): BackgroundRadialSize | undefined {
  if (isBackgroundRadialExtent(value)) return value
  if (!isPlainStructuredObject(value)) return undefined
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 2 ||
    names.some(name => name !== "x" && name !== "y")) return undefined
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const x = descriptors.x
  const y = descriptors.y
  if (x === undefined || y === undefined || x.enumerable !== true || y.enumerable !== true ||
    !("value" in x) || !("value" in y) || !isBackgroundRadialSizeLength(x.value) || !isBackgroundRadialSizeLength(y.value)) return undefined
  return Object.freeze({ x: x.value, y: y.value })
}

function cloneBackgroundPositionRecord(value: unknown): BackgroundPositionValue | undefined {
  if (!isBackgroundPositionValue(value)) return undefined
  const names = Object.getOwnPropertyNames(value)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const first = descriptors[names[0]!]
  const second = descriptors[names[1]!]
  if (first === undefined || second === undefined || !("value" in first) || !("value" in second)) return undefined
  return Object.freeze({ [names[0]!]: first.value, [names[1]!]: second.value }) as BackgroundPositionValue
}

function admitDropShadow(
  value: unknown,
  context: StructuredCaptureContext,
  index: number,
): DropShadowItem {
  const invalid = (detail: string): never => {
    throw structuredAdmissionError("CRUMBS_STRUCTURED_IR_INVALID_VALUE", context.sourceId,
      `Invalid filter in ${context.sourceId} at ${context.className}.filter[${index}].dropShadow: ${detail}.`, "filter")
  }
  if (!isPlainStructuredObject(value)) return invalid("expected one plain dropShadow item object")
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length < 2 || names.length > 4 ||
    !names.includes("offsetX") || !names.includes("offsetY") || names.some(name => !dropShadowKeys.has(name))) {
    return invalid("expected offsetX and offsetY plus only supported optional fields")
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const entries: Record<string, unknown> = {}
  for (const name of names) {
    const descriptor = descriptors[name]
    if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) {
      return invalid(`${name} must be an enumerable data property`)
    }
    entries[name] = descriptor.value
  }
  if (!isDropShadowOffset(entries.offsetX) || !isDropShadowOffset(entries.offsetY)) {
    return invalid("offsetX and offsetY must be finite numbers, zero or pixel lengths")
  }
  if ("standardDeviation" in entries && !isDropShadowStandardDeviation(entries.standardDeviation)) {
    return invalid("standardDeviation must be a non-negative finite number, zero or pixel length")
  }
  if ("color" in entries && !isDropShadowColor(entries.color)) {
    return invalid("color must be a finite numeric colour or non-empty native colour string")
  }
  return Object.freeze(entries) as DropShadowItem
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

function isBoxShadowOffset(value: unknown): value is BoxShadowOffset {
  return isFiniteNumber(value) || isPercentage(value)
}

function isBoxShadowColor(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !/^var\s*\(/i.test(value)
}

function isBackgroundRepeatKeyword(value: unknown): value is BackgroundRepeatKeyword {
  return typeof value === "string" && backgroundRepeatKeywords.has(value)
}

function isBackgroundSizeLength(value: unknown): value is BackgroundSizeLength {
  if (isFiniteNumber(value)) return value >= 0
  return typeof value === "string" && (value === "auto" || backgroundSizeLengthPattern.test(value)) &&
    (value === "auto" || Number.isFinite(Number.parseFloat(value)))
}

function isBackgroundPositionLength(value: unknown): value is BackgroundPositionLength {
  return isFiniteNumber(value) || (typeof value === "string" && backgroundPositionLengthPattern.test(value) &&
    (value === "0" || Number.isFinite(Number.parseFloat(value))))
}

function isBackgroundGradientColor(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !/^var\s*\(/i.test(value)
}

function isBackgroundGradientStopPosition(value: unknown): value is BackgroundGradientStopPosition {
  return isFiniteNumber(value) || isPercentage(value)
}

function isBackgroundLinearDirection(value: unknown): value is BackgroundLinearDirection {
  return typeof value === "string" && (backgroundLinearDirectionKeywords.has(value) ||
    backgroundLinearAnglePattern.test(value) && Number.isFinite(Number.parseFloat(value)))
}

function isBackgroundRadialShape(value: unknown): value is BackgroundRadialShape {
  return value === "circle" || value === "ellipse"
}

function isBackgroundRadialExtent(value: unknown): value is BackgroundRadialExtent {
  return typeof value === "string" && backgroundRadialExtents.has(value)
}

function isBackgroundRadialSizeLength(value: unknown): value is BackgroundRadialSizeLength {
  if (isFiniteNumber(value)) return value >= 0
  return typeof value === "string" && backgroundRadialSizeLengthPattern.test(value) &&
    Number.isFinite(Number.parseFloat(value)) && Number.parseFloat(value) >= 0
}

const filterAmountKeys = new Set(["brightness", "contrast", "grayscale", "invert", "opacity", "saturate", "sepia"])
const dropShadowKeys = new Set(["offsetX", "offsetY", "standardDeviation", "color"])
const backgroundRepeatKeywords: ReadonlySet<string> = new Set(["repeat", "space", "round", "no-repeat"])
const backgroundSizeLengthPattern = /^(?:\d+(?:\.\d+)?|\.\d+)(?:px|%)$/
const backgroundPositionLengthPattern = /^(?:0|-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|%))$/
const backgroundLinearAnglePattern = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:deg|grad|rad|turn)$/
const backgroundLinearDirectionKeywords: ReadonlySet<string> = new Set([
  "to top", "to right", "to bottom", "to left",
  "to top right", "to right top", "to bottom right", "to right bottom",
  "to top left", "to left top", "to bottom left", "to left bottom",
])
const backgroundRadialExtents: ReadonlySet<string> = new Set(["closest-corner", "closest-side", "farthest-corner", "farthest-side"])
const backgroundRadialSizeLengthPattern = /^(?:\d+(?:\.\d+)?|\.\d+)(?:px|%)$/
const backgroundPositionShapes = [
  ["top", "left"],
  ["top", "right"],
  ["bottom", "left"],
  ["bottom", "right"],
] as const
const filterAmountPattern = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:%|px)?$/
const filterBlurPattern = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px)?$/
const dropShadowLengthPattern = /^(?:0|-?(?:\d+(?:\.\d+)?|\.\d+)px)$/

function isFilterAmount(value: unknown): value is FilterAmount {
  if (isFiniteNumber(value)) return value >= 0
  return typeof value === "string" && filterAmountPattern.test(value) &&
    Number.isFinite(Number.parseFloat(value)) && Number.parseFloat(value) >= 0
}

function isFilterBlur(value: unknown): value is FilterBlur {
  if (isFiniteNumber(value)) return value >= 0
  return typeof value === "string" && filterBlurPattern.test(value) &&
    Number.isFinite(Number.parseFloat(value)) && Number.parseFloat(value) >= 0
}

function isFilterHueRotate(value: unknown): value is FilterHueRotate {
  return value === 0 || value === "0" || isAngle(value)
}

function isDropShadowOffset(value: unknown): value is DropShadowOffset {
  return isFiniteNumber(value) || (typeof value === "string" && dropShadowLengthPattern.test(value) &&
    (value === "0" || Number.isFinite(Number.parseFloat(value))))
}

function isDropShadowStandardDeviation(value: unknown): value is DropShadowStandardDeviation {
  if (isFiniteNumber(value)) return value >= 0
  return typeof value === "string" && dropShadowLengthPattern.test(value) &&
    (value === "0" || (!value.startsWith("-") && Number.isFinite(Number.parseFloat(value))))
}

function isDropShadowColor(value: unknown): value is string | number {
  return (isFiniteNumber(value) || (typeof value === "string" && value.length > 0 && !/^var\s*\(/i.test(value)))
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
const boxShadowKeys = new Set(["offsetX", "offsetY", "color", "blurRadius", "spreadDistance", "inset"])

function isTransformOriginEntry(value: unknown): value is TransformOriginEntry {
  return isFiniteNumber(value) || isPercentage(value)
}

const fontVariantSet: ReadonlySet<string> = new Set(fontVariantValues)
function isFontVariant(value: unknown): value is FontVariant {
  return typeof value === "string" && fontVariantSet.has(value)
}

function isStructuredValueForProperty(property: StructuredNativeProperty, value: unknown): boolean {
  return isNativeStructuredValue(property,value)
}

function isBoxShadowValue(value: unknown): value is BoxShadowValue {
  const items = inspectDenseArray(value)
  return items !== undefined && items.every(isBoxShadowItem)
}

function isFilterValue(value: unknown): value is FilterValue {
  const operations = inspectDenseArray(value)
  return operations !== undefined && operations.every(isFilterFunction)
}

function isBackgroundRepeatList(value: unknown): value is BackgroundRepeatList {
  const entries = inspectDenseArray(value)
  return entries !== undefined && entries.every(isBackgroundRepeatValue)
}

function isBackgroundRepeatValue(value: unknown): value is BackgroundRepeatValue {
  if (!isPlainStructuredObject(value)) return false
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 2 ||
    !names.includes("x") || !names.includes("y")) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const x = descriptors.x
  const y = descriptors.y
  return x !== undefined && y !== undefined && x.enumerable === true && y.enumerable === true &&
    "value" in x && "value" in y && isBackgroundRepeatKeyword(x.value) && isBackgroundRepeatKeyword(y.value)
}

function isBackgroundSizeList(value: unknown): value is BackgroundSizeList {
  const entries = inspectDenseArray(value)
  return entries !== undefined && entries.every(isBackgroundSizeValue)
}

function isBackgroundSizeValue(value: unknown): value is BackgroundSizeValue {
  if (value === "cover" || value === "contain") return true
  if (!isPlainStructuredObject(value)) return false
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 2 ||
    !names.includes("x") || !names.includes("y")) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const x = descriptors.x
  const y = descriptors.y
  return x !== undefined && y !== undefined && x.enumerable === true && y.enumerable === true &&
    "value" in x && "value" in y && isBackgroundSizeLength(x.value) && isBackgroundSizeLength(y.value)
}

function isBackgroundPositionList(value: unknown): value is BackgroundPositionList {
  const entries = inspectDenseArray(value)
  return entries !== undefined && entries.every(isBackgroundPositionValue)
}

function isBackgroundPositionValue(value: unknown): value is BackgroundPositionValue {
  if (!isPlainStructuredObject(value)) return false
  const names = Object.getOwnPropertyNames(value)
  const shape = backgroundPositionShapes.find(candidate => candidate.every(name => names.includes(name)))
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 2 || shape === undefined || names.some(name => name !== shape[0] && name !== shape[1])) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const first = descriptors[shape[0]]
  const second = descriptors[shape[1]]
  return first !== undefined && second !== undefined && first.enumerable === true && second.enumerable === true &&
    "value" in first && "value" in second && isBackgroundPositionLength(first.value) && isBackgroundPositionLength(second.value)
}

function isBackgroundImageList(value: unknown): value is BackgroundImageList {
  const entries = inspectDenseArray(value)
  return entries !== undefined && entries.every(isBackgroundImageValue)
}

function isBackgroundImageValue(value: unknown): value is BackgroundImageValue {
  if (!isPlainStructuredObject(value)) return false
  const names = Object.getOwnPropertyNames(value)
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const type = descriptors.type
  if (Object.getOwnPropertySymbols(value).length > 0 || type === undefined || type.enumerable !== true || !("value" in type)) return false
  if (type.value === "linear-gradient") {
    if (names.length !== 3 || names.some(name => name !== "type" && name !== "direction" && name !== "colorStops")) return false
    const direction = descriptors.direction
    const colorStops = descriptors.colorStops
    return direction !== undefined && colorStops !== undefined && direction.enumerable === true && colorStops.enumerable === true &&
      "value" in direction && "value" in colorStops && isBackgroundLinearDirection(direction.value) && isBackgroundGradientStops(colorStops.value)
  }
  if (type.value === "radial-gradient") {
    if (names.length !== 5 || names.some(name => name !== "type" && name !== "shape" && name !== "size" && name !== "position" && name !== "colorStops")) return false
    const shape = descriptors.shape
    const size = descriptors.size
    const position = descriptors.position
    const colorStops = descriptors.colorStops
    return shape !== undefined && size !== undefined && position !== undefined && colorStops !== undefined &&
      shape.enumerable === true && size.enumerable === true && position.enumerable === true && colorStops.enumerable === true &&
      "value" in shape && "value" in size && "value" in position && "value" in colorStops &&
      isBackgroundRadialShape(shape.value) && isBackgroundRadialSize(size.value) &&
      isBackgroundPositionValue(position.value) && isBackgroundGradientStops(colorStops.value)
  }
  return false
}

function isBackgroundGradientStops(value: unknown): value is ReadonlyArray<BackgroundGradientColorStop> {
  const entries = inspectDenseArray(value)
  if (entries === undefined || entries.length < 2) return false
  const stops = entries.filter(isBackgroundGradientStop)
  if (stops.length !== entries.length || stops.filter(stop => stop.color !== null).length < 2) return false
  return stops.every((stop, index) => stop.color !== null ||
    (index > 0 && index < stops.length - 1 && stops[index - 1]!.color !== null && stops[index + 1]!.color !== null))
}

function isBackgroundGradientStop(value: unknown): value is BackgroundGradientColorStop {
  if (!isPlainStructuredObject(value)) return false
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length < 1 || names.length > 2 ||
    !names.includes("color") || names.some(name => name !== "color" && name !== "positions")) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const color = descriptors.color
  const positions = descriptors.positions
  if (color === undefined || color.enumerable !== true || !("value" in color) ||
    (positions !== undefined && (positions.enumerable !== true || !("value" in positions)))) return false
  if (color.value !== null && !isBackgroundGradientColor(color.value)) return false
  if (positions === undefined) return color.value !== null
  const entries = inspectDenseArray(positions.value)
  if (entries === undefined || entries.length > 2 || !entries.every(isBackgroundGradientStopPosition)) return false
  return color.value !== null || entries.length === 1
}

function isBackgroundRadialSize(value: unknown): value is BackgroundRadialSize {
  if (isBackgroundRadialExtent(value)) return true
  if (!isPlainStructuredObject(value)) return false
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 2 || names.some(name => name !== "x" && name !== "y")) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const x = descriptors.x
  const y = descriptors.y
  return x !== undefined && y !== undefined && x.enumerable === true && y.enumerable === true &&
    "value" in x && "value" in y && isBackgroundRadialSizeLength(x.value) && isBackgroundRadialSizeLength(y.value)
}

function isFilterFunction(value: unknown): value is FilterFunction {
  if (!isPlainStructuredObject(value)) return false
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length !== 1) return false
  const key = names[0]!
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) return false
  const entry = descriptor.value
  if (filterAmountKeys.has(key)) return isFilterAmount(entry)
  if (key === "blur") return isFilterBlur(entry)
  if (key === "hueRotate") return isFilterHueRotate(entry)
  if (key === "dropShadow") return isDropShadowItem(entry)
  return false
}

function isDropShadowItem(value: unknown): value is DropShadowItem {
  if (!isPlainStructuredObject(value)) return false
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length < 2 || names.length > 4 ||
    !names.includes("offsetX") || !names.includes("offsetY") || names.some(name => !dropShadowKeys.has(name))) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (!names.every(name => descriptors[name]?.enumerable === true && "value" in descriptors[name]!)) return false
  const entry = (name: string): unknown => {
    const descriptor = descriptors[name]
    return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined
  }
  return isDropShadowOffset(entry("offsetX")) && isDropShadowOffset(entry("offsetY")) &&
    (!names.includes("standardDeviation") || isDropShadowStandardDeviation(entry("standardDeviation"))) &&
    (!names.includes("color") || isDropShadowColor(entry("color")))
}

function isBoxShadowItem(value: unknown): value is BoxShadowItem {
  if (!isPlainStructuredObject(value)) return false
  const names = Object.getOwnPropertyNames(value)
  if (Object.getOwnPropertySymbols(value).length > 0 || names.length < 2 || names.length > 6 ||
    !names.includes("offsetX") || !names.includes("offsetY") || names.some(name => !boxShadowKeys.has(name))) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (!names.every(name => descriptors[name]?.enumerable === true && "value" in descriptors[name]!)) return false
  const entry = (name: string): unknown => {
    const descriptor = descriptors[name]
    return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined
  }
  const color = entry("color")
  const blurRadius = entry("blurRadius")
  const spreadDistance = entry("spreadDistance")
  const inset = entry("inset")
  return isBoxShadowOffset(entry("offsetX")) && isBoxShadowOffset(entry("offsetY")) &&
    (!names.includes("color") || isBoxShadowColor(color)) &&
    (!names.includes("blurRadius") || (isFiniteNumber(blurRadius) && blurRadius >= 0)) &&
    (!names.includes("spreadDistance") || isFiniteNumber(spreadDistance)) &&
    (!names.includes("inset") || typeof inset === "boolean")
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
  return Object.freeze(value.map(freezeStructuredEntry))
}

function freezeStructuredEntry(entry: unknown): unknown {
  if (Array.isArray(entry)) return freezeStructuredArray(entry)
  if (typeof entry === "object" && entry !== null) {
    return Object.freeze(Object.fromEntries(Object.entries(entry).map(([key, nested]) => [key, freezeStructuredEntry(nested)])))
  }
  return entry
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
