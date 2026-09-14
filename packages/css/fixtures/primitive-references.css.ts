import { viewStyle, textStyle, imageStyle, style, styleVariants } from "@opsydyn/crumbs-css/style"

const view = viewStyle({ overflow: "scroll", opacity: 0.5 })
const text = textStyle({ fontWeight: "700", overflow: "scroll" })
const image = imageStyle({ resizeMode: "cover" })
export const views = style([view, [{ opacity: 1 }, view]])
export const texts = style([text, { fontWeight: "400" }])
export const images = style([image, { resizeMode: "contain" }])
export const direct = style(view)
export const variants = styleVariants({ view, text: [text, [{ fontWeight: "400" }]], image: [image] })
