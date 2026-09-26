import { useState } from "react"
import { Text, View } from "react-native"
import { TokenThemeProvider } from "@opsydyn/crumbs-css/theme"
import { theme, vars } from "@acme/design-tokens"
import { ActionCard } from "@acme/ui"

export default function App() {
  const [actionCount, setActionCount] = useState(0)

  return (
    <TokenThemeProvider contract={vars} theme={theme}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <ActionCard
          label="Continue"
          onActionPress={() => setActionCount((count) => count + 1)}
        />
        <Text>Actions: {actionCount}</Text>
      </View>
    </TokenThemeProvider>
  )
}
