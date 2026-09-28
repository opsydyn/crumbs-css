import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { decodeStyleExplanationMetadata } from "../src/devtools/style-explanation-schema"
import type { StyleExplanationMetadata } from "../src/devtools/style-explanation-model"
import { encodeCanonicalDesignSystemPolicyReport } from "../src/tooling/policy/canonical-json"
import { checkDesignSystemPolicy } from "../src/tooling/policy/check"
import type { DesignSystemManifest } from "../src/tooling/manifest/model"
import type { DesignSystemPolicy } from "../src/tooling/policy/model"

const sourceModule = "@acme/app#src/Card.css.ts"
const declarationId = "property-law"
const subjectId = sourceModule + "#[\"card\"]#" + declarationId

const current: DesignSystemManifest = {
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
}

function metadata(moduleId: string, declaration: string): StyleExplanationMetadata {
  return decodeStyleExplanationMetadata({
    $$type: "crumbs.css.style-explanation-metadata",
    version: 1,
    moduleId,
    exports: [{
      path: ["card"],
      candidates: [{
        id: declaration,
        sourceId: moduleId.slice(moduleId.indexOf("#") + 1),
        packageOwner: "@acme/app",
        logicalPath: ["card"],
        authoredProperty: "backgroundColor",
        canonicalProperty: "backgroundColor",
        shorthandExpansionPath: ["backgroundColor"],
        primitiveDomain: ["view"],
        order: 0,
        value: "#fff",
      }],
      branches: [],
      tokenDependencies: [],
      coverage: { status: "complete", reasons: [] },
    }],
  })
}

const policy: DesignSystemPolicy = {
  format: "crumbs.css.design-system-policy",
  schemaVersion: 1,
  policyId: "acme.property-policy",
  version: 1,
  preset: { name: "migration", version: 1 },
  severityOverrides: {},
  literalValueScopes: [{ property: "backgroundColor", domain: ["view"] }],
  semanticTokenScopes: [],
  semanticTokenIds: [],
  targetProfiles: [],
  outputBudgets: [],
  exceptions: [],
}

const baselineMetadata = [
  metadata(sourceModule, declarationId),
  metadata("@acme/app#src/Badge.css.ts", "second-property-law"),
]
const baseline = encodeCanonicalDesignSystemPolicyReport(checkDesignSystemPolicy({
  policy,
  current,
  styleMetadata: baselineMetadata,
}))

describe("policy report order laws", () => {
  it("emits byte-identical canonical reports for every evidence sidecar permutation", () => {
    fc.assert(fc.property(fc.boolean(), reverse => {
      const input = reverse ? [...baselineMetadata].reverse() : baselineMetadata
      const report = checkDesignSystemPolicy({ policy, current, styleMetadata: input })
      expect(encodeCanonicalDesignSystemPolicyReport(report)).toBe(baseline)
    }), { seed: 94032, numRuns: 100 })
  })
})
