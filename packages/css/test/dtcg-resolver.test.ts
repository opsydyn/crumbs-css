import { describe, expect, it } from "bun:test"
import type { DtcgJsonObject } from "../src/tooling/dtcg/model"
import { indexDtcgDocuments } from "../src/tooling/dtcg/documents"
import { selectDtcgSources } from "../src/tooling/dtcg/resolver"

const resolverUri = "https://example.test/resolver.json"
const resolverOrigin = { documentUri: resolverUri, jsonPointer: "/resolutionOrder/0" } as const

function documentMap(entries: Readonly<Record<string, DtcgJsonObject>> = {}) {
  const result = indexDtcgDocuments(entries)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error("Expected the explicit document map to index")
  return result.value
}

function select(resolver: DtcgJsonObject, modifiers?: Readonly<Record<string, string>>, documents = documentMap()) {
  return selectDtcgSources(resolver, resolverUri, documents, modifiers)
}

function expectFailure(
  result: { readonly ok: boolean; readonly diagnostics: ReadonlyArray<{ readonly code: string }> },
  code: string,
) {
  expect(result.ok).toBe(false)
  expect(result.diagnostics).toHaveLength(1)
  expect(result.diagnostics[0]?.code).toBe(code)
  expect(Object.hasOwn(result, "value")).toBe(false)
}

describe("DTCG Resolver source selection", () => {
  it("accepts each Resolver version literal supported by the Crumbs profile", () => {
    for (const version of ["2025-10-01", "2025-11-01", "2025.10"] as const) {
      const result = select({
        version,
        resolutionOrder: [{ type: "set", name: "base", sources: [{ color: { canvas: "#ffffff" } }] }],
      })

      expect(result).toMatchObject({
        ok: true,
        value: {
          resolverVersion: version,
          selectedModifiers: {},
          sources: [{ setName: "base", documentUri: resolverUri, jsonPointer: "/resolutionOrder/0/sources/0" }],
        },
      })
    }
  })

  it("rejects a Resolver version outside the supported profile", () => {
    expectFailure(select({ version: "2024-01-01", resolutionOrder: [{ type: "set", name: "base", sources: [] }] }), "resolver.version-unsupported")
  })

  it("rejects malformed Resolver structure with one stable diagnostic", () => {
    const result = select({ version: "2025.10", resolutionOrder: [], surprise: true })

    expectFailure(result, "format.structure-invalid")
    expect(result.diagnostics[0]).toMatchObject({
      severity: "error",
      documentUri: resolverUri,
      jsonPointer: "",
      message: "Invalid DTCG Resolver structure.",
    })
  })

  it("accepts the Resolver $defs extension point without weakening root validation", () => {
    const result = select({
      version: "2025.10",
      $defs: { shared: { description: "Resolver-local definition metadata" } },
      resolutionOrder: [{ type: "set", name: "base", sources: [{ color: "white" }] }],
    })

    expect(result).toMatchObject({ ok: true, value: { resolutionOrder: ["set:base"] } })
  })

  it("preserves source-array and resolutionOrder precedence exactly", () => {
    const documents = documentMap({
      "https://example.test/base.json": { color: { canvas: "#ffffff" } },
      "https://example.test/light.json": { color: { surface: "#eeeeee" } },
      "https://example.test/dark.json": { color: { surface: "#111111" } },
      "https://example.test/final.json": { color: { canvas: "#000000" } },
    })
    const resolver: DtcgJsonObject = {
      version: "2025.10",
      sets: {
        foundation: {
          sources: [
            { $ref: "base.json#/color" },
            { color: { accent: "#336699" } },
          ],
        },
        final: { sources: [{ $ref: "final.json#/color" }] },
      },
      modifiers: {
        theme: {
          contexts: {
            light: [{ $ref: "light.json#/color" }],
            dark: [{ $ref: "dark.json#/color" }],
          },
          default: "light",
        },
      },
      resolutionOrder: [
        { $ref: "#/sets/foundation" },
        { $ref: "#/modifiers/theme" },
        { $ref: "#/sets/final" },
      ],
    }

    const result = select(resolver, undefined, documents)

    expect(result).toMatchObject({
      ok: true,
      value: {
        resolverVersion: "2025.10",
        selectedModifiers: { theme: "light" },
        resolutionOrder: ["set:foundation", "modifier:theme", "set:final"],
        sources: [
          { setName: "foundation", documentUri: "https://example.test/base.json", jsonPointer: "/color" },
          { setName: "foundation", documentUri: resolverUri, jsonPointer: "/sets/foundation/sources/1" },
          { setName: "theme", documentUri: "https://example.test/light.json", jsonPointer: "/color" },
          { setName: "final", documentUri: "https://example.test/final.json", jsonPointer: "/color" },
        ],
      },
    })
    if (result.ok) {
      expect(result.value.sources[0]?.sourceChain).toEqual([
        { documentUri: resolverUri, jsonPointer: "/resolutionOrder/0" },
        { documentUri: resolverUri, jsonPointer: "/sets/foundation" },
        { documentUri: resolverUri, jsonPointer: "/sets/foundation/sources/0" },
        { documentUri: "https://example.test/base.json", jsonPointer: "/color" },
      ])
    }
  })

  it("uses an explicit context instead of the modifier default", () => {
    const documents = documentMap({
      "https://example.test/light.json": { color: "white" },
      "https://example.test/dark.json": { color: "black" },
    })
    const result = select({
      version: "2025.10",
      modifiers: {
        theme: {
          contexts: { light: [{ $ref: "light.json" }], dark: [{ $ref: "dark.json" }] },
          default: "light",
        },
      },
      resolutionOrder: [{ $ref: "#/modifiers/theme" }],
    }, { theme: "dark" }, documents)

    expect(result).toMatchObject({
      ok: true,
      value: {
        selectedModifiers: { theme: "dark" },
        sources: [{ setName: "theme", documentUri: "https://example.test/dark.json", jsonPointer: "" }],
      },
    })
  })

  it("selects one context per modifier without expanding permutations", () => {
    const documents = documentMap({
      "https://example.test/light.json": { color: "light" },
      "https://example.test/dark.json": { color: "dark" },
      "https://example.test/compact.json": { space: 4 },
      "https://example.test/comfortable.json": { space: 8 },
    })
    const result = select({
      version: "2025.10",
      modifiers: {
        theme: { contexts: { light: [{ $ref: "light.json" }], dark: [{ $ref: "dark.json" }] }, default: "light" },
        density: { contexts: { compact: [{ $ref: "compact.json" }], comfortable: [{ $ref: "comfortable.json" }] } },
      },
      resolutionOrder: [{ $ref: "#/modifiers/theme" }, { $ref: "#/modifiers/density" }],
    }, { density: "comfortable" }, documents)

    expect(result).toMatchObject({
      ok: true,
      value: {
        selectedModifiers: { density: "comfortable", theme: "light" },
        sources: [
          { setName: "theme", documentUri: "https://example.test/light.json", jsonPointer: "" },
          { setName: "density", documentUri: "https://example.test/comfortable.json", jsonPointer: "" },
        ],
      },
    })
    if (result.ok) expect(result.value.sources).toHaveLength(2)
  })

  it("expands a set referenced from a selected modifier context", () => {
    const documents = documentMap({ "https://example.test/base.json": { color: "base" } })
    const result = select({
      version: "2025.10",
      sets: { foundation: { sources: [{ $ref: "base.json#/color" }] } },
      modifiers: {
        theme: { contexts: { light: [{ $ref: "#/sets/foundation" }], dark: [] }, default: "light" },
      },
      resolutionOrder: [{ $ref: "#/modifiers/theme" }],
    }, undefined, documents)

    expect(result).toMatchObject({
      ok: true,
      value: {
        sources: [{ setName: "foundation", documentUri: "https://example.test/base.json", jsonPointer: "/color" }],
      },
    })
  })

  it("detects recursive set references without returning partial sources", () => {
    const result = select({
      version: "2025.10",
      sets: { loop: { sources: [{ $ref: "#/sets/loop" }] } },
      resolutionOrder: [{ $ref: "#/sets/loop" }],
    })

    expectFailure(result, "format.cycle")
    expect(result.diagnostics[0]).toMatchObject({
      documentUri: resolverUri,
      jsonPointer: "/sets/loop",
      referenceChain: ["https://example.test/resolver.json#/sets/loop", "https://example.test/resolver.json#/sets/loop"],
    })
  })

  it("expands deep acyclic set references without overflowing and preserves provenance order", () => {
    const depth = 49_998
    const entries = Object.create(null) as Record<string, DtcgJsonObject>
    for (let index = 0; index < depth; index += 1) {
      entries[`https://example.test/chain/${index}.json`] = {
        sources: index + 1 < depth
          ? [{ $ref: `${index + 1}.json` }]
          : [{ color: { leaf: "#000000" } }],
      }
    }
    const result = select({
      version: "2025.10",
      sets: { root: { sources: [{ $ref: "https://example.test/chain/0.json" }] } },
      resolutionOrder: [{ $ref: "#/sets/root" }],
    }, undefined, documentMap(entries))

    expect(result.ok).toBe(true)
    if (result.ok) {
      const sourceChain = result.value.sources[0]?.sourceChain ?? []
      expect(sourceChain).toHaveLength(99_999)
      expect(sourceChain[0]).toEqual({ documentUri: resolverUri, jsonPointer: "/resolutionOrder/0" })
      expect(sourceChain[1]).toEqual({ documentUri: resolverUri, jsonPointer: "/sets/root" })
      expect(sourceChain[50_002]).toEqual({ documentUri: "https://example.test/chain/24999.json", jsonPointer: "/sources/0" })
      expect(sourceChain[50_003]).toEqual({ documentUri: "https://example.test/chain/25000.json", jsonPointer: "" })
      expect(sourceChain[99_998]).toEqual({ documentUri: "https://example.test/chain/49997.json", jsonPointer: "/sources/0" })
    }
  })

  it("rejects a duplicate Resolver URI in the explicit document map", () => {
    const documents = documentMap({ [resolverUri]: { version: "2025.10" } })
    const result = select({
      version: "2025.10",
      resolutionOrder: [{ type: "set", name: "base", sources: [] }],
    }, undefined, documents)

    expectFailure(result, "format.structure-invalid")
  })

  it("supports inline set and modifier entries in resolutionOrder", () => {
    const result = select({
      version: "2025.10",
      resolutionOrder: [
        { type: "set", name: "inlineBase", sources: [{ color: { canvas: "#ffffff" } }] },
        {
          type: "modifier",
          name: "inlineTheme",
          contexts: { light: [{ color: { surface: "#eeeeee" } }], dark: [{ color: { surface: "#111111" } }] },
          default: "dark",
        },
      ],
    })

    expect(result).toMatchObject({
      ok: true,
      value: {
        selectedModifiers: { inlineTheme: "dark" },
        resolutionOrder: ["set:inlineBase", "modifier:inlineTheme"],
        sources: [
          { setName: "inlineBase", documentUri: resolverUri, jsonPointer: "/resolutionOrder/0/sources/0" },
          { setName: "inlineTheme", documentUri: resolverUri, jsonPointer: "/resolutionOrder/1/contexts/dark/0" },
        ],
      },
    })
  })

  it("rejects unknown context selections", () => {
    const result = select({
      version: "2025.10",
      modifiers: { theme: { contexts: { light: [], dark: [] }, default: "light" } },
      resolutionOrder: [{ $ref: "#/modifiers/theme" }],
    }, { theme: "blue" })

    expectFailure(result, "resolver.selection-invalid")
    expect(result.diagnostics[0]).toMatchObject({ documentUri: resolverUri, jsonPointer: "" })
  })

  it("rejects unknown modifier input keys", () => {
    const result = select({
      version: "2025.10",
      modifiers: { theme: { contexts: { light: [], dark: [] }, default: "light" } },
      resolutionOrder: [{ $ref: "#/modifiers/theme" }],
    }, { colour: "light" })

    expectFailure(result, "resolver.selection-invalid")
  })

  it("requires input when a modifier has no declared default", () => {
    const result = select({
      version: "2025.10",
      modifiers: { theme: { contexts: { light: [], dark: [] } } },
      resolutionOrder: [{ $ref: "#/modifiers/theme" }],
    })

    expectFailure(result, "resolver.selection-invalid")
  })

  it("rejects a default that does not name a declared context", () => {
    const result = select({
      version: "2025.10",
      modifiers: { theme: { contexts: { light: [], dark: [] }, default: "blue" } },
      resolutionOrder: [{ $ref: "#/modifiers/theme" }],
    })

    expectFailure(result, "resolver.selection-invalid")
  })

  it("does not let an explicit context hide a malformed declared default", () => {
    const result = select({
      version: "2025.10",
      modifiers: { theme: { contexts: { light: [], dark: [] }, default: "blue" } },
      resolutionOrder: [{ $ref: "#/modifiers/theme" }],
    }, { theme: "dark" })

    expectFailure(result, "resolver.selection-invalid")
  })

  it("reports missing source documents at the source URI and pointer", () => {
    const result = select({
      version: "2025.10",
      sets: { foundation: { sources: [{ $ref: "missing.json#/color" }] } },
      resolutionOrder: [{ $ref: "#/sets/foundation" }],
    })

    expectFailure(result, "reference.missing")
    expect(result.diagnostics[0]).toMatchObject({
      documentUri: resolverUri,
      jsonPointer: "/sets/foundation/sources/0",
    })
  })

  it("rejects a reference into resolutionOrder", () => {
    const result = select({
      version: "2025.10",
      resolutionOrder: [{ $ref: "#/resolutionOrder/0" }],
    })

    expectFailure(result, "resolver.selection-invalid")
    expect(result.diagnostics[0]).toMatchObject({ documentUri: resolverUri, jsonPointer: "/resolutionOrder/0" })
  })

  it("bounds expanded Resolver provenance independently of source steps", () => {
    const depth = 300
    const leafCount = 200
    const inputs: Record<string, DtcgJsonObject> = Object.create(null) as Record<string, DtcgJsonObject>
    for (let index = 0; index < depth; index += 1) {
      const uri = `https://example.test/chain/${index}.json`
      inputs[uri] = {
        sources: index + 1 < depth
          ? [{ $ref: `${index + 1}.json` }]
          : Array.from({ length: leafCount }, (_, leaf) => ({ color: { [`leaf-${leaf}`]: leaf } })),
      }
    }

    const result = select({
      version: "2025.10",
      sets: { root: { sources: [{ $ref: "https://example.test/chain/0.json" }] } },
      resolutionOrder: [{ $ref: "#/sets/root" }],
    }, undefined, documentMap(inputs))

    expectFailure(result, "resource.limit-exceeded")
    expect(result.diagnostics[0]?.message).toBe("DTCG Resolver provenance exceeds the 100,000-origin limit.")
  })
})
