import { describe, expect, it } from "bun:test"
import { endFileScope, setFileScope } from "@vanilla-extract/css/fileScope"
import { componentRecipe } from "../src/native-style"
import { createTokenContract, createTokenTheme, defineAlias, defineToken, getTokenId } from "../src/tokens"
import { assembleManifest } from "../src/tooling/manifest/assemble"
import { projectComponentRecipe, projectTokenContract } from "../src/tooling/manifest/contracts"

const packageIdentity = { name: "@acme/design-system", version: "1.2.3" } as const
const producer = {
  compiler: { name: "@opsydyn/crumbs-css", version: "1.2.3" },
  artifact: { name: "crumbs-native-style-artifact", version: 1 },
} as const
const tokenOrigin = { path: "src/tokens/foundation.css.ts", exportPath: "foundationTokens" } as const
const componentOrigin = { path: "src/components/Button.css.ts", exportPath: "Button" } as const

function makeTokenContract(name = "manifestTokens") {
  return createTokenContract({
    foundation: {
      color: {
        canvas: defineToken("color"),
        internal: defineToken("color"),
      },
      space: { small: defineToken({ kind: "length" }) },
    },
    semantic: {
      surface: defineAlias("foundation.color.canvas"),
      remote: defineAlias("legacy.palette.surface", { domain: "color", fallback: "#ffffff" }),
    },
  }, {
    identity: { owner: "@acme/tokens", name, version: 1 },
    visibility: { public: [["foundation", "color", "canvas"], ["foundation", "space", "small"]] },
  })
}

function inFileScope<T>(name: string, run: () => T): T {
  setFileScope(`src/components/${name}.css.ts`, "@crumbs/manifest-test")
  try { return run() } finally { endFileScope() }
}

function makeComponentRecipe(name = "Button", owner = "@acme/ui") {
  return inFileScope(name, () => componentRecipe({
    contract: {
      identity: { owner, name, version: 1 },
      public: {
        slots: ["root", "label"],
        variants: { status: ["ready", "loading"], tone: ["primary", "quiet"] },
      },
      extensionPoints: {
        defaults: ["tone"],
        variantValues: ["tone"],
        compoundVariants: true,
        slotStyles: ["root"],
      },
    },
    slots: { root: "view", label: "text", internalIcon: "image" } as const,
    variants: {
      status: { ready: { root: { opacity: 1 } }, loading: { root: { opacity: 0.5 } } },
      tone: { primary: { root: { opacity: 1 } }, quiet: { root: { opacity: 0.8 } }, dangerInternal: { root: { opacity: 0.2 } } },
      density: { compact: { internalIcon: { width: 12 } }, roomy: { internalIcon: { width: 16 } } },
    },
    defaultVariants: { status: "ready", tone: "primary", density: "compact" },
    stateVariants: {
      status: {
        ready: { tone: ["primary", "quiet"] },
        loading: { tone: ["primary"] },
      },
    },
  }, name))
}

function assemble(overrides: Partial<Parameters<typeof assembleManifest>[0]> = {}) {
  return assembleManifest({
    package: packageIdentity,
    producer,
    tokenContracts: [{ contract: makeTokenContract("assemblyTokens"), origin: tokenOrigin }],
    componentRecipes: [{ recipe: makeComponentRecipe("AssemblyButton"), origin: componentOrigin }],
    ...overrides,
  })
}

describe("manifest contract adapters", () => {
  it("projects stable token IDs, domain, visibility, aliases, fallback and source origin without theme values", () => {
    const contract = makeTokenContract("projectionTokens")
    const records = projectTokenContract(contract, tokenOrigin)
    const theme = createTokenTheme(contract, {
      foundation: { color: { canvas: "#123456", internal: "#abcdef" }, space: { small: 4 } },
    })
    const canvas = records.find(record => record.path.join(".") === "foundation.color.canvas")!
    const hidden = records.find(record => record.path.join(".") === "foundation.color.internal")!
    const surface = records.find(record => record.path.join(".") === "semantic.surface")!
    const remote = records.find(record => record.path.join(".") === "semantic.remote")!

    expect(canvas).toMatchObject({
      id: getTokenId(contract.foundation.color.canvas),
      contract: { owner: "@acme/tokens", name: "projectionTokens", version: 1 },
      domain: { kind: "color" },
      visibility: "public",
      origin: tokenOrigin,
      kind: "definition",
    })
    expect(hidden.visibility).toBe("private")
    expect(surface).toMatchObject({
      kind: "alias",
      alias: {
        targetId: getTokenId(contract.foundation.color.canvas),
        targetPath: ["foundation", "color", "canvas"],
        resolution: "internal",
      },
    })
    expect(remote).toMatchObject({
      kind: "alias",
      alias: { targetPath: ["legacy", "palette", "surface"], resolution: "unresolved", fallback: "#ffffff" },
    })
    expect(JSON.stringify(records)).toContain("#ffffff")
    expect(JSON.stringify(records)).not.toContain(theme.values.foundation.color.canvas)
    expect(JSON.stringify(records)).not.toContain(theme.values.foundation.color.internal)
    expect(records.every(record => !Object.hasOwn(record, "resolvedValue"))).toBe(true)
  })

  it("projects only declared public component surfaces, defaults, extension points and state constraints", () => {
    const record = projectComponentRecipe(makeComponentRecipe("ProjectedButton"), componentOrigin)
    expect(record).toMatchObject({
      id: "@acme/ui#ProjectedButton@1",
      contract: { owner: "@acme/ui", name: "ProjectedButton", version: 1 },
      origin: componentOrigin,
      slots: ["label", "root"],
      variants: { status: ["loading", "ready"], tone: ["primary", "quiet"] },
      extensionPoints: ["compoundVariants", "defaults:tone", "slotStyles:root", "variantValues:tone"],
      defaults: { status: "ready", tone: "primary" },
      stateConstraints: [
        { discriminator: "status", case: "loading", axes: { tone: ["primary"] } },
        { discriminator: "status", case: "ready", axes: { tone: ["primary", "quiet"] } },
      ],
    })
    expect(JSON.stringify(record)).not.toContain("internalIcon")
    expect(JSON.stringify(record)).not.toContain("dangerInternal")
    expect(JSON.stringify(record)).not.toContain("density")
  })

  it("assembles explicit roots, alias dependencies, lifecycle data and explicit unresolved references", () => {
    const contract = makeTokenContract("assemblyTokens")
    const canvasId = getTokenId(contract.foundation.color.canvas)
    const manifest = assembleManifest({
      package: packageIdentity,
      producer,
      tokenContracts: [{ contract, origin: tokenOrigin }],
      componentRecipes: [{ recipe: makeComponentRecipe("AssemblyButton"), origin: componentOrigin }],
      lifecycleAnnotations: [{
        entityId: canvasId,
        deprecatedSince: "2.0.0",
        reason: "Use the semantic surface token.",
        replacement: { id: "@acme/tokens/semantic@1#7:surface", resolution: "external" },
      }],
      unresolvedReferences: [{ reference: "legacy:--crumbs-old-surface", reason: "The legacy token has no stable contract ID." }],
    })

    expect(manifest.coverage.roots).toEqual([
      { kind: "token-contract", id: "@acme/tokens#assemblyTokens@1" },
      { kind: "component-recipe", id: "@acme/ui#AssemblyButton@1" },
    ])
    expect(manifest.tokens.find(record => record.id === canvasId)?.lifecycle).toEqual({
      deprecatedSince: "2.0.0",
      reason: "Use the semantic surface token.",
      replacement: { id: "@acme/tokens/semantic@1#7:surface", resolution: "external" },
    })
    expect(manifest.dependencies).toContainEqual({
      from: getTokenId(contract.semantic.surface),
      to: canvasId,
      kind: "token-alias",
      resolution: "internal",
    })
    expect(manifest.dependencies).toContainEqual({
      from: getTokenId(contract.semantic.remote),
      kind: "token-alias",
      resolution: "unresolved",
    })
    expect(manifest.coverage.unresolved).toContainEqual(expect.objectContaining({ reference: "legacy:--crumbs-old-surface" }))
    expect(manifest.coverage.unresolved.some(item => item.reference.includes("legacy.palette.surface"))).toBe(true)
    expect(manifest.modules).toEqual([])
    expect(manifest.capabilities).toEqual([])
  })

  it("rejects missing stable identities, unsafe source paths and roots with colliding identities", () => {
    const legacy = createTokenContract({ color: { canvas: defineToken("color") } })
    expect(() => projectTokenContract(legacy, tokenOrigin)).toThrow(/stable contract identity/i)

    const identified = makeTokenContract("unsafeOrigin")
    expect(() => projectTokenContract(identified, { path: "../outside.css.ts", exportPath: "tokens" })).toThrow(/source origin|package-relative|path/i)
    expect(() => projectTokenContract(identified, { path: "/private/tokens.css.ts", exportPath: "tokens" })).toThrow(/source origin|package-relative|path/i)
    expect(() => projectTokenContract(identified, { path: "src/tokens.css.ts" })).toThrow(/explicit source export path/i)

    const duplicate = makeTokenContract("duplicateRoot")
    expect(() => assemble({ tokenContracts: [
      { contract: duplicate, origin: tokenOrigin },
      { contract: duplicate, origin: { path: "src/tokens/duplicate.css.ts", exportPath: "duplicateTokens" } },
    ] })).toThrow(/duplicate|identity/i)

    const tokenAndComponentIdentityCollision = makeTokenContract("crossKind")
    expect(() => assemble({
      tokenContracts: [{ contract: tokenAndComponentIdentityCollision, origin: tokenOrigin }],
      componentRecipes: [{ recipe: makeComponentRecipe("crossKind", "@acme/tokens"), origin: componentOrigin }],
    })).toThrow(/duplicate|identity/i)
  })

  it("requires lifecycle targets and declared replacements to resolve, while allowing explicit external IDs", () => {
    const contract = makeTokenContract("lifecycleTargets")
    const targetId = getTokenId(contract.foundation.color.canvas)
    expect(() => assemble({ lifecycleAnnotations: [{ entityId: "@acme/missing#token@1", deprecatedSince: "2.0.0" }] }))
      .toThrow(/lifecycle.*target|annotation.*target/i)
    expect(() => assemble({
      tokenContracts: [{ contract, origin: tokenOrigin }],
      lifecycleAnnotations: [{
        entityId: targetId,
        deprecatedSince: "2.0.0",
        replacement: { id: "@acme/missing#token@1", resolution: "declared" },
      }],
    })).toThrow(/replacement.*declared|replacement.*resolve/i)
    expect(() => assemble({
      tokenContracts: [{ contract, origin: tokenOrigin }],
      lifecycleAnnotations: [
        { entityId: targetId, deprecatedSince: "2.0.0" },
        { entityId: targetId, deprecatedSince: "2.1.0" },
      ],
    })).toThrow(/duplicate.*lifecycle/i)
  })
})
