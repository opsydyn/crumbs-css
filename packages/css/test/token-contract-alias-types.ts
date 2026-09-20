import { createTokenContract, createTokenTheme, defineAlias, defineToken, type TokenThemeValues } from "../src/tokens"
import { textStyle, viewStyle } from "../src/native-style"

const vars = createTokenContract({
  foundation: {
    color: { blue500: defineToken("color") },
    space: { md: defineToken("length") },
  },
  semantic: {
    accent: defineAlias("foundation.color.blue500"),
    gap: defineAlias("foundation.space.md"),
  },
  component: {
    button: { background: defineAlias("semantic.accent") },
  },
}, {
  owner: "@acme/tokens",
  name: "alias-types",
  version: 1,
})

const values = {
  foundation: {
    color: {blue500: "#2463eb"},
    space: {md: 8},
  },
} satisfies TokenThemeValues<typeof vars>

createTokenTheme(vars, values)
viewStyle({
  backgroundColor: vars.semantic.accent,
  padding: vars.semantic.gap,
})
// The component alias inherits the colour domain through the semantic alias.
textStyle({color: vars.component.button.background})

createTokenTheme(vars, {
  foundation: {color: {blue500: "#2463eb"}, space: {md: 8}},
  semantic: {
    // @ts-expect-error Alias leaves are derived and cannot be supplied as theme values.
    accent: "#fff",
  },
})

// @ts-expect-error A colour alias cannot satisfy a length-valued property.
viewStyle({padding: vars.semantic.accent})
