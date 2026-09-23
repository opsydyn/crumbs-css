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
  readonly version: 2
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

async function compile(source: string): Promise<Record<string, CompiledComponent>> {
  const dir = mkdtempSync(path.join(root, "fixtures/.component-recipe-compiler-"))
  try {
    const file = path.join(dir, "case.css.ts")
    writeFileSync(file, `import {componentRecipe, createThemeContract, viewStyle} from '@opsydyn/crumbs-css/style';\n${source}`)
    const code = await transformCssTsToStyleSheet(file, root, {useStyleSheet: false, strictDiagnostics: true})
    const exports: Record<string, unknown> = {}
    runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), {exports})
    return JSON.parse(JSON.stringify(exports)) as Record<string, CompiledComponent>
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

  it("reports an escaped primitive mismatch with the component slot path", async () => {
    await expect(compile(`
      export const button = componentRecipe({
        slots: {root: "view", label: "text"},
        variants: {tone: {primary: {label: {resizeMode: "contain"} as never}}},
      }, "button");
    `)).rejects.toThrow(/button\.label/)
  })
})
