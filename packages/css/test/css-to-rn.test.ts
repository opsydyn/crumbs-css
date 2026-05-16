import { describe, expect, it } from "bun:test"
import { cssDeclarationsToRN } from "../src/css-to-rn"

describe("cssDeclarationsToRN", () => {
  it("converts font-size px to number", () => {
    expect(cssDeclarationsToRN([["font-size", "16px"]])).toEqual({ fontSize: 16 })
  })

  it("converts color hex", () => {
    expect(cssDeclarationsToRN([["color", "#c8aa6e"]])).toEqual({ color: "#c8aa6e" })
  })

  it("converts font-weight string", () => {
    expect(cssDeclarationsToRN([["font-weight", "bold"]])).toEqual({ fontWeight: "bold" })
  })

  it("converts font-weight numeric string", () => {
    expect(cssDeclarationsToRN([["font-weight", "700"]])).toEqual({ fontWeight: "700" })
  })

  it("converts flex shorthand", () => {
    const result = cssDeclarationsToRN([["flex", "1"]])
    expect(result).toMatchObject({ flexGrow: 1 })
  })

  it("converts background-color", () => {
    expect(cssDeclarationsToRN([["background-color", "#0a0a0a"]])).toEqual({
      backgroundColor: "#0a0a0a",
    })
  })

  it("converts padding shorthand to individual sides", () => {
    const result = cssDeclarationsToRN([["padding", "8px 16px"]])
    expect(result).toMatchObject({
      paddingTop: 8,
      paddingRight: 16,
      paddingBottom: 8,
      paddingLeft: 16,
    })
  })

  it("converts border-radius shorthand to individual corners", () => {
    const result = cssDeclarationsToRN([["border-radius", "8px"]])
    expect(result).toMatchObject({
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
      borderBottomLeftRadius: 8,
    })
  })

  it("handles multiple declarations in one call", () => {
    const result = cssDeclarationsToRN([
      ["color", "#c8aa6e"],
      ["font-size", "24px"],
      ["font-weight", "700"],
      ["margin-bottom", "8px"],
    ])
    expect(result).toEqual({
      color: "#c8aa6e",
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 8,
    })
  })

  it("skips vendor-prefixed properties", () => {
    const result = cssDeclarationsToRN([
      ["-webkit-transform", "rotate(45deg)"],
      ["-moz-appearance", "none"],
      ["-ms-overflow-style", "none"],
    ])
    expect(result).toEqual({})
  })

  it("skips vendor-prefixed properties but keeps valid ones alongside", () => {
    const result = cssDeclarationsToRN([
      ["-webkit-user-select", "none"],
      ["color", "red"],
    ])
    expect(result).toEqual({ color: "red" })
  })

  it("returns empty object for empty declarations", () => {
    expect(cssDeclarationsToRN([])).toEqual({})
  })

  it("drops unsupported web-only properties without losing valid declarations", () => {
    expect(
      cssDeclarationsToRN([
        ["transition", "all 0.3s"],
        ["color", "red"],
      ]),
    ).toEqual({ color: "red" })
  })

  it("converts gap to gap number", () => {
    const result = cssDeclarationsToRN([["gap", "8px"]])
    expect(result).toMatchObject({ gap: 8 })
  })

  it("converts letter-spacing", () => {
    const result = cssDeclarationsToRN([["letter-spacing", "0.05em"]])
    expect(result).toMatchObject({ letterSpacing: expect.anything() })
  })

  it("converts unitless native line-height numbers without warning", () => {
    const warnings: string[] = []
    const errors: string[] = []
    const originalWarn = console.warn
    const originalError = console.error
    console.warn = (...args: unknown[]) => {
      warnings.push(args.join(" "))
    }
    console.error = (...args: unknown[]) => {
      errors.push(args.join(" "))
    }
    try {
      expect(cssDeclarationsToRN([["line-height", "19"]])).toEqual({ lineHeight: 19 })
    } finally {
      console.warn = originalWarn
      console.error = originalError
    }

    expect(warnings).toEqual([])
    expect(errors).toEqual([])
  })

  it("strips CSS variable values and does not throw", () => {
    const result = cssDeclarationsToRN([["color", "var(--brand-color)"]])
    expect(result).toEqual({})
  })

  it("strips CSS variable values but keeps valid declarations in the same rule", () => {
    const result = cssDeclarationsToRN([
      ["color", "var(--brand-color)"],
      ["font-size", "16px"],
    ])
    expect(result).toEqual({ fontSize: 16 })
  })

  it("preserves native theme tokens as explicit token references", () => {
    const result = cssDeclarationsToRN([
      ["background-color", "var(--crumbs-color-canvas)"],
      ["padding", "var(--crumbs-space-md)"],
    ])
    expect(result).toEqual({
      backgroundColor: {
        $$type: "crumbs.css.theme-token",
        varName: "--crumbs-color-canvas",
      },
      padding: {
        $$type: "crumbs.css.theme-token",
        varName: "--crumbs-space-md",
      },
    })
  })
})
