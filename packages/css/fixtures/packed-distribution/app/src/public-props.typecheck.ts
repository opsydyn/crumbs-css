import { createElement } from "react"
import { ActionCard } from "@acme/ui"

export const supportedActionCardUsage = createElement(ActionCard, {
  onActionPress: () => undefined,
})

export const unsupportedActionCardUsage = createElement(ActionCard, {
  onActionPress: () => undefined,
  // @ts-expect-error `density` is not part of ActionCard's public component contract.
  density: "compact",
})
