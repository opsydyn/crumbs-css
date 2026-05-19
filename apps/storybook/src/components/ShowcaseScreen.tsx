import { useThemedStyles } from "@opsydyn/crumbs-css/theme"
import { ScrollView, Text, View } from "react-native"
import { labelOfThemeMode } from "../styles/theme"
import { PrimitiveGallery } from "./PrimitiveGallery"
import { useAppTheme } from "./AppThemeProvider"
import { ShowcaseCard } from "./ShowcaseCard"
import * as s from "./ShowcaseScreen.css"
import { ThemeModePicker } from "./ThemeModePicker"

export function ShowcaseScreen() {
  const styles = useThemedStyles(s)
  const { mode } = useAppTheme()

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.stack}>
        <View style={styles.headingRow}>
          <Text style={styles.kicker}>Crumbs CSS app scaffold</Text>
          <Text style={styles.title}>A bold native showcase with {labelOfThemeMode(mode)} mode.</Text>
          <Text style={styles.body}>
            Use the menu below to switch themes, then sweep the live primitives gallery before
            drilling into focused Storybook entries.
          </Text>
        </View>
        <ThemeModePicker />
        <ShowcaseCard
          actionLabel="Live primitive gallery"
          body="This screen now groups the installed rn-primitives suite into one scan-friendly surface, with a live example for each package and matching focused stories in Storybook."
          title="A native primitives gallery that doubles as the Storybook index surface."
        />
        <PrimitiveGallery />
      </View>
    </ScrollView>
  )
}
