import type { Meta, StoryObj } from "@storybook/react-native"
import { ShowcaseScreen } from "./ShowcaseScreen"

const meta = {
  component: ShowcaseScreen,
  title: "Patterns/ShowcaseScreen",
} satisfies Meta<typeof ShowcaseScreen>

export default meta

type Story = StoryObj<typeof meta>

export const Interactive: Story = {}