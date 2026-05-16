import { style } from "@vanilla-extract/css"

// Plain TS constants — safe to import on native; esbuild inlines the values.
// (createGlobalTheme creates CSS vars which RN StyleSheet cannot resolve.)
export const colors = {
  gold: "#c8aa6e",
  dark: "#0a0a0a",
}

export const space = {
  sm: 8,
  md: 16,
  lg: 24,
}

// A class that also uses the constants — works on both web and native.
export const themeBase = style({
  color: colors.gold,
  backgroundColor: colors.dark,
})
