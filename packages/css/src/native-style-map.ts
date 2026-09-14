// Internal export-kind metadata bridge for ADR D1; public map keys stay intact.
export const NativeStyleMapType = "crumbs.css.style-map" as const
export const NativeStyleMapSymbol = Symbol.for(NativeStyleMapType)
export const NativeRecipeClassSymbol = Symbol.for("crumbs.css.recipe-class-reference")

export function markNativeStyleMap<TMap extends object>(map: TMap): TMap {
  Object.defineProperty(map, NativeStyleMapSymbol, { value: true, enumerable: true })
  return map
}

export function isNativeStyleMap(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    Object.prototype.hasOwnProperty.call(value, NativeStyleMapSymbol) &&
    (value as Record<symbol, unknown>)[NativeStyleMapSymbol] === true
}
