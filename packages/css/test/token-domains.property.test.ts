import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  createTokenContract,
  createTokenTheme,
  defineToken,
  isTokenDefinition,
  isTokenDomainValue,
  type TokenThemeValues,
} from "../src/tokens"
import { decodeTokenValue } from "../src/tokens/schema"
import { createTheme, createThemeContract, getThemeTokenPath, getThemeVarName, isThemeVar } from "../src/native-style"

const runs = 100
const seed = 20260920

const vars = createTokenContract({
  color: { accent: defineToken("color") },
  space: { md: defineToken({ kind: "length" }) },
  motion: { fast: defineToken("duration") },
  alpha: { muted: defineToken("opacity") },
  display: { mode: defineToken({ kind: "enum", values: ["flex", "none"] as const }) },
})

type Values = TokenThemeValues<typeof vars>

describe("domain-safe token contracts", () => {
  it("keeps token definitions inspectable and domain-branded", () => {
    const definition = defineToken({ kind: "length", allowNegative: true })
    expect(isTokenDefinition(definition)).toBe(true)
    expect(definition).toEqual({
      $$type: "crumbs.css.token-definition",
      domain: { kind: "length", allowNegative: true },
    })
    expect(Object.isFrozen(definition)).toBe(true)
    expect(Object.isFrozen(definition.domain)).toBe(true)
  })

  it("creates native-compatible references with stable paths", () => {
    expect(String(vars.color.accent)).toBe("var(--crumbs-color-accent)")
    expect(isThemeVar(vars.color.accent)).toBe(true)
    expect(getThemeVarName(vars.color.accent)).toBe("--crumbs-color-accent")
    expect(getThemeTokenPath(vars.space.md)).toEqual(["space", "md"])
  })

  it("accepts generated values across all built-in domains", () => {
    const color = fc.string({ minLength: 1, maxLength: 12 })
    const length = fc.oneof(
      fc.double({ noNaN: true, noDefaultInfinity: true, min: 0, max: 10000 }),
      fc.integer({ min: 0, max: 100 }).map(value => `${value}%` as const),
      fc.constant("auto" as const),
    )
    const duration = fc.double({ noNaN: true, noDefaultInfinity: true, min: 0, max: 100000 })
    const opacity = fc.double({ noNaN: true, noDefaultInfinity: true, min: 0, max: 1 })
    const display = fc.constantFrom("flex" as const, "none" as const)

    fc.assert(fc.property(color, length, duration, opacity, display, (color, length, duration, opacity, display) => {
      const values: Values = {
        color: { accent: color },
        space: { md: length },
        motion: { fast: duration },
        alpha: { muted: opacity },
        display: { mode: display },
      }
      const theme = createTokenTheme(vars, values)
      expect(theme.tokens["--crumbs-color-accent"]).toBe(color)
      expect(theme.tokens["--crumbs-space-md"]).toBe(length)
      expect(theme.tokens["--crumbs-motion-fast"]).toBe(duration)
      expect(theme.tokens["--crumbs-alpha-muted"]).toBe(opacity)
      expect(theme.tokens["--crumbs-display-mode"]).toBe(display)
    }), { numRuns: runs, seed })
  })

  it("rejects cross-domain and out-of-range values at the schema boundary", () => {
    const cases: ReadonlyArray<readonly [unknown, string]> = [
      ["red", "length"],
      ["12px", "length"],
      ["-4%", "length"],
      [-1, "duration"],
      [Infinity, "duration"],
      [1.01, "opacity"],
      [-0.01, "opacity"],
      ["block", "enum"],
      ["", "color"],
    ]

    for (const [value, kind] of cases) {
      expect(() => decodeTokenValue({ kind: kind as never } as never, value)).toThrow()
    }
    expect(() => createTokenTheme(vars, {
      color: { accent: 123 },
      space: { md: "red" },
      motion: { fast: -1 },
      alpha: { muted: 2 },
      display: { mode: "block" },
    } as never)).toThrow()
  })

  it("scopes domain validation to the owning contract and preserves the legacy path", () => {
    const legacy = createThemeContract({ space: { md: null } })
    const domain = createTokenContract({ space: { md: defineToken({ kind: "length" }) } })
    expect(createTheme(legacy, { space: { md: "legacy-string" } }).tokens["--crumbs-space-md"]).toBe("legacy-string")
    expect(() => createTokenTheme(domain, { space: { md: "legacy-string" } } as never)).toThrow()
  })

  it("keeps the service-free runtime predicate aligned with the Effect schema", () => {
    const domains = [
      { kind: "color" } as const,
      { kind: "length", allowNegative: false } as const,
      { kind: "length", allowNegative: true } as const,
      { kind: "duration" } as const,
      { kind: "opacity" } as const,
      { kind: "enum", values: ["flex", "none"] } as const,
    ]
    const values: ReadonlyArray<unknown> = ["#fff", "red", 0, 4, "25%", "-4%", "auto", "flex", "block", "", -1, 0.5, 1.5, Infinity, NaN]
    for (const domain of domains) {
      for (const value of values) {
        const predicate = requireDomainPredicate(domain, value)
        const schema = (() => {
          try {
            decodeTokenValue(domain, value)
            return true
          } catch {
            return false
          }
        })()
        expect(predicate).toBe(schema)
      }
    }
  })

  it("preserves the previous input when generated values are invalid", () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.constantFrom<unknown>("red", "12px", ""),
        fc.double({ noNaN: true, noDefaultInfinity: true, min: -100, max: -0.001 }),
        fc.constantFrom<unknown>(-1, 2, Infinity, NaN),
      ),
      invalid => {
        expect(() => decodeTokenValue({ kind: "opacity" }, invalid)).toThrow()
      },
    ), { numRuns: runs, seed: seed + 1 })
  })
})

function requireDomainPredicate(domain: Parameters<typeof decodeTokenValue>[0], value: unknown): boolean {
  return isTokenDomainValue(domain, value)
}
