import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { encodeCanonicalManifestCompatibilityReport } from "../src/tooling/manifest/comparison-report-canonical-json"

const providerName = "@acme/design-system"
const consumer = { name: "@acme/app", version: "2.0.0" }
const unicodeSegments = ["颜色", "δ", "é", "🎨"] as const

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys)
  if (value === null || typeof value !== "object") return value
  return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseObjectKeys(item)]))
}

function tokenFinding(segment: string) {
  const entityId = `${providerName}#token:palette.${segment}`
  return {
    code: "token.domain-changed",
    level: "error",
    entityId,
    fieldPath: "domain",
    message: `Public token ${segment} changed domain`,
    before: { color: { alpha: 1, rgb: [255, 255, 255] }, note: "前" },
    after: { note: "後", color: { rgb: [1, 2, 3], alpha: 0.8 } },
    affectedConsumers: [{
      package: consumer,
      dependency: {
        from: "@acme/app#src/主题.css.ts",
        to: entityId,
        kind: "style-token",
        origin: { moduleId: "@acme/app#src/主题.css.ts", exportPath: "Card.root", property: "backgroundColor" },
      },
    }],
  }
}

function report(findings: ReadonlyArray<ReturnType<typeof tokenFinding>>) {
  return {
    format: "crumbs.design-system-compatibility-report",
    schemaVersion: 2,
    mode: "compare",
    provider: { name: providerName, baselineVersion: "1.2.0", currentVersion: "1.3.0" },
    suppliedConsumers: [consumer],
    findings,
    analysisLimits: [
      { code: "unresolved-references", message: "Some references could not be resolved." },
      { code: "explicit-coverage", message: "Only explicitly declared roots are in scope." },
    ],
  }
}

describe("canonical manifest compatibility report JSON", () => {
  it("emits identical bytes for finding-order and object-key permutations with nested Unicode data", () => {
    fc.assert(fc.property(
      fc.uniqueArray(fc.constantFrom(...unicodeSegments), { minLength: 1, maxLength: unicodeSegments.length }),
      segments => {
        const findings = segments.map(tokenFinding)
        const first = report(findings)
        const permuted = reverseObjectKeys(report([...findings].reverse()))
        const canonical = encodeCanonicalManifestCompatibilityReport(first)
        expect(encodeCanonicalManifestCompatibilityReport(permuted)).toBe(canonical)
        expect(canonical.endsWith("\n")).toBe(true)
        expect(canonical.match(/\n/g)).toHaveLength(1)
        expect(canonical).toContain(segments[0]!)
        expect(canonical).toContain("主题.css.ts")
      },
    ), { seed: 92701, numRuns: 100 })
  })
})
