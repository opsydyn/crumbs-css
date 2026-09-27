import { describe, expect, it } from "bun:test"
import {
  decodeStyleExplanationMetadata,
  decodeStyleExplanationReport,
} from "../src/devtools/style-explanation-schema"
import type {
  StyleExplanationCoverage,
  StyleExplanationDeclaration,
  StyleExplanationMetadata,
  StyleExplanationReport,
  StyleExplanationValue,
} from "../src/devtools/style-explanation-model"

const metadataTag = "crumbs.css.style-explanation-metadata" as const
const reportTag = "crumbs.css.style-explanation" as const
const valueTag = "crumbs.css.style-explanation-value" as const

function declaration(value: StyleExplanationValue = 0.8): StyleExplanationDeclaration {
  return {
    id: "@acme/ui#Button.opacity.0",
    sourceId: "src/Button.css.ts",
    packageOwner: "@acme/ui",
    logicalPath: ["Button", "base"],
    authoredProperty: "opacity",
    canonicalProperty: "opacity",
    shorthandExpansionPath: [],
    primitiveDomain: ["view"],
    order: 0,
    value,
  } as StyleExplanationDeclaration
}

function metadata(value: StyleExplanationValue = 0.8): StyleExplanationMetadata {
  return {
    $$type: metadataTag,
    version: 1,
    moduleId: "@acme/ui/src/Button.css.ts",
    exports: [{
      path: ["Button", "root"],
      candidates: [declaration(value)],
      branches: [{
        kind: "recipe",
        path: ["Button"],
        identity: "@acme/ui#recipe:Button",
        order: 0,
        selector: { size: "small" },
        sourceId: "src/Button.css.ts",
      }],
      tokenDependencies: ["--crumbs-space-small"],
      coverage: { status: "partial", reasons: ["compatibility-only"] },
    }],
  } as unknown as StyleExplanationMetadata
}

function report(value: StyleExplanationValue = { opacity: 0.8 }): StyleExplanationReport {
  return {
    $$type: reportTag,
    version: 1,
    target: { moduleId: "@acme/ui/src/Button.css.ts", exportPath: ["Button", "root"] },
    resolution: {
      value,
      branches: [{
        kind: "recipe",
        path: ["Button"],
        identity: "@acme/ui#recipe:Button",
        order: 0,
        matched: true,
        selected: true,
      }],
    },
    conditions: {
      snapshot: {
        platform: "ios",
        widthBucket: "compact",
        heightBucket: "short",
        orientation: "portrait",
        direction: "ltr",
        fontScaleBucket: "normal",
        motion: "full",
        contrast: "normal",
      },
      decisions: [{
        path: ["Button"],
        identity: "@acme/ui#condition:ios",
        matcher: { platform: "ios" },
        matchedAxes: ["platform"],
        specificity: 1,
        declarationOrder: 0,
        matched: true,
        selected: true,
      }],
      expressionMatches: [{
        path: ["Button", "opacity"],
        condition: "platform",
        value: "ios",
        selectedBranch: "case",
        selectedCaseValue: "ios",
      }],
    },
    composition: {
      properties: [{
        property: "opacity",
        value: 0.8,
        winner: declaration(),
        overridden: [],
        coverage: { status: "complete", reasons: [] },
      }],
    },
    dependencies: {
      declaredTokens: ["--crumbs-space-small"],
      activeTokens: ["--crumbs-space-small"],
      changedTokens: [],
    },
    transition: { status: "not-compared", changedInputs: [], affectedPaths: [] },
    coverage: { status: "complete", reasons: [] },
  } as StyleExplanationReport
}

describe("style explanation version-1 schemas", () => {
  it("decodes metadata and report records with their exact version tags", () => {
    expect(decodeStyleExplanationMetadata(metadata())).toEqual(metadata())
    expect(decodeStyleExplanationReport(report())).toEqual(report())
  })

  it("preserves explicit negative-zero and undefined value nodes", () => {
    const negativeZero = { $$type: valueTag, version: 1, kind: "negative-zero" }
    const undefinedValue = { $$type: valueTag, version: 1, kind: "undefined" }

    const decodedNegativeZero = decodeStyleExplanationReport(report(negativeZero))
    const decodedUndefined = decodeStyleExplanationMetadata(metadata(undefinedValue))

    expect(decodedNegativeZero.resolution.value).toEqual(negativeZero)
    expect(decodedUndefined.exports[0]?.candidates[0]?.value).toEqual(undefinedValue)
  })

  it("accepts explicit token identities and stable opaque nodes, including nested values", () => {
    const token = {
      $$type: valueTag,
      version: 1,
      kind: "theme-token",
      identity: {
        varName: "--crumbs-space-small",
        contract: { owner: "@acme/ui", name: "spacing", version: 1 },
      },
      resolvedValue: { amount: 8, missing: { $$type: valueTag, version: 1, kind: "undefined" } },
    } as const satisfies StyleExplanationValue
    const opaque = { $$type: valueTag, version: 1, kind: "opaque", reason: "function" } as const satisfies StyleExplanationValue

    expect(decodeStyleExplanationReport(report({ layout: [token, opaque] })).resolution.value).toEqual({ layout: [token, opaque] })
    expect(() => decodeStyleExplanationReport(report({ ...opaque, reason: "future-reason" }))).toThrow()
  })

  it("accepts every closed coverage and transition status with consistent evidence", () => {
    const coverages: ReadonlyArray<StyleExplanationCoverage> = [
      { status: "complete", reasons: [] },
      { status: "partial", reasons: ["opaque-value"] },
      { status: "unavailable", reasons: ["metadata-missing"] },
    ]
    for (const coverage of coverages) {
      expect(decodeStyleExplanationMetadata({
        ...metadata(),
        exports: [{ ...metadata().exports[0]!, coverage }],
      }).exports[0]?.coverage).toEqual(coverage)
    }

    const transitions: ReadonlyArray<StyleExplanationReport["transition"]> = [
      { status: "not-compared", changedInputs: [], affectedPaths: [] },
      {
        status: "relevant-input-change",
        changedInputs: [{ kind: "selection", path: ["size"], previous: "small", current: "large" }],
        affectedPaths: [["Button", "root"]],
      },
      {
        status: "no-effective-change",
        changedInputs: [{ kind: "theme-token", path: ["unrelated"], previous: 1, current: 2 }],
        affectedPaths: [],
      },
      {
        status: "unavailable",
        changedInputs: [],
        affectedPaths: [],
      },
    ]

    for (const transition of transitions) {
      expect(decodeStyleExplanationReport({ ...report(), transition }).transition).toEqual(transition)
    }
  })

  it("rejects unsupported top-level tags and versions", () => {
    expect(() => decodeStyleExplanationMetadata({ ...metadata(), $$type: "future.metadata" })).toThrow()
    expect(() => decodeStyleExplanationMetadata({ ...metadata(), version: 2 })).toThrow()
    expect(() => decodeStyleExplanationReport({ ...report(), $$type: "future.report" })).toThrow()
    expect(() => decodeStyleExplanationReport({ ...report(), version: 2 })).toThrow()
  })

  it("rejects unexpected fields and invalid stable reason codes", () => {
    expect(() => decodeStyleExplanationMetadata({ ...metadata(), surprise: true })).toThrow()
    expect(() => decodeStyleExplanationReport({ ...report(), surprise: true })).toThrow()
    expect(() => decodeStyleExplanationReport({
      ...report(),
      coverage: { status: "partial", reasons: ["invented-reason"] },
    })).toThrow()
    expect(() => decodeStyleExplanationReport({
      ...report(),
      resolution: {
        ...report().resolution,
        branches: [{ ...report().resolution.branches[0]!, reason: "invented-reason" }],
      },
    })).toThrow()
  })

  it("rejects malformed paths, absolute source identities, and non-finite values", () => {
    expect(() => decodeStyleExplanationMetadata({
      ...metadata(),
      moduleId: "/Users/alice/project/src/Button.css.ts",
    })).toThrow()
    expect(() => decodeStyleExplanationMetadata({
      ...metadata(),
      exports: [{ ...metadata().exports[0]!, path: ["Button", -1] }],
    })).toThrow()
    expect(() => decodeStyleExplanationMetadata({
      ...metadata(),
      exports: [{
        ...metadata().exports[0]!,
        candidates: [{ ...declaration(), logicalPath: ["Button", 1.5] }],
      }],
    })).toThrow()
    expect(() => decodeStyleExplanationReport({
      ...report(),
      target: { moduleId: "src/Button.css.ts", exportPath: ["Button", 1.5] },
    })).toThrow()
    expect(() => decodeStyleExplanationReport(report({ opacity: Infinity }))).toThrow()
    expect(() => decodeStyleExplanationReport(report({ opacity: -0 }))).toThrow()
  })

  it("rejects accessor and cyclic input without invoking an accessor", () => {
    let getterCalls = 0
    const accessorInput = metadata()
    Object.defineProperty(accessorInput, "version", {
      enumerable: true,
      get() {
        getterCalls += 1
        return 1
      },
    })

    expect(() => decodeStyleExplanationMetadata(accessorInput)).toThrow()
    expect(getterCalls).toBe(0)

    const cyclicInput = metadata() as Record<string, unknown>
    ;(cyclicInput.exports as Array<{ candidates: Array<Record<string, unknown>> }>)[0]!.candidates[0]!.value = cyclicInput
    expect(() => decodeStyleExplanationMetadata(cyclicInput)).toThrow()
  })
})
