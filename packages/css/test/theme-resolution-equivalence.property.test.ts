import {describe, expect, it} from "bun:test"
import fc from "fast-check"
import {
  createThemeDependencyPlan,
  createThemeDependencyResolver,
  createThemeTokenReference,
  resolveThemeStyles,
  resolveThemeTokens,
} from "../src/theme-runtime"

type StyleEntry = false | null | Record<string, unknown> | ReadonlyArray<StyleEntry> | undefined
type ThemeSnapshot = {
  readonly contract: Record<string, never>
  readonly values: Record<string, never>
  readonly tokens: Record<string, string | number>
}

const PROPERTY_RUNS = 100
const PROPERTY_SEED = 20260921
const tokenNames = [
  "--crumbs-color-accent",
  "--crumbs-space-md",
  "--crumbs-opacity-muted",
] as const
const styleKeys = ["color", "padding", "opacity", "borderRadius"] as const

const tokenNameArbitrary = fc.constantFrom(...tokenNames)
const literalValueArbitrary = fc.oneof(
  fc.integer({min: 0, max: 100}),
  fc.constantFrom("#000000", "#ffffff", "transparent"),
)
const styleValueArbitrary = fc.oneof(
  literalValueArbitrary,
  tokenNameArbitrary.map(createThemeTokenReference),
)
const styleObjectArbitrary = fc
  .array(fc.tuple(fc.constantFrom(...styleKeys), styleValueArbitrary), {minLength: 1, maxLength: 4})
  .map((entries) => Object.fromEntries(entries))
const literalStyleObjectArbitrary = fc
  .array(fc.tuple(fc.constantFrom(...styleKeys), literalValueArbitrary), {minLength: 1, maxLength: 4})
  .map((entries) => Object.fromEntries(entries))
const styleEntryArbitrary: fc.Arbitrary<StyleEntry> = fc.letrec<{
  readonly entry: StyleEntry
}>((tie) => ({
  entry: fc.oneof(
    fc.constant(false),
    fc.constant(null),
    fc.constant(undefined),
    styleObjectArbitrary,
    fc.array(tie("entry"), {minLength: 0, maxLength: 3}),
  ),
})).entry

describe("cached and uncached theme resolution equivalence", () => {
  it("matches an independent uncached evaluator while preserving cache identity", () => {
    fc.assert(
      fc.property(styleEntryArbitrary, (style) => {
        const names = Array.from(new Set(flattenEntries(style).flatMap(tokenNamesFromStyle)))
        const theme = themeFromNames(names)
        const cached = resolveThemeTokens(style, theme)
        const repeated = resolveThemeTokens(style, theme)
        const uncached = resolveUncached(style, theme)

        expect(cached as unknown).toEqual(uncached)
        expect(repeated).toBe(cached)
        if (!Array.isArray(style) && names.length === 0 && style !== null &&
          style !== undefined && style !== false) {
          expect(cached as unknown).toBe(style as unknown)
        }
      }),
      {numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED},
    )
  })

  it("recomputes replacement snapshots without stale style-map outputs", () => {
    fc.assert(
      fc.property(literalStyleObjectArbitrary, literalStyleObjectArbitrary, (accentStyle, spaceStyle) => {
        const accent = createThemeTokenReference(tokenNames[0])
        const space = createThemeTokenReference(tokenNames[1])
        const styles = {
          accent: {...accentStyle, color: accent},
          space: {...spaceStyle, padding: space},
          staticStyle: Object.freeze({opacity: 0.5}),
        }
        const firstTheme = themeFromNames(tokenNames)
        const first = resolveThemeStyles(styles, firstTheme)
        const secondTheme: ThemeSnapshot = {
          ...firstTheme,
          tokens: {...firstTheme.tokens, [tokenNames[0]]: "#7c3aed"},
        }
        const second = resolveThemeStyles(styles, secondTheme)

        expect(second.accent).not.toBe(first.accent)
        expect(second.staticStyle).toBe(first.staticStyle)
        expect(second.accent as unknown).toEqual(resolveUncached(styles.accent, secondTheme))
        expect(second.space as unknown).toEqual(resolveUncached(styles.space, secondTheme))
      }),
      {numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED},
    )
  })

  it("invalidates only generated paths whose declared token changed", () => {
    fc.assert(
      fc.property(literalStyleObjectArbitrary, literalStyleObjectArbitrary, (accentStyle, spaceStyle) => {
        const styles = {
          accent: {...accentStyle, color: createThemeTokenReference(tokenNames[0])},
          space: {...spaceStyle, padding: createThemeTokenReference(tokenNames[1])},
          staticStyle: Object.freeze({opacity: 0.5}),
        }
        const resolver = createThemeDependencyResolver(
          styles,
          createThemeDependencyPlan([
            {path: ["accent"], tokens: [tokenNames[0]]},
            {path: ["space"], tokens: [tokenNames[1]]},
          ]),
        )
        const firstTheme = themeFromNames(tokenNames)
        const first = resolver.resolve(firstTheme)
        const secondTheme: ThemeSnapshot = {
          ...firstTheme,
          tokens: {...firstTheme.tokens, [tokenNames[0]]: "#7c3aed"},
        }
        const second = resolver.resolve(secondTheme)

        expect(second.metrics).toEqual({
          recomputations: 1,
          notifications: 1,
          changedTokens: [tokenNames[0]],
        })
        expect(second.value.accent).not.toBe(first.value.accent)
        expect(second.value.space).toBe(first.value.space)
        expect(second.value.staticStyle).toBe(first.value.staticStyle)
      }),
      {numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED},
    )
  })
})

function resolveUncached(style: StyleEntry, theme: ThemeSnapshot): unknown {
  const flattened = flattenEntries(style)
  if (flattened.length === 0) return undefined
  const output: Record<string, unknown> = {}
  for (const entry of flattened) {
    for (const [key, value] of Object.entries(entry)) {
      output[key] = isThemeToken(value) ? theme.tokens[value.varName] : value
    }
  }
  return output
}

function flattenEntries(style: StyleEntry): ReadonlyArray<Record<string, unknown>> {
  if (style === false || style === null || style === undefined) return []
  if (Array.isArray(style)) return (style as ReadonlyArray<StyleEntry>).flatMap(flattenEntries)
  return [style as Record<string, unknown>]
}

function tokenNamesFromStyle(style: Record<string, unknown>): ReadonlyArray<string> {
  return Object.values(style).flatMap((value) => isThemeToken(value) ? [value.varName] : [])
}

function isThemeToken(value: unknown): value is {readonly varName: string} {
  return typeof value === "object" && value !== null &&
    (value as {readonly $$type?: unknown}).$$type === "crumbs.css.theme-token" &&
    typeof (value as {readonly varName?: unknown}).varName === "string"
}

function themeFromNames(names: ReadonlyArray<string>): ThemeSnapshot {
  return {
    contract: {},
    values: {},
    tokens: Object.fromEntries(names.map((name, index) => [name, tokenValue(index)])),
  }
}

function tokenValue(index: number): string | number {
  return index % 2 === 0 ? `value-${index}` : index * 8
}
