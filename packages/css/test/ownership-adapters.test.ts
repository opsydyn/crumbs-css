import { describe, expect, it } from "bun:test"
import { decodeManifest } from "../src/tooling/manifest/schema"
import { tokenVariableName } from "../src/tokens/identity"
import type { ManifestContractIdentity, ManifestToken } from "../src/tooling/manifest/model"
import { OWNERSHIP_MAX_REPORT_REFERENCES } from "../src/tooling/ownership/model"

const MAX_REPORT_REFERENCES = OWNERSHIP_MAX_REPORT_REFERENCES

const packageName = "@acme/design-system"
const contract: ManifestContractIdentity = { owner: packageName, name: "foundation", version: 1 }
const tokenId = `${packageName}#token:color.accent`
const tokenPath = ["color", "accent"]
const tokenName = tokenVariableName(contract, tokenPath)

async function getAnnotateApi() {
  let api: typeof import("../src/tooling/ownership/annotate") | undefined
  try {
    api = await import("../src/tooling/ownership/annotate")
  } catch {
    api = undefined
  }
  expect(api?.annotateDesignSystemReport).toBeDefined()
  return api!
}

function manifest(version: string, tokens: ReadonlyArray<ManifestToken> = [] ) {
  const roots = new Map<string, { readonly kind: "token-contract"; readonly id: string }>()
  for (const entry of tokens) {
    const id = `${entry.contract.owner}#${entry.contract.name}@${entry.contract.version}`
    roots.set(id, { kind: "token-contract", id })
  }
  roots.set(`${contract.owner}#${contract.name}@${contract.version}`, {
    kind: "token-contract",
    id: `${contract.owner}#${contract.name}@${contract.version}`,
  })
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
    coverage: { roots: [...roots.values()], unresolved: [] },
  })
}

function token(id: string, path: ReadonlyArray<string> = tokenPath): ManifestToken {
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

function ownership(assignments: ReadonlyArray<{ readonly entityId: string; readonly ownerId: string }> = []) {
  return {
    format: "crumbs.design-system-ownership" as const,
    schemaVersion: 1 as const,
    owners: [{ id: "team:tokens", displayName: "Tokens" }],
    assignments,
  }
}

function dtcgResult(overrides: Record<string, unknown> = {}) {
  const origin = { documentUri: "https://example.test/tokens.json", jsonPointer: "/color/accent/$value" }
  return {
    ok: true,
    value: {
      format: "crumbs.dtcg-theme-import",
      schemaVersion: 1,
      payload: {
        _tag: "CrumbsTokenTheme",
        version: 1,
        contract,
        values: { [tokenId]: "#fff" },
      },
      sidecar: {
        format: "crumbs.dtcg-theme-import-metadata",
        schemaVersion: 1,
        contract,
        formatProfile: "2025.10",
        resolverVersion: "2025.10",
        resolverUri: "https://example.test/resolver.json",
        modifiers: {},
        tokens: [{
          tokenId,
          path: tokenPath,
          visibility: "public",
          origin,
          sourceChain: [origin],
          sourceValue: "#fff",
          metadata: {},
          groupMetadata: [],
        }],
      },
    },
    diagnostics: [{
      code: "token.unmapped",
      severity: "warning",
      message: "Token could not be mapped.",
      crumbsTokenId: tokenId,
    }, {
      code: "format.structure-invalid",
      severity: "error",
      message: "A document-only diagnostic.",
      documentUri: "https://example.test/tokens.json",
    }],
    ...overrides,
  }
}

function styleReport(dependencies: {
  readonly declaredTokens?: ReadonlyArray<string>
  readonly activeTokens?: ReadonlyArray<string>
  readonly changedTokens?: ReadonlyArray<string>
} = {}, version = 1) {
  return {
    $$type: "crumbs.css.style-explanation",
    version,
    target: { exportPath: ["Card", "root"] },
    resolution: { value: null, branches: [] },
    conditions: { decisions: [], expressionMatches: [] },
    composition: { properties: [] },
    dependencies: {
      declaredTokens: dependencies.declaredTokens ?? [],
      activeTokens: dependencies.activeTokens ?? [],
      changedTokens: dependencies.changedTokens ?? [],
    },
    transition: { status: "not-compared", changedInputs: [], affectedPaths: [] },
    coverage: { status: "complete", reasons: [] },
  }
}

describe("ownership DTCG and style-explanation adapters", () => {
  it("normalizes successful DTCG imports and attributes sidecar tokens and diagnostic IDs", async () => {
    const api = await getAnnotateApi()
    const report = dtcgResult()
    const owned = api.annotateDesignSystemReport({
      ownership: ownership([{ entityId: tokenId, ownerId: "team:tokens" }]),
      manifests: [manifest("1.0.0", [token(tokenId)])],
      report: report as never,
    })

    expect(owned.source).toMatchObject({ format: "crumbs.dtcg-import-result", schemaVersion: 1 })
    expect(JSON.stringify(owned.source.data)).toBe(JSON.stringify(report))
    expect(owned.attributions).toEqual([
      { jsonPointer: "/diagnostics/0/crumbsTokenId", entityId: tokenId, status: "assigned", owner: { id: "team:tokens", displayName: "Tokens" } },
      { jsonPointer: "/diagnostics/1", status: "unresolved", reason: "stable-id-unavailable" },
      { jsonPointer: "/value/sidecar/tokens/0/tokenId", entityId: tokenId, status: "assigned", owner: { id: "team:tokens", displayName: "Tokens" } },
    ])
  })

  it("normalizes DTCG failures without top-level format tags", async () => {
    const api = await getAnnotateApi()
    const report = {
      ok: false,
      diagnostics: [{ code: "format.structure-invalid", severity: "error", message: "Invalid token document." }],
    }
    const owned = api.annotateDesignSystemReport({
      ownership: ownership(),
      manifests: [manifest("1.0.0", [token(tokenId)])],
      report: report as never,
    })

    expect(owned.source).toMatchObject({ format: "crumbs.dtcg-import-result", schemaVersion: 1, data: report })
    expect(owned.attributions).toEqual([
      { jsonPointer: "/diagnostics/0", status: "unresolved", reason: "stable-id-unavailable" },
    ])
  })

  it("rejects malformed DTCG success and failure results and unsupported import versions", async () => {
    const api = await getAnnotateApi()
    const input = {
      ownership: ownership(),
      manifests: [manifest("1.0.0", [token(tokenId)])],
    }
    expect(() => api.annotateDesignSystemReport({ ...input, report: dtcgResult({ ok: "yes" }) as never })).toThrow(/DTCG import result/i)
    expect(() => api.annotateDesignSystemReport({
      ...input,
      report: dtcgResult({ value: { ...(dtcgResult() as { value: object }).value, schemaVersion: 2 } }) as never,
    })).toThrow(/DTCG import result/i)
    expect(() => api.annotateDesignSystemReport({
      ...input,
      report: { ok: false, diagnostics: [{ code: "format.structure-invalid", severity: "fatal", message: "Invalid." }] } as never,
    })).toThrow(/DTCG import result/i)
  })

  it("rejects mismatched DTCG contracts and payload values without sidecar provenance", async () => {
    const api = await getAnnotateApi()
    const input = {
      ownership: ownership(),
      manifests: [manifest("1.0.0", [token(tokenId)])],
    }
    const mismatched = dtcgResult() as unknown as {
      value: { payload: { contract: ManifestContractIdentity } }
    }
    mismatched.value.payload.contract = { owner: "@acme/other", name: "foundation", version: 1 }
    expect(() => api.annotateDesignSystemReport({ ...input, report: mismatched as never })).toThrow(/payload contract/i)

    const unproven = dtcgResult() as unknown as {
      value: { payload: { values: Record<string, string> } }
    }
    unproven.value.payload.values["token:unproven"] = "value"
    expect(() => api.annotateDesignSystemReport({ ...input, report: unproven as never })).toThrow(/sidecar provenance/i)
  })

  it("requires the successful DTCG sidecar contract to be covered by supplied manifests", async () => {
    const api = await getAnnotateApi()
    expect(() => api.annotateDesignSystemReport({
      ownership: ownership(),
      manifests: [manifest("1.0.0", [])],
      report: dtcgResult() as never,
    })).not.toThrow()
    expect(() => api.annotateDesignSystemReport({
      ownership: ownership(),
      manifests: [decodeManifest({
        ...manifest("1.0.0", []),
        coverage: { roots: [], unresolved: [] },
      })],
      report: dtcgResult() as never,
    })).toThrow(/contract/i)
  })

  it("matches exact generated variables in declared, active, and changed style dependencies", async () => {
    const api = await getAnnotateApi()
    const owned = api.annotateDesignSystemReport({
      ownership: ownership([{ entityId: tokenId, ownerId: "team:tokens" }]),
      manifests: [manifest("1.0.0", [token(tokenId)])],
      report: styleReport({ declaredTokens: [tokenName], activeTokens: [tokenName], changedTokens: [tokenName] }) as never,
    })

    expect(owned.source).toMatchObject({ format: "crumbs.css.style-explanation", schemaVersion: 1 })
    expect(owned.attributions).toEqual([
      { jsonPointer: "/dependencies/activeTokens/0", entityId: tokenId, status: "assigned", owner: { id: "team:tokens", displayName: "Tokens" } },
      { jsonPointer: "/dependencies/changedTokens/0", entityId: tokenId, status: "assigned", owner: { id: "team:tokens", displayName: "Tokens" } },
      { jsonPointer: "/dependencies/declaredTokens/0", entityId: tokenId, status: "assigned", owner: { id: "team:tokens", displayName: "Tokens" } },
    ])
  })

  it("leaves missing and ambiguous style variables unresolved with stable reasons", async () => {
    const api = await getAnnotateApi()
    const duplicateOne = token("token:one")
    const duplicateTwo = token("token:two")
    const missingName = tokenVariableName(contract, ["color", "missing"])
    const owned = api.annotateDesignSystemReport({
      ownership: ownership(),
      manifests: [manifest("1.0.0", [duplicateOne]), manifest("2.0.0", [duplicateTwo])],
      report: styleReport({ declaredTokens: [tokenName, missingName] }) as never,
    })

    expect(owned.attributions).toEqual([
      { jsonPointer: "/dependencies/declaredTokens/0", status: "unresolved", reason: "variable-name-ambiguous" },
      { jsonPointer: "/dependencies/declaredTokens/1", status: "unresolved", reason: "entity-not-in-supplied-manifests" },
    ])
  })

  it("rejects unsupported style-explanation versions", async () => {
    const api = await getAnnotateApi()
    expect(() => api.annotateDesignSystemReport({
      ownership: ownership(),
      manifests: [manifest("1.0.0", [token(tokenId)])],
      report: styleReport({ declaredTokens: [tokenName] }, 2) as never,
    })).toThrow(/style explanation/i)
  })

  it("uses RFC 6901 escaping for pointer segments", async () => {
    const adapters = await import("../src/tooling/ownership/report-adapters")
    expect(adapters.toJsonPointer(["a~b", "c/d"])).toBe("/a~0b/c~1d")
  })

  it("accepts exactly the report-reference cap", async () => {
    const api = await getAnnotateApi()
    expect(OWNERSHIP_MAX_REPORT_REFERENCES).toBe(100_000)
    const variables = new Array<string>(MAX_REPORT_REFERENCES).fill(tokenName)
    const owned = api.annotateDesignSystemReport({
      ownership: ownership(),
      manifests: [manifest("1.0.0", [token(tokenId)])],
      report: styleReport({ declaredTokens: variables }) as never,
    })
    expect(owned.attributions).toHaveLength(MAX_REPORT_REFERENCES)
  })

  it("fails explicitly above the report-reference cap", async () => {
    const api = await getAnnotateApi()
    const variables = new Array<string>(MAX_REPORT_REFERENCES + 1).fill(tokenName)
    let caught: unknown
    try {
      api.annotateDesignSystemReport({
        ownership: ownership(),
        manifests: [manifest("1.0.0", [token(tokenId)])],
        report: styleReport({ declaredTokens: variables }) as never,
      })
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(Error)
    expect(caught).toMatchObject({
      code: "ownership.resource-limit-exceeded",
      limit: MAX_REPORT_REFERENCES,
      actual: MAX_REPORT_REFERENCES + 1,
    })
  })

  it("applies the same cap when decoding an owned-report envelope", async () => {
    const schema = await import("../src/tooling/ownership/schema")
    const report = {
      format: "crumbs.design-system-owned-report",
      schemaVersion: 1,
      source: { format: "crumbs.css.style-explanation", schemaVersion: 1, data: {} },
      ownership: { format: "crumbs.design-system-ownership", schemaVersion: 1 },
      attributions: new Array(MAX_REPORT_REFERENCES + 1).fill({
        jsonPointer: "/dependencies/declaredTokens/0",
        status: "unresolved",
        reason: "stable-id-unavailable",
      }),
      analysisLimits: [{ code: "explicit-manifests-only", message: "Only explicitly supplied manifests were analyzed." }],
    }
    expect(() => schema.decodeOwnedReport(report)).toThrow(expect.objectContaining({
      code: "ownership.resource-limit-exceeded",
      limit: MAX_REPORT_REFERENCES,
      actual: MAX_REPORT_REFERENCES + 1,
    }))
  })
})
