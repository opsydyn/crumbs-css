import type { NativePrimitiveDomain } from "./compiler/native-capture";
import type { StructuredNativeProperty } from "./compiler/structured-ir";
export const structuredPropertyPrimitives: Readonly<Record<StructuredNativeProperty, NativePrimitiveDomain>> = {
  boxShadow: ["view"],
  filter: ["view", "text"],
  experimental_backgroundRepeat: ["view", "text"],
  experimental_backgroundSize: ["view", "text"],
  experimental_backgroundPosition: ["view", "text"],
  experimental_backgroundImage: ["view", "text"],
  transform: ["view", "text", "image"],
  shadowOffset: ["view", "text", "image"],
  textShadowOffset: ["text"],
  transformOrigin: ["view", "text", "image"],
  transformMatrix: ["view", "text", "image"],
  fontVariant: ["text"],
};
export const fontVariantValues = [
  "small-caps", "oldstyle-nums", "lining-nums", "tabular-nums", "common-ligatures",
  "no-common-ligatures", "discretionary-ligatures", "no-discretionary-ligatures", "historical-ligatures",
  "no-historical-ligatures", "contextual", "no-contextual", "proportional-nums", "stylistic-one",
  "stylistic-two", "stylistic-three", "stylistic-four", "stylistic-five", "stylistic-six",
  "stylistic-seven", "stylistic-eight", "stylistic-nine", "stylistic-ten", "stylistic-eleven",
  "stylistic-twelve", "stylistic-thirteen", "stylistic-fourteen", "stylistic-fifteen", "stylistic-sixteen",
  "stylistic-seventeen", "stylistic-eighteen", "stylistic-nineteen", "stylistic-twenty",
] as const;
type Predicate = (value: unknown) => boolean;
const finite: Predicate = v => typeof v === "number" && Number.isFinite(v);
const nonnegative: Predicate = v => finite(v) && (v as number) >= 0;
const numeric = "-?(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
const unit = (suffix: string, positive = false): Predicate => v => typeof v === "string" && new RegExp(`^${numeric}${suffix}$`).test(v) && Number.isFinite(Number.parseFloat(v)) && (!positive || Number.parseFloat(v) >= 0);
const pct = unit("%"), angle = unit("(?:deg|rad)");
const numberOrPct: Predicate = v => finite(v) || pct(v);
const color: Predicate = v => typeof v === "string" && v.length > 0 && !/^var\s*\(/i.test(v);
const array = (predicate: Predicate): Predicate => v => Array.isArray(v) && v.every(predicate);
function record(v: unknown, required: Record<string, Predicate>, optional: Record<string, Predicate> = {}): boolean {
  if (typeof v !== "object" || v === null || Array.isArray(v))
    return false;
  const x = v as Record<string, unknown>;
  return Object.keys(required).every(k => Object.hasOwn(x, k)) && Object.keys(x).every(k => (required[k] ?? optional[k])?.(x[k]) === true);
}
const matrix: Predicate = v => Array.isArray(v) && v.length === 16 && v.every(finite);
const transform: Predicate = v => {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== 1)
    return false;
  const [key, value] = Object.entries(v)[0]!;
  return ["perspective", "scale", "scaleX", "scaleY"].includes(key) ? finite(value) : ["rotate", "rotateX", "rotateY", "rotateZ", "skewX", "skewY"].includes(key) ? angle(value) : ["translateX", "translateY"].includes(key) ? numberOrPct(value) : key === "matrix" && matrix(value);
};
const shadow: Predicate = v => record(v, { offsetX: numberOrPct, offsetY: numberOrPct }, { color, blurRadius: nonnegative, spreadDistance: finite, inset: x => typeof x === "boolean" });
const pixel: Predicate = v => finite(v) || v === "0" || unit("px")(v);
const positivePixel: Predicate = v => nonnegative(v) || v === "0" || unit("px", true)(v);
const dropShadow: Predicate = v => record(v, { offsetX: pixel, offsetY: pixel }, { standardDeviation: positivePixel, color: x => color(x) || finite(x) });
const filter: Predicate = v => {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== 1)
    return false;
  const [key, value] = Object.entries(v)[0]!;
  return key === "dropShadow" ? dropShadow(value) : key === "hueRotate" ? value === 0 || value === "0" || angle(value) : key === "blur" ? nonnegative(value) || unit("(?:px)?", true)(value) : ["brightness", "contrast", "grayscale", "invert", "opacity", "saturate", "sepia"].includes(key) && (nonnegative(value) || unit("(?:%|px)?", true)(value));
};
const sizeLength: Predicate = v => v === "auto" || nonnegative(v) || unit("(?:px|%)", true)(v);
const radialLength: Predicate = v => nonnegative(v) || unit("(?:px|%)", true)(v);
const positionLength: Predicate = v => finite(v) || v === "0" || unit("(?:px|%)")(v);
const position: Predicate = v => ["top", "bottom"].some(y => ["left", "right"].some(x => record(v, { [y]: positionLength, [x]: positionLength })));
const stop: Predicate = v => record(v, { color: x => x === null || color(x) }, { positions: array(numberOrPct) });
const direction: Predicate = v => unit("(?:deg|grad|rad|turn)")(v) || typeof v === "string" && ["to top", "to right", "to bottom", "to left", "to top right", "to right top", "to bottom right", "to right bottom", "to top left", "to left top", "to bottom left", "to left bottom"].includes(v);
const image: Predicate = v => record(v, { type: x => x === "linear-gradient", direction, colorStops: array(stop) }) || record(v, { type: x => x === "radial-gradient", shape: x => x === "circle" || x === "ellipse", size: x => typeof x === "string" && ["closest-corner", "closest-side", "farthest-corner", "farthest-side"].includes(x) || record(x, { x: radialLength, y: radialLength }), position, colorStops: array(stop) });
export function isNativeStructuredValue(property: string, value: unknown): boolean {
  switch (property) {
    case "shadowOffset":
    case "textShadowOffset": return record(value, { width: finite, height: finite });
    case "transform": return array(transform)(value);
    case "transformOrigin": return Array.isArray(value) && (value.length === 2 || value.length === 3) && value.every(numberOrPct);
    case "transformMatrix": return matrix(value);
    case "boxShadow": return array(shadow)(value);
    case "filter": return array(filter)(value);
    case "fontVariant": return array(v => typeof v === "string" && (fontVariantValues as readonly string[]).includes(v))(value);
    case "experimental_backgroundRepeat": return array(v => record(v, { x: x => ["repeat", "space", "round", "no-repeat"].includes(x as string), y: x => ["repeat", "space", "round", "no-repeat"].includes(x as string) }))(value);
    case "experimental_backgroundSize": return array(v => v === "cover" || v === "contain" || record(v, { x: sizeLength, y: sizeLength }))(value);
    case "experimental_backgroundPosition": return array(position)(value);
    case "experimental_backgroundImage": return array(image)(value);
    default: return false;
  }
}
