import {describe, expect, it} from "bun:test"
import {endFileScope, setFileScope} from "@vanilla-extract/css/fileScope"
import type {ImageStyle, TextStyle, ViewStyle} from "react-native"
import type {
  NativeComponentRecipe,
} from "../src/native-style"
import {componentRecipeFromRecipe, recipe} from "../src/native-style"
import {
  createComponentRecipeResolutionPlan,
  createComponentRecipeResolver,
  resolveComponentRecipeResolutionPlan,
  resolveComponentRecipeStyles,
} from "../src/theme-runtime"

type Slots = Readonly<{root: "view"; label: "text"; icon: "image"}>
type Variants = Readonly<{
  tone: Readonly<{primary: object; quiet: object}>
  disabled: Readonly<{false: object; true: object}>
}>
type StateSlots = Readonly<{root: "view"; label: "text"}>
type StateButtonVariants = Readonly<{
  status: Readonly<{ready: object; loading: object}>
  busy: Readonly<{false: object; true: object}>
  tone: Readonly<{primary: object; quiet: object}>
}>
type StateButtonStateVariants = Readonly<{
  status: Readonly<{
    ready: Readonly<{busy: readonly [false]; tone: readonly ["primary", "quiet"]}>
    loading: Readonly<{busy: readonly [true]; tone: readonly ["primary"]}>
  }>
}>
type StateButtonDefaults = Readonly<{status: "ready"; busy: false; tone: "primary"}>

const button = {
  $$type: "crumbs.css.component-recipe",
  version: 1,
  $$debugName: "componentRuntimeButton",
  slots: {root: "view", label: "text", icon: "image"},
  base: {root: {padding: 12}, label: {fontWeight: "700"}},
  variants: {
    tone: {
      primary: {root: {opacity: 1}, label: {color: "white"}},
      quiet: {root: {opacity: 0.8}, label: {color: "black"}},
    },
    disabled: {
      false: {root: {opacity: 1}},
      true: {root: {opacity: 0.5}},
    },
  },
  defaultVariants: {tone: "primary", disabled: false},
  compoundVariants: [
    {variants: {tone: "quiet"}, styles: {root: {borderWidth: 1}}},
    {variants: {tone: "quiet", disabled: true}, styles: {label: {opacity: 0.7}}},
  ],
} as unknown as NativeComponentRecipe<Slots, Variants>

const stateButton = {
  $$type: "crumbs.css.component-recipe",
  version: 2,
  $$debugName: "componentStateRuntimeButton",
  slots: {root: "view", label: "text"},
  base: {root: {padding: 1}, label: {fontSize: 10}},
  variants: {
    status: {
      ready: {root: {opacity: 0.1}},
      loading: {root: {opacity: 0.2}},
    },
    busy: {
      false: {label: {opacity: 0.9}},
      true: {label: {opacity: 0.5}},
    },
    tone: {
      primary: {root: {borderWidth: 1}},
      quiet: {root: {borderWidth: 2}},
    },
  },
  defaultVariants: {status: "ready", busy: false, tone: "primary"},
  stateVariants: {
    status: {
      ready: {busy: [false], tone: ["primary", "quiet"]},
      loading: {busy: [true], tone: ["primary"]},
    },
  },
  compoundVariants: [{
    variants: {status: "loading", busy: true},
    styles: {label: {fontWeight: "700"}},
  }],
} as unknown as NativeComponentRecipe<StateSlots, StateButtonVariants, StateButtonStateVariants, StateButtonDefaults>

describe("component recipe resolution", () => {
  it("precomputes one shared authored-order plan and resolves every slot", () => {
    const plan = createComponentRecipeResolutionPlan(button)
    const resolved = resolveComponentRecipeResolutionPlan(plan, {tone: "quiet", disabled: true})

    expect(plan.slotOrder).toEqual(["root", "label", "icon"])
    expect(plan.variantOrder).toEqual(["tone", "disabled"])
    expect(plan.selectionKeys).toEqual(["tone", "disabled"])
    expect(plan.variants.reduce((count, variant) => count + Object.keys(variant.values).length, 0)).toBe(4)
    expect(resolved.root).toEqual([{padding: 12}, {opacity: 0.8}, {opacity: 0.5}, {borderWidth: 1}])
    expect(resolved.label).toEqual([{fontWeight: "700"}, {color: "black"}, {opacity: 0.7}])
    expect(resolved.icon).toEqual([])
    expect(Object.keys(resolved)).toEqual(["root", "label", "icon"])
    expect(Object.isFrozen(plan)).toBe(true)
    expect(Object.isFrozen(plan.slotOrder)).toBe(true)
    expect(Object.isFrozen(resolved)).toBe(true)
    expect(Object.isFrozen(resolved.root)).toBe(true)
    expect(Object.isFrozen(resolved.icon)).toBe(true)

    const typedResolver = createComponentRecipeResolver(button)
    const typedResult = typedResolver({tone: "quiet", disabled: true})
    const rootStyles: ReadonlyArray<ViewStyle> = typedResult.root
    const labelStyles: ReadonlyArray<TextStyle> = typedResult.label
    const iconStyles: ReadonlyArray<ImageStyle> = typedResult.icon
    void [rootStyles, labelStyles, iconStyles]
    if (false) {
      // @ts-expect-error Component selections reject values outside the shared variant map.
      typedResolver({tone: "danger"})
    }
  })

  it("uses defaults, authored variant order, and compound order in the one-shot API", () => {
    const resolved = resolveComponentRecipeStyles(button)

    expect(resolved.root).toEqual([{padding: 12}, {opacity: 1}, {opacity: 1}])
    expect(resolved.label).toEqual([{fontWeight: "700"}, {color: "white"}])
    expect(resolved.icon).toEqual([])
  })

  it("canonicalises equivalent selections and retains frozen result identity in its bounded LRU", () => {
    const resolver = createComponentRecipeResolver(button, {cacheSize: 2})
    const first = resolver({})
    const same = resolver({disabled: false, tone: "primary"})
    expect(same).toBe(first)
    expect(resolver.getCacheStats()).toMatchObject({hits: 1, misses: 1, evictions: 0})

    const quiet = resolver({tone: "quiet"})
    resolver({tone: "quiet", disabled: true})
    expect(resolver.getCacheStats()).toMatchObject({capacity: 2, size: 2, evictions: 1})
    expect(resolver({tone: "quiet"})).toBe(quiet)
    expect(resolver({})).not.toBe(first)

    resolver.clearCache()
    expect(resolver.getCacheStats().size).toBe(0)
    resolver.dispose()
    expect(resolver.getCacheStats().disposed).toBe(true)
    expect(() => resolver({})).toThrow("Component recipe resolver has been disposed")
  })

  it("supports cacheSize zero and reports invalid values once while skipping that branch", () => {
    const resolver = createComponentRecipeResolver(button, {cacheSize: 0})
    expect(resolver({})).not.toBe(resolver({}))
    expect(resolver.getCacheStats()).toMatchObject({capacity: 0, size: 0, hits: 0, misses: 2})

    const invalidResolver = createComponentRecipeResolver(button, {cacheSize: 0})
    const warnings = captureWarnings(() => {
      invalidResolver({tone: "danger" as never, disabled: true})
      invalidResolver({tone: "danger" as never, disabled: true})
    })
    expect(warnings).toEqual([
      '[crumbs-css:CRUMBS_CSS_INVALID_RECIPE_VARIANT] Invalid native component recipe "componentRuntimeButton": variant "tone" does not define value "danger"; supported values: primary, quiet.',
    ])

    const reports: Array<readonly [string, unknown, Readonly<Record<string, unknown>>]> = []
    const plan = createComponentRecipeResolutionPlan(button)
    const resolved = resolveComponentRecipeResolutionPlan(
      plan,
      {tone: "danger" as never, disabled: true},
      (name, value, values) => reports.push([name, value, values]),
    )
    expect(reports).toHaveLength(1)
    expect(reports[0]?.slice(0, 2)).toEqual(["tone", "danger"])
    expect(resolved.root).toEqual([{padding: 12}, {opacity: 0.5}])
    expect(resolved.label).toEqual([{fontWeight: "700"}])
  })

  it("normalizes state defaults and returns base-only styles for prohibited v2 selections", () => {
    const resolver = createComponentRecipeResolver(stateButton, {cacheSize: 0})
    const defaultQuiet = resolver({tone: "quiet"} as never)
    expect(defaultQuiet.root).toEqual([
      {padding: 1},
      {opacity: 0.1},
      {borderWidth: 2},
    ])
    expect(defaultQuiet.label).toEqual([{fontSize: 10}, {opacity: 0.9}])

    const loading = resolver({status: "loading", busy: true, tone: "primary"} as never)
    expect(loading.root).toEqual([
      {padding: 1},
      {opacity: 0.2},
      {borderWidth: 1},
    ])
    expect(loading.label).toEqual([
      {fontSize: 10},
      {opacity: 0.5},
      {fontWeight: "700"},
    ])

    const warnings = captureWarnings(() => {
      const prohibited = {status: "loading", busy: false, tone: "quiet"}
      const result = resolver(prohibited as never)
      resolver({tone: "quiet", busy: false, status: "loading"} as never)
      const unknown = resolver({status: "paused", busy: false, tone: "primary"} as never)
      expect(result.root).toEqual([{padding: 1}])
      expect(result.label).toEqual([{fontSize: 10}])
      expect(unknown.root).toEqual([{padding: 1}])
      expect(unknown.label).toEqual([{fontSize: 10}])
    })
    expect(warnings).toHaveLength(2)
    expect(warnings.every(message => message.includes("CRUMBS_CSS_INVALID_RECIPE_VARIANT"))).toBe(true)
    expect(warnings.every(message => message.includes("componentStateRuntimeButton"))).toBe(true)
    expect(warnings.every(message => message.includes('state "status"'))).toBe(true)

    const {stateVariants: _stateVariants, ...unconstrainedV2} = stateButton
    const unconstrained = createComponentRecipeResolver(
      unconstrainedV2 as unknown as NativeComponentRecipe<StateSlots, StateButtonVariants, undefined, StateButtonDefaults>,
      {cacheSize: 0},
    )
    const independent = unconstrained({status: "loading", busy: false, tone: "quiet"} as never)
    expect(independent.root).toEqual([
      {padding: 1},
      {opacity: 0.2},
      {borderWidth: 2},
    ])
    expect(independent.label).toEqual([{fontSize: 10}, {opacity: 0.9}])
  })

  it("resolves the view-only migration adapter without replacing legacy class references", () => {
    setFileScope("component-recipe-runtime.css.ts", "@crumbs/test")
    try {
      const legacy = recipe({
        base: {opacity: 1},
        variants: {tone: {primary: {opacity: 0.8}}},
        defaultVariants: {tone: "primary"},
      }, "legacyRuntimeButton")
      const wrapped = componentRecipeFromRecipe(legacy, {slot: "root"})
      const result = resolveComponentRecipeStyles(wrapped)

      expect(result.root[0]).toBe(legacy.base)
      expect(result.root[1]).toBe(legacy.variants.tone.primary)
      expect(result).toHaveProperty("root")
    } finally {
      endFileScope()
    }
  })

  it("rejects invalid resolver cache capacities", () => {
    expect(() => createComponentRecipeResolver(button, {cacheSize: Number.POSITIVE_INFINITY})).toThrow(
      "Recipe resolver cacheSize must be a finite integer",
    )
    expect(() => createComponentRecipeResolver(button, {cacheSize: 1025})).toThrow(
      "Recipe resolver cacheSize must be between 0 and 1024",
    )
  })
})

function captureWarnings(run: () => void): ReadonlyArray<string> {
  const originalWarn = console.warn
  const warnings: string[] = []
  console.warn = (...args: ReadonlyArray<unknown>) => {
    warnings.push(args.map(String).join(" "))
  }
  try {
    run()
  } finally {
    console.warn = originalWarn
  }
  return warnings
}
