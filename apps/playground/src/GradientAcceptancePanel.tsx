import { useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { resolveRecipeStyle } from "@opsydyn/crumbs-css/theme"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import * as screen from "./screen.css"

const { copy, button, gradientScroll, gradientCard, gradientKeyword, gradientAngle, gradientRadialExtent, gradientRadialSize, gradientStops, gradientLayered, gradientEmpty } = screen

export function GradientAcceptancePanel() {
  const s = useThemedStyles({ copy, button, gradientScroll, gradientCard, gradientKeyword, gradientAngle, gradientRadialExtent, gradientRadialSize, gradientStops, gradientLayered, gradientEmpty })
  const [showLayers, setShowLayers] = useState(true)
  return <ScrollView style={s.gradientScroll} testID="crumbs-gradient-acceptance">
    <Text style={s.copy}>Native gradient acceptance matrix</Text>
    <Text style={s.copy}>Canonical view styles from the packed Crumbs artifact. Toggle the final card to verify complete-list replacement.</Text>
    <View style={[s.gradientCard, s.gradientKeyword]}><Text style={s.copy}>Linear keyword · to bottom right</Text></View>
    <View style={[s.gradientCard, s.gradientAngle]}><Text style={s.copy}>Linear angle · 180deg</Text></View>
    <View style={[s.gradientCard, s.gradientRadialExtent]}><Text style={s.copy}>Radial circle · farthest-corner</Text></View>
    <View style={[s.gradientCard, s.gradientRadialSize]}><Text style={s.copy}>Radial ellipse · explicit x/y size</Text></View>
    <View style={[s.gradientCard, s.gradientStops]}><Text style={s.copy}>Mixed positions · transition hint · transparent</Text></View>
    <Pressable accessibilityRole="button" testID="crumbs-gradient-toggle" onPress={() => setShowLayers(value => !value)} style={[...resolveRecipeStyle(s.button)]}>
      <Text style={s.copy}>{showLayers ? "Show empty-list replacement" : "Restore layered gradient"}</Text>
    </Pressable>
    <View style={[s.gradientCard, showLayers ? s.gradientLayered : s.gradientEmpty]}>
      <Text style={s.copy}>{showLayers ? "Multiple background layers" : "Empty background list replacement"}</Text>
    </View>
  </ScrollView>
}
