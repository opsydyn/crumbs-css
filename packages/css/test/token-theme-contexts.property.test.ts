import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { getThemeVarName } from "../src/native-style"
import {
  createTokenContract,
  createTokenTheme,
  createTokenThemeScopedSnapshot,
  createTokenThemeSnapshot,
  defineAlias,
  defineToken,
} from "../src/tokens"

const identity = {owner: "@acme/tokens", name: "contexts", version: 1} as const

function contract() {
  return createTokenContract({
    color: {
      accent: defineToken("color"),
      canvas: defineToken("color"),
    },
    space: {
      md: defineToken("length"),
    },
    semantic: {
      foreground: defineAlias("color.accent"),
    },
  }, identity)
}

function baseValues() {
  return {
    color: {accent: "#111111", canvas: "#ffffff"},
    space: {md: 8},
  }
}

describe("independent token theme contexts", () => {
  it("merges brand, mode and density in fixed precedence order", () => {
    const vars = contract()
    const theme = createTokenThemeSnapshot(vars, {
      base: baseValues(),
      // Deliberately insert contexts in reverse order. Precedence is a
      // contract, not an object-enumeration accident.
      contexts: {
        density: {space: {md: 4}},
        mode: {color: {accent: "#222222"}},
        brand: {color: {accent: "#333333"}},
      },
    })

    expect(theme.values.color.accent).toBe("#222222")
    expect(theme.values.semantic.foreground).toBe("#222222")
    expect(theme.values.space.md).toBe(4)
    expect(theme.tokens[getThemeVarName(vars.semantic.foreground)]).toBe("#222222")
  })

  it("rebases sparse contexts on a complete base snapshot", () => {
    const vars = contract()
    const base = createTokenTheme(vars, baseValues())
    const scoped = createTokenThemeScopedSnapshot(vars, base, {
      brand: {color: {canvas: "#eeeeee"}},
      density: {space: {md: 6}},
    })

    expect(scoped.values).toEqual({
      color: {accent: "#111111", canvas: "#eeeeee"},
      space: {md: 6},
      semantic: {foreground: "#111111"},
    })
    expect(scoped.tokens[getThemeVarName(vars.color.accent)]).toBe("#111111")
    expect(scoped.tokens[getThemeVarName(vars.color.canvas)]).toBe("#eeeeee")
  })

  it("rejects invalid context values without publishing a partial snapshot", () => {
    const vars = contract()
    const base = baseValues()
    expect(() => createTokenThemeSnapshot(vars, {
      base,
      contexts: {mode: {space: {md: -1}}},
    })).toThrow(/CRUMBS_CSS_TOKEN_THEME_SCOPE_INVALID/)
    expect(base).toEqual(baseValues())
  })

  it("keeps aliases derived and rejects direct context overrides", () => {
    const vars = contract()
    expect(() => createTokenThemeSnapshot(vars, {
      base: baseValues(),
      contexts: {brand: {semantic: {foreground: "#fff"}}} as never,
    })).toThrow(/CRUMBS_CSS_TOKEN_ALIAS_OVERRIDE/)
  })

  it("preserves precedence for generated finite layer values", () => {
    fc.assert(fc.property(
      fc.integer({min: 0, max: 100}),
      fc.integer({min: 0, max: 100}),
      fc.integer({min: 0, max: 100}),
      (brand, mode, density) => {
        const vars = contract()
        const theme = createTokenThemeSnapshot(vars, {
          base: baseValues(),
          contexts: {
            density: {space: {md: density}},
            mode: {space: {md: mode}},
            brand: {space: {md: brand}},
          },
        })
        expect(theme.values.space.md).toBe(density)
      },
    ), {numRuns: 25, seed: 20260931})
  })
})
