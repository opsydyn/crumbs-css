import { createVar, fallbackVar, viewStyle } from "@opsydyn/crumbs-css/style";
import { vars } from "../styles/theme";
export const accent = createVar("color", { owner: "@crumbs/storybook-local", name: "Card.accent", version: 1 });
export const alpha = createVar("opacity", { owner: "@crumbs/storybook-local", name: "Card.alpha", version: 1 });
export const card = viewStyle({ backgroundColor: fallbackVar(accent, vars.color.accent), opacity: fallbackVar(alpha, 1), padding: 16, borderRadius: 12 });
export const literal = viewStyle({ opacity: fallbackVar(alpha, 1), padding: 8 });
