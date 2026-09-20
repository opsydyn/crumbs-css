import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as SchemaIssue from "effect/SchemaIssue"
import {
  getNativeCaptureMetadata,
  NativeCaptureMetadataSymbol,
  type NativePrimitiveDomain,
  type NativePrimitiveKind,
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
  readonly property: AuthoredScalarProperty
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
  readonly authoredProperty: AuthoredScalarProperty
  readonly canonicalProperty: MigratedScalarProperty
  readonly shorthandExpansionPath: ReadonlyArray<string>
}
export type InsetAliasProperty = "inset" | "insetInline" | "insetBlock" | "insetInlineStart" | "insetInlineEnd" | "insetBlockStart" | "insetBlockEnd"
export type ScalarAliasProperty = InsetAliasProperty | "gap" | "padding" | "paddingHorizontal" | "paddingVertical"
  | "paddingInline" | "paddingBlock" | "paddingInlineStart" | "paddingInlineEnd" | "paddingBlockStart" | "paddingBlockEnd"
  | "margin" | "marginHorizontal" | "marginVertical"
  | "marginInline" | "marginBlock" | "marginInlineStart" | "marginInlineEnd" | "marginBlockStart" | "marginBlockEnd"
  | "borderWidth"
  | "borderColor"
  | "borderRadius"
export type AuthoredScalarProperty = MigratedScalarProperty | ScalarAliasProperty
export type MigratedScalarProperty =
  | "opacity" | "zIndex" | "elevation"
  | "flex" | "flexBasis" | "flexGrow" | "flexShrink"
  | "width" | "height" | "minWidth" | "minHeight" | "maxWidth" | "maxHeight"
  | "top" | "right" | "bottom" | "left" | "start" | "end"
  | "rowGap" | "columnGap"
  | "paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft"
  | "paddingStart" | "paddingEnd"
  | "marginTop" | "marginRight" | "marginBottom" | "marginLeft"
  | "marginStart" | "marginEnd"
  | "borderTopWidth" | "borderRightWidth" | "borderBottomWidth" | "borderLeftWidth"
  | "borderStartWidth" | "borderEndWidth"
  | "borderTopColor" | "borderRightColor" | "borderBottomColor" | "borderLeftColor"
  | "borderStartColor" | "borderEndColor"
  | "backgroundColor"
  | "color"
  | "tintColor"
  | "overlayColor"
  | "shadowColor"
  | "shadowOpacity" | "shadowRadius"
  | "textShadowColor" | "textShadowRadius"
  | "textDecorationColor"
  | "fontSize" | "letterSpacing" | "lineHeight" | "fontFamily" | "fontStyle" | "fontWeight"
  | "textAlign" | "textAlignVertical" | "verticalAlign"
  | "textDecorationLine" | "textDecorationStyle"
  | "textTransform" | "writingDirection" | "userSelect"
  | "includeFontPadding"
  | "display" | "position" | "direction"
  | "overflow"
  | "flexDirection" | "flexWrap" | "alignContent" | "alignItems" | "alignSelf" | "justifyContent"
  | "boxSizing"
  | "aspectRatio"
  | "rotation" | "scaleX" | "scaleY" | "translateX" | "translateY"
  | "backfaceVisibility" | "cursor"
  | "borderCurve" | "pointerEvents"
  | "borderStyle" | "outlineStyle" | "isolation" | "resizeMode" | "objectFit" | "mixBlendMode"
  | "outlineColor" | "outlineOffset" | "outlineWidth"
  | "borderBlockColor" | "borderBlockStartColor" | "borderBlockEndColor"
  | "borderTopLeftRadius" | "borderTopRightRadius" | "borderBottomRightRadius" | "borderBottomLeftRadius"
  | "borderStartStartRadius" | "borderStartEndRadius" | "borderEndStartRadius" | "borderEndEndRadius"
  | "borderTopStartRadius" | "borderTopEndRadius" | "borderBottomStartRadius" | "borderBottomEndRadius"
export type PercentageValue = `${number}%`
export type ScalarDeclarationValue = boolean | number | string | LegacyTokenReference
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
  "top", "right", "bottom", "left", "start", "end",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "paddingStart", "paddingEnd",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "marginStart", "marginEnd",
])
const percentageValueProperties: ReadonlySet<MigratedScalarProperty> = new Set([
  ...dimensionValueProperties, "rowGap", "columnGap",
])
const colorValueProperties: ReadonlySet<MigratedScalarProperty> = new Set([
  "backgroundColor", "color", "tintColor", "overlayColor", "shadowColor", "textShadowColor", "textDecorationColor",
  "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "borderStartColor", "borderEndColor", "outlineColor",
  "borderBlockColor", "borderBlockStartColor", "borderBlockEndColor",
])
const stringValueProperties: ReadonlySet<MigratedScalarProperty> = new Set(["fontFamily"])
const numberOrStringValueProperties: ReadonlySet<MigratedScalarProperty> = new Set(["aspectRatio"])
const literalValueProperties: Readonly<Partial<Record<MigratedScalarProperty, ReadonlySet<unknown>>>> = {
  fontStyle: new Set(["normal", "italic"]),
  fontWeight: new Set([
    "normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900",
    100, 200, 300, 400, 500, 600, 700, 800, 900,
    "ultralight", "thin", "light", "medium", "regular", "semibold", "condensedBold", "condensed", "heavy", "black",
  ]),
  textAlign: new Set(["auto", "left", "right", "center", "justify"]),
  textAlignVertical: new Set(["auto", "top", "bottom", "center"]),
  verticalAlign: new Set(["auto", "top", "bottom", "middle"]),
  textDecorationLine: new Set(["none", "underline", "line-through", "underline line-through"]),
  textDecorationStyle: new Set(["solid", "double", "dotted", "dashed"]),
  textTransform: new Set(["none", "capitalize", "uppercase", "lowercase"]),
  writingDirection: new Set(["auto", "ltr", "rtl"]),
  userSelect: new Set(["auto", "none", "text", "contain", "all"]),
  includeFontPadding: new Set([false, true]),
  display: new Set(["none", "flex", "contents"]),
  position: new Set(["absolute", "relative", "static"]),
  direction: new Set(["inherit", "ltr", "rtl"]),
  overflow: new Set(["visible", "hidden", "scroll"]),
  flexDirection: new Set(["row", "column", "row-reverse", "column-reverse"]),
  flexWrap: new Set(["wrap", "nowrap", "wrap-reverse"]),
  alignContent: new Set(["flex-start", "flex-end", "center", "stretch", "space-between", "space-around", "space-evenly"]),
  alignItems: new Set(["flex-start", "flex-end", "center", "stretch", "baseline"]),
  alignSelf: new Set(["auto", "flex-start", "flex-end", "center", "stretch", "baseline"]),
  justifyContent: new Set(["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"]),
  boxSizing: new Set(["border-box", "content-box"]),
  backfaceVisibility: new Set(["visible", "hidden"]),
  cursor: new Set(["auto", "pointer"]),
  borderCurve: new Set(["circular", "continuous"]),
  pointerEvents: new Set(["box-none", "none", "box-only", "auto"]),
  borderStyle: new Set(["solid", "dotted", "dashed"]),
  outlineStyle: new Set(["solid", "dotted", "dashed"]),
  isolation: new Set(["auto", "isolate"]),
  resizeMode: new Set(["cover", "contain", "stretch", "repeat", "center", "none"]),
  objectFit: new Set(["cover", "contain", "fill", "scale-down", "none"]),
  mixBlendMode: new Set([
    "normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn",
    "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity",
  ]),
}
const primitiveLiteralValueProperties: Readonly<Partial<Record<
  MigratedScalarProperty,
  Readonly<Partial<Record<NativePrimitiveKind, ReadonlySet<unknown>>>>
>>> = {
  overflow: {
    view: new Set(["visible", "hidden", "scroll"]),
    text: new Set(["visible", "hidden", "scroll"]),
    image: new Set(["visible", "hidden"]),
  },
}
const scalarAliasExpansions: Readonly<Record<ScalarAliasProperty, readonly MigratedScalarProperty[]>> = {
  inset: ["top", "right", "bottom", "left"],
  insetInline: ["left", "right"],
  insetBlock: ["top", "bottom"],
  insetInlineStart: ["start"],
  insetInlineEnd: ["end"],
  insetBlockStart: ["top"],
  insetBlockEnd: ["bottom"],
  gap: ["rowGap", "columnGap"],
  padding: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
  paddingHorizontal: ["paddingLeft", "paddingRight"],
  paddingVertical: ["paddingTop", "paddingBottom"],
  paddingInline: ["paddingLeft", "paddingRight"], paddingBlock: ["paddingTop", "paddingBottom"],
  paddingInlineStart: ["paddingStart"], paddingInlineEnd: ["paddingEnd"],
  paddingBlockStart: ["paddingTop"], paddingBlockEnd: ["paddingBottom"],
  margin: ["marginTop", "marginRight", "marginBottom", "marginLeft"],
  marginHorizontal: ["marginLeft", "marginRight"], marginVertical: ["marginTop", "marginBottom"],
  marginInline: ["marginLeft", "marginRight"], marginBlock: ["marginTop", "marginBottom"],
  marginInlineStart: ["marginStart"], marginInlineEnd: ["marginEnd"],
  marginBlockStart: ["marginTop"], marginBlockEnd: ["marginBottom"],
  borderWidth: ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"],
  borderColor: ["borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"],
  borderRadius: ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"],
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
const MigratedScalarPropertySchema = Schema.Literals([
  "opacity", "zIndex", "elevation", "flex", "flexBasis", "flexGrow", "flexShrink",
  "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
  "top", "right", "bottom", "left", "start", "end",
  "rowGap", "columnGap",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "paddingStart", "paddingEnd",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "marginStart", "marginEnd",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderStartWidth", "borderEndWidth",
  "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "borderStartColor", "borderEndColor",
  "backgroundColor",
  "color",
  "tintColor",
  "overlayColor",
  "shadowColor",
  "shadowOpacity", "shadowRadius",
  "textShadowColor", "textShadowRadius",
  "textDecorationColor",
  "fontSize", "letterSpacing", "lineHeight", "fontFamily", "fontStyle", "fontWeight",
  "textAlign", "textAlignVertical", "verticalAlign",
  "textDecorationLine", "textDecorationStyle",
  "textTransform", "writingDirection", "userSelect",
  "includeFontPadding",
  "display", "position", "direction",
  "overflow",
  "flexDirection", "flexWrap", "alignContent", "alignItems", "alignSelf", "justifyContent",
  "boxSizing",
  "aspectRatio",
  "rotation", "scaleX", "scaleY", "translateX", "translateY",
  "backfaceVisibility", "cursor",
  "borderCurve", "pointerEvents",
  "borderStyle", "outlineStyle", "isolation", "resizeMode", "objectFit", "mixBlendMode",
  "outlineColor", "outlineOffset", "outlineWidth", "borderBlockColor", "borderBlockStartColor", "borderBlockEndColor",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius",
  "borderStartStartRadius", "borderStartEndRadius", "borderEndStartRadius", "borderEndEndRadius",
  "borderTopStartRadius", "borderTopEndRadius", "borderBottomStartRadius", "borderBottomEndRadius",
])
const AuthoredScalarPropertySchema = Schema.Literals([
  "opacity", "zIndex", "elevation", "flex", "flexBasis", "flexGrow", "flexShrink",
  "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
  "top", "right", "bottom", "left", "start", "end",
  "inset", "insetInline", "insetBlock", "insetInlineStart", "insetInlineEnd", "insetBlockStart", "insetBlockEnd",
  "gap", "rowGap", "columnGap",
  "padding", "paddingHorizontal", "paddingVertical", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "paddingInline", "paddingBlock", "paddingInlineStart", "paddingInlineEnd", "paddingBlockStart", "paddingBlockEnd", "paddingStart", "paddingEnd",
  "margin", "marginHorizontal", "marginVertical", "marginTop", "marginRight", "marginBottom", "marginLeft",
  "marginInline", "marginBlock", "marginInlineStart", "marginInlineEnd", "marginBlockStart", "marginBlockEnd", "marginStart", "marginEnd",
  "borderWidth", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderStartWidth", "borderEndWidth",
  "borderColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "borderStartColor", "borderEndColor",
  "backgroundColor",
  "color",
  "tintColor",
  "overlayColor",
  "shadowColor",
  "shadowOpacity", "shadowRadius",
  "textShadowColor", "textShadowRadius",
  "textDecorationColor",
  "fontSize", "letterSpacing", "lineHeight", "fontFamily", "fontStyle", "fontWeight",
  "textAlign", "textAlignVertical", "verticalAlign",
  "textDecorationLine", "textDecorationStyle",
  "textTransform", "writingDirection", "userSelect",
  "includeFontPadding",
  "display", "position", "direction",
  "overflow",
  "flexDirection", "flexWrap", "alignContent", "alignItems", "alignSelf", "justifyContent",
  "boxSizing",
  "aspectRatio",
  "rotation", "scaleX", "scaleY", "translateX", "translateY",
  "backfaceVisibility", "cursor",
  "borderCurve", "pointerEvents",
  "borderStyle", "outlineStyle", "isolation", "resizeMode", "objectFit", "mixBlendMode",
  "outlineColor", "outlineOffset", "outlineWidth", "borderBlockColor", "borderBlockStartColor", "borderBlockEndColor",
  "borderRadius", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius",
  "borderStartStartRadius", "borderStartEndRadius", "borderEndStartRadius", "borderEndEndRadius",
  "borderTopStartRadius", "borderTopEndRadius", "borderBottomStartRadius", "borderBottomEndRadius",
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
  authoredProperty: AuthoredScalarPropertySchema,
  canonicalProperty: MigratedScalarPropertySchema,
  shorthandExpansionPath: Schema.Array(Schema.String),
})
const ScalarDeclarationSchema = Schema.Struct({
  _tag: Schema.Literal("NativeDeclaration"),
  property: MigratedScalarPropertySchema,
  value: Schema.Union([Schema.Boolean, Schema.Finite, Schema.NonEmptyString, LegacyTokenReferenceSchema]),
  provenance: PropertyProvenanceSchema,
}).check(
  Schema.makeFilter(declaration => {
    const authoredProperty = declaration.provenance.authoredProperty
    const expectedPath = authoredProperty === declaration.property ? [] : [authoredProperty, declaration.property]
    const validPropertyPair = authoredProperty === declaration.property ||
      (authoredProperty in scalarAliasExpansions &&
        scalarAliasExpansions[authoredProperty as ScalarAliasProperty].includes(declaration.property))
    const validExpansionPath = declaration.provenance.shorthandExpansionPath.length === expectedPath.length &&
      declaration.provenance.shorthandExpansionPath.every((property, index) => property === expectedPath[index])
    return declaration.property === declaration.provenance.canonicalProperty && validPropertyPair && validExpansionPath
      ? undefined
      : { path: ["provenance"], issue: "Declaration property, provenance names and expansion path must match" }
  }),
  Schema.makeFilter(declaration => {
    const value = declaration.value
    const finitePercentage = typeof value === "string" && PercentageValueSchema.pipe(Schema.is)(value)
    const literalValues = literalValueProperties[declaration.property]
    const valid = typeof value === "object" || (literalValues !== undefined
      ? literalValues.has(value)
      : numberOrStringValueProperties.has(declaration.property)
      ? typeof value === "number" || typeof value === "string" && value.length > 0
      : (colorValueProperties.has(declaration.property) || stringValueProperties.has(declaration.property))
      ? typeof value === "string" && value.length > 0
      : typeof value === "number" || (dimensionValueProperties.has(declaration.property)
        ? value === "auto" || finitePercentage
        : percentageValueProperties.has(declaration.property) && finitePercentage))
    return valid ? undefined : { path: ["value"], issue: `${declaration.property} has an invalid scalar value` }
  }),
)
export const ScalarDeclarationBlockSchema = Schema.Struct({
  _tag: Schema.Literal("DeclarationBlock"),
  primitiveDomain: PrimitiveDomainSchema,
  declarations: Schema.Array(ScalarDeclarationSchema).check(Schema.isMinLength(1)),
  provenance: SourceProvenanceSchema,
}).check(Schema.makeFilter(block => block.declarations.flatMap((declaration, index) => {
  const allowed = propertyPrimitives[declaration.property]
  const primitiveLiterals = primitiveLiteralValueProperties[declaration.property]
  const validLiteralForPrimitives = typeof declaration.value === "object" || block.primitiveDomain.every(kind =>
    primitiveLiterals?.[kind]?.has(declaration.value) ?? true,
  )
  return block.primitiveDomain.every(kind => allowed.includes(kind)) && validLiteralForPrimitives
    ? []
    : [{ path: ["declarations", index], issue: `${declaration.property} is invalid for this primitive domain` }]
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
  "top", "right", "bottom", "left", "start", "end",
  "rowGap", "columnGap",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "paddingStart", "paddingEnd",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "marginStart", "marginEnd",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
  "borderStartWidth", "borderEndWidth",
  "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "borderStartColor", "borderEndColor",
  "backgroundColor",
  "color",
  "tintColor",
  "overlayColor",
  "shadowColor",
  "shadowOpacity", "shadowRadius",
  "textShadowColor", "textShadowRadius",
  "textDecorationColor",
  "fontSize", "letterSpacing", "lineHeight", "fontFamily", "fontStyle", "fontWeight",
  "textAlign", "textAlignVertical", "verticalAlign",
  "textDecorationLine", "textDecorationStyle",
  "textTransform", "writingDirection", "userSelect",
  "includeFontPadding",
  "display", "position", "direction",
  "overflow",
  "flexDirection", "flexWrap", "alignContent", "alignItems", "alignSelf", "justifyContent",
  "boxSizing",
  "aspectRatio",
  "rotation", "scaleX", "scaleY", "translateX", "translateY",
  "backfaceVisibility", "cursor",
  "borderCurve", "pointerEvents",
  "borderStyle", "outlineStyle", "isolation", "resizeMode", "objectFit", "mixBlendMode",
  "outlineColor", "outlineOffset", "outlineWidth", "borderBlockColor", "borderBlockStartColor", "borderBlockEndColor",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius",
  "borderStartStartRadius", "borderStartEndRadius", "borderEndStartRadius", "borderEndEndRadius",
  "borderTopStartRadius", "borderTopEndRadius", "borderBottomStartRadius", "borderBottomEndRadius",
] as const
const capturedScalarPropertySet = new Set<string>([...migratedScalarProperties, ...Object.keys(scalarAliasExpansions)])
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
  top: ["view", "text", "image"],
  right: ["view", "text", "image"],
  bottom: ["view", "text", "image"],
  left: ["view", "text", "image"],
  start: ["view", "text", "image"],
  end: ["view", "text", "image"],
  rowGap: ["view", "text", "image"],
  columnGap: ["view", "text", "image"],
  paddingTop: ["view", "text", "image"], paddingRight: ["view", "text", "image"],
  paddingBottom: ["view", "text", "image"], paddingLeft: ["view", "text", "image"],
  paddingStart: ["view", "text", "image"], paddingEnd: ["view", "text", "image"],
  marginTop: ["view", "text", "image"], marginRight: ["view", "text", "image"],
  marginBottom: ["view", "text", "image"], marginLeft: ["view", "text", "image"],
  marginStart: ["view", "text", "image"], marginEnd: ["view", "text", "image"],
  borderTopWidth: ["view", "text", "image"], borderRightWidth: ["view", "text", "image"],
  borderBottomWidth: ["view", "text", "image"], borderLeftWidth: ["view", "text", "image"],
  borderStartWidth: ["view", "text", "image"], borderEndWidth: ["view", "text", "image"],
  borderTopColor: ["view", "text", "image"], borderRightColor: ["view", "text", "image"],
  borderBottomColor: ["view", "text", "image"], borderLeftColor: ["view", "text", "image"],
  borderStartColor: ["view", "text", "image"], borderEndColor: ["view", "text", "image"],
  backgroundColor: ["view", "text", "image"],
  color: ["text"],
  tintColor: ["image"],
  overlayColor: ["image"],
  shadowColor: ["view", "text", "image"],
  shadowOpacity: ["view", "text", "image"], shadowRadius: ["view", "text", "image"],
  textShadowColor: ["text"], textShadowRadius: ["text"],
  textDecorationColor: ["text"],
  fontSize: ["text"], letterSpacing: ["text"], lineHeight: ["text"], fontFamily: ["text"],
  fontStyle: ["text"], fontWeight: ["text"],
  textAlign: ["text"], textAlignVertical: ["text"], verticalAlign: ["text"],
  textDecorationLine: ["text"], textDecorationStyle: ["text"],
  textTransform: ["text"], writingDirection: ["text"], userSelect: ["text"],
  includeFontPadding: ["text"],
  display: ["view", "text", "image"], position: ["view", "text", "image"], direction: ["view", "text", "image"],
  overflow: ["view", "text", "image"],
  flexDirection: ["view", "text", "image"], flexWrap: ["view", "text", "image"],
  alignContent: ["view", "text", "image"], alignItems: ["view", "text", "image"],
  alignSelf: ["view", "text", "image"], justifyContent: ["view", "text", "image"],
  boxSizing: ["view", "text", "image"],
  aspectRatio: ["view", "text", "image"],
  rotation: ["view", "text", "image"],
  scaleX: ["view", "text", "image"],
  scaleY: ["view", "text", "image"],
  translateX: ["view", "text", "image"],
  translateY: ["view", "text", "image"],
  backfaceVisibility: ["view", "text", "image"], cursor: ["view", "text", "image"],
  borderCurve: ["view", "text"], pointerEvents: ["view", "text"],
  borderStyle: ["view", "text"], outlineStyle: ["view", "text"], isolation: ["view", "text"],
  resizeMode: ["image"], objectFit: ["image"], mixBlendMode: ["view", "text"],
  outlineColor: ["view", "text"], outlineOffset: ["view", "text"], outlineWidth: ["view", "text"],
  borderBlockColor: ["view", "text"], borderBlockStartColor: ["view", "text"], borderBlockEndColor: ["view", "text"],
  borderTopLeftRadius: ["view", "text", "image"], borderTopRightRadius: ["view", "text", "image"],
  borderBottomRightRadius: ["view", "text", "image"], borderBottomLeftRadius: ["view", "text", "image"],
  borderStartStartRadius: ["view", "text", "image"], borderStartEndRadius: ["view", "text", "image"],
  borderEndStartRadius: ["view", "text", "image"], borderEndEndRadius: ["view", "text", "image"],
  borderTopStartRadius: ["view", "text", "image"], borderTopEndRadius: ["view", "text", "image"],
  borderBottomStartRadius: ["view", "text", "image"], borderBottomEndRadius: ["view", "text", "image"],
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
  return captureSelectedScalar(rule, context, capturedScalarPropertySet)
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
  ) as AuthoredScalarProperty[]
  const cssRule = withoutSelectedProperties(rule, selectedProperties)
  const declarations: ScalarDeclaration[] = []
  let primitiveDomain = [...metadata.primitiveDomain]
  for (const authoredProperty of selected) {
    const descriptor = descriptors[authoredProperty]!
    if (!("value" in descriptor)) {
      throw admissionError("CRUMBS_IR_INVALID_VALUE", authoredProperty, context.sourceId,
        `Invalid ${authoredProperty} in ${context.sourceId} at ${context.className}.${authoredProperty}: accessors cannot enter native IR.`)
    }
    if (descriptor.value === undefined) continue
    const canonicalProperties = authoredProperty in scalarAliasExpansions
      ? scalarAliasExpansions[authoredProperty as ScalarAliasProperty]
      : [authoredProperty as MigratedScalarProperty]
    for (const property of canonicalProperties) {
      primitiveDomain = primitiveDomain.filter(kind => propertyPrimitives[property].includes(kind))
      if (primitiveDomain.length === 0) throw admissionError("CRUMBS_IR_INVALID_PROPERTY", authoredProperty, context.sourceId,
        `Invalid ${authoredProperty} primitive domain in ${context.sourceId} at ${context.className}.${authoredProperty}.`)
      const value = admitScalarValue(property, descriptor.value, context, authoredProperty)
      declarations.push(Object.freeze({ _tag: "NativeDeclaration", property, value, provenance: Object.freeze({
        packageOwner: context.packageOwner, sourceId: context.sourceId, exportPath: Object.freeze([]),
        logicalPath: Object.freeze([context.className, authoredProperty]), origin: "crumbs-native",
        authoredProperty, canonicalProperty: property,
        shorthandExpansionPath: Object.freeze(authoredProperty === property ? [] : [authoredProperty, property]),
      }) }))
    }
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
): Readonly<Partial<Record<MigratedScalarProperty, boolean | number | string | ReturnType<typeof createThemeTokenReference>>>> {
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
  authoredProperty: AuthoredScalarProperty = property,
): ScalarDeclarationValue {
  const literalValues = literalValueProperties[property]
  if (literalValues !== undefined) {
    if (typeof value === "string") {
      const token = /^var\((--crumbs-[A-Za-z0-9_-]+)\)$/.exec(value)
      if (token?.[1] !== undefined) return Object.freeze({ _tag: "LegacyTokenReference", varName: token[1] })
    }
    if (literalValues.has(value)) return value as boolean | number | string
    throw admissionError("CRUMBS_IR_INVALID_VALUE", authoredProperty, context.sourceId,
      `Invalid ${authoredProperty} in ${context.sourceId} at ${context.className}.${authoredProperty}. Expected a supported native literal or legacy var(--crumbs-*) token reference; the declaration was not sent to the CSS fallback.`)
  }
  if (numberOrStringValueProperties.has(property)) {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string") {
      const token = /^var\((--crumbs-[A-Za-z0-9_-]+)\)$/.exec(value)
      if (token?.[1] !== undefined) return Object.freeze({ _tag: "LegacyTokenReference", varName: token[1] })
      if (value.length > 0) return value
    }
    throw admissionError("CRUMBS_IR_INVALID_VALUE", authoredProperty, context.sourceId,
      `Invalid ${authoredProperty} in ${context.sourceId} at ${context.className}.${authoredProperty}. Expected a finite number, non-empty native string or legacy var(--crumbs-*) token reference; the declaration was not sent to the CSS fallback.`)
  }
  if (colorValueProperties.has(property) || stringValueProperties.has(property)) {
    if (typeof value === "string") {
      const token = /^var\((--crumbs-[A-Za-z0-9_-]+)\)$/.exec(value)
      if (token?.[1] !== undefined) return Object.freeze({ _tag: "LegacyTokenReference", varName: token[1] })
      if (value.length > 0) return value
    }
    throw admissionError("CRUMBS_IR_INVALID_VALUE", authoredProperty, context.sourceId,
      `Invalid ${authoredProperty} in ${context.sourceId} at ${context.className}.${authoredProperty}. Expected a non-empty native ${colorValueProperties.has(property) ? "color " : ""}string or legacy var(--crumbs-*) token reference; the declaration was not sent to the CSS fallback.`)
  }
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const match = /^var\((--crumbs-[A-Za-z0-9_-]+)\)$/.exec(value)
    if (match?.[1] !== undefined) return Object.freeze({ _tag: "LegacyTokenReference", varName: match[1] })
    if (percentageValueProperties.has(property)) {
      if (dimensionValueProperties.has(property) && value === "auto") return value
      const percentage = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)%$/i.exec(value)
      if (percentage?.[1] !== undefined && Number.isFinite(Number(percentage[1]))) return value as PercentageValue
    }
  }
  throw admissionError("CRUMBS_IR_INVALID_VALUE", authoredProperty, context.sourceId,
    `Invalid ${authoredProperty} in ${context.sourceId} at ${context.className}.${authoredProperty}. Expected ${dimensionValueProperties.has(property) ? "a finite number, auto, a finite percentage or" : percentageValueProperties.has(property) ? "a finite number, a finite percentage or" : "a finite number or"} a legacy var(--crumbs-*) token reference; the declaration was not sent to the CSS fallback.`)
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
  property: AuthoredScalarProperty,
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
