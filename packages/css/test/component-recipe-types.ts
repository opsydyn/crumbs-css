import {
  componentRecipe,
  componentRecipeFromRecipe,
  extendComponentRecipe,
  recipe,
  type NativeComponentRecipeConfig,
  type NativeComponentRecipeProps,
  type NativeComponentPublicProps,
  type NativeComponentResolvedStyles,
} from "../src/native-style"
import {
  createComponentRecipeResolver,
  resolveComponentRecipeStyles,
} from "../src/theme-runtime"
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

const legacyV1Descriptor = {
  $$type: "crumbs.css.component-recipe",
  version: 1,
  slots: {root: "view"},
  variants: {
    tone: {
      primary: {root: {opacity: 1}},
      quiet: {root: {opacity: 0.5}},
    },
  },
  defaultVariants: {tone: "primary"},
  compoundVariants: [],
} as const
type LegacyV1Props = NativeComponentRecipeProps<typeof legacyV1Descriptor>
const legacyV1Selection: LegacyV1Props = {tone: "quiet"}
createComponentRecipeResolver(legacyV1Descriptor)({tone: "quiet"})
resolveComponentRecipeStyles(legacyV1Descriptor, {tone: "quiet"})
void legacyV1Selection

const typedStateSlots = {root: "view"} as const
const typedStateVariants = {
  status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.7}}},
  tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}},
} as const
const typedStateMap = {
  status: {
    ready: {tone: ["primary", "quiet"]},
    loading: {tone: ["primary"]},
  },
} as const
const typedStateConfig: NativeComponentRecipeConfig<
  typeof typedStateSlots,
  typeof typedStateVariants,
  typeof typedStateMap
> = {
  slots: typedStateSlots,
  variants: typedStateVariants,
  defaultVariants: {status: "ready", tone: "primary"},
  stateVariants: typedStateMap,
}
const typedStateButton = componentRecipe(typedStateConfig)
type TypedStateButtonProps = NativeComponentRecipeProps<typeof typedStateButton>
const typedStateAllowed: TypedStateButtonProps = {status: "loading", tone: "primary"}
// @ts-expect-error An explicitly typed config must retain its state constraints.
const typedStateProhibited: TypedStateButtonProps = {status: "loading", tone: "quiet"}
void [typedStateAllowed, typedStateProhibited]

function createRecipeWithDynamicDefault(defaultStatus: "ready" | "loading") {
  const recipeWithDynamicDefault = componentRecipe({
    slots: typedStateSlots,
    variants: typedStateVariants,
    defaultVariants: {status: defaultStatus, tone: "primary"},
    stateVariants: typedStateMap,
  })
  type DynamicDefaultProps = NativeComponentRecipeProps<typeof recipeWithDynamicDefault>
  const explicitReady: DynamicDefaultProps = {status: "ready", tone: "quiet"}
  // @ts-expect-error The default may be loading, where quiet is prohibited.
  const ambiguousDefault: DynamicDefaultProps = {tone: "quiet"}
  return [recipeWithDynamicDefault, explicitReady, ambiguousDefault] as const
}
void createRecipeWithDynamicDefault

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

const contractedButton = componentRecipe({
  contract: {
    identity: {owner: "@acme/ui", name: "Button", version: 1},
    public: {slots: ["root"], variants: {tone: ["primary", "quiet"]}},
    extensionPoints: {defaults: ["tone"], variantValues: ["tone"], slotStyles: ["root"]},
  },
  slots: {root: "view", internalIcon: "image"} as const,
  variants: {
    tone: {
      primary: {root: {opacity: 1}},
      quiet: {root: {opacity: 0.8}},
      dangerInternal: {root: {opacity: 0.4}},
    },
    density: {
      compact: {internalIcon: {width: 12}},
    },
  },
  defaultVariants: {tone: "primary", density: "compact"},
})
type ContractedButtonOwnerProps = NativeComponentRecipeProps<typeof contractedButton>
type ContractedButtonPublicProps = NativeComponentPublicProps<typeof contractedButton>
const ownerCanSelectPrivateSurfaces: ContractedButtonOwnerProps = {density: "compact", tone: "dangerInternal"}
const consumerCanSelectPublicValue: ContractedButtonPublicProps = {tone: "quiet"}
// @ts-expect-error density is private in the component contract.
const consumerCannotSelectPrivateAxis: ContractedButtonPublicProps = {density: "compact"}
// @ts-expect-error dangerInternal is private in the component contract.
const consumerCannotSelectPrivateValue: ContractedButtonPublicProps = {tone: "dangerInternal"}
void [ownerCanSelectPrivateSurfaces, consumerCanSelectPublicValue, consumerCannotSelectPrivateAxis, consumerCannotSelectPrivateValue]

const extendedButton = extendComponentRecipe(contractedButton, {
  identity: {owner: "@acme/brand", name: "ButtonExtension", version: 1},
  defaultVariants: {tone: "brand"},
  variants: {tone: {brand: {root: {opacity: 0.5}}}},
  slotOverrides: {root: {borderWidth: 1}},
})
const extendedButtonResolver = createComponentRecipeResolver(contractedButton, {extensions: [extendedButton]})
extendedButtonResolver({tone: "brand"})
extendedButtonResolver({tone: "quiet"})
// @ts-expect-error Private owner axes stay unavailable through an extension resolver.
extendedButtonResolver({density: "compact"})
// @ts-expect-error Private owner values stay unavailable through an extension resolver.
extendedButtonResolver({tone: "dangerInternal"})
extendComponentRecipe(contractedButton, {
  identity: {owner: "@acme/brand", name: "InvalidDensityDefault", version: 1},
  // @ts-expect-error Defaults may only be changed on the declared tone axis.
  defaultVariants: {density: "compact"},
})
// @ts-expect-error Every default key must be permitted, including in a mixed valid/private map.
extendComponentRecipe(contractedButton, {
  identity: {owner: "@acme/brand", name: "InvalidMixedDefaults", version: 1},
  defaultVariants: {tone: "primary", density: "compact"},
})
type MixedDefaultExtensionConfig =
  | {
    readonly identity: {readonly owner: "@acme/brand"; readonly name: "ValidBranch"; readonly version: 1}
    readonly defaultVariants: {readonly tone: "primary"}
  }
  | {
    readonly identity: {readonly owner: "@acme/brand"; readonly name: "InvalidBranch"; readonly version: 1}
    readonly defaultVariants: {readonly tone: "primary"; readonly density: "compact"}
  }
declare const mixedDefaultConfigUnion: MixedDefaultExtensionConfig
// @ts-expect-error A union config is invalid if any branch includes a private default axis.
extendComponentRecipe(contractedButton, mixedDefaultConfigUnion)
extendComponentRecipe(contractedButton, {
  identity: {owner: "@acme/brand", name: "InvalidSizeValue", version: 1},
  // @ts-expect-error New values may only be added to the declared tone axis.
  variants: {size: {large: {root: {opacity: 1}}}},
})
const malformedExtensionIdentityConfig = {
  identity: {owner: "@acme/brand", name: "ExtraIdentityKey", version: 1, surprise: true},
  defaultVariants: {tone: "primary"},
} as const
// @ts-expect-error Extension identities expose only owner, name, and version.
extendComponentRecipe(contractedButton, malformedExtensionIdentityConfig)
extendComponentRecipe(contractedButton, {
  identity: {owner: "@acme/brand", name: "InvalidPrivateSlot", version: 1},
  // @ts-expect-error Extensions may style only the root slot in this contract.
  slotOverrides: {internalIcon: {width: 16}},
})
extendComponentRecipe(contractedButton, {
  identity: {owner: "@acme/brand", name: "UnpermittedCompoundType", version: 1},
  // @ts-expect-error Compound authoring requires an explicit contract permission.
  compoundVariants: [{variants: {tone: "primary"}, styles: {root: {opacity: 0.2}}}],
})

const compoundableButton = componentRecipe({
  contract: {
    identity: {owner: "@acme/ui", name: "CompoundableButton", version: 1},
    public: {slots: ["root"], variants: {tone: ["primary"]}},
    extensionPoints: {compoundVariants: true, slotStyles: ["root"]},
  },
  slots: {root: "view"} as const,
  variants: {tone: {primary: {root: {opacity: 1}}}},
})
const permittedCompoundExtension = extendComponentRecipe(compoundableButton, {
  identity: {owner: "@acme/brand", name: "PermittedCompound", version: 1},
  compoundVariants: [{variants: {tone: "primary"}, styles: {root: {opacity: 0.8}}}],
})
const malformedCompoundExtensionConfig = {
  identity: {owner: "@acme/brand", name: "MalformedCompound", version: 1},
  compoundVariants: [{variants: {tone: "primary"}, styles: {root: {opacity: 0.8}}, surprise: true}],
} as const
// @ts-expect-error Compound records expose only variants and styles.
extendComponentRecipe(compoundableButton, malformedCompoundExtensionConfig)
void permittedCompoundExtension

const defaultableStateButton = componentRecipe({
  contract: {
    identity: {owner: "@acme/ui", name: "DefaultableStateButton", version: 1},
    public: {
      slots: ["root"],
      variants: {status: ["ready", "loading"], tone: ["primary", "quiet"]},
    },
    extensionPoints: {defaults: ["status", "tone"], variantValues: ["tone"], slotStyles: ["root"]},
  },
  slots: {root: "view"} as const,
  variants: {
    status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.5}}},
    tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}},
  },
  defaultVariants: {status: "ready", tone: "quiet"},
  stateVariants: {status: {ready: {tone: ["quiet"]}, loading: {tone: ["primary"]}}},
})
const loadingDefaultExtension = extendComponentRecipe(defaultableStateButton, {
  identity: {owner: "@acme/brand", name: "LoadingDefault", version: 1},
  defaultVariants: {status: "loading", tone: "primary"},
})
type LoadingDefaultSelection = NativeComponentPublicProps<typeof loadingDefaultExtension>
const extensionDefaultsNeedNoSelection: LoadingDefaultSelection = {}
const extensionDefaultStateCanBeExplicit: LoadingDefaultSelection = {status: "loading"}
// @ts-expect-error Extension defaults make loading the implicit state; ready now requires its quiet tone.
const ownerDefaultIsNoLongerImplicit: LoadingDefaultSelection = {status: "ready"}
void [extensionDefaultsNeedNoSelection, extensionDefaultStateCanBeExplicit, ownerDefaultIsNoLongerImplicit]
const readyDefaultLeaf = extendComponentRecipe(defaultableStateButton, {
  identity: {owner: "@acme/brand", name: "ReadyDefaultLeaf", version: 1},
  defaultVariants: {status: "ready", tone: "quiet"},
}, [loadingDefaultExtension])
type ReadyDefaultLeafSelection = NativeComponentPublicProps<typeof readyDefaultLeaf>
const leafDefaultsReplacePriorDefaults: ReadyDefaultLeafSelection = {}
const leafDefaultStateCanBeExplicit: ReadyDefaultLeafSelection = {status: "ready"}
// @ts-expect-error The leaf extension restores ready as the default state.
const intermediateDefaultWasReplaced: ReadyDefaultLeafSelection = {status: "loading"}
void [leafDefaultsReplacePriorDefaults, leafDefaultStateCanBeExplicit, intermediateDefaultWasReplaced]

const publiclyConstrainedButton = componentRecipe({
  contract: {
    identity: {owner: "@acme/ui", name: "PublicStateButton", version: 1},
    public: {
      slots: ["root"],
      variants: {status: ["ready", "loading"], tone: ["primary", "quiet"]},
    },
  },
  slots: {root: "view"} as const,
  variants: {
    status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.5}}},
    tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}},
  },
  defaultVariants: {status: "ready", tone: "quiet"},
  stateVariants: {
    status: {ready: {tone: ["quiet"]}, loading: {tone: ["primary"]}},
  },
})
type PubliclyConstrainedSelection = NativeComponentPublicProps<typeof publiclyConstrainedButton>
const publicLoadingState: PubliclyConstrainedSelection = {status: "loading", tone: "primary"}
// @ts-expect-error The public state contract disallows quiet while loading.
const invalidPublicLoadingState: PubliclyConstrainedSelection = {status: "loading", tone: "quiet"}
void [publicLoadingState, invalidPublicLoadingState]

// @ts-expect-error A public discriminator cannot depend on a private density axis.
componentRecipe({
  contract: {
    identity: {owner: "@acme/ui", name: "InvalidPublicState", version: 1},
    public: {slots: ["root"], variants: {status: ["ready", "loading"]}},
  },
  slots: {root: "view", internalIcon: "image"} as const,
  variants: {
    status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.5}}},
    density: {compact: {internalIcon: {width: 12}}, roomy: {internalIcon: {width: 16}}},
  },
  defaultVariants: {status: "ready", density: "compact"},
  stateVariants: {status: {ready: {density: ["compact"]}, loading: {density: ["roomy"]}}},
})

// @ts-expect-error A complete public state projection cannot require a value hidden by the token contract.
componentRecipe({
  contract: {
    identity: {owner: "@acme/ui", name: "PrivateRequiredStateValue", version: 1},
    public: {
      slots: ["root"],
      variants: {status: ["ready", "loading"], tone: ["primary"]},
    },
  },
  slots: {root: "view"} as const,
  variants: {
    status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.5}}},
    tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}},
  },
  defaultVariants: {status: "ready", tone: "primary"},
  stateVariants: {status: {ready: {tone: ["primary"]}, loading: {tone: ["quiet"]}}},
})

componentRecipe({
  slots: {root: "view"} as const,
  variants: {tone: {primary: {root: {opacity: 1}}}},
  // @ts-expect-error Defaults must select a value present in their variant map.
  defaultVariants: {tone: "danger"},
})

// @ts-expect-error Unsupported primitive kinds are rejected.
componentRecipe({slots: {root: "web"} as const, variants: {}})
