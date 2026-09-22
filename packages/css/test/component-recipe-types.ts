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

const constrainedButton = componentRecipe({
  slots: {root: "view"} as const,
  variants: {
    status: {
      ready: {root: {opacity: 1}},
      loading: {root: {opacity: 0.7}},
      disabled: {root: {opacity: 0.45}},
    },
    busy: {
      false: {root: {opacity: 1}},
      true: {root: {opacity: 0.7}},
    },
    tone: {
      primary: {root: {opacity: 1}},
      quiet: {root: {opacity: 0.8}},
    },
  },
  defaultVariants: {status: "ready", busy: false, tone: "primary"},
  stateVariants: {
    status: {
      ready: {busy: [false], tone: ["primary", "quiet"]},
      loading: {busy: [true], tone: ["primary"]},
      disabled: {busy: [false], tone: ["primary", "quiet"]},
    },
  },
})

type ConstrainedButtonProps = NativeComponentRecipeProps<typeof constrainedButton>
const defaultReady: ConstrainedButtonProps = {tone: "quiet"}
const explicitLoading: ConstrainedButtonProps = {status: "loading", busy: true}
// @ts-expect-error Loading only permits the primary tone.
const prohibitedTone: ConstrainedButtonProps = {status: "loading", busy: true, tone: "quiet"}
// @ts-expect-error Loading requires busy: true when it has no valid default.
const missingRequiredBusy: ConstrainedButtonProps = {status: "loading"}
void [defaultReady, explicitLoading, prohibitedTone, missingRequiredBusy]

// @ts-expect-error Defaults must satisfy the constraints of their selected state.
componentRecipe({
  slots: {root: "view"} as const,
  variants: {
    status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.7}}},
    busy: {false: {root: {opacity: 1}}, true: {root: {opacity: 0.7}}},
    tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}},
  },
  defaultVariants: {status: "ready", busy: true, tone: "primary"},
  stateVariants: {
    status: {
      ready: {busy: [false], tone: ["primary", "quiet"]},
      loading: {busy: [true], tone: ["primary"]},
    },
  },
})

componentRecipe({
  slots: {root: "view"} as const,
  variants: {status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.7}}}},
  defaultVariants: {status: "ready"},
  // @ts-expect-error Every status value must have a matching state case.
  stateVariants: {status: {ready: {}}},
})

// @ts-expect-error State cases must exactly match the variant values.
componentRecipe({
  slots: {root: "view"} as const,
  variants: {status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.7}}}},
  defaultVariants: {status: "ready"},
  stateVariants: {status: {
    ready: {},
    loading: {},
    disabled: {},
  }},
})

componentRecipe({
  slots: {root: "view"} as const,
  variants: {
    status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.7}}},
    tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}, danger: {root: {opacity: 0.5}}},
  },
  defaultVariants: {status: "ready", tone: "primary"},
  stateVariants: {status: {ready: {tone: ["primary"]}, loading: {tone: ["danger"]}}},
})

componentRecipe({
  slots: {root: "view"} as const,
  variants: {
    status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.7}}},
    tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}},
  },
  defaultVariants: {status: "ready", tone: "primary"},
  stateVariants: {
    status: {ready: {}, loading: {}},
    // @ts-expect-error stateVariants accepts exactly one discriminator.
    tone: {primary: {}, quiet: {}},
  },
})

// @ts-expect-error Constrained axes must be authored variants.
componentRecipe({
  slots: {root: "view"} as const,
  variants: {status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.7}}}},
  defaultVariants: {status: "ready"},
  stateVariants: {
    status: {
      ready: {mood: ["calm"]},
      loading: {},
    },
  },
})

componentRecipe({
  slots: {root: "view"} as const,
  variants: {
    status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.7}}},
    tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}},
  },
  defaultVariants: {status: "ready", tone: "primary"},
  // @ts-expect-error Allowed values must exist in that variant.
  stateVariants: {status: {ready: {tone: ["primary"]}, loading: {tone: ["danger"]}}},
})

const booleanStateRecipe = componentRecipe({
  slots: {root: "view"} as const,
  variants: {
    enabled: {false: {root: {opacity: 0.5}}, true: {root: {opacity: 1}}},
    tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}},
  },
  defaultVariants: {enabled: true, tone: "primary"},
  stateVariants: {enabled: {false: {tone: ["quiet"]}, true: {tone: ["primary", "quiet"]}}},
})
type BooleanStateProps = NativeComponentRecipeProps<typeof booleanStateRecipe>
const booleanFalseState: BooleanStateProps = {enabled: false, tone: "quiet"}
// @ts-expect-error The false boolean case does not permit the primary tone.
const prohibitedBooleanTone: BooleanStateProps = {enabled: false, tone: "primary"}
void [booleanFalseState, prohibitedBooleanTone]

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
