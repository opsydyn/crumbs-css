import { recipe } from "@opsydyn/crumbs-css/style"
import { vars } from "./theme.css"
export const probe = recipe({
  base: { borderColor: vars.playground.color.accent, borderWidth: 1, padding: 12 },
  variants: { selected: { false: { opacity: 0.7 }, true: { opacity: 1 } }, size: { small: { padding: 12 }, large: { padding: 20 } } },
  defaultVariants: { selected: false, size: "small" },
  compoundVariants: [{ variants: { selected: true, size: "large" }, style: { borderWidth: 4 } }],
})
