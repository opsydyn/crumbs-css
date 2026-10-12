import { createTheme, createThemeContract } from "@opsydyn/crumbs-css/style"

export const vars = createThemeContract({ fixture: {
  color: { canvas: null, accent: null, text: null },
  font: { display: null },
  space: { md: null },
} })

export const light = createTheme(vars, { fixture: {
  color: { canvas: "#f2f4f8", accent: "#3559c7", text: "#172438" },
  font: { display: "System" },
  space: { md: 16 },
} })
