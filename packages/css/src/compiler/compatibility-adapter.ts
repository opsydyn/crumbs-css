import { NativeStylesCompatibilityError } from "../native-compatibility"
import { NativeStylesDiagnosticCode } from "../diagnostics"
import {
  captureScalarIntoNativeIr,
  isAuthoredScalarProperty,
  type ScalarCaptureContext,
  type ScalarDeclarationBlock,
} from "./native-ir"
import {
  captureStructuredIntoNativeIr,
  isStructuredNativeProperty,
  StructuredIrAdmissionError,
  type StructuredCaptureContext,
  type StructuredDeclarationBlock,
} from "./structured-ir"
import { markNativeCaptureRule } from "./native-capture"
import {
  NO_COMPATIBILITY_CAPTURE,
  normalizeCompatibilityScalarValue,
} from "./shorthand-normalization"

const allPrimitives = ["view", "text", "image"] as const

export type CompatibilityCaptureContext = ScalarCaptureContext & StructuredCaptureContext
export type CompatibilityCaptureResult = {
  readonly cssRule: Record<string, unknown>
  readonly scalarBlock?: ScalarDeclarationBlock
  readonly structuredBlock?: StructuredDeclarationBlock
}

/**
 * Captures the lossless subset of an unmarked vanilla-extract rule before CSS
 * serialization. Browser-only strings and shorthand forms stay on the
 * established converter path; static structured arrays fail closed with the
 * same contextual diagnostic as Crumbs-authored rules.
 */
export function captureCompatibilityIntoNativeIr(
  rule: Readonly<Record<string, unknown>>,
  context: CompatibilityCaptureContext,
): CompatibilityCaptureResult {
  const scalarRule: Record<string, unknown> = {}
  const structuredRule: Record<string, unknown> = {}
  const capturedProperties = new Set<string>()

  for (const [property, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(rule))) {
    if (descriptor.enumerable !== true || !("value" in descriptor) || descriptor.value === undefined) continue
    const value = descriptor.value

    if (isStructuredNativeProperty(property)) {
      if (Array.isArray(value) || (isOffsetProperty(property) && isPlainRecord(value))) {
        structuredRule[property] = value
        capturedProperties.add(property)
      }
      continue
    }

    if (!isAuthoredScalarProperty(property)) continue
    const canonical = normalizeCompatibilityScalarValue(property, value)
    if (canonical === NO_COMPATIBILITY_CAPTURE) continue
    scalarRule[property] = canonical
    capturedProperties.add(property)
  }

  const cssRule = withoutCapturedProperties(rule, capturedProperties)
  let scalarBlock: ScalarDeclarationBlock | undefined
  let structuredBlock: StructuredDeclarationBlock | undefined

  if (Object.keys(structuredRule).length > 0) {
    try {
      structuredBlock = captureStructuredIntoNativeIr(
        markNativeCaptureRule(structuredRule, allPrimitives, "vanilla-extract-adapter"),
        context,
      ).block
    } catch (error) {
      if (!(error instanceof StructuredIrAdmissionError)) throw error
      throw new NativeStylesCompatibilityError(
        NativeStylesDiagnosticCode.UnsupportedStructuredValue,
        `${error.diagnostics[0].detail} Pass this value through the React Native runtime style prop instead.`,
      )
    }
  }

  if (Object.keys(scalarRule).length > 0) {
    scalarBlock = captureScalarIntoNativeIr(
      markNativeCaptureRule(scalarRule, allPrimitives, "vanilla-extract-adapter"),
      context,
    ).block
  }

  return { cssRule, ...(scalarBlock === undefined ? {} : { scalarBlock }), ...(structuredBlock === undefined ? {} : { structuredBlock }) }
}

function isOffsetProperty(property: string): boolean {
  return property === "shadowOffset" || property === "textShadowOffset"
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === null || Object.getPrototypeOf(prototype) === null
}

function withoutCapturedProperties(
  rule: Readonly<Record<string, unknown>>,
  capturedProperties: ReadonlySet<string>,
): Record<string, unknown> {
  const descriptors = Object.getOwnPropertyDescriptors(rule)
  for (const property of capturedProperties) delete descriptors[property]
  return Object.create(Object.getPrototypeOf(rule), descriptors) as Record<string, unknown>
}
