import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { runInNewContext } from "node:vm"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { createSprinklesResolver, type NativeSprinklesLookupPlan } from "../src/theme-runtime"
import {
  createTheme,
  createThemeContract,
  createThemeTokenReference,
  defineProperties,
} from "../src/native-style"
import { resolveThemeStyles } from "../src/theme-runtime"
import path from "node:path"

const ROOT = path.resolve(import.meta.dir, "..")
const FIXTURE = path.resolve(ROOT, "fixtures/sprinkles.css.ts")

function evaluateModule(code: string): Record<string, unknown> {
  const exports: Record<string, unknown> = {}
  runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), {
    exports,
    StyleSheet: { create: (styles: unknown) => styles },
  })
  return exports
}

describe("native sprinkles", () => {
  it("rejects non-finite scale values and invalid shorthand definitions", () => {
    expect(() => defineProperties({
      primitives: ["view"] as const,
      properties: { opacity: { invalid: Number.NaN } },
    })).toThrow("must be finite")

    expect(() => defineProperties({
      primitives: ["view"] as const,
      properties: { paddingLeft: { sm: 8 } },
      shorthands: { px: ["paddingRight"] as const },
    } as never)).toThrow("targets missing property")
  })

  it("emits a primitive-scoped class and keeps later longhands as winners", async () => {
    const code = await transformCssTsToStyleSheet(FIXTURE, ROOT, { useStyleSheet: false })
    expect(code).toContain("export const card")
    expect(code).toContain('"paddingLeft":{"$$type":"crumbs.css.theme-token","varName":"--crumbs-space-sm"}')
    expect(code).toContain('"paddingRight":8')
    expect(code).toContain('"backgroundColor":{"$$type":"crumbs.css.theme-token","varName":"--crumbs-color-canvas"}')
  })

  it("composes utilities, maps finite values, and accepts utility recipe branches", async () => {
    const code = await transformCssTsToStyleSheet(FIXTURE, ROOT, { useStyleSheet: false })
    const exports = evaluateModule(code)
    expect(exports.composed).toEqual({ paddingLeft: 24, paddingRight: 8 })
    expect(exports.mapped).toMatchObject({
      compact: { paddingLeft: 8, paddingRight: 8 },
      roomy: {
        paddingLeft: { $$type: "crumbs.css.theme-token", varName: "--crumbs-space-sm" },
        paddingRight: { $$type: "crumbs.css.theme-token", varName: "--crumbs-space-sm" },
      },
    })
    expect(exports.button).toMatchObject({
      $$type: "crumbs.css.recipe",
      base: { paddingLeft: 8, paddingRight: 8 },
      variants: {
        density: {
          compact: { paddingLeft: 8, paddingRight: 8 },
          roomy: {
            paddingLeft: { $$type: "crumbs.css.theme-token", varName: "--crumbs-space-sm" },
            paddingRight: { $$type: "crumbs.css.theme-token", varName: "--crumbs-space-sm" },
          },
        },
      },
      compoundVariants: [{ style: { backgroundColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-color-canvas" } } }],
    })
  })

  it("emits a finite lookup plan for bounded runtime selection", async () => {
    const code = await transformCssTsToStyleSheet(FIXTURE, ROOT, { useStyleSheet: false })
    const exports = evaluateModule(code)
    const plan = exports.sprinklesPlan as NativeSprinklesLookupPlan
    expect(plan.$$type).toBe("crumbs.css.sprinkles-lookup-plan")
    expect(plan.version).toBe(1)
    expect(Object.keys(plan.properties)).toEqual(["paddingLeft", "paddingRight", "backgroundColor"])
    expect(Object.keys(plan.properties.paddingLeft ?? {})).toEqual(["sm", "token"])

    const resolver = createSprinklesResolver(plan)
    const first = resolver({ px: "sm", paddingLeft: "token" })
    expect(first as unknown).toEqual([
      { paddingLeft: 8 },
      { paddingRight: 8 },
      { paddingLeft: { $$type: "crumbs.css.theme-token", varName: "--crumbs-space-sm" } },
    ])
    expect(resolver({ px: "sm", paddingLeft: "token" })).toBe(first)
    expect(resolver.getCacheStats()).toMatchObject({ hits: 1, misses: 1 })
    expect(() => resolver({ paddingLeft: "missing" as never })).toThrow("not defined")
  })

  it("keeps runtime selection caching bounded and lifecycle explicit", async () => {
    const code = await transformCssTsToStyleSheet(FIXTURE, ROOT, { useStyleSheet: false })
    const exports = evaluateModule(code)
    const plan = exports.sprinklesPlan as NativeSprinklesLookupPlan
    const resolver = createSprinklesResolver(plan, { cacheSize: 1 })

    const first = resolver({ px: "sm" })
    expect(resolver({ px: "sm" })).toBe(first)
    resolver({ backgroundColor: "canvas" })
    expect(resolver.getCacheStats()).toMatchObject({
      capacity: 1,
      size: 1,
      hits: 1,
      misses: 2,
      evictions: 1,
    })

    resolver.clearCache()
    expect(resolver.getCacheStats()).toMatchObject({ size: 0 })
    resolver.dispose()
    expect(resolver.getCacheStats()).toMatchObject({ disposed: true })
    expect(() => resolver()).toThrow("disposed")
  })

  it("keeps cached and uncached selection semantics equivalent across finite inputs", async () => {
    const code = await transformCssTsToStyleSheet(FIXTURE, ROOT, { useStyleSheet: false })
    const exports = evaluateModule(code)
    const plan = exports.sprinklesPlan as NativeSprinklesLookupPlan
    const cached = createSprinklesResolver(plan, { cacheSize: 8 })
    const uncached = createSprinklesResolver(plan, { cacheSize: 0 })
    const selection = fc.record({
      px: fc.option(fc.constantFrom("sm"), { nil: undefined }),
      paddingLeft: fc.option(fc.constantFrom("sm", "token"), { nil: undefined }),
      backgroundColor: fc.option(fc.constantFrom("canvas"), { nil: undefined }),
    })

    fc.assert(fc.property(selection, (value) => {
      expect(cached(value)).toEqual(uncached(value))
    }))
  })

  it("resolves tokenized lookup entries through the normal theme style path", () => {
    const vars = createThemeContract({ color: { canvas: null } })
    const theme = createTheme(vars, { color: { canvas: "#0a0a0a" } })
    const plan = {
      $$type: "crumbs.css.sprinkles-lookup-plan",
      version: 1,
      primitives: ["view"],
      properties: {
        backgroundColor: {
          canvas: {
            backgroundColor: createThemeTokenReference("--crumbs-color-canvas"),
          },
        },
      },
      shorthands: {},
    } as unknown as NativeSprinklesLookupPlan

    const resolved = resolveThemeStyles({ plan }, theme).plan
    const resolver = createSprinklesResolver(resolved)
    expect(resolver({ backgroundColor: "canvas" })).toEqual([{ backgroundColor: "#0a0a0a" }])
  })
})
