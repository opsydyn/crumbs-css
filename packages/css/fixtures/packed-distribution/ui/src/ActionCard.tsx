import { useMemo } from "react"
import { createComponentRecipeResolver } from "@opsydyn/crumbs-css/theme"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import type { NativeComponentPublicProps } from "@opsydyn/crumbs-css/style"
import { Pressable, Text, View } from "react-native"
import * as s from "./ActionCard.css"

type ActionSelection = NativeComponentPublicProps<typeof s.action>
const idleSelection: ActionSelection = { disabled: false, pressed: false }
const pressedSelection: ActionSelection = { disabled: false, pressed: true }
const disabledSelection: ActionSelection = { disabled: true, pressed: false }

export type ActionCardProps = Readonly<{
  label?: string
  disabled?: boolean
  onActionPress: () => void
}>

export function ActionCard({
  label = "Continue",
  disabled = false,
  onActionPress,
}: ActionCardProps) {
  const styles = useThemedStyles(s)
  const resolveAction = useMemo(
    () => createComponentRecipeResolver(styles.action),
    [styles.action],
  )
  const actionStyles = useMemo(() => {
    const mutableSlots = (selection: ActionSelection) => {
      const resolved = resolveAction(selection)
      return {
        root: [...resolved.root],
        label: [...resolved.label],
      }
    }
    return {
      idle: mutableSlots(idleSelection),
      pressed: mutableSlots(pressedSelection),
      disabled: mutableSlots(disabledSelection),
    }
  }, [resolveAction])

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onActionPress}
        style={({ pressed }) => {
          if (disabled) return actionStyles.disabled.root
          return pressed ? actionStyles.pressed.root : actionStyles.idle.root
        }}
      >
        <Text style={disabled ? actionStyles.disabled.label : actionStyles.idle.label}>
          {label}
        </Text>
      </Pressable>
    </View>
  )
}
