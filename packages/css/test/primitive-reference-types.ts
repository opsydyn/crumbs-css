import type { ImageStyle, TextStyle, ViewStyle } from "react-native"
import { Animated } from "react-native"
import { createThemeContract, imageStyle, textStyle, viewStyle, style, styleVariants, type NativeStyle, type NativeStyleRule, type NativeStyleComposition } from "../src/native-style"
import { resolveThemeStyles, resolveThemeTokens, useThemedStyles } from "../src/theme-runtime"

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
const view = viewStyle({ overflow: "scroll", opacity: 0.5 })
const text = textStyle({ fontWeight: "700", overflow: "scroll" })
const image = imageStyle({ resizeMode: "cover" })
const views = style([view, [{ opacity: 1 }, view]])
const texts = style([text, { fontWeight: "400" }])
const images = style([image, { resizeMode: "contain" }])
const direct = style(view)
const variants = styleVariants({ view, text: [text, [{ fontWeight: "400" }]], image: [image], plain: { opacity: 1 } })
const theme = { contract: {}, values: {}, tokens: {} }
const resolved = resolveThemeStyles(variants, theme)
const hooked = useThemedStyles(variants)
const directResolved = resolveThemeTokens(views, theme)
type RecursiveViews = ReadonlyArray<ViewStyle | RecursiveViews>
const recursive: RecursiveViews = [view, [view]]
const recursiveResult = style(recursive)
const mixed = style([view, image])
const checks: [
  Equal<typeof views, ViewStyle>, Equal<typeof texts, TextStyle>, Equal<typeof images, ImageStyle>,
  Equal<typeof direct, ViewStyle>, Equal<typeof variants.view, ViewStyle>, Equal<typeof variants.text, TextStyle>,
  Equal<typeof variants.image, ImageStyle>, Equal<typeof variants.plain, NativeStyle>,
  Equal<typeof resolved.view, ViewStyle | undefined>, Equal<typeof hooked.text, TextStyle | undefined>,
  Equal<typeof directResolved, ViewStyle | undefined>, Equal<typeof recursiveResult, ViewStyle>,
  Equal<typeof mixed, ViewStyle | ImageStyle>, Equal<typeof styleLiteral, NativeStyle>,
] = [true, true, true, true, true, true, true, true, true, true, true, true, true, true]
const styleLiteral = style({ color: "red" })
void checks

// @ts-expect-error View results must not acquire text-only fields.
views.fontWeight
// @ts-expect-error Text results must not acquire image-only fields.
variants.text.resizeMode
// @ts-expect-error Image results must not acquire text-only fields.
images.fontWeight
// @ts-expect-error View inline rules retain primitive property checking.
viewStyle([view, { fontWeight: "700" }])
// @ts-expect-error Text inline rules retain primitive property checking.
textStyle([text, { resizeMode: "contain" }])
// @ts-expect-error Image inline rules retain primitive property checking.
imageStyle([image, { fontWeight: "700" }])
// @ts-expect-error Invalid native values are not references.
styleVariants({ invalid: { resizeMode: "invalid" } })
// @ts-expect-error Browser class strings remain rejected.
style(["browser-class"])
// @ts-expect-error Direct inline animated transforms remain outside static authoring.
style({ transform: [{ scale: new Animated.Value(1) }] })
// @ts-expect-error Variant inline animated transforms remain outside static authoring.
styleVariants({ invalid: { transform: [{ scale: new Animated.Value(1) }] } })

// @ts-expect-error A view reference anchors generic inline overrides to view properties.
style([view, { fontWeight: "700" }])
// @ts-expect-error A text reference anchors generic inline overrides to text properties.
style([text, { resizeMode: "contain" }])
// @ts-expect-error An image reference anchors nested inline overrides to image properties.
style([image, [{ fontWeight: "700" }]])
// @ts-expect-error Generic variant compositions retain reference-anchored inline checks.
styleVariants({ invalid: [view, { fontWeight: "700" }] })

declare const wideRule: NativeStyleRule
const wide = style(wideRule)
const wideCheck: Equal<typeof wide, NativeStyle> = true
void wideCheck

function genericRule<T extends NativeStyleRule>(rule: T) {
  return style<NativeStyleRule>(rule)
}
void genericRule

const genericComposition: NativeStyleComposition<never> = [view, [text, image]]
style(genericComposition)
function genericVariants<T extends Record<string, NativeStyleRule>>(rules: T) {
  return styleVariants<Record<string, NativeStyleRule>>(rules)
}
void genericVariants

// @ts-expect-error Reference-anchored inline transforms remain static.
style([view, { transform: [{ scale: new Animated.Value(1) }] }])
// @ts-expect-error Nested variant inline transforms remain static.
styleVariants({ invalid: [image, [{ transform: [{ scale: new Animated.Value(1) }] }]] })

// Native flex is numeric, including through generic inline authoring.
style({ flex: -1 }); styleVariants({ zero: { flex: 0 } })
// @ts-expect-error CSS multi-part flex has no native numeric semantics
style({ flex: "1 0 auto" })
// @ts-expect-error CSS keyword flex has no native numeric semantics
styleVariants({ none: { flex: "none" } })
// @ts-expect-error nested generic compositions must retain the native flex boundary
style([{ flex: 1 }, [{ flex: "auto" }]])
// @ts-expect-error primitive authoring already requires numeric flex
viewStyle({ flex: "1 2" })

const flexVars = createThemeContract({ packedFlex: { value: null } })
style({ flex: flexVars.packedFlex.value })
styleVariants({ token: { flex: flexVars.packedFlex.value } })

style({ paddingInline: 3, marginBlock: "25%", paddingInlineStart: flexVars.packedFlex.value })
viewStyle({ borderStartStartRadius: flexVars.packedFlex.value, borderEndEndRadius: 3 })
// @ts-expect-error native spacing aliases require a single value
style({ paddingInline: "1px 2px" })
// @ts-expect-error nested variant aliases require a single value
styleVariants({ invalid: [{ marginBlock: "1px 2px" }] })

style({ inset: 3, insetInline: "25%", insetInlineStart: flexVars.packedFlex.value })
viewStyle({ insetBlockEnd: "auto", insetBlockStart: -2 })
// @ts-expect-error native inset accepts one dimension
style({ inset: "1px 2px" })
// @ts-expect-error nested variant inset aliases accept one dimension
styleVariants({ invalid: [{ insetInline: "1px 2px" }] })
