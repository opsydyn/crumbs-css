import {afterAll, beforeAll, describe, expect, it} from "bun:test"
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync} from "node:fs"
import path from "node:path"
import {tmpdir} from "node:os"
import {readEmittedGraph} from "../bench/effect-boundary-audit"

const packageRoot = path.resolve(import.meta.dir, "..")
const distRoot = path.join(packageRoot, "dist")
const expectedThemeExports = [
  "NATIVE_CONDITION_BREAKPOINTS",
  "NATIVE_RESPONSIVE_CONDITION_MATCHERS",
  "NATIVE_RESPONSIVE_CONDITION_NAMES",
  "NativeExpressionEvaluationError",
  "NativeThemeTokenReferenceType",
  "ThemeProvider",
  "TokenThemeProvider",
  "TokenThemeScopeProvider",
  "createComponentRecipeResolutionPlan",
  "createComponentRecipeResolver",
  "createNativeConditionResolver",
  "createNativeConditionStore",
  "createNativeExpressionRuntime",
  "createNativeMapValueFn",
  "createNativeNormalizeValueFn",
  "createRecipeResolver",
  "createSprinklesResolver",
  "createThemeDependencyPlan",
  "createThemeDependencyResolver",
  "createThemeTokenReference",
  "defaultNativeConditionSnapshot",
  "evaluateNativeExpression",
  "foldNativeExpression",
  "isThemeTokenReference",
  "isTokenThemeCompatible",
  "mapNativeConditionValueToBranches",
  "nativeConditionSnapshotKey",
  "normalizeNativeConditionInput",
  "resolveComponentRecipeResolutionPlan",
  "resolveComponentRecipeStyles",
  "resolveRecipeStyle",
  "resolveThemeStyles",
  "resolveThemeTokens",
  "useNativeConditionSnapshot",
  "useTheme",
  "useThemeSelector",
  "useThemedStyle",
  "useThemedStyles",
  "useTokenTheme",
]
const expectedCoreExports = [
  "NATIVE_CONDITION_BREAKPOINTS",
  "NATIVE_RESPONSIVE_CONDITION_MATCHERS",
  "NATIVE_RESPONSIVE_CONDITION_NAMES",
  "NativeThemeTokenReferenceType",
  "ThemeProvider",
  "createNativeConditionResolver",
  "createNativeConditionStore",
  "createNativeMapValueFn",
  "createNativeNormalizeValueFn",
  "createThemeTokenReference",
  "defaultNativeConditionSnapshot",
  "isThemeTokenReference",
  "mapNativeConditionValueToBranches",
  "nativeConditionSnapshotKey",
  "normalizeNativeConditionInput",
  "resolveThemeStyles",
  "resolveThemeTokens",
  "useNativeConditionSnapshot",
  "useTheme",
  "useThemeSelector",
  "useThemedStyle",
  "useThemedStyles",
]

let fixtureRoot: string

beforeAll(() => {
  fixtureRoot = mkdtempSync(path.join(tmpdir(), "crumbs-theme-runtime-boundary-"))
  const packageLink = path.join(fixtureRoot, "node_modules", "@opsydyn", "crumbs-css")
  mkdirSync(packageLink, {recursive: true})
  cpSync(path.join(packageRoot, "package.json"), path.join(packageLink, "package.json"))
  cpSync(distRoot, path.join(packageLink, "dist"), {recursive: true})
  const fixtureModules = path.join(fixtureRoot, "node_modules")
  const workspaceModules = path.resolve(packageRoot, "../../node_modules")
  for (const peer of ["react", "react-dom"]) {
    symlinkSync(realpathSync(path.join(workspaceModules, peer)), path.join(fixtureModules, peer), "dir")
  }
})

afterAll(() => {
  rmSync(fixtureRoot, {recursive: true, force: true})
})

function runNode(args: string[], script: string): string {
  const result = Bun.spawnSync(["node", ...args, script], {
    cwd: fixtureRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  if (result.exitCode !== 0) {
    throw new Error("Node package fixture failed: " + result.stderr.toString())
  }
  return result.stdout.toString().trim()
}

describe("theme runtime package boundary characterization", () => {
  it("preserves the package-shaped ESM and CJS export names", () => {
    const cjs = runNode(["-e"], [
      'const theme = require("@opsydyn/crumbs-css/theme");',
      'const core = require("@opsydyn/crumbs-css/theme/core");',
      "process.stdout.write(JSON.stringify({theme: Object.keys(theme).sort(), core: Object.keys(core).sort()}));",
    ].join("\n"))
    const esm = runNode(["--input-type=module", "-e"], [
      'const theme = await import("@opsydyn/crumbs-css/theme");',
      'const core = await import("@opsydyn/crumbs-css/theme/core");',
      "process.stdout.write(JSON.stringify({theme: Object.keys(theme).sort(), core: Object.keys(core).sort()}));",
    ].join("\n"))
    const expected = {theme: expectedThemeExports, core: expectedCoreExports}
    expect(JSON.parse(cjs)).toEqual(expected)
    expect(JSON.parse(esm)).toEqual(expected)
  })

  it("keeps compatibility declarations reachable through the package export map", () => {
    const packageJson = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"))
    for (const [subpath, expectedFile] of [
      ["./theme", "theme.d.mts"],
      ["./theme/core", "theme-core.d.mts"],
    ] as const) {
      const target = packageJson.exports[subpath].types as string
      expect(path.basename(target)).toBe(expectedFile)
      const declarationPath = path.resolve(packageRoot, target)
      expect(existsSync(declarationPath)).toBe(true)
      const declaration = readFileSync(declarationPath, "utf8")
      expect(declaration).toContain("resolveThemeTokens")
      expect(declaration).toContain("resolveThemeStyles")
    }
  })

  it("preserves compatibility-to-focused resolver binding identity in ESM and CJS", () => {
    const cjs = runNode(["-e"], [
      'const theme = require("@opsydyn/crumbs-css/theme");',
      'const recipes = require("@opsydyn/crumbs-css/theme/recipes");',
      'const sprinkles = require("@opsydyn/crumbs-css/theme/sprinkles");',
      'const conditions = require("@opsydyn/crumbs-css/theme/conditions");',
      'const assert = require("node:assert/strict");',
      "assert.strictEqual(theme.createRecipeResolver, recipes.createRecipeResolver);",
      "assert.strictEqual(theme.createComponentRecipeResolver, recipes.createComponentRecipeResolver);",
      "assert.strictEqual(theme.createSprinklesResolver, sprinkles.createSprinklesResolver);",
      "assert.strictEqual(theme.createNativeConditionResolver, conditions.createNativeConditionResolver);",
    ].join("\n"))
    const esm = runNode(["--input-type=module", "-e"], [
      'const theme = await import("@opsydyn/crumbs-css/theme");',
      'const recipes = await import("@opsydyn/crumbs-css/theme/recipes");',
      'const sprinkles = await import("@opsydyn/crumbs-css/theme/sprinkles");',
      'const conditions = await import("@opsydyn/crumbs-css/theme/conditions");',
      "if (theme.createRecipeResolver !== recipes.createRecipeResolver ||",
      "    theme.createComponentRecipeResolver !== recipes.createComponentRecipeResolver ||",
      "    theme.createSprinklesResolver !== sprinkles.createSprinklesResolver ||",
      "    theme.createNativeConditionResolver !== conditions.createNativeConditionResolver) {",
      '  throw new Error("Focused resolver binding identity changed");',
      "}",
    ].join("\n"))
    expect(cjs).toBe("")
    expect(esm).toBe("")
  })

  for (const format of ["cjs", "esm"] as const) {
    it("recurses through nested tagged component slots and reuses the resolved snapshot in " + format, () => {
      const apiImport = format === "cjs"
        ? 'const api = require("@opsydyn/crumbs-css/theme");'
        : 'const api = await import("@opsydyn/crumbs-css/theme");'
      const script = [
        apiImport,
        'const token = api.createThemeTokenReference("--crumbs-boundary-probe");',
        'const inner = {$$type: "crumbs.css.component-recipe", version: 1, slots: {root: "view"}, base: {root: {width: token}}, variants: {}, defaultVariants: {}, compoundVariants: []};',
        'const outer = {$$type: "crumbs.css.component-recipe", version: 1, slots: {root: "view"}, base: {root: inner}, variants: {}, defaultVariants: {}, compoundVariants: []};',
        'const theme = {contract: {}, values: {}, tokens: {"--crumbs-boundary-probe": 23}};',
        "const resolved = api.resolveThemeTokens(outer, theme);",
        'if (resolved.base.root.base.root.width !== 23) throw new Error("Nested component slot did not recurse through generic token resolution");',
        'if (!Object.isFrozen(resolved) || !Object.isFrozen(resolved.base.root)) throw new Error("Nested component resolution did not preserve frozen snapshots");',
        'if (api.resolveThemeTokens(outer, theme) !== resolved) throw new Error("Cached component snapshot identity changed");',
      ].join("\n")
      const args = format === "cjs" ? ["-e"] : ["--input-type=module", "-e"]
      expect(runNode(args, script)).toBe("")
    })
  }

  for (const format of ["mjs", "cjs"]) {
    it("keeps theme/core as one React-only emitted " + format + " artifact", () => {
      const core = readEmittedGraph(path.join(distRoot, "theme-core." + format))
      expect(core.files.map(file => path.basename(file))).toEqual(["theme-core." + format])
      expect(core.externals).toEqual(["react"])
      expect(core.files.some(file => file.includes("token-theme-scopes"))).toBe(false)
    })
  }

  for (const format of ["cjs", "esm"] as const) {
    for (const providerEntry of ["theme", "theme/core"] as const) {
      const hookEntry = providerEntry === "theme" ? "theme/core" : "theme"
      it("shares the React provider across " + providerEntry + " then " + hookEntry + " in " + format, () => {
        const providerImport = format === "cjs"
          ? 'const provider = require("@opsydyn/crumbs-css/' + providerEntry + '");'
          : 'const provider = await import("@opsydyn/crumbs-css/' + providerEntry + '");'
        const hookImport = format === "cjs"
          ? 'const hooks = require("@opsydyn/crumbs-css/' + hookEntry + '");'
          : 'const hooks = await import("@opsydyn/crumbs-css/' + hookEntry + '");'
        const script = [
          format === "cjs"
            ? 'const React = require("react");'
            : 'const React = await import("react");',
          format === "cjs"
            ? 'const {renderToStaticMarkup} = require("react-dom/server");'
            : 'const {renderToStaticMarkup} = await import("react-dom/server");',
          providerImport,
          hookImport,
          'const theme = {contract: {}, values: {}, tokens: {"--crumbs-boundary-probe": 23}};',
          "function Reader() {",
          "  const current = hooks.useTheme();",
          '  return React.createElement("span", null, String(current.tokens["--crumbs-boundary-probe"]));',
          "}",
          "const html = renderToStaticMarkup(",
          "  React.createElement(provider.ThemeProvider, {theme}, React.createElement(Reader)),",
          ");",
          'if (html !== "<span>23</span>") throw new Error("Mixed-entry provider/hook mismatch: " + html);',
        ].join("\n")
        const args = format === "cjs" ? ["-e"] : ["--input-type=module", "-e"]
        expect(runNode(args, script)).toBe("")
      })
    }
  }
})
