import { describe, expect, it } from "bun:test"
import { decodeStyleExplanationMetadata } from "../src/devtools/style-explanation-schema"
import type { StyleExplanationMetadata } from "../src/devtools/style-explanation-model"
import { encodeCanonicalDesignSystemPolicyReport } from "../src/tooling/policy/canonical-json"
import { checkDesignSystemPolicy } from "../src/tooling/policy/check"
import type { DesignSystemManifest } from "../src/tooling/manifest/model"
import type { DesignSystemPolicy, DesignSystemPolicyReport, PolicyMeasurement } from "../src/tooling/policy/model"

const CURRENT_PACKAGE = "@acme/design-system"
const SOURCE_PACKAGE = "@acme/app"
const MODULE_ID = SOURCE_PACKAGE + "#src/Card.css.ts"
const EXPORT_PATH = ["card"] as const
const DECLARATION_ID = "declaration-1"
const SUBJECT_ID = MODULE_ID + "#" + JSON.stringify(EXPORT_PATH) + "#" + DECLARATION_ID

function manifest(packageName = CURRENT_PACKAGE): DesignSystemManifest {
  return {
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: packageName, version: "1.2.3" },
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
}

type TestPolicyOptions = {
  readonly preset?: { readonly name: "migration" | "enforce"; readonly version: 1 }
  readonly severityOverrides?: Record<string, string>
  readonly literalValueScopes?: ReadonlyArray<{ readonly property: string; readonly domain?: ReadonlyArray<"view" | "text" | "image"> }>
  readonly semanticTokenScopes?: ReadonlyArray<{ readonly property: string; readonly domain?: ReadonlyArray<"view" | "text" | "image"> }>
  readonly targetProfiles?: ReadonlyArray<{ readonly id: string; readonly supportedCapabilities: ReadonlyArray<{ readonly property: string; readonly primitive: string }> }>
  readonly outputBudgets?: ReadonlyArray<{ readonly metricId: string; readonly scopeId: string; readonly unit: string; readonly maximum: number }>
  readonly exceptions?: ReadonlyArray<unknown>
}

function policy(options: TestPolicyOptions = {}): DesignSystemPolicy {
  return {
    format: "crumbs.css.design-system-policy",
    schemaVersion: 1,
    policyId: "acme.native-policy",
    version: 2,
    preset: options.preset ?? { name: "migration", version: 1 },
    severityOverrides: options.severityOverrides ?? {},
    literalValueScopes: options.literalValueScopes ?? [],
    semanticTokenScopes: options.semanticTokenScopes ?? [],
    semanticTokenIds: [],
    targetProfiles: options.targetProfiles ?? [],
    outputBudgets: options.outputBudgets ?? [],
    exceptions: options.exceptions ?? [],
  } as unknown as DesignSystemPolicy
}

function styleMetadata(
  moduleId = MODULE_ID,
  declarationId = DECLARATION_ID,
  property = "backgroundColor",
  value: unknown = "#fff",
): StyleExplanationMetadata {
  const sourceId = moduleId.slice(moduleId.indexOf("#") + 1)
  return decodeStyleExplanationMetadata({
    $$type: "crumbs.css.style-explanation-metadata",
    version: 1,
    moduleId,
    exports: [{
      path: EXPORT_PATH,
      candidates: [{
        id: declarationId,
        sourceId,
        packageOwner: SOURCE_PACKAGE,
        logicalPath: ["card"],
        authoredProperty: property,
        canonicalProperty: property,
        shorthandExpansionPath: [property],
        primitiveDomain: ["view"],
        order: 0,
        value,
      }],
      branches: [],
      tokenDependencies: [],
      coverage: { status: "complete", reasons: [] },
    }],
  })
}

function check(input: {
  readonly policy?: DesignSystemPolicy
  readonly current?: DesignSystemManifest
  readonly consumers?: ReadonlyArray<DesignSystemManifest>
  readonly styleMetadata?: ReadonlyArray<StyleExplanationMetadata>
  readonly measurements?: ReadonlyArray<PolicyMeasurement>
  readonly evaluatedOn?: string
} = {}): DesignSystemPolicyReport {
  return checkDesignSystemPolicy({
    policy: input.policy ?? policy(),
    current: input.current ?? manifest(),
    consumers: input.consumers ?? [],
    styleMetadata: input.styleMetadata ?? [styleMetadata()],
    measurements: input.measurements ?? [],
    ...(input.evaluatedOn === undefined ? {} : { evaluatedOn: input.evaluatedOn }),
  })
}

function literalPolicy(options: TestPolicyOptions = {}): DesignSystemPolicy {
  return policy({
    literalValueScopes: [{ property: "backgroundColor", domain: ["view"] }],
    ...options,
  })
}

describe("design-system policy checker", () => {
  it("uses preset severity and preserves findings after severity overrides", () => {
    const report = check({
      policy: policy({
        preset: { name: "enforce", version: 1 },
        severityOverrides: { "style.literal-value": "info" },
        literalValueScopes: [{ property: "backgroundColor", domain: ["view"] }],
        semanticTokenScopes: [{ property: "backgroundColor", domain: ["view"] }],
      }),
    })
    expect(report.findings.map(({ ruleId, level }) => ({ ruleId, level }))).toEqual([
      { ruleId: "style.literal-value", level: "info" },
      { ruleId: "style.semantic-token-required", level: "error" },
    ])
    expect(report.findings.every(finding => finding.disposition === "active")).toBe(true)
  })

  it("applies only an exact rule and subject exception", () => {
    const report = check({
      policy: literalPolicy({
        semanticTokenScopes: [{ property: "backgroundColor", domain: ["view"] }],
        exceptions: [{
          ruleId: "style.literal-value",
          subjectId: SUBJECT_ID,
          reason: "Token migration is scheduled.",
        }],
      }),
    })
    expect(report.findings.map(({ ruleId, subjectId, disposition }) => ({ ruleId, subjectId, disposition }))).toEqual([
      { ruleId: "style.literal-value", subjectId: SUBJECT_ID, disposition: "excepted" },
      { ruleId: "style.semantic-token-required", subjectId: SUBJECT_ID, disposition: "active" },
    ])
    expect(report.findings[0]?.exception).toEqual({ reason: "Token migration is scheduled." })
    expect(report.exceptionDiagnostics).toEqual([])
  })

  it("uses an explicit expiry date inclusively without reading the clock", () => {
    const report = check({
      policy: literalPolicy({ exceptions: [{
        ruleId: "style.literal-value",
        subjectId: SUBJECT_ID,
        reason: "Scheduled token migration.",
        expiresOn: "2026-09-28",
      }] }),
      evaluatedOn: "2026-09-28",
    })
    expect(report.findings[0]).toMatchObject({
      ruleId: "style.literal-value",
      disposition: "excepted",
      exception: { reason: "Scheduled token migration.", expiresOn: "2026-09-28" },
    })
    expect(report.evaluatedOn).toBe("2026-09-28")
  })

  it("rejects an expiring exception when evaluatedOn is absent", () => {
    expect(() => check({
      policy: literalPolicy({ exceptions: [{
        ruleId: "style.literal-value",
        subjectId: SUBJECT_ID,
        reason: "Scheduled token migration.",
        expiresOn: "2026-09-28",
      }] }),
    })).toThrow(/evaluatedOn.*required/i)
  })

  it("reactivates an expired finding and reports a warning diagnostic", () => {
    const report = check({
      policy: literalPolicy({ exceptions: [{
        ruleId: "style.literal-value",
        subjectId: SUBJECT_ID,
        reason: "Temporary migration exception.",
        expiresOn: "2026-09-27",
      }] }),
      evaluatedOn: "2026-09-28",
    })
    expect(report.findings[0]).toMatchObject({ ruleId: "style.literal-value", disposition: "active" })
    expect(report.findings[0]?.exception).toBeUndefined()
    expect(report.exceptionDiagnostics).toEqual([{
      code: "exception.expired",
      level: "warning",
      ruleId: "style.literal-value",
      subjectId: SUBJECT_ID,
      reason: "Temporary migration exception.",
      expiresOn: "2026-09-27",
    }])
  })

  it("reports exceptions that match no finding as informational", () => {
    const report = check({
      policy: policy({ exceptions: [{
        ruleId: "entity.deprecated",
        subjectId: "@acme/design-system#token:not-deprecated",
        reason: "Reserved for a planned migration.",
      }] }),
    })
    expect(report.exceptionDiagnostics).toEqual([{
      code: "exception.unused",
      level: "info",
      ruleId: "entity.deprecated",
      subjectId: "@acme/design-system#token:not-deprecated",
      reason: "Reserved for a planned migration.",
    }])
  })

  it("rejects unknown, duplicate, or unreasoned exceptions before evaluation", () => {
    const validException = { ruleId: "style.literal-value", subjectId: SUBJECT_ID, reason: "Review." }
    expect(() => check({ policy: literalPolicy({ exceptions: [{ ...validException, ruleId: "unknown.rule" }] }) }))
      .toThrow(/Invalid design-system policy/)
    expect(() => check({ policy: literalPolicy({ exceptions: [validException, validException] }) }))
      .toThrow(/duplicate exception/)
    expect(() => check({ policy: literalPolicy({ exceptions: [{ ...validException, reason: " " }] }) }))
      .toThrow(/Invalid design-system policy/)
  })

  it("sorts report output independent of explicit evidence input order", () => {
    const secondModule = SOURCE_PACKAGE + "#src/Badge.css.ts"
    const metadata = [styleMetadata(MODULE_ID), styleMetadata(secondModule, "declaration-2", "borderColor")]
    const consumers = [manifest("@acme/mobile-app"), manifest("@acme/web-app")]
    const targetProfiles = [
      { id: "ios", supportedCapabilities: [] },
      { id: "android", supportedCapabilities: [] },
    ]
    const outputBudgets = [
      { metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "bytes", maximum: 100 },
      { metricId: "style-count", scopeId: "mobile-entry", unit: "styles", maximum: 4 },
    ]
    const measurements: ReadonlyArray<PolicyMeasurement> = [
      { metricId: "compiled-style-bytes", scopeId: "mobile-entry", unit: "bytes", value: 101 },
      { metricId: "style-count", scopeId: "mobile-entry", unit: "styles", value: 4 },
    ]
    const exceptions = [
      { ruleId: "entity.deprecated", subjectId: "unused-a", reason: "Reserved A." },
      { ruleId: "entity.deprecated", subjectId: "unused-b", reason: "Reserved B." },
    ]
    const basePolicy = policy({
      literalValueScopes: [
        { property: "backgroundColor", domain: ["view"] },
        { property: "borderColor", domain: ["view"] },
      ],
      targetProfiles,
      outputBudgets,
      exceptions,
    })
    const expected = encodeCanonicalDesignSystemPolicyReport(check({
      policy: basePolicy,
      consumers,
      styleMetadata: metadata,
      measurements,
      evaluatedOn: "2026-09-28",
    }))
    const reversed = encodeCanonicalDesignSystemPolicyReport(check({
      policy: policy({
        literalValueScopes: basePolicy.literalValueScopes,
        targetProfiles: [...targetProfiles].reverse(),
        outputBudgets: [...outputBudgets].reverse(),
        exceptions: [...exceptions].reverse(),
      }),
      consumers: [...consumers].reverse(),
      styleMetadata: [...metadata].reverse(),
      measurements: [...measurements].reverse(),
      evaluatedOn: "2026-09-28",
    }))
    expect(reversed).toBe(expected)
  })
})
