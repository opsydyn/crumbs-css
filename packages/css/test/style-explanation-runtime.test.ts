import { describe, expect, it } from "bun:test"
import type {
  StyleExplanationDeclaration,
  StyleExplanationMetadata,
  StyleExplanationValue,
} from "../src/devtools/style-explanation-model"
import { StyleExplanationInputError, explainStyle } from "../src/devtools/explain-style"

const metadataTag = "crumbs.css.style-explanation-metadata" as const
const valueTag = "crumbs.css.style-explanation-value" as const
const colorToken = "--crumbs-color-accent"
const spaceToken = "--crumbs-space-small"
const exportPath = ["components", "card"] as const
const contract = {}

function declaration(
  id: string,
  order: number,
  property: string,
  value: StyleExplanationValue,
  authoredProperty = property,
  shorthandExpansionPath: ReadonlyArray<string> = [],
): StyleExplanationDeclaration {
  return {
    id,
    sourceId: "src/Card.css.ts",
    packageOwner: "@acme/ui",
    logicalPath: ["Card", authoredProperty],
    authoredProperty,
    canonicalProperty: property,
    shorthandExpansionPath,
    primitiveDomain: ["view"],
    order,
    value,
  }
}

function metadata(overrides: Partial<StyleExplanationMetadata["exports"][number]> = {}): StyleExplanationMetadata {
  return {
    $$type: metadataTag,
    version: 1,
    moduleId: "@acme/ui/src/Card.css.ts",
    exports: [{
      path: exportPath,
      candidates: [
        declaration("card.opacity.0", 0, "opacity", 0.25),
        declaration("card.padding-left.1", 1, "paddingLeft", { $$type: "crumbs.css.theme-token", varName: spaceToken }, "paddingHorizontal", ["paddingHorizontal", "paddingLeft"]),
        declaration("card.padding-right.2", 2, "paddingRight", { $$type: "crumbs.css.theme-token", varName: spaceToken }, "paddingHorizontal", ["paddingHorizontal", "paddingRight"]),
        declaration("card.opacity.3", 3, "opacity", 0.8),
      ],
      branches: [],
      tokenDependencies: [spaceToken],
      coverage: { status: "complete", reasons: [] },
      ...overrides,
    }],
  }
}

function style() {
  return {
    opacity: 0.8,
    paddingLeft: { $$type: "crumbs.css.theme-token", varName: spaceToken },
    paddingRight: { $$type: "crumbs.css.theme-token", varName: spaceToken },
  }
}

function moduleFor(
  explanationMetadata: unknown = metadata(),
  includeDependencyPlan = true,
): Readonly<Record<string, unknown>> {
  return {
    __crumbsDev: explanationMetadata,
    ...(includeDependencyPlan ? {
      __crumbsModule: {
        $$type: "crumbs.css.native-module",
        version: 2,
        dependencyPlan: {
          $$type: "crumbs.css.theme-dependency-plan",
          version: 1,
          entries: [{ path: exportPath, tokens: [spaceToken] }],
        },
      },
    } : {}),
    components: { card: style() },
  }
}

function theme(tokens: Readonly<Record<string, string | number>>, activeContract = contract) {
  return { contract: activeContract, tokens, values: {} }
}

function currentInput(module = moduleFor(), currentTheme = theme({ [spaceToken]: 8 })) {
  return { module, exportPath, current: { theme: currentTheme } }
}

describe("M9.3 flat style explanation runtime", () => {
  it("explains a nested export with final values, token identities, and source-ordered composition", () => {
    const report = explainStyle(currentInput())

    expect(report.target).toEqual({ moduleId: "@acme/ui/src/Card.css.ts", exportPath })
    expect(report.resolution.value).toEqual({
      opacity: 0.8,
      paddingLeft: {
        $$type: valueTag,
        version: 1,
        kind: "theme-token",
        identity: { varName: spaceToken },
        resolvedValue: 8,
      },
      paddingRight: {
        $$type: valueTag,
        version: 1,
        kind: "theme-token",
        identity: { varName: spaceToken },
        resolvedValue: 8,
      },
    })
    expect(report.composition.properties).toEqual([
      {
        property: "opacity",
        value: 0.8,
        winner: expect.objectContaining({ id: "card.opacity.3", order: 3 }),
        overridden: [expect.objectContaining({ id: "card.opacity.0", order: 0 })],
        coverage: { status: "complete", reasons: [] },
      },
      {
        property: "paddingLeft",
        value: expect.objectContaining({ kind: "theme-token", identity: { varName: spaceToken } }),
        winner: expect.objectContaining({ authoredProperty: "paddingHorizontal", canonicalProperty: "paddingLeft" }),
        overridden: [],
        coverage: { status: "complete", reasons: [] },
      },
      {
        property: "paddingRight",
        value: expect.objectContaining({ kind: "theme-token", identity: { varName: spaceToken } }),
        winner: expect.objectContaining({ authoredProperty: "paddingHorizontal", canonicalProperty: "paddingRight" }),
        overridden: [],
        coverage: { status: "complete", reasons: [] },
      },
    ])
    expect(report.dependencies).toEqual({
      declaredTokens: [spaceToken],
      activeTokens: [spaceToken],
      changedTokens: [],
    })
    expect(report.transition).toEqual({ status: "not-compared", changedInputs: [], affectedPaths: [] })
    expect(Object.isFrozen(report)).toBe(true)
    expect(Object.isFrozen(report.composition.properties)).toBe(true)
  })

  it("preserves unresolved token references when the caller supplies no theme", () => {
    const report = explainStyle({ module: moduleFor(), exportPath, current: {} })

    expect(report.resolution.value).toMatchObject({
      paddingLeft: { $$type: "crumbs.css.theme-token", varName: spaceToken },
    })
    expect(report.composition.properties.find(property => property.property === "paddingLeft")?.value)
      .toEqual({ $$type: "crumbs.css.theme-token", varName: spaceToken })
    expect(report.dependencies.activeTokens).toEqual([spaceToken])
  })

  it("distinguishes relevant, unrelated, and contract changes using the dependency resolver", () => {
    const previous = theme({ [spaceToken]: 8, [colorToken]: "#111111" })
    const relevant = explainStyle({
      ...currentInput(moduleFor(), theme({ [spaceToken]: 16, [colorToken]: "#111111" })),
      previous: { theme: previous },
    })
    expect(relevant.transition).toEqual({
      status: "relevant-input-change",
      changedInputs: [{ kind: "theme-token", path: [spaceToken], previous: 8, current: 16 }],
      affectedPaths: [exportPath],
    })
    expect(relevant.dependencies.changedTokens).toEqual([spaceToken])
    expect((relevant.resolution.value as Record<string, StyleExplanationValue>).paddingLeft).toMatchObject({ resolvedValue: 16 })

    const unrelated = explainStyle({
      ...currentInput(moduleFor(), theme({ [spaceToken]: 8, [colorToken]: "#222222" })),
      previous: { theme: previous },
    })
    expect(unrelated.transition).toEqual({
      status: "no-effective-change",
      changedInputs: [{ kind: "theme-token", path: [colorToken], previous: "#111111", current: "#222222" }],
      affectedPaths: [],
    })
    expect(unrelated.dependencies.changedTokens).toEqual([])

    const nextContract = {}
    const contractChange = explainStyle({
      ...currentInput(moduleFor(), theme({ [spaceToken]: 8 }, nextContract)),
      previous: { theme: theme({ [spaceToken]: 8 }) },
    })
    expect(contractChange.transition.changedInputs.map(input => input.kind)).toEqual(["theme-contract"])
    expect(contractChange.dependencies.changedTokens).toEqual([spaceToken])
    expect(contractChange.transition.affectedPaths).toEqual([exportPath])
  })

  it("reports partial provenance and missing dependency metadata without inventing origins", () => {
    const partial = metadata({
      candidates: [],
      coverage: { status: "partial", reasons: ["compatibility-only"] },
    })
    const noPlan = explainStyle({
      ...currentInput(moduleFor(partial, false)),
      previous: { theme: theme({ [spaceToken]: 4 }) },
    })

    expect(noPlan.coverage).toEqual({
      status: "partial",
      reasons: ["compatibility-only", "dependency-metadata-missing"],
    })
    expect(noPlan.composition.properties.every(property => property.winner === undefined)).toBe(true)
    expect(noPlan.transition.status).toBe("unavailable")
  })

  it("returns unavailable coverage when the development sidecar is absent", () => {
    const report = explainStyle(currentInput({ components: { card: style() } }))

    expect(report.target).toEqual({ exportPath })
    expect(report.coverage).toEqual({ status: "unavailable", reasons: ["metadata-missing"] })
    expect(report.transition.status).toBe("unavailable")
  })

  it("throws stable errors for malformed metadata and missing export paths", () => {
    expect(() => explainStyle(currentInput(moduleFor({ $$type: metadataTag, version: 2 }))))
      .toThrow(expect.objectContaining({ code: "CRUMBS_EXPLANATION_INVALID_METADATA" }))
    expect(() => explainStyle({ ...currentInput(), exportPath: ["components", "missing"] }))
      .toThrow(expect.objectContaining({ code: "CRUMBS_EXPLANATION_EXPORT_PATH_INVALID" }))
    expect(() => explainStyle({ ...currentInput(), exportPath: ["components", -1] }))
      .toThrow(expect.objectContaining({ code: "CRUMBS_EXPLANATION_EXPORT_PATH_INVALID" }))
    try {
      explainStyle(currentInput(moduleFor({ $$type: metadataTag, version: 2 })))
    } catch (error) {
      expect(error).toBeInstanceOf(StyleExplanationInputError)
    }
  })

  it("does not invoke export or metadata accessors and captures cycles as opaque values", () => {
    let getterCalls = 0
    const accessorModule = moduleFor()
    Object.defineProperty(accessorModule, "components", {
      enumerable: true,
      get() {
        getterCalls += 1
        return { card: style() }
      },
    })
    expect(() => explainStyle(currentInput(accessorModule))).toThrow()
    expect(getterCalls).toBe(0)

    const cyclicStyle: Record<string, unknown> = { opacity: 0.4 }
    cyclicStyle.self = cyclicStyle
    const cyclicModule = {
      ...moduleFor(),
      components: { card: cyclicStyle },
    }
    const report = explainStyle(currentInput(cyclicModule))
    expect((report.resolution.value as Record<string, unknown>).self).toEqual({
      $$type: valueTag,
      version: 1,
      kind: "opaque",
      reason: "cycle",
    })
    expect(report.coverage).toMatchObject({ status: "partial", reasons: ["opaque-value"] })

    const invalidMetadataModule = moduleFor()
    Object.defineProperty(invalidMetadataModule, "__crumbsDev", {
      enumerable: true,
      get() {
        getterCalls += 1
        return metadata()
      },
    })
    expect(() => explainStyle(currentInput(invalidMetadataModule))).toThrow()
    expect(getterCalls).toBe(0)
  })
})
