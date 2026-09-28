import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { decodeManifest } from "../src/tooling/manifest/schema"
import type { DesignSystemManifest, ManifestContractIdentity } from "../src/tooling/manifest/model"
import { indexDtcgDocuments } from "../src/tooling/dtcg/documents"
import { resolveDtcgTokenIndex, type DtcgResolvedToken } from "../src/tooling/dtcg/format"
import { convertDtcgTokenIndex } from "../src/tooling/dtcg/convert"
import type { DtcgJsonObject, DtcgJsonValue } from "../src/tooling/dtcg/model"
import type { DtcgSourceSelection } from "../src/tooling/dtcg/resolver"

const identity: ManifestContractIdentity = { owner: "@example/design-system", name: "properties", version: 1 }
const uri = "https://example.test/tokens.json"
const resolverUri = "https://example.test/resolver.json"
const manifest = decodeManifest({
  format: "crumbs.design-system-manifest",
  schemaVersion: 1,
  package: { name: identity.owner, version: "1.0.0" },
  producer: {
    compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
    artifact: { name: "crumbs.native-style-artifact", version: 1 },
  },
  tokens: [{
    id: "opacity.disabled.id",
    contract: identity,
    path: ["opacity", "disabled"],
    visibility: "public",
    domain: { kind: "opacity" },
    kind: "definition",
    origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
  }],
  components: [],
  modules: [],
  dependencies: [],
  capabilities: [],
  coverage: { roots: [{ kind: "token-contract", id: "@example/design-system#properties@1" }], unresolved: [] },
})

function token(value: DtcgJsonValue): DtcgResolvedToken {
  return {
    path: ["opacity", "disabled"],
    type: "number",
    value,
    origin: { documentUri: uri, jsonPointer: "/opacity/disabled/$value" },
    sourceChain: [{ documentUri: uri, jsonPointer: "/opacity/disabled/$value" }],
    metadata: {},
    groupMetadata: [],
  }
}

function converted(value: DtcgJsonValue) {
  return convertDtcgTokenIndex(manifest as DesignSystemManifest, identity, new Map([[JSON.stringify(["opacity", "disabled"]), token(value)]]), {
    resolverUri,
    resolverVersion: "2025.10",
    modifiers: {},
  })
}

function getDocuments(entries: ReadonlyArray<readonly [string, DtcgJsonObject]>) {
  const indexed = indexDtcgDocuments(Object.fromEntries(entries))
  if (!indexed.ok) throw new Error("Expected property documents to index")
  return indexed.value
}

const seed = 20260928

describe("DTCG conversion properties", () => {
  it("accepts every generated finite opacity value in the closed unit interval", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 1000 }), units => {
      const value = units / 1000
      const result = converted(value)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.payload.values["opacity.disabled.id"]).toBe(value)
    }), { seed, numRuns: 100 })
  })

  it("rejects generated opacity values immediately outside either endpoint", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 1000 }), offset => {
      expect(converted(-offset / 1000).ok).toBe(false)
      expect(converted(1 + offset / 1000).ok).toBe(false)
    }), { seed: seed + 1, numRuns: 50 })
  })

  it("produces identical payloads when resolved-token Map insertion order changes", () => {
    const paths = [["opacity", "disabled"], ["color", "canvas"], ["space", "small"]] as const
    const extraManifest = decodeManifest({
      ...manifest,
      tokens: [
        manifest.tokens[0],
        {
          id: "color.canvas.id", contract: identity, path: paths[1], visibility: "private", domain: { kind: "color" }, kind: "definition",
          origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
        },
        {
          id: "space.small.id", contract: identity, path: paths[2], visibility: "public", domain: { kind: "length", allowNegative: false }, kind: "definition",
          origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
        },
      ],
    })
    const records: ReadonlyArray<DtcgResolvedToken> = [
      token(0.75),
      { path: paths[1], type: "color", value: { colorSpace: "srgb", components: [0, 0, 0] }, origin: { documentUri: uri, jsonPointer: "/color/canvas/$value" }, sourceChain: [], metadata: {}, groupMetadata: [] },
      { path: paths[2], type: "dimension", value: { value: 8, unit: "px" }, origin: { documentUri: uri, jsonPointer: "/space/small/$value" }, sourceChain: [], metadata: {}, groupMetadata: [] },
    ]
    const makeIndex = (items: ReadonlyArray<DtcgResolvedToken>) => new Map(items.map(item => [JSON.stringify(item.path), item]))
    const options = { resolverUri, resolverVersion: "2025.10" as const, modifiers: {} }
    const forward = convertDtcgTokenIndex(extraManifest, identity, makeIndex(records), options)
    const reversed = convertDtcgTokenIndex(extraManifest, identity, makeIndex([...records].reverse()), options)
    expect(forward).toEqual(reversed)
  })

  it("canonicalizes semantically irrelevant nested object-key permutations in sidecar source data", () => {
    const colorManifest = decodeManifest({
      ...manifest,
      tokens: [{
        id: "color.canvas.id", contract: identity, path: ["color", "canvas"], visibility: "public", domain: { kind: "color" }, kind: "definition",
        origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
      }],
    })
    const origin = { documentUri: uri, jsonPointer: "/color/canvas/$value" }
    const first: DtcgResolvedToken = {
      path: ["color", "canvas"], type: "color",
      value: { colorSpace: "srgb", components: [0.1, 0.2, 0.3], hex: "#1a334d" },
      origin, sourceChain: [origin], metadata: { extensions: { z: { y: 2, x: 1 }, a: true } }, groupMetadata: [],
    }
    const second: DtcgResolvedToken = {
      path: ["color", "canvas"], type: "color",
      value: { hex: "#1a334d", components: [0.1, 0.2, 0.3], colorSpace: "srgb" },
      origin, sourceChain: [origin], metadata: { extensions: { a: true, z: { x: 1, y: 2 } } }, groupMetadata: [],
    }
    const options = { resolverUri, resolverVersion: "2025.10" as const, modifiers: {} }
    const left = convertDtcgTokenIndex(colorManifest, identity, new Map([[JSON.stringify(first.path), first]]), options)
    const right = convertDtcgTokenIndex(colorManifest, identity, new Map([[JSON.stringify(second.path), second]]), options)
    expect(JSON.stringify(left)).toBe(JSON.stringify(right))
  })

  it("uses the last Resolver source as the converted winner", () => {
    const baseUri = "https://example.test/base.json"
    const overrideUri = "https://example.test/override.json"
    const base = { opacity: { disabled: { $type: "number", $value: 0.25 } } }
    const override = { opacity: { disabled: { $type: "number", $value: 0.8 } } }
    const selection: DtcgSourceSelection = {
      resolverVersion: "2025-10-01",
      selectedModifiers: {},
      sources: [
        { setName: "base", documentUri: baseUri, jsonPointer: "" },
        { setName: "override", documentUri: overrideUri, jsonPointer: "" },
      ],
      resolutionOrder: ["set:base", "set:override"],
    }
    const index = resolveDtcgTokenIndex(selection, getDocuments([[baseUri, base], [overrideUri, override]]))
    expect(index.ok).toBe(true)
    if (!index.ok) return
    const result = convertDtcgTokenIndex(manifest, identity, index.value, { resolverUri, resolverVersion: "2025-10-01", modifiers: {} })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.payload.values["opacity.disabled.id"]).toBe(0.8)
      expect(result.value.sidecar.tokens[0]?.origin.documentUri).toBe(overrideUri)
    }
  })
})
