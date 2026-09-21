import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { getThemeVarName } from "../src/native-style"
import {
  createTokenContract,
  createTokenTheme,
  defineAlias,
  defineToken,
  type TokenThemeValues,
} from "../src/tokens"
import { createTokenThemeFocus } from "../src/tokens/optic"

const vars = createTokenContract({
  color: {
    accent: defineToken("color"),
    canvas: defineToken("color"),
  },
  space: {md: defineToken("length")},
  semantic: {foreground: defineAlias("color.accent")},
}, {owner: "@acme/tokens", name: "optics", version: 1})

const accentFocus = createTokenThemeFocus(vars, vars.color.accent)
const spaceFocus = createTokenThemeFocus(vars, vars.space.md)

function makeTheme() {
  return createTokenTheme(vars, {
    color: {accent: "#111111", canvas: "#ffffff"},
    space: {md: 8},
  })
}

describe("Effect-backed token theme focuses", () => {
  it("reads and replaces nested definition values while deriving aliases atomically", () => {
    const current = makeTheme()
    expect(accentFocus.path).toEqual(["color", "accent"])
    expect(accentFocus.get(current)).toBe("#111111")

    const result = accentFocus.replace("#222222", current)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.changedPaths).toEqual([["color", "accent"]])
    expect(result.theme.values.color.accent).toBe("#222222")
    expect(result.theme.values.semantic.foreground).toBe("#222222")
    expect(result.theme.tokens[getThemeVarName(vars.semantic.foreground)]).toBe("#222222")
    expect(current.values.color.accent).toBe("#111111")
  })

  it("rejects domain-changing modifications and preserves the old snapshot", () => {
    const current = makeTheme()
    const originalValues = current.values
    const originalTokens = current.tokens

    const result = spaceFocus.modify(() => "compact", current)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("CRUMBS_CSS_TOKEN_THEME_SCOPE_INVALID")
    expect(current.values).toBe(originalValues)
    expect(current.tokens).toBe(originalTokens)
    expect(spaceFocus.get(current)).toBe(8)
  })

  it("uses structural sharing for pure nested value replacement", () => {
    const source: TokenThemeValues<typeof vars> = {
      color: {accent: "#111111", canvas: "#ffffff"},
      space: {md: 8},
    }

    const changed = accentFocus.replaceValues("#222222", source)

    expect(changed).not.toBe(source)
    expect(changed.color).not.toBe(source.color)
    expect(changed.space).toBe(source.space)
    expect(changed.color.canvas).toBe(source.color.canvas)
    expect(source.color.accent).toBe("#111111")
  })

  it("supports pure functional modifications with the same path-copy boundary", () => {
    const source: TokenThemeValues<typeof vars> = {
      color: {accent: "#111111", canvas: "#ffffff"},
      space: {md: 8},
    }

    const changed = spaceFocus.modifyValues(value => Number(value) + 1, source)

    expect(spaceFocus.getValues(changed)).toBe(9)
    expect(changed.color).toBe(source.color)
    expect(changed.space).not.toBe(source.space)
    expect(source.space.md).toBe(8)
  })

  it("satisfies semantic lens laws for generated nested values", () => {
    fc.assert(fc.property(
      fc.integer({min: 0, max: 64}),
      fc.integer({min: 0, max: 64}),
      fc.integer({min: 0, max: 64}),
      (initial, first, last) => {
        const source: TokenThemeValues<typeof vars> = {
          color: {accent: "#111111", canvas: "#ffffff"},
          space: {md: initial},
        }
        const changed = spaceFocus.replaceValues(first, source)
        expect(spaceFocus.getValues(changed)).toBe(first)
        expect(spaceFocus.replaceValues(spaceFocus.getValues(source), source)).toEqual(source)
        expect(spaceFocus.replaceValues(last, changed)).toEqual(spaceFocus.replaceValues(last, source))
        expect(source.space.md).toBe(initial)
      },
    ), {seed: 20260933, numRuns: 100})
  })

  it("rejects aliases and foreign contract tokens when a focus is created", () => {
    expect(() => createTokenThemeFocus(vars, vars.semantic.foreground as never)).toThrow(
      /CRUMBS_CSS_TOKEN_THEME_FOCUS_INVALID/,
    )
    const other = createTokenContract({
      color: {accent: defineToken("color"), canvas: defineToken("color")},
      space: {md: defineToken("length")},
      semantic: {foreground: defineAlias("color.accent")},
    }, {owner: "@acme/tokens", name: "other-optics", version: 1})
    expect(() => createTokenThemeFocus(vars, other.color.accent)).toThrow(
      /CRUMBS_CSS_TOKEN_THEME_FOCUS_INVALID/,
    )
  })

  it("returns a contract diagnostic when applied to another identified theme", () => {
    const other = createTokenContract({
      color: {accent: defineToken("color"), canvas: defineToken("color")},
      space: {md: defineToken("length")},
      semantic: {foreground: defineAlias("color.accent")},
    }, {owner: "@acme/tokens", name: "other-optics-theme", version: 1})
    const otherTheme = createTokenTheme(other, {
      color: {accent: "#111111", canvas: "#ffffff"},
      space: {md: 8},
    })

    const result = accentFocus.replace("#222222", otherTheme as never)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("CRUMBS_CSS_TOKEN_THEME_PATCH_CONTRACT_MISMATCH")
  })
})
