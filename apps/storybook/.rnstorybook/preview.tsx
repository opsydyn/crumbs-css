import type { Preview } from "@storybook/react-native"
import { PortalHost } from "@rn-primitives/portal"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { AppThemeProvider, useAppTheme } from "../src/components/AppThemeProvider"

const canvasBackgroundOf = (themeMode: string): string =>
  themeMode === "light" ? "#f4ecdb" : "#0d0b09"

function PreviewThemeToolbar() {
  const { mode, setMode } = useAppTheme()

  return (
    <View style={styles.toolbar}>
      <Text style={styles.toolbarLabel}>Storybook theme</Text>
      <View style={styles.toolbarButtons}>
        <Pressable
          onPress={() => setMode("dark")}
          style={[styles.toolbarButton, mode === "dark" && styles.toolbarButtonActive]}
        >
          <Text style={[styles.toolbarButtonLabel, mode === "dark" && styles.toolbarButtonLabelActive]}>
            Dark
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("light")}
          style={[styles.toolbarButton, mode === "light" && styles.toolbarButtonActive]}
        >
          <Text
            style={[styles.toolbarButtonLabel, mode === "light" && styles.toolbarButtonLabelActive]}
          >
            Light
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const themeMode = context.globals.themeMode === "light" ? "light" : "dark"

      return (
      <GestureHandlerRootView style={styles.root}>
        <AppThemeProvider initialMode={themeMode} key={themeMode}>
          <View style={[styles.canvas, { backgroundColor: canvasBackgroundOf(themeMode) }]}>
            <PreviewThemeToolbar />
            <View style={styles.storyFrame}>
              <Story />
            </View>
          </View>
          <PortalHost />
        </AppThemeProvider>
      </GestureHandlerRootView>
      )
    },
  ],
  globalTypes: {
    themeMode: {
      defaultValue: "dark",
      description: "Showcase theme mode",
      name: "Theme",
      toolbar: {
        dynamicTitle: true,
        icon: "mirror",
        items: [
          {
            title: "Dark",
            value: "dark",
          },
          {
            title: "Light",
            value: "light",
          },
        ],
      },
    },
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: "stretch",
    flex: 1,
    gap: 16,
    padding: 24,
  },
  root: {
    flex: 1,
  },
  storyFrame: {
    alignItems: "stretch",
    flex: 1,
    justifyContent: "center",
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  toolbarButtons: {
    flexDirection: "row",
    gap: 8,
  },
  toolbarButton: {
    borderColor: "rgba(209, 168, 95, 0.35)",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toolbarButtonActive: {
    backgroundColor: "#d1a85f",
    borderColor: "#d1a85f",
  },
  toolbarButtonLabel: {
    color: "#f3ecdf",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  toolbarButtonLabelActive: {
    color: "#130f09",
  },
  toolbarLabel: {
    color: "#b9ac97",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
})

export default preview
