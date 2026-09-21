import {
  createSprinkles,
  createSprinklesLookupPlan,
  defineProperties,
  type NativeSprinklesSelection,
} from "../src/native-style"
import { createSprinklesResolver } from "../src/theme-runtime"
import {
  createTokenContract,
  defineToken,
} from "../src/tokens"
import type { TextStyle, ViewStyle } from "react-native"

const vars = createTokenContract({
  color: { canvas: defineToken("color") },
  space: { sm: defineToken({ kind: "length" }) },
})

const viewProperties = defineProperties({
  primitives: ["view"] as const,
  properties: {
    paddingLeft: { sm: 8, token: vars.space.sm },
    paddingRight: { sm: 8, token: vars.space.sm },
    backgroundColor: { canvas: vars.color.canvas, solid: "#fff" },
  },
  shorthands: {
    px: ["paddingLeft", "paddingRight"] as const,
  },
})
const viewSprinkles = createSprinkles(viewProperties)
const viewResult: ViewStyle = viewSprinkles({ px: "sm", backgroundColor: "canvas" })
void viewResult

const viewPlan = createSprinklesLookupPlan(viewProperties)
const viewResolver = createSprinklesResolver(viewPlan)
const dynamicViewResult: ReadonlyArray<ViewStyle> = viewResolver({ px: "sm", backgroundColor: "canvas" })
void dynamicViewResult

// @ts-expect-error A view property set cannot expose text-only properties.
defineProperties({ primitives: ["view"] as const, properties: { color: { text: "red" } } })
// @ts-expect-error A length token cannot be used as a colour scale value.
defineProperties({ primitives: ["view"] as const, properties: { backgroundColor: { invalid: vars.space.sm } } })
defineProperties({
  primitives: ["view"] as const,
  properties: { paddingLeft: { sm: 8 } },
  shorthands: {
    // @ts-expect-error target is not defined
    px: ["paddingRight"] as const,
  },
})
// @ts-expect-error Scale values are finite names, not arbitrary strings.
viewSprinkles({ px: "lg" })

const textProperties = defineProperties({
  primitives: ["text"] as const,
  properties: {
    color: { primary: vars.color.canvas },
    fontSize: { body: vars.space.sm },
  },
})
const textSprinkles = createSprinkles(textProperties)
const textResult: TextStyle = textSprinkles({ color: "primary", fontSize: "body" })
void textResult

const explicitSelection: NativeSprinklesSelection<
  typeof viewProperties.properties,
  typeof viewProperties.shorthands
> = { px: "sm" }
void explicitSelection
