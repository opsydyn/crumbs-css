import { describe, expect, it } from "bun:test"
import type { DesignSystemOwnership, OwnershipAssignment, OwnershipOwner } from "../src/tooling/ownership/model"

const emptyOwnership = {
  format: "crumbs.design-system-ownership",
  schemaVersion: 1,
  owners: [],
  assignments: [],
} as const

const owner = { id: "team:platform", displayName: "Platform" } as const
const assignment = { entityId: "@acme/tokens@1#5:color/6:accent", ownerId: owner.id } as const

async function getDecoder() {
  let schema: typeof import("../src/tooling/ownership/schema") | undefined
  try {
    schema = await import("../src/tooling/ownership/schema")
  } catch {
    schema = undefined
  }
  expect(schema?.decodeDesignSystemOwnership).toBeDefined()
  return schema!.decodeDesignSystemOwnership
}

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false
type Assert<Value extends true> = Value

type OwnershipDataShape = {
  readonly format: "crumbs.design-system-ownership"
  readonly schemaVersion: 1
  readonly owners: ReadonlyArray<{ readonly id: string; readonly displayName: string }>
  readonly assignments: ReadonlyArray<{ readonly entityId: string; readonly ownerId: string }>
}
const ownershipTypeIsPlainData: Assert<Equal<DesignSystemOwnership, OwnershipDataShape>> = true
const ownerTypeIsPlainData: Assert<Equal<OwnershipOwner, { readonly id: string; readonly displayName: string }>> = true
const assignmentTypeIsPlainData: Assert<Equal<OwnershipAssignment, { readonly entityId: string; readonly ownerId: string }>> = true

describe("design-system ownership v1 schema", () => {
  it("rejects unsupported ownership tags", async () => {
    const decodeDesignSystemOwnership = await getDecoder()
    expect(() => decodeDesignSystemOwnership({ ...emptyOwnership, format: "crumbs.other" })).toThrow()
    expect(() => decodeDesignSystemOwnership({ ...emptyOwnership, schemaVersion: 2 })).toThrow()
    expect(() => decodeDesignSystemOwnership({ ...emptyOwnership, extra: true })).toThrow()
  })

  it("rejects duplicate owner and entity IDs", async () => {
    const decodeDesignSystemOwnership = await getDecoder()
    expect(() => decodeDesignSystemOwnership({
      ...emptyOwnership,
      owners: [owner, owner],
    })).toThrow(/duplicate owner/i)

    expect(() => decodeDesignSystemOwnership({
      ...emptyOwnership,
      owners: [owner],
      assignments: [assignment, assignment],
    })).toThrow(/duplicate entity/i)
  })

  it("rejects unknown owner references", async () => {
    const decodeDesignSystemOwnership = await getDecoder()
    expect(() => decodeDesignSystemOwnership({
      ...emptyOwnership,
      assignments: [{ entityId: "@acme/tokens@1#5:color/6:accent", ownerId: "team:missing" }],
    })).toThrow(/unknown owner/i)
  })

  it("rejects unsafe text and accessor-bearing values without invoking getters", async () => {
    const decodeDesignSystemOwnership = await getDecoder()
    const invalidOwners = [
      { id: "", displayName: "Platform" },
      { id: " team:platform", displayName: "Platform" },
      { id: "team:platform", displayName: "Platform\nTeam" },
      { id: "team:\u0085platform", displayName: "Platform" },
    ]
    for (const invalidOwner of invalidOwners) {
      expect(() => decodeDesignSystemOwnership({ ...emptyOwnership, owners: [invalidOwner] })).toThrow()
    }
    expect(() => decodeDesignSystemOwnership({
      ...emptyOwnership,
      owners: [owner],
      assignments: [{ entityId: " @acme/token ", ownerId: owner.id }],
    })).toThrow()

    let getterCalls = 0
    const accessorOwner = Object.defineProperty({ displayName: "Platform" }, "id", {
      enumerable: true,
      get() {
        getterCalls += 1
        return "team:platform"
      },
    })
    expect(() => decodeDesignSystemOwnership({ ...emptyOwnership, owners: [accessorOwner] })).toThrow()
    expect(getterCalls).toBe(0)
  })

  it("accepts an empty ownership map for incremental adoption", async () => {
    const decodeDesignSystemOwnership = await getDecoder()
    expect(decodeDesignSystemOwnership(emptyOwnership)).toEqual(emptyOwnership)
  })

  it("keeps the model's public types plain data and its schema module narrow", async () => {
    let model: typeof import("../src/tooling/ownership/model") | undefined
    let schema: typeof import("../src/tooling/ownership/schema") | undefined
    try {
      [model, schema] = await Promise.all([
        import("../src/tooling/ownership/model"),
        import("../src/tooling/ownership/schema"),
      ])
    } catch {
      model = undefined
      schema = undefined
    }
    expect(model).toBeDefined()
    expect(schema).toBeDefined()
    expect(ownershipTypeIsPlainData).toBe(true)
    expect(ownerTypeIsPlainData).toBe(true)
    expect(assignmentTypeIsPlainData).toBe(true)
    expect(Object.keys(model!).sort()).toEqual([
      "DESIGN_SYSTEM_OWNED_REPORT_FORMAT",
      "DESIGN_SYSTEM_OWNED_REPORT_VERSION",
      "DESIGN_SYSTEM_OWNERSHIP_FORMAT",
      "DESIGN_SYSTEM_OWNERSHIP_VERSION",
      "OWNERSHIP_ANALYSIS_LIMIT_CODES",
      "OWNERSHIP_MAX_REPORT_REFERENCES",
      "OWNERSHIP_UNRESOLVED_REASON_CODES",
    ])
    expect(Object.keys(schema!).sort()).toEqual(["decodeDesignSystemOwnership", "decodeOwnedReport"])
  })
})
