import { describe, expect, it } from "bun:test"
import type {
  NativeRecipe,
  NativeRecipeSelection,
  NativeRecipeVariantsConfig,
  NativeStyle,
} from "@crumbs/css/style"
import { createRecipeResolver, resolveRecipeStyle } from "@crumbs/css/theme"
import fc from "fast-check"

type SelectionValue = boolean | string
type VariantSpec = {
  readonly defaultValue: SelectionValue
  readonly name: string
  readonly selectedValue?: SelectionValue
  readonly values: ReadonlyArray<SelectionValue>
}
type RecipeCase = {
  readonly recipe: NativeRecipe<NativeRecipeVariantsConfig>
  readonly selection: NativeRecipeSelection<NativeRecipeVariantsConfig>
}

const PROPERTY_RUNS = 100
const PROPERTY_SEED = 20260509

const recipeCaseArbitrary = fc.integer({ max: 4, min: 1 }).chain((variantCount) =>
  fc
    .record({
      compoundCount: fc.integer({ max: 5, min: 0 }),
      defaultIndexes: fc.array(fc.integer({ max: 7, min: 0 }), {
        maxLength: variantCount,
        minLength: variantCount,
      }),
      selectionModes: fc.array(fc.constantFrom("omit", "default", "next", "invalid"), {
        maxLength: variantCount,
        minLength: variantCount,
      }),
      valueCounts: fc.array(fc.integer({ max: 4, min: 1 }), {
        maxLength: variantCount,
        minLength: variantCount,
      }),
    })
    .map((shape) => recipeCaseFromShape(variantCount, shape)),
)

describe("native recipe runtime properties", () => {
  it("preserves base, variant order, compound order, and resolver equivalence", () => {
    fc.assert(
      fc.property(recipeCaseArbitrary, ({ recipe, selection }) => {
        const expected = expectedRecipeStyleIds(recipe, selection)
        const resolved = withSilencedWarnings(() => resolveRecipeStyle(recipe, selection))
        const resolvedFromResolver = withSilencedWarnings(() =>
          createRecipeResolver(recipe)(selection),
        )

        expect(styleIds(resolved)).toEqual(expected)
        expect(resolvedFromResolver).toEqual(resolved)
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })
})

function recipeCaseFromShape(
  variantCount: number,
  shape: {
    readonly compoundCount: number
    readonly defaultIndexes: ReadonlyArray<number>
    readonly selectionModes: ReadonlyArray<"default" | "invalid" | "next" | "omit">
    readonly valueCounts: ReadonlyArray<number>
  },
): RecipeCase {
  const variantSpecs = Array.from({ length: variantCount }, (_, index) =>
    variantSpecFromShape({
      defaultIndex: shape.defaultIndexes[index] ?? 0,
      index,
      selectionMode: shape.selectionModes[index] ?? "omit",
      valueCount: shape.valueCounts[index] ?? 1,
    }),
  )
  const recipe = nativeRecipeFromSpecs(variantSpecs, shape.compoundCount)
  const selection = selectionFromSpecs(variantSpecs)
  return { recipe, selection }
}

function variantSpecFromShape({
  defaultIndex,
  index,
  selectionMode,
  valueCount,
}: {
  readonly defaultIndex: number
  readonly index: number
  readonly selectionMode: "default" | "invalid" | "next" | "omit"
  readonly valueCount: number
}): VariantSpec {
  const values = index === 0 ? [false, true] : valuesForVariant(valueCount)
  const defaultValue = valueAt(values, defaultIndex)
  const selectedValue = selectedValueForMode(values, defaultValue, selectionMode)
  return {
    defaultValue,
    name: `variant${index}`,
    ...(selectedValue === undefined ? {} : { selectedValue }),
    values,
  }
}

function valuesForVariant(count: number): ReadonlyArray<string> {
  return Array.from({ length: count }, (_, index) => `value${index}`)
}

function valueAt(values: ReadonlyArray<SelectionValue>, index: number): SelectionValue {
  const value = values[index % values.length]
  if (value === undefined) {
    throw new Error("Recipe property generator produced an empty value set")
  }
  return value
}

function selectedValueForMode(
  values: ReadonlyArray<SelectionValue>,
  defaultValue: SelectionValue,
  mode: "default" | "invalid" | "next" | "omit",
): SelectionValue | undefined {
  if (mode === "omit") return undefined
  if (mode === "default") return defaultValue
  if (mode === "invalid") return "__invalid__"
  const nextIndex = (values.indexOf(defaultValue) + 1) % values.length
  return values[nextIndex] ?? defaultValue
}

function nativeRecipeFromSpecs(
  specs: ReadonlyArray<VariantSpec>,
  compoundCount: number,
): NativeRecipe<NativeRecipeVariantsConfig> {
  return {
    $$debugName: "propertyRecipe",
    $$type: "crumbs.css.recipe",
    base: styleWithId(0),
    compoundVariants: Array.from({ length: compoundCount }, (_, index) =>
      compoundVariantFromSpecs(specs, index),
    ),
    defaultVariants: Object.fromEntries(
      specs.map((spec) => [spec.name, spec.defaultValue]),
    ) as NativeRecipeSelection<NativeRecipeVariantsConfig>,
    variants: Object.fromEntries(
      specs.map((spec, variantIndex) => [
        spec.name,
        Object.fromEntries(
          spec.values.map((value, valueIndex) => [
            String(value),
            styleWithId(100 + variantIndex * 10 + valueIndex),
          ]),
        ),
      ]),
    ) as NativeRecipe<NativeRecipeVariantsConfig>["variants"],
  }
}

function compoundVariantFromSpecs(
  specs: ReadonlyArray<VariantSpec>,
  index: number,
): NativeRecipe<NativeRecipeVariantsConfig>["compoundVariants"][number] {
  return {
    style: styleWithId(1000 + index),
    variants:
      index % 2 === 0
        ? matchingCompoundSelection(specs, index)
        : nonMatchingCompoundSelection(specs),
  }
}

function matchingCompoundSelection(
  specs: ReadonlyArray<VariantSpec>,
  index: number,
): NativeRecipeSelection<NativeRecipeVariantsConfig> {
  const entries = specs
    .filter((_, specIndex) => (specIndex + index) % 2 === 0)
    .map((spec) => [spec.name, validEffectiveValue(spec)] as const)
  return Object.fromEntries(entries) as NativeRecipeSelection<NativeRecipeVariantsConfig>
}

function nonMatchingCompoundSelection(
  specs: ReadonlyArray<VariantSpec>,
): NativeRecipeSelection<NativeRecipeVariantsConfig> {
  const [firstSpec] = specs
  if (firstSpec === undefined) return {}
  return {
    [firstSpec.name]: nextValidValue(firstSpec.values, validEffectiveValue(firstSpec)),
  } as NativeRecipeSelection<NativeRecipeVariantsConfig>
}

function selectionFromSpecs(
  specs: ReadonlyArray<VariantSpec>,
): NativeRecipeSelection<NativeRecipeVariantsConfig> {
  const entries = specs.flatMap((spec) =>
    spec.selectedValue === undefined ? [] : [[spec.name, spec.selectedValue] as const],
  )
  return Object.fromEntries(entries) as NativeRecipeSelection<NativeRecipeVariantsConfig>
}

function validEffectiveValue(spec: VariantSpec): SelectionValue {
  return spec.selectedValue !== undefined && spec.values.includes(spec.selectedValue)
    ? spec.selectedValue
    : spec.defaultValue
}

function nextValidValue(
  values: ReadonlyArray<SelectionValue>,
  currentValue: SelectionValue,
): SelectionValue {
  const nextIndex = (values.indexOf(currentValue) + 1) % values.length
  return values[nextIndex] ?? currentValue
}

function expectedRecipeStyleIds(
  recipe: NativeRecipe<NativeRecipeVariantsConfig>,
  selection: NativeRecipeSelection<NativeRecipeVariantsConfig>,
): ReadonlyArray<number> {
  const selected = { ...recipe.defaultVariants, ...selection }
  const styles = [recipe.base]

  for (const [variantName, variantValues] of Object.entries(recipe.variants)) {
    const selectedValue = selected[variantName]
    if (selectedValue === undefined) continue
    styles.push(variantValues[String(selectedValue)])
  }

  for (const compoundVariant of recipe.compoundVariants) {
    if (compoundMatches(compoundVariant.variants, selected)) {
      styles.push(compoundVariant.style)
    }
  }

  return styleIds(styles.filter((style): style is NativeStyle => style !== undefined))
}

function compoundMatches(
  compoundSelection: NativeRecipeSelection<NativeRecipeVariantsConfig>,
  selection: Readonly<Record<string, SelectionValue | undefined>>,
): boolean {
  return Object.entries(compoundSelection).every(
    ([variantName, value]) => selection[variantName] === value,
  )
}

function styleWithId(id: number): NativeStyle {
  return { zIndex: id } as NativeStyle
}

function styleIds(styles: ReadonlyArray<NativeStyle | undefined>): ReadonlyArray<number> {
  return styles.map((style) => style?.zIndex as number)
}

function withSilencedWarnings<T>(run: () => T): T {
  const originalWarn = console.warn
  console.warn = () => {}
  try {
    return run()
  } finally {
    console.warn = originalWarn
  }
}
