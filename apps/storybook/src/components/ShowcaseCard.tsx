import { useMemo } from "react"
import { createComponentRecipeResolver } from "@opsydyn/crumbs-css/theme"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import type { NativeComponentPublicProps } from "@opsydyn/crumbs-css/style"
import { Pressable, Text, View } from "react-native"
import * as s from "./ShowcaseCard.css"

type ActionSelection = NativeComponentPublicProps<typeof s.action>
const idleActionSelection: ActionSelection = { pressed: false }
const pressedActionSelection: ActionSelection = { pressed: true }

type ShowcaseCardProps = {
  readonly actionLabel?: string
  readonly body?: string
  readonly eyebrow?: string
  readonly title?: string
}

export function ShowcaseCard({
  actionLabel = "Open stories",
  body = "A tiny Expo app showing how @opsydyn/crumbs-css themes, tokens, and native style authoring can feel bold without leaking browser CSS assumptions into React Native.",
  eyebrow = "Crumbs CSS showcase",
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
    return {
      root: [...idle.root],
      pressedRoot: [...pressed.root],
      label: [...idle.label],
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
      <Pressable style={({ pressed }) => pressed ? actionStyles.pressedRoot : actionStyles.root}>
        <Text style={actionStyles.label}>{actionLabel}</Text>
      </Pressable>
    </View>
  )
}
