import { describe, expect, test } from "bun:test"
import { createTokenStyles, resolveTokenStyles, themeToken } from "../src/theme-token-only"
import { createTokenContract, defineToken } from "../src/tokens"
import { registerThemeTokenContract, type ThemeTokenDomainMetadata } from "../src/theme-token"
import { getThemeVarName } from "../src/theme-contract"
import type { NativeTheme } from "../src/theme-contract"
import type { ViewStyle } from "react-native"

const vars = createTokenContract({
  color: {accent: defineToken("color")},
  space: {md: defineToken({kind: "length"})},
})
const foreignVars = createTokenContract({
  color: {unowned: defineToken("color")},
})
const colorToken = String(vars.color.accent)
const spaceToken = String(vars.space.md)
const runtimeContract = {}
const metadata = new Map<string, ThemeTokenDomainMetadata>([
  [colorToken, {domain: {kind: "color"}, validate: value => typeof value === "string"}],
  [spaceToken, {domain: {kind: "length", allowNegative: false}, validate: value => typeof value === "number"}],
])
registerThemeTokenContract(runtimeContract, metadata)

function theme(
  entries: Readonly<Record<string, string | number>> = {
    [getThemeVarName(vars.color.accent)]: "#123456",
    [getThemeVarName(vars.space.md)]: 12,
  },
): NativeTheme<Record<string, unknown>> {
  return {contract: runtimeContract, tokens: entries, values: {}} as NativeTheme<Record<string, unknown>>
}

describe("theme token-only runtime", () => {
  test("resolves styles from typed token references and preserves literal values", () => {
    const styles = createTokenStyles<ViewStyle>()({
      card: {
        backgroundColor: themeToken(vars.color.accent),
        padding: themeToken(vars.space.md),
        opacity: 0.8,
      },
    })

    expect(resolveTokenStyles(styles, theme())).toEqual({
      card: {backgroundColor: "#123456", padding: 12, opacity: 0.8},
    })
  })

  test("reuses a resolution for the same immutable theme and style identities", () => {
    const styles = createTokenStyles<ViewStyle>()({
      card: {backgroundColor: themeToken(vars.color.accent)},
    })
    const activeTheme = theme()

    expect(resolveTokenStyles(styles, activeTheme)).toBe(resolveTokenStyles(styles, activeTheme))
  })

  test("returns the original map when no token references need resolution", () => {
    const styles = createTokenStyles<ViewStyle>()({card: {opacity: 0.5}})

    expect(resolveTokenStyles(styles, theme())).toBe(styles)
  })

  test("rejects token references not owned by the active domain contract", () => {
    const styles = createTokenStyles<ViewStyle>()({
      card: {backgroundColor: themeToken(foreignVars.color.unowned)},
    })

    expect(() => resolveTokenStyles(styles, theme({[getThemeVarName(foreignVars.color.unowned)]: "red"})))
      .toThrow(/CRUMBS_CSS_TOKEN_THEME_TOKEN_CONTRACT_MISMATCH/)
  })

  test("reports missing owned values without returning a partial style map", () => {
    const styles = createTokenStyles<ViewStyle>()({
      card: {backgroundColor: themeToken(vars.color.accent)},
    })

    expect(() => resolveTokenStyles(styles, theme({}))).toThrow(/CRUMBS_CSS_MISSING_THEME_TOKEN/)
  })

  test("requires a registered domain reference at runtime", () => {
    expect(() => themeToken("--crumbs-m105-forged" as never)).toThrow(/Unknown native theme token/)
  })

  test("rejects accessor token descriptors without executing user code", () => {
    let reads = 0
    const forged = Object.defineProperties({}, {
      $$type: {value: "crumbs.css.theme-token", enumerable: true},
      varName: {get() { reads += 1; return getThemeVarName(vars.color.accent) }, enumerable: true},
    })
    const styles = {card: {backgroundColor: forged}} as never

    expect(() => resolveTokenStyles(styles, theme())).toThrow(/CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE/)
    expect(reads).toBe(0)
  })

  test("rejects nested style objects instead of silently broadening the contract", () => {
    const styles = {card: {shadowOffset: {width: 0, height: 1}}} as never

    expect(() => resolveTokenStyles(styles, theme())).toThrow(/CRUMBS_CSS_TOKEN_STYLE_UNSUPPORTED/)
  })
})
