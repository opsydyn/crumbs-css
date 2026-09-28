import { describe, expect, it } from "bun:test"
import * as policyApi from "../src/tooling/policy"
import { decodeManifest } from "../src/tooling/manifest/schema"

const policy = {
  format: "crumbs.css.design-system-policy",
  schemaVersion: 1,
  policyId: "acme.public-api",
  version: 1,
  preset: { name: "migration", version: 1 },
  severityOverrides: {},
  literalValueScopes: [],
  semanticTokenScopes: [],
  semanticTokenIds: [],
  targetProfiles: [],
  outputBudgets: [],
  exceptions: [],
} as const

const current = decodeManifest({
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

describe("tooling/policy public API", () => {
  it("checks plain-data inputs and exports versioned decoders and canonical reports", () => {
    const decodedPolicy = policyApi.decodeDesignSystemPolicy(policy)
    const report = policyApi.checkDesignSystemPolicy({ policy: decodedPolicy, current })
    const canonical = policyApi.encodeCanonicalDesignSystemPolicyReport(report)
    expect(policyApi.decodeDesignSystemPolicyReport(report)).toEqual(report)
    expect(policyApi.decodePolicyMeasurements([])).toEqual([])
    expect(JSON.parse(canonical)).toMatchObject({
      format: "crumbs.css.design-system-policy-report",
      schemaVersion: 1,
      policy: { policyId: "acme.public-api", version: 1 },
    })
    expect(policyApi.getBuiltInPolicyPreset("migration").version).toBe(1)
  })

  it("does not expose Effect Schema or codec objects", () => {
    expect(Object.keys(policyApi).filter(name => name.endsWith("Schema") || name.endsWith("Codec"))).toEqual([])
  })
})
