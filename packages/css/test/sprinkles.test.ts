import { describe, expect, it } from "bun:test"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { defineProperties } from "../src/native-style"
import path from "node:path"

const ROOT = path.resolve(import.meta.dir, "..")
const FIXTURE = path.resolve(ROOT, "fixtures/sprinkles.css.ts")

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
})
