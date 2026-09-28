import { describe, expect, it } from "bun:test"
import { indexDtcgDocuments } from "../src/tooling/dtcg/documents"
import type { DtcgSourceSelection } from "../src/tooling/dtcg/resolver"
import { resolveDtcgTokenIndex } from "../src/tooling/dtcg/format"
import type { CrumbsDtcgDiagnostic, DtcgJsonObject } from "../src/tooling/dtcg/model"

const baseUri = "https://example.test/tokens.json"

function documents(entries: Readonly<Record<string, DtcgJsonObject>>) {
  const result = indexDtcgDocuments(entries)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error("Expected explicit DTCG documents to index")
  return result.value
}

function selection(sources: DtcgSourceSelection["sources"]): DtcgSourceSelection {
  return {
    resolverVersion: "2025.10",
    selectedModifiers: {},
    sources,
    resolutionOrder: sources.map(source => `set:${source.setName}`),
  }
}

function source(documentUri: string, jsonPointer = "", setName = "base") {
  return { documentUri, jsonPointer, setName }
}

function resolve(
  documentMap: ReadonlyMap<string, DtcgJsonObject>,
  ...sources: DtcgSourceSelection["sources"]
) {
  return resolveDtcgTokenIndex(selection(sources), documentMap)
}

function token(result: ReturnType<typeof resolve>, path: ReadonlyArray<string>) {
  if (!result.ok) throw new Error(`Expected token index, got ${result.diagnostics[0]?.code}`)
  return result.value.get(JSON.stringify(path))
}

function expectFailure(
  result: ReturnType<typeof resolve>,
  code: CrumbsDtcgDiagnostic["code"],
) {
  expect(result.ok).toBe(false)
  expect(result.diagnostics).toHaveLength(1)
  expect(result.diagnostics[0]?.code).toBe(code)
  expect(Object.hasOwn(result, "value")).toBe(false)
}

describe("DTCG Format token graph", () => {
  it("applies resolver source order with complete token replacement and winning origin", () => {
    const overrideUri = "https://example.test/override.json"
    const docs = documents({
      [baseUri]: {
        color: {
          $type: "color",
          primary: { $value: "#0055aa", $description: "Base primary" },
          surface: { $value: "#ffffff" },
        },
      },
      [overrideUri]: {
        color: {
          primary: {
            $value: "#112233",
            $description: "Brand primary",
            $extensions: { "com.example.tokens": { source: ["design", "reviewed"] } },
          },
        },
      },
    })

    const result = resolve(docs, source(baseUri), source(overrideUri, "", "theme"))
    expect(token(result, ["color", "primary"])).toMatchObject({
      path: ["color", "primary"],
      value: "#112233",
      type: "color",
      origin: { documentUri: overrideUri, jsonPointer: "/color/primary" },
      metadata: {
        description: "Brand primary",
        extensions: { "com.example.tokens": { source: ["design", "reviewed"] } },
      },
    })
    expect(token(result, ["color", "surface"])).toMatchObject({
      value: "#ffffff",
      origin: { documentUri: baseUri, jsonPointer: "/color/surface" },
    })
    expect(token(result, ["color", "primary"])?.sourceChain).toContainEqual({
      documentUri: baseUri,
      jsonPointer: "/color/primary",
    })
  })

  it("retains Resolver reference hops in each token's ordered source chain", () => {
    const resolverUri = "https://example.test/resolver.json"
    const docs = documents({ [baseUri]: { color: { primary: { $type: "color", $value: "blue" } } } })
    const selected: DtcgSourceSelection = {
      ...selection([source(baseUri)]),
      sources: [{
        ...source(baseUri),
        sourceChain: [
          { documentUri: resolverUri, jsonPointer: "/resolutionOrder/0" },
          { documentUri: resolverUri, jsonPointer: "/sets/foundation" },
          { documentUri: resolverUri, jsonPointer: "/sets/foundation/sources/0" },
          { documentUri: baseUri, jsonPointer: "" },
        ],
      }],
    }
    const result = resolveDtcgTokenIndex(selected, docs)

    expect(token(result, ["color", "primary"])?.sourceChain).toContainEqual({
      documentUri: resolverUri,
      jsonPointer: "/sets/foundation/sources/0",
    })
  })

  it("deeply extends groups, inherits types, and lets local nested tokens replace whole definitions", () => {
    const docs = documents({
      [baseUri]: {
        palette: {
          $type: "color",
          $description: "Base palette",
          primary: { $value: "blue", $description: "Inherited primary" },
          nested: {
            accent: { $value: "pink", $deprecated: true },
            retained: { $value: "violet" },
          },
        },
        semantic: {
          $extends: "{palette}",
          $description: "Semantic palette",
          nested: {
            accent: { $value: "red", $description: "Replaced token" },
            success: { $value: "green" },
          },
        },
      },
    })

    const result = resolve(docs, source(baseUri))
    expect(token(result, ["semantic", "primary"])).toMatchObject({ value: "blue", type: "color" })
    expect(token(result, ["semantic", "nested", "accent"])).toMatchObject({
      value: "red",
      type: "color",
      metadata: { description: "Replaced token" },
    })
    expect(token(result, ["semantic", "nested", "retained"])).toMatchObject({ value: "violet", type: "color" })
    expect(token(result, ["semantic", "nested", "success"])).toMatchObject({ value: "green", type: "color" })
    expect(token(result, ["semantic", "nested", "accent"])?.groupMetadata).toContainEqual({
      path: ["semantic"],
      metadata: { description: "Semantic palette" },
    })
  })

  it("supports JSON Pointer group extension and preserves inherited group metadata and extensions", () => {
    const docs = documents({
      [baseUri]: {
        base: {
          $type: "dimension",
          $description: "Base spacing",
          $deprecated: "Use the new spacing scale",
          $extensions: { "com.example.base": { kept: true, nested: { base: 1 } } },
          small: { $value: "4px" },
        },
        compact: {
          $extends: "#/base",
          $description: "Compact spacing",
          $extensions: { "com.example.local": { nested: { local: 2 } }, "com.example.base": { nested: { local: 3 } } },
          medium: { $value: "8px" },
        },
      },
    })

    const result = resolve(docs, source(baseUri))
    expect(token(result, ["compact", "small"])).toMatchObject({ type: "dimension", value: "4px" })
    expect(token(result, ["compact", "small"])?.groupMetadata).toContainEqual({
      path: ["compact"],
      metadata: {
        description: "Compact spacing",
        deprecated: true,
        deprecationMessage: "Use the new spacing scale",
        extensions: {
          "com.example.base": { kept: true, nested: { base: 1, local: 3 } },
          "com.example.local": { nested: { local: 2 } },
        },
      },
    })
  })

  it("uses explicit token type before inherited group type", () => {
    const docs = documents({
      [baseUri]: {
        values: {
          $type: "color",
          inherited: { $value: "blue" },
          overridden: { $type: "dimension", $value: "12px" },
        },
      },
    })

    const result = resolve(docs, source(baseUri))
    expect(token(result, ["values", "inherited"])?.type).toBe("color")
    expect(token(result, ["values", "overridden"])?.type).toBe("dimension")
  })

  it("maps a DTCG $root token to the containing group path", () => {
    const docs = documents({
      [baseUri]: {
        space: {
          $type: "dimension",
          $root: { $value: "16px" },
          small: { $value: "8px" },
        },
      },
    })

    const result = resolve(docs, source(baseUri))
    expect(token(result, ["space"])).toMatchObject({ path: ["space"], value: "16px", type: "dimension" })
    if (result.ok) expect(result.value.has(JSON.stringify(["space", "$root"]))).toBe(false)
  })

  it("resolves curly-brace token aliases and chained aliases after source merging", () => {
    const docs = documents({
      [baseUri]: {
        base: { $type: "color", primary: { $value: "blue" } },
        semantic: {
          $type: "color",
          accent: { $value: "{base.primary}" },
          link: { $value: "{semantic.accent}" },
        },
      },
    })

    const result = resolve(docs, source(baseUri))
    expect(token(result, ["semantic", "accent"])).toMatchObject({ value: "blue", type: "color" })
    expect(token(result, ["semantic", "link"])).toMatchObject({ value: "blue", type: "color" })
    expect(token(result, ["semantic", "link"])?.sourceChain).toContainEqual({
      documentUri: baseUri,
      jsonPointer: "/base/primary",
    })
  })

  it("resolves JSON Pointer aliases, including escaped path segments", () => {
    const docs = documents({
      [baseUri]: {
        "tone/shade~": { $type: "number", "$value": 0.4 },
        aliases: {
          escaped: { $ref: "#/tone~1shade~0/$value" },
        },
      },
    })

    const result = resolve(docs, source(baseUri))
    expect(token(result, ["aliases", "escaped"])).toMatchObject({ value: 0.4, type: "number" })
    expect(token(result, ["aliases", "escaped"])?.origin).toEqual({ documentUri: baseUri, jsonPointer: "/aliases/escaped" })
  })

  it("resolves property-level JSON Pointers and inherits types from external token targets", () => {
    const aliasUri = "https://example.test/aliases.json"
    const docs = documents({
      [baseUri]: {
        color: {
          $type: "color",
          primary: { $value: { colorSpace: "srgb", components: [0.2, 0.4, 0.6] } },
        },
      },
      [aliasUri]: {
        aliases: {
          redComponent: { $type: "number", $ref: "tokens.json#/color/primary/$value/components/0" },
          externalColor: { $ref: "tokens.json#/color/primary/$value" },
        },
      },
    })

    const result = resolve(docs, source(aliasUri))
    expect(token(result, ["aliases", "redComponent"])).toMatchObject({ value: 0.2, type: "number" })
    expect(token(result, ["aliases", "externalColor"])).toMatchObject({
      value: { colorSpace: "srgb", components: [0.2, 0.4, 0.6] },
      type: "color",
    })
  })

  it("keeps path segments exact and case-sensitive", () => {
    const docs = documents({
      [baseUri]: {
        Color: { Primary: { $type: "color", $value: "navy" } },
        alias: { $type: "color", $value: "{color.Primary}" },
      },
    })

    expectFailure(resolve(docs, source(baseUri)), "token.alias-unresolved")
  })

  it("rejects dotted group and token names instead of ambiguously splitting aliases", () => {
    const docs = documents({ [baseUri]: { "invalid.name": { $value: "red", $type: "color" } } })

    const result = resolve(docs, source(baseUri))
    expectFailure(result, "format.structure-invalid")
    expect(result.diagnostics[0]).toMatchObject({
      documentUri: baseUri,
      jsonPointer: "/invalid.name",
      dtcgPath: ["invalid.name"],
    })
  })

  it("reports missing aliases and alias type mismatches with origins and chains", () => {
    const missingDocs = documents({
      [baseUri]: { semantic: { primary: { $type: "color", $value: "{colors.missing}" } } },
    })
    const missing = resolve(missingDocs, source(baseUri))
    expectFailure(missing, "token.alias-unresolved")
    expect(missing.diagnostics[0]).toMatchObject({ documentUri: baseUri, jsonPointer: "/semantic/primary", dtcgPath: ["semantic", "primary"] })

    const mismatchDocs = documents({
      [baseUri]: {
        color: { $type: "color", primary: { $value: "blue" } },
        semantic: { accent: { $type: "dimension", $value: "{color.primary}" } },
      },
    })
    const mismatch = resolve(mismatchDocs, source(baseUri))
    expectFailure(mismatch, "token.alias-domain-mismatch")
    expect(mismatch.diagnostics[0]?.referenceChain).toEqual(["semantic.accent", "color.primary"])
  })

  it("reports alias and group-extension cycles without returning partial indexes", () => {
    const aliasDocs = documents({
      [baseUri]: {
        first: { $value: "{second}", $type: "color" },
        second: { $value: "{first}", $type: "color" },
      },
    })
    expectFailure(resolve(aliasDocs, source(baseUri)), "token.alias-cycle")

    const extendsDocs = documents({
      [baseUri]: {
        first: { $extends: "{second}" },
        second: { $extends: "{first}" },
      },
    })
    expectFailure(resolve(extendsDocs, source(baseUri)), "format.cycle")
  })

  it("fails safely when an alias graph exceeds its fixed traversal-depth bound", () => {
    const data: Record<string, unknown> = {}
    for (let index = 0; index < 258; index += 1) {
      const name = `token-${String(index).padStart(3, "0")}`
      data[name] = index === 257
        ? { $type: "number", $value: 1 }
        : { $type: "number", $value: `{token-${String(index + 1).padStart(3, "0")}}` }
    }
    const docs = documents({ [baseUri]: data as DtcgJsonObject })

    expectFailure(resolve(docs, source(baseUri)), "resource.limit-exceeded")
  })

  it("preserves token metadata and unrelated extension JSON", () => {
    const docs = documents({
      [baseUri]: {
        color: {
          $type: "color",
          $description: "Brand colors",
          $deprecated: false,
          $extensions: { "com.example.group": { data: [1, null, { keep: true }] } },
          accent: {
            $value: "orange",
            $description: "Action accent",
            $deprecated: "Use action.primary instead",
            $extensions: { "com.example.token": { untouched: ["x", { y: 2 }] } },
          },
        },
      },
    })

    const result = resolve(docs, source(baseUri))
    expect(token(result, ["color", "accent"])).toMatchObject({
      metadata: {
        description: "Action accent",
        deprecated: true,
        deprecationMessage: "Use action.primary instead",
        extensions: { "com.example.token": { untouched: ["x", { y: 2 }] } },
      },
      groupMetadata: [{
        path: ["color"],
        metadata: {
          description: "Brand colors",
          deprecated: false,
          extensions: { "com.example.group": { data: [1, null, { keep: true }] } },
        },
      }],
    })
  })
})
