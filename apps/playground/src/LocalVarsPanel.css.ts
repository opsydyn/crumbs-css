import { createVar, fallbackVar, viewStyle } from "@opsydyn/crumbs-css/style";
import { localThemeVars } from "./local-theme";
export const accent = createVar("color", { owner: "@crumbs/playground-local", name: "Card.accent", version: 1 });
export const alpha = createVar("opacity", { owner: "@crumbs/playground-local", name: "Card.alpha", version: 1 });
export const card = viewStyle({ backgroundColor: fallbackVar(accent, localThemeVars.accent), opacity: fallbackVar(alpha, 1), padding: 16, borderRadius: 12 });
export const literal = viewStyle({ opacity: fallbackVar(alpha, 1), padding: 8 });
