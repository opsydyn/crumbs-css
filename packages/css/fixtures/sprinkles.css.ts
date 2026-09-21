import { createSprinkles, defineProperties } from "@opsydyn/crumbs-css/style"
import { createTokenContract, defineToken } from "@opsydyn/crumbs-css/tokens"

const vars = createTokenContract({
  color: { canvas: defineToken("color") },
  space: { sm: defineToken({ kind: "length" }) },
})

const viewProperties = defineProperties({
  primitives: ["view"] as const,
  properties: {
    paddingLeft: { sm: 8, token: vars.space.sm },
    paddingRight: { sm: 8, token: vars.space.sm },
    backgroundColor: { canvas: vars.color.canvas },
  },
  shorthands: {
    px: ["paddingLeft", "paddingRight"] as const,
  },
})
const sprinkles = createSprinkles(viewProperties)

// The longhand is authored after px, so it wins only for paddingLeft.
export const card = sprinkles({ px: "sm", paddingLeft: "token", backgroundColor: "canvas" })
