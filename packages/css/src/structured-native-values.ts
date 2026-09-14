import { NativeStylesCompatibilityError } from "./native-compatibility"
import { NativeStylesDiagnosticCode } from "./diagnostics"

const numericTransforms = new Set(["perspective", "scale", "scaleX", "scaleY"])
const angularTransforms = new Set(["rotate", "rotateX", "rotateY", "rotateZ", "skewX", "skewY"])
const angle = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:deg|rad)$/
const percentage = /^-?(?:\d+(?:\.\d+)?|\.\d+)%$/
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
const denseArray = (value: unknown[]): boolean => Object.keys(value).length === value.length
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === null || Object.getPrototypeOf(Object.getPrototypeOf(value)) === null)

// ADR D1/D2: capture native values before CSS serialization, never evaluate nodes.
export function splitStructuredNativeValues(
  rule: Readonly<Record<string, unknown>>,
  location: string,
): { cssRule: Record<string, unknown>; nativeValues: Record<string, unknown> } {
  const cssRule: Record<string, unknown> = {}
  const nativeValues: Record<string, unknown> = {}
  for (const [prop, value] of Object.entries(rule)) {
    if (value === undefined) continue
    if (prop === "transform" && Array.isArray(value)) {
      if (!denseArray(value) || !value.every(validTransform)) reject(prop, location)
      nativeValues[prop] = value.map(entry => Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])))
    } else if (prop === "shadowOffset" || prop === "textShadowOffset") {
      if (!record(value) || Object.keys(value).length !== 2 || !finite(value.width) || !finite(value.height)) reject(prop, location)
      nativeValues[prop] = { width: value.width, height: value.height }
    } else if ((Array.isArray(value) || (typeof value === "object" && value !== null)) &&
      !["vars", "selectors", "@media", "@supports", "@container", "@layer"].includes(prop)) {
      reject(prop, location)
    } else cssRule[prop] = value
  }
  return { cssRule, nativeValues }
}

function validTransform(value: unknown): boolean {
  if (!record(value) || Object.keys(value).length !== 1) return false
  const [key, entry] = Object.entries(value)[0]!
  if (numericTransforms.has(key)) return finite(entry)
  if (angularTransforms.has(key)) return typeof entry === "string" && angle.test(entry)
  if (key === "translateX" || key === "translateY") return finite(entry) || (typeof entry === "string" && percentage.test(entry))
  if (key === "matrix") return Array.isArray(entry) && denseArray(entry) && entry.length === 16 && entry.every(finite)
  return false
}

function reject(prop: string, location: string): never {
  throw new NativeStylesCompatibilityError(
    NativeStylesDiagnosticCode.UnsupportedStructuredValue,
    `Unsupported structured native property "${prop}" in ${location}. ` +
    "Compile static transform arrays (one operation per entry, finite numbers, deg/rad angles, percentage translations, or a 16-number matrix) and numeric width/height shadow offsets. " +
    "Pass animated values, nested tokens and other structured shapes through the React Native runtime style prop instead.",
  )
}
