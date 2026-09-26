import type { Meta, StoryObj } from "@storybook/react-native"
import { fn } from "storybook/test"
import { ShowcaseCard } from "./ShowcaseCard"

const meta = {
  argTypes: {
    actionLabel: {
      control: "text",
    },
    body: {
      control: "text",
    },
    disabled: {
      control: "boolean",
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
  args: { onActionPress: fn() },
  globals: {
    themeMode: "dark",
  },
}

export const Light: Story = {
  args: {
    actionLabel: "Inspect tokens",
    eyebrow: "Light theme surface",
    onActionPress: fn(),
  },
  globals: {
    themeMode: "light",
  },
}

export const Disabled: Story = {
  args: {
    actionLabel: "Unavailable action",
    disabled: true,
    onActionPress: fn(),
  },
}
