import { createComponentRecipeResolver } from "@opsydyn/crumbs-css/theme"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import type { NativeComponentPublicProps } from "@opsydyn/crumbs-css/style"
import { useMemo, type ReactNode } from "react"
import { Pressable, Text } from "react-native"
import * as s from "./ReferencePatterns.css"

type ActionSelection = NativeComponentPublicProps<typeof s.actionButton>
type ActionTone = NonNullable<ActionSelection["tone"]>

type ReferenceButtonProps = {
  readonly children: ReactNode
  readonly disabled?: boolean
  readonly mark?: string
  readonly onPress: () => void
  readonly tone?: ActionTone
}

const actionSelectionOf = (
  tone: ActionTone,
  disabled: boolean,
  pressed: boolean,
): ActionSelection => disabled
  ? { disabled: true, pressed: false, tone }
  : { disabled: false, pressed, tone }

export function ReferenceButton({
  children,
  disabled = false,
  mark = "↗",
  onPress,
  tone = "brand",
}: ReferenceButtonProps) {
  const styles = useThemedStyles(s)
  const resolve = useMemo(
    () => createComponentRecipeResolver(styles.actionButton),
    [styles.actionButton],
  )
  const nativeStyles = useMemo(() => {
    const resting = resolve(actionSelectionOf(tone, disabled, false))
    const pressed = resolve(actionSelectionOf(tone, disabled, true))
    const disabledStyles = resolve(actionSelectionOf(tone, true, false))

    return {
      disabledRoot: [...disabledStyles.root],
      leadingMark: [...resting.leadingMark],
      label: [...resting.label],
      pressedRoot: [...pressed.root],
      root: [...resting.root],
    }
  }, [disabled, resolve, tone])

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) =>
        disabled ? nativeStyles.disabledRoot : pressed ? nativeStyles.pressedRoot : nativeStyles.root
      }
    >
      <Text accessible={false} style={nativeStyles.leadingMark}>{mark}</Text>
      <Text style={nativeStyles.label}>{children}</Text>
    </Pressable>
  )
}
