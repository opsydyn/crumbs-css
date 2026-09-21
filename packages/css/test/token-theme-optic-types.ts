import {
  createTokenContract,
  createTokenTheme,
  defineToken,
} from "../src/tokens"
import { createTokenThemeFocus } from "../src/tokens/optic"

const vars = createTokenContract({
  color: {accent: defineToken("color")},
  space: {md: defineToken("length")},
})
const theme = createTokenTheme(vars, {color: {accent: "#fff"}, space: {md: 8}})
const color = createTokenThemeFocus(vars, vars.color.accent)
const space = createTokenThemeFocus(vars, vars.space.md)

const colorValue: string = color.get(theme)
const spacingValue: number | `${number}%` | "auto" = space.get(theme)
color.replace("#000", theme)
space.replace(4, theme)
color.modify(value => value.toUpperCase(), theme)
space.modify(() => "auto", theme)
void [colorValue, spacingValue]

// @ts-expect-error A length focus cannot accept a colour replacement.
space.replace("#000", theme)

// @ts-expect-error A colour focus cannot accept a numeric replacement.
color.replace(4, theme)
