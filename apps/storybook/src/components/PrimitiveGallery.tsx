import { useThemedStyles } from "@crumbs/css/theme"
import * as Accordion from "@rn-primitives/accordion"
import * as AlertDialog from "@rn-primitives/alert-dialog"
import * as AspectRatio from "@rn-primitives/aspect-ratio"
import * as Avatar from "@rn-primitives/avatar"
import * as Checkbox from "@rn-primitives/checkbox"
import * as Collapsible from "@rn-primitives/collapsible"
import * as ContextMenu from "@rn-primitives/context-menu"
import * as Dialog from "@rn-primitives/dialog"
import * as DropdownMenu from "@rn-primitives/dropdown-menu"
import * as HoverCard from "@rn-primitives/hover-card"
import * as Label from "@rn-primitives/label"
import * as Menubar from "@rn-primitives/menubar"
import * as NavigationMenu from "@rn-primitives/navigation-menu"
import * as Popover from "@rn-primitives/popover"
import * as Progress from "@rn-primitives/progress"
import * as RadioGroup from "@rn-primitives/radio-group"
import * as Select from "@rn-primitives/select"
import * as Separator from "@rn-primitives/separator"
import * as Slider from "@rn-primitives/slider"
import * as Switch from "@rn-primitives/switch"
import * as Table from "@rn-primitives/table"
import * as Tabs from "@rn-primitives/tabs"
import * as Toast from "@rn-primitives/toast"
import * as Toggle from "@rn-primitives/toggle"
import * as ToggleGroup from "@rn-primitives/toggle-group"
import * as Toolbar from "@rn-primitives/toolbar"
import * as Tooltip from "@rn-primitives/tooltip"
import { useState, type ReactElement } from "react"
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native"
import * as s from "./PrimitiveGallery.css"

type GalleryStyles = ReturnType<typeof useThemedStyles<typeof s>>
type PrimitiveDemoProps = {
  readonly styles: GalleryStyles
}
type PrimitiveDemoComponent = (props: PrimitiveDemoProps) => ReactElement
type PrimitiveCategory =
  | "Disclosure"
  | "Feedback"
  | "Identity & Layout"
  | "Inputs & State"
  | "Menus & Navigation"

export type PrimitiveGalleryFocus =
  | "accordion"
  | "alert-dialog"
  | "aspect-ratio"
  | "avatar"
  | "checkbox"
  | "collapsible"
  | "context-menu"
  | "dialog"
  | "dropdown-menu"
  | "hover-card"
  | "label"
  | "menubar"
  | "navigation-menu"
  | "popover"
  | "progress"
  | "radio-group"
  | "select"
  | "separator"
  | "slider"
  | "switch"
  | "table"
  | "tabs"
  | "toast"
  | "toggle"
  | "toggle-group"
  | "toolbar"
  | "tooltip"

type PrimitiveDefinition = {
  readonly category: PrimitiveCategory
  readonly id: PrimitiveGalleryFocus
  readonly packageName: string
  readonly summary: string
  readonly title: string
  readonly hint?: string
  readonly Demo: PrimitiveDemoComponent
}

const categoryOrder = [
  "Disclosure",
  "Menus & Navigation",
  "Inputs & State",
  "Identity & Layout",
  "Feedback",
] as const satisfies ReadonlyArray<PrimitiveCategory>

const firstValueOf = (value: string | ReadonlyArray<string> | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0]
  }

  return typeof value === "string" ? value : undefined
}

const arrayValueOf = (value: string | ReadonlyArray<string> | undefined): Array<string> => {
  if (Array.isArray(value)) {
    return Array.from(value)
  }

  return typeof value === "string" ? [value] : []
}

const isChecked = (value: boolean | "indeterminate"): boolean => value === true

const flattenViewStyles = (
  ...styleValues: Array<StyleProp<ViewStyle> | false | undefined>
): StyleProp<ViewStyle> => StyleSheet.flatten(styleValues)

const buttonStyleOf = ({
  active = false,
  pressed,
  styles,
}: {
  readonly active?: boolean
  readonly pressed: boolean
  readonly styles: GalleryStyles
}) => flattenViewStyles(styles.buttonSecondary, active && styles.buttonActive, pressed && styles.buttonPressed)

const solidButtonStyleOf = ({
  pressed,
  styles,
}: {
  readonly pressed: boolean
  readonly styles: GalleryStyles
}) => flattenViewStyles(styles.button, pressed && styles.buttonPressed)

const ghostButtonStyleOf = ({
  active = false,
  pressed,
  styles,
}: {
  readonly active?: boolean
  readonly pressed: boolean
  readonly styles: GalleryStyles
}) => flattenViewStyles(styles.buttonGhost, active && styles.buttonActive, pressed && styles.buttonPressed)

const buttonTextStyleOf = ({
  active = false,
  inverted = false,
  styles,
}: {
  readonly active?: boolean
  readonly inverted?: boolean
  readonly styles: GalleryStyles
}) =>
  inverted ? styles.buttonTextInverted : active ? styles.buttonTextActive : styles.buttonText

function PrimitiveCard({
  definition,
  styles,
}: {
  readonly definition: PrimitiveDefinition
  readonly styles: GalleryStyles
}) {
  const Demo = definition.Demo

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.packagePill}>
          <Text style={styles.packagePillLabel}>{definition.packageName}</Text>
        </View>
        <Text style={styles.cardTitle}>{definition.title}</Text>
        <Text style={styles.cardBody}>{definition.summary}</Text>
      </View>
      <View style={styles.preview}>
        <Demo styles={styles} />
      </View>
      {definition.hint === undefined ? null : <Text style={styles.cardHint}>{definition.hint}</Text>}
    </View>
  )
}

function AccordionDemo({ styles }: PrimitiveDemoProps) {
  const [value, setValue] = useState<string | undefined>("squad")

  return (
    <Accordion.Root
      collapsible
      onValueChange={(nextValue) => setValue(firstValueOf(nextValue))}
      type="single"
      value={value}
    >
      <Accordion.Item style={styles.inset} value="squad">
        <Accordion.Header>
          <Accordion.Trigger style={({ pressed }) => buttonStyleOf({ active: value === "squad", pressed, styles })}>
            <Text style={buttonTextStyleOf({ active: value === "squad", styles })}>Infantry squad loadout</Text>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content style={styles.collapsibleContent}>
          <Text style={styles.titleText}>Open when you need the detail.</Text>
          <Text style={styles.bodyText}>
            Sergeant with power weapon, one vox, two special weapons, and a heavy stubber.
          </Text>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  )
}

function AlertDialogDemo({ styles }: PrimitiveDemoProps) {
  const [status, setStatus] = useState("No destructive action taken.")

  return (
    <View style={styles.stackSm}>
      <Text style={styles.smallCopy}>{status}</Text>
      <AlertDialog.Root>
        <AlertDialog.Trigger style={({ pressed }) => solidButtonStyleOf({ pressed, styles })}>
          <Text style={buttonTextStyleOf({ inverted: true, styles })}>Remove from roster</Text>
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay style={styles.overlay} />
          <AlertDialog.Content style={styles.dialogContent}>
            <AlertDialog.Title style={styles.cardTitle}>Remove this unit?</AlertDialog.Title>
            <AlertDialog.Description style={styles.cardBody}>
              This simulates a high-cost destructive action that asks for confirmation before it mutates the roster.
            </AlertDialog.Description>
            <View style={styles.actionRow}>
              <AlertDialog.Cancel style={({ pressed }) => ghostButtonStyleOf({ pressed, styles })}>
                <Text style={buttonTextStyleOf({ styles })}>Cancel</Text>
              </AlertDialog.Cancel>
              <AlertDialog.Action
                onPress={() => setStatus("Unit removed from the draft preview.")}
                style={({ pressed }) => solidButtonStyleOf({ pressed, styles })}
              >
                <Text style={buttonTextStyleOf({ inverted: true, styles })}>Confirm remove</Text>
              </AlertDialog.Action>
            </View>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </View>
  )
}

function AspectRatioDemo({ styles }: PrimitiveDemoProps) {
  return (
    <AspectRatio.Root ratio={16 / 9} style={styles.aspectFrame}>
      <View style={styles.aspectFill}>
        <Text style={styles.titleTextStrong}>16:9 media slot</Text>
        <Text style={styles.bodyText}>Useful for card art, screenshots, or detachment banners.</Text>
      </View>
    </AspectRatio.Root>
  )
}

function AvatarDemo({ styles }: PrimitiveDemoProps) {
  return (
    <View style={styles.rowWrap}>
      <Avatar.Root alt="Astra commander" style={styles.avatarRoot}>
        <Avatar.Fallback style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>AC</Text>
        </Avatar.Fallback>
      </Avatar.Root>
      <View style={styles.stackSm}>
        <Text style={styles.titleText}>Fallback avatar</Text>
        <Text style={styles.bodyText}>Shows identity even when image data is missing.</Text>
      </View>
    </View>
  )
}

function CheckboxDemo({ styles }: PrimitiveDemoProps) {
  const [checked, setChecked] = useState(true)

  return (
    <View style={styles.rowWrap}>
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(nextValue) => setChecked(isChecked(nextValue))}
        style={flattenViewStyles(styles.checkboxRoot, checked && styles.checkboxRootChecked)}
      >
        <Checkbox.Indicator style={styles.checkboxIndicator}>
          <Text style={styles.checkboxIndicatorText}>On</Text>
        </Checkbox.Indicator>
      </Checkbox.Root>
      <View style={styles.stackSm}>
        <Text style={styles.titleText}>Include optional wargear</Text>
        <Text style={styles.bodyText}>{checked ? "Optional gear is enabled." : "Optional gear is disabled."}</Text>
      </View>
    </View>
  )
}

function CollapsibleDemo({ styles }: PrimitiveDemoProps) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible.Root onOpenChange={setOpen} open={open}>
      <View style={styles.stackSm}>
        <Collapsible.Trigger style={({ pressed }) => buttonStyleOf({ active: open, pressed, styles })}>
          <Text style={buttonTextStyleOf({ active: open, styles })}>{open ? "Hide legality notes" : "Show legality notes"}</Text>
        </Collapsible.Trigger>
        <Collapsible.Content style={styles.collapsibleContent}>
          <Text style={styles.bodyText}>Keep the user in the current flow while revealing the detail only when it matters.</Text>
        </Collapsible.Content>
      </View>
    </Collapsible.Root>
  )
}

function ContextMenuDemo({ styles }: PrimitiveDemoProps) {
  const [pinned, setPinned] = useState(false)

  return (
    <View style={styles.stackSm}>
      <ContextMenu.Root>
        <ContextMenu.Trigger style={({ pressed }) => buttonStyleOf({ pressed, styles })}>
          <Text style={buttonTextStyleOf({ styles })}>Long press squad card</Text>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Overlay closeOnPress style={styles.overlay} />
          <ContextMenu.Content align="start" sideOffset={8} style={styles.menuContent}>
            <ContextMenu.Label style={styles.menuLabel}>Quick actions</ContextMenu.Label>
            <ContextMenu.Item style={styles.menuItem} textValue="Duplicate">
              <Text style={styles.buttonText}>Duplicate loadout</Text>
            </ContextMenu.Item>
            <ContextMenu.CheckboxItem
              checked={pinned}
              closeOnPress
              onCheckedChange={(nextValue) => setPinned(isChecked(nextValue))}
              style={({ pressed }) => buttonStyleOf({ active: pinned, pressed, styles })}
              textValue="Pin"
            >
              <View style={styles.menuItemRow}>
                <Text style={buttonTextStyleOf({ active: pinned, styles })}>Pin for quick add</Text>
                <ContextMenu.ItemIndicator style={styles.menuIndicator}>
                  <Text style={styles.menuIndicatorText}>Pinned</Text>
                </ContextMenu.ItemIndicator>
              </View>
            </ContextMenu.CheckboxItem>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      <Text style={styles.smallCopy}>{pinned ? "Pinned to favourites." : "Not pinned yet."}</Text>
    </View>
  )
}

function DialogDemo({ styles }: PrimitiveDemoProps) {
  const [status, setStatus] = useState("Draft unchanged.")

  return (
    <View style={styles.stackSm}>
      <Text style={styles.smallCopy}>{status}</Text>
      <Dialog.Root>
        <Dialog.Trigger style={({ pressed }) => buttonStyleOf({ pressed, styles })}>
          <Text style={buttonTextStyleOf({ styles })}>Open roster details</Text>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay closeOnPress style={styles.overlay} />
          <Dialog.Content style={styles.dialogContent}>
            <Dialog.Title style={styles.cardTitle}>Share preview</Dialog.Title>
            <Dialog.Description style={styles.cardBody}>
              Dialogs work well for richer content that still needs a clear exit path.
            </Dialog.Description>
            <View style={styles.inset}>
              <Text style={styles.titleText}>2,000 points</Text>
              <Text style={styles.bodyText}>Gladius Task Force with three pinned favourites and one warning.</Text>
            </View>
            <View style={styles.actionRow}>
              <Dialog.Close
                onPress={() => setStatus("Dialog dismissed without changing the draft.")}
                style={({ pressed }) => ghostButtonStyleOf({ pressed, styles })}
              >
                <Text style={buttonTextStyleOf({ styles })}>Close</Text>
              </Dialog.Close>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </View>
  )
}

function DropdownMenuDemo({ styles }: PrimitiveDemoProps) {
  const [includeNotes, setIncludeNotes] = useState(true)
  const [density, setDensity] = useState("comfortable")

  return (
    <View style={styles.stackSm}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger style={({ pressed }) => buttonStyleOf({ pressed, styles })}>
          <Text style={buttonTextStyleOf({ styles })}>Open export options</Text>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Overlay closeOnPress style={styles.overlay} />
          <DropdownMenu.Content align="start" sideOffset={8} style={styles.menuContent}>
            <DropdownMenu.Label style={styles.menuLabel}>Export preset</DropdownMenu.Label>
            <DropdownMenu.CheckboxItem
              checked={includeNotes}
              closeOnPress
              onCheckedChange={(nextValue) => setIncludeNotes(isChecked(nextValue))}
              style={({ pressed }) => buttonStyleOf({ active: includeNotes, pressed, styles })}
              textValue="Include notes"
            >
              <View style={styles.menuItemRow}>
                <Text style={buttonTextStyleOf({ active: includeNotes, styles })}>Include validation notes</Text>
                <DropdownMenu.ItemIndicator style={styles.menuIndicator}>
                  <Text style={styles.menuIndicatorText}>On</Text>
                </DropdownMenu.ItemIndicator>
              </View>
            </DropdownMenu.CheckboxItem>
            <DropdownMenu.Separator decorative style={styles.separator} />
            <DropdownMenu.RadioGroup onValueChange={setDensity} value={density}>
              {["compact", "comfortable"].map((itemValue) => {
                const active = density === itemValue

                return (
                  <DropdownMenu.RadioItem
                    closeOnPress
                    key={itemValue}
                    style={({ pressed }) => buttonStyleOf({ active, pressed, styles })}
                    textValue={itemValue}
                    value={itemValue}
                  >
                    <View style={styles.menuItemRow}>
                      <Text style={buttonTextStyleOf({ active, styles })}>{itemValue}</Text>
                      <DropdownMenu.ItemIndicator style={styles.menuIndicator}>
                        <Text style={styles.menuIndicatorText}>Selected</Text>
                      </DropdownMenu.ItemIndicator>
                    </View>
                  </DropdownMenu.RadioItem>
                )
              })}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <Text style={styles.smallCopy}>Current preset: {density}, notes {includeNotes ? "enabled" : "disabled"}.</Text>
    </View>
  )
}

function HoverCardDemo({ styles }: PrimitiveDemoProps) {
  return (
    <HoverCard.Root>
      <HoverCard.Trigger style={({ pressed }) => buttonStyleOf({ pressed, styles })}>
        <Text style={buttonTextStyleOf({ styles })}>Inspect detachment</Text>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Overlay closeOnPress style={styles.overlay} />
        <HoverCard.Content align="start" sideOffset={8} style={styles.dialogContent}>
          <Text style={styles.titleTextStrong}>Gladius Task Force</Text>
          <Text style={styles.bodyText}>A lightweight info surface for context that does not deserve a full dialog.</Text>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}

function LabelDemo({ styles }: PrimitiveDemoProps) {
  return (
    <View style={styles.stackSm}>
      <Label.Root>
        <Label.Text style={styles.smallLabel}>Battlesize</Label.Text>
      </Label.Root>
      <View style={styles.field}>
        <Text style={styles.titleText}>Strike Force</Text>
        <Text style={styles.bodyText}>2,000 points, standard mission deck.</Text>
      </View>
    </View>
  )
}

function MenubarDemo({ styles }: PrimitiveDemoProps) {
  const [menuValue, setMenuValue] = useState<string | undefined>()
  const [density, setDensity] = useState("comfortable")
  const open = menuValue === "density"

  return (
    <View style={styles.stackSm}>
      <Menubar.Root onValueChange={setMenuValue} value={menuValue}>
        <Menubar.Menu value="density">
          <Menubar.Trigger style={({ pressed }) => buttonStyleOf({ active: open, pressed, styles })}>
            <Text style={buttonTextStyleOf({ active: open, styles })}>Density: {density}</Text>
          </Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Overlay closeOnPress style={styles.overlay} />
            <Menubar.Content align="start" side="bottom" sideOffset={8} style={styles.menuContent}>
              <Menubar.Label style={styles.menuLabel}>Display density</Menubar.Label>
              <Menubar.RadioGroup onValueChange={setDensity} value={density}>
                {["compact", "comfortable", "spacious"].map((itemValue) => {
                  const active = density === itemValue

                  return (
                    <Menubar.RadioItem
                      closeOnPress
                      key={itemValue}
                      style={({ pressed }) => buttonStyleOf({ active, pressed, styles })}
                      textValue={itemValue}
                      value={itemValue}
                    >
                      <View style={styles.menuItemRow}>
                        <Text style={buttonTextStyleOf({ active, styles })}>{itemValue}</Text>
                        <Menubar.ItemIndicator style={styles.menuIndicator}>
                          <Text style={styles.menuIndicatorText}>Active</Text>
                        </Menubar.ItemIndicator>
                      </View>
                    </Menubar.RadioItem>
                  )
                })}
              </Menubar.RadioGroup>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
      </Menubar.Root>
      <Text style={styles.smallCopy}>Menubars work well for desktop-like command clusters on larger screens.</Text>
    </View>
  )
}

function NavigationMenuDemo({ styles }: PrimitiveDemoProps) {
  const [value, setValue] = useState<string | undefined>("detachments")

  return (
    <NavigationMenu.Root onValueChange={setValue} value={value}>
      <View style={styles.stackSm}>
        <NavigationMenu.List style={styles.rowWrap}>
          <NavigationMenu.Item value="detachments">
            <NavigationMenu.Trigger style={({ pressed }) => buttonStyleOf({ active: value === "detachments", pressed, styles })}>
              <Text style={buttonTextStyleOf({ active: value === "detachments", styles })}>Detachments</Text>
            </NavigationMenu.Trigger>
            <NavigationMenu.Portal>
              <NavigationMenu.Content align="start" side="bottom" sideOffset={8} style={styles.menuContent}>
                <View style={styles.stackSm}>
                  <Text style={styles.titleText}>Open a destination panel.</Text>
                  <NavigationMenu.Link style={styles.field}>
                    <Text style={styles.titleText}>Gladius Task Force</Text>
                    <Text style={styles.bodyText}>Balanced detachment entry point.</Text>
                  </NavigationMenu.Link>
                </View>
              </NavigationMenu.Content>
            </NavigationMenu.Portal>
          </NavigationMenu.Item>
        </NavigationMenu.List>
        <NavigationMenu.Indicator style={styles.navIndicator} />
        <NavigationMenu.Viewport style={styles.navViewport} />
      </View>
    </NavigationMenu.Root>
  )
}

function PopoverDemo({ styles }: PrimitiveDemoProps) {
  return (
    <Popover.Root>
      <Popover.Trigger style={({ pressed }) => buttonStyleOf({ pressed, styles })}>
        <Text style={buttonTextStyleOf({ styles })}>Show points breakdown</Text>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Overlay closeOnPress style={styles.overlay} />
        <Popover.Content align="start" sideOffset={8} style={styles.dialogContent}>
          <Text style={styles.titleTextStrong}>Points summary</Text>
          <Text style={styles.bodyText}>Characters 420, battleline 390, support 1,190.</Text>
          <Popover.Close style={({ pressed }) => ghostButtonStyleOf({ pressed, styles })}>
            <Text style={buttonTextStyleOf({ styles })}>Close</Text>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function ProgressDemo({ styles }: PrimitiveDemoProps) {
  const [value, setValue] = useState(72)

  return (
    <View style={styles.stackSm}>
      <Text style={styles.smallCopyStrong}>Import progress: {value}%</Text>
      <Progress.Root max={100} style={styles.progressTrack} value={value}>
        <Progress.Indicator style={flattenViewStyles(styles.progressIndicator, { width: `${value}%` })} />
      </Progress.Root>
      <View style={styles.rowWrap}>
        <Toggle.Root
          onPressedChange={(pressed) => setValue(pressed ? 100 : 72)}
          pressed={value === 100}
          style={({ pressed }) => buttonStyleOf({ active: pressed, pressed, styles })}
        >
          <Text style={buttonTextStyleOf({ active: value === 100, styles })}>Finish import</Text>
        </Toggle.Root>
      </View>
    </View>
  )
}

function RadioGroupDemo({ styles }: PrimitiveDemoProps) {
  const [value, setValue] = useState("wargear")

  return (
    <RadioGroup.Root onValueChange={setValue} value={value}>
      <View style={styles.stackSm}>
        {["wargear", "validation", "notes"].map((itemValue) => {
          const selected = value === itemValue

          return (
            <RadioGroup.Item
              key={itemValue}
              style={flattenViewStyles(styles.radioItem, selected && styles.radioItemSelected)}
              value={itemValue}
            >
              <RadioGroup.Indicator
                style={flattenViewStyles(styles.radioIndicator, selected && styles.radioIndicatorSelected)}
              >
                <Text style={styles.radioIndicatorDot}>On</Text>
              </RadioGroup.Indicator>
              <Text style={selected ? styles.titleTextStrong : styles.titleText}>{itemValue}</Text>
            </RadioGroup.Item>
          )
        })}
      </View>
    </RadioGroup.Root>
  )
}

function SelectDemo({ styles }: PrimitiveDemoProps) {
  const [value, setValue] = useState<Select.Option>({
    label: "Gladius Task Force",
    value: "gladius",
  })

  const options = [
    {
      label: "Gladius Task Force",
      value: "gladius",
    },
    {
      label: "Vanguard Spearhead",
      value: "vanguard",
    },
    {
      label: "Stormlance Task Force",
      value: "stormlance",
    },
  ] as const

  return (
    <View style={styles.stackSm}>
      <Select.Root onValueChange={setValue} value={value}>
        <Select.Trigger style={styles.selectTrigger}>
          <Select.Value placeholder="Choose a detachment" style={styles.selectValue} />
        </Select.Trigger>
        {Platform.OS === "web" ? null : (
          <Select.Portal>
            <Select.Overlay closeOnPress style={styles.overlay} />
            <Select.Content align="start" side="bottom" sideOffset={8} style={styles.menuContent}>
              <Select.Viewport>
                <Select.Group>
                  <Select.Label style={styles.menuLabel}>Detachments</Select.Label>
                  {options.map((option) => {
                    const selected = value?.value === option.value

                    return (
                      <Select.Item
                        key={option.value}
                        label={option.label}
                        style={buttonStyleOf({ active: selected, pressed: false, styles })}
                        value={option.value}
                      >
                        <Select.ItemText style={selected ? styles.titleTextStrong : styles.titleText} />
                      </Select.Item>
                    )
                  })}
                </Select.Group>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        )}
      </Select.Root>
      <Text style={styles.smallCopy}>Selected: {value?.label ?? "None"}</Text>
      {Platform.OS === "web" ? (
        <Text style={styles.smallCopy}>
          Storybook web keeps this demo to the trigger surface because the current rn-primitives web select wrapper is unstable in this environment.
        </Text>
      ) : null}
    </View>
  )
}

function SeparatorDemo({ styles }: PrimitiveDemoProps) {
  return (
    <View style={styles.stackSm}>
      <Text style={styles.titleText}>Primary section</Text>
      <Separator.Root decorative orientation="horizontal" style={styles.separator} />
      <Text style={styles.bodyText}>Separators clarify structure without adding extra chrome.</Text>
      <View style={styles.row}>
        <Text style={styles.smallCopyStrong}>Rules</Text>
        <Separator.Root decorative orientation="vertical" style={styles.separatorVertical} />
        <Text style={styles.smallCopyStrong}>Points</Text>
      </View>
    </View>
  )
}

function SliderDemo({ styles }: PrimitiveDemoProps) {
  const [value, setValue] = useState(55)

  return (
    <View style={styles.stackSm}>
      <Text style={styles.smallCopyStrong}>Opacity: {value}%</Text>
      <Slider.Root max={100} min={0} onValueChange={(nextValue) => setValue(nextValue[0] ?? value)} value={value}>
        <Slider.Track style={styles.sliderTrack}>
          <Slider.Range style={flattenViewStyles(styles.sliderRange, { width: `${value}%` })} />
        </Slider.Track>
        <Slider.Thumb style={styles.sliderThumb} />
      </Slider.Root>
    </View>
  )
}

function SwitchDemo({ styles }: PrimitiveDemoProps) {
  const [checked, setChecked] = useState(true)

  return (
    <View style={styles.rowWrap}>
      <Switch.Root
        checked={checked}
        onCheckedChange={(nextValue) => setChecked(nextValue)}
        style={flattenViewStyles(styles.switchRoot, checked && styles.switchRootChecked)}
      >
        <Switch.Thumb style={styles.switchThumb} />
      </Switch.Root>
      <View style={styles.stackSm}>
        <Text style={styles.titleText}>Auto-save draft</Text>
        <Text style={styles.bodyText}>{checked ? "Draft will persist locally." : "Draft stays in memory only."}</Text>
      </View>
    </View>
  )
}

function TableDemo({ styles }: PrimitiveDemoProps) {
  return (
    <Table.Root style={styles.tableRoot}>
      <Table.Header style={styles.tableHeader}>
        <Text style={styles.smallLabel}>Unit summary</Text>
      </Table.Header>
      <Table.Body>
        <Table.Row style={styles.tableRow}>
          <Table.Cell style={styles.tableCell}>
            <Text style={styles.smallCopyStrong}>Intercessors</Text>
          </Table.Cell>
          <Table.Cell style={[styles.tableCell, styles.tableCellEdge]}>
            <Text style={styles.smallCopy}>170 pts</Text>
          </Table.Cell>
        </Table.Row>
        <Table.Row style={[styles.tableRow, styles.tableRowAlt]}>
          <Table.Cell style={styles.tableCell}>
            <Text style={styles.smallCopyStrong}>Ballistus Dreadnought</Text>
          </Table.Cell>
          <Table.Cell style={[styles.tableCell, styles.tableCellEdge]}>
            <Text style={styles.smallCopy}>170 pts</Text>
          </Table.Cell>
        </Table.Row>
      </Table.Body>
      <Table.Footer style={styles.tableHeader}>
        <Text style={styles.smallCopyStrong}>2 units shown</Text>
      </Table.Footer>
    </Table.Root>
  )
}

function TabsDemo({ styles }: PrimitiveDemoProps) {
  const [value, setValue] = useState("summary")

  return (
    <Tabs.Root onValueChange={setValue} value={value}>
      <View style={styles.stackSm}>
        <Tabs.List style={styles.tabsList}>
          {["summary", "units", "warnings"].map((itemValue) => {
            const active = value === itemValue

            return (
              <Tabs.Trigger
                key={itemValue}
                style={({ pressed }) =>
                  flattenViewStyles(styles.tabTrigger, active && styles.tabTriggerActive, pressed && styles.buttonPressed)
                }
                value={itemValue}
              >
                <Text style={active ? styles.buttonTextActive : styles.buttonText}>{itemValue}</Text>
              </Tabs.Trigger>
            )
          })}
        </Tabs.List>
        <Tabs.Content style={styles.inset} value={value}>
          <Text style={styles.titleTextStrong}>{value}</Text>
          <Text style={styles.bodyText}>Tabs keep closely related roster views in one compact region.</Text>
        </Tabs.Content>
      </View>
    </Tabs.Root>
  )
}

function ToastDemo({ styles }: PrimitiveDemoProps) {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.stackSm}>
      <Toggle.Root
        onPressedChange={(pressed) => setOpen(pressed)}
        pressed={open}
        style={({ pressed }) => solidButtonStyleOf({ pressed, styles })}
      >
        <Text style={buttonTextStyleOf({ inverted: true, styles })}>{open ? "Hide toast" : "Show toast"}</Text>
      </Toggle.Root>
      <Toast.Root onOpenChange={setOpen} open={open} style={styles.toast}>
        <Toast.Title style={styles.titleTextStrong}>Roster saved locally</Toast.Title>
        <Toast.Description style={styles.bodyText}>A lightweight status surface that confirms work without derailing the flow.</Toast.Description>
        <View style={styles.actionRow}>
          <Toast.Action style={({ pressed }) => buttonStyleOf({ pressed, styles })}>
            <Text style={buttonTextStyleOf({ styles })}>Share</Text>
          </Toast.Action>
          <Toast.Close style={({ pressed }) => ghostButtonStyleOf({ pressed, styles })}>
            <Text style={buttonTextStyleOf({ styles })}>Dismiss</Text>
          </Toast.Close>
        </View>
      </Toast.Root>
    </View>
  )
}

function ToggleDemo({ styles }: PrimitiveDemoProps) {
  const [pressed, setPressed] = useState(false)

  return (
    <View style={styles.stackSm}>
      <Toggle.Root
        onPressedChange={setPressed}
        pressed={pressed}
        style={({ pressed: isPressed }) => buttonStyleOf({ active: pressed, pressed: isPressed, styles })}
      >
        <Text style={buttonTextStyleOf({ active: pressed, styles })}>{pressed ? "Pinned" : "Pin favourite"}</Text>
      </Toggle.Root>
      <Text style={styles.smallCopy}>{pressed ? "This loadout is pinned for quick reuse." : "Tap once to promote this loadout."}</Text>
    </View>
  )
}

function ToggleGroupDemo({ styles }: PrimitiveDemoProps) {
  const [value, setValue] = useState<Array<string>>(["text", "json"])

  return (
    <View style={styles.stackSm}>
      <ToggleGroup.Root onValueChange={(nextValue) => setValue(arrayValueOf(nextValue))} type="multiple" value={value}>
        <View style={styles.rowWrap}>
          {["text", "json", "share"].map((itemValue) => {
            const active = value.includes(itemValue)

            return (
              <ToggleGroup.Item key={itemValue} style={({ pressed }) => buttonStyleOf({ active, pressed, styles })} value={itemValue}>
                <Text style={buttonTextStyleOf({ active, styles })}>{itemValue}</Text>
              </ToggleGroup.Item>
            )
          })}
        </View>
      </ToggleGroup.Root>
      <Text style={styles.smallCopy}>Enabled outputs: {value.join(", ")}</Text>
    </View>
  )
}

function ToolbarDemo({ styles }: PrimitiveDemoProps) {
  const [tools, setTools] = useState<Array<string>>(["bold"])

  return (
    <View style={styles.stackSm}>
      <Toolbar.Root style={styles.toolbarRoot}>
        <Toolbar.Button style={({ pressed }) => buttonStyleOf({ pressed, styles })}>
          <Text style={buttonTextStyleOf({ styles })}>Save</Text>
        </Toolbar.Button>
        <Toolbar.Separator style={styles.separatorVertical} />
        <Toolbar.ToggleGroup onValueChange={(nextValue) => setTools(arrayValueOf(nextValue))} type="multiple" value={tools}>
          <View style={styles.rowWrap}>
            {["bold", "notes", "share"].map((itemValue) => {
              const active = tools.includes(itemValue)

              return (
                <Toolbar.ToggleItem key={itemValue} style={({ pressed }) => buttonStyleOf({ active, pressed, styles })} value={itemValue}>
                  <Text style={buttonTextStyleOf({ active, styles })}>{itemValue}</Text>
                </Toolbar.ToggleItem>
              )
            })}
          </View>
        </Toolbar.ToggleGroup>
      </Toolbar.Root>
      <Text style={styles.smallCopy}>Toolbar toggles: {tools.join(", ")}</Text>
    </View>
  )
}

function TooltipDemo({ styles }: PrimitiveDemoProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger style={({ pressed }) => buttonStyleOf({ pressed, styles })}>
        <Text style={buttonTextStyleOf({ styles })}>Why disabled?</Text>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Overlay closeOnPress style={styles.overlay} />
        <Tooltip.Content align="start" sideOffset={8} style={styles.dialogContent}>
          <Text style={styles.bodyText}>The option is locked until a Captain leads the unit.</Text>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

const primitiveDefinitions = [
  {
    category: "Disclosure",
    id: "accordion",
    packageName: "@rn-primitives/accordion",
    summary: "Expandable sections for dense detail that should stay near its trigger.",
    title: "Accordion",
    Demo: AccordionDemo,
  },
  {
    category: "Disclosure",
    id: "alert-dialog",
    packageName: "@rn-primitives/alert-dialog",
    summary: "Confirmation surface for destructive or high-cost choices.",
    title: "Alert Dialog",
    Demo: AlertDialogDemo,
  },
  {
    category: "Identity & Layout",
    id: "aspect-ratio",
    packageName: "@rn-primitives/aspect-ratio",
    summary: "Keeps visual media locked to a predictable frame.",
    title: "Aspect Ratio",
    Demo: AspectRatioDemo,
  },
  {
    category: "Identity & Layout",
    id: "avatar",
    packageName: "@rn-primitives/avatar",
    summary: "Identity chip with a graceful fallback when images are absent.",
    title: "Avatar",
    Demo: AvatarDemo,
  },
  {
    category: "Inputs & State",
    id: "checkbox",
    packageName: "@rn-primitives/checkbox",
    summary: "Binary option with explicit visibility of state.",
    title: "Checkbox",
    Demo: CheckboxDemo,
  },
  {
    category: "Disclosure",
    id: "collapsible",
    packageName: "@rn-primitives/collapsible",
    summary: "Progressive disclosure without leaving the current page.",
    title: "Collapsible",
    Demo: CollapsibleDemo,
  },
  {
    category: "Menus & Navigation",
    id: "context-menu",
    packageName: "@rn-primitives/context-menu",
    summary: "Long-press actions for secondary operations on touch surfaces.",
    title: "Context Menu",
    hint: "Long press the trigger on touch devices, or use the contextual gesture on desktop.",
    Demo: ContextMenuDemo,
  },
  {
    category: "Disclosure",
    id: "dialog",
    packageName: "@rn-primitives/dialog",
    summary: "Modal content for deeper workflows that still need a clean escape hatch.",
    title: "Dialog",
    Demo: DialogDemo,
  },
  {
    category: "Menus & Navigation",
    id: "dropdown-menu",
    packageName: "@rn-primitives/dropdown-menu",
    summary: "Action list anchored to a trigger for lightweight command clusters.",
    title: "Dropdown Menu",
    Demo: DropdownMenuDemo,
  },
  {
    category: "Disclosure",
    id: "hover-card",
    packageName: "@rn-primitives/hover-card",
    summary: "Transient context panel for additional detail without a full modal.",
    title: "Hover Card",
    hint: "On touch devices, use the trigger press to reveal the content.",
    Demo: HoverCardDemo,
  },
  {
    category: "Identity & Layout",
    id: "label",
    packageName: "@rn-primitives/label",
    summary: "Semantic captioning for nearby fields and compact form hints.",
    title: "Label",
    Demo: LabelDemo,
  },
  {
    category: "Menus & Navigation",
    id: "menubar",
    packageName: "@rn-primitives/menubar",
    summary: "Desktop-flavored command access that stays compact on wide layouts.",
    title: "Menubar",
    Demo: MenubarDemo,
  },
  {
    category: "Menus & Navigation",
    id: "navigation-menu",
    packageName: "@rn-primitives/navigation-menu",
    summary: "Structured top-level navigation with anchored destination content.",
    title: "Navigation Menu",
    Demo: NavigationMenuDemo,
  },
  {
    category: "Disclosure",
    id: "popover",
    packageName: "@rn-primitives/popover",
    summary: "Anchored overlay for quick detail or secondary actions.",
    title: "Popover",
    Demo: PopoverDemo,
  },
  {
    category: "Inputs & State",
    id: "progress",
    packageName: "@rn-primitives/progress",
    summary: "Visible completion state for imports, syncs, or saves.",
    title: "Progress",
    Demo: ProgressDemo,
  },
  {
    category: "Inputs & State",
    id: "radio-group",
    packageName: "@rn-primitives/radio-group",
    summary: "Single-choice input for mutually exclusive options.",
    title: "Radio Group",
    Demo: RadioGroupDemo,
  },
  {
    category: "Menus & Navigation",
    id: "select",
    packageName: "@rn-primitives/select",
    summary: "Structured pick list with a compact trigger and portal content.",
    title: "Select",
    Demo: SelectDemo,
  },
  {
    category: "Identity & Layout",
    id: "separator",
    packageName: "@rn-primitives/separator",
    summary: "Subtle structural break for lists, toolbars, and dense panels.",
    title: "Separator",
    Demo: SeparatorDemo,
  },
  {
    category: "Inputs & State",
    id: "slider",
    packageName: "@rn-primitives/slider",
    summary: "Range selection with direct manipulation.",
    title: "Slider",
    Demo: SliderDemo,
  },
  {
    category: "Inputs & State",
    id: "switch",
    packageName: "@rn-primitives/switch",
    summary: "Immediate binary toggle for persistent settings.",
    title: "Switch",
    Demo: SwitchDemo,
  },
  {
    category: "Identity & Layout",
    id: "table",
    packageName: "@rn-primitives/table",
    summary: "Row-and-column presentation for compact comparison data.",
    title: "Table",
    Demo: TableDemo,
  },
  {
    category: "Menus & Navigation",
    id: "tabs",
    packageName: "@rn-primitives/tabs",
    summary: "Switches between closely related content regions in place.",
    title: "Tabs",
    Demo: TabsDemo,
  },
  {
    category: "Feedback",
    id: "toast",
    packageName: "@rn-primitives/toast",
    summary: "Short-lived feedback for success states and lightweight follow-up actions.",
    title: "Toast",
    Demo: ToastDemo,
  },
  {
    category: "Inputs & State",
    id: "toggle",
    packageName: "@rn-primitives/toggle",
    summary: "Single on-off action with pressed-state feedback.",
    title: "Toggle",
    Demo: ToggleDemo,
  },
  {
    category: "Inputs & State",
    id: "toggle-group",
    packageName: "@rn-primitives/toggle-group",
    summary: "One or many compact toggles that move together as a set.",
    title: "Toggle Group",
    Demo: ToggleGroupDemo,
  },
  {
    category: "Menus & Navigation",
    id: "toolbar",
    packageName: "@rn-primitives/toolbar",
    summary: "Compact strip of actions and toggle tools for focused editing flows.",
    title: "Toolbar",
    Demo: ToolbarDemo,
  },
  {
    category: "Disclosure",
    id: "tooltip",
    packageName: "@rn-primitives/tooltip",
    summary: "Tiny contextual help attached directly to the trigger.",
    title: "Tooltip",
    hint: "Tooltips are best for short explanations that would otherwise clutter the screen.",
    Demo: TooltipDemo,
  },
] as const satisfies ReadonlyArray<PrimitiveDefinition>

export function PrimitiveGallery({
  focus,
}: {
  readonly focus?: PrimitiveGalleryFocus
}) {
  const styles = useThemedStyles(s)
  const items =
    focus === undefined
      ? primitiveDefinitions
      : primitiveDefinitions.filter((definition) => definition.id === focus)

  const visibleCategories = categoryOrder.filter((category) =>
    items.some((definition) => definition.category === category),
  )

  return (
    <View style={styles.gallery}>
      {focus === undefined ? (
        <View style={styles.intro}>
          <Text style={styles.introKicker}>RN primitives gallery</Text>
          <Text style={styles.introTitle}>One live native example per installed primitive.</Text>
          <Text style={styles.introBody}>
            This is the quickest sweep surface for the whole suite before drilling into focused Storybook entries.
          </Text>
        </View>
      ) : null}
      {visibleCategories.map((category) => {
        const definitions = items.filter((definition) => definition.category === category)

        return (
          <View key={category} style={styles.section}>
            {focus === undefined ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{category}</Text>
                <Text style={styles.sectionCount}>{definitions.length} demos</Text>
              </View>
            ) : null}
            <View style={styles.sectionStack}>
              {definitions.map((definition) => (
                <PrimitiveCard definition={definition} key={definition.id} styles={styles} />
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}