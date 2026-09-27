import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  decodeStyleExplanationMetadata,
  decodeStyleExplanationReport,
} from "../src/devtools/style-explanation-schema"
import type { StyleExplanationValue } from "../src/devtools/style-explanation-model"

const metadataTag = "crumbs.css.style-explanation-metadata"
const reportTag = "crumbs.css.style-explanation"

function metadata(value: unknown) {
  return {
    $$type: metadataTag,
    version: 1,
    moduleId: "@acme/ui/src/Button.css.ts",
    exports: [{
      path: ["Button", "root"],
      candidates: [{
        id: "@acme/ui#Button.root.0",
        sourceId: "src/Button.css.ts",
        packageOwner: "@acme/ui",
        logicalPath: ["Button", "root"],
        authoredProperty: "width",
        canonicalProperty: "width",
        shorthandExpansionPath: [],
        primitiveDomain: ["view"],
        order: 0,
        value,
      }],
      branches: [],
      tokenDependencies: [],
      coverage: { status: "complete", reasons: [] },
    }],
  } as const
}

function report(value: unknown) {
  return {
    $$type: reportTag,
    version: 1,
    target: { moduleId: "@acme/ui/src/Button.css.ts", exportPath: ["Button", "root"] },
    resolution: { value, branches: [] },
    conditions: { decisions: [], expressionMatches: [] },
    composition: {
      properties: [{
        property: "width",
        value,
        overridden: [],
        coverage: { status: "complete", reasons: [] },
      }],
    },
    dependencies: { declaredTokens: [], activeTokens: [], changedTokens: [] },
    transition: { status: "not-compared", changedInputs: [], affectedPaths: [] },
    coverage: { status: "complete", reasons: [] },
  } as const
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys)
  if (value === null || typeof value !== "object") return value
  return Object.fromEntries(Object.entries(value).reverse().map(([key, entry]) => [key, reverseObjectKeys(entry)]))
}

function containsNegativeZero(value: unknown): boolean {
  if (typeof value === "number") return Object.is(value, -0)
  if (Array.isArray(value)) return value.some(containsNegativeZero)
  if (value === null || typeof value !== "object") return false
  return Object.values(value).some(containsNegativeZero)
}

describe("style explanation schema properties", () => {
  it("round-trips recursive JSON data and ignores object-key insertion order", () => {
    const jsonValue = fc.jsonValue().filter(value => !containsNegativeZero(value))
    fc.assert(fc.property(jsonValue, value => {
      const originalMetadata = metadata(value)
      const originalReport = report(value)
      const decodedMetadata = decodeStyleExplanationMetadata(originalMetadata)
      const decodedReport = decodeStyleExplanationReport(originalReport)

      expect(decodedMetadata.exports[0]?.candidates[0]?.value).toEqual(value as unknown as StyleExplanationValue)
      expect(decodedReport.resolution.value).toEqual(value as unknown as StyleExplanationValue)
      expect(decodeStyleExplanationMetadata(reverseObjectKeys(originalMetadata))).toEqual(decodedMetadata)
      expect(decodeStyleExplanationReport(reverseObjectKeys(originalReport))).toEqual(decodedReport)
    }), { seed: 94027, numRuns: 100 })
  })

  it("fails closed for generated unsupported report versions", () => {
    fc.assert(fc.property(fc.integer({ min: 2, max: 100 }), version => {
      expect(() => decodeStyleExplanationReport({ ...report(1), version })).toThrow()
    }), { seed: 94028, numRuns: 50 })
  })
})
