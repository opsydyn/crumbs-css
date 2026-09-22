import { describe, expect, it } from "bun:test"
import { runInNewContext } from "node:vm"
import { transformCssTsToStyleSheet } from "../src/transformer"
import {
  createTheme,
  createThemeContract,
  type NativeSprinklesLookupPlan,
} from "../src/native-style"
import { createSprinklesResolver, resolveThemeStyles } from "../src/theme-runtime"
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

function flattenStyles(value: unknown): Record<string, unknown> {
  const styles = Array.isArray(value) ? value : [value]
  return Object.assign({}, ...styles.filter((style): style is Record<string, unknown> =>
    typeof style === "object" && style !== null && !Array.isArray(style)),
  )
}

async function transformedFixture(): Promise<{
  readonly code: string
  readonly exports: Record<string, unknown>
  readonly plan: NativeSprinklesLookupPlan
}> {
  const code = await transformCssTsToStyleSheet(FIXTURE, ROOT, { useStyleSheet: false })
  const exports = evaluateModule(code)
  return { code, exports, plan: exports.sprinklesPlan as NativeSprinklesLookupPlan }
}

describe("native Sprinkles contract compatibility", () => {
  it("emits byte-for-byte deterministic compiler output", async () => {
    const first = await transformCssTsToStyleSheet(FIXTURE, ROOT, { useStyleSheet: false })
    const second = await transformCssTsToStyleSheet(FIXTURE, ROOT, { useStyleSheet: false })

    expect(second).toBe(first)
  })

  it("keeps token-only scales symbolic until the normal theme resolution boundary", async () => {
    const { plan } = await transformedFixture()
    expect(plan.properties.backgroundColor?.canvas as unknown).toEqual({
      backgroundColor: { $$type: "crumbs.css.theme-token", varName: "--crumbs-color-canvas" },
    })
    expect(plan.properties.paddingLeft?.token as unknown).toEqual({
      paddingLeft: { $$type: "crumbs.css.theme-token", varName: "--crumbs-space-sm" },
    })

    const vars = createThemeContract({ color: { canvas: null }, space: { sm: null } })
    const theme = createTheme(vars, { color: { canvas: "#0a0a0a" }, space: { sm: 8 } })
    const resolved = resolveThemeStyles({ plan }, theme).plan as NativeSprinklesLookupPlan
    expect(resolved.properties.backgroundColor?.canvas).toEqual({ backgroundColor: "#0a0a0a" })
    expect(resolved.properties.paddingLeft?.token).toEqual({ paddingLeft: 8 })
  })

  it("rejects unknown properties, non-string scales, and malformed generated entries", async () => {
    const { plan } = await transformedFixture()
    const resolver = createSprinklesResolver(plan)

    expect(() => resolver({ unknown: "sm" } as never)).toThrow("Unknown native Sprinkles runtime selection unknown")
    expect(() => resolver({ paddingLeft: 8 } as never)).toThrow("must use a scale name")
    expect(() => resolver({ px: "missing" } as never)).toThrow("is not defined")
    expect(() => createSprinklesResolver({
      ...plan,
      properties: {
        ...plan.properties,
        paddingLeft: { sm: undefined },
      },
    } as never)).toThrow("must be a style reference")
  })

  it("returns the same reference for repeated selections and preserves authored precedence", async () => {
    const { plan } = await transformedFixture()
    const resolver = createSprinklesResolver(plan)
    const selection = { px: "sm", paddingLeft: "token" } as const
    const first = resolver(selection)

    expect(resolver({ ...selection })).toBe(first)
    expect(resolver.getCacheStats()).toMatchObject({ hits: 1, misses: 1 })
    expect(flattenStyles(first)).toEqual({
      paddingLeft: { $$type: "crumbs.css.theme-token", varName: "--crumbs-space-sm" },
      paddingRight: 8,
    })
  })

  it("matches compiled static selections with runtime lookup selections", async () => {
    const { exports, plan } = await transformedFixture()
    const resolver = createSprinklesResolver(plan)

    expect(flattenStyles(resolver({ px: "sm", paddingLeft: "token", backgroundColor: "canvas" })))
      .toEqual(exports.card as Record<string, unknown>)
    expect(flattenStyles(resolver({ px: "sm" }))).toEqual((exports.mapped as Record<string, unknown>).compact as Record<string, unknown>)
    expect(flattenStyles(resolver({ px: "token" }))).toEqual((exports.mapped as Record<string, unknown>).roomy as Record<string, unknown>)
  })
})
