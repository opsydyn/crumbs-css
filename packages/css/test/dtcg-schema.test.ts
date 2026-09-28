import { describe, expect, it } from "bun:test"
import {
  decodeCrumbsDtcgResolverVersion,
  decodeDtcgImportRequest,
} from "../src/tooling/dtcg/schema"

const documentUri = "https://example.test/tokens.json"
const contractIdentity = { owner: "@example/design-system", name: "foundation", version: 1 }
const manifest = {
  format: "crumbs.design-system-manifest",
  schemaVersion: 1,
  package: { name: "@example/design-system", version: "1.0.0" },
  producer: {
    compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
    artifact: { name: "crumbs.native-style-artifact", version: 1 },
  },
  tokens: [],
  components: [],
  modules: [],
  dependencies: [],
  capabilities: [],
  coverage: { roots: [], unresolved: [] },
} as const

type RequestFixture = {
  resolver: Record<string, unknown>
  resolverUri: string
  documents: Record<string, Record<string, unknown>>
  manifest: typeof manifest
  contractIdentity: typeof contractIdentity
}

function validRequest(): RequestFixture {
  return {
    resolver: { $schema: "https://design-tokens.github.io/community-group/format/resolver.schema.json" },
    resolverUri: "https://example.test/resolver.json",
    documents: { [documentUri]: { color: { canvas: { $type: "color", $value: "#ffffff" } } } },
    manifest,
    contractIdentity,
  }
}

function expectFailureCode(result: { readonly ok: boolean; readonly diagnostics: ReadonlyArray<{ readonly code: string }> }, code: string) {
  expect(result.ok).toBe(false)
  expect(result.diagnostics).toHaveLength(1)
  expect(result.diagnostics[0]?.code).toBe(code)
  expect(Object.hasOwn(result, "value")).toBe(false)
}

describe("DTCG tooling input boundary", () => {
  it("accepts and preserves the three supported Crumbs Resolver version literals", () => {
    for (const version of ["2025-10-01", "2025-11-01", "2025.10"] as const) {
      expect(decodeCrumbsDtcgResolverVersion(version)).toEqual({
        ok: true,
        value: version,
        diagnostics: [],
      })
    }
  })

  it("reports a stable unsupported-version diagnostic", () => {
    const result = decodeCrumbsDtcgResolverVersion("2024-01-01")

    expectFailureCode(result, "resolver.version-unsupported")
    expect(result.diagnostics[0]).toMatchObject({
      severity: "error",
      message: "Unsupported Crumbs DTCG Resolver version.",
    })
  })

  it("returns a detached request snapshot for valid plain JSON data", () => {
    const input = validRequest()
    const result = decodeDtcgImportRequest(input)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error("Expected the DTCG request to decode")
    expect(result.value.documents[documentUri]).toEqual({
      color: { canvas: { $type: "color", $value: "#ffffff" } },
    })
    expect(result.value.documents[documentUri]).not.toBe(input.documents[documentUri])
    expect(result.diagnostics).toEqual([])
  })

  it("returns one stable input diagnostic and no partial value for malformed requests", () => {
    const result = decodeDtcgImportRequest({ ...validRequest(), resolverUri: "/relative/resolver.json" })

    expectFailureCode(result, "input.invalid")
    expect(result.diagnostics[0]).toMatchObject({
      severity: "error",
      message: "Invalid DTCG import request.",
    })
  })

  it("rejects inherited fields without reading them", () => {
    const input = Object.assign(Object.create({ inherited: true }), validRequest())
    const result = decodeDtcgImportRequest(input)

    expectFailureCode(result, "input.invalid")
  })

  it("rejects accessors without invoking their getter", () => {
    const input = validRequest()
    let getterCalls = 0
    Object.defineProperty(input.resolver, "hidden", {
      enumerable: true,
      get() {
        getterCalls += 1
        return "should not be read"
      },
    })

    const result = decodeDtcgImportRequest(input)

    expectFailureCode(result, "input.invalid")
    expect(getterCalls).toBe(0)
  })

  it("rejects sparse arrays in extension data", () => {
    const input = validRequest()
    const sparse = ["one", , "three"]
    input.documents[documentUri]!.$extensions = { "com.example": { values: sparse } }

    expectFailureCode(decodeDtcgImportRequest(input), "input.invalid")
  })

  it("rejects cyclic input", () => {
    const input = validRequest()
    const cycle: Record<string, unknown> = {}
    cycle.self = cycle
    input.documents[documentUri]!.$extensions = { "com.example": cycle }

    expectFailureCode(decodeDtcgImportRequest(input), "input.invalid")
  })

  it("rejects non-finite JSON numbers", () => {
    const input = validRequest()
    input.documents[documentUri]!.$extensions = { "com.example": { value: Number.NaN } }

    expectFailureCode(decodeDtcgImportRequest(input), "input.invalid")
  })

  it("rejects non-JSON extension values", () => {
    const input = validRequest()
    input.documents[documentUri]!.$extensions = { "com.example": { value: new Date(0) } }

    expectFailureCode(decodeDtcgImportRequest(input), "input.invalid")
  })

  it("reports resource.limit-exceeded beyond the 100,000-node input bound", () => {
    const input = validRequest()
    input.documents[documentUri]!.large = Array.from({ length: 100_100 }, (_, index) => index)

    expectFailureCode(decodeDtcgImportRequest(input), "resource.limit-exceeded")
  })

  it("reports resource.limit-exceeded beyond the 256-container depth bound", () => {
    const input = validRequest()
    let nested: unknown = true
    for (let index = 0; index < 260; index += 1) nested = { next: nested }
    input.documents[documentUri]!.deep = nested

    expectFailureCode(decodeDtcgImportRequest(input), "resource.limit-exceeded")
  })
})
