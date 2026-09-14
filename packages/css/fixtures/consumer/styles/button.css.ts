import { recipe, textStyle } from "@opsydyn/crumbs-css/style"
import { vars } from "./theme.css"

export const button = recipe({
  base: { minHeight: 48, backgroundColor: vars.fixture.color.accent, padding: vars.fixture.space.md },
  variants: {
    tone: { primary: { backgroundColor: vars.fixture.color.accent }, secondary: { backgroundColor: "transparent" } },
    disabled: { false: {}, true: { opacity: 0.64 } },
    pressed: { false: {}, true: { opacity: 0.82 } },
  },
  defaultVariants: { tone: "primary", disabled: false, pressed: false },
  compoundVariants: [{ variants: { disabled: true, tone: "primary" }, style: { opacity: 0.5 } }],
}, "fixtureButton")

export const label = textStyle({ fontFamily: vars.fixture.font.display, color: vars.fixture.color.text })
