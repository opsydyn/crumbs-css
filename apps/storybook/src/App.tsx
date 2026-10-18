import { InspectorHost } from "./components/devtools/adapter"
import { PortalHost } from "@rn-primitives/portal"
import { StyleSheet } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { AppThemeProvider } from "./components/AppThemeProvider"
import { ShowcaseScreen } from "./components/ShowcaseScreen"

export default function App() {
  return (
    <InspectorHost><GestureHandlerRootView style={styles.root}>
      <AppThemeProvider>
        <ShowcaseScreen />
        <PortalHost />
      </AppThemeProvider>
    </GestureHandlerRootView></InspectorHost>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
