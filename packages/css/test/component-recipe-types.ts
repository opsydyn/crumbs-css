import {
  componentRecipe,
  componentRecipeFromRecipe,
  recipe,
  type NativeComponentRecipeProps,
  type NativeComponentResolvedStyles,
} from "../src/native-style"
import type {ImageStyle, TextStyle, ViewStyle} from "react-native"

const button = componentRecipe({
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
    disabled: {
      false: {root: {opacity: 1}},
      true: {root: {opacity: 0.5}},
    },
  },
  defaultVariants: {tone: "primary", disabled: false},
  compoundVariants: [{
    variants: {tone: "quiet", disabled: true},
    styles: {label: {opacity: 0.7}},
  }],
})

type ButtonProps = NativeComponentRecipeProps<typeof button>
const selection: ButtonProps = {tone: "quiet", disabled: true}
const resolved: NativeComponentResolvedStyles<typeof button.slots> = {
  root: [] as ReadonlyArray<ViewStyle>,
  label: [] as ReadonlyArray<TextStyle>,
  icon: [] as ReadonlyArray<ImageStyle>,
}
void [selection, resolved]

const legacy = componentRecipeFromRecipe(
  recipe({variants: {tone: {primary: {opacity: 1}}}}),
  {slot: "root"},
)
void legacy

// @ts-expect-error A text slot cannot accept image-only style properties.
componentRecipe({slots: {label: "text"} as const, base: {label: {resizeMode: "contain"}}, variants: {}})
// @ts-expect-error An image slot cannot accept text-only style properties.
componentRecipe({slots: {icon: "image"} as const, base: {icon: {fontWeight: "700"}}, variants: {}})
// @ts-expect-error Branch maps cannot name slots outside the declared slot set.
componentRecipe({slots: {root: "view"} as const, base: {label: {opacity: 1}}, variants: {}})

// @ts-expect-error Variant selection values come from the authored variant map.
const invalidSelection: ButtonProps = {tone: "danger"}
void invalidSelection

componentRecipe({
  slots: {root: "view"} as const,
  variants: {tone: {primary: {root: {opacity: 1}}}},
  // @ts-expect-error Defaults must select a value present in their variant map.
  defaultVariants: {tone: "danger"},
})

// @ts-expect-error Unsupported primitive kinds are rejected.
componentRecipe({slots: {root: "web"} as const, variants: {}})
