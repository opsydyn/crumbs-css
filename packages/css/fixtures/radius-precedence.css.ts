import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe, createThemeContract } from "@opsydyn/crumbs-css/style"

const vars = createThemeContract({ radiusRegression: { wide: null } })
const base = style({ borderRadius: vars.radiusRegression.wide })
const corner = style({ borderTopLeftRadius: 3 })
export const broadWins = viewStyle([corner, base])
export const cornerWins = viewStyle([base, corner])
export const repeated = viewStyle([base, [corner, base]])
export const sameRule = viewStyle({ borderTopLeftRadius: 3, borderRadius: vars.radiusRegression.wide })
export const text = textStyle([base, corner])
export const image = imageStyle([corner, base])
export const states = styleVariants({ broad: [corner, base], corner: [base, corner] })
export const button = recipe({
  base: { borderTopLeftRadius: 3, borderRadius: vars.radiusRegression.wide },
  variants: { selected: { true: { borderRadius: vars.radiusRegression.wide, borderBottomRightRadius: 0 }, false: {} } },
  defaultVariants: { selected: true },
})
