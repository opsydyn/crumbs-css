import type { StorybookConfig } from "@storybook/react-native"

const main: StorybookConfig = {
  deviceAddons: ["@storybook/addon-ondevice-controls", "@storybook/addon-ondevice-actions"],
  stories: ["../src/components/**/*.stories.?(ts|tsx|js|jsx)"],
}

export default main
