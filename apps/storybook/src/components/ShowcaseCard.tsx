import { useMemo } from "react"
import { createComponentRecipeResolver } from "@opsydyn/crumbs-css/theme"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import type { NativeComponentPublicProps } from "@opsydyn/crumbs-css/style"
import { Pressable, Text, View } from "react-native"
import * as s from "./ShowcaseCard.css"

type ActionSelection = NativeComponentPublicProps<typeof s.action>
const idleActionSelection: ActionSelection = { disabled: false, pressed: false }
const pressedActionSelection: ActionSelection = { disabled: false, pressed: true }
const disabledActionSelection: ActionSelection = { disabled: true, pressed: false }

type ShowcaseCardProps = {
  readonly actionLabel?: string
  readonly body?: string
  readonly disabled?: boolean
  readonly eyebrow?: string
  readonly onActionPress: () => void
  readonly title?: string
}

export function ShowcaseCard({
  actionLabel = "Open stories",
  body = "A tiny Expo app showing how @opsydyn/crumbs-css themes, tokens, and native style authoring can feel bold without leaking browser CSS assumptions into React Native.",
  disabled = false,
  eyebrow = "Crumbs CSS showcase",
  onActionPress,
  title = "Dark and light themes with one native styling pipeline.",
}: ShowcaseCardProps) {
  const styles = useThemedStyles(s)
  const resolveAction = useMemo(
    () => createComponentRecipeResolver(styles.action),
    [styles.action],
  )
  const actionStyles = useMemo(() => {
    const idle = resolveAction(idleActionSelection)
    const pressed = resolveAction(pressedActionSelection)
    const disabled = resolveAction(disabledActionSelection)
    return {
      root: [...idle.root],
      pressedRoot: [...pressed.root],
      disabledRoot: [...disabled.root],
      label: [...idle.label],
      disabledLabel: [...disabled.label],
    }
  }, [resolveAction])

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeLabel}>Expo + Storybook</Text>
      </View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text style={styles.metaPillLabel}>@opsydyn/crumbs-css</Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaPillLabel}>rn-primitives</Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaPillLabel}>Metro web + native</Text>
        </View>
      </View>
      <Pressable
        accessible
        accessibilityLabel={actionLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onActionPress}
        style={({ pressed }) => {
          if (disabled) return actionStyles.disabledRoot
          return pressed ? actionStyles.pressedRoot : actionStyles.root
        }}
      >
        <Text style={disabled ? actionStyles.disabledLabel : actionStyles.label}>{actionLabel}</Text>
      </Pressable>
    </View>
  )
}
