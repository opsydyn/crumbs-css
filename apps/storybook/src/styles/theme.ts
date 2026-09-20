import { createTokenContract, createTokenTheme, defineToken } from "@opsydyn/crumbs-css/tokens"

export type ShowcaseThemeMode = "dark" | "light"

export const vars = createTokenContract({
  color: {
    accent: defineToken("color"),
    accentMuted: defineToken("color"),
    accentText: defineToken("color"),
    canvas: defineToken("color"),
    copy: defineToken("color"),
    edge: defineToken("color"),
    muted: defineToken("color"),
    panel: defineToken("color"),
    panelRaised: defineToken("color"),
  },
  radius: {
    lg: defineToken("length"),
    pill: defineToken("length"),
  },
  space: {
    lg: defineToken("length"),
    md: defineToken("length"),
    sm: defineToken("length"),
    xl: defineToken("length"),
    xs: defineToken("length"),
  },
}, {
  identity: { owner: "@opsydyn/crumbs", name: "storybook", version: 1 },
})

export const darkTheme = createTokenTheme(vars, {
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

export const lightTheme = createTokenTheme(vars, {
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
