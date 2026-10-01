import { describe, expect, it } from "bun:test"
import * as themeRuntime from "../src/theme-runtime"
import * as recipeResolvers from "../src/runtime/theme-recipe-resolvers"
import * as sprinklesResolver from "../src/runtime/theme-sprinkles-resolver"

describe("canonical theme runtime resolver bindings", () => {
  it("re-exports recipe resolver functions without wrapping or copying them", () => {
    expect(themeRuntime.resolveRecipeStyle).toBe(recipeResolvers.resolveRecipeStyle)
    expect(themeRuntime.createRecipeResolver).toBe(recipeResolvers.createRecipeResolver)
    expect(themeRuntime.resolveComponentRecipeStyles).toBe(recipeResolvers.resolveComponentRecipeStyles)
    expect(themeRuntime.createComponentRecipeResolver).toBe(recipeResolvers.createComponentRecipeResolver)
  })

  it("re-exports the canonical Sprinkles resolver binding", () => {
    expect(themeRuntime.createSprinklesResolver).toBe(sprinklesResolver.createSprinklesResolver)
  })

  it("does not expose recipe-only warning state from the Sprinkles entry", () => {
    expect(Object.keys(sprinklesResolver)).toEqual(["createSprinklesResolver"])
  })
})
