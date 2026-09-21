import { describe, expect, it } from "bun:test"
import { runInNewContext } from "node:vm"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { defineProperties } from "../src/native-style"
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
})
