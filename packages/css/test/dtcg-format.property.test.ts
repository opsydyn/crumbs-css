import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { indexDtcgDocuments } from "../src/tooling/dtcg/documents"
import { resolveDtcgTokenIndex } from "../src/tooling/dtcg/format"
import type { DtcgJsonObject } from "../src/tooling/dtcg/model"
import type { DtcgSourceSelection } from "../src/tooling/dtcg/resolver"

const uri = "https://example.test/generated.json"
const seed = 20260928

function documentIndex(document: DtcgJsonObject) {
  const result = indexDtcgDocuments({ [uri]: document })
  if (!result.ok) throw new Error("Expected generated DTCG document to index")
  return result.value
}

function oneSourceSelection(): DtcgSourceSelection {
  return {
    resolverVersion: "2025.10",
    selectedModifiers: {},
    sources: [{ setName: "generated", documentUri: uri, jsonPointer: "" }],
    resolutionOrder: ["set:generated"],
  }
}

function orderedRecord<T>(keys: ReadonlyArray<string>, values: Readonly<Record<string, T>>): Record<string, T> {
  return Object.fromEntries(keys.map(key => [key, values[key]!]))
}

describe("DTCG Format graph properties", () => {
  it("is invariant under semantically irrelevant group and token key permutations", () => {
    const groups = ["color", "space", "type"]
    const tokenNames = ["first", "second", "third"]
    const values = Object.fromEntries(tokenNames.map((name, index) => [name, { $value: index + 1 }]))

    fc.assert(fc.property(
      fc.shuffledSubarray(groups, { minLength: groups.length, maxLength: groups.length }),
      fc.shuffledSubarray(tokenNames, { minLength: tokenNames.length, maxLength: tokenNames.length }),
      (groupOrder, tokenOrder) => {
        const stableGroups = orderedRecord(groups, Object.fromEntries(groups.map(group => [group, orderedRecord(tokenNames, values)])))
        const permutedGroups = orderedRecord(groupOrder, Object.fromEntries(groupOrder.map(group => [group, orderedRecord(tokenOrder, values)])))
        const first = resolveDtcgTokenIndex(oneSourceSelection(), documentIndex(stableGroups))
        const permuted = resolveDtcgTokenIndex(oneSourceSelection(), documentIndex(permutedGroups))
        expect(permuted).toEqual(first)
      },
    ), { seed, numRuns: 80 })
  })

  it("resolves generated acyclic group-extension chains without losing inherited tokens", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 12 }), count => {
      const document: Record<string, unknown> = {
        group0: { $type: "number", token: { $value: 1 } },
      }
      for (let index = 1; index <= count; index += 1) {
        document[`group${index}`] = { $extends: `{group${index - 1}}`, [`local${index}`]: { $value: index + 1 } }
      }

      const result = resolveDtcgTokenIndex(oneSourceSelection(), documentIndex(document as DtcgJsonObject))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      for (let index = 0; index <= count; index += 1) {
        expect(result.value.get(JSON.stringify([`group${index}`, "token"]))).toMatchObject({ value: 1, type: "number" })
      }
    }), { seed: seed + 1, numRuns: 60 })
  })

  it("rejects generated closed group-extension cycles", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 10 }), count => {
      const document: Record<string, unknown> = {}
      for (let index = 0; index < count; index += 1) {
        document[`group${index}`] = { $extends: `{group${(index + 1) % count}}` }
      }

      const result = resolveDtcgTokenIndex(oneSourceSelection(), documentIndex(document as DtcgJsonObject))
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.diagnostics[0]?.code).toBe("format.cycle")
    }), { seed: seed + 2, numRuns: 60 })
  })

  it("uses the last ordered source as the winning token definition", () => {
    const firstUri = "https://example.test/first.json"
    const secondUri = "https://example.test/second.json"
    const docs = indexDtcgDocuments({
      [firstUri]: { group: { token: { $value: "first" } } },
      [secondUri]: { group: { token: { $value: "second" } } },
    })
    if (!docs.ok) throw new Error("Expected source documents to index")

    fc.assert(fc.property(fc.boolean(), secondLast => {
      const ordered = secondLast
        ? [firstUri, secondUri]
        : [secondUri, firstUri]
      const selection: DtcgSourceSelection = {
        resolverVersion: "2025.10",
        selectedModifiers: {},
        sources: ordered.map((documentUri, index) => ({ setName: `source${index}`, documentUri, jsonPointer: "" })),
        resolutionOrder: ordered.map((_, index) => `set:source${index}`),
      }
      const result = resolveDtcgTokenIndex(selection, docs.value)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.get(JSON.stringify(["group", "token"]))?.value).toBe(secondLast ? "second" : "first")
      }
    }), { seed: seed + 3, numRuns: 40 })
  })
})
