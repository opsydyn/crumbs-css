import { describe, expect, it } from "bun:test"
import {
  createTheme,
  createThemeContract,
  getThemeTokenPath,
  getThemeVarName,
  isThemeVar,
} from "../src/native-style"

describe("native style theming", () => {
  it("creates a vanilla-extract-like theme contract with native token metadata", () => {
    const vars = createThemeContract({
      color: {
        canvas: null,
        surfaceRaised: null,
        text: null,
      },
      space: {
        md: null,
      },
    })

    expect(String(vars.color.canvas)).toBe("var(--crumbs-color-canvas)")
    expect(String(vars.color.surfaceRaised)).toBe("var(--crumbs-color-surface-raised)")
    expect(String(vars.space.md)).toBe("var(--crumbs-space-md)")
    expect(isThemeVar(vars.color.text)).toBe(true)
    expect(getThemeVarName(vars.color.canvas)).toBe("--crumbs-color-canvas")
    expect(getThemeTokenPath(vars.space.md)).toEqual(["space", "md"])
  })

  it("creates a theme value map with exact contract keys", () => {
    const vars = createThemeContract({
      color: {
        canvas: null,
        text: null,
      },
      space: {
        md: null,
      },
    })

    const theme = createTheme(vars, {
      color: {
        canvas: "#0a0a0a",
        text: "#f5f5f5",
      },
      space: {
        md: 24,
      },
    })

    expect(theme.tokens).toEqual({
      "--crumbs-color-canvas": "#0a0a0a",
      "--crumbs-color-text": "#f5f5f5",
      "--crumbs-space-md": 24,
    })
  })

  it("rejects missing runtime theme values", () => {
    const vars = createThemeContract({
      color: {
        canvas: null,
      },
    })

    expect(() => createTheme(vars, { color: {} } as never)).toThrow(
      'Missing theme value for "color.canvas"',
    )
  })

  it("rejects extra runtime theme values", () => {
    const vars = createThemeContract({
      color: {
        canvas: null,
      },
    })

    expect(() =>
      createTheme(vars, { color: { canvas: "#0a0a0a", extra: "red" } } as never),
    ).toThrow('Unknown theme value "color.extra"')
  })
})
