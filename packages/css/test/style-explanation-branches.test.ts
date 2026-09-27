import { describe, expect, it } from "bun:test"
import {
  createComponentRecipeResolver,
  createNativeConditionResolver,
  createRecipeResolver,
  createSprinklesResolver,
  resolveComponentRecipeStyles,
  resolveRecipeStyle,
} from "../src/theme-runtime"
import { traceNativeConditionBranches, type NativeConditionSnapshot } from "../src/conditions"
import {
  createNativeExpressionDomain,
  createNativeExpressionLiteral,
  createNativeExpressionMatch,
  evaluateNativeExpression,
  evaluateNativeExpressionWithTrace,
} from "../src/expressions"
import { explainStyle } from "../src/devtools/explain-style"
import type { StyleExplanationDeclaration, StyleExplanationMetadata } from "../src/devtools/style-explanation-model"

const exportPath = ["card"] as const
const tokenlessTheme = { contract: {}, tokens: {}, values: {} }
const conditions: NativeConditionSnapshot = {
  platform: "ios",
  widthBucket: "compact",
  heightBucket: "regular",
  orientation: "portrait",
  direction: "ltr",
  fontScaleBucket: "normal",
  motion: "full",
  contrast: "normal",
}

function metadata(branches: StyleExplanationMetadata["exports"][number]["branches"] = []): StyleExplanationMetadata {
  return {
    $$type: "crumbs.css.style-explanation-metadata",
    version: 1,
    moduleId: "@acme/ui#src/Card.css.ts",
    exports: [{
      path: exportPath,
      candidates: [],
      branches,
      tokenDependencies: [],
      coverage: { status: "partial", reasons: ["compatibility-only"] },
    }],
  }
}

function moduleFor(
  card: unknown,
  branches: StyleExplanationMetadata["exports"][number]["branches"] = [],
  sidecar: StyleExplanationMetadata = metadata(branches),
) {
  return {
    __crumbsDev: sidecar,
    __crumbsModule: {
      $$type: "crumbs.css.native-module",
      version: 2,
      dependencyPlan: { $$type: "crumbs.css.theme-dependency-plan", version: 1, entries: [] },
    },
    card,
  }
}

function declaration(id: string, property: string, order: number): StyleExplanationDeclaration {
  return {
    id,
    sourceId: "src/Card.css.ts",
    packageOwner: "@acme/ui",
    logicalPath: ["Card", property],
    authoredProperty: property,
    canonicalProperty: property,
    shorthandExpansionPath: [],
    primitiveDomain: ["view"],
    order,
    value: property === "padding" ? 1 : 10,
  }
}

function flatten(styles: ReadonlyArray<Record<string, unknown>>): Record<string, unknown> {
  return Object.assign({}, ...styles)
}

function recipe() {
  return {
    $$type: "crumbs.css.recipe",
    $$debugName: "Card",
    base: { opacity: 0.2, padding: 2 },
    defaultVariants: { tone: "quiet", density: "compact" },
    variants: {
      tone: { quiet: { opacity: 0.4 }, strong: { opacity: 0.8 } },
      density: { compact: { padding: 4 }, roomy: { padding: 12 } },
    },
    compoundVariants: [
      { variants: { tone: "strong", density: "compact" }, style: { borderWidth: 1 } },
      { variants: { tone: "strong", density: "roomy" }, style: { opacity: 0.9 } },
    ],
  }
}

describe("M9.3 recipe, component, Sprinkles, condition, and expression explanations", () => {
  it("uses recipe defaults, caller overrides, authored compound order, and reports the winning branches", () => {
    const descriptor = recipe()
    const selection = { tone: "strong", density: "roomy" }
    const resolved = resolveRecipeStyle(descriptor as never, selection as never)
    const report = explainStyle({
      module: moduleFor(descriptor),
      exportPath,
      current: { theme: tokenlessTheme, selection },
    })

    expect(report.resolution.value).toEqual(flatten(resolved as ReadonlyArray<Record<string, unknown>>) as never)
    expect(report.resolution.branches.some(branch => branch.kind === "recipe" && branch.path.at(-1) === "strong" && branch.selected)).toBe(true)
    expect(report.resolution.branches.some(branch => branch.path.at(-1) === "quiet" && branch.reason === "selection-mismatch")).toBe(true)
    expect(report.resolution.branches.some(branch => branch.path.at(-2) === 1 && branch.selected)).toBe(true)
    expect(report.resolution.branches.find(branch => branch.path.at(-2) === 0)?.reason).toBe("compound-mismatch")
  })

  it("accepts compiler sidecars that record recipe style paths without a root export record", () => {
    const root = metadata().exports[0]!
    const sidecar: StyleExplanationMetadata = {
      $$type: "crumbs.css.style-explanation-metadata",
      version: 1,
      moduleId: "@acme/ui#src/Card.css.ts",
      exports: [
        { ...root, path: [...exportPath, "base"] },
        { ...root, path: [...exportPath, "variants", "tone", "strong"] },
      ],
    }
    const descriptor = recipe()
    const report = explainStyle({
      module: moduleFor(descriptor, [], sidecar),
      exportPath,
      current: { theme: tokenlessTheme, selection: { tone: "strong", density: "compact" } },
    })

    expect(report.resolution.value).toEqual({ opacity: 0.8, padding: 4, borderWidth: 1 })
    expect(report.coverage).toMatchObject({ status: "partial", reasons: ["compatibility-only"] })
  })

  it("reports selection changes only when recipe output changes", () => {
    const report = explainStyle({
      module: moduleFor(recipe()),
      exportPath,
      previous: { theme: tokenlessTheme, selection: { tone: "quiet", density: "compact" } },
      current: { theme: tokenlessTheme, selection: { tone: "strong", density: "roomy" } },
    })

    expect(report.transition.status).toBe("relevant-input-change")
    expect(report.transition.changedInputs.map(input => [input.kind, input.path])).toEqual([
      ["selection", ["density"]],
      ["selection", ["tone"]],
    ])
    expect(report.transition.affectedPaths).toEqual([exportPath])
  })

  it("reports condition changes against the shared conditional winner", () => {
    const branches = [
      { when: { platform: "ios" }, value: "ios" },
      { when: { platform: "android" }, value: "android" },
    ]
    const branchMetadata = branches.map((branch, order) => ({
      kind: "condition" as const,
      path: ["card", "conditions", order],
      identity: `condition-${order}`,
      order,
      selector: branch.when,
    }))
    const report = explainStyle({
      module: moduleFor({ opacity: 0.5 }, branchMetadata),
      exportPath,
      previous: { theme: tokenlessTheme, conditions },
      current: { theme: tokenlessTheme, conditions: { ...conditions, platform: "android" } },
    })

    expect(report.conditions.decisions.map(decision => decision.selected)).toEqual([false, true])
    expect(report.transition.status).toBe("relevant-input-change")
    expect(report.transition.changedInputs).toContainEqual(expect.objectContaining({ kind: "condition", path: ["platform"] }))
    expect(report.transition.affectedPaths).toEqual([exportPath])
  })

  it("matches component slot output and reports a rejected state without applying variants", () => {
    const component = {
      $$type: "crumbs.css.component-recipe",
      version: 2,
      slots: { root: "view", label: "text" },
      base: { root: { padding: 1 }, label: { fontSize: 10 } },
      variants: {
        status: { ready: { root: { opacity: 0.1 } }, loading: { root: { opacity: 0.2 } } },
        busy: { false: { label: { opacity: 0.9 } }, true: { label: { opacity: 0.5 } } },
        tone: { primary: { root: { borderWidth: 1 } }, quiet: { root: { borderWidth: 2 } } },
      },
      defaultVariants: { status: "ready", busy: false, tone: "primary" },
      stateVariants: { status: { ready: { busy: [false], tone: ["primary", "quiet"] }, loading: { busy: [true], tone: ["primary"] } } },
      compoundVariants: [{ variants: { status: "loading", busy: true }, styles: { label: { fontWeight: "700" } } }],
    }
    const selection = { status: "loading", busy: false, tone: "quiet" }
    const expected = resolveComponentRecipeStyles(component as never, selection as never)
    const emptyExport = metadata().exports[0]!
    const sidecar: StyleExplanationMetadata = {
      $$type: "crumbs.css.style-explanation-metadata",
      version: 1,
      moduleId: "@acme/ui#src/Card.css.ts",
      exports: [
        { ...emptyExport, path: [...exportPath, "base", "root"], candidates: [declaration("root-padding", "padding", 0)] },
        { ...emptyExport, path: [...exportPath, "base", "label"], candidates: [declaration("label-font", "fontSize", 0)] },
      ],
    }
    const report = explainStyle({
      module: moduleFor(component, [], sidecar),
      exportPath,
      current: { theme: tokenlessTheme, selection },
    })

    expect(report.resolution.value).toEqual({
      root: flatten(expected.root as ReadonlyArray<Record<string, unknown>>),
      label: flatten(expected.label as ReadonlyArray<Record<string, unknown>>),
    } as never)
    expect(report.composition.properties.find(property => property.slot === "root" && property.property === "padding")?.value).toBe(1)
    expect(report.composition.properties.find(property => property.slot === "label" && property.property === "fontSize")?.value).toBe(10)
    expect(report.composition.properties.find(property => property.slot === "root" && property.property === "padding")?.winner?.id).toBe("root-padding")
    expect(report.composition.properties.find(property => property.slot === "label" && property.property === "fontSize")?.winner?.id).toBe("label-font")
    expect(report.composition.properties.find(property => property.property === "opacity" && property.slot === "root")?.value)
      .toBeUndefined()
    expect(report.resolution.branches.some(branch => branch.kind === "component-recipe" && branch.reason === "state-rejected")).toBe(true)
  })

  it("retains explicit extension-chain order for selected values and slot overrides", () => {
    const componentIdentity = { owner: "@acme/ui", name: "Card", version: 1 }
    const component = {
      $$type: "crumbs.css.component-recipe",
      version: 3,
      contract: {
        identity: componentIdentity,
        public: { slots: ["root"], variants: { tone: ["base"] } },
        extensionPoints: { defaults: ["tone"], variantValues: ["tone"], compoundVariants: true, slotStyles: ["root"] },
      },
      slots: { root: "view" },
      base: { root: { padding: 1 } },
      variants: { tone: { base: { root: { opacity: 0.2 } } } },
      defaultVariants: { tone: "base" },
      compoundVariants: [],
    }
    const first = {
      $$type: "crumbs.css.component-recipe-extension",
      version: 1,
      identity: { owner: "@acme/brand", name: "Brand", version: 1 },
      componentIdentity,
      defaultVariants: { tone: "brand" },
      variants: { tone: { brand: { root: { opacity: 0.6 } } } },
      compoundVariants: [],
      slotOverrides: { root: { borderWidth: 1 } },
    }
    const second = {
      $$type: "crumbs.css.component-recipe-extension",
      version: 1,
      identity: { owner: "@acme/partner", name: "Partner", version: 1 },
      componentIdentity,
      parentExtensionIdentity: first.identity,
      defaultVariants: { tone: "partner" },
      variants: { tone: { partner: { root: { opacity: 0.8 } } } },
      compoundVariants: [],
      slotOverrides: { root: { borderWidth: 2 } },
    }
    const extensions = [first, second]
    const expected = createComponentRecipeResolver(component as never, { extensions: extensions as never })({} as never)
    const report = explainStyle({
      module: moduleFor(component),
      exportPath,
      current: { theme: tokenlessTheme, extensions: extensions as never },
    })

    expect(report.resolution.value).toEqual({ root: flatten(expected.root as ReadonlyArray<Record<string, unknown>>) } as never)
    expect(report.resolution.branches.filter(branch => branch.kind === "extension").map(branch => branch.identity))
      .toEqual(["@acme/brand#Brand@1", "@acme/partner#Partner@1"])
  })

  it("expands selected Sprinkles shorthand targets in authored selection order", () => {
    const sprinkles = {
      $$type: "crumbs.css.sprinkles-lookup-plan",
      version: 1,
      primitives: ["view"],
      properties: {
        paddingLeft: { sm: { paddingLeft: 8 }, lg: { paddingLeft: 16 } },
        paddingRight: { sm: { paddingRight: 8 }, lg: { paddingRight: 16 } },
      },
      shorthands: { px: ["paddingLeft", "paddingRight"] },
    }
    const selection = { px: "sm", paddingLeft: "lg" }
    const expected = createSprinklesResolver(sprinkles as never)(selection as never)
    const report = explainStyle({ module: moduleFor(sprinkles), exportPath, current: { theme: tokenlessTheme, selection } })

    expect(report.resolution.value).toEqual(flatten(expected as ReadonlyArray<Record<string, unknown>>) as never)
    expect(report.resolution.branches.filter(branch => branch.kind === "sprinkles").map(branch => branch.path.at(-1)))
      .toEqual(["paddingLeft", "paddingRight", "paddingLeft"])
  })

  it("shares condition winner selection and reports no match, specificity, and later declaration ties", () => {
    const branches = [
      { when: { platform: "ios" as const }, value: "platform" },
      { when: { platform: "ios" as const, widthBucket: "compact" as const }, value: "compact-first" },
      { when: { platform: "ios" as const, widthBucket: "compact" as const }, value: "compact-last" },
    ]
    const trace = traceNativeConditionBranches(branches, conditions, "fallback")
    const resolve = createNativeConditionResolver(branches, "fallback")

    expect(trace.value).toBe(resolve(conditions))
    expect(trace.value).toBe("compact-last")
    expect(trace.decisions.map(decision => [decision.specificity, decision.matched, decision.selected]))
      .toEqual([[1, true, false], [2, true, false], [2, true, true]])
    expect(traceNativeConditionBranches(branches, { ...conditions, platform: "android" }, "fallback").value)
      .toBe("fallback")

    const branchMetadata = branches.map((branch, order) => ({
      kind: "condition" as const,
      path: ["card", "conditions", order],
      identity: `condition-${order}`,
      order,
      selector: branch.when,
    }))
    const report = explainStyle({
      module: moduleFor({ opacity: 0.5 }, branchMetadata),
      exportPath,
      current: { theme: tokenlessTheme, conditions },
    })
    expect(report.conditions.decisions.map(decision => decision.selected)).toEqual([false, false, true])
    expect(report.conditions.decisions.at(-1)).toMatchObject({ specificity: 2, matchedAxes: ["platform", "widthBucket"] })
  })

  it("traces expression match and fallback choices through the existing evaluator", () => {
    const domain = createNativeExpressionDomain({ kind: "number", unit: "unitless" })
    const expression = createNativeExpressionMatch({
      condition: "platform",
      cases: [{ value: "ios", expression: createNativeExpressionLiteral(domain, 1) }],
      fallback: createNativeExpressionLiteral(domain, 0),
    })
    const chosen = evaluateNativeExpressionWithTrace(expression, { conditions })
    const fallback = evaluateNativeExpressionWithTrace(expression, { conditions: { ...conditions, platform: "android" } })

    expect(chosen.value).toBe(evaluateNativeExpression(expression, { conditions }))
    expect(chosen.matches).toEqual([{ condition: "platform", value: "ios", selectedBranch: "case", selectedCaseValue: "ios" }])
    expect(fallback.value).toBe(0)
    expect(fallback.matches).toEqual([{ condition: "platform", value: "android", selectedBranch: "fallback" }])

    const report = explainStyle({
      module: moduleFor({ opacity: expression }),
      exportPath,
      current: { theme: tokenlessTheme, conditions },
    })
    expect(report.conditions.expressionMatches).toEqual([{
      path: [...exportPath, "opacity"],
      condition: "platform",
      value: "ios",
      selectedBranch: "case",
      selectedCaseValue: "ios",
    }])
  })
})
