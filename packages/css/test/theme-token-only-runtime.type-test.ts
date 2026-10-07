import {createTokenStyles, resolveTokenStyles, themeToken} from "@opsydyn/crumbs-css/theme/token"
import {createThemeContract} from "@opsydyn/crumbs-css/style"
import type {NativeTheme} from "@opsydyn/crumbs-css/style"
import type {ViewStyle} from "react-native"
import {createTokenContract, defineToken} from "@opsydyn/crumbs-css/tokens"

const vars = createTokenContract({
  color: {accent: defineToken("color")},
  space: {md: defineToken("length")},
  opacity: {disabled: defineToken("opacity")},
  display: {mode: defineToken({kind: "enum", values: ["flex", "none"] as const})},
  invalidDisplay: {mode: defineToken({kind: "enum", values: ["grid"] as const})},
})

const styles = createTokenStyles<ViewStyle>()({
  card: {
    backgroundColor: themeToken(vars.color.accent),
    padding: themeToken(vars.space.md),
    opacity: themeToken(vars.opacity.disabled),
    display: themeToken(vars.display.mode),
  },
})
const resolved = resolveTokenStyles(styles, {} as NativeTheme<Record<string, unknown>>)
const legacyVars = createThemeContract({accent: null})

const color: string | undefined = resolved.card.backgroundColor
const padding: NonNullable<ViewStyle["padding"]> | undefined = resolved.card.padding
const opacity: number | undefined = resolved.card.opacity
const display: "flex" | "none" | undefined = resolved.card.display
void [color, padding, opacity, display]

// @ts-expect-error Token-only references must come from a typed token contract.
themeToken("--crumbs-color-accent")
// @ts-expect-error Legacy references remain on the existing theme/core path.
themeToken(legacyVars.accent)
// @ts-expect-error Callers cannot assert a value type unrelated to the contract token.
themeToken<string>(vars.space.md)
// @ts-expect-error A length token cannot populate a color property.
createTokenStyles<ViewStyle>()({card: {backgroundColor: themeToken(vars.space.md)}})
// @ts-expect-error A color token cannot populate a numeric layout property.
createTokenStyles<ViewStyle>()({card: {padding: themeToken(vars.color.accent)}})
// @ts-expect-error Enum values must be accepted by the selected native property.
createTokenStyles<ViewStyle>()({card: {display: themeToken(vars.invalidDisplay.mode)}})
// @ts-expect-error Token-only styles do not accept structured native style values.
createTokenStyles<ViewStyle>()({card: {shadowOffset: {width: 0, height: 1}}})
