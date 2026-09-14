import { describe, expect, it } from "bun:test"
import { recipe, rawStyleSelection, selections, makeSelectionRun } from "../bench/selection-workload"
import { createRecipeResolver, resolveRecipeStyle } from "../src/theme-runtime"

describe("recipe benchmark workload parity", () => {
  it("performs defaults, selection, filtering and compound work in identical style order", () => {
    const resolve = createRecipeResolver(recipe)
    for (const selection of selections) {
      const expected = resolveRecipeStyle(recipe, selection)
      const raw = rawStyleSelection(selection)
      expect(raw).toEqual(expected)
      expect(raw.every((style, index) => style === expected[index])).toBe(true)
      expect(resolve(selection)).toEqual(expected)
    }
  })
  it("covers defaults, partial overrides and compound matches", () => {
    expect(selections).toContainEqual({})
    expect(selections).toContainEqual({ disabled: true })
    expect(selections).toContainEqual({ tone: "secondary" })
    expect(rawStyleSelection({ disabled: true }).at(-1)).toBe(recipe.compoundVariants![0]!.style)
    // JS callers can still supply explicit undefined; it is outside the public
    // exactOptionalPropertyTypes contract and must not widen benchmark input types.
    const jsSelection = { tone: undefined } as unknown as Parameters<typeof rawStyleSelection>[0]
    expect(rawStyleSelection(jsSelection)).toEqual(resolveRecipeStyle(recipe, jsSelection))
  })
  it("starts each measured implementation on the same independent selection sequence", () => {
    const left = makeSelectionRun(selection => selection)
    const right = makeSelectionRun(selection => selection)
    for (let i = 0; i < selections.length * 2 + 1; i++) {
      expect(left()).toEqual(right())

    }
  })
})

it("measures a first transform in a fresh process and retains an equivalent output receipt", async () => {
  const { measureFirstTransform } = await import("../bench/first-transform")
  const { transformCssTsToStyleSheet } = await import("../src/transformer")
  const { createHash } = await import("node:crypto")
  const { resolve } = await import("node:path")
  const root = resolve(import.meta.dir, "..")
  const fixture = resolve(root, "examples/recipe.css.ts")
  const cold = await measureFirstTransform(fixture, root)
  const warm = await transformCssTsToStyleSheet(fixture, root, { strictDiagnostics: true })
  expect(cold.durationMs).toBeGreaterThan(0)
  expect(cold.outputSha256).toBe(createHash("sha256").update(warm).digest("hex"))
  expect(cold.outputBytes).toBe(Buffer.byteLength(warm))
  expect(cold.pid).not.toBe(process.pid)
}, 30000)
