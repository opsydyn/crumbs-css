import { describe, expect, it } from "bun:test"
import type { DesignSystemManifest, ManifestComponent, ManifestToken } from "../src/tooling/manifest/model"
import { validateSourceMigration } from "../src/tooling/migrations/validate"

const provider = "@example/design-system"
const oldTokenId = "@example/design-system/tokens@1#5:color/6:accent"
const newTokenId = "@example/design-system/tokens@2#5:color/5:brand"
const oldComponentId = "@example/design-system#button@1"
const newComponentId = "@example/design-system#action-button@2"

function token(id: string, version: number, path: ReadonlyArray<string>, lifecycle?: ManifestToken["lifecycle"]): ManifestToken {
  return {
    id,
    contract: { owner: provider, name: "tokens", version },
    path,
    visibility: "public",
    domain: { kind: "color" },
    kind: "definition",
    origin: { path: version === 1 ? "src/tokens-v1.css.ts" : "src/tokens.css.ts", exportPath: "tokens" },
    ...(lifecycle === undefined ? {} : { lifecycle }),
  }
}

function component(id: string, version: number, slots: ReadonlyArray<string>, lifecycle?: ManifestComponent["lifecycle"]): ManifestComponent {
  return {
    id,
    contract: { owner: provider, name: "components", version },
    origin: { path: version === 1 ? "src/button.css.ts" : "src/action-button.css.ts", exportPath: "button" },
    slots,
    variants: {},
    extensionPoints: [],
    stateConstraints: [],
    defaults: {},
    ...(lifecycle === undefined ? {} : { lifecycle }),
  }
}

function manifest(name: string, version: string, entities: {
  tokens?: ReadonlyArray<ManifestToken>
  components?: ReadonlyArray<ManifestComponent>
} = {}): DesignSystemManifest {
  const roots: DesignSystemManifest["coverage"]["roots"][number][] = []
  for (const item of entities.tokens ?? []) {
    const id = `${item.contract.owner}#${item.contract.name}@${item.contract.version}`
    if (!roots.some(root => root.id === id)) roots.push({ kind: "token-contract", id })
  }
  for (const item of entities.components ?? []) roots.push({ kind: "component-recipe", id: item.id })
  return {
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name, version },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "native-style-ir", version: 1 },
    },
    tokens: entities.tokens ?? [],
    components: entities.components ?? [],
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: { roots, unresolved: [] },
  }
}

const migration = {
  format: "crumbs.source-migration",
  schemaVersion: 1,
  id: "design-system/2026-09-token-and-button-migration",
  revision: 1,
  provider,
  tokens: [{
    fromId: oldTokenId,
    toId: newTokenId,
    fromImport: { moduleSpecifier: "../tokens-v1.css", importedName: "tokens" },
    toImport: { moduleSpecifier: "../tokens.css", importedName: "tokens" },
  }],
  components: [{
    fromId: oldComponentId,
    toId: newComponentId,
    fromImport: { moduleSpecifier: "../button.css", importedName: "button" },
    toImport: { moduleSpecifier: "../action-button.css", importedName: "actionButton" },
    slots: { root: "container", label: "label" },
  }],
} as const

function validManifests() {
  return {
    baseline: manifest(provider, "1.0.0", {
      tokens: [token(oldTokenId, 1, ["color", "accent"])],
      components: [component(oldComponentId, 1, ["root", "label"])],
    }),
    current: manifest(provider, "2.0.0", {
      tokens: [token(newTokenId, 2, ["color", "brand"])],
      components: [component(newComponentId, 2, ["container", "label"])],
    }),
  }
}

describe("safe source migration manifest validation", () => {
  it("requires-matching-provider-and-manifest-identities", () => {
    const manifests = validManifests()
    expect(() => validateSourceMigration({ ...manifests, migration: { ...migration, provider: "@other/design-system" } })).toThrow("provider")
    expect(() => validateSourceMigration({ ...manifests, migration, current: manifest("@other/design-system", "2.0.0") })).toThrow("package identity")
  })

  it("requires-existing-from-and-to-ids-and-equal-token-domains", () => {
    const manifests = validManifests()
    expect(() => validateSourceMigration({
      ...manifests,
      migration: { ...migration, tokens: [{ ...migration.tokens[0], fromId: "missing" }] },
    })).toThrow("baseline token")
    expect(() => validateSourceMigration({
      ...manifests,
      migration: { ...migration, tokens: [{ ...migration.tokens[0], toId: "missing" }] },
    })).toThrow("current token")
    expect(() => validateSourceMigration({
      ...manifests,
      migration,
      current: manifest(provider, "2.0.0", {
        tokens: [{ ...token(newTokenId, 2, ["color", "brand"]), domain: { kind: "length", allowNegative: false } }],
        components: [component(newComponentId, 2, ["container", "label"])],
      }),
    })).toThrow("token domain")
  })

  it("requires-complete-existing-slot-maps", () => {
    const manifests = validManifests()
    expect(() => validateSourceMigration({
      ...manifests,
      migration: { ...migration, components: [{ ...migration.components[0], slots: { root: "container" } }] },
    })).toThrow("map every baseline slot")
    expect(() => validateSourceMigration({
      ...manifests,
      migration: { ...migration, components: [{ ...migration.components[0], slots: { root: "missing", label: "label" } }] },
    })).toThrow("current component slot")
    expect(() => validateSourceMigration({
      ...manifests,
      migration: { ...migration, components: [{ ...migration.components[0], slots: { root: "container", label: "label", extra: "label" } }] },
    })).toThrow("slot map must exactly match")
  })

  it("requires-declared-lifecycle-target-to-agree", () => {
    const manifests = validManifests()
    const matching = {
      ...manifests,
      baseline: manifest(provider, "1.0.0", {
        tokens: [
          token(oldTokenId, 1, ["color", "accent"], {
            deprecatedSince: "1.0.0",
            replacement: { id: newTokenId, resolution: "declared" },
          }),
          token(newTokenId, 2, ["color", "brand"]),
        ],
        components: [component(oldComponentId, 1, ["root", "label"])],
      }),
    }
    expect(validateSourceMigration({ ...matching, migration }).tokensByFromId.get(oldTokenId)?.to.id).toBe(newTokenId)
    expect(() => validateSourceMigration({
      ...matching,
      migration,
      baseline: manifest(provider, "1.0.0", {
        tokens: [
          token(oldTokenId, 1, ["color", "accent"], {
            deprecatedSince: "1.0.0",
            replacement: { id: "different-target", resolution: "declared" },
          }),
          token(newTokenId, 2, ["color", "brand"]),
          token("different-target", 2, ["color", "other"]),
        ],
        components: [component(oldComponentId, 1, ["root", "label"])],
      }),
    })).toThrow("lifecycle replacement")
    expect(() => validateSourceMigration({
      ...matching,
      migration,
      baseline: manifest(provider, "1.0.0", {
        tokens: [
          token(oldTokenId, 1, ["color", "accent"], {
            deprecatedSince: "1.0.0",
            replacement: { id: newTokenId, resolution: "external" },
          }),
          token(newTokenId, 2, ["color", "brand"]),
        ],
        components: [component(oldComponentId, 1, ["root", "label"])],
      }),
    })).toThrow("external lifecycle replacement")
    const withoutLifecycle = validManifests()
    expect(validateSourceMigration({ ...withoutLifecycle, migration }).migration.id).toBe(migration.id)
  })
})
