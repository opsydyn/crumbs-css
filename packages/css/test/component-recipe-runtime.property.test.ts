import {describe, expect, it} from "bun:test"
import fc from "fast-check"
import type {NativeComponentRecipeDescriptor} from "../src/components"
import type {NativeStyle} from "../src/native-style"
import {
  createComponentRecipeResolver,
  resolveComponentRecipeStyles,
} from "../src/theme-runtime"

const PROPERTY_RUNS = 100
const PROPERTY_SEED = 20260922

type SelectionMode = "default" | "invalid" | "next" | "omit"
type GeneratedCase = {
  readonly recipe: NativeComponentRecipeDescriptor
  readonly selection: Readonly<Record<string, unknown>>
}

const generatedCaseArbitrary = fc.integer({min: 1, max: 4}).chain(slotCount =>
  fc.integer({min: 0, max: 4}).chain(variantCount =>
    fc.integer({min: 0, max: 5}).chain(compoundCount =>
      fc.record({
        defaultIndexes: fc.array(fc.integer({min: 0, max: 3}), {
          minLength: variantCount,
          maxLength: variantCount,
        }),
        selectionModes: fc.array(fc.constantFrom<SelectionMode>("omit", "default", "next", "invalid"), {
          minLength: variantCount,
          maxLength: variantCount,
        }),
        slotKinds: fc.array(fc.constantFrom("view" as const, "text" as const, "image" as const), {
          minLength: slotCount,
          maxLength: slotCount,
        }),
        valueCounts: fc.array(fc.integer({min: 1, max: 3}), {
          minLength: variantCount,
          maxLength: variantCount,
        }),
      }).map(shape => generatedCaseFromShape(slotCount, variantCount, compoundCount, shape)),
    ),
  ),
)

describe("component recipe runtime properties", () => {
  it("agrees with an independent authored-data evaluator and keeps canonical result identity", () => {
    fc.assert(
      fc.property(generatedCaseArbitrary, ({recipe, selection}) => {
        const expected = referenceResolve(recipe, selection)
        const resolver = createComponentRecipeResolver(recipe, {cacheSize: 8})
        const resolved = withoutWarnings(() => resolver(selection as never))

        expect(resolved).toEqual(expected)
        expect(Object.isFrozen(resolved)).toBe(true)
        for (const slot of Object.keys(recipe.slots)) {
          expect(Object.isFrozen(resolved[slot as keyof typeof resolved])).toBe(true)
        }
        expect(withoutWarnings(() => resolver({...selection} as never))).toBe(resolved)
        expect(withoutWarnings(() => resolver(Object.fromEntries(Object.entries(selection).reverse()) as never)))
          .toBe(resolved)
        expect(resolveComponentRecipeStyles(recipe, selection as never)).toEqual(resolved)
      }),
      {numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED},
    )
  })

  it("treats a numeric selection as invalid when its string form is a declared value", () => {
    const recipe = {
      $$type: "crumbs.css.component-recipe",
      version: 1,
      $$debugName: "typedComponentSelection",
      slots: {root: "view"},
      variants: {count: {"1": {root: {opacity: 1}}}},
      defaultVariants: {},
      compoundVariants: [],
    } as unknown as NativeComponentRecipeDescriptor
    const resolver = createComponentRecipeResolver(recipe, {cacheSize: 0})
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: ReadonlyArray<unknown>) => warnings.push(args.map(String).join(" "))
    try {
      expect(resolver({count: 1} as never).root).toEqual([])
      expect(resolver({count: "1"} as never).root).toEqual([{opacity: 1}])
    } finally {
      console.warn = originalWarn
    }
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('variant "count" does not define value "1"')
  })
})

function generatedCaseFromShape(
  slotCount: number,
  variantCount: number,
  compoundCount: number,
  shape: {
    readonly defaultIndexes: ReadonlyArray<number>
    readonly selectionModes: ReadonlyArray<SelectionMode>
    readonly slotKinds: ReadonlyArray<"view" | "text" | "image">
    readonly valueCounts: ReadonlyArray<number>
  },
): GeneratedCase {
  let nextStyleId = 0
  const slots = Object.fromEntries(Array.from({length: slotCount}, (_, index) => [
    `slot${index}`,
    shape.slotKinds[index] ?? "view",
  ]))
  const slotNames = Object.keys(slots)
  const createBranch = (include: (slotIndex: number) => boolean): Record<string, object> => {
    const entries: Array<readonly [string, object]> = []
    slotNames.forEach((slot, slotIndex) => {
      if (include(slotIndex)) entries.push([slot, Object.freeze({opacity: nextStyleId++})])
    })
    return Object.fromEntries(entries)
  }

  const base = createBranch(slotIndex => slotIndex % 2 === 0)
  const variants: Record<string, Record<string, Record<string, object>>> = {}
  const defaultVariants: Record<string, string> = {}
  const selection: Record<string, unknown> = {}

  for (let variantIndex = 0; variantIndex < variantCount; variantIndex += 1) {
    const variantName = `variant${variantIndex}`
    const valueCount = shape.valueCounts[variantIndex] ?? 1
    const values: Record<string, Record<string, object>> = {}
    const valueNames = Array.from({length: valueCount}, (_, index) => `value${index}`)
    const defaultValue = valueNames[(shape.defaultIndexes[variantIndex] ?? 0) % valueCount]!
    defaultVariants[variantName] = defaultValue

    valueNames.forEach((valueName, valueIndex) => {
      values[valueName] = createBranch(slotIndex =>
        (slotIndex + variantIndex + valueIndex) % 3 !== 0,
      )
    })
    variants[variantName] = values

    const selectionMode = shape.selectionModes[variantIndex] ?? "omit"
    if (selectionMode === "default") selection[variantName] = defaultValue
    else if (selectionMode === "next") {
      selection[variantName] = valueNames[(valueNames.indexOf(defaultValue) + 1) % valueCount]!
    } else if (selectionMode === "invalid") selection[variantName] = `invalid-${variantName}`
  }

  const compoundVariants = Array.from({length: compoundCount}, (_, compoundIndex) => {
    const requirementCount = variantCount === 0 ? 0 : compoundIndex % (variantCount + 1)
    const requirements: Record<string, string> = {}
    for (let requirementIndex = 0; requirementIndex < requirementCount; requirementIndex += 1) {
      const variantIndex = (compoundIndex + requirementIndex) % variantCount
      const variantName = `variant${variantIndex}`
      const valueNames = Object.keys(variants[variantName]!)
      requirements[variantName] = valueNames[(compoundIndex + requirementIndex) % valueNames.length]!
    }
    return {
      variants: requirements,
      styles: createBranch(slotIndex => (slotIndex + compoundIndex) % 2 === 1),
    }
  })

  const recipe = {
    $$type: "crumbs.css.component-recipe",
    version: 1,
    slots,
    ...(Object.keys(base).length === 0 ? {} : {base}),
    variants,
    defaultVariants,
    compoundVariants,
  } as unknown as NativeComponentRecipeDescriptor
  return {recipe, selection}
}

function referenceResolve(
  recipe: NativeComponentRecipeDescriptor,
  selection: Readonly<Record<string, unknown>>,
): Readonly<Record<string, ReadonlyArray<NativeStyle>>> {
  const selected = {...recipe.defaultVariants, ...selection}
  const collected = Object.fromEntries(Object.keys(recipe.slots).map(slot => [slot, [] as NativeStyle[]])) as Record<string, NativeStyle[]>
  const append = (branch: unknown): void => {
    for (const [slot, style] of Object.entries(branch as Record<string, unknown>)) {
      collected[slot]?.push(style as NativeStyle)
    }
  }

  if (recipe.base !== undefined) append(recipe.base)
  const variants = recipe.variants as Record<string, Record<string, unknown>>
  for (const [variantName, values] of Object.entries(variants)) {
    const value = selected[variantName]
    if ((typeof value !== "string" && typeof value !== "boolean") || !Object.hasOwn(values, String(value))) continue
    append(values[String(value)])
  }

  for (const compound of recipe.compoundVariants) {
    const requirements = compound.variants as Record<string, unknown>
    if (Object.entries(requirements).every(([name, value]) => selected[name] === value)) append(compound.styles)
  }

  return Object.freeze(Object.fromEntries(Object.keys(recipe.slots).map(slot => [
    slot,
    Object.freeze(collected[slot] ?? []),
  ])))
}

function withoutWarnings<T>(run: () => T): T {
  const originalWarn = console.warn
  console.warn = () => undefined
  try {
    return run()
  } finally {
    console.warn = originalWarn
  }
}
