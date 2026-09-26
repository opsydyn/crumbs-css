import {describe, expect, it} from "bun:test"
import {endFileScope, setFileScope} from "@vanilla-extract/css/fileScope"
import {createComponentRecipeResolver, resolveComponentRecipeStyles} from "../src/theme-runtime"
import {componentRecipe, extendComponentRecipe} from "../src/native-style"
import {createTokenContract, defineToken} from "../src/tokens"

let fixtureId = 0

const brandTokens = createTokenContract({
  color: {
    action: defineToken("color"),
    internal: defineToken("color"),
  },
}, {
  identity: {owner: "@acme/brand-tokens", name: "component-extension", version: 1},
  visibility: {public: [["color", "action"]]},
})

function inFileScope<T>(run: () => T, packageName = "@crumbs/test"): T {
  setFileScope("component-recipe-extension.css.ts", packageName)
  try {
    return run()
  } finally {
    endFileScope()
  }
}

function makeButton(options: {
  readonly stateful?: boolean
  readonly privateToneValue?: boolean
  readonly compoundPermission?: boolean
  readonly stateValuePermission?: boolean
} = {}) {
  const id = ++fixtureId
  const variants = options.stateful
    ? {
        size: {small: {root: {padding: 4}}, large: {root: {backgroundColor: "navy"}}},
        tone: {
          primary: {root: {opacity: 1}},
          quiet: {root: {opacity: 0.8}},
          ...(options.privateToneValue ? {internal: {root: {opacity: 0.1}}} : {}),
        },
        status: {
          ready: {root: {borderWidth: 1}},
          loading: {root: {borderWidth: 2}},
        },
        density: {compact: {}},
      }
    : {
        size: {small: {root: {padding: 4}}, large: {root: {backgroundColor: "navy"}}},
        tone: {
          primary: {root: {opacity: 1}},
          quiet: {root: {opacity: 0.8}},
          ...(options.privateToneValue ? {internal: {root: {opacity: 0.1}}} : {}),
        },
        density: {compact: {}},
      }

  return inFileScope(() => componentRecipe({
    contract: {
      identity: {owner: "@acme/ui", name: `ExtensionButton${id}`, version: 1},
      public: {
        slots: ["root", "label"],
        variants: {
          size: ["small", "large"],
          tone: ["primary", "quiet"],
          ...(options.stateful ? {status: ["ready", "loading"]} : {}),
        },
      },
      extensionPoints: {
        defaults: ["tone"],
        variantValues: options.stateValuePermission ? ["tone", "status"] : ["tone"],
        ...(options.compoundPermission === false ? {} : {compoundVariants: true as const}),
        slotStyles: ["root"],
      },
    },
    slots: {root: "view", label: "text", internalIcon: "image"} as const,
    base: {root: {padding: 8}, label: {fontSize: 12}},
    variants,
    defaultVariants: {
      size: "small",
      tone: "primary",
      ...(options.stateful ? {status: "ready"} : {}),
      density: "compact",
    },
    ...(options.stateful
      ? {stateVariants: {status: {ready: {tone: ["primary"]}, loading: {tone: ["quiet"]}}}}
      : {}),
    compoundVariants: [{variants: {size: "large"}, styles: {root: {borderRadius: 12}}}],
  } as never, `extensionButton${id}`) as unknown as any)
}

function extensionConfig(
  name: string,
  value = "brand",
  extra: Readonly<Record<string, unknown>> = {},
) {
  return {
    identity: {owner: "@acme/brand", name, version: 1},
    defaultVariants: {tone: value},
    variants: {tone: {[value]: {root: {backgroundColor: brandTokens.color.action}}}},
    ...extra,
  }
}

function authorExtension(base: unknown, config: unknown, priorExtensions?: ReadonlyArray<unknown>): any {
  return inFileScope(
    () => extendComponentRecipe(base as never, config as never, priorExtensions as never) as any,
    "@crumbs/extension-test",
  )
}

function captureWarnings(run: () => void): ReadonlyArray<string> {
  const originalWarn = console.warn
  const warnings: string[] = []
  console.warn = (...args: ReadonlyArray<unknown>) => warnings.push(args.map(String).join(" "))
  try {
    run()
  } finally {
    console.warn = originalWarn
  }
  return warnings
}

describe("component recipe extensions", () => {
  it("adds only permitted values and resolves in owner axis, compound, then override order", () => {
    const base = makeButton()
    const extension = authorExtension(base, extensionConfig("ExpectedOrder", "brand", {
      compoundVariants: [{
        variants: {tone: "brand", size: "large"},
        styles: {root: {borderRadius: 20}},
      }],
      slotOverrides: {root: {borderWidth: 1}},
    }))
    const resolver = createComponentRecipeResolver(base, {extensions: [extension] as never, cacheSize: 0})
    const result = resolver({size: "large", tone: "brand"} as never)

    expect(result.root).toEqual([
      base.base!.root,
      base.variants.size.large.root,
      extension.variants.tone.brand.root,
      base.compoundVariants[0]!.styles.root,
      extension.compoundVariants[0]!.styles.root,
      extension.slotOverrides.root,
    ])
    expect(result.label).toEqual([base.base!.label])
    expect(Object.isFrozen(result.label)).toBe(true)
  })

  it("resolves linear ancestry, extension defaults, caller overrides, and bounded cache reuse", () => {
    const base = makeButton()
    const first = authorExtension(base, extensionConfig("ChainFirst", "brand", {
      slotOverrides: {root: {borderWidth: 1}},
    }))
    const second = authorExtension(base, extensionConfig("ChainSecond", "partner", {
      slotOverrides: {root: {borderWidth: 2}},
    }), [first])
    const resolver = createComponentRecipeResolver(base, {extensions: [first, second] as never, cacheSize: 2})

    const latestDefault = resolver({size: "large"} as never)
    const equivalent = resolver({size: "large", tone: "partner"} as never)
    const callerWins = resolver({size: "large", tone: "brand"} as never)
    expect(latestDefault).toBe(equivalent)
    expect(latestDefault.root).toEqual([
      base.base!.root,
      base.variants.size.large.root,
      second.variants.tone.partner.root,
      base.compoundVariants[0]!.styles.root,
      first.slotOverrides.root,
      second.slotOverrides.root,
    ])
    expect(callerWins.root).toEqual([
      base.base!.root,
      base.variants.size.large.root,
      first.variants.tone.brand.root,
      base.compoundVariants[0]!.styles.root,
      first.slotOverrides.root,
      second.slotOverrides.root,
    ])
    expect(resolver.getCacheStats()).toMatchObject({hits: 1, misses: 2, capacity: 2})
    expect(second.parentExtensionIdentity).toEqual(first.identity)

    const direct = resolveComponentRecipeStyles(base, {tone: "partner"} as never, {
      extensions: [first, second] as never,
    } as never)
    expect(direct.root).toEqual([
      base.base!.root,
      base.variants.size.small.root,
      second.variants.tone.partner.root,
      first.slotOverrides.root,
      second.slotOverrides.root,
    ])
  })

  it("validates public-token visibility and every permission before capturing styles", () => {
    const base = makeButton()
    const invalid = [
      extensionConfig("DeniedDefault", "brand", {defaultVariants: {size: "large"}}),
      extensionConfig("DeniedValueAxis", "brand", {variants: {size: {huge: {root: {opacity: 1}}}}}),
      extensionConfig("DeniedSlot", "brand", {slotOverrides: {label: {opacity: 1}}}),
      extensionConfig("DeniedPrivateSlot", "brand", {slotOverrides: {internalIcon: {width: 16}}}),
      extensionConfig("Replacement", "brand", {variants: {tone: {primary: {root: {opacity: 0}}}}}),
      extensionConfig("AddedAxis", "brand", {variants: {density: {roomy: {root: {opacity: 1}}}}}),
      extensionConfig("PrivateToken", "brand", {variants: {tone: {brand: {root: {color: brandTokens.color.internal}}}}}),
    ]

    for (const config of invalid) {
      expect(() => extendComponentRecipe(base as never, config as never)).toThrow()
    }
    expect(() => extendComponentRecipe(base as never, extensionConfig("UnpermittedDefault", "brand", {
      defaultVariants: {size: "large"},
    }) as never)).toThrow(/not permitted by extensionPoints\.defaults/i)
    expect(() => extendComponentRecipe(base as never, extensionConfig("UnpermittedValue", "brand", {
      variants: {size: {huge: {root: {opacity: 1}}}},
    }) as never)).toThrow(/not permitted by extensionPoints\.variantValues/i)
    const sealedBase = makeButton({compoundPermission: false})
    expect(() => extendComponentRecipe(sealedBase as never, extensionConfig("UnpermittedCompound", "brand", {
      compoundVariants: [{variants: {size: "large"}, styles: {root: {opacity: 1}}}],
    }) as never)).toThrow(/compoundVariants.*permission|permission.*compoundVariants/i)
    expect(() => extendComponentRecipe(base as never, extensionConfig("PrivateTokenSpecific", "brand", {
      variants: {tone: {brand: {root: {color: brandTokens.color.internal}}}},
    }) as never)).toThrow(/private.*token|token.*private/i)
    expect(() => extendComponentRecipe(base as never, extensionConfig("UnregisteredToken", "brand", {
      variants: {tone: {brand: {root: {color: "var(--crumbs-unregistered-secret)"}}}},
    }) as never)).toThrow(/unregistered.*token/i)
    for (const [name, field] of [
      ["NullDefaults", {defaultVariants: null}],
      ["NullVariants", {variants: null}],
      ["NullCompounds", {compoundVariants: null}],
      ["NullOverrides", {slotOverrides: null}],
    ] as const) {
      expect(() => extendComponentRecipe(base as never, extensionConfig(name, "brand", field) as never))
        .toThrow(/plain data record|must be an array/i)
    }
  })

  it("keeps owner state constraint cases sealed when state values are otherwise exposed", () => {
    const base = makeButton({stateful: true, stateValuePermission: true})
    expect(() => extendComponentRecipe(base as never, extensionConfig("AddedState", "brand", {
      variants: {status: {paused: {root: {opacity: 0.2}}}},
    }) as never)).toThrow(/state discriminator.*sealed/i)
  })

  it("rejects defaults that violate owner state and defaults to base-only on invalid runtime state", () => {
    const base = makeButton({stateful: true})
    expect(() => extendComponentRecipe(base as never, extensionConfig("InvalidStateDefault", "quiet") as never))
      .toThrow(/default.*state|state.*default|constraint/i)

    const extension = authorExtension(base, extensionConfig("StateSafeExtension", "brand", {
      defaultVariants: {},
    }))
    const warnings = captureWarnings(() => {
      const resolver = createComponentRecipeResolver(base, {extensions: [extension] as never, cacheSize: 0})
      const invalid = resolver({status: "loading", tone: "primary"} as never)
      expect(invalid.root).toEqual([base.base!.root])
      expect(invalid.label).toEqual([base.base!.label])
    })
    expect(warnings.some(message => message.includes("state \"status\""))).toBe(true)
  })

  it("rejects repeated ancestor values, identity collisions, mismatched bases, and parent links", () => {
    const base = makeButton()
    const first = authorExtension(base, extensionConfig("AncestorBrand", "brand"))
    expect(() => extendComponentRecipe(base as never, extensionConfig("LeafRepeatsBrand", "brand") as never, [first] as never))
      .toThrow(/already exists|duplicate.*value/i)
    expect(() => extendComponentRecipe(base as never, {
      ...extensionConfig("BaseIdentityCollision"),
      identity: base.contract!.identity,
    } as never)).toThrow(/identity.*collid|collision/i)

    const otherBase = makeButton()
    expect(() => createComponentRecipeResolver(otherBase, {extensions: [first] as never}))
      .toThrow(/component identity|different base/i)

    const second = authorExtension(base, extensionConfig("ParentLinked", "partner"), [first])
    const mismatchedParent = {
      ...second,
      parentExtensionIdentity: {owner: "@acme/brand", name: "NotTheParent", version: 1},
    }
    expect(() => createComponentRecipeResolver(base, {extensions: [first, mismatchedParent] as never}))
      .toThrow(/parent.*identity|identity.*parent/i)

    const secondValue = authorExtension(base, extensionConfig("NonImmediateValue", "partner"), [first])
    expect(() => extendComponentRecipe(base as never, extensionConfig("RepeatsNonImmediateValue", "brand") as never,
      [first, secondValue] as never)).toThrow(/already exists|duplicate.*value/i)
  })

  it("does not allow extension authors to replace private owner values", () => {
    const base = makeButton({privateToneValue: true})
    expect(() => authorExtension(base, extensionConfig("CannotReplacePrivateValue", "internal")))
      .toThrow(/already exists|duplicate.*value/i)
  })

  it("rejects private owner values from untyped extension selections", () => {
    const base = makeButton({privateToneValue: true})
    const extension = authorExtension(base, extensionConfig("PrivateSelectionGuard", "brand"))
    const resolver = createComponentRecipeResolver(base, {extensions: [extension] as never, cacheSize: 0})

    expect(() => resolver({tone: "internal"} as never)).toThrow(/private|unknown.*value|invalid.*value/i)
  })

  it("rejects malformed extension DTOs and extension-only selection keys", () => {
    const base = makeButton()
    const extension = authorExtension(base, extensionConfig("MalformedBase"))
    expect(() => createComponentRecipeResolver(base, {
      extensions: [{...extension, version: 2}] as never,
    })).toThrow(/unsupported.*version/i)
    expect(() => createComponentRecipeResolver(base, {
      extensions: [{...extension, defaultVariants: {tone: () => "brand"}}] as never,
    })).toThrow(/data|plain|values.*string/i)
    class MalformedSlotStyle { readonly opacity = 0.4 }
    expect(() => createComponentRecipeResolver(base, {
      extensions: [{...extension, slotOverrides: {root: new MalformedSlotStyle()}}] as never,
    })).toThrow(/plain|data record/i)
    expect(() => createComponentRecipeResolver(base, {
      extensions: [{...extension, stateVariants: {tone: {brand: {}}}}] as never,
    })).toThrow(/unknown.*field|extension descriptor/i)
    expect(() => createComponentRecipeResolver(base, {extensions: null} as never)).toThrow(/array/i)

    const resolver = createComponentRecipeResolver(base, {extensions: [extension] as never, cacheSize: 0})
    expect(() => resolver({density: "compact"} as never)).toThrow(/private|unknown selection key/i)
    expect(() => resolver({notASelection: "value"} as never)).toThrow(/unknown.*selection key/i)
    expect(() => resolver({[Symbol("hidden")]: "value"} as never)).toThrow(/symbol selection key/i)
    expect(resolver.getCacheStats()).toMatchObject({hits: 0, misses: 0, size: 0})
    const warnings = captureWarnings(() => {
      const result = resolver({tone: "missing"} as never)
      expect(result.root).toEqual([
        base.base!.root,
        base.variants.size.small.root,
        base.variants.density.compact.root,
      ])
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/tone.*missing|missing.*tone/i)
  })
})
