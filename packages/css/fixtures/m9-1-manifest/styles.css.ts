import { textStyle, viewStyle } from "../../src/native-style"
import { tokens as vars } from "./tokens"

const base = viewStyle({
  padding: vars.space.publicSmall,
  backgroundColor: vars.color.privateSurface,
})

export const panel = viewStyle([base, { padding: vars.space.privateGap }])
export const label = textStyle({ color: vars.color.label })
export const legacy = viewStyle({ borderColor: "var(--crumbs-legacy-missing)" })
export const cssOnly = viewStyle({ transform: "scale(2)" })
