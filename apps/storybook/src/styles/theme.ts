import {
  createTokenContract,
  createTokenTheme,
  defineToken,
  type TokenThemeLayer,
} from "@opsydyn/crumbs-css/tokens"

export type ShowcaseBrand = "foundry" | "signal"
export type ShowcaseDensity = "compact" | "comfortable"
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
  control: {
    height: defineToken("length"),
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
  identity: { owner: "@opsydyn/crumbs", name: "storybook", version: 2 },
})

const defaultThemeValues = {
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
  control: { height: 48 },
  radius: { lg: 26, pill: 999 },
  space: { lg: 20, md: 16, sm: 10, xl: 28, xs: 6 },
} as const

export const baseTheme = createTokenTheme(vars, defaultThemeValues)

export const brandScopes = {
  foundry: {
    color: {
      accent: "#d1a85f",
      accentMuted: "#2f2416",
      accentText: "#130f09",
    },
  },
  signal: {
    color: {
      accent: "#087f8c",
      accentMuted: "#d4f1ef",
      accentText: "#ffffff",
    },
  },
} as const satisfies Record<ShowcaseBrand, TokenThemeLayer<typeof vars>>

export const modeScopes = {
  dark: {
    color: {
      canvas: "#0d0b09",
      copy: "#f3ecdf",
      edge: "#4e3921",
      muted: "#b9ac97",
      panel: "#17120e",
      panelRaised: "#211912",
    },
  },
  light: {
    color: {
      canvas: "#f4ecdb",
      copy: "#2b1a12",
      edge: "#c9b292",
      muted: "#6c5648",
      panel: "#fbf6ed",
      panelRaised: "#fffaf2",
    },
  },
} as const satisfies Record<ShowcaseThemeMode, TokenThemeLayer<typeof vars>>

export const densityScopes = {
  compact: {
    control: { height: 40 },
    radius: { lg: 18 },
    space: { lg: 16, md: 12, sm: 8, xl: 20, xs: 4 },
  },
  comfortable: {
    control: { height: 48 },
    radius: { lg: 26 },
    space: { lg: 20, md: 16, sm: 10, xl: 28, xs: 6 },
  },
} as const satisfies Record<ShowcaseDensity, TokenThemeLayer<typeof vars>>

export const labelOfThemeMode = (mode: ShowcaseThemeMode): string =>
  mode === "dark" ? "Dark" : "Light"
