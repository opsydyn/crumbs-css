import {describe, expect, it} from "bun:test"
import {endFileScope, setFileScope} from "@vanilla-extract/css/fileScope"
import {componentRecipe, componentRecipeFromRecipe, recipe} from "../src/native-style"

function inFileScope<T>(run: () => T): T {
  setFileScope("component-recipe-authoring.css.ts", "@crumbs/test")
  try {
    return run()
  } finally {
    endFileScope()
  }
}

describe("component recipe authoring", () => {
  it("creates a versioned deeply frozen descriptor in authored slot order", () => {
    const button = inFileScope(() => componentRecipe({
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
      },
      defaultVariants: {tone: "primary"},
      compoundVariants: [{
        variants: {tone: "quiet"},
        styles: {root: {borderWidth: 1}},
      }],
    }, "button"))

    expect(button.$$type).toBe("crumbs.css.component-recipe")
    expect(button.version).toBe(2)
    expect(button.$$debugName).toBe("button")
    expect(Object.keys(button.slots)).toEqual(["root", "label", "icon"])
    expect(Object.keys(button.base ?? {})).toEqual(["root", "label", "icon"])
    expect(Object.keys(button.variants.tone.primary)).toEqual(["root", "label"])
    expect(button.compoundVariants).toHaveLength(1)
    expect(Object.isFrozen(button)).toBe(true)
    expect(Object.isFrozen(button.slots)).toBe(true)
    expect(Object.isFrozen(button.base)).toBe(true)
    expect(Object.isFrozen(button.base?.root)).toBe(true)
    expect(Object.isFrozen(button.variants)).toBe(true)
    expect(Object.isFrozen(button.variants.tone)).toBe(true)
    expect(Object.isFrozen(button.variants.tone.primary)).toBe(true)
    expect(Object.isFrozen(button.compoundVariants)).toBe(true)
    expect(Object.isFrozen(button.compoundVariants[0])).toBe(true)
    expect(Object.isFrozen(button.compoundVariants[0]?.styles)).toBe(true)
  })

  it("emits v3 only for a validated public component contract", () => {
    const button = inFileScope(() => componentRecipe({
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
        density: {compact: {internalIcon: {width: 12}}},
      },
      defaultVariants: {tone: "primary", density: "compact"},
    }, "publicButton"))

    const privateRecipe = inFileScope(() => componentRecipe({
      slots: {root: "view"} as const,
      variants: {tone: {primary: {root: {opacity: 1}}}},
    }))
    expect(button.version).toBe(3)
    expect(button.contract).toEqual({
      identity: {owner: "@acme/ui", name: "Button", version: 1},
      public: {slots: ["root"], variants: {tone: ["primary", "quiet"]}},
      extensionPoints: {defaults: ["tone"], variantValues: ["tone"], slotStyles: ["root"]},
    })
    expect(Object.isFrozen(button.contract)).toBe(true)
    expect(Object.isFrozen(button.contract?.identity)).toBe(true)
    expect(Object.isFrozen(button.contract?.public)).toBe(true)
    expect(Object.isFrozen(button.contract?.public.slots)).toBe(true)
    expect(Object.isFrozen(button.contract?.public.variants.tone)).toBe(true)
    expect(Object.isFrozen(button.contract?.extensionPoints)).toBe(true)
    expect(privateRecipe.version).toBe(2)
    expect("contract" in privateRecipe).toBe(false)
  })

  it("rejects changed public surfaces for one component identity", () => {
    const create = (publicTone: "primary" | "quiet") => inFileScope(() => componentRecipe({
      contract: {
        identity: {owner: "@acme/ui", name: "IdentityCollision", version: 1},
        public: {slots: ["root"], variants: {tone: [publicTone]}},
      },
      slots: {root: "view"} as const,
      variants: {tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}}},
    }))
    create("primary")
    expect(() => create("quiet")).toThrow(/component contract identity.*different public surface/i)
  })

  it("normalizes prototype-named public axes as own contract data", () => {
    const recipe = inFileScope(() => componentRecipe({
      contract: {
        identity: {owner: "@acme/ui", name: "PrototypeAxis", version: 1},
        public: {
          slots: ["root"],
          variants: Object.fromEntries([["__proto__", ["primary"]]]),
        },
      },
      slots: {root: "view"},
      variants: Object.fromEntries([["__proto__", {primary: {root: {opacity: 1}}}]]),
      defaultVariants: Object.fromEntries([["__proto__", "primary"]]),
    } as never)) as unknown as {
      readonly contract: {
        readonly public: {readonly variants: Readonly<Record<string, ReadonlyArray<string>>>}
      }
    }

    expect(Object.keys(recipe.contract!.public.variants)).toEqual(["__proto__"])
    expect(Object.hasOwn(recipe.contract!.public.variants, "__proto__")).toBe(true)
    expect(recipe.contract!.public.variants["__proto__"]).toEqual(["primary"])
  })

  it("seals extension permissions to declared public axes, values, and slots", () => {
    const config = (identityName: string, extensionPoints: unknown) => ({
      contract: {
        identity: {owner: "@acme/ui", name: identityName, version: 1},
        public: {slots: ["root"], variants: {tone: ["primary"]}},
        extensionPoints,
      },
      slots: {root: "view", internalIcon: "image"} as const,
      variants: {
        tone: {primary: {root: {opacity: 1}}},
        density: {compact: {internalIcon: {width: 12}}},
      },
    })
    inFileScope(() => {
      expect(() => componentRecipe(config("PrivateAxisPermission", {defaults: ["density"]}) as never))
        .toThrow(/extension permission.*public variant axis/i)
      expect(() => componentRecipe(config("UnknownAxisPermission", {variantValues: ["unknown"]}) as never))
        .toThrow(/extension permission.*public variant axis/i)
      expect(() => componentRecipe(config("PrivateSlotPermission", {slotStyles: ["internalIcon"]}) as never))
        .toThrow(/extension permission.*public slot/i)
    })
  })

  it("rejects public state cases that depend on private axes or values", () => {
    inFileScope(() => {
      expect(() => componentRecipe({
        contract: {
          identity: {owner: "@acme/ui", name: "PrivateStateAxis", version: 1},
          public: {slots: ["root"], variants: {status: ["ready", "loading"]}},
        },
        slots: {root: "view", internalIcon: "image"},
        variants: {
          status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.5}}},
          density: {compact: {internalIcon: {width: 12}}, roomy: {internalIcon: {width: 16}}},
        },
        defaultVariants: {status: "ready", density: "compact"},
        stateVariants: {status: {ready: {density: ["compact"]}, loading: {density: ["roomy"]}}},
      } as never)).toThrow(/public state.*private|private.*public state/i)

      expect(() => componentRecipe({
        contract: {
          identity: {owner: "@acme/ui", name: "PrivateStateValue", version: 1},
          public: {slots: ["root"], variants: {status: ["ready"], tone: ["primary"]}},
        },
        slots: {root: "view"},
        variants: {
          status: {ready: {root: {opacity: 1}}, loading: {root: {opacity: 0.5}}},
          tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}},
        },
        defaultVariants: {status: "ready", tone: "primary"},
        stateVariants: {status: {ready: {tone: ["primary"]}, loading: {tone: ["quiet"]}}},
      } as never)).toThrow(/public state.*case|state case.*public/i)
    })
  })

  it("rejects malformed slots and branch maps at construction", () => {
    expect(() => componentRecipe({slots: {}, variants: {}} as never)).toThrow(/at least one slot/)
    expect(() => componentRecipe({slots: {"": "view"}, variants: {}} as never)).toThrow(/slot names must be non-empty/)
    expect(() => componentRecipe({slots: {root: "web"}, variants: {}} as never)).toThrow(/invalid primitive kind/)
    expect(() => componentRecipe({
      slots: {root: "view"},
      base: {label: {opacity: 1}},
      variants: {},
    } as never)).toThrow(/unknown slot "label"/)
    expect(() => componentRecipe({
      slots: {root: "view"},
      variants: {tone: {}},
    } as never)).toThrow(/variant "tone" must define at least one value/)
    expect(() => componentRecipe({
      slots: {root: "view"},
      variants: {tone: {primary: {root: {opacity: 1}}}},
      defaultVariants: {tone: "danger"},
    } as never)).toThrow(/default value "danger" is not defined for variant "tone"/)
  })

  it("validates exhaustive state constraints and freezes their plain-data descriptor", () => {
    const validStateVariants = {
      status: {
        ready: {busy: [false], tone: ["primary", "quiet"]},
        loading: {busy: [true], tone: ["primary"]},
      },
    }
    const validDefaults = {status: "ready", busy: false, tone: "primary"}
    const makeConfig = (stateVariants: unknown, defaultVariants: unknown = validDefaults) => ({
      slots: {root: "view"},
      variants: {
        status: {
          ready: {root: {opacity: 1}},
          loading: {root: {opacity: 0.7}},
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
      defaultVariants,
      stateVariants,
    })

    inFileScope(() => {
      const assertInvalid = (stateVariants: unknown, message: RegExp, defaults?: unknown) => {
        expect(() => componentRecipe(makeConfig(stateVariants, defaults) as never)).toThrow(message)
      }

      assertInvalid({status: {ready: {busy: [false]}}}, /missing state case "loading"/)
      assertInvalid({status: {ready: {busy: [false]}, loading: {}, disabled: {}}}, /unknown state case "disabled"/)
      assertInvalid({status: {ready: {}, loading: {}}, tone: {primary: {}, quiet: {}}}, /exactly one discriminator/)
      assertInvalid({unknown: {ready: {}, loading: {}}}, /unknown discriminator variant "unknown"/)
      assertInvalid({status: {ready: {unknown: ["x"]}, loading: {}}}, /unknown constrained variant "unknown"/)
      assertInvalid({status: {ready: {tone: []}, loading: {}}}, /allowed values for variant "tone" must be non-empty/)
      assertInvalid({status: {ready: {tone: ["primary", "primary"]}, loading: {}}}, /duplicate allowed value "primary"/)
      assertInvalid({status: {ready: {tone: ["danger"]}, loading: {}}}, /unknown value "danger" for variant "tone"/)
      assertInvalid(validStateVariants, /defaultVariants must define discriminator "status"/, {busy: false, tone: "primary"})
      assertInvalid(validStateVariants, /defaultVariants must define constrained variant "tone"/, {status: "ready", busy: false})
      assertInvalid(validStateVariants, /default selection for state "ready" violates constraint "busy"/, {
        status: "ready",
        busy: true,
        tone: "primary",
      })

      const button = componentRecipe(makeConfig(validStateVariants) as never) as unknown as {
        readonly version: number
        readonly stateVariants: typeof validStateVariants
      }
      expect(button.version).toBe(2)
      expect(button.stateVariants).toEqual(validStateVariants)
      expect(Object.isFrozen(button.stateVariants)).toBe(true)
      expect(Object.isFrozen(button.stateVariants?.status)).toBe(true)
      expect(Object.isFrozen(button.stateVariants?.status.ready)).toBe(true)
      expect(Object.isFrozen(button.stateVariants?.status.ready.busy)).toBe(true)
      expect(Object.isFrozen(button.stateVariants?.status.ready.tone)).toBe(true)
      expect(Object.isFrozen(button.stateVariants?.status.loading.tone)).toBe(true)
    })
  })

  it("wraps a legacy recipe as a view slot without replacing its class references", () => {
    const {legacy, wrapped} = inFileScope(() => {
      const legacy = recipe({
        base: {opacity: 1},
        variants: {
          tone: {primary: {opacity: 0.8}, quiet: {opacity: 0.5}},
        },
        defaultVariants: {tone: "primary"},
        compoundVariants: [{variants: {tone: "quiet"}, style: {borderWidth: 1}}],
      }, "legacyButton")
      return {
        legacy,
        wrapped: componentRecipeFromRecipe(legacy, {slot: "root", debugId: "button"}),
      }
    })

    expect(wrapped.$$type).toBe("crumbs.css.component-recipe")
    expect(wrapped.version).toBe(2)
    expect(wrapped.slots).toEqual({root: "view"})
    expect(wrapped.defaultVariants).toEqual(legacy.defaultVariants)
    expect(Object.isFrozen(wrapped.defaultVariants)).toBe(true)
    expect(wrapped.variants.tone.primary.root).toBe(legacy.variants.tone.primary)
    expect(wrapped.variants.tone.quiet.root).toBe(legacy.variants.tone.quiet)
    expect(wrapped.compoundVariants[0]?.styles.root).toBe(legacy.compoundVariants[0]?.style)
    expect(Object.isFrozen(wrapped.base?.root)).toBe(true)
    expect(Object.isFrozen(wrapped.variants.tone.primary.root)).toBe(true)
    expect(Object.isFrozen(wrapped.compoundVariants[0]?.styles.root)).toBe(true)
    expect(Object.isFrozen(wrapped)).toBe(true)
    expect(() => componentRecipeFromRecipe(legacy, {slot: ""})).toThrow(/slot name must be non-empty/)
  })

  it("allows migrated recipes to opt into a validated v3 contract", () => {
    const {legacy, wrapped} = inFileScope(() => {
      const legacy = recipe({variants: {tone: {primary: {opacity: 1}, quiet: {opacity: 0.5}}}})
      return {
        legacy,
        wrapped: componentRecipeFromRecipe(legacy, {
          slot: "root",
          contract: {
            identity: {owner: "@acme/ui", name: "WrappedButton", version: 1},
            public: {slots: ["root"], variants: {tone: ["primary", "quiet"]}},
          },
        }),
      }
    })
    expect(wrapped.version).toBe(3)
    expect(wrapped.contract?.identity.name).toBe("WrappedButton")
  })
})
