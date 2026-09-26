import type { ComponentProps } from "react"
import type { NativeComponentPublicProps } from "@opsydyn/crumbs-css/style"
import type { ShowcaseCard } from "../src/components/ShowcaseCard"
import type { action } from "../src/components/ShowcaseCard.css"

type ShowcaseCardProps = ComponentProps<typeof ShowcaseCard>

// @ts-expect-error The showcase action is a real button and requires its handler.
const missingActionHandler: ShowcaseCardProps = {}

type ActionSelection = NativeComponentPublicProps<typeof action>
const disabledAction: ActionSelection = { disabled: true }
// @ts-expect-error A disabled action cannot select the pressed visual state.
const disabledAndPressedAction: ActionSelection = { disabled: true, pressed: true }

void [missingActionHandler, disabledAction, disabledAndPressedAction]
