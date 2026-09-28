import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { encodeCanonicalDesignSystemPolicyReport } from "../src/tooling/policy/canonical-json"

const reportBase = {
  format: "crumbs.css.design-system-policy-report",
  schemaVersion: 1,
  provider: { name: "@acme/design-system", version: "1.0.0" },
  policy: { policyId: "acme.policy", version: 1 },
  preset: { name: "migration", version: 1 },
  suppliedConsumers: [],
  findings: [],
  exceptionDiagnostics: [],
  analysisLimits: [],
} as const

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys)
  if (value === null || typeof value !== "object") return value
  return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseObjectKeys(item)]))
}

describe("canonical policy report JSON properties", () => {
  it("emits identical bytes for nested evidence object-key permutations", () => {
    fc.assert(fc.property(fc.jsonValue(), fc.jsonValue(), (left, right) => {
      const report = {
        ...reportBase,
        findings: [{
          ruleId: "style.literal-value",
          level: "warning",
          subjectId: "module#export.declaration",
          fieldPath: "export.property",
          message: "Configured literal found.",
          disposition: "active",
          evidence: { left, nested: { right, marker: "stable" } },
        }],
      }
      expect(encodeCanonicalDesignSystemPolicyReport(report)).toBe(
        encodeCanonicalDesignSystemPolicyReport(reverseObjectKeys(report)),
      )
    }), { seed: 94028, numRuns: 100 })
  })
})
