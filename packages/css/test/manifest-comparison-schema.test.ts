import { describe, expect, it } from "bun:test"
import { decodeManifestCompatibilityReport } from "../src/tooling/manifest/comparison-report-schema"
import type { ManifestCompatibilityReport, ManifestConsumerReference } from "../src/tooling/manifest/comparison-report-model"

const reportFormat = "crumbs.design-system-compatibility-report"
const providerName = "@acme/design-system"
const consumerPackage = { name: "@acme/app", version: "2.0.0" }

function tokenReference(to: string): ManifestConsumerReference {
  return {
    package: consumerPackage,
    dependency: {
      from: "@acme/app#src/Card.css.ts",
      to,
      kind: "style-token",
      origin: {
        moduleId: "@acme/app#src/Card.css.ts",
        exportPath: "Card.root",
        property: "backgroundColor",
      },
    },
  }
}

function checkReport(): ManifestCompatibilityReport {
  return {
    format: reportFormat,
    schemaVersion: 1,
    mode: "check",
    provider: { name: providerName, currentVersion: "1.3.0" },
    suppliedConsumers: [],
    findings: [],
    analysisLimits: [{ code: "consumer-manifests-not-supplied", message: "No consumer manifests were supplied." }],
  }
}

function compareReport(): ManifestCompatibilityReport {
  const tokenIds = [
    `${providerName}#token:color.canvas`,
    `${providerName}#token:color.border`,
    `${providerName}#token:space.2`,
    `${providerName}#token:space.3`,
  ]
  const codes = [
    "token.removed",
    "token.domain-changed",
    "token.visibility-reduced",
    "token.added",
    "component.removed",
    "component.slot-removed",
    "component.variant-removed",
    "component.default-changed",
    "component.added",
    "component.slot-added",
    "component.variant-added",
    "consumer.private-token-dependency",
  ] as const

  return {
    format: reportFormat,
    schemaVersion: 1,
    mode: "compare",
    provider: { name: providerName, baselineVersion: "1.2.0", currentVersion: "1.3.0" },
    suppliedConsumers: [consumerPackage],
    findings: codes.map((code, index) => {
      const isTokenFinding = code.startsWith("token.") || code === "consumer.private-token-dependency"
      const entityId = isTokenFinding
        ? code === "consumer.private-token-dependency" ? tokenIds[0]! : tokenIds[index]!
        : `${providerName}#component:card/${index}`
      return {
        code,
        level: index === 3 || index === 8 ? "info" : index === 7 ? "warning" : "error",
        entityId,
        fieldPath: code.replaceAll(".", "/"),
        message: `Observed ${code}`,
        ...(index === 0 ? { before: { palette: ["白", { alpha: 0.75, nested: null }] }, after: false } : {}),
        affectedConsumers: isTokenFinding ? [tokenReference(entityId)] : [],
      }
    }),
    analysisLimits: [
      { code: "explicit-coverage", message: "Only declared roots were examined." },
      { code: "unresolved-references", message: "Some references remain unresolved." },
      { code: "component-use-unavailable", message: "Component slot and variant use is unavailable." },
      { code: "consumer-manifests-not-supplied", message: "Only supplied consumers were examined." },
    ],
  }
}

describe("manifest compatibility report v1 schema", () => {
  it("accepts check and compare reports with every finding and analysis-limit code", () => {
    expect(decodeManifestCompatibilityReport(checkReport())).toEqual(checkReport())
    expect(decodeManifestCompatibilityReport(compareReport())).toEqual(compareReport())
  })

  it("accepts optional before/after JSON values and compiler origins on consumer references", () => {
    const decoded = decodeManifestCompatibilityReport(compareReport())
    expect(decoded.findings[0]?.before).toEqual({ palette: ["白", { alpha: 0.75, nested: null }] })
    expect(decoded.findings[0]?.after).toBe(false)
    expect(decoded.findings[0]?.affectedConsumers[0]?.dependency.origin).toEqual({
      moduleId: "@acme/app#src/Card.css.ts",
      exportPath: "Card.root",
      property: "backgroundColor",
    })
  })

  it("rejects an affected token consumer whose dependency target differs from the finding entity", () => {
    const report = compareReport()
    const invalid = {
      ...report,
      findings: report.findings.map((finding, index) => index === 0 ? {
        ...finding,
        affectedConsumers: finding.affectedConsumers.map((reference, referenceIndex) => referenceIndex === 0 ? {
          ...reference,
          dependency: { ...reference.dependency, to: `${providerName}#token:color.different` },
        } : reference),
      } : finding),
    }
    expect(() => decodeManifestCompatibilityReport(invalid)).toThrow(/target.*entity|entity.*target/i)
  })

  it("rejects unsupported versions, unknown fields, and modes without matching provider versions", () => {
    expect(() => decodeManifestCompatibilityReport({ ...checkReport(), schemaVersion: 2 })).toThrow(/schemaVersion|version/i)
    expect(() => decodeManifestCompatibilityReport({ ...checkReport(), surprise: true })).toThrow(/surprise|excess|unexpected/i)
    expect(() => decodeManifestCompatibilityReport({ ...checkReport(), provider: { ...checkReport().provider, surprise: true } })).toThrow(/surprise|excess|unexpected/i)
    expect(() => decodeManifestCompatibilityReport({ ...checkReport(), mode: "compare" })).toThrow(/baselineVersion/i)
    expect(() => decodeManifestCompatibilityReport({ ...checkReport(), provider: { ...checkReport().provider, baselineVersion: "1.2.0" } })).toThrow(/baselineVersion|mode/i)
    expect(() => decodeManifestCompatibilityReport({ ...compareReport(), provider: { name: providerName, currentVersion: "1.3.0" } })).toThrow(/baselineVersion/i)
  })

  it("rejects invalid codes, levels, IDs, references, and consumer identities", () => {
    const base = compareReport()
    expect(() => decodeManifestCompatibilityReport({ ...base, findings: [{ ...base.findings[0]!, code: "token.maybe" }] })).toThrow(/code|token\.maybe/i)
    expect(() => decodeManifestCompatibilityReport({ ...base, findings: [{ ...base.findings[0]!, level: "fatal" }] })).toThrow(/level|fatal/i)
    expect(() => decodeManifestCompatibilityReport({ ...base, findings: [{ ...base.findings[0]!, entityId: "  " }] })).toThrow(/entityId|identifier/i)
    expect(() => decodeManifestCompatibilityReport({ ...base, findings: [{ ...base.findings[0]!, fieldPath: "" }] })).toThrow(/fieldPath|identifier/i)
    const missingTarget = {
      ...base,
      findings: [{
        ...base.findings[0]!,
        affectedConsumers: [{ package: consumerPackage, dependency: { from: "x", kind: "style-token" } }],
      }],
    }
    expect(() => decodeManifestCompatibilityReport(missingTarget)).toThrow(/to|target/i)
    expect(() => decodeManifestCompatibilityReport({ ...base, suppliedConsumers: [{ name: "invalid package", version: "2.0.0" }] })).toThrow(/name|package/i)
    expect(() => decodeManifestCompatibilityReport({ ...base, suppliedConsumers: [consumerPackage, consumerPackage] })).toThrow(/duplicate consumer/i)
    expect(() => decodeManifestCompatibilityReport({ ...base, suppliedConsumers: [{ name: providerName, version: "1.3.0" }] })).toThrow(/provider|consumer/i)
  })

  it("rejects a finding consumer that was not among the supplied consumer manifests", () => {
    const report = compareReport()
    expect(() => decodeManifestCompatibilityReport({ ...report, suppliedConsumers: [] })).toThrow(/supplied consumer|consumer identity/i)
  })

  it("rejects non-JSON values and non-finite numbers in before/after data", () => {
    const base = compareReport()
    expect(() => decodeManifestCompatibilityReport({ ...base, findings: [{ ...base.findings[0]!, before: { value: undefined } }] })).toThrow(/JSON|serializable|undefined/i)
    expect(() => decodeManifestCompatibilityReport({ ...base, findings: [{ ...base.findings[0]!, before: { value: Infinity } }] })).toThrow(/finite|number|JSON/i)
    expect(() => decodeManifestCompatibilityReport({ ...base, findings: [{ ...base.findings[0]!, after: -0 }] })).toThrow(/filter/i)
  })
})

function tokenIdsForTest(): string {
  return `${providerName}#token:color.canvas`
}
