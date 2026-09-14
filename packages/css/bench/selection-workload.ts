import type { NativeRecipe, NativeRecipeSelection, NativeStyle, NativeTheme } from "../src/native-style"
import { createTheme, createThemeContract } from "../src/native-style"
import { createRecipeResolver, createThemeTokenReference, resolveThemeStyles } from "../src/theme-runtime"
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
type ButtonSelection = NativeRecipeSelection<ButtonVariants>

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

// Each comparison cycles the same defaults/partial/complete inputs independently.
const selections: ReadonlyArray<ButtonSelection> = [
  {}, { disabled: true }, { size: "sm" }, { tone: "secondary" },
  ...[false, true].flatMap(disabled => [false, true].flatMap(fullWidth =>
    [false, true].flatMap(pressed => (["md", "sm"] as const).flatMap(size =>
      (["primary", "danger", "secondary"] as const).map(tone => ({ disabled, fullWidth, pressed, size, tone })))))),
]

// Handwritten baseline, independent of the recipe resolver. Same valid-input work:
// merge defaults, select in variant order, append matching compounds, filter gaps.
function rawStyleSelection(selection: ButtonSelection): ReadonlyArray<NativeStyle> {
  const selected = { ...recipe.defaultVariants, ...selection }
  const styles: Array<NativeStyle | undefined> = [recipe.base]
  if (selected.disabled !== undefined) styles.push(recipe.variants.disabled[String(selected.disabled) as "false" | "true"])
  if (selected.fullWidth !== undefined) styles.push(recipe.variants.fullWidth[String(selected.fullWidth) as "false" | "true"])
  if (selected.pressed !== undefined) styles.push(recipe.variants.pressed[String(selected.pressed) as "false" | "true"])
  if (selected.size !== undefined) styles.push(recipe.variants.size[selected.size])
  if (selected.tone !== undefined) styles.push(recipe.variants.tone[selected.tone])
  if (selected.disabled === true && selected.tone === "primary") styles.push(recipe.compoundVariants![0]!.style)
  return styles.filter((style): style is NativeStyle => style !== undefined)
}

const resolveButton = createRecipeResolver(recipe)
const themedStyles = resolveThemeStyles(
  themedRecipeModule,
  theme as NativeTheme<Record<string, unknown>>,
)
const resolveThemedButton = createRecipeResolver(themedStyles.button)


export function makeSelectionRun<T>(select: (selection: ButtonSelection) => T): () => T {
  let index = 0
  return () => select(selections[index++ % selections.length]!)
}
export { recipe, rawStyleSelection, selections, styleModule, theme, resolveButton, resolveThemedButton, themedRecipeModule }
