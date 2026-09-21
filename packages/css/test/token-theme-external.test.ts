import { describe, expect, it } from "bun:test"
import {
  decodeExternalTokenTheme,
  encodeExternalTokenTheme,
} from "../src/tokens/schema"
import {
  createTokenContract,
  createTokenThemeFromExternalPayload,
  defineAlias,
  defineToken,
  getTokenId,
} from "../src/tokens"

const vars = createTokenContract({
  color: {
    accent: defineToken("color"),
    canvas: defineToken("color"),
  },
  space: {md: defineToken("length")},
  semantic: {foreground: defineAlias("color.accent")},
}, {owner: "@acme/tokens", name: "external", version: 1})

const identity = {owner: "@acme/tokens", name: "external", version: 1} as const

function payload() {
  return {
    _tag: "CrumbsTokenTheme" as const,
    version: 1 as const,
    contract: identity,
    values: {
      [getTokenId(vars.color.accent)]: "#2463eb",
      [getTokenId(vars.color.canvas)]: "#ffffff",
      [getTokenId(vars.space.md)]: 8,
    },
  }
}

describe("external token theme ingress", () => {
  it("decodes and re-encodes the exact versioned payload", () => {
    const input = payload()
    const decoded = decodeExternalTokenTheme(input)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value).toEqual(input)
    const encoded = encodeExternalTokenTheme(decoded.value)
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return
    expect(JSON.parse(encoded.value)).toEqual(input)
  })

  it("validates decoded IDs and domains before constructing a theme", () => {
    const decoded = decodeExternalTokenTheme(payload())
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    const result = createTokenThemeFromExternalPayload(vars, decoded.value)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme.values).toEqual({
      color: {accent: "#2463eb", canvas: "#ffffff"},
      space: {md: 8},
      semantic: {foreground: "#2463eb"},
    })
  })

  it("rejects unknown, missing, wrong-contract and invalid-domain payloads", () => {
    const input = payload()
    const unknown = createTokenThemeFromExternalPayload(vars, {
      ...input,
      values: {...input.values, "@acme/tokens/external@1#7:unknown": "#fff"},
    })
    const missing = createTokenThemeFromExternalPayload(vars, {
      ...input,
      values: {[getTokenId(vars.color.accent)]: "#2463eb"},
    })
    const wrongContract = createTokenThemeFromExternalPayload(vars, {
      ...input,
      contract: {...identity, version: 2},
    })
    const wrongDomain = createTokenThemeFromExternalPayload(vars, {
      ...input,
      values: {...input.values, [getTokenId(vars.space.md)]: "compact"},
    })

    expect(unknown.ok).toBe(false)
    expect(missing.ok).toBe(false)
    expect(wrongContract.ok).toBe(false)
    expect(wrongDomain.ok).toBe(false)
    if (!unknown.ok) expect(unknown.error.code).toBe("CRUMBS_CSS_TOKEN_THEME_EXTERNAL_TOKEN_MISMATCH")
    if (!wrongContract.ok) expect(wrongContract.error.code).toBe("CRUMBS_CSS_TOKEN_THEME_EXTERNAL_CONTRACT_MISMATCH")
    if (!wrongDomain.ok) expect(wrongDomain.error.code).toBe("CRUMBS_CSS_TOKEN_THEME_EXTERNAL_TOKEN_MISMATCH")
  })

  it("rejects malformed external payloads with structured codec issues", () => {
    const invalid = decodeExternalTokenTheme({...payload(), version: 2})
    const extra = decodeExternalTokenTheme({...payload(), unexpected: true})
    const nonFinite = decodeExternalTokenTheme({...payload(), values: {...payload().values, [getTokenId(vars.space.md)]: Infinity}})
    expect(invalid.ok).toBe(false)
    expect(extra.ok).toBe(false)
    expect(nonFinite.ok).toBe(false)
    if (!invalid.ok) expect(invalid.issues[0]?.boundary).toBe("external-token-theme")
  })
})
