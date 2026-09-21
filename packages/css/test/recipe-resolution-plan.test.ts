import {describe, expect, it} from "bun:test"
import type {NativeRecipe} from "../src/native-style"
import {createRecipeResolver} from "../src/theme-runtime"

const recipe = {
  $$type: "crumbs.css.recipe",
  $$debugName: "boundedResolver",
  base: {opacity: 1},
  defaultVariants: {tone: "primary", compact: false},
  variants: {
    tone: {
      primary: {opacity: 0.9},
      secondary: {opacity: 0.8},
    },
    compact: {
      false: {padding: 16},
      true: {padding: 8},
    },
  },
  compoundVariants: [
    {
      style: {opacity: 0.6},
      variants: {tone: "secondary", compact: true},
    },
  ],
} as unknown as NativeRecipe<{
  readonly tone: {readonly primary: object; readonly secondary: object}
  readonly compact: {readonly false: object; readonly true: object}
}>

describe("recipe resolution plans", () => {
  it("precomputes authored order, defaults, selection keys, and compound matchers", () => {
    const resolver = createRecipeResolver(recipe, {cacheSize: 4})

    expect(resolver.plan.variantOrder).toEqual(["tone", "compact"])
    expect(resolver.plan.selectionKeys).toEqual(["tone", "compact"])
    expect(resolver.plan.defaultSelection).toEqual({tone: "primary", compact: false})
    expect(resolver.plan.compoundMatchers).toHaveLength(1)
    expect(resolver.plan.compoundMatchers[0]?.requirements).toEqual([
      ["tone", "secondary"],
      ["compact", true],
    ])
    expect(resolver.plan.compoundMatchers[0]?.matches({tone: "secondary", compact: true})).toBe(true)
    expect(resolver.plan.compoundMatchers[0]?.matches({tone: "secondary", compact: "true"})).toBe(false)
    expect(Object.isFrozen(resolver.plan)).toBe(true)
    expect(Object.isFrozen(resolver.plan.variantOrder)).toBe(true)
    expect(Object.isFrozen(resolver.plan.defaultSelection)).toBe(true)
    expect(Object.isFrozen(resolver.plan.compoundMatchers[0])).toBe(true)
  })

  it("uses canonical keys for equivalent selections and keeps type-sensitive compound matches", () => {
    const resolver = createRecipeResolver(recipe, {cacheSize: 4})

    const first = resolver({tone: "secondary", compact: true})
    const same = resolver({compact: true, tone: "secondary"})
    expect(same).toBe(first)
    expect(resolver.getCacheStats()).toMatchObject({hits: 1, misses: 1, evictions: 0})

    const booleanSelection = resolver({compact: true})
    const stringSelection = resolver({compact: "true" as never})
    expect(booleanSelection).toEqual([
      {opacity: 1},
      {opacity: 0.9},
      {padding: 8},
    ])
    expect(stringSelection).toEqual([
      {opacity: 1},
      {opacity: 0.9},
      {padding: 8},
    ])
    expect(resolver.getCacheStats().misses).toBe(3)
  })

  it("evicts least-recently-used selections within the configured bound", () => {
    const resolver = createRecipeResolver(recipe, {cacheSize: 2})

    const defaultResult = resolver({})
    const secondaryResult = resolver({tone: "secondary"})
    expect(resolver({})).toBe(defaultResult)
    resolver({compact: true})

    const statsAfterOverflow = resolver.getCacheStats()
    expect(statsAfterOverflow.capacity).toBe(2)
    expect(statsAfterOverflow.size).toBe(2)
    expect(statsAfterOverflow.evictions).toBe(1)

    const secondaryAgain = resolver({tone: "secondary"})
    expect(secondaryAgain).not.toBe(secondaryResult)
    expect(resolver.getCacheStats().size).toBe(2)
  })

  it("keeps resolver lifetime explicit and releases its bounded cache on disposal", () => {
    const resolver = createRecipeResolver(recipe, {cacheSize: 2})
    resolver({})
    resolver.clearCache()
    expect(resolver.getCacheStats().size).toBe(0)
    resolver({})
    resolver.dispose()

    expect(resolver.getCacheStats()).toMatchObject({
      capacity: 2,
      size: 0,
      disposed: true,
    })
    expect(() => resolver({})).toThrow("Recipe resolver has been disposed")
  })

  it("rejects unbounded or non-integral cache sizes", () => {
    expect(() => createRecipeResolver(recipe, {cacheSize: Number.POSITIVE_INFINITY})).toThrow(
      "Recipe resolver cacheSize must be a finite integer",
    )
    expect(() => createRecipeResolver(recipe, {cacheSize: 1.5})).toThrow(
      "Recipe resolver cacheSize must be a finite integer",
    )
    expect(() => createRecipeResolver(recipe, {cacheSize: 1025})).toThrow(
      "Recipe resolver cacheSize must be between 0 and 1024",
    )
  })

  it("allows an explicitly uncached resolver without retaining selections", () => {
    const resolver = createRecipeResolver(recipe, {cacheSize: 0})

    expect(resolver({})).not.toBe(resolver({}))
    expect(resolver.getCacheStats()).toMatchObject({
      capacity: 0,
      size: 0,
      hits: 0,
      misses: 2,
      evictions: 0,
    })
  })
})
