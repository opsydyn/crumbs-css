import type { Meta, StoryObj } from "@storybook/react-native"
import { DevtoolsFixture } from "./DevtoolsFixture"
const meta={title:"Devtools/Diagnosis",component:DevtoolsFixture} satisfies Meta<typeof DevtoolsFixture>
export default meta
export const Light:StoryObj<typeof meta>={globals:{themeMode:"light"}}
export const Dark:StoryObj<typeof meta>={globals:{themeMode:"dark"}}
