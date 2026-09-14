import { textStyle, viewStyle, styleVariants } from "@opsydyn/crumbs-css/style"
import { vars } from "./theme.css"

export const container = viewStyle({ backgroundColor: vars.fixture.color.canvas, padding: vars.fixture.space.md })
export const heading = textStyle({ color: vars.fixture.color.text, fontFamily: vars.fixture.font.display, fontSize: 24 })
export const button = styleVariants({
  default: { backgroundColor: vars.fixture.color.accent, minHeight: 48 },
  pressed: { backgroundColor: vars.fixture.color.accent, minHeight: 48, opacity: 0.82 },
})
