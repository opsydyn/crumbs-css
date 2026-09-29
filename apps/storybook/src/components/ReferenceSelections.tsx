import { createComponentRecipeResolver } from "@opsydyn/crumbs-css/theme"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import type { NativeComponentPublicProps } from "@opsydyn/crumbs-css/style"
import * as Checkbox from "@rn-primitives/checkbox"
import * as RadioGroup from "@rn-primitives/radio-group"
import * as Switch from "@rn-primitives/switch"
import { useMemo, useState } from "react"
import { Text, View } from "react-native"
import * as s from "./ReferencePatterns.css"

type Selection = NativeComponentPublicProps<typeof s.selectionControl>
type SelectionKind = NonNullable<Selection["kind"]>

const selectionOf = (
  kind: SelectionKind,
  selected: boolean,
  disabled = false,
): Selection => ({ disabled, kind, selected })

const cadenceOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
] as const

export function ReferenceSelections({
  fieldLocked,
  onFieldLockedChange,
}: {
  readonly fieldLocked: boolean
  readonly onFieldLockedChange: (locked: boolean) => void
}) {
  const styles = useThemedStyles(s)
  const resolve = useMemo(
    () => createComponentRecipeResolver(styles.selectionControl),
    [styles.selectionControl],
  )
  const [updatesEnabled, setUpdatesEnabled] = useState(true)
  const [cadence, setCadence] = useState("weekly")
  const checkboxStyles = useMemo(() => {
    const resolved = resolve(selectionOf("checkbox", updatesEnabled))
    return {
      indicator: [...resolved.indicator],
      label: [...resolved.label],
      root: [...resolved.root],
    }
  }, [resolve, updatesEnabled])
  const radioOptions = useMemo(
    () => cadenceOptions.map((option) => {
      const selected = cadence === option.value
      const resolved = resolve(selectionOf("radio", selected))

      return {
        option,
        selected,
        styles: {
          indicator: [...resolved.indicator],
          label: [...resolved.label],
          root: [...resolved.root],
        },
      }
    }),
    [cadence, resolve],
  )
  const lockStyles = useMemo(() => {
    const resolved = resolve(selectionOf("switch", fieldLocked))
    return {
      label: [...resolved.label],
      root: [...resolved.root],
      thumb: [...resolved.thumb],
      track: [...resolved.track],
    }
  }, [fieldLocked, resolve])

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.eyebrow}>Selection controls</Text>
        <Text style={styles.heading}>Accessible choices with typed state</Text>
        <Text style={styles.body}>
          Checkbox, radio group, and switch controls share token-backed slots while keeping each
          interaction controlled by React state.
        </Text>
      </View>

      <Checkbox.Root
        accessibilityLabel="Send design-system release notes"
        checked={updatesEnabled}
        onCheckedChange={(value) => setUpdatesEnabled(value === true)}
        style={[...checkboxStyles.root]}
      >
        <Checkbox.Indicator style={[...checkboxStyles.indicator]}>
          <Text accessible={false} style={styles.selectionGlyph}>{updatesEnabled ? "✓" : ""}</Text>
        </Checkbox.Indicator>
        <Text style={[...checkboxStyles.label]}>
          Send design-system release notes
        </Text>
      </Checkbox.Root>

      <RadioGroup.Root onValueChange={setCadence} value={cadence}>
        <View style={styles.selectionStack}>
          <Text style={styles.caption}>Update cadence</Text>
          {radioOptions.map(({ option, selected, styles: optionStyles }) => {
            return (
              <RadioGroup.Item
                key={option.value}
                accessibilityLabel={`Update cadence: ${option.label}`}
                style={optionStyles.root}
                value={option.value}
              >
                <RadioGroup.Indicator style={optionStyles.indicator}>
                  <Text accessible={false} style={styles.selectionGlyph}>{selected ? "•" : ""}</Text>
                </RadioGroup.Indicator>
                <Text style={optionStyles.label}>{option.label}</Text>
              </RadioGroup.Item>
            )
          })}
        </View>
      </RadioGroup.Root>

      <View style={lockStyles.root}>
        <Switch.Root
          accessibilityLabel="Lock work email field"
          checked={fieldLocked}
          onCheckedChange={onFieldLockedChange}
          style={lockStyles.track}
        >
          <Switch.Thumb style={lockStyles.thumb} />
        </Switch.Root>
        <Text style={lockStyles.label}>
          Lock the work email field
        </Text>
      </View>
    </View>
  )
}
