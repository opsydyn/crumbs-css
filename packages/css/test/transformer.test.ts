import { describe, expect, it } from "bun:test"
import { existsSync } from "node:fs"
import * as path from "node:path"
import { buildStyleSheetCode, transform } from "../src/transformer"

const PKG_ROOT = path.resolve(__dirname, "..")
const FIXTURE = path.resolve(PKG_ROOT, "fixtures/simple.css.ts")
const EXAMPLE_BASIC = path.resolve(PKG_ROOT, "examples/basic.css.ts")
const EXAMPLE_THEMED = path.resolve(PKG_ROOT, "examples/themed.css.ts")
const EXAMPLE_PRESSABLE_VARIANTS = path.resolve(PKG_ROOT, "examples/pressable-variants.css.ts")
const EXAMPLE_TYPED_HELPERS = path.resolve(PKG_ROOT, "examples/typed-helpers.css.ts")
const EXAMPLE_RECIPE = path.resolve(PKG_ROOT, "examples/recipe.css.ts")
const FIXTURE_WITH_DEPS = path.resolve(PKG_ROOT, "fixtures/with-deps.css.ts")
const FIXTURE_COMPOSED = path.resolve(PKG_ROOT, "fixtures/composed.css.ts")
const FIXTURE_WITH_VARS = path.resolve(PKG_ROOT, "fixtures/with-vars.css.ts")
const FIXTURE_THEMED = path.resolve(PKG_ROOT, "fixtures/themed.css.ts")
const FIXTURE_VARIANTS = path.resolve(PKG_ROOT, "fixtures/variants.css.ts")
const FIXTURE_UPSTREAM_TRANSFORMER = path.resolve(PKG_ROOT, "fixtures/upstream-transformer.cjs")
const FIXTURE_UNSUPPORTED_GLOBAL = path.resolve(PKG_ROOT, "fixtures/unsupported-global.css.ts")
const FIXTURE_UNSUPPORTED_KEYFRAMES = path.resolve(
  PKG_ROOT,
  "fixtures/unsupported-keyframes.css.ts",
)
const FIXTURE_UNSUPPORTED_MEDIA = path.resolve(PKG_ROOT, "fixtures/unsupported-media.css.ts")
const FIXTURE_UNSUPPORTED_DECLARATION = path.resolve(
  PKG_ROOT,
  "fixtures/unsupported-declaration.css.ts",
)
const FIXTURE_UNSUPPORTED_SELECTORS = path.resolve(
  PKG_ROOT,
  "fixtures/unsupported-selectors.css.ts",
)
const APP_FIXTURE = path.resolve(PKG_ROOT, "../../apps/native/styles/shared.css.ts")
const APP_GRIM_BUTTON_FIXTURE = path.resolve(
  PKG_ROOT,
  "../../apps/native/styles/grim-button.css.ts",
)
const APP_REFERENCE_FIXTURE = path.resolve(PKG_ROOT, "../../apps/native/styles/reference.css.ts")
const APP_FIXTURE_RELATIVE = "styles/shared.css.ts"
const APP_ROOT = path.resolve(PKG_ROOT, "../../apps/native")
const HAS_NATIVE_APP_FIXTURES =
  existsSync(APP_FIXTURE) &&
  existsSync(APP_GRIM_BUTTON_FIXTURE) &&
  existsSync(APP_REFERENCE_FIXTURE) &&
  existsSync(APP_ROOT)

// ---------------------------------------------------------------------------
// Unit tests — pure JS, no VE pipeline, run in bun
// ---------------------------------------------------------------------------

describe("buildStyleSheetCode", () => {
  it("generates StyleSheet.create with the class styles", () => {
    const exportMap = new Map([["title", "title__abc123"]])
    const classStyles = new Map([["title__abc123", { fontSize: 24, color: "#c8aa6e" }]])
    const code = buildStyleSheetCode(exportMap, classStyles)
    expect(code).toContain("StyleSheet.create")
    expect(code).toContain('"title__abc123"')
    expect(code).toContain("24")
  })

  it("re-exports each name pointing at the StyleSheet entry", () => {
    const exportMap = new Map([
      ["container", "container__def456"],
      ["title", "title__abc123"],
    ])
    const classStyles = new Map([
      ["container__def456", { flex: 1 }],
      ["title__abc123", { fontSize: 24 }],
    ])
    const code = buildStyleSheetCode(exportMap, classStyles)
    expect(code).toContain("export const container")
    expect(code).toContain("export const title")
    expect(code).toContain("_s[")
  })

  it("exports undefined for classes with no styles (e.g. at-rule only)", () => {
    const exportMap = new Map([["title", "title__abc123"]])
    const classStyles = new Map<string, Record<string, unknown>>()
    const code = buildStyleSheetCode(exportMap, classStyles)
    expect(code).toContain("export const title = undefined")
  })

  it("includes react-native StyleSheet import", () => {
    const code = buildStyleSheetCode(new Map(), new Map())
    expect(code).toContain(`from "react-native"`)
    expect(code).toContain("StyleSheet")
  })

  it("emits side-effect imports for dep paths", () => {
    const code = buildStyleSheetCode(new Map(), new Map(), ["./tokens.css.ts", "./theme.css.ts"])
    expect(code).toContain(`import "./tokens.css.ts";`)
    expect(code).toContain(`import "./theme.css.ts";`)
  })

  it("emits no dep imports when deps list is empty", () => {
    const code = buildStyleSheetCode(new Map(), new Map(), [])
    expect(code).not.toContain("import ./")
    expect(code).not.toContain('import ".')
  })

  it("can emit plain style objects for React Native Web token resolution", () => {
    const exportMap = new Map([["title", "title__abc123"]])
    const classStyles = new Map([
      ["title__abc123", { fontFamily: { varName: "--crumbs-font-display" } }],
    ])
    const code = buildStyleSheetCode(exportMap, classStyles, [], { useStyleSheet: false })

    expect(code).not.toContain("StyleSheet.create")
    expect(code).not.toContain(`from "react-native"`)
    expect(code).toContain("const _s = {")
    expect(code).toContain("export const title = _s[")
  })
})

describe("Metro transformer", () => {
  it("transforms native .css.ts files on web so Storybook never evaluates vanilla-extract authoring code", async () => {
    const result = (await transform(
      { upstreamTransformerPath: FIXTURE_UPSTREAM_TRANSFORMER },
      PKG_ROOT,
      FIXTURE,
      Buffer.from(""),
      { dev: true, platform: "web" },
    )) as { readonly code: string }

    expect(result.code).not.toContain("StyleSheet.create")
    expect(result.code).toContain("export const container")
    expect(result.code).not.toContain("@vanilla-extract/css")
  })

  it("keeps native platforms on StyleSheet.create output", async () => {
    const result = (await transform(
      { upstreamTransformerPath: FIXTURE_UPSTREAM_TRANSFORMER },
      PKG_ROOT,
      FIXTURE,
      Buffer.from(""),
      { dev: true, platform: "ios" },
    )) as { readonly code: string }

    expect(result.code).toContain("StyleSheet.create")
    expect(result.code).toContain("export const container")
    expect(result.code).not.toContain("@vanilla-extract/css")
  })

  it("transforms GrimButton recipes for Storybook web without React Native StyleSheet compilation", async () => {
    if (!HAS_NATIVE_APP_FIXTURES) return

    const result = (await transform(
      { upstreamTransformerPath: FIXTURE_UPSTREAM_TRANSFORMER },
      APP_ROOT,
      APP_GRIM_BUTTON_FIXTURE,
      Buffer.from(""),
      { dev: true, platform: "web" },
    )) as { readonly code: string }

    expect(result.code).not.toContain("StyleSheet.create")
    expect(result.code).not.toContain("@vanilla-extract/css")
    expect(result.code).toContain('"$$type": "crumbs.css.recipe"')
    expect(result.code).toContain('"base": _s[')
    expect(result.code).toContain("--crumbs-font-display")
  })
})

// ---------------------------------------------------------------------------
// Integration tests — call transformCssTsToStyleSheet via Node.js subprocess.
//
// The package entrypoint used by Metro is compiled CommonJS, so these tests
// exercise dist/transformer.cjs in both Node and Bun subprocesses.
// ---------------------------------------------------------------------------

function runNodeTransform(fixturePath: string): string {
  const script = `
    const { transformCssTsToStyleSheet } = require('./dist/transformer.cjs');
    transformCssTsToStyleSheet('${fixturePath}', '${PKG_ROOT}')
      .then(code => process.stdout.write(code))
      .catch(e => { process.stderr.write(e.message); process.exit(1); });
  `
  const result = Bun.spawnSync(["node", "--eval", script], {
    cwd: PKG_ROOT,
    stderr: "pipe",
  })
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString())
  }
  return result.stdout.toString()
}

function runBunTransform(fixturePath: string, cwd = PKG_ROOT): string {
  const script = `
    const { transformCssTsToStyleSheet } = require('./dist/transformer.cjs');
    transformCssTsToStyleSheet('${fixturePath}', '${cwd}')
      .then(code => process.stdout.write(code))
      .catch(e => { process.stderr.write(e.stack || e.message); process.exit(1); });
  `
  const result = Bun.spawnSync([process.execPath, "--eval", script], {
    cwd: PKG_ROOT,
    stderr: "pipe",
  })
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString())
  }
  return result.stdout.toString()
}

function runBunTransformStrict(fixturePath: string, cwd = PKG_ROOT): string {
  const script = `
    const { transformCssTsToStyleSheet } = require('./dist/transformer.cjs');
    transformCssTsToStyleSheet('${fixturePath}', '${cwd}', { strictDiagnostics: true })
      .then(code => process.stdout.write(code))
      .catch(e => { process.stderr.write(e.stack || e.message); process.exit(1); });
  `
  const result = Bun.spawnSync([process.execPath, "--eval", script], {
    cwd: PKG_ROOT,
    stderr: "pipe",
  })
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString())
  }
  return result.stdout.toString()
}

function escapedRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

describe("transformCssTsToStyleSheet via Node.js (integration)", () => {
  it("transforms simple.css.ts to StyleSheet code", () => {
    const code = runNodeTransform(FIXTURE)
    expect(code).toContain("StyleSheet.create")
    expect(code).toContain("export const container")
    expect(code).toContain("export const title")
    expect(code).toContain("export const body")
  })

  it("README basic style example compiles", () => {
    const code = runBunTransform(EXAMPLE_BASIC)
    expect(code).toContain("StyleSheet.create")
    expect(code).toContain("export const screen")
    expect(code).toContain("export const title")
  })

  it("README themed style example compiles with native theme tokens", () => {
    const code = runBunTransform(EXAMPLE_THEMED)
    expect(code).toContain("crumbs.css.theme-token")
    expect(code).toContain("--crumbs-color-canvas")
    expect(code).toContain("--crumbs-space-screen")
  })

  it("README pressable variants example compiles to a nested style map", () => {
    const code = runBunTransform(EXAMPLE_PRESSABLE_VARIANTS)
    expect(code).toContain("export const button = {")
    expect(code).toContain('"default": _s[')
    expect(code).toContain('"pressed": _s[')
    expect(code).toContain("export const buttonLabel")
  })

  it("README typed native helpers example compiles", () => {
    const code = runBunTransform(EXAMPLE_TYPED_HELPERS)
    expect(code).toContain("export const panel")
    expect(code).toContain("export const title")
    expect(code).toContain("export const crest")
    expect(code).toContain('"resizeMode":"cover"')
    expect(code).toContain("--crumbs-color-canvas")
  })

  it("README recipe example compiles to a native recipe map", () => {
    const code = runBunTransform(EXAMPLE_RECIPE)
    expect(code).toContain("export const button")
    expect(code).toContain('"$$type": "crumbs.css.recipe"')
    expect(code).toContain('"base": _s[')
    expect(code).toContain('"tone"')
    expect(code).toContain('"primary": _s[')
    expect(code).toContain('"compoundVariants"')
    expect(code).toContain('"disabled": true')
    expect(code).toContain("--crumbs-color-accent")
  })

  it("output does not reference vanilla-extract runtime", () => {
    const code = runNodeTransform(FIXTURE)
    expect(code).not.toContain("vanilla-extract")
    expect(code).not.toContain("@vanilla-extract/css")
  })

  it("includes numeric style values from the fixture", () => {
    const code = runNodeTransform(FIXTURE)
    expect(code).toContain("24") // container padding + title fontSize
    expect(code).toContain("8") // title marginBottom
  })

  it("simple.css.ts with no imports emits no dep side-effects", () => {
    const code = runNodeTransform(FIXTURE)
    // No cross-file deps — no side-effect imports should appear
    expect(code).not.toMatch(/import "\.[^"]+";/)
  })

  it("with-deps.css.ts emits tokens.css.ts as a side-effect import for hot reload", () => {
    const code = runNodeTransform(FIXTURE_WITH_DEPS)
    // Metro tracks this import → re-transforms with-deps.css.ts when tokens changes
    expect(code).toContain(`import "./tokens.css.ts"`)
  })

  it("composed.css.ts merges base + extra styles into a single StyleSheet entry", () => {
    const code = runNodeTransform(FIXTURE_COMPOSED)
    // btn composes [base, { fontWeight }] — must NOT be undefined
    expect(code).not.toContain("export const btn = undefined")
    expect(code).toContain("export const btn")
    // Merged styles: base contributes color + fontSize, btn adds fontWeight
    expect(code).toContain('"#c8aa6e"') // base color
    expect(code).toContain('"700"') // btn fontWeight
  })

  it("composed.css.ts non-composed export works normally", () => {
    const code = runNodeTransform(FIXTURE_COMPOSED)
    expect(code).not.toContain("export const title = undefined")
    expect(code).toContain('"fontSize":24')
  })

  it("with-vars.css.ts strips CSS variable values but keeps plain ones", () => {
    const code = runNodeTransform(FIXTURE_WITH_VARS)
    // fontSize: 16 should survive
    expect(code).toContain('"fontSize":16')
    // The CSS var color should NOT appear as a value
    expect(code).not.toContain("var(--")
  })

  it("with-deps.css.ts resolves token values into the StyleSheet", () => {
    const code = runNodeTransform(FIXTURE_WITH_DEPS)
    expect(code).toContain("#c8aa6e") // vars.color.gold inlined
    expect(code).toContain("#0a0a0a") // vars.color.dark inlined
  })

  it("themed.css.ts preserves native theme tokens in the StyleSheet payload", () => {
    const code = runBunTransform(FIXTURE_THEMED)
    expect(code).toContain("crumbs.css.theme-token")
    expect(code).toContain("--crumbs-color-canvas")
    expect(code).toContain("--crumbs-color-text")
    expect(code).toContain("--crumbs-space-md")
    expect(code).not.toContain("export const container = undefined")
    expect(code).not.toContain("packages/native-styles/dist")
    expect(code).not.toContain("/dist/style")
    expect(code).not.toContain("/dist/theme-token")
  })

  it("styleVariants exports a nested StyleSheet map", () => {
    const code = runBunTransform(FIXTURE_VARIANTS)
    expect(code).toContain("export const button = {")
    expect(code).toContain('"default": _s[')
    expect(code).toContain('"pressed": _s[')
    expect(code).toContain("--crumbs-color-canvas")
    expect(code).toContain("--crumbs-color-text")
  })

  it("rejects @media rules with an actionable native compatibility diagnostic", () => {
    expect(() => runNodeTransform(FIXTURE_UNSUPPORTED_MEDIA)).toThrow(
      "@opsydyn/crumbs-css does not support @media rules in React Native styles",
    )
  })

  it("rejects keyframes with an actionable native compatibility diagnostic", () => {
    expect(() => runNodeTransform(FIXTURE_UNSUPPORTED_KEYFRAMES)).toThrow(
      "@opsydyn/crumbs-css does not support @keyframes rules in React Native styles",
    )
  })

  it("rejects global selectors with an actionable native compatibility diagnostic", () => {
    expect(() => runNodeTransform(FIXTURE_UNSUPPORTED_GLOBAL)).toThrow(
      "@opsydyn/crumbs-css does not support selectors, global styles, or pseudo classes in React Native styles",
    )
  })

  it("rejects selectors with an actionable native compatibility diagnostic", () => {
    expect(() => runNodeTransform(FIXTURE_UNSUPPORTED_SELECTORS)).toThrow(
      "@opsydyn/crumbs-css does not support selectors, global styles, or pseudo classes in React Native styles",
    )
  })

  it("strict diagnostics reject dropped declarations with file and export context", () => {
    expect(() => runBunTransformStrict(FIXTURE_UNSUPPORTED_DECLARATION)).toThrow(
      '@opsydyn/crumbs-css dropped "transition: all 0.3s" while transforming export "link"',
    )
    expect(() => runBunTransformStrict(FIXTURE_UNSUPPORTED_DECLARATION)).toThrow(
      "fixtures/unsupported-declaration.css.ts",
    )
  })

  it("transforms the native app css entry when executed by Bun", () => {
    if (!HAS_NATIVE_APP_FIXTURES) return

    const code = runBunTransform(APP_FIXTURE, APP_ROOT)
    expect(code).toContain("StyleSheet.create")
    expect(code).toContain("export const container")
    expect(code).toContain("export const heading")
    expect(code).toContain("export const button = {")
    expect(code).toContain('"default": _s[')
    expect(code).toContain('"pressed": _s[')
    expect(code).toContain("crumbs.css.theme-token")
    expect(code).toContain("--crumbs-color-canvas")
    expect(code).not.toContain("@vanilla-extract/css")
  })

  it("transforms the native GrimButton recipe style entry", () => {
    if (!HAS_NATIVE_APP_FIXTURES) return

    const code = runBunTransform(APP_GRIM_BUTTON_FIXTURE, APP_ROOT)
    const baseClassName = code.match(/"base": _s\["([^"]+)"\]/)?.[1]
    expect(code).toContain("export const button")
    expect(code).toContain('"$$type": "crumbs.css.recipe"')
    expect(code).toContain('"$$debugName": "grimButton"')
    expect(code).toContain('"tone"')
    expect(code).toContain('"primary"')
    expect(code).toContain('"disabled"')
    expect(code).toContain("--crumbs-color-accent")
    expect(baseClassName).toBeDefined()
    expect(code).toMatch(
      RegExp(`"${escapedRegExp(baseClassName ?? "")}": \\{[^\\n]*"minHeight":48`),
    )
    expect(code).toMatch(
      RegExp(`"${escapedRegExp(baseClassName ?? "")}": \\{[^\\n]*"backgroundColor"`),
    )
  })

  it("accepts Metro's project-relative native app css filename", () => {
    if (!HAS_NATIVE_APP_FIXTURES) return

    const code = runBunTransform(APP_FIXTURE_RELATIVE, APP_ROOT)
    expect(code).toContain("StyleSheet.create")
    expect(code).toContain("export const container")
    expect(code).toContain("export const heading")
    expect(code).not.toContain("@vanilla-extract/css")
  })

  it("keeps native app theme dependencies local without leaking package internals", () => {
    if (!HAS_NATIVE_APP_FIXTURES) return

    const code = runBunTransform(APP_REFERENCE_FIXTURE, APP_ROOT)
    expect(code).toContain(`import "./theme.ts";`)
    expect(code).not.toContain("packages/native-styles/dist")
    expect(code).not.toContain("/dist/style")
    expect(code).not.toContain("/dist/theme-token")
  })
})
