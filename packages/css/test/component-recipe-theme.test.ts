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
    const resolvedV1 = resolveThemeTokens(legacyButton, theme)!
    const resolvedV2 = resolveThemeTokens(statefulV2, theme)!

    expect(resolvedV1.version).toBe(1)
    expect(resolvedV2.version).toBe(2)
    expect(resolvedV2.stateVariants).toEqual(statefulV2.stateVariants)
    expect(isDeeplyFrozen(resolvedV2.stateVariants)).toBe(true)
    expect(resolveThemeTokens(statefulV2, theme)).toBe(resolvedV2)
  })

  it("rejects an unsupported component descriptor version instead of treating it as a style map", () => {
    expect(() => resolveThemeTokens({...legacyButton, version: 3} as never, theme))
      .toThrow("Unsupported component recipe version 3")
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
