import {describe, expect, it} from "bun:test"
import {
  createTheme,
  createThemeContract,
  type NativeComponentRecipe,
} from "@opsydyn/crumbs-css/style"
import {
  createThemeTokenReference,
  resolveThemeStyles,
  resolveThemeTokens,
} from "@opsydyn/crumbs-css/theme"
import type {NativeComponentRecipeDescriptor} from "../src/components"
import type {NativeComponentRecipeExtensionDescriptor} from "../src/components/extension-contract"

type Slots = Readonly<{root: "view"; label: "text"; icon: "image"}>
type Variants = Readonly<{
  tone: Readonly<{primary: object; quiet: object}>
}>
type ToneStateVariants = Readonly<{
  tone: Readonly<{primary: Readonly<Record<never, never>>; quiet: Readonly<Record<never, never>>}>
}>
type PlainVariants = Readonly<{status: Readonly<{ready: object; loading: object}>}>
type PlainStateVariants = Readonly<{
  status: Readonly<{ready: Readonly<Record<never, never>>; loading: Readonly<Record<never, never>>}>
}>

const contract = createThemeContract({color: {canvas: null, text: null}})
const theme = createTheme(contract, {color: {canvas: "#101820", text: "#f0f4f8"}})

const button = deepFreeze({
  $$type: "crumbs.css.component-recipe",
  version: 2,
  $$debugName: "themedComponentButton",
  slots: {root: "view", label: "text", icon: "image"},
  base: {
    root: {backgroundColor: createThemeTokenReference("--crumbs-color-canvas")},
    label: {color: createThemeTokenReference("--crumbs-color-text")},
    icon: {tintColor: createThemeTokenReference("--crumbs-color-text")},
  },
  variants: {
    tone: {
      primary: {root: {borderColor: createThemeTokenReference("--crumbs-color-text")}},
      quiet: {label: {backgroundColor: createThemeTokenReference("--crumbs-color-canvas")}},
    },
  },
  defaultVariants: {tone: "primary"},
  compoundVariants: [{
    variants: {tone: "quiet"},
    styles: {icon: {backgroundColor: createThemeTokenReference("--crumbs-color-canvas")}},
  }],
}) as unknown as NativeComponentRecipe<Slots, Variants>

const legacyButton = deepFreeze({...button, version: 1}) as unknown as NativeComponentRecipeDescriptor

const plainComponent = deepFreeze({
  $$type: "crumbs.css.component-recipe",
  version: 2,
  slots: {root: "view"},
  base: {root: {opacity: 1}},
  variants: {},
  defaultVariants: {},
  compoundVariants: [],
}) as unknown as NativeComponentRecipe<
  Readonly<{root: "view"}>,
  Readonly<Record<string, Readonly<Record<string, unknown>>>>
>

const statefulV2 = deepFreeze({
  ...button,
  version: 2,
  stateVariants: {
    tone: {
      primary: {},
      quiet: {},
    },
  },
}) as unknown as NativeComponentRecipe<
  Slots,
  Variants,
  ToneStateVariants,
  Readonly<{tone: "primary"}>
>

const plainStatefulV2 = deepFreeze({
  ...plainComponent,
  version: 2,
  variants: {status: {ready: {}, loading: {}}},
  defaultVariants: {status: "ready"},
  stateVariants: {status: {ready: {}, loading: {}}},
}) as unknown as NativeComponentRecipe<
  Readonly<{root: "view"}>,
  PlainVariants,
  PlainStateVariants,
  Readonly<{status: "ready"}>
>

describe("component recipe theme resolution", () => {
  it("resolves tokens throughout base, variant, and compound slot maps without mutating the source", () => {
    const resolved = resolveThemeTokens(button, theme)

    expect(resolved).toMatchObject({
      base: {
        root: {backgroundColor: "#101820"},
        label: {color: "#f0f4f8"},
        icon: {tintColor: "#f0f4f8"},
      },
      variants: {
        tone: {
          primary: {root: {borderColor: "#f0f4f8"}},
          quiet: {label: {backgroundColor: "#101820"}},
        },
      },
      compoundVariants: [{
        variants: {tone: "quiet"},
        styles: {icon: {backgroundColor: "#101820"}},
      }],
    })
    expect(button.base?.root?.backgroundColor as unknown)
      .toEqual(createThemeTokenReference("--crumbs-color-canvas"))
    expect(resolved).not.toBe(button)
    expect(isDeeplyFrozen(resolved)).toBe(true)
  })

  it("preserves resolved identity through both direct and styles-map APIs", () => {
    const direct: NativeComponentRecipe<Slots, Variants> = resolveThemeTokens(button, theme)!
    const repeated = resolveThemeTokens(button, theme)
    const mapped: {
      readonly button: NativeComponentRecipe<Slots, Variants>
      readonly plainComponent: typeof plainComponent
    } = resolveThemeStyles({button, plainComponent}, theme)

    expect(repeated).toBe(direct)
    expect(mapped.button).toBe(direct)
    expect(mapped.plainComponent).toBe(plainComponent)
  })

  it("preserves descriptor identity when the theme changes no referenced token", () => {
    expect(resolveThemeTokens(plainComponent, theme)!).toBe(plainComponent)
    expect(resolveThemeTokens(plainStatefulV2, theme)!).toBe(plainStatefulV2)
  })

  it("preserves state metadata and descriptor versions while resolving v1 and v2 tokens", () => {
    const resolvedV1 = resolveThemeTokens(legacyButton, theme) as NativeComponentRecipeDescriptor
    const resolvedV2 = resolveThemeTokens(statefulV2, theme)!

    expect(resolvedV1.version).toBe(1)
    expect(resolvedV2.version).toBe(2)
    expect(resolvedV2.stateVariants).toEqual(statefulV2.stateVariants)
    expect(isDeeplyFrozen(resolvedV2.stateVariants)).toBe(true)
    expect(resolveThemeTokens(statefulV2, theme)).toBe(resolvedV2)
  })

  it("preserves frozen v3 contract metadata when theme tokens are transformed", () => {
    const contract = deepFreeze({
      identity: {owner: "@acme/ui", name: "ThemedV3Button", version: 1},
      public: {slots: ["root", "label"], variants: {tone: ["primary", "quiet"]}},
    })
    const v3Button = deepFreeze({
      ...button,
      version: 3,
      contract,
    }) as unknown as NativeComponentRecipeDescriptor

    const resolved = resolveThemeTokens(v3Button, theme) as NativeComponentRecipeDescriptor
    expect(resolved.version).toBe(3)
    expect(resolved.contract).toEqual(contract)
    expect(resolved.contract).toBe(contract)
    expect(Object.isFrozen(resolved.contract)).toBe(true)
    expect(Object.isFrozen(resolved.contract?.identity)).toBe(true)
    expect(resolved.base).toMatchObject({root: {backgroundColor: "#101820"}})
  })

  it("resolves extension slot tokens and preserves frozen contract identities", () => {
    const componentIdentity = {owner: "@acme/ui", name: "ThemedExtensionButton", version: 1}
    const identity = {owner: "@acme/brand", name: "ThemedButtonExtension", version: 1}
    const parentExtensionIdentity = {owner: "@acme/brand", name: "BaseBrandExtension", version: 1}
    const extension = deepFreeze({
      $$type: "crumbs.css.component-recipe-extension",
      version: 1,
      identity,
      componentIdentity,
      parentExtensionIdentity,
      defaultVariants: {tone: "brand"},
      variants: {
        tone: {brand: {root: {backgroundColor: createThemeTokenReference("--crumbs-color-canvas")}}},
      },
      compoundVariants: [{
        variants: {tone: "brand"},
        styles: {root: {borderColor: createThemeTokenReference("--crumbs-color-text")}},
      }],
      slotOverrides: {root: {opacity: 0.5, backgroundColor: createThemeTokenReference("--crumbs-color-canvas")}},
    }) as unknown as NativeComponentRecipeExtensionDescriptor

    const resolved = resolveThemeTokens(extension, theme) as NativeComponentRecipeExtensionDescriptor
    expect(resolved).not.toBe(extension)
    expect(resolved.$$type).toBe("crumbs.css.component-recipe-extension")
    expect(resolved.version).toBe(1)
    expect(resolved.identity).toEqual(identity)
    expect(resolved.componentIdentity).toEqual(componentIdentity)
    expect(resolved.parentExtensionIdentity).toEqual(parentExtensionIdentity)
    expect(resolved.variants).toMatchObject({tone: {brand: {root: {backgroundColor: "#101820"}}}})
    expect(resolved.compoundVariants[0]?.styles).toMatchObject({root: {borderColor: "#f0f4f8"}})
    expect(resolved.slotOverrides).toMatchObject({root: {opacity: 0.5, backgroundColor: "#101820"}})
    expect(isDeeplyFrozen(resolved)).toBe(true)

    const tokenFree = deepFreeze({
      ...extension,
      identity: {owner: "@acme/brand", name: "TokenFreeButtonExtension", version: 1},
      variants: {tone: {brand: {root: {opacity: 0.7}}}},
      compoundVariants: [],
      slotOverrides: {},
    }) as unknown as NativeComponentRecipeExtensionDescriptor
    expect(resolveThemeTokens(tokenFree, theme)).toBe(tokenFree)
  })

  it("rejects malformed v3 contracts and unsupported extension versions", () => {
    const malformed = deepFreeze({
      ...button,
      version: 3,
      contract: {
        identity: {owner: "@acme/ui", name: "MalformedThemedV3Button", version: 1},
        public: {slots: ["missingSlot"], variants: {tone: ["primary", "quiet"]}},
      },
    }) as unknown as NativeComponentRecipeDescriptor
    expect(() => resolveThemeTokens(malformed, theme)).toThrow(/unknown public slot/i)

    const unsupported = {
      $$type: "crumbs.css.component-recipe-extension",
      version: 2,
      identity: {owner: "@acme/brand", name: "FutureExtension", version: 1},
      componentIdentity: {owner: "@acme/ui", name: "ThemedExtensionButton", version: 1},
      defaultVariants: {},
      variants: {},
      compoundVariants: [],
      slotOverrides: {},
    }
    expect(() => resolveThemeTokens(unsupported, theme)).toThrow(/unsupported.*extension.*version/i)
  })

  it("rejects an unsupported component descriptor version instead of treating it as a style map", () => {
    expect(() => resolveThemeTokens({...legacyButton, version: 4} as never, theme))
      .toThrow("Unsupported component recipe version 4")
  })
})

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key])
  }
  return Object.freeze(value)
}

function isDeeplyFrozen(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || typeof value !== "object" || seen.has(value)) return true
  seen.add(value)
  return Object.isFrozen(value) && Reflect.ownKeys(value).every((key) =>
    isDeeplyFrozen((value as Record<PropertyKey, unknown>)[key], seen))
}
