import { describe, expect, it } from "bun:test"
import type { DtcgJsonObject } from "../src/tooling/dtcg/model"
import { indexDtcgDocuments, resolveDtcgReference } from "../src/tooling/dtcg/documents"

const resolverUri = "https://example.test/design/resolver.json"
const referringOrigin = { documentUri: resolverUri, jsonPointer: "/$sets/0/sources/1" } as const

function indexedDocuments(entries: Readonly<Record<string, DtcgJsonObject>>) {
  const result = indexDtcgDocuments(entries)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error("Expected explicit DTCG documents to index")
  return result.value
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

describe("explicit DTCG document references", () => {
  it("resolves absolute and relative references against the containing document URI", () => {
    const documents = indexedDocuments({
      "https://example.test/design/tokens.json": { color: { canvas: "#ffffff" } },
    })

    const relative = resolveDtcgReference("../design/tokens.json#/color/canvas", resolverUri, documents, referringOrigin)
    const absolute = resolveDtcgReference("https://example.test/design/tokens.json#/color/canvas", resolverUri, documents)

    expect(relative).toMatchObject({
      ok: true,
      value: {
        value: "#ffffff",
        documentUri: "https://example.test/design/tokens.json",
        jsonPointer: "/color/canvas",
        referringOrigin,
      },
      diagnostics: [],
    })
    expect(absolute).toMatchObject({
      ok: true,
      value: {
        value: "#ffffff",
        documentUri: "https://example.test/design/tokens.json",
        jsonPointer: "/color/canvas",
        referringOrigin: { documentUri: resolverUri, jsonPointer: "" },
      },
    })
  })

  it("canonicalizes document and reference URIs before exact map lookup", () => {
    const documents = indexedDocuments({
      "https://EXAMPLE.test:443/design/../tokens.json": { color: "#123456" },
    })
    const result = resolveDtcgReference("../tokens.json#/color", resolverUri, documents, referringOrigin)

    expect(result).toMatchObject({
      ok: true,
      value: {
        value: "#123456",
        documentUri: "https://example.test/tokens.json",
        jsonPointer: "/color",
      },
    })
  })

  it("resolves an empty fragment to the document root", () => {
    const root = { color: { canvas: "#ffffff" } } satisfies DtcgJsonObject
    const documents = indexedDocuments({ "https://example.test/tokens.json": root })
    const result = resolveDtcgReference("https://example.test/tokens.json#", resolverUri, documents, referringOrigin)

    expect(result).toMatchObject({
      ok: true,
      value: {
        value: root,
        documentUri: "https://example.test/tokens.json",
        jsonPointer: "",
      },
    })
  })

  it("decodes nested RFC 6901 tilde and slash escapes", () => {
    const documents = indexedDocuments({
      "https://example.test/tokens.json": { "a/b": { "~key": "found" } },
    })
    const result = resolveDtcgReference("https://example.test/tokens.json#/a~1b/~0key", resolverUri, documents, referringOrigin)

    expect(result).toMatchObject({
      ok: true,
      value: { value: "found", jsonPointer: "/a~1b/~0key" },
    })
  })

  it("percent-decodes a URI fragment before traversing its JSON Pointer", () => {
    const documents = indexedDocuments({
      "https://example.test/tokens.json": { "space value": "found" },
    })
    const result = resolveDtcgReference("https://example.test/tokens.json#/space%20value", resolverUri, documents, referringOrigin)

    expect(result).toMatchObject({
      ok: true,
      value: { value: "found", jsonPointer: "/space value" },
    })
  })

  it("rejects malformed URI fragments and JSON Pointer escapes at the referring origin", () => {
    const documents = indexedDocuments({ "https://example.test/tokens.json": { color: "#ffffff" } })
    for (const reference of [
      "https://example.test/tokens.json#not-a-pointer",
      "https://example.test/tokens.json#/color~2name",
      "https://example.test/tokens.json#/%E0%A4%A",
    ]) {
      const result = resolveDtcgReference(reference, resolverUri, documents, referringOrigin)

      expectFailure(result, "format.structure-invalid")
      expect(result.diagnostics[0]).toMatchObject({
        documentUri: resolverUri,
        jsonPointer: "/$sets/0/sources/1",
      })
    }
  })

  it("rejects two supplied keys that normalize to the same canonical URI", () => {
    const result = indexDtcgDocuments({
      "https://example.test:443/design/../tokens.json": { color: "#ffffff" },
      "https://EXAMPLE.test/tokens.json": { color: "#000000" },
    })

    expectFailure(result, "input.invalid")
    expect(result.diagnostics[0]).toMatchObject({
      documentUri: "https://example.test/tokens.json",
      jsonPointer: "",
    })
  })

  it("reports absent documents and pointers at the referring origin without fallback", () => {
    const documents = indexedDocuments({ "https://example.test/tokens.json": { color: "#ffffff" } })
    const originalFetch = globalThis.fetch
    let fetchCalls = 0
    globalThis.fetch = (() => {
      fetchCalls += 1
      throw new Error("unexpected network access")
    }) as unknown as typeof fetch
    try {
      const missingDocument = resolveDtcgReference(
        "https://example.test/not-supplied.json#/color",
        resolverUri,
        documents,
        referringOrigin,
      )
      const missingPointer = resolveDtcgReference(
        "https://example.test/tokens.json#/color/missing",
        resolverUri,
        documents,
        referringOrigin,
      )

      for (const result of [missingDocument, missingPointer]) {
        expectFailure(result, "reference.missing")
        expect(result.diagnostics[0]).toMatchObject({
          documentUri: resolverUri,
          jsonPointer: "/$sets/0/sources/1",
        })
      }
      expect(fetchCalls).toBe(0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
