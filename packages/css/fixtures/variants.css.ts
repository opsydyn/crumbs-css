import { styleVariants } from "@crumbs/css/style"
import { vars } from "./themed.css"

export const button = styleVariants({
  default: {
    backgroundColor: vars.color.canvas,
    opacity: 1,
  },
  pressed: {
    backgroundColor: vars.color.text,
    opacity: 0.8,
  },
})
