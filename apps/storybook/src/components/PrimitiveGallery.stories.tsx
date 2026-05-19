import type { Meta, StoryObj } from "@storybook/react-native"
import { ScrollView } from "react-native"
import { PrimitiveGallery, type PrimitiveGalleryFocus } from "./PrimitiveGallery"

const meta = {
  component: PrimitiveGallery,
  title: "Primitives/NativeGallery",
} satisfies Meta<typeof PrimitiveGallery>

export default meta

type Story = StoryObj<typeof meta>

const renderGallery = (focus?: PrimitiveGalleryFocus) => () => (
  <ScrollView contentContainerStyle={{ padding: 24 }} style={{ alignSelf: "stretch", flex: 1 }}>
    <PrimitiveGallery focus={focus} />
  </ScrollView>
)

export const Gallery: Story = {
  render: renderGallery(),
}

export const Accordion: Story = {
  render: renderGallery("accordion"),
}

export const AlertDialog: Story = {
  render: renderGallery("alert-dialog"),
}

export const AspectRatio: Story = {
  render: renderGallery("aspect-ratio"),
}

export const Avatar: Story = {
  render: renderGallery("avatar"),
}

export const Checkbox: Story = {
  render: renderGallery("checkbox"),
}

export const Collapsible: Story = {
  render: renderGallery("collapsible"),
}

export const ContextMenu: Story = {
  render: renderGallery("context-menu"),
}

export const Dialog: Story = {
  render: renderGallery("dialog"),
}

export const DropdownMenu: Story = {
  render: renderGallery("dropdown-menu"),
}

export const HoverCard: Story = {
  render: renderGallery("hover-card"),
}

export const Label: Story = {
  render: renderGallery("label"),
}

export const Menubar: Story = {
  render: renderGallery("menubar"),
}

export const NavigationMenu: Story = {
  render: renderGallery("navigation-menu"),
}

export const Popover: Story = {
  render: renderGallery("popover"),
}

export const Progress: Story = {
  render: renderGallery("progress"),
}

export const RadioGroup: Story = {
  render: renderGallery("radio-group"),
}

export const Select: Story = {
  render: renderGallery("select"),
}

export const Separator: Story = {
  render: renderGallery("separator"),
}

export const Slider: Story = {
  render: renderGallery("slider"),
}

export const Switch: Story = {
  render: renderGallery("switch"),
}

export const Table: Story = {
  render: renderGallery("table"),
}

export const Tabs: Story = {
  render: renderGallery("tabs"),
}

export const Toast: Story = {
  render: renderGallery("toast"),
}

export const Toggle: Story = {
  render: renderGallery("toggle"),
}

export const ToggleGroup: Story = {
  render: renderGallery("toggle-group"),
}

export const Toolbar: Story = {
  render: renderGallery("toolbar"),
}

export const Tooltip: Story = {
  render: renderGallery("tooltip"),
}