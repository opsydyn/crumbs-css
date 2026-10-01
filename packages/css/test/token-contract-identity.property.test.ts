import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  createTokenContract,
  createTokenTheme,
  defineAlias,
  defineToken,
  getTokenContractIdentity,
  getTokenContractKey,
  getTokenId,
} from "../src/tokens"
import { encodeTokenPath, tokenVariableName } from "../src/tokens/identity"
import { getThemeTokenVisibility } from "../src/theme-token"
import {
  isTokenThemeCompatible,
} from "../src/theme-runtime"

const baseIdentity = { owner: "@acme/tokens", name: "foundation", version: 1 } as const

function shape() {
  return {
    color: { accent: defineToken("color") },
    space: { md: defineToken({ kind: "length" }) },
    display: { mode: defineToken({ kind: "enum", values: ["flex", "none"] as const }) },
  } as const
}

describe("stable token contract identity", () => {
  it("derives deterministic IDs independent of evaluation order and hot reload", () => {
    const first = createTokenContract(shape(), baseIdentity)
    const reloaded = createTokenContract({
      display: { mode: defineToken({ kind: "enum", values: ["none", "flex"] as const }) },
      space: { md: defineToken({ kind: "length" }) },
      color: { accent: defineToken("color") },
    }, baseIdentity)

    expect(getTokenContractIdentity(first)).toEqual(baseIdentity)
    expect(getTokenContractKey(first)).toBe("@acme/tokens#foundation@1")
    expect(first.color.accent).toBe(reloaded.color.accent)
    expect(first.space.md).toBe(reloaded.space.md)
    expect(String(first.display.mode)).toBe(String(reloaded.display.mode))
    expect(getTokenId(first.color.accent)).toBe("@acme/tokens/foundation@1#5:color/6:accent")
    expect(getTokenId(first.space.md)).toBe("@acme/tokens/foundation@1#5:space/2:md")
  })

  it("publishes identity metadata through a duplicate-copy-safe global symbol", () => {
    const contract = createTokenContract({color: {accent: defineToken("color")}}, {
      owner: "@acme/tokens", name: "global-symbol", version: 1,
    })
    const descriptor = Object.getOwnPropertyDescriptor(
      contract,
      Symbol.for("crumbs.css.theme-contract-identity.v1"),
    )
    expect(descriptor?.enumerable).toBe(false)
    expect(descriptor?.value).toMatchObject({
      key: "@acme/tokens#global-symbol@1",
      identity: {owner: "@acme/tokens", name: "global-symbol", version: 1},
    })
  })

  it("separates identical paths owned by distinct contracts", () => {
    const foundation = createTokenContract({space: {md: defineToken({kind: "length"})}}, {
      owner: "@acme/tokens", name: "foundation-spacing", version: 1,
    })
    const component = createTokenContract({space: {md: defineToken({kind: "length"})}}, {
      owner: "@acme/tokens", name: "component", version: 1,
    })
    expect(foundation.space.md).not.toBe(component.space.md)
    expect(getTokenId(foundation.space.md)).not.toBe(getTokenId(component.space.md))

    const foundationTheme = createTokenTheme(foundation, {space: {md: 8}})
    const componentTheme = createTokenTheme(component, {space: {md: 8}})
    expect(Object.keys(foundationTheme.tokens)).not.toEqual(Object.keys(componentTheme.tokens))
    expect(isTokenThemeCompatible(foundation, foundationTheme)).toBe(true)
    expect(isTokenThemeCompatible(component, foundationTheme)).toBe(false)
  })

  it("rejects a reused identity when the contract shape changes", () => {
    const identity = {owner: "@acme/tokens", name: "semantic", version: 1} as const
    createTokenContract({color: {text: defineToken("color")}}, identity)
    expect(() => createTokenContract({color: {text: defineToken("color")}, space: {md: defineToken({kind: "length"})}}, identity))
      .toThrow(/CRUMBS_CSS_TOKEN_CONTRACT_IDENTITY_COLLISION/)
  })

  it("defaults identified contracts to public and gives aliases their terminal token visibility", () => {
    const visible = createTokenContract({
      color: {
        accent: defineToken("color"),
        internal: defineToken("color"),
      },
      semantic: {
        foreground: defineAlias("color.accent"),
        internal: defineAlias("color.internal"),
      },
    }, {
      identity: {owner: "@acme/tokens", name: "visibility", version: 1},
      visibility: {public: [["color", "accent"]]},
    })
    expect(getTokenId(visible.color.accent)).toBe("@acme/tokens/visibility@1#5:color/6:accent")
    expect(getTokenId(visible.semantic.foreground)).toBe("@acme/tokens/visibility@1#8:semantic/10:foreground")
    expect(getThemeTokenVisibility(visible.color.accent)).toBe("public")
    expect(getThemeTokenVisibility(visible.semantic.foreground)).toBe("public")
    expect(getThemeTokenVisibility(visible.color.internal)).toBe("private")
    expect(getThemeTokenVisibility(visible.semantic.internal)).toBe("private")

    const legacy = createTokenContract({color: {accent: defineToken("color")}}, {
      owner: "@acme/tokens", name: "visibility-default", version: 1,
    })
    expect(getThemeTokenVisibility(legacy.color.accent)).toBe("public")
    const defaultVisibilityIdentity = {owner: "@acme/tokens", name: "visibility-equivalence", version: 1} as const
    const defaultVisibilityShape = {color: {accent: defineToken("color")}}
    createTokenContract(defaultVisibilityShape, defaultVisibilityIdentity)
    expect(() => createTokenContract(defaultVisibilityShape, {
      identity: defaultVisibilityIdentity,
      visibility: {public: [["color", "accent"]]},
    })).not.toThrow()
  })

  it("requires visibility paths to be unique public definition-token paths", () => {
    const tokenShape = {
      color: {accent: defineToken("color")},
      semantic: {foreground: defineAlias("color.accent")},
    }
    const identity = {owner: "@acme/tokens", name: "visibility-paths", version: 1} as const
    expect(() => createTokenContract(tokenShape, {visibility: {public: [["color", "accent"]]}}))
      .toThrow(/identity/i)
    expect(() => createTokenContract(tokenShape, {
      identity,
      visibility: {public: [["color", "missing"]]},
    })).toThrow(/unknown|definition/i)
    expect(() => createTokenContract(tokenShape, {
      identity,
      visibility: {public: [["color", "accent"], ["color", "accent"]]},
    })).toThrow(/duplicate/i)
    expect(() => createTokenContract(tokenShape, {
      identity,
      visibility: {public: [["semantic", "foreground"]]},
    })).toThrow(/alias|definition/i)
    expect(() => createTokenContract(tokenShape, {
      identity,
      visibility: {public: [["color", ""]]},
    })).toThrow(/non-empty/i)
    expect(() => createTokenContract(tokenShape, {
      identity,
      visibility: {public: [[]]},
    })).toThrow(/non-empty/i)
    const sparsePath = ["color", "accent"]
    delete sparsePath[1]
    expect(() => createTokenContract(tokenShape, {
      identity,
      visibility: {public: [sparsePath]},
    })).toThrow(/non-empty/i)
  })

  it("treats a change to the public token set as an identity collision", () => {
    const identity = {owner: "@acme/tokens", name: "visibility-collision", version: 1} as const
    const tokenShape = {color: {
      accent: defineToken("color"),
      muted: defineToken("color"),
    }}
    createTokenContract(tokenShape, {identity, visibility: {public: [["color", "accent"]]}})
    expect(() => createTokenContract(tokenShape, {identity, visibility: {public: [["color", "muted"]]}}))
      .toThrow(/CRUMBS_CSS_TOKEN_CONTRACT_IDENTITY_COLLISION/)
  })

  it("canonicalizes visibility path order and rejects a different set for a reused identity", () => {
    let identityIndex = 0
    const pathOrders = [
      [["color", "accent"], ["color", "muted"]],
      [["color", "muted"], ["color", "accent"]],
    ] as const
    fc.assert(fc.property(fc.constantFrom(...pathOrders), publicPaths => {
      const identity = {
        owner: "@acme/tokens",
        name: `visibility-order-${identityIndex++}`,
        version: 1,
      } as const
      const tokenShape = {color: {
        accent: defineToken("color"),
        muted: defineToken("color"),
        internal: defineToken("color"),
      }}
      expect(() => createTokenContract(tokenShape, {identity, visibility: {public: publicPaths}})).not.toThrow()
      expect(() => createTokenContract(tokenShape, {
        identity,
        visibility: {public: [...publicPaths].reverse()},
      })).not.toThrow()
      expect(() => createTokenContract(tokenShape, {
        identity,
        visibility: {public: [["color", "accent"]]},
      })).toThrow(/CRUMBS_CSS_TOKEN_CONTRACT_IDENTITY_COLLISION/)
    }), {numRuns: 50, seed: 20260923})
  })

  it("keeps IDs collision-free for generated path and identity pairs", () => {
    fc.assert(fc.property(
      fc.stringMatching(/^[a-z][a-z0-9_-]{0,8}$/),
      fc.stringMatching(/^[a-z][a-z0-9_-]{0,8}$/),
      (ownerPart, namePart) => {
        const identity = {owner: `acme-${ownerPart}`, name: `contract-${namePart}`, version: 1} as const
        const contract = createTokenContract({space: {md: defineToken({kind: "length"})}}, identity)
        expect(getTokenId(contract.space.md)).toContain(`${identity.owner}/${identity.name}@1#`)
      },
    ), {numRuns: 25, seed: 20260930})
  })
})

describe("canonical token path encoding", () => {
  it("pins the readable length-prefixed format and keeps segment boundaries distinct", () => {
    expect(encodeTokenPath(["color", "accent"])).toBe("5:color/6:accent")
    expect(encodeTokenPath(["a/b"])).not.toBe(encodeTokenPath(["a", "b"]))
  })

  it("matches the reference encoding for generated Unicode paths", () => {
    fc.assert(fc.property(
      fc.array(fc.string({maxLength: 16}), {maxLength: 8}),
      path => expect(encodeTokenPath(path)).toBe(
        path.map(segment => `${segment.length}:${segment}`).join("/"),
      ),
    ), {numRuns: 120, seed: 20261001})
  })

  it("leaves token variable Unicode code-point encoding unchanged", () => {
    expect(tokenVariableName(
      {owner: "acme", name: "foundation", version: 1},
      ["😀"],
    )).toEndWith("-01f600")
  })
})
