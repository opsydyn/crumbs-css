import { describe, expect, it } from "bun:test"
import { createTokenThemeScopedSnapshot } from "@opsydyn/crumbs-css/tokens"
import {
  baseTheme,
  brandScopes,
  densityScopes,
  modeScopes,
  vars,
} from "../src/styles/theme"

describe("reference system theme axes", () => {
  it("composes brand, mode, and density without losing independent values", () => {
    const signalLightCompact = createTokenThemeScopedSnapshot(vars, baseTheme, {
      brand: brandScopes.signal,
      mode: modeScopes.light,
      density: densityScopes.compact,
    })

    expect(signalLightCompact.values.color.accent).toBe("#087f8c")
    expect(signalLightCompact.values.color.canvas).toBe("#f4ecdb")
    expect(signalLightCompact.values.control.height).toBe(40)
    expect(signalLightCompact.values.space.md).toBe(12)
  })

  it("keeps brand and density values when mode changes", () => {
    const signalDarkComfortable = createTokenThemeScopedSnapshot(vars, baseTheme, {
      brand: brandScopes.signal,
      mode: modeScopes.dark,
      density: densityScopes.comfortable,
    })

    expect(signalDarkComfortable.values.color.accent).toBe("#087f8c")
    expect(signalDarkComfortable.values.color.canvas).toBe("#0d0b09")
    expect(signalDarkComfortable.values.control.height).toBe(48)
    expect(signalDarkComfortable.values.space.md).toBe(16)
  })
})
