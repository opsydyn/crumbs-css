import { TokenThemeScopeProvider } from "@opsydyn/crumbs-css/theme"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import * as Dialog from "@rn-primitives/dialog"
import { useState } from "react"
import { Text, View } from "react-native"
import { ReferenceButton } from "./ReferenceButton"
import { ReferenceDialog } from "./ReferenceDialog"
import { ReferenceSelections } from "./ReferenceSelections"
import { ReferenceTextField } from "./ReferenceTextField"
import { NativeAccessibilityContexts } from "./NativeAccessibilityContexts"
import { ShowcaseCard } from "./ShowcaseCard"
import { brandScopes, modeScopeFor, vars } from "../styles/theme"
import { useAppTheme, useNativeConditions } from "./AppThemeProvider"
import * as s from "./ReferencePatterns.css"

function PartnerBrandExample() {
  const { mode } = useAppTheme()
  const { snapshot } = useNativeConditions()
  return (
    <TokenThemeScopeProvider contract={vars} context="brand" values={brandScopes.signal}>
      <TokenThemeScopeProvider
        contract={vars}
        context="mode"
        values={modeScopeFor("signal", mode, snapshot.contrast)}
      >
        <PartnerBrandExampleContent />
      </TokenThemeScopeProvider>
    </TokenThemeScopeProvider>
  )
}

function PartnerBrandExampleContent() {
  const styles = useThemedStyles(s)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [status, setStatus] = useState("The Signal brand is scoped to this card subtree.")

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.eyebrow}>Card + dialog</Text>
        <Text style={styles.heading}>A second brand reuses the same components</Text>
        <Text style={styles.body}>
          The card and its action keep their component recipes. Only the brand token scope changes.
        </Text>
      </View>
      <Dialog.Root onOpenChange={setDialogOpen} open={dialogOpen}>
        <ShowcaseCard
          actionLabel="Review partner contract"
          body="This partner card resolves the shared card and action styles under a nested brand scope."
          eyebrow="Signal partner scope"
          onActionPress={() => setDialogOpen(true)}
          title="One component system, two brands."
        />
        <Text style={styles.caption}>{status}</Text>
        <ReferenceDialog
          onCancel={() => setStatus("Review dismissed. The brand contract is unchanged.")}
          onConfirm={() => setStatus("Review recorded for the Signal brand contract.")}
        />
      </Dialog.Root>
    </View>
  )
}

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
      <NativeAccessibilityContexts />
      <PartnerBrandExample />
    </View>
  )
}
