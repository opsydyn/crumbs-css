import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe, createThemeContract } from "@opsydyn/crumbs-css/style"
const vars = createThemeContract({ sideBorderRegression: { value: null } })
export const side = viewStyle({ borderTopWidth: vars.sideBorderRegression.value, borderLeftColor: "red", borderStyle: "solid" })
export const text = textStyle({ borderBottomWidth: vars.sideBorderRegression.value, borderStyle: "dashed" })
export const image = imageStyle({ borderRightWidth: vars.sideBorderRegression.value })
export const states = styleVariants({ side: { borderStartWidth: vars.sideBorderRegression.value, borderStyle: "dotted" } })
export const button = recipe({ base: { borderLeftWidth: vars.sideBorderRegression.value, borderLeftColor: "red", borderStyle: "solid" }, variants: {} })
export const broad = style({ border: "2px solid red" })
