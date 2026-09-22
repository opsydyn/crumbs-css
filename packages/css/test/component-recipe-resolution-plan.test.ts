import {describe, expect, it} from "bun:test"
import fc from "fast-check"
import type {NativeComponentRecipeDescriptor} from "../src/components"
import {createComponentRecipeResolutionPlan} from "../src/runtime/component-recipe-resolution-plan"

const PROPERTY_RUNS = 100
const PROPERTY_SEED = 20260923

const planCaseArbitrary = fc.record({
  compoundCount: fc.integer({min: 0, max: 5}),
  slotCount: fc.integer({min: 1, max: 4}),
  valueCounts: fc.array(fc.integer({min: 1, max: 3}), {minLength: 1, maxLength: 4}),
}).map(({compoundCount, slotCount, valueCounts}) =>
  makePlanCase(compoundCount, slotCount, valueCounts),
)
const statePlanCaseArbitrary = fc.integer({min: 2, max: 4}).chain(stateCount => {
  const toneCount = 10 - stateCount
  return fc.record({
    toneMasks: fc.array(fc.integer({min: 1, max: (1 << toneCount) - 1}), {
      minLength: stateCount,
      maxLength: stateCount,
    }),
    busyValues: fc.array(fc.boolean(), {
      minLength: stateCount,
      maxLength: stateCount,
    }),
  }).map(({toneMasks, busyValues}) =>
    makeStatePlanCase(stateCount, toneCount, toneMasks, busyValues),
  )
})

describe("component recipe resolution plan size laws", () => {
  it("keeps v1 compatibility and indexes only authored v2 state records", () => {
    const legacyPlan = createComponentRecipeResolutionPlan(makePlanCase(0, 1, [2]))
    const stateRecipe = makeStateRecipe()
    const plan = createComponentRecipeResolutionPlan(stateRecipe)
    const {stateVariants: _stateVariants, ...unconstrainedV2} = stateRecipe
    const unconstrainedPlan = createComponentRecipeResolutionPlan(
      unconstrainedV2 as unknown as NativeComponentRecipeDescriptor,
    )

    expect(legacyPlan.recipe.version).toBe(1)
    expect(plan.stateConstraint).toEqual({
      discriminator: "status",
      cases: [
        {value: "ready", constraints: [["busy", [false]], ["tone", ["primary", "quiet"]]]},
        {value: "loading", constraints: [["busy", [true]], ["tone", ["primary"]]]},
      ],
    })
    expect(Object.isFrozen(plan.stateConstraint)).toBe(true)
    expect(Object.isFrozen(plan.stateConstraint?.cases)).toBe(true)
    expect(Object.isFrozen(plan.stateConstraint?.cases[0]?.constraints)).toBe(true)
    expect(unconstrainedPlan.stateConstraint).toBeUndefined()
    expect(unconstrainedPlan.recipe.version).toBe(2)
  })

  it("rejects malformed state cases, invalid normalized defaults, and unknown descriptor versions", () => {
    const stateRecipe = makeStateRecipe()
    const malformedCases = [
      {status: {ready: {tone: ["primary"]}}},
      {status: {ready: {tone: ["primary"]}, loading: {}, disabled: {}}},
    ]

    for (const stateVariants of malformedCases) {
      expect(() => createComponentRecipeResolutionPlan({
        ...stateRecipe,
        stateVariants,
      } as unknown as NativeComponentRecipeDescriptor)).toThrow(/state(?:Variants| case)/i)
    }
    expect(() => createComponentRecipeResolutionPlan({
      ...stateRecipe,
      defaultVariants: {status: "ready", busy: true, tone: "primary"},
    } as unknown as NativeComponentRecipeDescriptor)).toThrow(/default selection.*violates/)
    expect(() => createComponentRecipeResolutionPlan({
      ...stateRecipe,
      version: 3,
    } as unknown as NativeComponentRecipeDescriptor)).toThrow(/Unsupported component recipe descriptor version/)
  })

  it("stores authored variants and slot branches exactly without product expansion", () => {
    fc.assert(
      fc.property(planCaseArbitrary, recipe => {
        const plan = createComponentRecipeResolutionPlan(recipe)
        const authoredVariants = recipe.variants as Record<string, Record<string, Record<string, unknown>>>
        const authoredVariantValueCount = Object.values(authoredVariants)
          .reduce((count, values) => count + Object.keys(values).length, 0)
        const plannedVariantValueCount = plan.variants
          .reduce((count, variant) => count + Object.keys(variant.values).length, 0)
        const authoredBranchRecordCount = (recipe.base === undefined ? 0 : 1) +
          authoredVariantValueCount + recipe.compoundVariants.length
        const plannedBranchRecordCount = (Object.keys(plan.base).length === 0 ? 0 : 1) +
          plannedVariantValueCount + plan.compoundMatchers.length
        const authoredSlotBranchCount = countSlotBranches(recipe.base) +
          Object.values(authoredVariants).reduce((count, values) => count +
            Object.values(values).reduce((valueCount, styles) => valueCount + Object.keys(styles).length, 0), 0) +
          recipe.compoundVariants.reduce((count, compound) => count + Object.keys(compound.styles).length, 0)
        const plannedSlotBranchCount = countSlotBranches(plan.base) +
          plan.variants.reduce((count, variant) => count + Object.values(variant.values)
            .reduce((valueCount, styles) => valueCount + Object.keys(styles).length, 0), 0) +
          plan.compoundMatchers.reduce((count, compound) => count + Object.keys(compound.styles).length, 0)
        expect(plan.variantOrder).toEqual(Object.keys(authoredVariants))
        expect(plannedVariantValueCount).toBe(authoredVariantValueCount)
        expect(plannedBranchRecordCount).toBe(authoredBranchRecordCount)
        expect(plannedBranchRecordCount).toBeLessThanOrEqual(authoredBranchRecordCount + recipe.compoundVariants.length)
        expect(plannedSlotBranchCount).toBe(authoredSlotBranchCount)
      }),
      {numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED},
    )
  })

  it("stores increasing state records linearly at a fixed authored branch count", () => {
    fc.assert(
      fc.property(statePlanCaseArbitrary, recipe => {
        const plan = createComponentRecipeResolutionPlan(recipe)
        const authoredVariants = recipe.variants as Record<string, Record<string, Record<string, unknown>>>
        const authoredVariantValueCount = Object.values(authoredVariants)
          .reduce((count, values) => count + Object.keys(values).length, 0)
        const plannedVariantValueCount = plan.variants
          .reduce((count, variant) => count + Object.keys(variant.values).length, 0)
        const authoredBranchRecordCount = (recipe.base === undefined ? 0 : 1) +
          authoredVariantValueCount + recipe.compoundVariants.length
        const plannedBranchRecordCount = (Object.keys(plan.base).length === 0 ? 0 : 1) +
          plannedVariantValueCount + plan.compoundMatchers.length
        const authoredSlotBranchCount = countSlotBranches(recipe.base) +
          Object.values(authoredVariants).reduce((count, values) => count +
            Object.values(values).reduce((valueCount, styles) => valueCount + Object.keys(styles).length, 0), 0) +
          recipe.compoundVariants.reduce((count, compound) => count + Object.keys(compound.styles).length, 0)
        const plannedSlotBranchCount = countSlotBranches(plan.base) +
          plan.variants.reduce((count, variant) => count + Object.values(variant.values)
            .reduce((valueCount, styles) => valueCount + Object.keys(styles).length, 0), 0) +
          plan.compoundMatchers.reduce((count, compound) => count + Object.keys(compound.styles).length, 0)
        const authoredCases = Object.values(
          recipe.stateVariants as Record<string, Record<string, Record<string, ReadonlyArray<unknown>>>>,
        )
        const authoredCaseCount = authoredCases.reduce((count, cases) => count + Object.keys(cases).length, 0)
        const authoredConstraintCount = authoredCases.reduce((count, cases) => count +
          Object.values(cases).reduce((caseCount, constraints) => caseCount + Object.keys(constraints).length, 0), 0)
        const authoredAllowedValueReferenceCount = authoredCases.reduce((count, cases) => count +
          Object.values(cases).reduce((caseCount, constraints) => caseCount +
            Object.values(constraints).reduce((constraintCount, values) => constraintCount + values.length, 0), 0), 0)
        const plannedCases = plan.stateConstraint?.cases ?? []
        const plannedConstraintCount = plannedCases.reduce((count, stateCase) =>
          count + stateCase.constraints.length, 0)
        const plannedAllowedValueReferenceCount = plannedCases.reduce((count, stateCase) =>
          count + stateCase.constraints.reduce((constraintCount, [, values]) => constraintCount + values.length, 0), 0)

        expect(authoredVariantValueCount).toBe(12)
        expect(plannedVariantValueCount).toBe(12)
        expect(authoredBranchRecordCount).toBe(15)
        expect(plannedBranchRecordCount).toBe(authoredBranchRecordCount)
        expect(authoredSlotBranchCount).toBe(45)
        expect(plannedSlotBranchCount).toBe(authoredSlotBranchCount)
        expect(plan.compoundMatchers).toHaveLength(2)
        expect(authoredCaseCount).toBeGreaterThanOrEqual(2)
        expect(authoredCaseCount).toBeLessThanOrEqual(4)
        expect(plannedCases).toHaveLength(authoredCaseCount)
        expect(authoredConstraintCount).toBe(authoredCaseCount * 2)
        expect(plannedConstraintCount).toBe(authoredConstraintCount)
        expect(plannedAllowedValueReferenceCount).toBe(authoredAllowedValueReferenceCount)
        expect(Object.keys(plan)).toEqual([
          "$$type",
          "version",
          "recipe",
          "slotOrder",
          "variantOrder",
          "selectionKeys",
          "defaultSelection",
          "base",
          "variants",
          "compoundMatchers",
          "stateConstraint",
        ])
      }),
      {numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED},
    )
  })

  it("keeps three four-valued variants as twelve branches rather than sixty-four combinations", () => {
    const v1Recipe = makePlanCase(2, 3, [4, 4, 4])
    const fourValues = ["value0", "value1", "value2", "value3"]
    const stateVariants = {
      variant0: Object.fromEntries(fourValues.map((value, index) => [
        value,
        {
          variant1: [fourValues[index]!, fourValues[(index + 1) % fourValues.length]!],
          variant2: [fourValues[index]!],
        },
      ])),
    }
    const recipe = {
      ...v1Recipe,
      version: 2,
      defaultVariants: {variant0: "value0", variant1: "value0", variant2: "value0"},
      stateVariants,
    } as unknown as NativeComponentRecipeDescriptor
    const plan = createComponentRecipeResolutionPlan(recipe)
    const planValueCount = plan.variants.reduce((count, variant) => count + Object.keys(variant.values).length, 0)
    const cartesianCombinationCount = Object.values(recipe.variants as Record<string, Record<string, unknown>>)
      .reduce((product, values) => product * Object.keys(values).length, 1)
    const stateConstraintCount = plan.stateConstraint?.cases.reduce((count, stateCase) =>
      count + stateCase.constraints.length, 0)
    const allowedValueReferenceCount = plan.stateConstraint?.cases.reduce((count, stateCase) =>
      count + stateCase.constraints.reduce((constraintCount, [, values]) => constraintCount + values.length, 0), 0)

    expect(Object.keys(recipe.slots)).toHaveLength(3)
    expect(plan.variants).toHaveLength(3)
    expect(planValueCount).toBe(12)
    expect(cartesianCombinationCount).toBe(64)
    expect(planValueCount).toBeLessThan(cartesianCombinationCount)
    expect(plan.stateConstraint?.cases).toHaveLength(4)
    expect(stateConstraintCount).toBe(8)
    expect(allowedValueReferenceCount).toBe(12)
    expect(Object.keys(plan)).not.toContain("products")
  })
})

function makeStateRecipe(): NativeComponentRecipeDescriptor & {readonly stateVariants: object} {
  return {
    $$type: "crumbs.css.component-recipe",
    version: 2,
    slots: {root: "view", label: "text"},
    base: {root: {id: "base-root"}, label: {id: "base-label"}},
    variants: {
      status: {
        ready: {root: {id: "status-ready"}},
        loading: {root: {id: "status-loading"}},
      },
      busy: {
        false: {label: {id: "busy-false"}},
        true: {label: {id: "busy-true"}},
      },
      tone: {
        primary: {root: {id: "tone-primary"}},
        quiet: {root: {id: "tone-quiet"}},
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
      styles: {label: {id: "loading-compound"}},
    }],
  } as unknown as NativeComponentRecipeDescriptor & {readonly stateVariants: object}
}

function makePlanCase(
  compoundCount: number,
  slotCount: number,
  valueCounts: ReadonlyArray<number>,
): NativeComponentRecipeDescriptor {
  const slots = Object.fromEntries(Array.from({length: slotCount}, (_, slotIndex) => [
    `slot${slotIndex}`,
    (["view", "text", "image"] as const)[slotIndex % 3]!,
  ]))
  const slotNames = Object.keys(slots)
  const makeStyles = (seed: number): Record<string, object> => Object.fromEntries(
    slotNames.filter((_, slotIndex) => (slotIndex + seed) % 2 === 0)
      .map((slot, slotIndex) => [slot, Object.freeze({id: seed * 10 + slotIndex, slot})]),
  )
  const base = makeStyles(1)
  const variants: Record<string, Record<string, Record<string, object>>> = {}
  valueCounts.forEach((valueCount, variantIndex) => {
    variants[`variant${variantIndex}`] = Object.fromEntries(Array.from({length: valueCount}, (_, valueIndex) => [
      `value${valueIndex}`,
      makeStyles(variantIndex * 10 + valueIndex),
    ]))
  })
  const compoundVariants = Array.from({length: compoundCount}, (_, index) => ({
    variants: valueCounts.length === 0 ? {} : {[`variant${index % valueCounts.length}`]: "value0"},
    styles: makeStyles(index + 20),
  }))
  return {
    $$type: "crumbs.css.component-recipe",
    version: 1,
    slots,
    ...(Object.keys(base).length === 0 ? {} : {base}),
    variants,
    defaultVariants: {},
    compoundVariants,
  } as unknown as NativeComponentRecipeDescriptor
}

function makeStatePlanCase(
  statusCount: number,
  toneCount: number,
  toneMasks: ReadonlyArray<number>,
  busyValues: ReadonlyArray<boolean>,
): NativeComponentRecipeDescriptor {
  const slots = {root: "view", label: "text", icon: "image"} as const
  const slotNames = Object.keys(slots)
  let nextStyleId = 0
  const makeStyles = (): Record<string, object> => Object.fromEntries(slotNames.map(slot => [
    slot,
    Object.freeze({id: nextStyleId++, slot}),
  ]))
  const statusValues = Array.from({length: statusCount}, (_, index) => `status${index}`)
  const toneValues = Array.from({length: toneCount}, (_, index) => `tone${index}`)
  const variants = {
    status: Object.fromEntries(statusValues.map(value => [value, makeStyles()])),
    tone: Object.fromEntries(toneValues.map(value => [value, makeStyles()])),
    busy: {false: makeStyles(), true: makeStyles()},
  }
  const stateCases = Object.fromEntries(statusValues.map((status, caseIndex) => [
    status,
    {
      tone: toneValues.filter((_, toneIndex) => (toneMasks[caseIndex]! & (1 << toneIndex)) !== 0),
      busy: [busyValues[caseIndex]!],
    },
  ]))
  const defaultTone = toneValues.find((_, toneIndex) => (toneMasks[0]! & (1 << toneIndex)) !== 0)!
  return {
    $$type: "crumbs.css.component-recipe",
    version: 2,
    slots,
    base: makeStyles(),
    variants,
    defaultVariants: {status: statusValues[0]!, tone: defaultTone, busy: busyValues[0]!},
    stateVariants: {status: stateCases},
    compoundVariants: [
      {variants: {status: statusValues[1]!}, styles: makeStyles()},
      {variants: {}, styles: makeStyles()},
    ],
  } as unknown as NativeComponentRecipeDescriptor
}

function countSlotBranches(value: unknown): number {
  if (value === undefined) return 0
  return Object.keys(value as Record<string, unknown>).length
}
