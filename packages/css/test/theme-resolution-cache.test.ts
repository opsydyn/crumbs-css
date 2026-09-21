import {describe, expect, it} from "bun:test"
import fc from "fast-check"
import {createThemeTokenReference, resolveThemeStyles, resolveThemeTokens} from "../src/theme-runtime"

const theme = {
 contract: {},
 values: {},
 tokens: {"--crumbs-color-accent": "#2463eb"},
}

describe("native theme resolution cache", () => {
 it("retains the original reference for static object styles", () => {
  const style = Object.freeze({opacity: 0.5, transform: [{scale: 1.1}]})

  expect(resolveThemeTokens(style, theme)).toBe(style)
  expect(resolveThemeTokens(style, theme)).toBe(style)
 })

 it("shares tokenized output only within the same immutable theme snapshot", () => {
  const style = {color: createThemeTokenReference("--crumbs-color-accent"), opacity: 0.5}
  const first = resolveThemeTokens(style, theme) as unknown
  const second = resolveThemeTokens(style, theme) as unknown

  expect(first).toEqual({color: "#2463eb", opacity: 0.5})
  expect(second).toBe(first)

  const otherTheme = {
   ...theme,
   tokens: {"--crumbs-color-accent": "#7c3aed"},
  }
  const other = resolveThemeTokens(style, otherTheme) as unknown
  expect(other).toEqual({color: "#7c3aed", opacity: 0.5})
  expect(other).not.toBe(first)
 })

 it("caches flattened compositions without returning the input array", () => {
  const style = [{opacity: 0.5}, [false, {opacity: 1}]] as const

  const first = resolveThemeTokens(style, theme)
  expect(first).toEqual({opacity: 1})
  expect(first).not.toBe(style)
  expect(resolveThemeTokens(style, theme)).toBe(first)
 })

 it("shares unchanged entries and the complete map within one snapshot", () => {
  const staticStyle = Object.freeze({opacity: 0.5})
  const tokenizedStyle = {color: createThemeTokenReference("--crumbs-color-accent")}
  const styles = {staticStyle, tokenizedStyle}

  const first = resolveThemeStyles(styles as Record<string, unknown>, theme) as Record<string, unknown>
  expect(first).not.toBe(styles)
  expect(first.staticStyle).toBe(staticStyle)
  expect(first.tokenizedStyle).toEqual({color: "#2463eb"})
  expect(resolveThemeStyles(styles as Record<string, unknown>, theme) as unknown).toBe(first)

  const staticMap = {staticStyle}
  expect(resolveThemeStyles(staticMap as Record<string, unknown>, theme)).toBe(staticMap)
 })

 it("shares repeated recipe resolution without changing recipe semantics", () => {
  const recipe = {
   $$type: "crumbs.css.recipe" as const,
   base: {color: createThemeTokenReference("--crumbs-color-accent")},
   compoundVariants: [],
   defaultVariants: {tone: "primary"},
   variants: {
    tone: {
     primary: {opacity: 0.9},
    },
   },
  }
  const styles = {first: recipe, second: recipe}

  const resolved = resolveThemeStyles(styles as Record<string, unknown>, theme) as Record<string, unknown>
  expect(resolved.first).toEqual({
   $$type: "crumbs.css.recipe",
   base: {color: "#2463eb"},
   compoundVariants: [],
   defaultVariants: {tone: "primary"},
   variants: {tone: {primary: {opacity: 0.9}}},
  })
  expect(resolved.second).toBe(resolved.first)
  expect(resolveThemeStyles(styles as Record<string, unknown>, theme) as unknown).toBe(resolved)
 })

 it("preserves cache identity for generated literal and token styles", () => {
  fc.assert(fc.property(
   fc.record({
    opacity: fc.double({min: 0, max: 1, noNaN: true, noDefaultInfinity: true}),
    token: fc.boolean(),
   }),
   ({opacity, token}) => {
    const style = {
     opacity,
     color: token ? createThemeTokenReference("--crumbs-color-accent") : "#fff",
    }
    const first = resolveThemeTokens(style, theme)
    const second = resolveThemeTokens(style, theme)
    expect(second).toBe(first)
    if (!token) expect(first).toBe(style)
   },
  ), {numRuns: 100, seed: 20260921})
 })
})
