import { style, styleVariants } from "@opsydyn/crumbs-css/style"
import { vars } from "./theme"

export const button = styleVariants({
  default: {
    backgroundColor: vars.color.accent,
    borderRadius: 8,
    paddingBottom: 10,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 10,
  },
  pressed: {
    opacity: 0.8,
  },
})

export const buttonLabel = style({
  color: vars.color.canvas,
  fontSize: 14,
  fontWeight: 700,
})
