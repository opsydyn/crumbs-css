import type { NativeTheme } from "@opsydyn/crumbs-css/style"
import {
  createTokenContract,
  createTokenThemeSnapshot,
  defineToken,
} from "@opsydyn/crumbs-css/tokens"

export const vars = createTokenContract({
  color: {
    accent: defineToken("color"),
    canvas: defineToken("color"),
    muted: defineToken("color"),
    onAccent: defineToken("color"),
  },
  radius: {
    md: defineToken("length"),
  },
  space: {
    md: defineToken("length"),
  },
}, {
  identity: { owner: "@acme/design-tokens", name: "Foundation", version: 1 },
})

export const theme: NativeTheme<typeof vars> = createTokenThemeSnapshot(vars, {
  base: {
    color: {
      accent: "#2457d6",
      canvas: "#f7f8fb",
      muted: "#586174",
      onAccent: "#ffffff",
    },
    radius: { md: 12 },
    space: { md: 16 },
  },
  contexts: {},
})
