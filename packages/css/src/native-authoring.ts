import {type StyleRule, style as vanillaStyle} from "@vanilla-extract/css"
import {markCompositionUsed, registerComposition} from "@vanilla-extract/css/adapter"
import {getFileScope} from "@vanilla-extract/css/fileScope"
import {getNativeCaptureMetadata, markNativeCaptureRule, type NativePrimitiveDomain} from "./compiler/native-capture"

/**
 * Author a native style through vanilla-extract while preserving the native
 * primitive capture metadata and ordered composition that the transformer
 * consumes.
 */
export function authorNativeStyle(
  rule: unknown,
  primitiveDomain: NativePrimitiveDomain,
  debugId?: string,
): string {
  // A compiled reference is a build-time class handle, not a declaration object.
  if (typeof rule === "string") return authorNativeStyle([rule], primitiveDomain, debugId)
  if (!Array.isArray(rule)) {
    const record = rule as Record<string, unknown>
    const marked = getNativeCaptureMetadata(record) === undefined
      ? markNativeCaptureRule(record, primitiveDomain)
      : record
    return vanillaStyle(marked as StyleRule, debugId)
  }

  // ADR D2: native order includes inline rules, nested sequences and repeats.
  const identifier = vanillaStyle({}, debugId)
  const classList = [identifier, ...rule.map((entry, index) =>
    typeof entry === "string"
      ? entry
      : authorNativeStyle(entry, primitiveDomain, debugId === undefined ? undefined : `${debugId}_${index}`),
  )].join(" ")
  registerComposition({identifier, classList}, getFileScope())
  markCompositionUsed(identifier)
  return classList
}
