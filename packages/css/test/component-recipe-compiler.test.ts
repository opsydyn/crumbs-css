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
  readonly version: 1
  readonly slots: Record<string, "view" | "text" | "image">
  readonly base?: Record<string, CompiledStyle>
  readonly variants: Record<string, Record<string, Record<string, CompiledStyle>>>
  readonly defaultVariants: Record<string, string | boolean>
  readonly compoundVariants: Array<{
    readonly variants: Record<string, string | boolean>
    readonly styles: Record<string, CompiledStyle>
  }>
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
    expect(button.version).toBe(1)
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

  it("reports an escaped primitive mismatch with the component slot path", async () => {
    await expect(compile(`
      export const button = componentRecipe({
        slots: {root: "view", label: "text"},
        variants: {tone: {primary: {label: {resizeMode: "contain"} as never}}},
      }, "button");
    `)).rejects.toThrow(/button\.label/)
  })
})
