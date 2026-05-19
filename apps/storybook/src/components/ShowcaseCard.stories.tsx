import type { Meta, StoryObj } from "@storybook/react-native"
import { ShowcaseCard } from "./ShowcaseCard"

const meta = {
  argTypes: {
    actionLabel: {
      control: "text",
    },
    body: {
      control: "text",
    },
    eyebrow: {
      control: "text",
    },
    title: {
      control: "text",
    },
  },
  component: ShowcaseCard,
  title: "Components/ShowcaseCard",
} satisfies Meta<typeof ShowcaseCard>

export default meta

type Story = StoryObj<typeof meta>

export const Dark: Story = {
  args: {},
  globals: {
    themeMode: "dark",
  },
}

export const Light: Story = {
  args: {
    actionLabel: "Inspect tokens",
    eyebrow: "Light theme surface",
  },
  globals: {
    themeMode: "light",
  },
}
