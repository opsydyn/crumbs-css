import { createTheme, createThemeContract, style } from "@opsydyn/crumbs-css/style"

export const vars = createThemeContract({
  color: {
    canvas: null,
    text: null,
  },
  space: {
    md: null,
  },
})

export const darkTheme = createTheme(vars, {
  color: {
    canvas: "#0a0a0a",
    text: "#f5f5f5",
  },
  space: {
    md: 24,
  },
})

export const container = style({
  backgroundColor: vars.color.canvas,
  color: vars.color.text,
  padding: vars.space.md,
})
