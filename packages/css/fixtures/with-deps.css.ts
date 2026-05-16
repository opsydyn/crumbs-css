import { style } from "@vanilla-extract/css"
import { colors, space } from "./tokens.css"

export const btn = style({
  color: colors.gold,
  backgroundColor: colors.dark,
  padding: space.sm,
})
