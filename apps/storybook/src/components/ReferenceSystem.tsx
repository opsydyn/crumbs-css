import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import { useState } from "react"
import { Text, View } from "react-native"
import { ReferenceButton } from "./ReferenceButton"
import { ReferenceSelections } from "./ReferenceSelections"
import { ReferenceTextField } from "./ReferenceTextField"
import * as s from "./ReferencePatterns.css"

export function ReferenceSystem() {
  const styles = useThemedStyles(s)
  const [fieldLocked, setFieldLocked] = useState(false)
  const [lastAction, setLastAction] = useState("Choose an action to see the controlled state update.")

  return (
    <View style={styles.root}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.eyebrow}>Typography</Text>
          <Text style={styles.display}>A clear type scale for product work.</Text>
          <Text style={styles.body}>
            Typography stays native: explicit text styles, readable line heights, and semantic
            token colors.
          </Text>
        </View>
        <Text style={styles.heading}>Section heading · 20 / 25</Text>
        <Text style={styles.body}>Body copy · 14 / 20. Use this level for helpful descriptions and form guidance.</Text>
        <Text style={styles.caption}>Caption · 12 / 17. Reserve the smallest level for supporting metadata.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.eyebrow}>Button</Text>
          <Text style={styles.heading}>Public variants, typed slots, explicit states</Text>
          <Text style={styles.body}>{lastAction}</Text>
        </View>
        <ReferenceButton onPress={() => setLastAction("Primary action selected.")}>Save changes</ReferenceButton>
        <ReferenceButton onPress={() => setLastAction("Secondary action selected.")} tone="neutral">
          Preview tokens
        </ReferenceButton>
        <ReferenceButton onPress={() => setLastAction("Quiet action selected.")} tone="quiet">
          Cancel
        </ReferenceButton>
        <ReferenceButton disabled onPress={() => setLastAction("This disabled action cannot run.")}>
          Publish unavailable
        </ReferenceButton>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.eyebrow}>Input</Text>
          <Text style={styles.heading}>Field state follows focus, validation, and availability</Text>
          <Text style={styles.body}>
            Try removing the @ sign, then use the switch below to compare the disabled state.
          </Text>
        </View>
        <ReferenceTextField disabled={fieldLocked} />
      </View>

      <ReferenceSelections fieldLocked={fieldLocked} onFieldLockedChange={setFieldLocked} />
    </View>
  )
}
