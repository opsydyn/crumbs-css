import { createTokenStyles, themeToken, useTokenStyles, ThemeProvider as TokenStyleThemeProvider } from "@opsydyn/crumbs-css/theme/token"
import { createTokenContract, createTokenTheme, defineToken } from "@opsydyn/crumbs-css/tokens"
import type { TextStyle, ViewStyle } from "react-native"
import { Text, View } from "react-native"

const vars = createTokenContract({
  color: {
    surface: defineToken("color"),
    text: defineToken("color"),
    border: defineToken("color"),
  },
  space: { card: defineToken("length") },
})

const lightTheme = createTokenTheme(vars, {
  color: { surface: "#ffffff", text: "#172438", border: "#d8deeb" },
  space: { card: 16 },
})
const darkTheme = createTokenTheme(vars, {
  color: { surface: "#243149", text: "#f3f6ff", border: "#425574" },
  space: { card: 16 },
})

const viewStyles = createTokenStyles<ViewStyle>()({
  card: {
    backgroundColor: themeToken(vars.color.surface),
    borderColor: themeToken(vars.color.border),
    borderWidth: 1,
    borderRadius: 12,
    padding: themeToken(vars.space.card),
  },
})
const textStyles = createTokenStyles<TextStyle>()({
  title: { color: themeToken(vars.color.text), fontSize: 17, fontWeight: "600" },
  body: { color: themeToken(vars.color.text), fontSize: 14, marginTop: 8 },
})

function TokenStyleContent({ isDark }: { readonly isDark: boolean }) {
  const views = useTokenStyles(viewStyles)
  const text = useTokenStyles(textStyles)
  return (
    <View testID="crumbs-theme-token-panel" accessibilityLabel="Contract-derived token styles" style={views.card}>
      <Text style={text.title}>Contract-derived token styles</Text>
      <Text style={text.body}>
        {isDark ? "Dark" : "Light"} theme · color and length tokens are checked against native style properties.
      </Text>
    </View>
  )
}

export function TokenStylesPanel({ isDark }: { readonly isDark: boolean }) {
  return (
    <TokenStyleThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <TokenStyleContent isDark={isDark} />
    </TokenStyleThemeProvider>
  )
}
