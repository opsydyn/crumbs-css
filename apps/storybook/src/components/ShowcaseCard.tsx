import { useThemedStyles } from "@crumbs/css/theme"
import { Pressable, Text, View } from "react-native"
import * as s from "./ShowcaseCard.css"

type ShowcaseCardProps = {
  readonly actionLabel?: string
  readonly body?: string
  readonly eyebrow?: string
  readonly title?: string
}

export function ShowcaseCard({
  actionLabel = "Open stories",
  body = "A tiny Expo app showing how @crumbs/css themes, tokens, and native style authoring can feel bold without leaking browser CSS assumptions into React Native.",
  eyebrow = "Crumbs CSS showcase",
  title = "Dark and light themes with one native styling pipeline.",
}: ShowcaseCardProps) {
  const styles = useThemedStyles(s)

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
          <Text style={styles.metaPillLabel}>@crumbs/css</Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaPillLabel}>rn-primitives</Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaPillLabel}>Metro web + native</Text>
        </View>
      </View>
      <Pressable style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
        <Text style={styles.actionLabel}>{actionLabel}</Text>
      </Pressable>
    </View>
  )
}
