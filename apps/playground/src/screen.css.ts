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
const overlayPositionBase = viewStyle({ insetInline: 0 })
export const overlay = viewStyle([overlayPositionBase, { position: "absolute", insetBlockStart: 100, insetInline: vars.playground.space.gap, padding: 24, backgroundColor: vars.playground.color.panel, borderWidth: 2, borderColor: vars.playground.color.accent, borderRadius: 12 }])
export const gradientScroll = viewStyle({ flex: 1 })
export const gradientCard = viewStyle({ minHeight: 96, padding: 16, marginBottom: 12, borderRadius: 12, justifyContent: "flex-end" })
export const gradientKeyword = viewStyle({ experimental_backgroundImage: [{ type: "linear-gradient", direction: "to bottom right", colorStops: [{ color: "#172438" }, { color: "#95afff", positions: ["100%"] }] }] })
export const gradientAngle = viewStyle({ experimental_backgroundImage: [{ type: "linear-gradient", direction: "180deg", colorStops: [{ color: "#3559c7", positions: ["0%"] }, { color: "#f2f4f8", positions: ["100%"] }] }] })
export const gradientRadialExtent = viewStyle({ experimental_backgroundImage: [{ type: "radial-gradient", shape: "circle", size: "farthest-corner", position: { top: "50%", left: "50%" }, colorStops: [{ color: "#95afff" }, { color: "#172438", positions: ["100%"] }] }] })
export const gradientRadialSize = viewStyle({ experimental_backgroundImage: [{ type: "radial-gradient", shape: "ellipse", size: { x: "40%", y: 30 }, position: { bottom: 0, right: 0 }, colorStops: [{ color: "#3559c7" }, { color: "#f2f4f8", positions: ["100%"] }] }] })
export const gradientStops = viewStyle({ experimental_backgroundImage: [{ type: "linear-gradient", direction: "to right", colorStops: [{ color: "transparent", positions: ["0%", "20%"] }, { color: null, positions: ["50%"] }, { color: "#3559c7", positions: ["100%"] }] }] })
export const gradientLayered = viewStyle({ experimental_backgroundImage: [{ type: "linear-gradient", direction: "to bottom", colorStops: [{ color: "#172438" }, { color: "#95afff", positions: ["100%"] }] }, { type: "radial-gradient", shape: "circle", size: "closest-side", position: { top: "20%", left: "20%" }, colorStops: [{ color: "transparent" }, { color: "#3559c7", positions: ["100%"] }] }] })
export const gradientEmpty = viewStyle({ experimental_backgroundImage: [] })
