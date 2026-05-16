import { describe, expect, it } from "bun:test"
import type { NativeRecipe } from "@crumbs/css/style"
import { createTheme, createThemeContract } from "@crumbs/css/style"
import {
  createRecipeResolver,
  createThemeTokenReference,
  resolveRecipeStyle,
  resolveThemeStyles,
  resolveThemeTokens,
} from "@crumbs/css/theme"

function captureWarnings(run: () => void): ReadonlyArray<string> {
  const originalWarn = console.warn
  const warnings: string[] = []
  console.warn = (...args: ReadonlyArray<unknown>) => {
    warnings.push(args.map(String).join(" "))
  }
  try {
    run()
  } finally {
    console.warn = originalWarn
  }
  return warnings
}

describe("native theme runtime", () => {
  const vars = createThemeContract({
    color: {
      canvas: null,
      text: null,
    },
    font: {
      display: null,
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
    font: {
      display: "Cinzel",
    },
    space: {
      md: 24,
    },
  })

  it("resolves native theme token references to active theme values", () => {
    const resolved = resolveThemeTokens(
      {
        backgroundColor: createThemeTokenReference("--crumbs-color-canvas"),
        color: createThemeTokenReference("--crumbs-color-text"),
        padding: createThemeTokenReference("--crumbs-space-md"),
      },
      theme,
    )

    expect(resolved).toEqual({
      backgroundColor: "#0a0a0a",
      color: "#f5f5f5",
      padding: 24,
    })
  })

  it("resolves fontFamily token references to strings before React Native Web compiles styles", () => {
    const resolved = resolveThemeTokens(
      {
        fontFamily: createThemeTokenReference("--crumbs-font-display"),
        fontSize: 16,
      },
      theme,
    )

    expect(resolved).toEqual({
      fontFamily: "Cinzel",
      fontSize: 16,
    })
    expect(typeof resolved?.fontFamily).toBe("string")
  })

  it("flattens style arrays before resolving token references", () => {
    const resolved = resolveThemeTokens(
      [
        false,
        { backgroundColor: "transparent", color: "black" },
        {
          backgroundColor: createThemeTokenReference("--crumbs-color-canvas"),
          padding: createThemeTokenReference("--crumbs-space-md"),
        },
      ],
      theme,
    )

    expect(resolved).toEqual({
      backgroundColor: "#0a0a0a",
      color: "black",
      padding: 24,
    })
  })

  it("throws when a style references a token missing from the active theme", () => {
    const vars = createThemeContract({
      color: {
        canvas: null,
      },
    })
    const incompleteTheme = createTheme(vars, {
      color: {
        canvas: "#0a0a0a",
      },
    })

    expect(() =>
      resolveThemeTokens(
        {
          color: createThemeTokenReference("--crumbs-color-text"),
        },
        incompleteTheme,
      ),
    ).toThrow('Theme token "--crumbs-color-text" is missing from the active native theme')
  })

  it("returns undefined for empty style inputs", () => {
    expect(resolveThemeTokens(null, theme)).toBeUndefined()
    expect(resolveThemeTokens(false, theme)).toBeUndefined()
    expect(resolveThemeTokens([false, null, undefined], theme)).toBeUndefined()
  })

  it("resolves every style export in a styles object", () => {
    const styles = resolveThemeStyles(
      {
        body: {
          color: createThemeTokenReference("--crumbs-color-text"),
          fontSize: 14,
        },
        container: {
          backgroundColor: createThemeTokenReference("--crumbs-color-canvas"),
          padding: createThemeTokenReference("--crumbs-space-md"),
        },
        hidden: undefined,
      },
      theme,
    )

    expect(styles as unknown).toEqual({
      body: {
        color: "#f5f5f5",
        fontSize: 14,
      },
      container: {
        backgroundColor: "#0a0a0a",
        padding: 24,
      },
      hidden: undefined,
    })
  })

  it("resolves nested variant style maps", () => {
    const styles = resolveThemeStyles(
      {
        button: {
          default: {
            backgroundColor: createThemeTokenReference("--crumbs-color-canvas"),
          },
          pressed: {
            backgroundColor: createThemeTokenReference("--crumbs-color-text"),
            opacity: 0.8,
          },
        },
      },
      theme,
    )

    expect(styles as unknown).toEqual({
      button: {
        default: {
          backgroundColor: "#0a0a0a",
        },
        pressed: {
          backgroundColor: "#f5f5f5",
          opacity: 0.8,
        },
      },
    })
  })

  it("keeps missing-token errors actionable when resolving a styles object", () => {
    expect(() =>
      resolveThemeStyles(
        {
          heading: {
            color: createThemeTokenReference("--crumbs-color-accent"),
          },
        },
        theme,
      ),
    ).toThrow('Theme token "--crumbs-color-accent" is missing from the active native theme')
  })

  it("resolves recipe styles from selected variants and matching compound variants", () => {
    const styles = resolveThemeStyles(
      {
        button: {
          $$type: "crumbs.css.recipe",
          base: {
            backgroundColor: createThemeTokenReference("--crumbs-color-canvas"),
          },
          compoundVariants: [
            {
              style: {
                opacity: 0.5,
              },
              variants: {
                disabled: true,
                tone: "primary",
              },
            },
          ],
          defaultVariants: {
            disabled: false,
            pressed: false,
            tone: "primary",
          },
          variants: {
            disabled: {
              false: {},
              true: {
                opacity: 0.6,
              },
            },
            pressed: {
              false: {},
              true: {
                opacity: 0.82,
              },
            },
            tone: {
              danger: {
                backgroundColor: "#9f2f25",
              },
              primary: {
                backgroundColor: createThemeTokenReference("--crumbs-color-text"),
              },
            },
          },
        },
      },
      theme,
    )

    type ButtonRecipeVariants = {
      readonly disabled: {
        readonly false: Record<keyof never, never>
        readonly true: Record<keyof never, never>
      }
      readonly pressed: {
        readonly false: Record<keyof never, never>
        readonly true: Record<keyof never, never>
      }
      readonly tone: {
        readonly danger: Record<keyof never, never>
        readonly primary: Record<keyof never, never>
      }
    }

    expect(
      resolveRecipeStyle(styles.button as unknown as NativeRecipe<ButtonRecipeVariants>, {
        disabled: true,
        pressed: true,
      }),
    ).toEqual([
      { backgroundColor: "#0a0a0a" },
      { opacity: 0.6 },
      { opacity: 0.82 },
      { backgroundColor: "#f5f5f5" },
      { opacity: 0.5 },
    ])
  })

  it("keeps recipe merge order stable for native style array overrides", () => {
    const orderedButton = {
      $$type: "crumbs.css.recipe",
      base: { opacity: 1 },
      compoundVariants: [
        {
          style: { opacity: 0.7 },
          variants: { disabled: true },
        },
        {
          style: { opacity: 0.6 },
          variants: { disabled: true, tone: "primary" },
        },
      ],
      defaultVariants: {
        disabled: false,
        size: "md",
        tone: "primary",
      },
      variants: {
        tone: {
          danger: { opacity: 0.91 },
          primary: { opacity: 0.9 },
        },
        size: {
          md: { opacity: 0.8 },
          sm: { opacity: 0.81 },
        },
        disabled: {
          false: { opacity: 0.95 },
          true: { opacity: 0.75 },
        },
      },
    } as unknown as NativeRecipe<{
      readonly disabled: {
        readonly false: Record<keyof never, never>
        readonly true: Record<keyof never, never>
      }
      readonly size: {
        readonly md: Record<keyof never, never>
        readonly sm: Record<keyof never, never>
      }
      readonly tone: {
        readonly danger: Record<keyof never, never>
        readonly primary: Record<keyof never, never>
      }
    }>

    expect(resolveRecipeStyle(orderedButton, { disabled: true })).toEqual([
      { opacity: 1 },
      { opacity: 0.9 },
      { opacity: 0.8 },
      { opacity: 0.75 },
      { opacity: 0.7 },
      { opacity: 0.6 },
    ])
  })

  it("creates a typed recipe resolver with stable recipe ordering", () => {
    const button = {
      $$type: "crumbs.css.recipe",
      $$debugName: "resolverButton",
      base: { opacity: 1 },
      compoundVariants: [
        {
          style: { opacity: 0.6 },
          variants: { disabled: true, tone: "primary" },
        },
      ],
      defaultVariants: {
        disabled: false,
        tone: "primary",
      },
      variants: {
        disabled: {
          false: { opacity: 0.95 },
          true: { opacity: 0.75 },
        },
        tone: {
          danger: { opacity: 0.91 },
          primary: { opacity: 0.9 },
        },
      },
    } as unknown as NativeRecipe<{
      readonly disabled: {
        readonly false: Record<keyof never, never>
        readonly true: Record<keyof never, never>
      }
      readonly tone: {
        readonly danger: Record<keyof never, never>
        readonly primary: Record<keyof never, never>
      }
    }>
    const resolveButton = createRecipeResolver(button)

    expect(resolveButton({ disabled: true })).toEqual([
      { opacity: 1 },
      { opacity: 0.75 },
      { opacity: 0.9 },
      { opacity: 0.6 },
    ])
  })

  it("keeps recipe diagnostics behind created resolvers", () => {
    const partialButton = {
      $$type: "crumbs.css.recipe",
      $$debugName: "resolverPartialButton",
      base: { opacity: 1 },
    } as unknown as NativeRecipe<{
      readonly tone: {
        readonly primary: Record<keyof never, never>
      }
    }>
    const resolveButton = createRecipeResolver(partialButton)

    let resolved: ReadonlyArray<unknown> = []
    const warnings = captureWarnings(() => {
      resolved = resolveButton({ tone: "primary" })
      resolveButton({ tone: "primary" })
    })

    expect(resolved).toEqual([{ opacity: 1 }])
    expect(warnings).toEqual([
      '[crumbs-css:CRUMBS_CSS_PARTIAL_RECIPE_PAYLOAD] Invalid native recipe "resolverPartialButton": missing variants map; using base fallback. This can happen when Metro serves stale transformed output.',
    ])
  })

  it("keeps invalid variant fallback diagnostics behind created resolvers", () => {
    const button = {
      $$type: "crumbs.css.recipe",
      $$debugName: "resolverDiagnosticButton",
      base: { opacity: 1 },
      variants: {
        tone: {
          primary: { opacity: 0.9 },
        },
      },
    } as unknown as NativeRecipe<{
      readonly tone: {
        readonly primary: Record<keyof never, never>
      }
    }>
    const resolveButton = createRecipeResolver(button)

    let resolved: ReadonlyArray<unknown> = []
    const warnings = captureWarnings(() => {
      resolved = resolveButton({ tone: "ghost" as "primary" })
      resolveButton({ tone: "ghost" as "primary" })
    })

    expect(resolved).toEqual([{ opacity: 1 }])
    expect(warnings).toEqual([
      '[crumbs-css:CRUMBS_CSS_INVALID_RECIPE_VARIANT] Invalid native recipe "resolverDiagnosticButton": variant "tone" does not define value "ghost"; supported values: primary.',
    ])
  })

  it("does not throw when a transformed recipe payload is missing optional maps", () => {
    const partialButton = {
      $$type: "crumbs.css.recipe",
      $$debugName: "partialButton",
      base: { opacity: 1 },
    } as unknown as NativeRecipe<{
      readonly tone: {
        readonly primary: Record<keyof never, never>
      }
    }>

    let resolved: ReadonlyArray<unknown> = []
    const warnings = captureWarnings(() => {
      resolved = resolveRecipeStyle(partialButton, { tone: "primary" })
    })

    expect(resolved).toEqual([{ opacity: 1 }])
    expect(warnings).toEqual([
      '[crumbs-css:CRUMBS_CSS_PARTIAL_RECIPE_PAYLOAD] Invalid native recipe "partialButton": missing variants map; using base fallback. This can happen when Metro serves stale transformed output.',
    ])
  })

  it("warns once when a transformed recipe payload is missing runtime maps", () => {
    const partialButton = {
      $$type: "crumbs.css.recipe",
      $$debugName: "partialDiagnosticButton",
      base: { opacity: 1 },
    } as unknown as NativeRecipe<{
      readonly tone: {
        readonly primary: Record<keyof never, never>
      }
    }>

    const warnings = captureWarnings(() => {
      resolveRecipeStyle(partialButton, { tone: "primary" })
      resolveRecipeStyle(partialButton, { tone: "primary" })
    })

    expect(warnings).toEqual([
      '[crumbs-css:CRUMBS_CSS_PARTIAL_RECIPE_PAYLOAD] Invalid native recipe "partialDiagnosticButton": missing variants map; using base fallback. This can happen when Metro serves stale transformed output.',
    ])
  })

  it("warns once when a selected recipe variant value is not declared", () => {
    const button = {
      $$type: "crumbs.css.recipe",
      $$debugName: "diagnosticButton",
      base: { opacity: 1 },
      compoundVariants: [],
      defaultVariants: { tone: "primary" },
      variants: {
        tone: {
          primary: { opacity: 0.9 },
        },
      },
    } as unknown as NativeRecipe<{
      readonly tone: {
        readonly primary: Record<keyof never, never>
      }
    }>

    const warnings = captureWarnings(() => {
      resolveRecipeStyle(button, { tone: "ghost" as "primary" })
      resolveRecipeStyle(button, { tone: "ghost" as "primary" })
    })

    expect(resolveRecipeStyle(button, { tone: "ghost" as "primary" })).toEqual([{ opacity: 1 }])
    expect(warnings).toEqual([
      '[crumbs-css:CRUMBS_CSS_INVALID_RECIPE_VARIANT] Invalid native recipe "diagnosticButton": variant "tone" does not define value "ghost"; supported values: primary.',
    ])
  })

  it("does not emit recipe diagnostics in production mode", () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    const partialButton = {
      $$type: "crumbs.css.recipe",
      $$debugName: "productionPartialButton",
      base: { opacity: 1 },
    } as unknown as NativeRecipe<{
      readonly tone: {
        readonly primary: Record<keyof never, never>
      }
    }>

    try {
      const warnings = captureWarnings(() => {
        resolveRecipeStyle(partialButton, { tone: "primary" })
      })

      expect(warnings).toEqual([])
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV
      } else {
        process.env.NODE_ENV = originalNodeEnv
      }
    }
  })
})
