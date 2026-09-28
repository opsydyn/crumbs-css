import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { decodeStyleExplanationMetadata } from "../src/devtools/style-explanation-schema"
import { decodeManifest } from "../src/tooling/manifest/schema"
import { decodeDesignSystemPolicy } from "../src/tooling/policy/schema"
import { evaluateStylePolicyRules } from "../src/tooling/policy/style-rules"

const manifest = decodeManifest({
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

const policyBase = {
  format: "crumbs.css.design-system-policy",
  schemaVersion: 1,
  policyId: "acme.style-policy",
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

function metadata(primitiveDomain: ReadonlyArray<"view" | "text" | "image">) {
  return decodeStyleExplanationMetadata({
    $$type: "crumbs.css.style-explanation-metadata",
    version: 1,
    moduleId: "@acme/app#src/styles.css.ts",
    exports: [{
      path: ["styles"],
      candidates: [{
        id: "decl-1",
        sourceId: "src/styles.css.ts",
        packageOwner: "@acme/app",
        logicalPath: ["card"],
        authoredProperty: "backgroundColor",
        canonicalProperty: "backgroundColor",
        shorthandExpansionPath: ["backgroundColor"],
        primitiveDomain,
        order: 0,
        value: "#fff",
      }],
      branches: [],
      tokenDependencies: [],
      coverage: { status: "complete", reasons: [] },
    }],
  })
}

describe("style-policy scope properties", () => {
  it("does not flag a declaration outside the configured property scope", () => {
    fc.assert(fc.property(
      fc.stringMatching(/^[A-Za-z][A-Za-z0-9_]{0,10}$/u).filter(property => property !== "backgroundColor"),
      property => {
        const policy = decodeDesignSystemPolicy({
          ...policyBase,
          literalValueScopes: [{ property, domain: ["view"] }],
        })
        const result = evaluateStylePolicyRules({
          policy,
          current: manifest,
          consumers: [],
          styleMetadata: [metadata(["view"])],
        })
        expect(result.findings.filter(finding => finding.ruleId === "style.literal-value")).toEqual([])
      },
    ), { seed: 94029, numRuns: 100 })
  })

  it("does not flag a declaration whose primitive domain misses the configured scope", () => {
    fc.assert(fc.property(fc.constantFrom(["text"], ["image"], ["text", "image"]), domain => {
      const policy = decodeDesignSystemPolicy({
        ...policyBase,
        literalValueScopes: [{ property: "backgroundColor", domain: ["view"] }],
      })
      const result = evaluateStylePolicyRules({
        policy,
        current: manifest,
        consumers: [],
        styleMetadata: [metadata(domain)],
      })
      expect(result.findings.filter(finding => finding.ruleId === "style.literal-value")).toEqual([])
    }), { seed: 94030, numRuns: 100 })
  })
})
