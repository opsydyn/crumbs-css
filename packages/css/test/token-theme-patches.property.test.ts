import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { getThemeVarName } from "../src/native-style"
import {
  applyTokenThemePatch,
  createTokenContract,
  createTokenTheme,
  defineAlias,
  defineToken,
} from "../src/tokens"

const vars = createTokenContract({
  color: {
    accent: defineToken("color"),
    canvas: defineToken("color"),
  },
  space: {md: defineToken("length")},
  semantic: {foreground: defineAlias("color.accent")},
}, {owner: "@acme/tokens", name: "patches", version: 1})

function makeTheme() {
  return createTokenTheme(vars, {
    color: {accent: "#111111", canvas: "#ffffff"},
    space: {md: 8},
  })
}

describe("immutable token theme patches", () => {
  it("publishes canonical values and derived tokens together", () => {
    const current = makeTheme()
    const result = applyTokenThemePatch(vars, current, {
      color: {accent: "#222222"},
      space: {md: 6},
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.changedPaths).toEqual([["color", "accent"], ["space", "md"]])
    expect(result.theme).not.toBe(current)
    expect(result.theme.values.color.accent).toBe("#222222")
    expect(result.theme.values.semantic.foreground).toBe("#222222")
    expect(result.theme.tokens[getThemeVarName(vars.semantic.foreground)]).toBe("#222222")
    expect(current.values.color.accent).toBe("#111111")
    expect(current.tokens[getThemeVarName(vars.color.accent)]).toBe("#111111")
  })

  it("returns structured errors and leaves the old snapshot untouched", () => {
    const current = makeTheme()
    const originalValues = current.values
    const originalTokens = current.tokens
    const result = applyTokenThemePatch(vars, current, {
      space: {md: -1},
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("CRUMBS_CSS_TOKEN_THEME_SCOPE_INVALID")
    expect(result.error.path).toEqual([])
    expect(current.values).toBe(originalValues)
    expect(current.tokens).toBe(originalTokens)
  })

  it("rejects unknown and derived leaves before publication", () => {
    const current = makeTheme()
    const unknown = applyTokenThemePatch(vars, current, {unknown: {value: 1}} as never)
    const alias = applyTokenThemePatch(vars, current, {
      semantic: {foreground: "#fff"},
    } as never)

    expect(unknown.ok).toBe(false)
    if (!unknown.ok) expect(unknown.error.code).toBe("CRUMBS_CSS_TOKEN_THEME_SCOPE_INVALID")
    expect(alias.ok).toBe(false)
    if (!alias.ok) expect(alias.error.code).toBe("CRUMBS_CSS_TOKEN_ALIAS_OVERRIDE")
  })

  it("rejects a snapshot owned by another identified contract", () => {
    const other = createTokenContract({
      color: {accent: defineToken("color"), canvas: defineToken("color")},
      space: {md: defineToken("length")},
      semantic: {foreground: defineAlias("color.accent")},
    }, {owner: "@acme/tokens", name: "other", version: 1})
    const otherTheme = createTokenTheme(other, {
      color: {accent: "#111111", canvas: "#ffffff"},
      space: {md: 8},
    })
    const result = applyTokenThemePatch(vars, otherTheme as never, {color: {accent: "#222222"}})

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("CRUMBS_CSS_TOKEN_THEME_PATCH_CONTRACT_MISMATCH")
  })

  it("matches an independent generated patch evaluator", () => {
    fc.assert(fc.property(
      fc.integer({min: 0, max: 64}),
      fc.stringMatching(/^#[0-9a-f]{6}$/),
      (space, accent) => {
        const current = makeTheme()
        const result = applyTokenThemePatch(vars, current, {
          color: {accent},
          space: {md: space},
        })
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.theme.values.color.accent).toBe(accent)
        expect(result.theme.values.space.md).toBe(space)
        expect(result.theme.values.semantic.foreground).toBe(accent)
      },
    ), {numRuns: 25, seed: 20260932})
  })
})
