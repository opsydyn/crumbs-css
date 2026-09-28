import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { decodeManifest } from "../src/tooling/manifest/schema"
import { decodeDesignSystemPolicy } from "../src/tooling/policy/schema"
import { evaluateManifestPolicyRules } from "../src/tooling/policy/manifest-rules"

const emptyManifest = decodeManifest({
  format: "crumbs.design-system-manifest",
  schemaVersion: 1,
  package: { name: "@acme/design-system", version: "1.0.0" },
  producer: {
    compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
    artifact: { name: "crumbs-native-style-artifact", version: 1 },
  },
  tokens: [],
  components: [],
  modules: [],
  dependencies: [],
  capabilities: [],
  coverage: { roots: [], unresolved: [] },
})

function budgetPolicy(maximum: number) {
  return decodeDesignSystemPolicy({
    format: "crumbs.css.design-system-policy",
    schemaVersion: 1,
    policyId: "acme.output-policy",
    version: 1,
    preset: { name: "migration", version: 1 },
    severityOverrides: {},
    literalValueScopes: [],
    semanticTokenScopes: [],
    semanticTokenIds: [],
    targetProfiles: [],
    outputBudgets: [{ metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "bytes", maximum }],
    exceptions: [],
  })
}

describe("output-budget comparison laws", () => {
  it("accepts every exact threshold and flags every greater finite measurement", () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 100_000 }),
      fc.integer({ min: 1, max: 10_000 }),
      (maximum, delta) => {
        const policy = budgetPolicy(maximum)
        const measurement = { metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "bytes" }
        const exact = evaluateManifestPolicyRules({ policy, current: emptyManifest, measurements: [{ ...measurement, value: maximum }] })
        expect(exact.findings.filter(finding => finding.ruleId === "output.budget-exceeded")).toEqual([])
        expect(exact.analysisLimits).toEqual([])

        const above = evaluateManifestPolicyRules({ policy, current: emptyManifest, measurements: [{ ...measurement, value: maximum + delta }] })
        expect(above.findings.filter(finding => finding.ruleId === "output.budget-exceeded")).toHaveLength(1)
        expect(above.analysisLimits).toEqual([])
      },
    ), { seed: 94031, numRuns: 100 })
  })
})
