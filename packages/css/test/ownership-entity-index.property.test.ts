import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { decodeManifest } from "../src/tooling/manifest/schema"
import type { DesignSystemManifest, ManifestToken } from "../src/tooling/manifest/model"
import { decodeDesignSystemOwnership } from "../src/tooling/ownership/schema"

async function getIndexApi() {
  let api: typeof import("../src/tooling/ownership/entity-index") | undefined
  try {
    api = await import("../src/tooling/ownership/entity-index")
  } catch {
    api = undefined
  }
  expect(api?.buildOwnershipEntityIndex).toBeDefined()
  expect(api?.resolveOwnershipEntity).toBeDefined()
  return api!
}

function tokenFor(value: number): ManifestToken {
  return {
    id: `token:${value}`,
    contract: { owner: "@acme/design-system", name: "foundation", version: 1 },
    path: ["generated", `token-${value}`],
    visibility: "public",
    domain: { kind: "color" },
    kind: "definition",
    origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
  }
}

function manifest(version: string, tokens: ReadonlyArray<ManifestToken>): DesignSystemManifest {
  return decodeManifest({
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: "@acme/design-system", version },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "1.2.3" },
      artifact: { name: "crumbs-native-style-artifact", version: 1 },
    },
    tokens,
    components: [],
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: {
      roots: [{ kind: "token-contract", id: "@acme/design-system#foundation@1" }],
      unresolved: [],
    },
  })
}

function ownership(entityId: string) {
  return decodeDesignSystemOwnership({
    format: "crumbs.design-system-ownership",
    schemaVersion: 1,
    owners: [{ id: "team:platform", displayName: "Platform" }],
    assignments: [{ entityId, ownerId: "team:platform" }],
  })
}

describe("ownership entity index properties", () => {
  it("does not depend on the order of equivalent manifests", async () => {
    const api = await getIndexApi()
    fc.assert(fc.property(
      fc.uniqueArray(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 8 }),
      values => {
        const manifests = values.map((value, index) => manifest(`${index + 1}.0.0`, [tokenFor(value)]))
        const forward = api.buildOwnershipEntityIndex(manifests)
        const reverse = api.buildOwnershipEntityIndex([...manifests].reverse())
        const sortedEntries = (map: ReadonlyMap<string, string>) => [...map.entries()].sort(([left], [right]) => left.localeCompare(right))
        const sortedVariables = (map: ReadonlyMap<string, ReadonlyArray<string>>) => [...map.entries()]
          .map(([name, ids]) => [name, [...ids].sort()] as const)
          .sort(([left], [right]) => left.localeCompare(right))

        expect(sortedEntries(forward.byId)).toEqual(sortedEntries(reverse.byId))
        expect(sortedVariables(forward.tokenIdsByVariableName)).toEqual(sortedVariables(reverse.tokenIdsByVariableName))
      },
    ))
  })

  it("uses exact IDs and never attributes a non-matching ID", async () => {
    const api = await getIndexApi()
    fc.assert(fc.property(fc.integer({ min: -1000, max: 1000 }), value => {
      const token = tokenFor(value)
      const index = api.buildOwnershipEntityIndex([manifest("1.0.0", [token])])
      const ownerMap = ownership(token.id)
      const assignmentsByEntityId = api.buildOwnershipAssignmentIndex(ownerMap)

      expect(api.resolveOwnershipEntity(token.id, ownerMap, index, assignmentsByEntityId)).toEqual({
        entityId: token.id,
        status: "assigned",
        owner: { id: "team:platform", displayName: "Platform" },
      })
      expect(api.resolveOwnershipEntity(`${token.id}:suffix`, ownerMap, index, assignmentsByEntityId)).toEqual({
        entityId: `${token.id}:suffix`,
        status: "unresolved",
        reason: "entity-not-in-supplied-manifests",
      })
    }))
  })
})
