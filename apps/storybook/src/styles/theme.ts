import { createTheme, createThemeContract } from "@crumbs/css/style"

export type ShowcaseThemeMode = "dark" | "light"

export const vars = createThemeContract({
  color: {
    accent: null,
    accentMuted: null,
    accentText: null,
    canvas: null,
    copy: null,
    edge: null,
    muted: null,
    panel: null,
    panelRaised: null,
  },
  radius: {
    lg: null,
    pill: null,
  },
  space: {
    lg: null,
    md: null,
    sm: null,
    xl: null,
    xs: null,
  },
})

export const darkTheme = createTheme(vars, {
  color: {
    accent: "#d1a85f",
    accentMuted: "#2f2416",
    accentText: "#130f09",
    canvas: "#0d0b09",
    copy: "#f3ecdf",
    edge: "#4e3921",
    muted: "#b9ac97",
    panel: "#17120e",
    panelRaised: "#211912",
  },
  radius: {
    lg: 26,
    pill: 999,
  },
  space: {
    lg: 20,
    md: 16,
    sm: 10,
    xl: 28,
    xs: 6,
  },
})

export const lightTheme = createTheme(vars, {
  color: {
    accent: "#8f231c",
    accentMuted: "#f2dfd2",
    accentText: "#fff7ef",
    canvas: "#f4ecdb",
    copy: "#2b1a12",
    edge: "#c9b292",
    muted: "#6c5648",
    panel: "#fbf6ed",
    panelRaised: "#fffaf2",
  },
  radius: {
    lg: 26,
    pill: 999,
  },
  space: {
    lg: 20,
    md: 16,
    sm: 10,
    xl: 28,
    xs: 6,
  },
})

export const labelOfThemeMode = (mode: ShowcaseThemeMode): string =>
  mode === "dark" ? "Dark" : "Light"
