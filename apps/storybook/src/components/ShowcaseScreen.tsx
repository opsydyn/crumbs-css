import { useRef, type ElementRef } from "react"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import { ScrollView, Text, View } from "react-native"
import { labelOfThemeMode } from "../styles/theme"
import { PrimitiveGallery } from "./PrimitiveGallery"
import { useAppTheme } from "./AppThemeProvider"
import { ShowcaseCard } from "./ShowcaseCard"
import { TokenThemeContractDogfood } from "./TokenThemeContractDogfood"
import { ReferenceSystem } from "./ReferenceSystem"
import * as s from "./ShowcaseScreen.css"
import { ThemeAxisPicker } from "./ThemeAxisPicker"
import { ThemeModePicker } from "./ThemeModePicker"

export function ShowcaseScreen() {
  const scrollView = useRef<ElementRef<typeof ScrollView>>(null)
  const styles = useThemedStyles(s)
  const { mode } = useAppTheme()

  return (
    <ScrollView ref={scrollView} contentContainerStyle={styles.content} style={styles.screen}>
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
        <ThemeAxisPicker />
        <ShowcaseCard
          actionLabel="Live primitive gallery"
          body="This screen now groups the installed rn-primitives suite into one scan-friendly surface, with a live example for each package and matching focused stories in Storybook."
          onActionPress={() => scrollView.current?.scrollToEnd({ animated: true })}
          title="A native primitives gallery that doubles as the Storybook index surface."
        />
        <TokenThemeContractDogfood />
        <ReferenceSystem />
        <PrimitiveGallery />
      </View>
    </ScrollView>
  )
}
