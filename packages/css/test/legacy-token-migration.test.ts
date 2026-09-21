import {describe, expect, it} from "bun:test"
import {createTheme, createThemeContract, createThemeTokenReference, getThemeVarName} from "../src/native-style"
import {resolveThemeTokens} from "../src/theme-runtime"
import {createTokenContract, createTokenTheme, defineToken} from "../src/tokens"

describe("legacy token migration boundary", () => {
 it("keeps the legacy string-or-number theme contract available", () => {
  const contract = createThemeContract({legacy: {label: null, size: null}})
  const theme = createTheme(contract, {legacy: {label: "legacy-value", size: -4}})

  expect(theme.values).toEqual({legacy: {label: "legacy-value", size: -4}})
  expect(theme.tokens).toEqual({
   "--crumbs-legacy-label": "legacy-value",
   "--crumbs-legacy-size": -4,
  })
 })

 it("allows an old token reference to resolve through its legacy theme", () => {
  const contract = createThemeContract({legacy: {label: null}})
  const theme = createTheme(contract, {legacy: {label: "legacy-value"}})

  expect(resolveThemeTokens({color: createThemeTokenReference(getThemeVarName(contract.legacy.label))}, theme)).toEqual({
   color: "legacy-value",
  })
 })

 it("rejects an old token reference before it can bind to an identified theme", () => {
  const legacy = createThemeContract({color: {accent: null}})
  const contract = createTokenContract({color: {accent: defineToken("color")}}, {
   identity: {owner: "@acme/migration", name: "theme", version: 1},
  })
  const theme = createTokenTheme(contract, {color: {accent: "#2463eb"}})

  expect(() => resolveThemeTokens({color: createThemeTokenReference(getThemeVarName(legacy.color.accent))}, theme)).toThrow(
   /CRUMBS_CSS_TOKEN_THEME_TOKEN_CONTRACT_MISMATCH/,
  )
 })

 it("rejects a foreign token leaf when an identified contract is reused", () => {
  const legacy = createThemeContract({color: {accent: null}})
  const contract = createTokenContract({color: {accent: defineToken("color")}}, {
   identity: {owner: "@acme/migration", name: "mutated", version: 1},
  }) as {color: {accent: unknown}}
  contract.color.accent = legacy.color.accent

  expect(() => createTheme(contract, {color: {accent: "#2463eb"}} as never)).toThrow(
   /CRUMBS_CSS_TOKEN_THEME_TOKEN_CONTRACT_MISMATCH/,
  )
 })
})
