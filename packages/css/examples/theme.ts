import { createTheme, createThemeContract } from "@crumbs/css/style"

export const vars = createThemeContract({
  color: {
    accent: null,
    canvas: null,
    text: null,
  },
  space: {
    screen: null,
  },
})

export const darkTheme = createTheme(vars, {
  color: {
    accent: "#c8aa6e",
    canvas: "#0a0a0a",
    text: "#f5f5f5",
  },
  space: {
    screen: 24,
  },
})
