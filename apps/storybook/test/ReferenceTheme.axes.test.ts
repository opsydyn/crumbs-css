import { describe, expect, it } from "bun:test"
import { createTokenThemeScopedSnapshot } from "@opsydyn/crumbs-css/tokens"
import {
  baseTheme,
  brandScopes,
  densityScopes,
  modeScopeFor,
  vars,
} from "../src/styles/theme"

describe("reference system theme axes", () => {
  it("composes brand, mode, and density without losing independent values", () => {
    const signalLightCompact = createTokenThemeScopedSnapshot(vars, baseTheme, {
      brand: brandScopes.signal,
      mode: modeScopeFor("signal", "light"),
      density: densityScopes.compact,
    })

    expect(signalLightCompact.values.color.accent).toBe("#077580")
    expect(signalLightCompact.values.color.canvas).toBe("#f4ecdb")
    expect(signalLightCompact.values.control.height).toBe(40)
    expect(signalLightCompact.values.space.md).toBe(12)
  })

  it("keeps brand and density values when mode changes", () => {
    const signalDarkComfortable = createTokenThemeScopedSnapshot(vars, baseTheme, {
      brand: brandScopes.signal,
      mode: modeScopeFor("signal", "dark"),
      density: densityScopes.comfortable,
    })

    expect(signalDarkComfortable.values.color.accent).toBe("#15a3b0")
    expect(signalDarkComfortable.values.color.canvas).toBe("#0d0b09")
    expect(signalDarkComfortable.values.control.height).toBe(48)
    expect(signalDarkComfortable.values.space.md).toBe(16)
  })

  it("selects a readable Foundry accent for the light surface", () => {
    const foundryLight = createTokenThemeScopedSnapshot(vars, baseTheme, {
      brand: brandScopes.foundry,
      mode: modeScopeFor("foundry", "light"),
      density: densityScopes.comfortable,
    })

    expect(foundryLight.values.color.accent).toBe("#905f00")
    expect(foundryLight.values.color.accentText).toBe("#ffffff")
  })

  it("uses the native more-contrast palette across both brand and mode axes", () => {
    const signalLightMore = createTokenThemeScopedSnapshot(vars, baseTheme, {
      brand: brandScopes.signal,
      mode: modeScopeFor("signal", "light", "more"),
      density: densityScopes.comfortable,
    })

    expect(signalLightMore.values.color.copy).toBe("#ffffff")
    expect(signalLightMore.values.color.canvas).toBe("#000000")
    expect(signalLightMore.values.color.accent).toBe("#ffff00")
  })
})
