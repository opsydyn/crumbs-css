import { style, recipe, textStyle, viewStyle } from "@opsydyn/crumbs-css/style"
import { vars } from "./theme.css"

export const screenTitle = "Crumbs playground"
const rootFlexBase = viewStyle({ flex: 0 })
export const root = viewStyle([rootFlexBase, { flex: vars.playground.layout.rootFlex, backgroundColor: vars.playground.color.canvas, padding: 0, paddingInline: vars.playground.space.gap, paddingBlock: vars.playground.space.gap, paddingBlockStart: 60 }])
const panelCornerBase = viewStyle({ borderTopLeftRadius: 3 })
export const panel = viewStyle([panelCornerBase, { backgroundColor: vars.playground.color.panel, padding: vars.playground.space.gap, borderRadius: vars.playground.radius.panel, marginBottom: 12, transform: [{ translateX: 0 }, { scale: 1 }], shadowOffset: { width: 0, height: 2 } }])
export const copy = textStyle({ color: vars.playground.color.text, fontSize: 16 })
export const title = textStyle([copy, { fontSize: 24, fontWeight: "700", marginBottom: 12 }])
const inputBorderBase = textStyle({ borderLeftWidth: 3, borderTopColor: vars.playground.color.text })
export const input = style([inputBorderBase, { color: vars.playground.color.text, backgroundColor: vars.playground.color.panel, padding: 12, borderWidth: 1, borderColor: vars.playground.color.accent, borderRadius: 8 }])
export const button = recipe({
  base: { padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: vars.playground.color.accent },
  variants: { selected: { true: { backgroundColor: vars.playground.color.panel }, false: { opacity: 0.7 } } },
  defaultVariants: { selected: false },
})
export const overlay = viewStyle({ position: "absolute", top: 100, left: 16, right: 16, padding: 24, backgroundColor: vars.playground.color.panel, borderWidth: 2, borderColor: vars.playground.color.accent, borderRadius: 12 })
