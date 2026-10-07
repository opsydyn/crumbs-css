import { createTokenStyles, themeToken, useTokenStyles } from "@opsydyn/crumbs-css/theme/token"
import type { TextStyle, ViewStyle } from "react-native"
import { Text, View } from "react-native"
import { vars } from "../styles/theme"

const viewStyles = createTokenStyles<ViewStyle>()({
  card: {
    backgroundColor: themeToken(vars.color.panelRaised),
    borderColor: themeToken(vars.color.edge),
    borderRadius: themeToken(vars.radius.lg),
    borderWidth: 1,
    padding: themeToken(vars.space.md),
  },
})

const textStyles = createTokenStyles<TextStyle>()({
  title: {
    color: themeToken(vars.color.accent),
    fontSize: 16,
    fontWeight: "600",
  },
  body: {
    color: themeToken(vars.color.muted),
    fontSize: 14,
    marginTop: themeToken(vars.space.xs),
  },
})

/** Temporary app-level consumer check for M10.5's contract-derived theme/token candidate. */
export function TokenThemeContractDogfood() {
  const views = useTokenStyles(viewStyles)
  const text = useTokenStyles(textStyles)

  return (
    <View style={views.card}>
      <Text style={text.title}>Contract-derived token styles</Text>
      <Text style={text.body}>
        The Storybook theme provider resolves typed color and length references through Expo.
      </Text>
    </View>
  )
}
