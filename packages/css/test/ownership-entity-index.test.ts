import { describe, expect, it } from "bun:test"
import { decodeManifest } from "../src/tooling/manifest/schema"
import type { DesignSystemManifest, ManifestComponent, ManifestToken } from "../src/tooling/manifest/model"
import { decodeDesignSystemOwnership } from "../src/tooling/ownership/schema"
import { tokenVariableName } from "../src/tokens/identity"

async function getIndexApi() {
  let api: typeof import("../src/tooling/ownership/entity-index") | undefined
  try {
    api = await import("../src/tooling/ownership/entity-index")
  } catch {
    api = undefined
  }
  expect(api?.buildOwnershipEntityIndex).toBeDefined()
  expect(api?.resolveOwnershipEntity).toBeDefined()
  expect(api?.buildOwnershipAssignmentIndex).toBeDefined()
  return api!
}

function makeToken(overrides: Partial<ManifestToken> = {}): ManifestToken {
  return {
    id: "@acme/design-system#token:color.accent",
    contract: { owner: "@acme/design-system", name: "foundation", version: 1 },
    path: ["color", "accent"],
    visibility: "public",
    domain: { kind: "color" },
    kind: "definition",
    origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
    ...overrides,
  }
}

function makeComponent(overrides: Partial<ManifestComponent> = {}): ManifestComponent {
  return {
    id: "@acme/design-system#component:button",
    contract: { owner: "@acme/design-system", name: "Button", version: 1 },
    origin: { path: "src/Button.css.ts", exportPath: "Button" },
    slots: ["root"],
    variants: {},
    extensionPoints: [],
    stateConstraints: [],
    defaults: {},
    ...overrides,
  }
}

function makeManifest(
  version: string,
  tokens: ReadonlyArray<ManifestToken> = [],
  components: ReadonlyArray<ManifestComponent> = [],
  packageName = "@acme/design-system",
): DesignSystemManifest {
  const tokenRoots = new Map<string, { readonly kind: "token-contract"; readonly id: string }>()
  for (const token of tokens) {
    const id = `${token.contract.owner}#${token.contract.name}@${token.contract.version}`
    tokenRoots.set(id, { kind: "token-contract", id })
  }
  return decodeManifest({
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: packageName, version },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "1.2.3" },
      artifact: { name: "crumbs-native-style-artifact", version: 1 },
    },
    tokens,
    components,
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: {
      roots: [...tokenRoots.values(), ...components.map(component => ({ kind: "component-recipe" as const, id: component.id }))],
      unresolved: [],
    },
  })
}

function ownership(assignments: ReadonlyArray<{ readonly entityId: string; readonly ownerId: string }>) {
  return decodeDesignSystemOwnership({
    format: "crumbs.design-system-ownership",
    schemaVersion: 1,
    owners: [{ id: "team:platform", displayName: "Platform" }],
    assignments,
  })
}

describe("ownership manifest entity index", () => {
  it("resolves token and component IDs to assigned and unassigned owners", async () => {
    const api = await getIndexApi()
    const token = makeToken()
    const component = makeComponent()
    const manifest = makeManifest("1.0.0", [token], [component])
    const ownershipMap = ownership([{ entityId: token.id, ownerId: "team:platform" }])
    const index = api.buildOwnershipEntityIndex([manifest])

    expect(api.resolveOwnershipEntity(token.id, ownershipMap, index)).toEqual({
      entityId: token.id,
      status: "assigned",
      owner: { id: "team:platform", displayName: "Platform" },
    })
    expect(api.resolveOwnershipEntity(component.id, ownershipMap, index)).toEqual({
      entityId: component.id,
      status: "unassigned",
    })
    expect(api.resolveOwnershipEntity("@acme/design-system#missing", ownershipMap, index)).toEqual({
      entityId: "@acme/design-system#missing",
      status: "unresolved",
      reason: "entity-not-in-supplied-manifests",
    })
  })

  it("rejects an empty manifest list and duplicate package versions", async () => {
    const api = await getIndexApi()
    const manifest = makeManifest("1.0.0", [makeToken()])
    expect(() => api.buildOwnershipEntityIndex([])).toThrow(/manifest/i)
    expect(() => api.buildOwnershipEntityIndex([manifest, manifest])).toThrow(/duplicate.*manifest/i)
  })

  it("deduplicates the same stable token identity across manifest versions", async () => {
    const api = await getIndexApi()
    const token = makeToken()
    const index = api.buildOwnershipEntityIndex([
      makeManifest("1.0.0", [token]),
      makeManifest("2.0.0", [token]),
    ])
    const variableName = tokenVariableName(token.contract, token.path)

    expect(index.byId.get(token.id)).toBe("token")
    expect(index.tokenIdsByVariableName.get(variableName)).toEqual([token.id])
  })

  it("accepts domain, lifecycle, and source-origin changes for a stable token ID", async () => {
    const api = await getIndexApi()
    const token = makeToken()
    const changedToken = makeToken({
      domain: { kind: "length", allowNegative: false },
      lifecycle: { deprecatedSince: "2.0.0", reason: "Use the spacing scale." },
      origin: { path: "src/foundation/spacing.css.ts", exportPath: "space" },
    })
    const index = api.buildOwnershipEntityIndex([
      makeManifest("1.0.0", [token]),
      makeManifest("2.0.0", [changedToken]),
    ])
    const ownershipMap = ownership([{ entityId: token.id, ownerId: "team:platform" }])

    expect(index.byId.get(token.id)).toBe("token")
    expect(api.resolveOwnershipEntity(token.id, ownershipMap, index).status).toBe("assigned")
  })

  it("rejects contradictory token identity or path records", async () => {
    const api = await getIndexApi()
    const token = makeToken()
    expect(() => api.buildOwnershipEntityIndex([
      makeManifest("1.0.0", [token]),
      makeManifest("2.0.0", [makeToken({ path: ["color", "brand"] })]),
    ])).toThrow(/contradictory token identity/i)
    expect(() => api.buildOwnershipEntityIndex([
      makeManifest("1.0.0", [token]),
      makeManifest("2.0.0", [makeToken({ contract: { ...token.contract, name: "semantic" } })]),
    ])).toThrow(/contradictory token identity/i)
  })

  it("rejects token and component IDs that collide", async () => {
    const api = await getIndexApi()
    const sharedId = "@acme/design-system#shared-entity"
    expect(() => api.buildOwnershipEntityIndex([
      makeManifest("1.0.0", [makeToken({ id: sharedId })]),
      makeManifest("1.0.0", [], [makeComponent({ id: sharedId })], "@acme/components"),
    ])).toThrow(/conflicting.*identity|identity.*conflict/i)
  })

  it("rejects a stable component ID whose contract identity changes", async () => {
    const api = await getIndexApi()
    const component = makeComponent()
    expect(() => api.buildOwnershipEntityIndex([
      makeManifest("1.0.0", [], [component]),
      makeManifest("2.0.0", [], [makeComponent({ contract: { ...component.contract, name: "ActionButton" } })]),
    ])).toThrow(/contradictory component identity/i)
  })

  it("indexes only exact generated token-variable names", async () => {
    const api = await getIndexApi()
    const token = makeToken()
    const index = api.buildOwnershipEntityIndex([makeManifest("1.0.0", [token])])
    const variableName = tokenVariableName(token.contract, token.path)

    expect(index.tokenIdsByVariableName.get(variableName)).toEqual([token.id])
    expect(index.tokenIdsByVariableName.has(`${variableName}-suffix`)).toBe(false)
  })
})
