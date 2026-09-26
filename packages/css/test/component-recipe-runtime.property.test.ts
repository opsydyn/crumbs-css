import {describe, expect, it} from "bun:test"
import fc from "fast-check"
import type {NativeComponentRecipeDescriptor} from "../src/components"
import type {NativeStyle} from "../src/native-style"
import {
  createComponentRecipeResolutionPlan,
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
type GeneratedStateSelection = {
  readonly kind: "default" | "non-default" | "prohibited-dependent" | "unknown-discriminator" | "missing-dependent-values"
  readonly selection: Readonly<Record<string, unknown>>
  readonly invalid: boolean
}
type GeneratedStateCase = {
  readonly recipe: NativeComponentRecipeDescriptor
  readonly selections: ReadonlyArray<GeneratedStateSelection>
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

const generatedStateCaseArbitrary = fc.integer({min: 2, max: 4}).chain(statusCount =>
  fc.integer({min: 2, max: 4}).chain(toneCount => {
    const fullMask = (1 << toneCount) - 1
    const properToneMasks = Array.from({length: fullMask - 1}, (_, index) => index + 1)
    const defaultCaseMasks = properToneMasks.filter(mask => (mask & 1) !== 0)
    const nonDefaultCaseMasks = properToneMasks.filter(mask => (mask & 1) === 0)
    return fc.record({
      slotCount: fc.integer({min: 1, max: 4}),
      compoundCount: fc.integer({min: 0, max: 4}),
      defaultCaseMask: fc.constantFrom(...defaultCaseMasks),
      nonDefaultCaseMask: fc.constantFrom(...nonDefaultCaseMasks),
      otherCaseMasks: fc.array(fc.constantFrom(...properToneMasks), {
        minLength: statusCount - 2,
        maxLength: statusCount - 2,
      }),
      otherBusyValues: fc.array(fc.boolean(), {
        minLength: statusCount - 2,
        maxLength: statusCount - 2,
      }),
    }).map(shape => makeGeneratedStateCase(statusCount, toneCount, shape))
  }),
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

  it("agrees with the independent evaluator across generated v2 state selections", () => {
    let generatedRecipeIndex = 0
    fc.assert(
      fc.property(generatedStateCaseArbitrary, ({recipe: generatedRecipe, selections}) => {
        const recipe = {
          ...generatedRecipe,
          $$debugName: `generatedStateRecipe${generatedRecipeIndex++}`,
        } as NativeComponentRecipeDescriptor
        const resolver = createComponentRecipeResolver(recipe, {cacheSize: 0})
        expect(selections.map(({kind}) => kind)).toEqual([
          "default",
          "non-default",
          "prohibited-dependent",
          "unknown-discriminator",
          "missing-dependent-values",
        ])
        const warnings = captureWarnings(() => {
          for (const {selection, invalid} of selections) {
            const expected = referenceResolve(recipe, selection)
            const resolvedDirectly = resolveComponentRecipeStyles(recipe, selection as never)
            const resolvedWithoutCache = resolver(selection as never)

            expect(resolvedDirectly).toEqual(expected)
            expect(resolvedWithoutCache).toEqual(expected)
            expect(Object.isFrozen(resolvedDirectly)).toBe(true)
            expect(Object.isFrozen(resolvedWithoutCache)).toBe(true)
            expect(Object.keys(resolvedWithoutCache)).toEqual(Object.keys(recipe.slots))
            for (const slot of Object.keys(recipe.slots)) {
              const directSlot = resolvedDirectly[slot as keyof typeof resolvedDirectly]
              const actualSlot = resolvedWithoutCache[slot as keyof typeof resolvedWithoutCache]
              expect(directSlot).toBeDefined()
              expect(Object.isFrozen(directSlot)).toBe(true)
              expect(actualSlot).toBeDefined()
              expect(Object.isFrozen(actualSlot)).toBe(true)
              if (invalid) {
                const base = (recipe.base ?? {}) as Record<string, unknown>
                const expectedBase = base[slot] === undefined ? [] : [base[slot]]
                expect(actualSlot).toEqual(expectedBase as ReadonlyArray<NativeStyle>)
              }
            }
            if (invalid) expect(resolver({...selection} as never)).toEqual(expected)
          }
        })

        expect(warnings).toHaveLength(selections.filter(({invalid}) => invalid).length)
        expect(new Set(warnings).size).toBe(warnings.length)
        expect(warnings.every(message => message.includes("CRUMBS_CSS_INVALID_RECIPE_VARIANT"))).toBe(true)
        expect(warnings.every(message => message.includes(recipe.$$debugName!))).toBe(true)
      }),
      {numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED},
    )
  })

  it("matches an independent two-layer v3 composition oracle over public partial selections", () => {
    type Selection = {readonly tone?: string; readonly size?: string; readonly pressed?: boolean}
    const ownerDefaults = {tone: "neutral", size: "small", pressed: false} as const
    const baseExtensionDefaults = {tone: "brand"} as const
    const leafExtensionDefaults = {tone: "seasonal"} as const
    const ownerBase = {root: {padding: 4}}
    type OracleBranch = Readonly<{root: NativeStyle}>
    const authoredBranches = {
      tone: {
        neutral: {root: {backgroundColor: "white"}},
        brand: {root: {backgroundColor: "navy"}},
        seasonal: {root: {backgroundColor: "plum"}},
      },
      size: {small: {root: {minHeight: 32}}, large: {root: {minHeight: 44}}},
      pressed: {false: {root: {opacity: 1}}, true: {root: {opacity: 0.8}}},
    } satisfies Readonly<{
      tone: Readonly<Record<string, OracleBranch>>
      size: Readonly<Record<string, OracleBranch>>
      pressed: Readonly<Record<string, OracleBranch>>
    }>
    const stateRules: Readonly<Record<string, {readonly size: ReadonlyArray<string>}>> = {
      false: {size: ["small", "large"]},
      true: {size: ["large"]},
    }
    const authoredCompounds = [
      {matches: (selected: Readonly<Record<string, unknown>>) => selected.tone === "neutral" && selected.size === "large", style: {root: {borderColor: "gray"}}},
      {matches: (selected: Readonly<Record<string, unknown>>) => selected.tone === "brand" && selected.size === "large", style: {root: {borderWidth: 1}}},
      {matches: (selected: Readonly<Record<string, unknown>>) => selected.tone === "seasonal" && selected.pressed === true, style: {root: {borderRadius: 12}}},
    ]
    const baseSlotOverride = {root: {borderColor: "navy"}}
    const leafSlotOverride = {root: {borderColor: "plum"}}
    const identity = {owner: "@acme/ui", name: "PropertyOracleButton", version: 1} as const
    const ownerRecipe = {
      $$type: "crumbs.css.component-recipe",
      version: 3,
      contract: {
        identity,
        public: {slots: ["root"], variants: {tone: ["neutral"], size: ["small", "large"], pressed: ["false", "true"]}},
        extensionPoints: {defaults: ["tone"], variantValues: ["tone"], compoundVariants: true, slotStyles: ["root"]},
      },
      slots: {root: "view"},
      base: ownerBase,
      variants: {
        tone: {neutral: authoredBranches.tone.neutral},
        size: authoredBranches.size,
        pressed: authoredBranches.pressed,
      },
      defaultVariants: ownerDefaults,
      stateVariants: {pressed: {false: {size: ["small", "large"]}, true: {size: ["large"]}}},
      compoundVariants: [{variants: {tone: "neutral", size: "large"}, styles: authoredCompounds[0]!.style}],
    } as unknown as NativeComponentRecipeDescriptor
    const baseExtension = {
      $$type: "crumbs.css.component-recipe-extension",
      version: 1,
      identity: {owner: "@acme/brand", name: "PropertyOracleBrand", version: 1},
      componentIdentity: identity,
      defaultVariants: baseExtensionDefaults,
      variants: {tone: {brand: authoredBranches.tone.brand}},
      compoundVariants: [{variants: {tone: "brand", size: "large"}, styles: authoredCompounds[1]!.style}],
      slotOverrides: baseSlotOverride,
    } as const
    const leafExtension = {
      $$type: "crumbs.css.component-recipe-extension",
      version: 1,
      identity: {owner: "@acme/product", name: "PropertyOracleSeasonal", version: 1},
      componentIdentity: identity,
      parentExtensionIdentity: baseExtension.identity,
      defaultVariants: leafExtensionDefaults,
      variants: {tone: {seasonal: authoredBranches.tone.seasonal}},
      compoundVariants: [{variants: {tone: "seasonal", pressed: true}, styles: authoredCompounds[2]!.style}],
      slotOverrides: leafSlotOverride,
    } as const

    const referenceResolve = (input: Selection): Readonly<{root: ReadonlyArray<NativeStyle>}> => {
      const selected = {...ownerDefaults, ...baseExtensionDefaults, ...leafExtensionDefaults, ...input}
      const stateRule = stateRules[String(selected.pressed)]
      if (stateRule === undefined || !stateRule.size.includes(String(selected.size))) {
        return {root: Object.freeze([ownerBase.root as NativeStyle])}
      }

      const root: NativeStyle[] = [ownerBase.root as NativeStyle]
      for (const axis of ["tone", "size"] as const) {
        const branches = authoredBranches[axis] as Readonly<Record<string, OracleBranch>>
        const branch = branches[String(selected[axis])]
        if (branch !== undefined) root.push(branch.root)
      }
      const pressedBranch = (authoredBranches.pressed as Readonly<Record<string, OracleBranch>>)[String(selected.pressed)]!
      root.push(pressedBranch.root)
      for (const compound of authoredCompounds) {
        if (compound.matches(selected)) root.push(compound.style.root)
      }
      for (const override of [baseSlotOverride, leafSlotOverride]) root.push(override.root)
      return {root: Object.freeze(root)}
    }

    const partialSelection = fc.record({
      tone: fc.option(fc.constantFrom("neutral", "brand", "seasonal"), {nil: undefined}),
      size: fc.option(fc.constantFrom("small", "large"), {nil: undefined}),
      pressed: fc.option(fc.boolean(), {nil: undefined}),
    }).map(fields => Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)))
    const selection = fc.oneof(partialSelection, fc.constant({pressed: true, size: "small"}))
    const resolver = createComponentRecipeResolver(ownerRecipe, {extensions: [baseExtension, leafExtension]})

    expect(resolver.plan.defaultSelection).toEqual({
      ...ownerDefaults,
      ...baseExtensionDefaults,
      ...leafExtensionDefaults,
    })
    fc.assert(fc.property(selection, input => {
      expect(withoutWarnings(() => resolver(input as never))).toEqual(referenceResolve(input as Selection))
    }), {seed: 20260923, numRuns: 200})
  })

  it("keeps resolution plans proportional to authored branches rather than variant products", () => {
    const createSizingCase = (axisCount: number, valueCount: number, compoundCount: number) => {
      const axes = Array.from({length: axisCount}, (_, index) => `axis${index}`)
      const values = Object.fromEntries(axes.map(axis => [
        axis,
        Array.from({length: valueCount}, (_, index) => `value${index}`),
      ]))
      const variants = Object.fromEntries(axes.map(axis => [axis, Object.fromEntries(
        values[axis]!.map((value, index) => [value, {root: {opacity: index / (valueCount + 1)}}]),
      )]))
      const recipe = {
        $$type: "crumbs.css.component-recipe",
        version: 3,
        contract: {
          identity: {owner: "@acme/ui", name: `PlanSize${axisCount}x${valueCount}`, version: 1},
          public: {slots: ["root"], variants: values},
          extensionPoints: {defaults: ["axis0"], variantValues: ["axis0"], compoundVariants: true, slotStyles: ["root"]},
        },
        slots: {root: "view"},
        base: {root: {padding: 1}},
        variants,
        defaultVariants: Object.fromEntries(axes.map(axis => [axis, values[axis]![0]])),
        compoundVariants: Array.from({length: compoundCount}, (_, index) => {
          const axis = axes[index % axisCount]!
          return {variants: {[axis]: values[axis]![index % valueCount]}, styles: {root: {borderWidth: index + 1}}}
        }),
      } as unknown as NativeComponentRecipeDescriptor
      const componentIdentity = recipe.contract!.identity
      const extensions = [0, 1].map(index => {
        const extensionIdentity = {owner: index === 0 ? "@acme/brand" : "@acme/product", name: `PlanSizeExtension${index}`, version: 1}
        const extension = {
          $$type: "crumbs.css.component-recipe-extension",
          version: 1,
          identity: extensionIdentity,
          componentIdentity,
          ...(index === 0 ? {} : {parentExtensionIdentity: {owner: "@acme/brand", name: "PlanSizeExtension0", version: 1}}),
          defaultVariants: {axis0: `extension${index}`},
          variants: {axis0: {[`extension${index}`]: {root: {opacity: 0.8 + index / 10}}}},
          compoundVariants: [{variants: {axis0: `extension${index}`}, styles: {root: {borderRadius: index + 1}}}],
          slotOverrides: {root: {padding: index + 2}},
        }
        return extension
      })
      return {recipe, extensions, axes, valueCount, compoundCount}
    }
    const containerSizes = (
      value: unknown,
      path = "plan",
      sizes: Array<{readonly path: string; readonly size: number}> = [],
      visited = new Set<object>(),
    ): Array<{readonly path: string; readonly size: number}> => {
      if (typeof value !== "object" || value === null || visited.has(value)) return sizes
      visited.add(value)
      if (Array.isArray(value)) {
        sizes.push({path, size: value.length})
        value.forEach((entry, index) => containerSizes(entry, `${path}[${index}]`, sizes, visited))
      } else {
        const entries = Object.entries(value)
        if (!/^plan\.extensionPlan\.extensions\[\d+\]$/.test(path)) {
          sizes.push({path, size: entries.length})
        }
        for (const [key, entry] of entries) containerSizes(entry, `${path}.${key}`, sizes, visited)
      }
      return sizes
    }

    for (const {recipe, extensions, axes, valueCount, compoundCount} of [
      createSizingCase(2, 3, 2),
      createSizingCase(4, 5, 4),
    ]) {
      const plan = createComponentRecipeResolutionPlan(recipe, {extensions: extensions as never})
      const expectedProduct = valueCount ** axes.length
      const expectedBranchCounts = axes.map((_, index) => valueCount + (index === 0 ? extensions.length : 0))
      const plannedBranchCount = plan.variants.reduce((count, variant) => count + Object.keys(variant.values).length, 0)
      const authoredBranchCount = axes.length * valueCount + extensions.length
      const authoredCompoundCount = compoundCount + extensions.length

      expect(plan.variants.map(variant => Object.keys(variant.values).length)).toEqual(expectedBranchCounts)
      expect(plannedBranchCount).toBe(authoredBranchCount)
      expect(plan.compoundMatchers).toHaveLength(authoredCompoundCount)
      expect(plan.compoundMatchers.reduce((count, matcher) => count + matcher.requirements.length, 0))
        .toBe(authoredCompoundCount)
      expect(plan.extensionPlan?.extensions).toHaveLength(extensions.length)
      expect(plan.extensionPlan?.compoundVariants).toHaveLength(extensions.length)
      expect(plan.extensionPlan?.slotOverrides).toHaveLength(extensions.length)
      expect(containerSizes(plan).filter(({size}) => size === expectedProduct)).toEqual([])
    }
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

function makeGeneratedStateCase(
  statusCount: number,
  toneCount: number,
  shape: {
    readonly slotCount: number
    readonly compoundCount: number
    readonly defaultCaseMask: number
    readonly nonDefaultCaseMask: number
    readonly otherCaseMasks: ReadonlyArray<number>
    readonly otherBusyValues: ReadonlyArray<boolean>
  },
): GeneratedStateCase {
  let nextStyleId = 0
  const slots = Object.fromEntries(Array.from({length: shape.slotCount}, (_, index) => [
    `slot${index}`,
    (["view", "text", "image"] as const)[index % 3]!,
  ]))
  const slotNames = Object.keys(slots)
  const makeBranch = (): Record<string, object> => Object.fromEntries(slotNames.map(slot => [
    slot,
    Object.freeze({opacity: nextStyleId++}),
  ]))
  const statusNames = Array.from({length: statusCount}, (_, index) => `status${index}`)
  const toneNames = Array.from({length: toneCount}, (_, index) => `tone${index}`)
  const toneMasks = [shape.defaultCaseMask, shape.nonDefaultCaseMask, ...shape.otherCaseMasks]
  const busyValues = [false, true, ...shape.otherBusyValues]
  const variants = {
    status: Object.fromEntries(statusNames.map(status => [status, makeBranch()])),
    busy: {
      false: makeBranch(),
      true: makeBranch(),
    },
    tone: Object.fromEntries(toneNames.map(tone => [tone, makeBranch()])),
  }
  const cases = Object.fromEntries(statusNames.map((status, caseIndex) => [
    status,
    {
      busy: [busyValues[caseIndex]!],
      tone: toneNames.filter((_, toneIndex) => (toneMasks[caseIndex]! & (1 << toneIndex)) !== 0),
    },
  ]))
  const defaultTone = toneNames[0]!
  const nonDefaultAllowedTones = toneNames.filter((_, toneIndex) =>
    (shape.nonDefaultCaseMask & (1 << toneIndex)) !== 0,
  )
  const nonDefaultDisallowedTone = toneNames.find((_, toneIndex) =>
    (shape.nonDefaultCaseMask & (1 << toneIndex)) === 0,
  )!
  const compoundVariants = Array.from({length: shape.compoundCount}, (_, index) => ({
    variants: index === 0 ? {status: statusNames[1]!} : {},
    styles: makeBranch(),
  }))
  const recipe = {
    $$type: "crumbs.css.component-recipe",
    version: 2,
    slots,
    base: makeBranch(),
    variants,
    defaultVariants: {status: statusNames[0]!, busy: false, tone: defaultTone},
    stateVariants: {status: cases},
    compoundVariants,
  } as unknown as NativeComponentRecipeDescriptor
  const selections: ReadonlyArray<GeneratedStateSelection> = [
    {kind: "default", selection: {}, invalid: false},
    {
      kind: "non-default",
      selection: {status: statusNames[1]!, busy: true, tone: nonDefaultAllowedTones[0]!},
      invalid: false,
    },
    {
      kind: "prohibited-dependent",
      selection: {status: statusNames[1]!, busy: true, tone: nonDefaultDisallowedTone},
      invalid: true,
    },
    {
      kind: "unknown-discriminator",
      selection: {status: "unknown-status", busy: true, tone: nonDefaultAllowedTones[0]!},
      invalid: true,
    },
    {kind: "missing-dependent-values", selection: {status: statusNames[1]!}, invalid: true},
  ]

  return {recipe, selections}
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
  const freezeResult = (): Readonly<Record<string, ReadonlyArray<NativeStyle>>> =>
    Object.freeze(Object.fromEntries(Object.keys(recipe.slots).map(slot => [
      slot,
      Object.freeze(collected[slot] ?? []),
    ])))

  if (recipe.base !== undefined) append(recipe.base)
  if (recipe.version === 2 && recipe.stateVariants !== undefined) {
    const stateVariants = recipe.stateVariants as Record<
      string,
      Record<string, Record<string, ReadonlyArray<unknown>>>
    >
    const [discriminator, cases] = Object.entries(stateVariants)[0] ?? []
    if (discriminator !== undefined) {
      const caseName = String(selected[discriminator])
      const stateCase = Object.entries(cases ?? {}).find(([value]) => value === caseName)?.[1]
      if (stateCase === undefined || Object.entries(stateCase).some(([axis, allowedValues]) =>
        !allowedValues.includes(selected[axis]))) return freezeResult()
    }
  }

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

  return freezeResult()
}

function captureWarnings(run: () => void): ReadonlyArray<string> {
  const warnings: string[] = []
  const originalWarn = console.warn
  console.warn = (...args: ReadonlyArray<unknown>) => warnings.push(args.map(String).join(" "))
  try {
    run()
  } finally {
    console.warn = originalWarn
  }
  return warnings
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
