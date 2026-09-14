import type { DimensionValue, ImageStyle, TextStyle, ViewStyle } from "react-native"
import { createThemeTokenReference, resolveThemeStyles, resolveThemeTokens, useThemedStyle, useThemedStyles } from "../src/theme-runtime"

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
const theme = { contract: {}, tokens: {}, values: {} }
const view: ViewStyle = { opacity: 0.5, transform: [{ scale: 2 }] }
const text: TextStyle = { fontWeight: "700" }
const image: ImageStyle = { resizeMode: "cover" }
const resolved = resolveThemeStyles({ view, text, image, variants: { normal: text } }, theme)
const hooked = useThemedStyles({ view, text, image })
const direct = resolveThemeTokens(text, theme)
const array = resolveThemeTokens([image, undefined, false] as const, theme)
const hook = useThemedStyle(image)
type TextEntry = TextStyle | false | null | undefined | ReadonlyArray<TextEntry>
const recursive: TextEntry = [text, [null, text]]
const recursiveResult = resolveThemeTokens(recursive, theme)
const tokenized = resolveThemeStyles({ leaf: { opacity: 0.5, width: createThemeTokenReference("--crumbs-structured-wide") } }, theme)
const resolvedWidth: DimensionValue | undefined = tokenized.leaf?.width
void resolvedWidth
const checks: [
  Equal<typeof resolved.view, ViewStyle | undefined>,
  Equal<typeof resolved.text, TextStyle | undefined>,
  Equal<typeof resolved.image, ImageStyle | undefined>,
  Equal<typeof resolved.variants.normal, TextStyle | undefined>,
  Equal<typeof hooked.text, TextStyle | undefined>,
  Equal<typeof direct, TextStyle | undefined>,
  Equal<typeof array, ImageStyle | undefined>,
  Equal<typeof hook, ImageStyle | undefined>,
  Equal<typeof recursiveResult, TextStyle | undefined>,
] = [true, true, true, true, true, true, true, true, true]
void checks

// @ts-expect-error Resolved view styles must not acquire text-only properties.
resolved.view?.fontWeight
// @ts-expect-error Resolved text styles must not acquire image-only properties.
resolved.text?.resizeMode
// @ts-expect-error Resolved image styles must not acquire text-only properties.
hook?.fontWeight
