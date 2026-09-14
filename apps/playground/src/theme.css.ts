import { createTheme, createThemeContract } from "@opsydyn/crumbs-css/style"

export const vars = createThemeContract({ playground: {
  color: { canvas: null, panel: null, text: null, accent: null },
  space: { gap: null },
  radius: { panel: null },
} })
export const light = createTheme(vars, { playground: {
  color: { canvas: "#f2f4f8", panel: "#ffffff", text: "#172438", accent: "#3559c7" },
  space: { gap: 16 },
  radius: { panel: 12 },
} })
export const dark = createTheme(vars, { playground: {
  color: { canvas: "#121925", panel: "#243149", text: "#f3f6ff", accent: "#95afff" },
  space: { gap: 16 },
  radius: { panel: 12 },
} })
