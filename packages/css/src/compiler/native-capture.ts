export type NativePrimitiveKind = "view" | "text" | "image"
export type NativePrimitiveDomain = readonly [NativePrimitiveKind, ...NativePrimitiveKind[]]

export const NativeCaptureMetadataSymbol = Symbol.for("crumbs.css.native-capture")

export type NativeCaptureMetadata = {
  readonly primitiveDomain: NativePrimitiveDomain
}

const primitiveOrder: ReadonlyArray<NativePrimitiveKind> = ["view", "text", "image"]

export function markNativeCaptureRule(
  rule: Readonly<Record<string, unknown>>,
  primitiveDomain: ReadonlyArray<NativePrimitiveKind>,
): Record<string, unknown> {
  const canonical = primitiveOrder.filter(kind => primitiveDomain.includes(kind))
  if (canonical.length === 0) throw new TypeError("Native capture requires at least one primitive kind")
  const clone = Object.create(Object.getPrototypeOf(rule), Object.getOwnPropertyDescriptors(rule)) as Record<string, unknown>
  Object.defineProperty(clone, NativeCaptureMetadataSymbol, {
    value: Object.freeze({ primitiveDomain: Object.freeze(canonical) }),
    enumerable: false,
  })
  return clone
}

export function getNativeCaptureMetadata(value: unknown): NativeCaptureMetadata | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined
  const descriptor = Object.getOwnPropertyDescriptor(value, NativeCaptureMetadataSymbol)
  if (descriptor === undefined || !("value" in descriptor)) return undefined
  const metadata = descriptor.value as NativeCaptureMetadata
  return metadata
}
