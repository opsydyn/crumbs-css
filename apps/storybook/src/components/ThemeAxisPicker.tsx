import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import { Pressable, Text, View } from "react-native"
import {
  type ShowcaseBrand,
  type ShowcaseDensity,
} from "../styles/theme"
import { useAppTheme } from "./AppThemeProvider"
import * as s from "./ThemeAxisPicker.css"

type AxisOption<TValue extends string> = {
  readonly label: string
  readonly value: TValue
}

type AxisGroupProps<TValue extends string> = {
  readonly label: string
  readonly onSelect: (value: TValue) => void
  readonly options: ReadonlyArray<AxisOption<TValue>>
  readonly selected: TValue
}

const brandOptions = [
  { label: "Foundry", value: "foundry" },
  { label: "Signal", value: "signal" },
] as const satisfies ReadonlyArray<AxisOption<ShowcaseBrand>>

const densityOptions = [
  { label: "Comfortable", value: "comfortable" },
  { label: "Compact", value: "compact" },
] as const satisfies ReadonlyArray<AxisOption<ShowcaseDensity>>

function AxisGroup<TValue extends string>({
  label,
  onSelect,
  options,
  selected,
}: AxisGroupProps<TValue>) {
  const styles = useThemedStyles(s)

  return (
    <View accessibilityLabel={label} style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = option.value === selected

          return (
            <Pressable
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <Text style={isSelected ? styles.optionLabelSelected : styles.optionLabel}>
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export function ThemeAxisPicker() {
  const styles = useThemedStyles(s)
  const { brand, density, setBrand, setDensity } = useAppTheme()

  return (
    <View style={styles.root}>
      <AxisGroup label="Brand" onSelect={setBrand} options={brandOptions} selected={brand} />
      <AxisGroup
        label="Density"
        onSelect={setDensity}
        options={densityOptions}
        selected={density}
      />
    </View>
  )
}
