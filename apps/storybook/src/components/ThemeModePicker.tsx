import { useThemedStyles } from "@opsydyn/crumbs-css/theme"
import * as Menubar from "@rn-primitives/menubar"
import { useState } from "react"
import { Text, View } from "react-native"
import { labelOfThemeMode, type ShowcaseThemeMode } from "../styles/theme"
import { useAppTheme } from "./AppThemeProvider"
import * as s from "./ThemeModePicker.css"

const themeModes = ["dark", "light"] as const satisfies ReadonlyArray<ShowcaseThemeMode>

const descriptionOfThemeMode = (mode: ShowcaseThemeMode): string =>
  mode === "dark"
    ? "Bold brass on black, with raised panels and low-glare contrast."
    : "Warm parchment surfaces, sharper edge contrast, and brighter copy."

const menuTriggerStyleOf = ({
  open,
  pressed,
  styles,
}: {
  readonly open: boolean
  readonly pressed: boolean
  readonly styles: ReturnType<typeof useThemedStyles<typeof s>>
}) => [styles.trigger, open && styles.triggerOpen, pressed && styles.triggerPressed]

const menuItemStyleOf = ({
  active,
  pressed,
  styles,
}: {
  readonly active: boolean
  readonly pressed: boolean
  readonly styles: ReturnType<typeof useThemedStyles<typeof s>>
}) => [styles.menuItem, active && styles.menuItemActive, pressed && styles.menuItemPressed]

function ThemeModeOption({
  currentMode,
  itemMode,
}: {
  readonly currentMode: ShowcaseThemeMode
  readonly itemMode: ShowcaseThemeMode
}) {
  const styles = useThemedStyles(s)
  const active = currentMode === itemMode

  return (
    <Menubar.RadioItem
      closeOnPress
      style={({ pressed }) => menuItemStyleOf({ active, pressed, styles })}
      textValue={labelOfThemeMode(itemMode)}
      value={itemMode}
    >
      <View style={styles.menuItemRow}>
        <View style={styles.menuItemCopy}>
          <Text style={active ? styles.menuItemTitleActive : styles.menuItemTitle}>
            {labelOfThemeMode(itemMode)}
          </Text>
          <Text style={active ? styles.menuItemBodyActive : styles.menuItemBody}>
            {descriptionOfThemeMode(itemMode)}
          </Text>
        </View>
        <Menubar.ItemIndicator style={styles.menuIndicator}>
          <Text style={styles.menuIndicatorText}>Active</Text>
        </Menubar.ItemIndicator>
      </View>
    </Menubar.RadioItem>
  )
}

export function ThemeModePicker() {
  const styles = useThemedStyles(s)
  const { mode, setMode } = useAppTheme()
  const [menuValue, setMenuValue] = useState<string | undefined>()
  const open = menuValue === "theme-mode"

  return (
    <Menubar.Root value={menuValue} onValueChange={setMenuValue}>
      <Menubar.Menu value="theme-mode">
        <Menubar.Trigger style={({ pressed }) => menuTriggerStyleOf({ open, pressed, styles })}>
          <View style={styles.triggerCopy}>
            <Text style={styles.triggerLabel}>Theme mode</Text>
            <Text style={styles.triggerValue}>{labelOfThemeMode(mode)}</Text>
          </View>
          <Text style={styles.triggerHint}>Switch</Text>
        </Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Overlay closeOnPress style={styles.menuOverlay} />
          <Menubar.Content align="start" side="bottom" sideOffset={10} style={styles.menuContent}>
            <Menubar.Label style={styles.menuLabel}>Showcase appearance</Menubar.Label>
            <Menubar.RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as ShowcaseThemeMode)}
            >
              {themeModes.map((itemMode) => (
                <ThemeModeOption currentMode={mode} itemMode={itemMode} key={itemMode} />
              ))}
            </Menubar.RadioGroup>
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>
    </Menubar.Root>
  )
}
