import { createRequire } from "node:module"
import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode } from "./diagnostics"
import { createThemeTokenReference } from "./theme-token"

type CssToReactNativeTransform = (
  declarations: ReadonlyArray<readonly [string, string]>,
) => Record<string, unknown>

const requireFromHere = createRequire(import.meta.url)
const ctrTransformModule = requireFromHere("css-to-react-native") as
  | CssToReactNativeTransform
  | { readonly default: CssToReactNativeTransform }
const ctrTransform =
  typeof ctrTransformModule === "function" ? ctrTransformModule : ctrTransformModule.default

const VENDOR_PREFIXES = ["-webkit-", "-moz-", "-ms-", "-o-"]
const CSS_VAR_RE = /var\s*\(/
const NATIVE_THEME_VAR_RE = /^var\s*\(\s*(--crumbs-[^)]+?)\s*\)$/
const NATIVE_UNIT_LENGTH_PROPS = new Set(["line-height"])
const NUMERIC_VALUE_RE = /^-?\d+(?:\.\d+)?$/
const CANONICAL_LONGHANDS = new Map<string, ReadonlyArray<string>>([
  ["padding", ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]],
  ["paddingHorizontal", ["paddingLeft", "paddingRight"]],
  ["paddingVertical", ["paddingTop", "paddingBottom"]],
  ["margin", ["marginTop", "marginRight", "marginBottom", "marginLeft"]],
  ["marginHorizontal", ["marginLeft", "marginRight"]],
  ["marginVertical", ["marginTop", "marginBottom"]],
  ["paddingInline", ["paddingLeft", "paddingRight"]],
  ["paddingBlock", ["paddingTop", "paddingBottom"]],
  ["paddingInlineStart", ["paddingStart"]],
  ["paddingInlineEnd", ["paddingEnd"]],
  ["paddingBlockStart", ["paddingTop"]],
  ["paddingBlockEnd", ["paddingBottom"]],
  ["marginInline", ["marginLeft", "marginRight"]],
  ["marginBlock", ["marginTop", "marginBottom"]],
  ["marginInlineStart", ["marginStart"]],
  ["marginInlineEnd", ["marginEnd"]],
  ["marginBlockStart", ["marginTop"]],
  ["marginBlockEnd", ["marginBottom"]],
  ["inset", ["top", "right", "bottom", "left"]],
  ["insetInline", ["left", "right"]],
  ["insetBlock", ["top", "bottom"]],
  ["insetInlineStart", ["start"]],
  ["insetInlineEnd", ["end"]],
  ["insetBlockStart", ["top"]],
  ["insetBlockEnd", ["bottom"]],
  ["gap", ["rowGap", "columnGap"]],
  ["borderWidth", ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"]],
  ["borderColor", ["borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"]],
  ["borderRadius", ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"]],
])
const NATIVE_DIMENSION_ALIASES = new Set([
  "paddingInline", "paddingBlock", "paddingInlineStart", "paddingInlineEnd", "paddingBlockStart", "paddingBlockEnd",
  "marginInline", "marginBlock", "marginInlineStart", "marginInlineEnd", "marginBlockStart", "marginBlockEnd",
  "inset", "insetInline", "insetBlock", "insetInlineStart", "insetInlineEnd", "insetBlockStart", "insetBlockEnd",
])
const NATIVE_UNSUPPORTED_SIDE_BORDERS = new Set([
  "borderTop", "borderRight", "borderBottom", "borderLeft", "borderInline", "borderBlock",
  "borderInlineStart", "borderInlineEnd", "borderBlockStart", "borderBlockEnd",
].flatMap(prop => [prop, `${prop}Style`]))
const NATIVE_STYLE_PROPS = new Set([
  "alignContent",
  "alignItems",
  "alignSelf",
  "aspectRatio",
  "backfaceVisibility",
  "backgroundColor",
  "borderBottomColor",
  "borderBottomEndRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderBottomStartRadius",
  "borderBottomWidth",
  "borderColor",
  "borderCurve",
  "borderEndColor",
  "borderEndEndRadius",
  "borderEndStartRadius",
  "borderEndWidth",
  "borderLeftColor",
  "borderLeftWidth",
  "borderRadius",
  "borderRightColor",
  "borderRightWidth",
  "borderStartColor",
  "borderStartEndRadius",
  "borderStartStartRadius",
  "borderStartWidth",
  "borderStyle",
  "borderTopColor",
  "borderTopEndRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderTopStartRadius",
  "borderTopWidth",
  "borderWidth",
  "bottom",
  "boxShadow",
  "color",
  "columnGap",
  "direction",
  "display",
  "elevation",
  "end",
  "filter",
  "flex",
  "flexBasis",
  "flexDirection",
  "flexGrow",
  "flexShrink",
  "flexWrap",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "gap",
  "height",
  "includeFontPadding",
  "inset",
  "insetBlock",
  "insetBlockEnd",
  "insetBlockStart",
  "insetInline",
  "insetInlineEnd",
  "insetInlineStart",
  "justifyContent",
  "left",
  "letterSpacing",
  "lineHeight",
  "margin",
  "marginBlock",
  "marginBlockEnd",
  "marginBlockStart",
  "marginBottom",
  "marginEnd",
  "marginHorizontal",
  "marginInline",
  "marginInlineEnd",
  "marginInlineStart",
  "marginLeft",
  "marginRight",
  "marginStart",
  "marginTop",
  "marginVertical",
  "maxHeight",
  "maxWidth",
  "minHeight",
  "minWidth",
  "objectFit",
  "opacity",
  "overflow",
  "overlayColor",
  "padding",
  "paddingBlock",
  "paddingBlockEnd",
  "paddingBlockStart",
  "paddingBottom",
  "paddingEnd",
  "paddingHorizontal",
  "paddingInline",
  "paddingInlineEnd",
  "paddingInlineStart",
  "paddingLeft",
  "paddingRight",
  "paddingStart",
  "paddingTop",
  "paddingVertical",
  "pointerEvents",
  "position",
  "resizeMode",
  "right",
  "rotation",
  "rowGap",
  "scaleX",
  "scaleY",
  "shadowColor",
  "shadowOffset",
  "shadowOpacity",
  "shadowRadius",
  "start",
  "textAlign",
  "textAlignVertical",
  "textDecorationColor",
  "textDecorationLine",
  "textDecorationStyle",
  "textShadowColor",
  "textShadowOffset",
  "textShadowRadius",
  "textTransform",
  "tintColor",
  "top",
  "translateX",
  "translateY",
  "transform",
  "transformOrigin",
  "userSelect",
  "verticalAlign",
  "width",
  "writingDirection",
  "zIndex",
])

export type CssDeclarationDiagnosticContext = {
  readonly className?: string
  readonly exportName?: string
  readonly filePath?: string
}

export type CssDeclarationsToRNOptions = {
  readonly context?: CssDeclarationDiagnosticContext
  readonly strictDiagnostics?: boolean
}

type DroppedDeclaration = {
  readonly code: NativeStylesDiagnosticCode
  readonly prop: string
  readonly reason: string
  readonly value: string
}

export class NativeStylesDeclarationError extends Error {
  override readonly name = "NativeStylesDeclarationError"

  constructor(
    readonly code: NativeStylesDiagnosticCode,
    message: string,
  ) {
    super(formatNativeStylesDiagnostic(code, message))
  }
}

export function cssDeclarationsToRN(
  declarations: ReadonlyArray<readonly [string, string]>,
  options: CssDeclarationsToRNOptions = {},
): Record<string, unknown> {
  const converted: Record<string, unknown> = {}
  const dropped: DroppedDeclaration[] = []

  for (const [prop, value] of declarations) {
    if (VENDOR_PREFIXES.some((pfx) => prop.startsWith(pfx))) {
      dropped.push({
        code: NativeStylesDiagnosticCode.DroppedDeclaration,
        prop,
        reason: "React Native has no browser vendor prefixes",
        value,
      })
      continue
    }

    // Give unsupported side borders one actionable diagnostic before conversion.
    if (NATIVE_UNSUPPORTED_SIDE_BORDERS.has(toReactNativePropName(prop))) {
      dropped.push({
        code: NativeStylesDiagnosticCode.DroppedDeclaration,
        prop,
        reason: "side-specific compound borders and side border styles are unsupported; use explicit side width/color properties with the global borderStyle",
        value,
      })
      continue
    }

    const nativeThemeVarName = parseNativeThemeVarName(value)
    if (nativeThemeVarName !== null) {
      const nativeProp = toReactNativePropName(prop)
      if (!NATIVE_STYLE_PROPS.has(nativeProp)) {
        dropped.push({
          code: NativeStylesDiagnosticCode.DroppedDeclaration,
          prop,
          reason: "React Native StyleSheet does not support this CSS declaration",
          value,
        })
        continue
      }
      // Keep references and literals in one ordered result: later declarations
      // replace earlier declarations regardless of how their values resolve.
      assignCanonicalDeclarations(converted, { [nativeProp]: createThemeTokenReference(nativeThemeVarName) })
      continue
    }

    // CSS custom properties can't be resolved in React Native StyleSheet.
    // Filter them out and warn so the developer knows to use plain TS constants.
    if (CSS_VAR_RE.test(value)) {
      dropped.push({
        code: NativeStylesDiagnosticCode.CssVariableDropped,
        prop,
        reason: "React Native StyleSheet cannot resolve browser CSS variables",
        value,
      })
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          formatNativeStylesDiagnostic(
            NativeStylesDiagnosticCode.CssVariableDropped,
            `"${prop}: ${value}" uses a CSS variable which cannot ` +
              `be resolved in React Native StyleSheet — style will be dropped. ` +
              `Export the value as a plain TypeScript constant instead.`,
          ),
        )
      }
      continue
    }

    if (NATIVE_DIMENSION_ALIASES.has(toReactNativePropName(prop))) {
      const literal = value.trim()
      const dimension = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:px|%)?$/i.exec(literal)
      if (literal !== "auto" && (dimension === null || !Number.isFinite(Number(dimension[1])))) {
        dropped.push({
          code: NativeStylesDiagnosticCode.DroppedDeclaration,
          prop,
          reason: "native spacing/inset aliases require one finite dimension, auto or a Crumbs token; use separate side properties for multiple CSS values",
          value,
        })
        continue
      }
    }

    // Native numeric flex is an independent Yoga field, not a CSS shorthand.
    // Explicit grow/shrink/basis siblings must survive in either authored order.
    if (prop === "flex") {
      const numeric = value.trim()
      if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(numeric) && Number.isFinite(Number(numeric))) {
        converted.flex = Number(numeric)
      } else {
        dropped.push({
          code: NativeStylesDiagnosticCode.DroppedDeclaration,
          prop,
          reason: "native flex requires one finite number or a Crumbs token; use explicit flexGrow/flexShrink/flexBasis for CSS shorthand migration",
          value,
        })
      }
      continue
    }

    assignCanonicalDeclarations(converted, transformDeclaration(normalizeNativeDeclaration(prop, value), dropped))
  }

  const firstDropped = dropped[0]
  if (firstDropped !== undefined && options.strictDiagnostics === true) {
    throw new NativeStylesDeclarationError(
      firstDropped.code,
      formatDroppedDeclarationMessage(firstDropped, options),
    )
  }

  return converted
}

// ADR D2: normalize before merging so value representation cannot change
// shorthand/longhand winners. This work stays entirely in the compiler.
function assignCanonicalDeclarations(
  target: Record<string, unknown>,
  declarations: Readonly<Record<string, unknown>>,
): void {
  for (const [prop, value] of Object.entries(declarations)) {
    const longhands = CANONICAL_LONGHANDS.get(prop)
    if (longhands === undefined) target[prop] = value
    else for (const longhand of longhands) target[longhand] = value
  }
}

function transformDeclaration(
  declaration: [string, string],
  dropped: DroppedDeclaration[],
): Record<string, unknown> {
  try {
    return filterUnsupportedNativeProps(
      declaration,
      ctrTransform([declaration] as Array<[string, string]>) as Record<string, unknown>,
      dropped,
    )
  } catch {
    dropped.push({
      code: NativeStylesDiagnosticCode.DroppedDeclaration,
      prop: declaration[0],
      reason: "css-to-react-native could not convert this declaration",
      value: declaration[1],
    })
    return {}
  }
}

function filterUnsupportedNativeProps(
  declaration: [string, string],
  styles: Record<string, unknown>,
  dropped: DroppedDeclaration[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const entries = Object.entries(styles).filter(([prop]) => NATIVE_STYLE_PROPS.has(prop))
  for (const [prop, value] of entries) {
    result[prop] = value
  }

  if (entries.length !== Object.keys(styles).length) {
    dropped.push({
      code: NativeStylesDiagnosticCode.DroppedDeclaration,
      prop: declaration[0],
      reason: "React Native StyleSheet does not support this CSS declaration",
      value: declaration[1],
    })
  }

  return result
}

function parseNativeThemeVarName(value: string): string | null {
  return NATIVE_THEME_VAR_RE.exec(value)?.[1] ?? null
}

function toReactNativePropName(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function normalizeNativeDeclaration(prop: string, value: string): [string, string] {
  if (NATIVE_UNIT_LENGTH_PROPS.has(prop) && NUMERIC_VALUE_RE.test(value.trim())) {
    return [prop, `${value}px`]
  }

  return [prop, value]
}

function formatDroppedDeclarationMessage(
  declaration: DroppedDeclaration,
  options: CssDeclarationsToRNOptions,
): string {
  const exportName = options.context?.exportName
  const className = options.context?.className
  const filePath = options.context?.filePath
  const target =
    exportName !== undefined
      ? `export "${exportName}"`
      : className !== undefined
        ? `class "${className}"`
        : "a native style"
  const location = filePath === undefined ? "" : ` in ${filePath}`

  return (
    `@opsydyn/crumbs-css dropped "${declaration.prop}: ${declaration.value}" ` +
    `while transforming ${target}${location}. ${declaration.reason}.`
  )
}
