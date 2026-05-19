import { style } from "@opsydyn/crumbs-css/style"
import { vars } from "./theme"

export const screen = style({
  flex: 1,
  backgroundColor: vars.color.canvas,
  padding: vars.space.screen,
})

export const title = style({
  color: vars.color.accent,
  fontSize: 28,
  fontWeight: 700,
})
