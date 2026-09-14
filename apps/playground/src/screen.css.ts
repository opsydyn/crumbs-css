import { recipe, textStyle, viewStyle } from "@opsydyn/crumbs-css/style"
import { vars } from "./theme"

export const root = viewStyle({ flex: 1, backgroundColor: vars.playground.color.canvas, padding: vars.playground.space.gap, paddingTop: 60 })
export const panel = viewStyle({ backgroundColor: vars.playground.color.panel, padding: vars.playground.space.gap, borderRadius: 12, marginBottom: 12, transform: [{ translateX: 0 }, { scale: 1 }], shadowOffset: { width: 0, height: 2 } })
export const copy = textStyle({ color: vars.playground.color.text, fontSize: 16 })
export const title = textStyle([copy, { fontSize: 24, fontWeight: "700", marginBottom: 12 }])
export const input = textStyle({ color: vars.playground.color.text, backgroundColor: vars.playground.color.panel, padding: 12, borderWidth: 1, borderColor: vars.playground.color.accent, borderRadius: 8 })
export const button = recipe({
  base: { padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: vars.playground.color.accent },
  variants: { selected: { true: { backgroundColor: vars.playground.color.panel }, false: { opacity: 0.7 } } },
  defaultVariants: { selected: false },
})
export const overlay = viewStyle({ position: "absolute", top: 100, left: 16, right: 16, padding: 24, backgroundColor: vars.playground.color.panel, borderWidth: 2, borderColor: vars.playground.color.accent, borderRadius: 12 })
