import { describe, expect, it } from "bun:test"
import { decodeManifest } from "../src/tooling/manifest/schema"
import { decodeDesignSystemPolicy } from "../src/tooling/policy/schema"
import { evaluateManifestPolicyRules } from "../src/tooling/policy/manifest-rules"
import type { DesignSystemPolicy, PolicyRuleCandidate } from "../src/tooling/policy/model"

const PACKAGE_NAME = "@acme/design-system"
const MODULE_ID = PACKAGE_NAME + "#src/styles.css.ts"
const CONTRACT = { owner: PACKAGE_NAME, name: "foundation", version: 1 } as const
const TOKEN_ID = PACKAGE_NAME + "#token:color.canvas"
const COMPONENT_ID = PACKAGE_NAME + "#component:button"
const capability = (property: string, primitive: string) => ({
  moduleId: MODULE_ID,
  exportPath: "card",
  property,
  primitive,
  evidence: "compiler-observed" as const,
})

function manifest(options: {
  readonly capabilities?: ReadonlyArray<ReturnType<typeof capability>>
  readonly tokens?: ReadonlyArray<Record<string, unknown>>
  readonly components?: ReadonlyArray<Record<string, unknown>>
} = {}) {
  const capabilities = options.capabilities ?? []
  const tokens = options.tokens ?? []
  const components = options.components ?? []
  const modules = capabilities.length === 0 ? [] : [{
    id: MODULE_ID,
    origin: { path: "src/styles.css.ts" },
    exports: ["card"],
  }]
  const tokenRoots = [...new Map(tokens.map(token => {
    const contract = token.contract as { owner: string; name: string; version: number }
    const id = contract.owner + "#" + contract.name + "@" + contract.version
    return [id, { kind: "token-contract" as const, id }]
  })).values()]
  return decodeManifest({
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: PACKAGE_NAME, version: "1.2.3" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "crumbs-native-style-artifact", version: 1 },
    },
    tokens,
    components,
    modules,
    dependencies: [],
    capabilities,
    coverage: {
      roots: [
        ...tokenRoots,
        ...components.map(component => ({ kind: "component-recipe" as const, id: component.id as string })),
        ...modules.map(module => ({ kind: "style-module" as const, id: module.id })),
      ],
      unresolved: [],
    },
  })
}

function policy(options: {
  readonly targetProfiles?: ReadonlyArray<{ readonly id: string; readonly supportedCapabilities: ReadonlyArray<{ readonly property: string; readonly primitive: string }> }>
  readonly outputBudgets?: ReadonlyArray<{ readonly metricId: string; readonly scopeId: string; readonly unit: string; readonly maximum: number }>
} = {}): DesignSystemPolicy {
  return decodeDesignSystemPolicy({
    format: "crumbs.css.design-system-policy",
    schemaVersion: 1,
    policyId: "acme.native-policy",
    version: 1,
    preset: { name: "migration", version: 1 },
    severityOverrides: {},
    literalValueScopes: [],
    semanticTokenScopes: [],
    semanticTokenIds: [],
    targetProfiles: options.targetProfiles ?? [],
    outputBudgets: options.outputBudgets ?? [],
    exceptions: [],
  })
}

function evaluate(input: {
  readonly policy?: DesignSystemPolicy
  readonly current?: ReturnType<typeof manifest>
  readonly measurements?: ReadonlyArray<{ readonly metricId: string; readonly scopeId: string; readonly unit: string; readonly value: number }>
}) {
  return evaluateManifestPolicyRules({
    policy: input.policy ?? policy(),
    current: input.current ?? manifest(),
    measurements: input.measurements ?? [],
  })
}

function findingsFor(result: ReturnType<typeof evaluate>, ruleId: string): ReadonlyArray<PolicyRuleCandidate> {
  return result.findings.filter(finding => finding.ruleId === ruleId)
}

const deprecatedToken = {
  id: TOKEN_ID,
  contract: CONTRACT,
  path: ["color", "canvas"],
  visibility: "public",
  domain: { kind: "color" },
  kind: "definition",
  origin: { path: "src/tokens.ts", exportPath: "tokens" },
  lifecycle: {
    deprecatedSince: "2.0.0",
    reason: "Use the semantic surface token.",
    replacement: { id: "@acme/tokens/semantic@1#7:surface", resolution: "external" },
  },
} as const

const deprecatedComponent = {
  id: COMPONENT_ID,
  contract: { owner: PACKAGE_NAME, name: "components", version: 1 },
  origin: { path: "src/components/button.ts" },
  slots: ["root"],
  variants: {},
  extensionPoints: [],
  stateConstraints: [],
  defaults: {},
  lifecycle: {
    deprecatedSince: "2.1.0",
    reason: "Use ActionButton.",
    replacement: { id: "@acme/design-system#component:action-button", resolution: "external" },
  },
} as const

describe("design-system manifest policy rules", () => {
  it("compares compiler-observed capabilities against each explicit target profile", () => {
    const result = evaluate({
      current: manifest({ capabilities: [capability("backgroundColor", "view"), capability("color", "text")] }),
      policy: policy({ targetProfiles: [
        { id: "ios", supportedCapabilities: [
          { property: "backgroundColor", primitive: "view" },
          { property: "color", primitive: "text" },
        ] },
        { id: "android", supportedCapabilities: [{ property: "backgroundColor", primitive: "view" }] },
      ] }),
    })
    const findings = findingsFor(result, "capability.not-supported")
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      fieldPath: "capabilities.color.text",
      evidence: { profileId: "android", capability: { property: "color", primitive: "text", evidence: "compiler-observed" } },
    })
    expect(findings[0]?.subjectId).toContain('"android"')
    expect(result.analysisLimits).toEqual([])
  })

  it("does not infer an Android profile or platform support", () => {
    const result = evaluate({
      current: manifest({ capabilities: [capability("shadowColor", "view")] }),
      policy: policy({ targetProfiles: [{
        id: "ios",
        supportedCapabilities: [{ property: "shadowColor", primitive: "view" }],
      }] }),
    })
    expect(findingsFor(result, "capability.not-supported")).toEqual([])
    expect(result.analysisLimits).toEqual([])
  })

  it("reports missing profiles and missing compiler-observed capability evidence as limits", () => {
    const current = manifest({ capabilities: [capability("shadowColor", "view")] })
    const absentProfile = evaluate({ current })
    expect(findingsFor(absentProfile, "capability.not-supported")).toEqual([])
    expect(absentProfile.analysisLimits.map(limit => limit.code)).toContain("target-profile-missing")

    const absentEvidence = evaluate({
      policy: policy({ targetProfiles: [{ id: "ios", supportedCapabilities: [] }] }),
    })
    expect(findingsFor(absentEvidence, "capability.not-supported")).toEqual([])
    expect(absentEvidence.analysisLimits).toContainEqual(expect.objectContaining({
      code: "capability-evidence-missing",
      subjectId: "ios",
    }))
  })

  it("reports token and component deprecations with supplied replacements", () => {
    const result = evaluate({ current: manifest({ tokens: [deprecatedToken], components: [deprecatedComponent] }) })
    const findings = findingsFor(result, "entity.deprecated")
    expect(findings).toHaveLength(2)
    expect(findings).toContainEqual(expect.objectContaining({
      subjectId: TOKEN_ID,
      evidence: expect.objectContaining({
        entityKind: "token",
        deprecatedSince: "2.0.0",
        reason: "Use the semantic surface token.",
        replacement: { id: "@acme/tokens/semantic@1#7:surface", resolution: "external" },
      }),
    }))
    expect(findings).toContainEqual(expect.objectContaining({
      subjectId: COMPONENT_ID,
      evidence: expect.objectContaining({
        entityKind: "component",
        deprecatedSince: "2.1.0",
        replacement: { id: "@acme/design-system#component:action-button", resolution: "external" },
      }),
    }))
  })

  it("flags budgets only above an exact metric, scope, and unit match", () => {
    const configured = policy({ outputBudgets: [{ metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "bytes", maximum: 100 }] })
    const base = { metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "bytes" }
    const exact = evaluate({ policy: configured, measurements: [{ ...base, value: 100 }] })
    expect(findingsFor(exact, "output.budget-exceeded")).toEqual([])
    expect(exact.analysisLimits).toEqual([])

    const exceeded = evaluate({ policy: configured, measurements: [{ ...base, value: 101 }] })
    expect(findingsFor(exceeded, "output.budget-exceeded")).toHaveLength(1)
    expect(findingsFor(exceeded, "output.budget-exceeded")[0]).toMatchObject({
      fieldPath: "measurements.compiled-style-bytes.mobile-entry.bytes",
      evidence: { budget: { maximum: 100, unit: "bytes" }, measurement: { value: 101, unit: "bytes" } },
    })

    const mismatched = evaluate({ policy: configured, measurements: [{ ...base, unit: "kilobytes", value: 101 }] })
    expect(findingsFor(mismatched, "output.budget-exceeded")).toEqual([])
    expect(mismatched.analysisLimits.map(limit => limit.code)).toContain("measurement-missing")
  })

  it("requires metric ID, scope ID, and unit to all match a budget", () => {
    const configured = policy({ outputBudgets: [{ metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "bytes", maximum: 100 }] })
    const mismatchedMeasurements = [
      { metricId: "other-metric", scopeId: "mobile-entry", unit: "bytes", value: 101 },
      { metricId: "compiled-style-bytes", scopeId: "web-entry", unit: "bytes", value: 101 },
      { metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "kilobytes", value: 101 },
    ]
    for (const measurement of mismatchedMeasurements) {
      const result = evaluate({ policy: configured, measurements: [measurement] })
      expect(findingsFor(result, "output.budget-exceeded")).toEqual([])
      expect(result.analysisLimits.map(limit => limit.code)).toContain("measurement-missing")
    }
  })

  it("creates coverage limits for missing output measurements instead of treating them as zero", () => {
    const result = evaluate({
      policy: policy({ outputBudgets: [
        { metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "bytes", maximum: 100 },
        { metricId: "style-count", scopeId: "mobile-entry", unit: "styles", maximum: 20 },
      ] }),
      measurements: [{ metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "kilobytes", value: 99 }],
    })
    expect(findingsFor(result, "output.budget-exceeded")).toEqual([])
    expect(result.analysisLimits.filter(limit => limit.code === "measurement-missing")).toHaveLength(2)
    expect(result.analysisLimits.every(limit => limit.subjectId !== undefined)).toBe(true)
  })
})
