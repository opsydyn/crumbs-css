import { describe, expect, it } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { runInNewContext } from "node:vm"
import { createThemeTokenReference } from "../src/theme-token"
import { buildStyleSheetCode, transformCssTsToStyleSheet } from "../src/transformer"

const packageRoot = path.resolve(import.meta.dir, "..")

function evaluateModule(code: string): Record<string, unknown> {
  const exports: Record<string, unknown> = Object.create(null)
  runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), {
    exports,
    StyleSheet: { create: (styles: unknown) => styles },
  })
  return exports
}

async function compile(source: string): Promise<Record<string, unknown>> {
  const directory = mkdtempSync(path.join(packageRoot, "fixtures/.m2-6-"))
  try {
    const file = path.join(directory, "case.css.ts")
    writeFileSync(file, `import { createTheme, createThemeContract, viewStyle } from "@opsydyn/crumbs-css/style";\n${source}`)
    return evaluateModule(await transformCssTsToStyleSheet(file, packageRoot, { useStyleSheet: false }))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe("M2.6 direct native module emission", () => {
  it("emits immutable minimal token and condition metadata from final native styles", () => {
    const code = buildStyleSheetCode(
      new Map([["panel", "panel"], ["empty", "empty"]]),
      new Map([["panel", {
        backgroundColor: createThemeTokenReference("--crumbs-accent"),
        transform: [{ scale: 2 }, { translateX: 4 }],
      }]]),
      [],
      { useStyleSheet: false },
    )
    const module = evaluateModule(code)
    expect(module.__crumbsModule).toEqual({
      $$type: "crumbs.css.native-module",
      version: 1,
      tokens: ["--crumbs-accent"],
      conditions: [],
    })
    expect(Object.isFrozen(module.__crumbsModule)).toBe(true)
    expect(Object.isFrozen((module.__crumbsModule as { tokens: unknown }).tokens)).toBe(true)
    expect(Object.isFrozen((module.__crumbsModule as { conditions: unknown }).conditions)).toBe(true)
    expect(module.empty).toBeUndefined()
  })

  it("sorts and deduplicates multiple surviving token references", () => {
    const code = buildStyleSheetCode(
      new Map(),
      new Map([["tokens", {
        backgroundColor: createThemeTokenReference("--crumbs-zeta"),
        borderColor: createThemeTokenReference("--crumbs-alpha"),
        transform: [{ translateX: createThemeTokenReference("--crumbs-zeta") }],
      }]]),
      [],
      { useStyleSheet: false },
    )

    expect(evaluateModule(code).__crumbsModule).toEqual({
      $$type: "crumbs.css.native-module",
      version: 1,
      tokens: ["--crumbs-alpha", "--crumbs-zeta"],
      conditions: [],
    })
  })

  it("preserves structured styles, ordinary exports, empty styles and theme descriptors on the direct path", async () => {
    const module = await compile(`
      const vars = createThemeContract({ color: { accent: null }, space: { md: null } });
      export const panel = viewStyle([
        { width: vars.space.md, transform: [{ scale: 2 }, { translateX: 4 }] },
        { width: 24, backgroundColor: vars.color.accent },
      ]);
      export const empty = viewStyle({});
      export const theme = createTheme(vars, { color: { accent: "#224466" }, space: { md: 12 } });
      export const ordinary = { $$type: "crumbs.css.native-module", version: 99, tokens: ["ordinary"], conditions: ["ordinary"] };
    `)
    expect(module.__crumbsModule).toEqual({
      $$type: "crumbs.css.native-module",
      version: 1,
      tokens: ["--crumbs-color-accent"],
      conditions: [],
    })
    expect(module.panel).toEqual({
      width: 24,
      backgroundColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-color-accent" },
      transform: [{ scale: 2 }, { translateX: 4 }],
    })
    expect(module.empty).toBeUndefined()
    expect(module.theme).toMatchObject({
      tokens: { "--crumbs-color-accent": "#224466", "--crumbs-space-md": 12 },
      values: { color: { accent: "#224466" }, space: { md: 12 } },
    })
    expect(module.ordinary).toEqual({ $$type: "crumbs.css.native-module", version: 99, tokens: ["ordinary"], conditions: ["ordinary"] })
  })

  it("uses captured exports rather than reserialising and re-evaluating a vanilla module", () => {
    const source = readFileSync(path.join(packageRoot, "src/transformer.ts"), "utf8")
    expect(source).not.toContain("serializeVanillaModule")
    expect(source).not.toContain("collectStyleExports")
  })

  it("reserves the generated module descriptor binding", async () => {
    await expect(compile(`export const __crumbsModule = "user value";`)).rejects.toThrow(
      /CRUMBS_CSS_UNSUPPORTED_EXPORT.*__crumbsModule/,
    )
  })

  it("rejects the reserved binding at the final emitter boundary", () => {
    expect(() => buildStyleSheetCode(
      new Map([["__crumbsModule", "user value"]]),
      new Map(),
    )).toThrow(/__crumbsModule.*reserved/)
  })
})
