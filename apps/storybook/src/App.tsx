import { PortalHost } from "@rn-primitives/portal"
import { StyleSheet } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { AppThemeProvider } from "./components/AppThemeProvider"
import { ShowcaseScreen } from "./components/ShowcaseScreen"

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AppThemeProvider>
        <ShowcaseScreen />
        <PortalHost />
      </AppThemeProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
