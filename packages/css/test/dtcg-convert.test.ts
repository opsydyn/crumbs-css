import { describe, expect, it } from "bun:test"
import { decodeManifest } from "../src/tooling/manifest/schema"
import type { ManifestContractIdentity, ManifestToken, ManifestTokenDomain } from "../src/tooling/manifest/model"
import { indexDtcgDocuments } from "../src/tooling/dtcg/documents"
import { resolveDtcgTokenIndex, type DtcgResolvedToken } from "../src/tooling/dtcg/format"
import { importDtcgTheme } from "../src/tooling/dtcg/import-theme"
import { convertDtcgTokenIndex } from "../src/tooling/dtcg/convert"
import type { CrumbsDtcgDiagnosticCode, CrumbsDtcgImportRequest, DtcgJsonObject, DtcgJsonValue, DtcgOperationResult } from "../src/tooling/dtcg/model"
import type { DtcgSourceSelection } from "../src/tooling/dtcg/resolver"

const identity: ManifestContractIdentity = { owner: "@example/design-system", name: "foundation", version: 1 }
const otherIdentity: ManifestContractIdentity = { owner: "@example/design-system", name: "components", version: 1 }
const resolverUri = "https://example.test/resolver.json"
const tokensUri = "https://example.test/tokens.json"
const origin = { documentUri: tokensUri, jsonPointer: "/tokens/example/$value" }

type TokenInput = {
  readonly id: string
  readonly path: ReadonlyArray<string>
  readonly domain: ManifestTokenDomain
  readonly visibility?: "public" | "private"
  readonly kind?: "definition" | "alias"
  readonly alias?: ManifestToken["alias"]
  readonly contract?: ManifestContractIdentity
}

function manifestFor(inputs: ReadonlyArray<TokenInput>, extraRoots: ReadonlyArray<ManifestContractIdentity> = []): ReturnType<typeof decodeManifest> {
  const tokens: ManifestToken[] = inputs.map(input => ({
    id: input.id,
    contract: input.contract ?? identity,
    path: [...input.path],
    visibility: input.visibility ?? "public",
    domain: input.domain,
    kind: input.kind ?? "definition",
    ...(input.alias === undefined ? {} : { alias: input.alias }),
    origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
  }))
  const contractIds = new Map<string, ManifestContractIdentity>()
  for (const item of [...inputs.map(input => input.contract ?? identity), ...extraRoots]) {
    contractIds.set(`${item.owner}#${item.name}@${item.version}`, item)
  }
  const dependencies = tokens.flatMap(token => token.alias === undefined ? [] : [{
    from: token.id,
    ...(token.alias.targetId === undefined ? {} : { to: token.alias.targetId }),
    kind: "token-alias" as const,
    resolution: token.alias.resolution,
  }])
  return decodeManifest({
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: identity.owner, version: "1.0.0" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "crumbs.native-style-artifact", version: 1 },
    },
    tokens,
    components: [],
    modules: [],
    dependencies,
    capabilities: [],
    coverage: {
      roots: [...contractIds.values()].map(item => ({
        kind: "token-contract",
        id: `${item.owner}#${item.name}@${item.version}`,
      })),
      unresolved: [],
    },
  })
}

function resolvedToken(
  path: ReadonlyArray<string>,
  type: string,
  value: DtcgJsonValue,
  options: Partial<DtcgResolvedToken> = {},
): DtcgResolvedToken {
  return {
    path: [...path],
    value,
    type,
    origin: options.origin ?? { documentUri: tokensUri, jsonPointer: `/${path.join("/")}/$value` },
    sourceChain: options.sourceChain ?? [options.origin ?? { documentUri: tokensUri, jsonPointer: `/${path.join("/")}/$value` }],
    metadata: options.metadata ?? {},
    groupMetadata: options.groupMetadata ?? [],
    ...options,
  }
}

function indexFor(entries: ReadonlyArray<DtcgResolvedToken>): ReadonlyMap<string, DtcgResolvedToken> {
  return new Map(entries.map(token => [JSON.stringify(token.path), token]))
}

function convert(
  manifest: ReturnType<typeof decodeManifest>,
  index: ReadonlyMap<string, DtcgResolvedToken>,
  options: Partial<{ readonly resolverUri: string; readonly resolverVersion: "2025-10-01" | "2025-11-01" | "2025.10"; readonly modifiers: Readonly<Record<string, string>>; readonly remBasePx: number }> = {},
) {
  return convertDtcgTokenIndex(manifest, identity, index, {
    resolverUri,
    resolverVersion: "2025.10",
    modifiers: {},
    ...options,
  })
}

function expectFailureCode<T>(result: DtcgOperationResult<T>, code: CrumbsDtcgDiagnosticCode) {
  expect(result.ok).toBe(false)
  expect(result.diagnostics.map(item => item.code)).toContain(code)
  expect(Object.hasOwn(result, "value")).toBe(false)
}

function definition(id: string, path: ReadonlyArray<string>, domain: ManifestTokenDomain, visibility: "public" | "private" = "public"): TokenInput {
  return { id, path, domain, visibility }
}

function makeRequest(
  resolver: DtcgJsonObject,
  documents: Readonly<Record<string, DtcgJsonObject>>,
  manifest: ReturnType<typeof decodeManifest>,
  overrides: Partial<CrumbsDtcgImportRequest> = {},
): CrumbsDtcgImportRequest {
  return { resolver, resolverUri, documents, manifest, contractIdentity: identity, ...overrides }
}

const sourceSelection: DtcgSourceSelection = {
  resolverVersion: "2025.10",
  selectedModifiers: {},
  sources: [{ setName: "base", documentUri: tokensUri, jsonPointer: "" }],
  resolutionOrder: ["set:base"],
}

function resolveDocument(document: DtcgJsonObject) {
  const indexed = indexDtcgDocuments({ [tokensUri]: document })
  if (!indexed.ok) throw new Error("Expected fixture documents to index")
  const result = resolveDtcgTokenIndex(sourceSelection, indexed.value)
  if (!result.ok) throw new Error(`Expected fixture token graph to resolve: ${JSON.stringify(result.diagnostics)}`)
  return result.value
}

describe("DTCG to Crumbs token conversion", () => {
  it("matches exact contract path arrays and emits public and private definitions by stable ID, omitting aliases", () => {
    const tokens: TokenInput[] = [
      definition("color.accent.id", ["color", "accent"], { kind: "color" }),
      definition("space.private.id", ["space", "private"], { kind: "length", allowNegative: false }, "private"),
      {
        id: "semantic.foreground.id",
        path: ["semantic", "foreground"],
        domain: { kind: "color" },
        kind: "alias",
        alias: { targetId: "color.accent.id", targetPath: ["color", "accent"], resolution: "internal" },
      },
    ]
    const manifest = manifestFor(tokens)
    const index = indexFor([
      resolvedToken(["color", "accent"], "color", { colorSpace: "srgb", components: [1, 0, 0] }),
      resolvedToken(["space", "private"], "dimension", { value: 12, unit: "px" }),
      resolvedToken(["semantic", "foreground"], "color", { colorSpace: "srgb", components: [1, 0, 0] }, { aliasTargetPath: ["color", "accent"] } as Partial<DtcgResolvedToken>),
    ])

    const result = convert(manifest, index)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.payload.values).toEqual({
      "color.accent.id": "rgb(255, 0, 0)",
      "space.private.id": 12,
    })
    expect(result.value.sidecar.tokens.map(token => [token.tokenId, token.visibility])).toEqual([
      ["color.accent.id", "public"],
      ["semantic.foreground.id", "public"],
      ["space.private.id", "private"],
    ])
  })

  it("requires the selected contract coverage root and exact path arrays", () => {
    const noRoot = manifestFor([])
    const noMatch = convertDtcgTokenIndex(noRoot, otherIdentity, indexFor([]), { resolverUri, resolverVersion: "2025.10", modifiers: {} })
    expectFailureCode(noMatch, "contract.definition-missing")

    const manifest = manifestFor([definition("color.id", ["Color", "accent"], { kind: "color" })])
    const wrongCase = convert(manifest, indexFor([
      resolvedToken(["color", "accent"], "color", { colorSpace: "srgb", components: [0, 0, 0] }),
    ]))
    expectFailureCode(wrongCase, "contract.definition-missing")
    expect(wrongCase.diagnostics[0]).toMatchObject({ crumbsTokenId: "color.id", dtcgPath: ["Color", "accent"] })
  })

  it("rejects a DTCG token at a Crumbs alias path unless its reference target matches", () => {
    const manifest = manifestFor([
      definition("color.base.id", ["color", "base"], { kind: "color" }),
      {
        id: "semantic.text.id",
        path: ["semantic", "text"],
        domain: { kind: "color" },
        kind: "alias",
        alias: { targetId: "color.base.id", targetPath: ["color", "base"], resolution: "internal" },
      },
    ])
    const index = indexFor([
      resolvedToken(["color", "base"], "color", { colorSpace: "srgb", components: [0, 0, 0] }),
      resolvedToken(["semantic", "text"], "color", { colorSpace: "srgb", components: [0, 0, 0] }, { aliasTargetPath: ["color", "other"] } as Partial<DtcgResolvedToken>),
    ])

    const result = convert(manifest, index)

    expectFailureCode(result, "contract.alias-mismatch")
    expect(result.diagnostics[0]).toMatchObject({
      crumbsTokenId: "semantic.text.id",
      dtcgPath: ["semantic", "text"],
      documentUri: tokensUri,
      referenceChain: ["semantic.text", "color.other", "color.base"],
    })
  })

  it("converts normalized sRGB channels and alpha, and preserves the full source color including hex fallback", () => {
    const manifest = manifestFor([
      definition("color.opaque.id", ["color", "opaque"], { kind: "color" }),
      definition("color.alpha.id", ["color", "alpha"], { kind: "color" }),
      definition("color.clear.id", ["color", "clear"], { kind: "color" }),
    ])
    const opaque = { colorSpace: "srgb", components: [0, 0.5, 1], hex: "#0080ff" }
    const alpha = { colorSpace: "srgb", components: [1, 0.25, 0], alpha: 0.5 }
    const clear = { colorSpace: "srgb", components: [0, 0, 0], alpha: 0 }
    const result = convert(manifest, indexFor([
      resolvedToken(["color", "opaque"], "color", opaque),
      resolvedToken(["color", "alpha"], "color", alpha),
      resolvedToken(["color", "clear"], "color", clear),
    ]))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.payload.values).toEqual({
      "color.alpha.id": "rgba(255, 64, 0, 0.5)",
      "color.clear.id": "rgba(0, 0, 0, 0)",
      "color.opaque.id": "rgb(0, 128, 255)",
    })
    expect(result.value.sidecar.tokens.find(token => token.tokenId === "color.opaque.id")?.sourceValue).toEqual(opaque)
  })

  it("rejects unsupported color spaces, bad components, alpha, and malformed hex fallback without using hex", () => {
    const invalidValues: ReadonlyArray<unknown> = [
      { colorSpace: "display-p3", components: [1, 0, 0], hex: "#ff0000" },
      { colorSpace: "srgb", components: [1, 0] },
      { colorSpace: "srgb", components: [1, "none", 0] },
      { colorSpace: "srgb", components: [1.01, 0, 0] },
      { colorSpace: "srgb", components: [0, 0, 0], alpha: -0.1 },
      { colorSpace: "srgb", components: [0, 0, 0], alpha: 1.1 },
      { colorSpace: "srgb", components: [0, 0, 0], hex: "#f00" },
      { colorSpace: "srgb", components: [0, 0, 0], hex: "not-a-color" },
    ]
    for (const [index, value] of invalidValues.entries()) {
      const manifest = manifestFor([definition(`color.invalid.${index}`, ["color", `invalid${index}`], { kind: "color" })])
      const result = convert(manifest, indexFor([
        resolvedToken(["color", `invalid${index}`], "color", value as DtcgJsonValue),
      ]))
      expectFailureCode(result, "token.domain-invalid")
      expect(result.diagnostics[0]).toMatchObject({ documentUri: tokensUri, crumbsTokenId: `color.invalid.${index}` })
    }
  })

  it("converts px and rem dimensions, requires an explicit positive rem base, and respects negative-length policy", () => {
    const manifest = manifestFor([
      definition("space.px.id", ["space", "px"], { kind: "length", allowNegative: false }),
      definition("space.rem.id", ["space", "rem"], { kind: "length", allowNegative: false }),
      definition("space.signed.id", ["space", "signed"], { kind: "length", allowNegative: true }),
      definition("space.negative.id", ["space", "negative"], { kind: "length", allowNegative: false }),
    ])
    const index = indexFor([
      resolvedToken(["space", "px"], "dimension", { value: 8, unit: "px" }),
      resolvedToken(["space", "rem"], "dimension", { value: 1.25, unit: "rem" }),
      resolvedToken(["space", "signed"], "dimension", { value: -2, unit: "px" }),
      resolvedToken(["space", "negative"], "dimension", { value: -2, unit: "px" }),
    ])
    expectFailureCode(convert(manifest, index), "conversion.option-invalid")

    const converted = convert(manifest, index, { remBasePx: 16 })
    expectFailureCode(converted, "token.domain-invalid")
    expect(converted.diagnostics.find(item => item.crumbsTokenId === "space.negative.id")).toMatchObject({
      code: "token.domain-invalid",
      jsonPointer: "/space/negative/$value",
    })
    expect(converted.diagnostics.some(item => item.crumbsTokenId === "space.signed.id")).toBe(false)

    const validManifest = manifestFor([
      definition("space.px.id", ["space", "px"], { kind: "length", allowNegative: false }),
      definition("space.rem.id", ["space", "rem"], { kind: "length", allowNegative: false }),
      definition("space.signed.id", ["space", "signed"], { kind: "length", allowNegative: true }),
    ])
    const valid = convert(validManifest, indexFor([
      resolvedToken(["space", "px"], "dimension", { value: 8, unit: "px" }),
      resolvedToken(["space", "rem"], "dimension", { value: 1.25, unit: "rem" }),
      resolvedToken(["space", "signed"], "dimension", { value: -2, unit: "px" }),
    ]), { remBasePx: 16 })
    expect(valid.ok).toBe(true)
    if (valid.ok) expect(valid.value.payload.values).toEqual({
      "space.px.id": 8,
      "space.rem.id": 20,
      "space.signed.id": -2,
    })

    for (const remBasePx of [0, -1, Number.POSITIVE_INFINITY, Number.NaN]) {
      expectFailureCode(convert(validManifest, index, { remBasePx }), "conversion.option-invalid")
    }
  })

  it("rejects a negative rem dimension when its Crumbs length domain disallows negatives", () => {
    const manifest = manifestFor([definition("space.id", ["space", "value"], { kind: "length", allowNegative: false })])
    const result = convert(manifest, indexFor([
      resolvedToken(["space", "value"], "dimension", { value: -1, unit: "rem" }),
    ]), { remBasePx: 16 })
    expectFailureCode(result, "token.domain-invalid")
  })

  it("converts milliseconds and seconds with finite non-negative millisecond results", () => {
    const manifest = manifestFor([
      definition("motion.ms.id", ["motion", "ms"], { kind: "duration" }),
      definition("motion.sec.id", ["motion", "seconds"], { kind: "duration" }),
    ])
    const valid = convert(manifest, indexFor([
      resolvedToken(["motion", "ms"], "duration", { value: 125, unit: "ms" }),
      resolvedToken(["motion", "seconds"], "duration", { value: 0.25, unit: "s" }),
    ]))
    expect(valid.ok).toBe(true)
    if (valid.ok) expect(valid.value.payload.values).toEqual({ "motion.ms.id": 125, "motion.sec.id": 250 })

    for (const duration of [
      { value: -1, unit: "ms" },
      { value: -0.1, unit: "s" },
      { value: Number.NaN, unit: "ms" },
      { value: Number.POSITIVE_INFINITY, unit: "ms" },
    ]) {
      const invalid = convert(manifestFor([definition("motion.id", ["motion", "value"], { kind: "duration" })]), indexFor([
        resolvedToken(["motion", "value"], "duration", duration as DtcgJsonValue),
      ]))
      expectFailureCode(invalid, "token.domain-invalid")
    }
    const overflow = convert(manifestFor([definition("motion.id", ["motion", "value"], { kind: "duration" })]), indexFor([
      resolvedToken(["motion", "value"], "duration", { value: 1e308, unit: "s" }),
    ]))
    expectFailureCode(overflow, "token.domain-invalid")
  })

  it("accepts finite opacity numbers only for opacity and rejects generic numeric domains", () => {
    const manifest = manifestFor([definition("opacity.id", ["opacity", "disabled"], { kind: "opacity" })])
    for (const value of [0, 0.5, 1]) {
      const result = convert(manifest, indexFor([resolvedToken(["opacity", "disabled"], "number", value)]))
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.payload.values["opacity.id"]).toBe(value)
    }
    for (const value of [-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectFailureCode(convert(manifest, indexFor([resolvedToken(["opacity", "disabled"], "number", value)])), "token.domain-invalid")
    }
    const number = convert(manifestFor([definition("length.id", ["space", "value"], { kind: "length", allowNegative: false })]), indexFor([
      resolvedToken(["space", "value"], "number", 4),
    ]))
    expectFailureCode(number, "token.type-unsupported")
  })

  it("accepts exact single-string fontFamily and strokeStyle enum members only", () => {
    const manifest = manifestFor([
      definition("font.id", ["font", "family"], { kind: "enum", values: ["System", "Display"] }),
      definition("stroke.id", ["line", "style"], { kind: "enum", values: ["solid", "dashed"] }),
    ])
    const accepted = convert(manifest, indexFor([
      resolvedToken(["font", "family"], "fontFamily", "System"),
      resolvedToken(["line", "style"], "strokeStyle", "dashed"),
    ]))
    expect(accepted.ok).toBe(true)
    if (accepted.ok) expect(accepted.value.payload.values).toEqual({ "font.id": "System", "stroke.id": "dashed" })

    const invalidCases: ReadonlyArray<{ readonly type: string; readonly value: DtcgJsonValue }> = [
      { type: "fontFamily", value: ["System", "Display"] },
      { type: "fontFamily", value: "system" },
      { type: "strokeStyle", value: { dashArray: [2, 1] } },
      { type: "strokeStyle", value: "dotted" },
    ]
    for (const [index, testCase] of invalidCases.entries()) {
      const path = ["enum", `value${index}`]
      const result = convert(manifestFor([definition(`enum.${index}`, path, { kind: "enum", values: ["System", "Display", "solid", "dashed"] })]), indexFor([
        resolvedToken(path, testCase.type, testCase.value),
      ]))
      expectFailureCode(result, "token.domain-invalid")
    }
  })

  it("reports unsupported scalar and composite types with token origin and domain", () => {
    const unsupported = ["fontWeight", "cubicBezier", "border", "transition", "shadow", "gradient", "typography"]
    for (const [index, type] of unsupported.entries()) {
      const path = ["unsupported", `value${index}`]
      const result = convert(manifestFor([definition(`unsupported.${index}`, path, { kind: "color" })]), indexFor([
        resolvedToken(path, type, {}),
      ]))
      expectFailureCode(result, "token.type-unsupported")
      expect(result.diagnostics[0]).toMatchObject({
        documentUri: tokensUri,
        jsonPointer: `/${path.join("/")}/$value`,
        dtcgPath: path,
        crumbsTokenId: `unsupported.${index}`,
      })
      expect(result.diagnostics[0]?.message).toContain("color domain")
    }
  })

  it("includes unrelated DTCG tokens as sorted informational diagnostics and omits partial payload on errors", () => {
    const manifest = manifestFor([
      definition("color.z.id", ["color", "z"], { kind: "color" }),
      definition("color.a.id", ["color", "a"], { kind: "color" }),
    ])
    const index = indexFor([
      resolvedToken(["unmapped", "z"], "color", { colorSpace: "srgb", components: [0, 0, 0] }, { origin: { documentUri: "https://example.test/z.json", jsonPointer: "/z" } }),
      resolvedToken(["color", "z"], "color", { colorSpace: "srgb", components: [0, 0, 0] }),
      resolvedToken(["unmapped", "a"], "color", { colorSpace: "srgb", components: [0, 0, 0] }, { origin: { documentUri: "https://example.test/a.json", jsonPointer: "/a" } }),
      resolvedToken(["color", "a"], "color", { colorSpace: "srgb", components: [0, 0, 0] }),
    ])
    const result = convert(manifest, index)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.diagnostics.map(item => [item.severity, item.documentUri, item.code])).toEqual([
      ["info", "https://example.test/a.json", "token.unmapped"],
      ["info", "https://example.test/z.json", "token.unmapped"],
    ])

    const incomplete = convert(manifest, indexFor([
      resolvedToken(["color", "z"], "color", { colorSpace: "srgb", components: [0, 0, 0] }),
      resolvedToken(["color", "a"], "color", { colorSpace: "srgb", components: [1, 1, 2] }, { origin: { documentUri: "https://example.test/a.json", jsonPointer: "/a" } }),
    ]))
    expectFailureCode(incomplete, "token.domain-invalid")
  })

  it("does not report a DTCG token used as a required definition's alias dependency as unmapped", () => {
    const manifest = manifestFor([definition("color.text.id", ["color", "text"], { kind: "color" })])
    const result = convert(manifest, indexFor([
      resolvedToken(["color", "text"], "color", { colorSpace: "srgb", components: [0.2, 0.3, 0.4] }, { aliasTargetPath: ["palette", "blue"] }),
      resolvedToken(["palette", "blue"], "color", { colorSpace: "srgb", components: [0.2, 0.3, 0.4] }),
      resolvedToken(["unused", "color"], "color", { colorSpace: "srgb", components: [0, 0, 0] }),
    ]))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.diagnostics.map(item => item.dtcgPath)).toEqual([["unused", "color"]])
  })

  it("sorts collected diagnostics by origin, then code and token ID", () => {
    const sharedOrigin = { documentUri: "https://example.test/shared.json", jsonPointer: "/shared" }
    const manifest = manifestFor([
      definition("z.id", ["color", "z"], { kind: "color" }),
      definition("a.id", ["color", "a"], { kind: "color" }),
      definition("b.id", ["font", "weight"], { kind: "color" }),
    ])
    const result = convert(manifest, indexFor([
      resolvedToken(["color", "z"], "color", { colorSpace: "display-p3", components: [1, 0, 0] }, { origin: sharedOrigin }),
      resolvedToken(["font", "weight"], "fontWeight", 500, { origin: sharedOrigin }),
      resolvedToken(["color", "a"], "color", { colorSpace: "display-p3", components: [1, 0, 0] }, { origin: sharedOrigin }),
    ]))
    expectFailureCode(result, "token.domain-invalid")
    expect(result.diagnostics.map(item => [item.documentUri, item.jsonPointer, item.code, item.crumbsTokenId])).toEqual([
      [sharedOrigin.documentUri, sharedOrigin.jsonPointer, "token.domain-invalid", "a.id"],
      [sharedOrigin.documentUri, sharedOrigin.jsonPointer, "token.domain-invalid", "z.id"],
      [sharedOrigin.documentUri, sharedOrigin.jsonPointer, "token.type-unsupported", "b.id"],
    ])
  })

  it("preserves token and group metadata, winning source origins, exact resolver literal, and modifier options", () => {
    const manifest = manifestFor([definition("color.id", ["color", "surface"], { kind: "color" }, "private")])
    const token = resolvedToken(["color", "surface"], "color", { colorSpace: "srgb", components: [0.1, 0.2, 0.3], hex: "#1a334d" }, {
      origin: { documentUri: "https://example.test/override.json", jsonPointer: "/color/surface/$value" },
      sourceChain: [
        { documentUri: resolverUri, jsonPointer: "/resolutionOrder/0" },
        { documentUri: "https://example.test/base.json", jsonPointer: "/color/surface" },
        { documentUri: "https://example.test/override.json", jsonPointer: "/color/surface" },
      ],
      metadata: { description: "Surface", deprecated: true, deprecationMessage: "Use canvas", extensions: { owner: "design" } },
      groupMetadata: [{ path: ["color"], metadata: { description: "Palette", extensions: { team: "design" } } }],
    })
    const result = convert(manifest, indexFor([token]), {
      resolverUri: "https://example.test/resolver.json",
      resolverVersion: "2025-11-01",
      modifiers: { platform: "native" },
      remBasePx: 15,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.sidecar).toMatchObject({
      contract: identity,
      formatProfile: "2025.10",
      resolverVersion: "2025-11-01",
      resolverUri,
      modifiers: { platform: "native" },
      remBasePx: 15,
      tokens: [{
        tokenId: "color.id",
        visibility: "private",
        origin: token.origin,
        sourceChain: token.sourceChain,
        metadata: token.metadata,
        groupMetadata: token.groupMetadata,
        sourceValue: token.value,
      }],
    })
  })

  it("orchestrates inline Resolver sources without I/O and validates the manifest before matching", () => {
    const manifest = manifestFor([definition("space.inline.id", ["space", "inline"], { kind: "length", allowNegative: false })])
    const request = makeRequest({
      version: "2025-10-01",
      resolutionOrder: [{
        type: "set",
        name: "inline",
        sources: [{ space: { inline: { $type: "dimension", $value: { value: 12, unit: "px" } } } }],
      }],
    }, {}, manifest)

    const result = importDtcgTheme(request)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.payload.values).toEqual({ "space.inline.id": 12 })
      expect(result.value.sidecar.resolverVersion).toBe("2025-10-01")
    }

    const invalid = importDtcgTheme({ ...request, manifest: { ...manifest, schemaVersion: 99 } } as never)
    expectFailureCode(invalid, "input.invalid")
  })

  it("orchestrates explicit URI documents and honors the selected default modifier in the sidecar", () => {
    const manifest = manifestFor([definition("color.id", ["color", "canvas"], { kind: "color" })])
    const request = makeRequest({
      version: "2025.10",
      modifiers: { platform: { default: "native", contexts: { native: [{ $ref: "https://example.test/tokens.json" }], web: [{ $ref: "https://example.test/web.json" }] } } },
      resolutionOrder: [{ $ref: "#/modifiers/platform" }],
    }, {
      [tokensUri]: { color: { canvas: { $type: "color", $value: { colorSpace: "srgb", components: [0, 0, 0] } } } },
      "https://example.test/web.json": { color: { canvas: { $type: "color", $value: { colorSpace: "srgb", components: [1, 1, 1] } } } },
    }, manifest)

    const result = importDtcgTheme(request)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.payload.values["color.id"]).toBe("rgb(0, 0, 0)")
      expect(result.value.sidecar.modifiers).toEqual({ platform: "native" })
    }
  })
})
