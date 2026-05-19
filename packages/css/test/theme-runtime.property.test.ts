import { describe, expect, it } from "bun:test"
import type { NativeTheme, NativeThemeValue } from "@opsydyn/crumbs-css/style"
import {
  createThemeTokenReference,
  type NativeThemeTokenReference,
  resolveThemeTokens,
} from "@opsydyn/crumbs-css/theme"
import fc from "fast-check"

type StyleEntry = false | null | Record<string, unknown> | ReadonlyArray<StyleEntry> | undefined
type StyleCase = {
  readonly activeTokenNames: ReadonlyArray<string>
  readonly expected: Record<string, unknown>
  readonly style: StyleEntry
  readonly theme: NativeTheme<Record<string, unknown>>
}

const PROPERTY_RUNS = 100
const PROPERTY_SEED = 20260511

const stylePropArbitrary = fc.constantFrom("backgroundColor", "color", "opacity", "padding")
const tokenNameArbitrary = fc.constantFrom(
  "--crumbs-color-accent",
  "--crumbs-color-canvas",
  "--crumbs-space-md",
)
const primitiveValueArbitrary = fc.oneof(
  fc.integer({ max: 100, min: 0 }),
  fc.constantFrom("#000000", "#ffffff", "transparent"),
)
const tokenReferenceArbitrary = tokenNameArbitrary.map(createThemeTokenReference)
const styleValueArbitrary = fc.oneof(primitiveValueArbitrary, tokenReferenceArbitrary)
const styleObjectArbitrary = fc
  .array(fc.tuple(stylePropArbitrary, styleValueArbitrary), { maxLength: 4, minLength: 1 })
  .map((entries) => Object.fromEntries(entries))
const styleEntryArbitrary: fc.Arbitrary<StyleEntry> = fc.letrec<{
  readonly entry: StyleEntry
}>((tie) => ({
  entry: fc.oneof(
    fc.constant(null),
    fc.constant(undefined),
    fc.constant(false),
    styleObjectArbitrary,
    fc.array(tie("entry"), { maxLength: 3, minLength: 0 }),
  ),
})).entry

const styleCaseArbitrary = styleEntryArbitrary.map(styleCaseFromEntry)

describe("native theme runtime properties", () => {
  it("flattens style arrays and resolves native theme tokens deterministically", () => {
    fc.assert(
      fc.property(styleCaseArbitrary, ({ expected, style, theme }) => {
        expect(resolveThemeTokens(style, theme)).toEqual(
          Object.keys(expected).length === 0 ? undefined : expected,
        )
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })

  it("throws when a generated token reference is missing from the active theme", () => {
    fc.assert(
      fc.property(tokenNameArbitrary, (tokenName) => {
        const style = { color: createThemeTokenReference(tokenName) }
        const theme = nativeThemeFromTokens({})

        expect(() => resolveThemeTokens(style, theme)).toThrow(tokenName)
      }),
      { numRuns: PROPERTY_RUNS, seed: PROPERTY_SEED },
    )
  })
})

function styleCaseFromEntry(style: StyleEntry): StyleCase {
  const activeTokenNames = activeTokenNamesFromStyle(style)
  const theme = nativeThemeFromTokens(tokensFromNames(activeTokenNames))
  return {
    activeTokenNames,
    expected: expectedStyleFromEntry(style, theme),
    style,
    theme,
  }
}

function activeTokenNamesFromStyle(style: StyleEntry): ReadonlyArray<string> {
  return Array.from(new Set(flattenStyleEntries(style).flatMap(tokenNamesFromStyleObject)))
}

function tokenNamesFromStyleObject(style: Record<string, unknown>): ReadonlyArray<string> {
  return Object.values(style).flatMap((value) =>
    isNativeThemeTokenReference(value) ? [value.varName] : [],
  )
}

function tokensFromNames(names: ReadonlyArray<string>): Record<string, NativeThemeValue> {
  return Object.fromEntries(names.map((name, index) => [name, themeValueForIndex(index)]))
}

function expectedStyleFromEntry(
  style: StyleEntry,
  theme: NativeTheme<Record<string, unknown>>,
): Record<string, unknown> {
  const resolvedEntries = flattenStyleEntries(style).map((entry) =>
    Object.fromEntries(
      Object.entries(entry).map(([key, value]) => [
        key,
        isNativeThemeTokenReference(value) ? theme.tokens[value.varName] : value,
      ]),
    ),
  )
  return Object.assign({}, ...resolvedEntries) as Record<string, unknown>
}

function flattenStyleEntries(style: StyleEntry): ReadonlyArray<Record<string, unknown>> {
  if (style === false || style === null || style === undefined) return []
  if (Array.isArray(style)) return style.flatMap(flattenStyleEntries)
  return [style as Record<string, unknown>]
}

function nativeThemeFromTokens(
  tokens: Readonly<Record<string, NativeThemeValue>>,
): NativeTheme<Record<string, unknown>> {
  return {
    contract: {},
    tokens,
    values: {},
  }
}

function themeValueForIndex(index: number): NativeThemeValue {
  return index % 2 === 0 ? `#${String(index).padStart(6, "0")}` : index
}

function isNativeThemeTokenReference(value: unknown): value is NativeThemeTokenReference {
  return (
    typeof value === "object" &&
    value !== null &&
    "$$type" in value &&
    value.$$type === "crumbs.css.theme-token" &&
    "varName" in value &&
    typeof value.varName === "string"
  )
}
