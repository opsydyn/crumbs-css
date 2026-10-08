import type { MigratedScalarProperty, ScalarAliasProperty } from "./compiler/native-ir";
import type { NativePrimitiveDomain, NativePrimitiveKind } from "./compiler/native-capture";
import type { TokenDomain } from "./theme-token";
import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode as Code } from "./diagnostics";
export const dimensionValueProperties: ReadonlySet<MigratedScalarProperty> = new Set([
  "flexBasis", "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
  "top", "right", "bottom", "left", "start", "end",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "paddingStart", "paddingEnd",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "marginStart", "marginEnd",
]);
export const percentageValueProperties: ReadonlySet<MigratedScalarProperty> = new Set([
  ...dimensionValueProperties, "rowGap", "columnGap",
]);
export const colorValueProperties: ReadonlySet<MigratedScalarProperty> = new Set([
  "backgroundColor", "color", "tintColor", "overlayColor", "shadowColor", "textShadowColor", "textDecorationColor",
  "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
  "borderStartColor", "borderEndColor", "outlineColor",
  "borderBlockColor", "borderBlockStartColor", "borderBlockEndColor",
]);
export const stringValueProperties: ReadonlySet<MigratedScalarProperty> = new Set(["fontFamily"]);
export const numberOrStringValueProperties: ReadonlySet<MigratedScalarProperty> = new Set(["aspectRatio"]);
export const literalValueProperties: Readonly<Partial<Record<MigratedScalarProperty, ReadonlySet<unknown>>>> = {
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
};
export const primitiveLiteralValueProperties: Readonly<Partial<Record<MigratedScalarProperty, Readonly<Partial<Record<NativePrimitiveKind, ReadonlySet<unknown>>>>>>> = {
  overflow: {
    view: new Set(["visible", "hidden", "scroll"]),
    text: new Set(["visible", "hidden", "scroll"]),
    image: new Set(["visible", "hidden"]),
  },
};
export const scalarAliasExpansions: Readonly<Record<ScalarAliasProperty, readonly MigratedScalarProperty[]>> = {
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
};
export const propertyPrimitives: Readonly<Record<MigratedScalarProperty, NativePrimitiveDomain>> = {
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
};
export function nativeLocalPropertyDomain(property: string): TokenDomain["kind"] | undefined {
  if (colorValueProperties.has(property as MigratedScalarProperty))
    return "color";
  if (property === "opacity" || property === "shadowOpacity")
    return "opacity";
  if (literalValueProperties[property as MigratedScalarProperty] && !(["includeFontPadding"] as string[]).includes(property))
    return "enum";
  if (dimensionValueProperties.has(property as MigratedScalarProperty) || percentageValueProperties.has(property as MigratedScalarProperty) || /^(?:border.*(?:Width|Radius)|fontSize|letterSpacing|lineHeight|outlineOffset|outlineWidth)$/.test(property))
    return "length";
  return undefined;
}
export function assertNativeLocalPropertyDomain(property: string, primitives: NativePrimitiveDomain, domain: TokenDomain): void {
  const key = property as MigratedScalarProperty, allowed = propertyPrimitives[key];
  if (!allowed || !primitives.every(kind => allowed.includes(kind)) || nativeLocalPropertyDomain(property) !== domain.kind)
    throw new Error(formatNativeStylesDiagnostic(Code.LocalVarDomainMismatch, `${property}: local domain is unsupported by the native primitive property`));
  if (domain.kind === "enum")
    for (const member of domain.values)
      assertNativeLocalPropertyValue(property, primitives, member);
}
export function assertNativeLocalPropertyValue(property: string, primitives: NativePrimitiveDomain, value: unknown, context?: string): void {
  const key = property as MigratedScalarProperty, allowed = propertyPrimitives[key], literals = literalValueProperties[key];
  const numeric = typeof value === "number" && Number.isFinite(value);
  const percentage = typeof value === "string" && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?%$/i.test(value) && Number.isFinite(Number.parseFloat(value));
  const valid = allowed && primitives.every(kind => allowed.includes(kind)) && (literals ? literals.has(value) && primitives.every(kind => primitiveLiteralValueProperties[key]?.[kind]?.has(value) ?? true) : numberOrStringValueProperties.has(key) ? numeric || typeof value === "string" && value.length > 0 : colorValueProperties.has(key) || stringValueProperties.has(key) ? typeof value === "string" && value.length > 0 : numeric || dimensionValueProperties.has(key) && (value === "auto" || percentage) || percentageValueProperties.has(key) && percentage);
  if (!valid)
    throw new Error(formatNativeStylesDiagnostic(Code.LocalVarInvalidPropertyValue, `${context ?? property}: invalid value for native primitive ${primitives.join("/")}`));
}
