import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import * as path from "node:path"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { resolveThemeTokens } from "../src/theme-runtime"

type Rule = Record<string, string | number>
type Node = Rule | { readonly ref: number } | ReadonlyArray<Node>
const root = path.resolve(import.meta.dir, "..")
const theme = { contract: {}, values: {}, tokens: { "--crumbs-composition-accent": "purple" } }

// Reference semantics walk authored nodes and expand only this fixture's
// physical spacing families. No production converter or class-list parser is used.
function reference(node: Node, bases: ReadonlyArray<Node>, result: Rule = {}): Rule {
  if (Array.isArray(node)) {
    for (const child of node) reference(child, bases, result)
  } else if ("ref" in node) {
    reference(bases[Number(node.ref)]!, bases, result)
  } else {
    for (const [key, value] of Object.entries(node)) {
      const resolved = value === "var(--crumbs-composition-accent)" ? "purple"
        : value === "var(--crumbs-spacing-regression-wide)" ? 24 : value
      if (key === "gap") {
        result.rowGap = resolved
        result.columnGap = resolved
      } else if (key === "padding" || key === "margin") {
        for (const side of ["Top", "Right", "Bottom", "Left"]) result[`${key}${side}`] = resolved
      } else if (key === "paddingHorizontal" || key === "marginHorizontal") {
        for (const side of ["Left", "Right"]) result[`${key.slice(0, -10)}${side}`] = resolved
      } else if (key === "paddingVertical" || key === "marginVertical") {
        for (const side of ["Top", "Bottom"]) result[`${key.slice(0, -8)}${side}`] = resolved
      } else result[key] = resolved
    }
  }
  return result
}

function author(node: Node): string {
  if (Array.isArray(node)) return `[${node.map(author).join(",")}]`
  if ("ref" in node) return `base${node.ref}`
  return JSON.stringify(node)
}

async function compile(source: string): Promise<Record<string, unknown>> {
  const dir = mkdtempSync(path.join(root, "fixtures/.composition-"))
  const file = path.join(dir, "case.css.ts")
  try {
    writeFileSync(file, `import { style, viewStyle, textStyle, imageStyle, styleVariants, createThemeContract } from '@opsydyn/crumbs-css/style';\n${source}`)
    const code = await transformCssTsToStyleSheet(file, root, { useStyleSheet: false, strictDiagnostics: true })
    const exports: Record<string, unknown> = {}
    runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), { exports })
    return JSON.parse(JSON.stringify(exports))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const bases: Node[] = [
  { color: "red", fontSize: 14, padding: 8 },
  { color: "green", opacity: 0.8, paddingLeft: 3 },
  [{ ref: 0 }, { color: "blue" }],
]
const cases: Record<string, Node> = {
  laterInline: [{ ref: 0 }, { color: "blue" }],
  laterBase: [{ color: "blue" }, { ref: 0 }],
  multipleBases: [{ ref: 0 }, { ref: 1 }],
  inlineBetween: [{ ref: 0 }, { color: "blue" }, { ref: 1 }],
  nestedComposition: [{ ref: 2 }, { color: "purple" }],
  repeatedBase: [{ ref: 0 }, { ref: 1 }, { ref: 0 }],
  laterShorthand: [{ paddingLeft: 3 }, { padding: 8 }],
  laterLonghand: [{ padding: 8 }, { paddingLeft: 3 }],
}

describe("native composition compilation", () => {
  it("preserves token spacing precedence inside rules and across nested compositions", async () => {
    const exports = await compile(`
      const vars = createThemeContract({ spacingRegression: { wide: null } });
      const base = viewStyle({ padding: vars.spacingRegression.wide });
      export const literalWins = viewStyle([base, { paddingLeft: 3 }]);
      export const tokenWins = viewStyle([{ paddingLeft: 3 }, base]);
      export const sameRule = viewStyle({ paddingLeft: 3, padding: vars.spacingRegression.wide });
      export const sameRuleLiteralWins = viewStyle({ padding: vars.spacingRegression.wide, paddingLeft: 3 });
      export const axes = viewStyle([{ marginVertical: vars.spacingRegression.wide }, [{ marginTop: -5 }]]);
      export const gaps = viewStyle([{ gap: vars.spacingRegression.wide }, { rowGap: 3 }]);
    `)
    const spacingTheme = { contract: {}, values: {}, tokens: { "--crumbs-spacing-regression-wide": 24 } }
    expect(resolveThemeTokens(exports.literalWins, spacingTheme)).toEqual({ paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 3 })
    expect(resolveThemeTokens(exports.tokenWins, spacingTheme)).toEqual({ paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24 })
    expect(resolveThemeTokens(exports.sameRule, spacingTheme)).toEqual({ paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24 })
    expect(resolveThemeTokens(exports.sameRuleLiteralWins, spacingTheme)).toEqual({ paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 3 })
    expect(resolveThemeTokens(exports.axes, spacingTheme)).toEqual({ marginTop: -5, marginBottom: 24 })
    expect(resolveThemeTokens(exports.gaps, spacingTheme)).toEqual({ rowGap: 3, columnGap: 24 })
  })

  it("matches generated compiled token and literal spacing compositions", async () => {
    const value = fc.oneof(fc.integer({ min: 0, max: 30 }), fc.constant("var(--crumbs-spacing-regression-wide)"))
    const rule = fc.tuple(fc.constantFrom("padding", "paddingLeft", "paddingHorizontal", "paddingVertical", "margin", "marginTop", "marginHorizontal", "marginVertical", "gap", "rowGap", "columnGap"), value)
      .map(([key, value]) => ({ [key]: value }))
    const nodes = fc.array(fc.oneof(rule, fc.array(rule, { minLength: 1, maxLength: 3 })), { minLength: 2, maxLength: 8 })
    await fc.assert(fc.asyncProperty(nodes, async (node) => {
      const authored = author(node).replaceAll(JSON.stringify("var(--crumbs-spacing-regression-wide)"), "vars.spacingRegression.wide")
      const exports = await compile(`const vars = createThemeContract({ spacingRegression: { wide: null } }); export const result = viewStyle(${authored});`)
      const spacingTheme = { contract: {}, values: {}, tokens: { "--crumbs-spacing-regression-wide": 24 } }
      expect(resolveThemeTokens(exports.result, spacingTheme)).toEqual(reference(node, []))
    }), { seed: 20260916, numRuns: 100 })
  })

  it("matches independent ordered evaluation for bases, overrides, repeats and padding", async () => {
    const exports = await compile([
      ...bases.map((node, index) => `const base${index} = style(${author(node)});`),
      ...Object.entries(cases).map(([name, node]) => `export const ${name} = style(${author(node)});`),
    ].join("\n"))
    for (const [name, node] of Object.entries(cases)) expect(exports[name]).toEqual(reference(node, bases))
  })

  it("preserves nested arrays and primitive helper and variant composition", async () => {
    const exports = await compile(`
      const base = viewStyle({ opacity: 0.5 });
      export const panel = viewStyle([base, [{ opacity: 0.8 }, { opacity: 1 }]]);
      const label = textStyle({ color: 'red' });
      export const title = textStyle([label, { color: 'blue' }]);
      const icon = imageStyle({ resizeMode: 'contain' });
      export const image = imageStyle([icon, { resizeMode: 'cover' }]);
      export const variants = styleVariants({ active: [base, { opacity: 1 }] });
    `)
    expect(exports.panel).toEqual({ opacity: 1 })
    expect(exports.title).toEqual({ color: "blue" })
    expect(exports.image).toEqual({ resizeMode: "cover" })
    expect(exports.variants).toEqual({ active: { opacity: 1 } })
  })

  it("resolves only the winning token or literal on the same property", async () => {
    const exports = await compile(`
      const vars = createThemeContract({ composition: { accent: null } });
      const token = style({ color: vars.composition.accent });
      const literal = style({ color: 'red' });
      export const literalWins = style([token, { color: 'blue' }]);
      export const tokenWins = style([literal, { color: vars.composition.accent }]);
      export const shadowedMissingToken = style([token, { color: 'blue' }]);
    `)
    expect(resolveThemeTokens(exports.literalWins, theme)).toEqual({ color: "blue" })
    expect(resolveThemeTokens(exports.tokenWins, theme)).toEqual({ color: "purple" })
    expect(resolveThemeTokens(exports.shadowedMissingToken, { ...theme, tokens: {} })).toEqual({ color: "blue" })
  })

  it("matches generated ordered graphs with a reproducible seed", async () => {
    const entry = fc.oneof(
      fc.integer({ min: 0, max: 2 }).map((ref) => ({ ref })),
      fc.record({ color: fc.constantFrom("red", "blue", "green"), paddingLeft: fc.integer({ min: 0, max: 20 }) }),
    )
    await fc.assert(fc.asyncProperty(
      fc.array(entry, { minLength: 2, maxLength: 8 }),
      async (node) => {
        const exports = await compile([
          ...bases.map((base, index) => `const base${index} = style(${author(base)});`),
          `export const result = style(${author(node)});`,
        ].join("\n"))
        expect(exports.result).toEqual(reference(node, bases))
      },
    ), { seed: 20260914, numRuns: 100 })
  })
})
