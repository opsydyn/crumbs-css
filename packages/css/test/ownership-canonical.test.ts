import { describe, expect, it } from "bun:test"
import { decodeManifest } from "../src/tooling/manifest/schema"
import type { ManifestContractIdentity, ManifestToken } from "../src/tooling/manifest/model"
import { tokenVariableName } from "../src/tokens/identity"

const packageName = "@acme/design-system"
const contract: ManifestContractIdentity = { owner: packageName, name: "foundation", version: 1 }
const tokenA = `${packageName}#token:a`
const tokenB = `${packageName}#token:b`

async function getOwnershipApi() {
  let api: typeof import("../src/tooling/ownership") | undefined
  try {
    api = await import("../src/tooling/ownership")
  } catch {
    api = undefined
  }
  expect(api?.encodeCanonicalOwnedReport).toBeDefined()
  expect(api?.annotateDesignSystemReport).toBeDefined()
  return api!
}

function manifest(version: string, tokens: ReadonlyArray<ManifestToken>) {
  const root = `${contract.owner}#${contract.name}@${contract.version}`
  return decodeManifest({
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: packageName, version },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "1.2.3" },
      artifact: { name: "crumbs.native-style-artifact", version: 1 },
    },
    tokens,
    components: [],
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: { roots: [{ kind: "token-contract", id: root }], unresolved: [] },
  })
}

function token(id: string, path: ReadonlyArray<string>): ManifestToken {
  return {
    id,
    contract,
    path,
    visibility: "public",
    domain: { kind: "color" },
    kind: "definition",
    origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
  }
}

function ownership(reverse = false) {
  const owners = [
    { id: "team:colors", displayName: "Colors" },
    { id: "team:surfaces", displayName: "Surfaces" },
  ]
  const assignments = [
    { entityId: tokenA, ownerId: "team:colors" },
    { entityId: tokenB, ownerId: "team:surfaces" },
  ]
  return {
    format: "crumbs.design-system-ownership" as const,
    schemaVersion: 1 as const,
    owners: reverse ? [...owners].reverse() : owners,
    assignments: reverse ? [...assignments].reverse() : assignments,
  }
}

function dtcgReport() {
  const origins = ["/color/a/$value", "/color/b/$value"]
  const tokens = [
    { id: tokenA, path: ["color", "a"] },
    { id: tokenB, path: ["color", "b"] },
  ]
  return {
    ok: true,
    value: {
      format: "crumbs.dtcg-theme-import",
      schemaVersion: 1,
      payload: {
        _tag: "CrumbsTokenTheme",
        version: 1,
        contract,
        values: { [tokenA]: "#111", [tokenB]: "#222" },
      },
      sidecar: {
        format: "crumbs.dtcg-theme-import-metadata",
        schemaVersion: 1,
        contract,
        formatProfile: "2025.10",
        resolverVersion: "2025.10",
        resolverUri: "https://example.test/resolver.json",
        modifiers: {},
        tokens: tokens.map((entry, index) => {
          const origin = { documentUri: "https://example.test/tokens.json", jsonPointer: origins[index]! }
          return {
            tokenId: entry.id,
            path: entry.path,
            visibility: "public",
            origin,
            sourceChain: [origin],
            sourceValue: index === 0 ? "#111" : "#222",
            metadata: {},
            groupMetadata: [],
          }
        }),
      },
    },
    diagnostics: [],
  }
}

describe("canonical owned reports", () => {
  it("produces identical bytes when owners, assignments, and manifests are permuted", async () => {
    const api = await getOwnershipApi()
    const report = dtcgReport()
    const before = JSON.stringify(report)
    const manifests = [
      manifest("1.0.0", [token(tokenA, ["color", "a"]), token(tokenB, ["color", "b"])]),
      manifest("2.0.0", [token(tokenA, ["color", "a"]), token(tokenB, ["color", "b"])]),
    ]
    const first = api.annotateDesignSystemReport({ ownership: ownership(), manifests, report: report as never })
    const second = api.annotateDesignSystemReport({ ownership: ownership(true), manifests: [...manifests].reverse(), report: report as never })
    const firstBytes = api.encodeCanonicalOwnedReport(first)
    const secondBytes = api.encodeCanonicalOwnedReport(second)

    expect(firstBytes).toBe(secondBytes)
    expect(firstBytes.endsWith("\n")).toBe(true)
    expect(firstBytes.endsWith("\n\n")).toBe(false)
    expect(JSON.stringify(report)).toBe(before)
    expect(JSON.parse(firstBytes).source.data.value.sidecar.tokens.map((entry: { tokenId: string }) => entry.tokenId))
      .toEqual([tokenA, tokenB])
  })

  it("sorts envelope arrays and object keys while preserving all source arrays", async () => {
    const api = await getOwnershipApi()
    const decodeOwnedReport = api.decodeOwnedReport
    const report = {
      schemaVersion: 1,
      format: "crumbs.design-system-owned-report",
      source: {
        schemaVersion: 1,
        format: "crumbs.dtcg-import-result",
        data: {
          ok: false,
          diagnostics: [
            { code: "format.structure-invalid", severity: "error", message: "Second source item." },
            { code: "input.invalid", severity: "error", message: "First source item." },
          ],
        },
      },
      ownership: { schemaVersion: 1, format: "crumbs.design-system-ownership" },
      attributions: [
        { jsonPointer: "/diagnostics/1/message", status: "unresolved", reason: "stable-id-unavailable" },
        { jsonPointer: "/diagnostics/0/message", status: "unresolved", reason: "entity-not-in-supplied-manifests" },
      ],
      analysisLimits: [
        { code: "report-subject-unresolved", message: "Unresolved references." },
        { code: "explicit-manifests-only", message: "Only explicit inputs." },
      ],
    }
    const canonical = api.encodeCanonicalOwnedReport(report as never)
    const parsed = JSON.parse(canonical)

    expect(canonical[0]).toBe("{")
    expect(parsed.attributions.map((entry: { jsonPointer: string }) => entry.jsonPointer)).toEqual([
      "/diagnostics/0/message",
      "/diagnostics/1/message",
    ])
    expect(parsed.analysisLimits.map((entry: { code: string }) => entry.code)).toEqual([
      "explicit-manifests-only",
      "report-subject-unresolved",
    ])
    expect(parsed.source.data.diagnostics.map((entry: { message: string }) => entry.message)).toEqual([
      "Second source item.",
      "First source item.",
    ])
    expect(() => decodeOwnedReport({ ...report, source: { ...report.source, format: "crumbs.unsupported" } })).toThrow(/source/i)
    expect(() => decodeOwnedReport({
      ...report,
      attributions: [{ jsonPointer: "/diagnostics/9/message", status: "unresolved", reason: "stable-id-unavailable" }],
    })).toThrow(/does not resolve in source.data/i)
  })

  it("enforces the data-depth boundary and unique attribution pointers", async () => {
    const api = await getOwnershipApi()
    const base = {
      format: "crumbs.design-system-owned-report",
      schemaVersion: 1,
      source: { format: "crumbs.dtcg-import-result", schemaVersion: 1, data: { ok: false, diagnostics: [] } },
      ownership: { format: "crumbs.design-system-ownership", schemaVersion: 1 },
      attributions: [
        { jsonPointer: "/diagnostics/0/message", status: "unresolved", reason: "stable-id-unavailable" },
        { jsonPointer: "/diagnostics/0/message", status: "unresolved", reason: "stable-id-unavailable" },
      ],
      analysisLimits: [{ code: "explicit-manifests-only", message: "Only explicit inputs." }],
    }
    expect(() => api.decodeOwnedReport(base as never)).toThrow(/duplicate attribution pointer/i)

    let nested: unknown = null
    for (let depth = 0; depth < 70; depth++) nested = { value: nested }
    expect(() => api.encodeCanonicalOwnedReport({
      ...base,
      attributions: [],
      source: { ...base.source, data: nested },
    } as never)).toThrow(/64 nested containers/i)
  })

  it("keeps the public source entry narrow and exports plain types and functions", async () => {
    const api = await getOwnershipApi()
    expect(Object.keys(api!).sort()).toEqual([
      "DESIGN_SYSTEM_OWNED_REPORT_FORMAT",
      "DESIGN_SYSTEM_OWNED_REPORT_VERSION",
      "DESIGN_SYSTEM_OWNERSHIP_FORMAT",
      "DESIGN_SYSTEM_OWNERSHIP_VERSION",
      "OWNERSHIP_ANALYSIS_LIMIT_CODES",
      "OWNERSHIP_MAX_REPORT_REFERENCES",
      "OWNERSHIP_UNRESOLVED_REASON_CODES",
      "annotateDesignSystemReport",
      "decodeDesignSystemOwnership",
      "decodeOwnedReport",
      "encodeCanonicalOwnedReport",
    ])
  })
})
