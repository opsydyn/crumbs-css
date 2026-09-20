import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  createTokenContract,
  createTokenTheme,
  defineToken,
  getTokenContractIdentity,
  getTokenContractKey,
  getTokenId,
} from "../src/tokens"
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
