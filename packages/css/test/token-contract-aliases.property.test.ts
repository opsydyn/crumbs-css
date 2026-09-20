import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  alias,
  createTokenContract,
  createTokenTheme,
  defineAlias,
  defineToken,
  getTokenId,
  getTokenOrigin,
} from "../src/tokens"

const identity = {owner: "@acme/tokens", name: "layers", version: 1} as const

describe("layered token aliases", () => {
  it("derives semantic and component values while retaining a traceable origin", () => {
    const vars = createTokenContract({
      foundation: {
        color: { blue500: defineToken("color") },
        space: { md: defineToken("length") },
      },
      semantic: {
        accent: defineAlias("foundation.color.blue500"),
        controlGap: alias(["foundation", "space", "md"]),
      },
      component: {
        button: { background: defineAlias("semantic.accent") },
      },
    }, identity)

    const theme = createTokenTheme(vars, {
      foundation: {color: {blue500: "#2463eb"}, space: {md: 8}},
    })

    expect(theme.values.semantic.accent).toBe("#2463eb")
    expect(theme.values.semantic.controlGap).toBe(8)
    expect(theme.values.component.button.background).toBe("#2463eb")
    expect(theme.tokens[String(vars.semantic.accent).slice(4, -1)]).toBe("#2463eb")
    expect(getTokenId(vars.component.button.background))
      .toBe("@acme/tokens/layers@1#9:component/6:button/10:background")

    expect(getTokenOrigin(vars.component.button.background)).toMatchObject({
      kind: "alias",
      path: ["component", "button", "background"],
      targetPath: ["semantic", "accent"],
      chain: [
        {path: ["component", "button", "background"]},
        {path: ["semantic", "accent"]},
        {path: ["foundation", "color", "blue500"]},
      ],
    })
  })

  it("allows only an explicit, domain-checked fallback for a missing target", () => {
    const vars = createTokenContract({
      semantic: {
        accent: defineAlias("foundation.color.missing", {domain: "color", fallback: "#7c3aed"}),
      },
    }, {...identity, name: "layers-fallback"})
    const theme = createTokenTheme(vars, {semantic: {}})
    expect(theme.values.semantic.accent).toBe("#7c3aed")
    expect(getTokenOrigin(vars.semantic.accent)).toMatchObject({
      targetPath: ["foundation", "color", "missing"],
      fallback: "#7c3aed",
      chain: [{path: ["semantic", "accent"]}],
    })
  })

  it("rejects missing targets, wrong domains, bad fallbacks and cycles", () => {
    expect(() => createTokenContract({
      semantic: {accent: defineAlias("foundation.color.missing")},
    }, identity)).toThrow(/CRUMBS_CSS_TOKEN_ALIAS_MISSING_TARGET/)

    expect(() => createTokenContract({
      foundation: {accent: defineToken("color")},
      semantic: {gap: defineAlias("foundation.accent", {domain: "length"} as never)},
    }, identity)).toThrow(/CRUMBS_CSS_TOKEN_ALIAS_DOMAIN_MISMATCH/)

    expect(() => createTokenContract({
      semantic: {gap: defineAlias("foundation.missing", {domain: "length", fallback: "#fff"} as never)},
    }, identity)).toThrow(/CRUMBS_CSS_TOKEN_ALIAS_FALLBACK_DOMAIN_MISMATCH/)

    expect(() => createTokenContract({
      semantic: {
        first: defineAlias("semantic.second"),
        second: defineAlias("semantic.first"),
      },
    }, identity)).toThrow(/CRUMBS_CSS_TOKEN_ALIAS_CYCLE/)
  })

  it("keeps generated path pairs deterministic across evaluation order", () => {
    fc.assert(fc.property(
      fc.stringMatching(/^[a-z][a-z0-9_-]{0,8}$/),
      fc.stringMatching(/^[a-z][a-z0-9_-]{0,8}$/),
      (first, second) => {
        const one = createTokenContract({
          foundation: { [first]: defineToken("color") },
          semantic: { accent: defineAlias("foundation." + first) },
        }, {owner: "@acme/tokens", name: "generated-" + first + "-" + second, version: 1})
        const two = createTokenContract({
          semantic: { accent: defineAlias(["foundation", first]) },
          foundation: { [first]: defineToken("color") },
        }, {owner: "@acme/tokens", name: "generated-" + first + "-" + second, version: 1})
        expect(one.semantic.accent).toBe(two.semantic.accent)
        expect(getTokenId(one.semantic.accent)).toContain("semantic")
      },
    ), {numRuns: 25, seed: 20260931})
  })
})
