import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { decodeManifest } from "../src/tooling/manifest/schema"
import type { DesignSystemManifest, ManifestToken } from "../src/tooling/manifest/model"
import type { ManifestCompatibilityReport } from "../src/tooling/manifest/comparison-report-model"
import type { DesignSystemPolicyReport } from "../src/tooling/policy/model"
import type { SourceMigrationReport } from "../src/tooling/migrations/model"
import { decodeDesignSystemOwnership } from "../src/tooling/ownership/schema"
import type { OwnedReport, OwnershipAttribution } from "../src/tooling/ownership/model"

const PACKAGE_NAME = "@acme/design-system"
const TOKEN_ID = "@acme/design-system#token:color.accent"
const REMOVED_TOKEN_ID = "@acme/design-system#token:color.removed"

async function getAnnotateApi() {
  let api: typeof import("../src/tooling/ownership/annotate") | undefined
  try {
    api = await import("../src/tooling/ownership/annotate")
  } catch {
    api = undefined
  }
  expect(api?.annotateDesignSystemReport).toBeDefined()
  expect(api?.assertUniqueAttributionPointers).toBeDefined()
  return api!
}

async function getReportAdapters() {
  let adapters: typeof import("../src/tooling/ownership/report-adapters") | undefined
  try {
    adapters = await import("../src/tooling/ownership/report-adapters")
  } catch {
    adapters = undefined
  }
  expect(adapters?.toJsonPointer).toBeDefined()
  return adapters!
}

async function getOwnedReportDecoder() {
  let schema: typeof import("../src/tooling/ownership/schema") | undefined
  try {
    schema = await import("../src/tooling/ownership/schema")
  } catch {
    schema = undefined
  }
  expect(schema?.decodeOwnedReport).toBeDefined()
  return schema!.decodeOwnedReport
}

function token(id: string, overrides: Partial<ManifestToken> = {}): ManifestToken {
  return {
    id,
    contract: { owner: PACKAGE_NAME, name: "foundation", version: 1 },
    path: ["color", id === REMOVED_TOKEN_ID ? "removed" : "accent"],
    visibility: "public",
    domain: { kind: "color" },
    kind: "definition",
    origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
    ...overrides,
  }
}

function manifest(
  version: string,
  tokens: ReadonlyArray<ManifestToken>,
  unresolved: ReadonlyArray<{ readonly reference: string; readonly reason?: string }> = [],
): DesignSystemManifest {
  const roots = new Map<string, { readonly kind: "token-contract"; readonly id: string }>()
  for (const entry of tokens) {
    const id = `${entry.contract.owner}#${entry.contract.name}@${entry.contract.version}`
    roots.set(id, { kind: "token-contract", id })
  }
  return decodeManifest({
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: PACKAGE_NAME, version },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "1.2.3" },
      artifact: { name: "crumbs-native-style-artifact", version: 1 },
    },
    tokens,
    components: [],
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: { roots: [...roots.values()], unresolved },
  })
}

function ownership(
  assignments: ReadonlyArray<{ readonly entityId: string; readonly ownerId: string }>,
  owners: ReadonlyArray<{ readonly id: string; readonly displayName: string }> = [
    { id: "team:platform", displayName: "Platform" },
    { id: "team:tokens", displayName: "Tokens" },
  ],
) {
  return decodeDesignSystemOwnership({
    format: "crumbs.design-system-ownership",
    schemaVersion: 1,
    owners,
    assignments,
  })
}

function compatibilityReport(
  findings: ManifestCompatibilityReport["findings"],
  currentVersion = "2.0.0",
): ManifestCompatibilityReport {
  return {
    format: "crumbs.design-system-compatibility-report",
    schemaVersion: 1,
    mode: "compare",
    provider: { name: PACKAGE_NAME, baselineVersion: "1.0.0", currentVersion },
    suppliedConsumers: [],
    findings,
    analysisLimits: [],
  }
}

function policyReport(findings: DesignSystemPolicyReport["findings"], exceptionDiagnostics: DesignSystemPolicyReport["exceptionDiagnostics"] = []): DesignSystemPolicyReport {
  return {
    format: "crumbs.css.design-system-policy-report",
    schemaVersion: 1,
    provider: { name: PACKAGE_NAME, version: "1.0.0" },
    policy: { policyId: "acme.native", version: 1 },
    preset: { name: "migration", version: 1 },
    suppliedConsumers: [],
    findings,
    exceptionDiagnostics,
    analysisLimits: [],
  }
}

function migrationReport(diagnostics: SourceMigrationReport["diagnostics"]): SourceMigrationReport {
  return {
    format: "crumbs.source-migration-report",
    schemaVersion: 1,
    migration: { id: "migration:tokens-v1-v2", revision: 1 },
    provider: { name: PACKAGE_NAME, baselineVersion: "1.0.0", currentVersion: "2.0.0" },
    files: [],
    diagnostics,
    analysisLimits: [{ code: "explicit-files-only", message: "Only the named source files were checked." }],
  }
}

describe("design-system report ownership annotation", () => {
  it("preserves compatibility reports and attributes removed, changed, and unknown IDs", async () => {
    const api = await getAnnotateApi()
    const removedToken = token(REMOVED_TOKEN_ID)
    const baselineAccent = token(TOKEN_ID)
    const currentAccent = token(TOKEN_ID, {
      domain: { kind: "length", allowNegative: false },
      origin: { path: "src/foundations/spacing.css.ts", exportPath: "space" },
    })
    const manifests = [
      manifest("1.0.0", [removedToken, baselineAccent]),
      manifest("2.0.0", [currentAccent], [{ reference: "styles.unresolved", reason: "outside supplied roots" }]),
    ]
    const report = compatibilityReport([
      { code: "token.removed", level: "error", entityId: REMOVED_TOKEN_ID, fieldPath: "token", message: "Token removed.", affectedConsumers: [] },
      { code: "token.domain-changed", level: "warning", entityId: TOKEN_ID, fieldPath: "domain", message: "Token domain changed.", affectedConsumers: [] },
      { code: "token.added", level: "info", entityId: "@acme/design-system#token:color.unknown", fieldPath: "token", message: "New token.", affectedConsumers: [] },
    ])
    const original = JSON.stringify(report)
    const owned = api.annotateDesignSystemReport({
      ownership: ownership([
        { entityId: REMOVED_TOKEN_ID, ownerId: "team:tokens" },
        { entityId: TOKEN_ID, ownerId: "team:platform" },
      ]),
      manifests,
      report,
    })

    expect(owned.source).toEqual({
      format: "crumbs.design-system-compatibility-report",
      schemaVersion: 1,
      data: report,
    })
    expect(owned.source.data).not.toBe(report)
    expect(JSON.stringify(report)).toBe(original)
    expect(owned.attributions).toEqual([
      { jsonPointer: "/findings/0/entityId", entityId: REMOVED_TOKEN_ID, status: "assigned", owner: { id: "team:tokens", displayName: "Tokens" } },
      { jsonPointer: "/findings/1/entityId", entityId: TOKEN_ID, status: "assigned", owner: { id: "team:platform", displayName: "Platform" } },
      { jsonPointer: "/findings/2/entityId", entityId: "@acme/design-system#token:color.unknown", status: "unresolved", reason: "entity-not-in-supplied-manifests" },
    ])
    expect(owned.analysisLimits.map(limit => limit.code)).toEqual([
      "explicit-manifests-only",
      "manifest-unresolved-references",
      "report-subject-unresolved",
    ])
  })

  it("attributes policy subjects only when their rules identify manifest entities", async () => {
    const api = await getAnnotateApi()
    const report = policyReport([
      { ruleId: "entity.deprecated", level: "warning", subjectId: TOKEN_ID, fieldPath: "lifecycle", message: "Token is deprecated.", evidence: null, disposition: "active" },
      { ruleId: "style.literal-value", level: "warning", subjectId: TOKEN_ID, fieldPath: "style.color", message: "A literal is used.", evidence: null, disposition: "active" },
      { ruleId: "consumer.private-token", level: "error", subjectId: TOKEN_ID, fieldPath: "dependency", message: "A private token is consumed.", evidence: null, disposition: "active" },
    ], [
      { code: "exception.unused", level: "info", ruleId: "entity.deprecated", subjectId: TOKEN_ID, reason: "No matching finding." },
      { code: "exception.unused", level: "info", ruleId: "capability.not-supported", subjectId: TOKEN_ID, reason: "No matching finding." },
    ])
    const owned = api.annotateDesignSystemReport({
      ownership: ownership([{ entityId: TOKEN_ID, ownerId: "team:platform" }]),
      manifests: [manifest("1.0.0", [token(TOKEN_ID)])],
      report,
    })

    expect(owned.source.format).toBe("crumbs.css.design-system-policy-report")
    expect(owned.attributions).toEqual([
      { jsonPointer: "/exceptionDiagnostics/0/subjectId", entityId: TOKEN_ID, status: "assigned", owner: { id: "team:platform", displayName: "Platform" } },
      { jsonPointer: "/exceptionDiagnostics/1/subjectId", status: "unresolved", reason: "stable-id-unavailable" },
      { jsonPointer: "/findings/0/subjectId", entityId: TOKEN_ID, status: "assigned", owner: { id: "team:platform", displayName: "Platform" } },
      { jsonPointer: "/findings/1/subjectId", status: "unresolved", reason: "stable-id-unavailable" },
      { jsonPointer: "/findings/2/subjectId", entityId: TOKEN_ID, status: "assigned", owner: { id: "team:platform", displayName: "Platform" } },
    ])
    expect(owned.analysisLimits.some(limit => limit.code === "report-subject-unresolved")).toBe(true)
  })

  it("marks migration diagnostics without stable IDs unresolved at the diagnostic location", async () => {
    const api = await getAnnotateApi()
    const report = migrationReport([
      { code: "token.contract-path-unmapped", message: "The token could not be mapped.", entityId: TOKEN_ID },
      { code: "source.parse-error", message: "The source could not be parsed.", path: "src/styles.css.ts", line: 2, column: 1 },
    ])
    const owned = api.annotateDesignSystemReport({
      ownership: ownership([{ entityId: TOKEN_ID, ownerId: "team:tokens" }]),
      manifests: [manifest("1.0.0", [token(TOKEN_ID)]), manifest("2.0.0", [token(TOKEN_ID)])],
      report,
    })

    expect(owned.source.format).toBe("crumbs.source-migration-report")
    expect(owned.attributions).toEqual([
      { jsonPointer: "/diagnostics/0/entityId", entityId: TOKEN_ID, status: "assigned", owner: { id: "team:tokens", displayName: "Tokens" } },
      { jsonPointer: "/diagnostics/1", status: "unresolved", reason: "stable-id-unavailable" },
    ])
  })

  it("rejects provider versions missing from the explicit manifest set", async () => {
    const api = await getAnnotateApi()
    const report = compatibilityReport([
      { code: "token.removed", level: "error", entityId: TOKEN_ID, fieldPath: "token", message: "Token removed.", affectedConsumers: [] },
    ], "3.0.0")
    expect(() => api.annotateDesignSystemReport({
      ownership: ownership([]),
      manifests: [manifest("1.0.0", [token(TOKEN_ID)]), manifest("2.0.0", [token(TOKEN_ID)])],
      report,
    })).toThrow(/provider.*3\.0\.0|3\.0\.0.*manifest/i)
  })

  it("rejects unsupported source report versions", async () => {
    const api = await getAnnotateApi()
    const report = { ...compatibilityReport([]), schemaVersion: 2 } as unknown as ManifestCompatibilityReport
    expect(() => api.annotateDesignSystemReport({
      ownership: ownership([]),
      manifests: [manifest("2.0.0", [])],
      report,
    })).toThrow(/compatibility report v1/i)
  })

  it("rejects duplicate attribution pointers before assembling an owned report", async () => {
    const api = await getAnnotateApi()
    const duplicate: ReadonlyArray<OwnershipAttribution> = [
      { jsonPointer: "/findings/0/entityId", entityId: TOKEN_ID, status: "unassigned" },
      { jsonPointer: "/findings/0/entityId", entityId: REMOVED_TOKEN_ID, status: "unassigned" },
    ]
    expect(() => api.assertUniqueAttributionPointers(duplicate)).toThrow(/duplicate.*pointer/i)
  })

  it("validates the versioned owned-report envelope and unique coverage limits", async () => {
    const decodeOwnedReport = await getOwnedReportDecoder()
    const valid: OwnedReport = {
      format: "crumbs.design-system-owned-report",
      schemaVersion: 1,
      source: {
        format: "crumbs.design-system-compatibility-report",
        schemaVersion: 1,
        data: compatibilityReport([]),
      },
      ownership: { format: "crumbs.design-system-ownership", schemaVersion: 1 },
      attributions: [
        { jsonPointer: "/findings/0/entityId", entityId: TOKEN_ID, status: "unassigned" },
      ],
      analysisLimits: [{ code: "explicit-manifests-only", message: "Only named manifests were checked." }],
    }

    expect(decodeOwnedReport(valid)).toEqual(valid)
    expect(() => decodeOwnedReport({
      ...valid,
      attributions: [...valid.attributions, valid.attributions[0]],
    })).toThrow(/duplicate attribution pointer/i)
    expect(() => decodeOwnedReport({ ...valid, analysisLimits: [] })).toThrow(/explicit-manifests-only/i)
  })

  it("escapes RFC 6901 pointer segments", async () => {
    const adapters = await getReportAdapters()
    expect(adapters.toJsonPointer(["findings", "a~b/c"])).toBe("/findings/a~0b~1c")
  })

  it("does not change compatibility attributions when owner-map ordering changes", async () => {
    const api = await getAnnotateApi()
    const owners = [
      { id: "team:platform", displayName: "Platform" },
      { id: "team:tokens", displayName: "Tokens" },
    ]
    const assignments = [
      { entityId: TOKEN_ID, ownerId: "team:platform" },
      { entityId: REMOVED_TOKEN_ID, ownerId: "team:tokens" },
    ]
    const report = compatibilityReport([
      { code: "token.removed", level: "error", entityId: REMOVED_TOKEN_ID, fieldPath: "token", message: "Removed.", affectedConsumers: [] },
      { code: "token.domain-changed", level: "warning", entityId: TOKEN_ID, fieldPath: "domain", message: "Changed.", affectedConsumers: [] },
    ])
    const manifests = [manifest("1.0.0", [token(TOKEN_ID), token(REMOVED_TOKEN_ID)]), manifest("2.0.0", [token(TOKEN_ID)])]
    const expected = api.annotateDesignSystemReport({ ownership: ownership(assignments, owners), manifests, report }).attributions

    fc.assert(fc.property(fc.boolean(), reverse => {
      const reordered = ownership(
        reverse ? [...assignments].reverse() : assignments,
        reverse ? [...owners].reverse() : owners,
      )
      expect(api.annotateDesignSystemReport({ ownership: reordered, manifests, report }).attributions).toEqual(expected)
    }))
  })
})
