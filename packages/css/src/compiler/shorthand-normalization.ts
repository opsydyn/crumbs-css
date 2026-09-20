import { cssDeclarationsToRN } from "../css-to-rn"

export const NO_COMPATIBILITY_CAPTURE = Symbol("no compatibility capture")

const nativeToken = /^var\(--crumbs-[A-Za-z0-9_-]+\)$/
const cssVariable = /var\s*\(/i
const singleNativeDimension = /^(?:auto|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?%)$/i

/**
 * Normalises one unmarked vanilla-extract scalar only when the conversion is
 * lossless. Multi-value aliases remain on the CSS converter route so their
 * canonical side expansion retains authored precedence.
 */
export function normalizeCompatibilityScalarValue(property: string, value: unknown): unknown {
  if (typeof value === "number" || typeof value === "boolean") return value
  if (typeof value !== "string") return NO_COMPATIBILITY_CAPTURE
  if (nativeToken.test(value)) return value
  if (cssVariable.test(value)) return NO_COMPATIBILITY_CAPTURE
  if (isAliasSingleDimension(property, value)) return value

  const converted = cssDeclarationsToRN([[toCssPropertyName(property), value]])
  const entries = Object.entries(converted)
  if (entries.length !== 1 || entries[0]?.[0] !== property) return NO_COMPATIBILITY_CAPTURE
  return entries[0][1]
}

function isAliasSingleDimension(property: string, value: string): boolean {
  return [
    "inset", "insetInline", "insetBlock", "insetInlineStart", "insetInlineEnd", "insetBlockStart", "insetBlockEnd",
    "gap", "padding", "paddingHorizontal", "paddingVertical", "paddingInline", "paddingBlock", "paddingInlineStart",
    "paddingInlineEnd", "paddingBlockStart", "paddingBlockEnd", "margin", "marginHorizontal", "marginVertical", "marginInline",
    "marginBlock", "marginInlineStart", "marginInlineEnd", "marginBlockStart", "marginBlockEnd", "borderWidth", "borderColor",
    "borderRadius",
  ].includes(property) && singleNativeDimension.test(value)
}

function toCssPropertyName(property: string): string {
  return property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
}
