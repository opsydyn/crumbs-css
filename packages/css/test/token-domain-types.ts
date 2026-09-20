import {
  createTokenContract,
  defineToken,
  token,
  type TokenThemeValues,
} from "../src/tokens"
import { viewStyle } from "../src/native-style"

const vars = createTokenContract({
  color: { accent: defineToken("color") },
  space: { md: defineToken({ kind: "length" }) },
  motion: { fast: defineToken("duration") },
  alpha: { muted: defineToken("opacity") },
  display: { mode: defineToken({ kind: "enum", values: ["flex", "none"] as const }) },
})

const values = {
  color: { accent: "#ffffff" },
  space: { md: 8 },
  motion: { fast: 160 },
  alpha: { muted: 0.5 },
  display: { mode: "flex" },
} satisfies TokenThemeValues<typeof vars>

viewStyle({
  backgroundColor: vars.color.accent,
  padding: vars.space.md,
  opacity: vars.alpha.muted,
  display: vars.display.mode,
})

void values
void token.color()
void token.length({ allowNegative: true })
void token.duration()
void token.opacity()
void token.enum(["flex", "none"] as const)

// @ts-expect-error A colour token cannot satisfy a length-valued property.
viewStyle({ padding: vars.color.accent })
// @ts-expect-error A colour token cannot satisfy a property-enum value.
viewStyle({ display: vars.color.accent })
// @ts-expect-error An enum token cannot satisfy a length-valued property.
viewStyle({ margin: vars.display.mode })
