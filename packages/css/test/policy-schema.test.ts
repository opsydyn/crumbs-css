import { describe, expect, it } from "bun:test"
import {
  DESIGN_SYSTEM_POLICY_FORMAT,
  DESIGN_SYSTEM_POLICY_REPORT_FORMAT,
  DESIGN_SYSTEM_POLICY_REPORT_VERSION,
  DESIGN_SYSTEM_POLICY_VERSION,
  POLICY_RULE_IDS,
} from "../src/tooling/policy/model"
import { encodeCanonicalDesignSystemPolicyReport } from "../src/tooling/policy/canonical-json"
import { getBuiltInPolicyPreset } from "../src/tooling/policy/presets"
import { decodeDesignSystemPolicy, decodeDesignSystemPolicyReport } from "../src/tooling/policy/schema"

const policy = {
  format: "crumbs.css.design-system-policy",
  schemaVersion: 1,
  policyId: "acme.native-design-system",
  version: 3,
  preset: { name: "migration", version: 1 },
  severityOverrides: { "style.literal-value": "info" },
  literalValueScopes: [{ property: "backgroundColor", domain: ["view", "image"] }],
  semanticTokenScopes: [{ property: "color", domain: ["text"] }],
  semanticTokenIds: ["@acme/tokens@1#6:colors/7:primary"],
  targetProfiles: [{
    id: "ios-current",
    supportedCapabilities: [{ property: "backgroundColor", primitive: "view" }],
  }],
  outputBudgets: [{ metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "bytes", maximum: 12000 }],
  exceptions: [{ ruleId: "entity.deprecated", subjectId: "@acme/tokens#color.label", reason: "Migration is scheduled." }],
} as const

const report = {
  format: "crumbs.css.design-system-policy-report",
  schemaVersion: 1,
  provider: { name: "@acme/design-system", version: "2.4.0" },
  policy: { policyId: "acme.native-design-system", version: 3 },
  preset: { name: "migration", version: 1 },
  suppliedConsumers: [{ name: "@acme/mobile", version: "1.8.0" }],
  findings: [{
    ruleId: "style.literal-value",
    level: "warning",
    subjectId: "@acme/design-system#styles/Card.backgroundColor:declaration-1",
    fieldPath: "styles.Card.backgroundColor",
    message: "A literal value is used in a configured style scope.",
    evidence: { property: "backgroundColor", value: "#fff" },
    disposition: "active",
  }],
  exceptionDiagnostics: [],
  analysisLimits: [],
} as const

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys)
  if (value === null || typeof value !== "object") return value
  return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseObjectKeys(item)]))
}

describe("versioned design-system policy contracts", () => {
  it("accepts exact v1 policy and report tags", () => {
    expect(DESIGN_SYSTEM_POLICY_FORMAT).toBe("crumbs.css.design-system-policy")
    expect(DESIGN_SYSTEM_POLICY_VERSION).toBe(1)
    expect(DESIGN_SYSTEM_POLICY_REPORT_FORMAT).toBe("crumbs.css.design-system-policy-report")
    expect(DESIGN_SYSTEM_POLICY_REPORT_VERSION).toBe(1)
    expect(POLICY_RULE_IDS).toEqual([
      "style.literal-value",
      "style.semantic-token-required",
      "consumer.private-token",
      "capability.not-supported",
      "entity.deprecated",
      "output.budget-exceeded",
    ])
    expect(decodeDesignSystemPolicy(policy)).toEqual(policy)
    expect(decodeDesignSystemPolicyReport(report)).toEqual(report)
  })

  it("rejects unknown versions, fields, and severity levels", () => {
    expect(() => decodeDesignSystemPolicy({ ...policy, schemaVersion: 2 })).toThrow("Invalid design-system policy")
    expect(() => decodeDesignSystemPolicy({ ...policy, surprise: true })).toThrow("Invalid design-system policy")
    expect(() => decodeDesignSystemPolicy({ ...policy, severityOverrides: { "style.literal-value": "off" } })).toThrow("Invalid design-system policy")
    expect(() => decodeDesignSystemPolicyReport({ ...report, schemaVersion: 2 })).toThrow("Invalid design-system policy report")
    expect(() => decodeDesignSystemPolicyReport({ ...report, extra: true })).toThrow("Invalid design-system policy report")
  })

  it("rejects duplicate semantic token, target, and exception IDs", () => {
    expect(() => decodeDesignSystemPolicy({ ...policy, semanticTokenIds: ["token.a", "token.a"] })).toThrow("duplicate semantic token")
    expect(() => decodeDesignSystemPolicy({ ...policy, targetProfiles: [policy.targetProfiles[0], policy.targetProfiles[0]] })).toThrow("duplicate target profile")
    const duplicateException = { ruleId: "entity.deprecated", subjectId: "same", reason: "Reason." }
    expect(() => decodeDesignSystemPolicy({ ...policy, exceptions: [duplicateException, duplicateException] })).toThrow("duplicate exception")
  })

  it("rejects malformed policy and report calendar dates", () => {
    expect(() => decodeDesignSystemPolicy({
      ...policy,
      exceptions: [{ ruleId: "entity.deprecated", subjectId: "token.a", reason: "Reason.", expiresOn: "2030-02-30" }],
    })).toThrow("Invalid design-system policy")
    expect(() => decodeDesignSystemPolicyReport({ ...report, evaluatedOn: "2026-13-01" })).toThrow("Invalid design-system policy report")
  })

  it("pins both built-in preset v1 severity maps", () => {
    expect(getBuiltInPolicyPreset("migration")).toEqual({
      name: "migration",
      version: 1,
      severityByRule: {
        "style.literal-value": "warning",
        "style.semantic-token-required": "warning",
        "consumer.private-token": "warning",
        "capability.not-supported": "warning",
        "entity.deprecated": "warning",
        "output.budget-exceeded": "warning",
      },
    })
    expect(getBuiltInPolicyPreset("enforce")).toEqual({
      name: "enforce",
      version: 1,
      severityByRule: {
        "style.literal-value": "error",
        "style.semantic-token-required": "error",
        "consumer.private-token": "error",
        "capability.not-supported": "error",
        "entity.deprecated": "error",
        "output.budget-exceeded": "error",
      },
    })
  })

  it("canonicalizes nested record key order", () => {
    const first = {
      ...report,
      findings: [{ ...report.findings[0], evidence: { z: 1, a: { y: 2, x: 1 } } }],
    }
    const second = reverseObjectKeys(first)
    const firstJson = encodeCanonicalDesignSystemPolicyReport(first)
    const secondJson = encodeCanonicalDesignSystemPolicyReport(second)

    expect(firstJson).toBe(secondJson)
    expect(firstJson).toContain('"evidence":{"a":{"x":1,"y":2},"z":1}')
    expect(firstJson.endsWith("\n")).toBe(true)
  })
})
