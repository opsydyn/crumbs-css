import { createTokenContract, createTokenTheme, defineToken } from "@opsydyn/crumbs-css/tokens";
export const localThemeVars = createTokenContract({ accent: defineToken("color") }, { owner: "@crumbs/playground-local", name: "LocalTheme", version: 1 });
export const localLight = createTokenTheme(localThemeVars, { accent: "#16804a" });
export const localDark = createTokenTheme(localThemeVars, { accent: "#9a65de" });
