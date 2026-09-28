import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import type { DtcgJsonObject } from "../src/tooling/dtcg/model"
import { indexDtcgDocuments } from "../src/tooling/dtcg/documents"
import { selectDtcgSources } from "../src/tooling/dtcg/resolver"

const resolverUri = "https://example.test/resolver.json"
const documents = indexDtcgDocuments({})
if (!documents.ok) throw new Error("Expected an empty explicit document index")

const setSources: Readonly<Record<string, DtcgJsonObject>> = {
  foundation: { sources: [{ color: { canvas: "#ffffff" } }, { color: { canvas: "#000000" } }] },
  product: { sources: [{ component: { card: { radius: 8 } } }] },
  platform: { sources: [{ component: { card: { elevation: 2 } } }] },
}
const contexts: Readonly<Record<string, DtcgJsonObject>> = {
  light: { sources: [{ theme: { background: "#ffffff" } }] },
  dark: { sources: [{ theme: { background: "#000000" } }] },
}

function orderedRecord<T>(keys: ReadonlyArray<string>, values: Readonly<Record<string, T>>): Record<string, T> {
  return Object.fromEntries(keys.map(key => [key, values[key]!]))
}

function makeResolver(setOrder: ReadonlyArray<string>, contextOrder: ReadonlyArray<string>): DtcgJsonObject {
  return {
    version: "2025.10",
    sets: orderedRecord(setOrder, setSources),
    modifiers: {
      theme: { contexts: orderedRecord(contextOrder, contexts), default: "light" },
    },
    resolutionOrder: [
      { $ref: "#/sets/foundation" },
      { $ref: "#/sets/product" },
      { $ref: "#/modifiers/theme" },
      { $ref: "#/sets/platform" },
    ],
  }
}

describe("DTCG Resolver selection properties", () => {
  it("is invariant under semantically irrelevant object-key permutations", () => {
    fc.assert(fc.property(
      fc.shuffledSubarray(["foundation", "product", "platform"], { minLength: 3, maxLength: 3 }),
      fc.shuffledSubarray(["light", "dark"], { minLength: 2, maxLength: 2 }),
      (setOrder, contextOrder) => {
        const first = selectDtcgSources(makeResolver(["foundation", "product", "platform"], ["light", "dark"]), resolverUri, documents.value, { theme: "dark" })
        const permuted = selectDtcgSources(makeResolver(setOrder, contextOrder), resolverUri, documents.value, { theme: "dark" })

        expect(permuted).toEqual(first)
      },
    ), { seed: 62141, numRuns: 80 })
  })

  it("preserves source order while leaving modifier and resolution order unchanged", () => {
    fc.assert(fc.property(
      fc.shuffledSubarray(["first", "second"], { minLength: 2, maxLength: 2 }),
      order => {
        const resolver: DtcgJsonObject = {
          version: "2025.10",
          sets: {
            foundation: {
              sources: order.map(name => ({ color: { [name]: name } })),
            },
          },
          modifiers: {
            theme: { contexts: { light: [], dark: [] }, default: "dark" },
          },
          resolutionOrder: [{ $ref: "#/sets/foundation" }, { $ref: "#/modifiers/theme" }],
        }
        const result = selectDtcgSources(resolver, resolverUri, documents.value)

        expect(result).toMatchObject({
          ok: true,
          value: {
            selectedModifiers: { theme: "dark" },
            resolutionOrder: ["set:foundation", "modifier:theme"],
            sources: order.map((_, index) => ({
              setName: "foundation",
              documentUri: resolverUri,
              jsonPointer: `/sets/foundation/sources/${index}`,
            })),
          },
        })
      },
    ), { seed: 82913, numRuns: 80 })
  })
})
