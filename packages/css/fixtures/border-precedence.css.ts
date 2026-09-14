import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe, createThemeContract } from "@opsydyn/crumbs-css/style"

const vars = createThemeContract({ borderRegression: { width: null, color: null } })
const base = style({ borderWidth: vars.borderRegression.width, borderColor: vars.borderRegression.color })
const literal = style({ borderLeftWidth: 3, borderTopColor: "blue" })

export const broadWins = viewStyle([literal, base])
export const narrowWins = viewStyle([base, literal])
export const repeated = viewStyle([base, [literal, base]])
export const sameRule = viewStyle({
  borderLeftWidth: 3,
  borderWidth: vars.borderRegression.width,
  borderColor: vars.borderRegression.color,
  borderTopColor: "blue",
})
export const text = textStyle([literal, base])
export const image = imageStyle([base, literal])
export const states = styleVariants({ broad: [literal, base], narrow: [base, literal] })
export const button = recipe({
  base: { borderWidth: vars.borderRegression.width, borderColor: vars.borderRegression.color },
  variants: {
    selected: {
      true: { borderWidth: vars.borderRegression.width, borderTopWidth: 2 },
      false: {},
    },
  },
  defaultVariants: { selected: true },
})
export const compound = style([
  { borderLeftWidth: 3, borderTopColor: "blue" },
  { border: "2px solid red" },
])
