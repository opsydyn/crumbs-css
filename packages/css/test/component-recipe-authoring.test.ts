import {describe, expect, it} from "bun:test"
import {endFileScope, setFileScope} from "@vanilla-extract/css/fileScope"
import {componentRecipe, componentRecipeFromRecipe, recipe} from "../src/native-style"

function inFileScope<T>(run: () => T): T {
  setFileScope("component-recipe-authoring.css.ts", "@crumbs/test")
  try {
    return run()
  } finally {
    endFileScope()
  }
}

describe("component recipe authoring", () => {
  it("creates a versioned deeply frozen descriptor in authored slot order", () => {
    const button = inFileScope(() => componentRecipe({
      slots: {root: "view", label: "text", icon: "image"} as const,
      base: {
        root: {paddingHorizontal: 12},
        label: {fontWeight: "700"},
        icon: {resizeMode: "contain"},
      },
      variants: {
        tone: {
          primary: {root: {opacity: 1}, label: {color: "white"}},
          quiet: {root: {opacity: 0.8}, label: {color: "black"}},
        },
      },
      defaultVariants: {tone: "primary"},
      compoundVariants: [{
        variants: {tone: "quiet"},
        styles: {root: {borderWidth: 1}},
      }],
    }, "button"))

    expect(button.$$type).toBe("crumbs.css.component-recipe")
    expect(button.version).toBe(1)
    expect(button.$$debugName).toBe("button")
    expect(Object.keys(button.slots)).toEqual(["root", "label", "icon"])
    expect(Object.keys(button.base ?? {})).toEqual(["root", "label", "icon"])
    expect(Object.keys(button.variants.tone.primary)).toEqual(["root", "label"])
    expect(button.compoundVariants).toHaveLength(1)
    expect(Object.isFrozen(button)).toBe(true)
    expect(Object.isFrozen(button.slots)).toBe(true)
    expect(Object.isFrozen(button.base)).toBe(true)
    expect(Object.isFrozen(button.base?.root)).toBe(true)
    expect(Object.isFrozen(button.variants)).toBe(true)
    expect(Object.isFrozen(button.variants.tone)).toBe(true)
    expect(Object.isFrozen(button.variants.tone.primary)).toBe(true)
    expect(Object.isFrozen(button.compoundVariants)).toBe(true)
    expect(Object.isFrozen(button.compoundVariants[0])).toBe(true)
    expect(Object.isFrozen(button.compoundVariants[0]?.styles)).toBe(true)
  })

  it("rejects malformed slots and branch maps at construction", () => {
    expect(() => componentRecipe({slots: {}, variants: {}} as never)).toThrow(/at least one slot/)
    expect(() => componentRecipe({slots: {"": "view"}, variants: {}} as never)).toThrow(/slot names must be non-empty/)
    expect(() => componentRecipe({slots: {root: "web"}, variants: {}} as never)).toThrow(/invalid primitive kind/)
    expect(() => componentRecipe({
      slots: {root: "view"},
      base: {label: {opacity: 1}},
      variants: {},
    } as never)).toThrow(/unknown slot "label"/)
    expect(() => componentRecipe({
      slots: {root: "view"},
      variants: {tone: {}},
    } as never)).toThrow(/variant "tone" must define at least one value/)
    expect(() => componentRecipe({
      slots: {root: "view"},
      variants: {tone: {primary: {root: {opacity: 1}}}},
      defaultVariants: {tone: "danger"},
    } as never)).toThrow(/default value "danger" is not defined for variant "tone"/)
  })

  it("wraps a legacy recipe as a view slot without replacing its class references", () => {
    const {legacy, wrapped} = inFileScope(() => {
      const legacy = recipe({
        base: {opacity: 1},
        variants: {
          tone: {primary: {opacity: 0.8}, quiet: {opacity: 0.5}},
        },
        defaultVariants: {tone: "primary"},
        compoundVariants: [{variants: {tone: "quiet"}, style: {borderWidth: 1}}],
      }, "legacyButton")
      return {
        legacy,
        wrapped: componentRecipeFromRecipe(legacy, {slot: "root", debugId: "button"}),
      }
    })

    expect(wrapped.$$type).toBe("crumbs.css.component-recipe")
    expect(wrapped.slots).toEqual({root: "view"})
    expect(wrapped.defaultVariants).toEqual(legacy.defaultVariants)
    expect(Object.isFrozen(wrapped.defaultVariants)).toBe(true)
    expect(wrapped.variants.tone.primary.root).toBe(legacy.variants.tone.primary)
    expect(wrapped.variants.tone.quiet.root).toBe(legacy.variants.tone.quiet)
    expect(wrapped.compoundVariants[0]?.styles.root).toBe(legacy.compoundVariants[0]?.style)
    expect(Object.isFrozen(wrapped)).toBe(true)
    expect(() => componentRecipeFromRecipe(legacy, {slot: ""})).toThrow(/slot name must be non-empty/)
  })
})
