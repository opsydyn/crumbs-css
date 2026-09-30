import { useState } from "react"
import { Portal, PortalHost } from "@rn-primitives/portal"
import { Text, View } from "react-native"
import { TokenThemeProvider, TokenThemeScopeProvider } from "@opsydyn/crumbs-css/theme"
import { brandScopes, theme, vars } from "@acme/design-tokens"
import { ActionCard } from "@acme/ui"

export default function App() {
  const [actionCount, setActionCount] = useState(0)
  const incrementActionCount = () => setActionCount(count => count + 1)

  return (
    <TokenThemeProvider contract={vars} theme={theme}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <ActionCard label="Foundation action" onActionPress={incrementActionCount} />
        <TokenThemeScopeProvider contract={vars} context="brand" values={brandScopes.signal}>
          <ActionCard label="Signal action" onActionPress={incrementActionCount} />
        </TokenThemeScopeProvider>
        <Portal name="north-star-signal-action">
          <TokenThemeScopeProvider contract={vars} context="brand" values={brandScopes.signal}>
            <ActionCard label="Portal signal action" disabled onActionPress={incrementActionCount} />
          </TokenThemeScopeProvider>
        </Portal>
        <PortalHost />
        <Text>Actions: {actionCount}</Text>
      </View>
    </TokenThemeProvider>
  )
}
