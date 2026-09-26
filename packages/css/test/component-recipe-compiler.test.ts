import {describe, expect, it} from "bun:test"
import {mkdtempSync, rmSync, writeFileSync} from "node:fs"
import * as path from "node:path"
import {runInNewContext} from "node:vm"
import {resolveThemeTokens} from "../src/theme-runtime"
import {transformCssTsToStyleSheet} from "../src/transformer"

const root = path.resolve(import.meta.dir, "..")

type CompiledStyle = Record<string, unknown>
type CompiledComponent = {
  readonly $$type: "crumbs.css.component-recipe"
  readonly version: 2 | 3
  readonly contract?: {
    readonly identity: {readonly owner: string; readonly name: string; readonly version: number}
    readonly public: {
      readonly slots: ReadonlyArray<string>
      readonly variants: Readonly<Record<string, ReadonlyArray<string>>>
    }
    readonly extensionPoints?: object
  }
  readonly slots: Record<string, "view" | "text" | "image">
  readonly base?: Record<string, CompiledStyle>
  readonly variants: Record<string, Record<string, Record<string, CompiledStyle>>>
  readonly defaultVariants: Record<string, string | boolean>
  readonly compoundVariants: Array<{
    readonly variants: Record<string, string | boolean>
    readonly styles: Record<string, CompiledStyle>
  }>
  readonly stateVariants?: Record<string, Record<string, Record<string, ReadonlyArray<string | boolean>>>>
}

type CompiledExtension = {
  readonly $$type: "crumbs.css.component-recipe-extension"
  readonly version: 1
  readonly identity: {readonly owner: string; readonly name: string; readonly version: number}
  readonly componentIdentity: {readonly owner: string; readonly name: string; readonly version: number}
  readonly parentExtensionIdentity?: {readonly owner: string; readonly name: string; readonly version: number}
  readonly defaultVariants: Record<string, string | boolean>
  readonly variants: Record<string, Record<string, Record<string, unknown>>>
  readonly compoundVariants: Array<{readonly variants: Record<string, string | boolean>; readonly styles: Record<string, unknown>}>
  readonly slotOverrides: Record<string, unknown>
}

async function compile<TExport = CompiledComponent>(source: string): Promise<Record<string, TExport>> {
  const dir = mkdtempSync(path.join(root, "fixtures/.component-recipe-compiler-"))
  try {
    const file = path.join(dir, "case.css.ts")
    writeFileSync(file, `import {componentRecipe, createThemeContract, extendComponentRecipe, viewStyle} from '@opsydyn/crumbs-css/style';\n${source}`)
    const code = await transformCssTsToStyleSheet(file, root, {useStyleSheet: false, strictDiagnostics: true})
    const exports: Record<string, unknown> = {}
    runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), {exports})
    return JSON.parse(JSON.stringify(exports)) as Record<string, TExport>
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
}

describe("component recipe compiler artifacts", () => {
  it("captures and emits tagged multi-slot branches, compositions, compounds, and tokens", async () => {
    const exports = await compile(`
      const vars = createThemeContract({color: {label: null}, spacing: {control: null}});
      const sharedRoot = viewStyle({opacity: 0.5});
      export const button = componentRecipe({
        slots: {root: "view", label: "text", icon: "image"},
        base: {
          root: [sharedRoot, {padding: vars.spacing.control}],
          label: {fontSize: 14},
          icon: {resizeMode: "contain"},
        },
        variants: {
          tone: {
            primary: {
              root: {backgroundColor: "white"},
              label: {color: vars.color.label},
              icon: {tintColor: "blue"},
            },
            quiet: {label: {color: "black"}},
          },
        },
        defaultVariants: {tone: "primary"},
        compoundVariants: [{variants: {tone: "primary"}, styles: {label: {fontWeight: "700"}}}],
      }, "button");
    `)

    const button = exports.button!
    expect(button.$$type).toBe("crumbs.css.component-recipe")
    expect(button.version).toBe(2)
    expect(button.slots).toEqual({root: "view", label: "text", icon: "image"})
    expect(button.base?.root).toEqual({
      opacity: 0.5,
      paddingTop: {$$type: "crumbs.css.theme-token", varName: "--crumbs-spacing-control"},
      paddingRight: {$$type: "crumbs.css.theme-token", varName: "--crumbs-spacing-control"},
      paddingBottom: {$$type: "crumbs.css.theme-token", varName: "--crumbs-spacing-control"},
      paddingLeft: {$$type: "crumbs.css.theme-token", varName: "--crumbs-spacing-control"},
    })
    expect(button.base?.icon).toEqual({resizeMode: "contain"})

    const resolved = resolveThemeTokens(button, {
      contract: {},
      values: {},
      tokens: {"--crumbs-color-label": "#fff", "--crumbs-spacing-control": 12},
    })!
    expect(resolved.base?.root).toEqual({opacity: 0.5, paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12})
    expect(resolved.variants.tone?.primary?.label).toEqual({color: "#fff"})
    expect(resolved.compoundVariants[0]?.styles.label).toEqual({fontWeight: "700"})
  })

  it("preserves state constraints and every authored branch in the compiled v2 descriptor", async () => {
    const exports = await compile(`
      const vars = createThemeContract({color: {label: null}});
      export const button = componentRecipe({
        slots: {root: "view", label: "text"},
        base: {
          root: {opacity: 0.25},
          label: {color: vars.color.label},
        },
        variants: {
          status: {
            ready: {root: {borderWidth: 1}},
            loading: {root: {borderWidth: 2}},
          },
          busy: {
            false: {root: {opacity: 0.5}},
            true: {root: {opacity: 0.75}},
          },
          tone: {
            primary: {label: {fontWeight: "700", color: vars.color.label}},
            quiet: {label: {fontWeight: "400"}},
          },
        },
        defaultVariants: {status: "ready", busy: false, tone: "primary"},
        stateVariants: {
          status: {
            ready: {busy: [false], tone: ["primary", "quiet"]},
            loading: {busy: [true], tone: ["primary"]},
          },
        },
      }, "button");
    `)

    const button = exports.button!
    expect(button.$$type).toBe("crumbs.css.component-recipe")
    expect(button.version).toBe(2)
    expect(button.stateVariants).toEqual({
      status: {
        ready: {busy: [false], tone: ["primary", "quiet"]},
        loading: {busy: [true], tone: ["primary"]},
      },
    })
    expect(button.base).toEqual({
      root: {opacity: 0.25},
      label: {color: {$$type: "crumbs.css.theme-token", varName: "--crumbs-color-label"}},
    })
    expect(button.variants).toEqual({
      status: {
        ready: {root: {borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderLeftWidth: 1}},
        loading: {root: {borderTopWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderLeftWidth: 2}},
      },
      busy: {
        false: {root: {opacity: 0.5}},
        true: {root: {opacity: 0.75}},
      },
      tone: {
        primary: {
          label: {
            fontWeight: "700",
            color: {$$type: "crumbs.css.theme-token", varName: "--crumbs-color-label"},
          },
        },
        quiet: {label: {fontWeight: "400"}},
      },
    })

    const resolved = resolveThemeTokens(button, {
      contract: {},
      values: {},
      tokens: {"--crumbs-color-label": "#fff"},
    })!
    expect(resolved.stateVariants).toEqual(button.stateVariants)
    expect(resolved.base?.label).toEqual({color: "#fff"})
    expect(resolved.variants.tone?.primary?.label).toEqual({fontWeight: "700", color: "#fff"})
    expect(resolved.variants.tone?.quiet?.label).toEqual({fontWeight: "400"})
  })

  it("captures v3 owner and extension DTOs with operations and style class references", async () => {
    const exports = await compile<CompiledComponent | CompiledExtension>(`
      const vars = createThemeContract({color: {brand: null, label: null}});
      export const button = componentRecipe({
        contract: {
          identity: {owner: "@acme/ui", name: "CompiledExtensionButton", version: 1},
          public: {slots: ["root", "label"], variants: {tone: ["primary", "quiet"]}},
          extensionPoints: {defaults: ["tone"], variantValues: ["tone"], compoundVariants: true, slotStyles: ["root", "label"]},
        },
        slots: {root: "view", label: "text", internalIcon: "image"},
        base: {root: {padding: 8}, label: {color: vars.color.label}},
        variants: {
          tone: {primary: {root: {opacity: 1}}, quiet: {root: {opacity: 0.8}}},
          density: {compact: {internalIcon: {width: 12}}},
        },
        defaultVariants: {tone: "primary", density: "compact"},
      }, "button");
      export const legacy = componentRecipe({
        slots: {root: "view"},
        variants: {size: {small: {root: {padding: 4}}}},
        defaultVariants: {size: "small"},
      }, "legacy");
      const baseBrand = extendComponentRecipe(button, {
        identity: {owner: "@acme/brand", name: "BaseButtonBrand", version: 1},
        slotOverrides: {root: {opacity: 0.9}},
      });
      export const branded = extendComponentRecipe(button, {
        identity: {owner: "@acme/brand", name: "CompiledButtonBrand", version: 1},
        defaultVariants: {tone: "brand"},
        variants: {tone: {brand: {root: {backgroundColor: vars.color.brand}, label: {color: vars.color.label}}}},
        compoundVariants: [{variants: {tone: "brand"}, styles: {root: {borderWidth: 1}}}],
        slotOverrides: {root: {borderColor: vars.color.brand}},
      }, [baseBrand]);
    `)

    const button = exports.button as CompiledComponent
    const legacy = exports.legacy as CompiledComponent
    const branded = exports.branded as CompiledExtension
    expect(legacy.$$type).toBe("crumbs.css.component-recipe")
    expect(legacy.version).toBe(2)
    expect(legacy).not.toHaveProperty("contract")
    expect(button.version).toBe(3)
    expect(button.contract?.identity).toEqual({owner: "@acme/ui", name: "CompiledExtensionButton", version: 1})
    expect(button.contract?.public).toEqual({slots: ["root", "label"], variants: {tone: ["primary", "quiet"]}})
    expect(branded.$$type).toBe("crumbs.css.component-recipe-extension")
    expect(branded.version).toBe(1)
    expect(branded.identity).toEqual({owner: "@acme/brand", name: "CompiledButtonBrand", version: 1})
    expect(branded.componentIdentity).toEqual({owner: "@acme/ui", name: "CompiledExtensionButton", version: 1})
    expect(branded.parentExtensionIdentity).toEqual({owner: "@acme/brand", name: "BaseButtonBrand", version: 1})
    expect(branded.defaultVariants).toEqual({tone: "brand"})
    expect(branded.variants.tone?.brand).toBeDefined()
    expect(Object.values(branded.variants.tone?.brand ?? {})).toEqual(expect.arrayContaining([
      expect.objectContaining({color: expect.objectContaining({$$type: "crumbs.css.theme-token"})}),
    ]))
    expect(branded.compoundVariants).toHaveLength(1)
    expect(branded.compoundVariants[0]?.variants).toEqual({tone: "brand"})
    expect(branded.slotOverrides.root).toBeDefined()
    expect(button.variants.density?.compact?.internalIcon).toEqual({width: 12})

    const resolved = resolveThemeTokens(branded as never, {contract: {}, values: {}, tokens: {
      "--crumbs-color-brand": "#336699",
      "--crumbs-color-label": "#ffffff",
    }}) as unknown as CompiledExtension
    expect(resolved.variants.tone?.brand?.root).toMatchObject({backgroundColor: "#336699"})
    expect(resolved.compoundVariants[0]?.styles.root).toMatchObject({
      borderTopWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderLeftWidth: 1,
    })
    expect(resolved.slotOverrides.root).toMatchObject({
      borderTopColor: "#336699",
      borderRightColor: "#336699",
      borderBottomColor: "#336699",
      borderLeftColor: "#336699",
    })
  })

  it("reports an escaped primitive mismatch with the component slot path", async () => {
    await expect(compile(`
      export const button = componentRecipe({
        slots: {root: "view", label: "text"},
        variants: {tone: {primary: {label: {resizeMode: "contain"} as never}}},
      }, "button");
    `)).rejects.toThrow(/button\.label/)
  })
  it("captures and preserves v3 component contract metadata", async () => {
    const exports = await compile(`
      export const button = componentRecipe({
        contract: {
          identity: {owner: "@acme/ui", name: "CompiledButton", version: 1},
          public: {slots: ["root"], variants: {tone: ["primary"]}},
          extensionPoints: {defaults: ["tone"], variantValues: ["tone"], slotStyles: ["root"]},
        },
        slots: {root: "view", internalIcon: "image"},
        variants: {
          tone: {primary: {root: {opacity: 1}}},
          density: {compact: {internalIcon: {width: 12}}},
        },
        defaultVariants: {tone: "primary", density: "compact"},
      }, "button");
    `)

    const button = exports.button!
    expect(button.version).toBe(3)
    expect(button.contract).toEqual({
      identity: {owner: "@acme/ui", name: "CompiledButton", version: 1},
      public: {slots: ["root"], variants: {tone: ["primary"]}},
      extensionPoints: {defaults: ["tone"], variantValues: ["tone"], slotStyles: ["root"]},
    })
    expect(button.variants.density?.compact?.internalIcon).toEqual({width: 12})
    const resolved = resolveThemeTokens(button, {contract: {}, values: {}, tokens: {}})!
    expect(resolved.version).toBe(3)
    expect(resolved.contract).toEqual(button.contract)
  })
})
