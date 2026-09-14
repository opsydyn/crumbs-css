import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import * as path from "node:path"
import { runInNewContext } from "node:vm"
import { createThemeTokenReference, resolveThemeStyles, resolveThemeTokens } from "../src/theme-runtime"
import { transformCssTsToStyleSheet } from "../src/transformer"

const theme = { contract: {}, values: {}, tokens: { "--crumbs-structured-wide": 24 } }

describe("structured native runtime resolution", () => {
  it("preserves transform order, scalar siblings, identity and input immutability", () => {
    const transform = Object.freeze([{ translateX: 4 }, { scale: 2 }, { rotate: "45deg" }])
    const input = Object.freeze({ opacity: 0.5, transform, width: createThemeTokenReference("--crumbs-structured-wide") })
    const resolved = resolveThemeStyles({ item: input }, theme).item
    expect(resolved as unknown).toEqual({ opacity: 0.5, transform, width: 24 })
    expect((resolved as { transform?: unknown }).transform).toBe(transform)
    expect(input.width).toEqual(createThemeTokenReference("--crumbs-structured-wide"))
  })

  it("preserves structured-only styles and native object and array families", () => {
    const styles = {
      motion: { transform: [{ scaleX: 2 }] },
      shadow: { shadowOffset: { width: 2, height: 3 } },
      text: { textShadowOffset: { width: 1, height: 2 }, fontVariant: ["small-caps"] },
      effects: { filter: [{ brightness: 0.8 }], boxShadow: [{ offsetX: 1, offsetY: 2, color: "black" }] },
      origin: { transformOrigin: [10, "50%", 0] },
      background: { experimental_backgroundPosition: [{ top: 1, left: "50%" }] },
      color: { color: { semantic: ["labelColor"] } },
    }
    expect(resolveThemeStyles(styles, theme) as unknown).toEqual(styles)
  })

  it("leaves animated nodes and nested token references opaque without executing them", () => {
    let calls = 0
    const node = { __getValue() { calls++; return 2 } }
    const input = { animated: { opacity: node }, nested: { transform: [{ translateX: createThemeTokenReference("--crumbs-missing-nested") }] } }
    const resolved = resolveThemeStyles(input, theme)
    expect(resolved as unknown).toEqual(input)
    expect(calls).toBe(0)
  })

  it("keeps genuine legacy maps, including composed and empty entries", () => {
    const input = { active: [{ opacity: 0.5 }, { opacity: 1 }], empty: {}, hidden: undefined }
    expect(resolveThemeStyles({ variants: input }, theme)).toEqual({ variants: { active: { opacity: 1 }, empty: {}, hidden: undefined } })
  })

  it("replaces structured values as whole values across style arrays", () => {
    const first = [{ scale: 2 }]
    const last = [{ rotate: "90deg" }]
    const input = [{ opacity: 0.5, transform: first, shadowOffset: { width: 1, height: 2 } }, [false, { transform: last, shadowOffset: { width: 3, height: 4 } }]]
    const resolved = resolveThemeStyles({ item: input }, theme).item
    expect(resolved as unknown).toEqual({ opacity: 0.5, transform: last, shadowOffset: { width: 3, height: 4 } })
    expect((resolved as { transform?: unknown }).transform).toBe(last)
  })

  it("matches independently specified generated structured styles", () => {
    fc.assert(fc.property(
      fc.array(fc.oneof(fc.record({ scale: fc.integer({ min: 1, max: 10 }) }), fc.record({ translateX: fc.integer({ min: -100, max: 100 }) })), { minLength: 1, maxLength: 10 }),
      fc.integer({ min: 0, max: 100 }),
      (transform, width) => {
        const input = { opacity: 0.5, transform, shadowOffset: { width, height: 2 } }
        const result = resolveThemeStyles({ item: input }, theme).item
        expect(result as unknown).toEqual(input)
        expect((result as { transform?: unknown }).transform).toBe(transform)
        expect(resolveThemeTokens(result, theme)).toEqual(input)
      },
    ), { seed: 20260917, numRuns: 100 })
  })

  it("retains compiled map identity with native property names and object spread", async () => {
    const root = path.resolve(import.meta.dir, "..")
    const dir = mkdtempSync(path.join(root, "fixtures/.structured-"))
    try {
      const file = path.join(dir, "case.css.ts")
      writeFileSync(file, `import { createThemeContract, styleVariants, style } from '@opsydyn/crumbs-css/style';
        const vars = createThemeContract({ structured: { wide: null } });
        export const variants = styleVariants({ shadowOffset: { width: vars.structured.wide, height: 8 }, transform: { opacity: 0.5 } });
        export const alias = { ...variants };
        export const composed = style([variants.transform, { opacity: 1 }]);`)
      const code = await transformCssTsToStyleSheet(file, root, { useStyleSheet: false })
      const exports: Record<string, unknown> = {}
      runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), { exports })
      expect(Object.keys(exports.variants as object)).toEqual(["shadowOffset", "transform"])
      expect((exports.variants as Record<symbol, unknown>)[Symbol.for("crumbs.css.style-map")]).toBe(true)
      const spread = { ...(exports.variants as object) }
      const expected = { shadowOffset: { width: 24, height: 8 }, transform: { opacity: 0.5 } }
      const resolved = resolveThemeStyles({ variants: exports.variants, alias: exports.alias, spread }, theme)
      expect(JSON.parse(JSON.stringify(resolved))).toEqual({ variants: expected, alias: expected, spread: expected })
      expect(exports.composed).toEqual({ opacity: 1 })
      const again = resolveThemeStyles({ again: resolved.variants }, theme).again
      expect(JSON.parse(JSON.stringify(again))).toEqual(expected)
      expect((again as Record<symbol, unknown>)[Symbol.for("crumbs.css.style-map")]).toBe(true)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
