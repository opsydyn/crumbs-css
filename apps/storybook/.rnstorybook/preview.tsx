import { InspectorHost } from "../src/components/devtools/adapter"
import type { Preview } from "@storybook/react-native"
import { PortalHost } from "@rn-primitives/portal"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { AppThemeProvider, useAppTheme } from "../src/components/AppThemeProvider"
import { brandScopes, densityScopes, modeScopes } from "../src/styles/theme"

const canvasBackgroundOf = (themeMode: string): string =>
  themeMode === "light" ? "#f4ecdb" : "#0d0b09"

const axisValueOf = <TOptions extends Readonly<Record<string, unknown>>>(
  selected: unknown,
  options: TOptions,
  fallback: keyof TOptions,
): keyof TOptions => typeof selected === "string" && Object.hasOwn(options, selected)
  ? selected as keyof TOptions
  : fallback

const toolbarItemsOf = (options: Readonly<Record<string, unknown>>) =>
  Object.keys(options).map(value => ({
    title: value[0]!.toUpperCase() + value.slice(1),
    value,
  }))

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
      const themeMode = axisValueOf(context.globals.themeMode, modeScopes, "dark")
      const brand = axisValueOf(context.globals.brand, brandScopes, "foundry")
      const density = axisValueOf(context.globals.density, densityScopes, "comfortable")

      return (
      <InspectorHost><GestureHandlerRootView style={styles.root}>
        <AppThemeProvider
          initialBrand={brand}
          initialDensity={density}
          initialMode={themeMode}
          key={`${brand}:${themeMode}:${density}`}
        >
          <View style={[styles.canvas, { backgroundColor: canvasBackgroundOf(themeMode) }]}>
            <PreviewThemeToolbar />
            <View style={styles.storyFrame}>
              <Story />
            </View>
          </View>
          <PortalHost />
        </AppThemeProvider>
      </GestureHandlerRootView></InspectorHost>
      )
    },
  ],
  globalTypes: {
    brand: {
      defaultValue: "foundry",
      description: "Showcase brand",
      name: "Brand",
      toolbar: {
        dynamicTitle: true,
        items: toolbarItemsOf(brandScopes),
      },
    },
    density: {
      defaultValue: "comfortable",
      description: "Showcase density",
      name: "Density",
      toolbar: {
        dynamicTitle: true,
        items: toolbarItemsOf(densityScopes),
      },
    },
    themeMode: {
      defaultValue: "dark",
      description: "Showcase theme mode",
      name: "Theme",
      toolbar: {
        dynamicTitle: true,
        icon: "mirror",
        items: toolbarItemsOf(modeScopes),
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
