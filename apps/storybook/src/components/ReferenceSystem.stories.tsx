import type { Meta, StoryObj } from "@storybook/react-native"
import { ScrollView } from "react-native"
import { ReferenceSystem } from "./ReferenceSystem"

const meta = {
  component: ReferenceSystem,
  title: "Design System/Reference Patterns",
} satisfies Meta<typeof ReferenceSystem>

export default meta

type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  render: () => (
    <ScrollView contentContainerStyle={{ gap: 24, padding: 20 }} style={{ alignSelf: "stretch", flex: 1 }}>
      <ReferenceSystem />
    </ScrollView>
  ),
}
