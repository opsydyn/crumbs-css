import { existsSync } from "node:fs"
import { resolve } from "node:path"
import type { NativeRecipe, NativeStyle, NativeTheme } from "../src/native-style"
import { createTheme, createThemeContract } from "../src/native-style"
import {
  createRecipeResolver,
  createThemeTokenReference,
  resolveRecipeStyle,
  resolveThemeStyles,
} from "../src/theme-runtime"
import { transformCssTsToStyleSheet } from "../src/transformer"
import {
  assertBenchmarkBudget,
  type BenchmarkMetric,
  formatMetric,
  measureAsync,
  measureSync,
} from "./perf-harness"

type ButtonVariants = {
  readonly disabled: {
    readonly false: NativeStyle
    readonly true: NativeStyle
  }
  readonly fullWidth: {
    readonly false: NativeStyle
    readonly true: NativeStyle
  }
  readonly pressed: {
    readonly false: NativeStyle
    readonly true: NativeStyle
  }
  readonly size: {
    readonly md: NativeStyle
    readonly sm: NativeStyle
  }
  readonly tone: {
    readonly danger: NativeStyle
    readonly primary: NativeStyle
    readonly secondary: NativeStyle
  }
}
type ButtonSelection = {
  readonly disabled: boolean
  readonly fullWidth: boolean
  readonly pressed: boolean
  readonly size: "md" | "sm"
  readonly tone: "danger" | "primary" | "secondary"
}

const contract = createThemeContract({
  color: {
    accent: null,
    border: null,
    danger: null,
    text: null,
  },
  radius: {
    md: null,
  },
  space: {
    md: null,
    sm: null,
  },
})

const theme = createTheme(contract, {
  color: {
    accent: "#a43628",
    border: "#4a3520",
    danger: "#b94133",
    text: "#1f1610",
  },
  radius: {
    md: 10,
  },
  space: {
    md: 16,
    sm: 8,
  },
})

const recipe = {
  $$debugName: "benchButton",
  $$type: "crumbs.css.recipe",
  base: {
    backgroundColor: "#a43628",
    borderRadius: 10,
    minHeight: 48,
    paddingBottom: 12,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 12,
  },
  compoundVariants: [
    {
      style: { opacity: 0.5 },
      variants: { disabled: true, tone: "primary" },
    },
  ],
  defaultVariants: {
    disabled: false,
    fullWidth: true,
    pressed: false,
    size: "md",
    tone: "primary",
  },
  variants: {
    disabled: {
      false: {},
      true: { opacity: 0.64 },
    },
    fullWidth: {
      false: { width: "auto" },
      true: { width: "100%" },
    },
    pressed: {
      false: {},
      true: { opacity: 0.82 },
    },
    size: {
      md: {},
      sm: {
        minHeight: 40,
        paddingBottom: 8,
        paddingLeft: 14,
        paddingRight: 14,
        paddingTop: 8,
      },
    },
    tone: {
      danger: { backgroundColor: "#b94133" },
      primary: { backgroundColor: "#a43628" },
      secondary: {
        backgroundColor: "transparent",
        borderColor: "#4a3520",
        borderWidth: 1,
      },
    },
  },
} as NativeRecipe<ButtonVariants>

const themedRecipeModule = {
  button: {
    ...recipe,
    base: {
      ...recipe.base,
      backgroundColor: createThemeTokenReference("--crumbs-color-accent"),
      borderRadius: createThemeTokenReference("--crumbs-radius-md"),
      paddingLeft: createThemeTokenReference("--crumbs-space-md"),
      paddingRight: createThemeTokenReference("--crumbs-space-md"),
    },
    variants: {
      ...recipe.variants,
      tone: {
        danger: { backgroundColor: createThemeTokenReference("--crumbs-color-danger") },
        primary: { backgroundColor: createThemeTokenReference("--crumbs-color-accent") },
        secondary: {
          backgroundColor: "transparent",
          borderColor: createThemeTokenReference("--crumbs-color-border"),
          borderWidth: 1,
        },
      },
    },
  } as unknown as NativeRecipe<ButtonVariants>,
} satisfies { readonly button: NativeRecipe<ButtonVariants> }

const styleModule = Object.fromEntries(
  Array.from({ length: 240 }, (_, index) => [
    `style${index}`,
    {
      color: createThemeTokenReference("--crumbs-color-text"),
      marginBottom: index % 2 === 0 ? createThemeTokenReference("--crumbs-space-sm") : 0,
      padding: createThemeTokenReference("--crumbs-space-md"),
    },
  ]),
)

let selectionIndex = 0
const selections = [
  { disabled: false, fullWidth: true, pressed: false, size: "md", tone: "primary" },
  { disabled: false, fullWidth: true, pressed: true, size: "md", tone: "primary" },
  { disabled: true, fullWidth: true, pressed: false, size: "md", tone: "primary" },
  { disabled: false, fullWidth: false, pressed: false, size: "sm", tone: "danger" },
  { disabled: false, fullWidth: true, pressed: false, size: "md", tone: "secondary" },
] satisfies ReadonlyArray<ButtonSelection>

function nextSelection(): ButtonSelection {
  const selection = selections[selectionIndex % selections.length]
  if (selection === undefined) throw new Error("Benchmark selections must not be empty")
  selectionIndex += 1
  return selection
}

function rawStyleSelection(): ReadonlyArray<NativeStyle | undefined> {
  const selection = nextSelection()
  return [
    recipe.base,
    recipe.variants.disabled[String(selection.disabled) as "false" | "true"],
    recipe.variants.fullWidth[String(selection.fullWidth) as "false" | "true"],
    recipe.variants.pressed[String(selection.pressed) as "false" | "true"],
    recipe.variants.size[selection.size],
    recipe.variants.tone[selection.tone],
  ]
}

const resolveButton = createRecipeResolver(recipe)
const themedStyles = resolveThemeStyles(
  themedRecipeModule,
  theme as NativeTheme<Record<string, unknown>>,
)
const resolveThemedButton = createRecipeResolver(themedStyles.button)

const packageRoot = resolve(import.meta.dir, "..")
const recipeFixture = resolve(packageRoot, "examples", "recipe.css.ts")
const grimButtonFixture = resolve(
  packageRoot,
  "..",
  "..",
  "apps",
  "native",
  "styles",
  "grim-button.css.ts",
)
const nativeAppRoot = resolve(packageRoot, "..", "..", "apps", "native")
const hasNativeAppBenchFixture = existsSync(grimButtonFixture) && existsSync(nativeAppRoot)

const metrics: BenchmarkMetric[] = [
  measureSync({
    budget: { maxP95Ms: 0.0025, minHz: 400_000 },
    iterationsPerSample: 25_000,
    name: "raw style array selection",
    run: rawStyleSelection,
    samples: 12,
  }),
  measureSync({
    budget: { maxP95Ms: 0.006, minHz: 150_000 },
    iterationsPerSample: 25_000,
    name: "resolveRecipeStyle selection",
    run: () => resolveRecipeStyle(recipe, nextSelection()),
    samples: 12,
  }),
  measureSync({
    budget: { maxP95Ms: 0.006, minHz: 150_000 },
    iterationsPerSample: 25_000,
    name: "createRecipeResolver selection",
    run: () => resolveButton(nextSelection()),
    samples: 12,
  }),
  measureSync({
    budget: { maxP95Ms: 0.0075, minHz: 125_000 },
    iterationsPerSample: 25_000,
    name: "themed recipe resolver selection",
    run: () => resolveThemedButton(nextSelection()),
    samples: 12,
  }),
  measureSync({
    budget: { maxP95Ms: 1.5 },
    iterationsPerSample: 20,
    name: "resolveThemeStyles 240 exports",
    run: () => resolveThemeStyles(styleModule, theme as NativeTheme<Record<string, unknown>>),
    samples: 12,
  }),
]

metrics.push(
  await measureAsync({
    budget: { maxP95Ms: 100 },
    iterationsPerSample: 1,
    name: "transform README recipe fixture",
    run: () => transformCssTsToStyleSheet(recipeFixture, packageRoot, { strictDiagnostics: true }),
    samples: 6,
    warmupIterations: 1,
  }),
)

if (hasNativeAppBenchFixture) {
  metrics.push(
    await measureAsync({
      budget: { maxP95Ms: 150 },
      iterationsPerSample: 1,
      name: "transform native GrimButton fixture",
      run: () =>
        transformCssTsToStyleSheet(grimButtonFixture, nativeAppRoot, {
          strictDiagnostics: true,
        }),
      samples: 6,
      warmupIterations: 1,
    }),
  )
}

for (const metric of metrics) {
  assertBenchmarkBudget(metric)
  console.log(formatMetric(metric))
}

console.log(JSON.stringify({ metrics }, null, 2))
