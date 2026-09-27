import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { explainStyle } from "../src/devtools/explain-style"

const exportPath = ["panel"] as const
const property = fc.constantFrom("opacity", "paddingTop", "marginLeft")
const write = fc.tuple(property, fc.integer({ min: -100, max: 100 }))

function input(writes: ReadonlyArray<readonly [string, number]>) {
  const candidates = writes.map(([name, value], order) => ({
    id: `panel.${name}.${order}`,
    sourceId: "src/Panel.css.ts",
    packageOwner: "@acme/ui",
    logicalPath: ["Panel", name],
    authoredProperty: name,
    canonicalProperty: name,
    shorthandExpansionPath: [],
    primitiveDomain: ["view"],
    order,
    value,
  }))
  const style = Object.fromEntries(writes)
  return {
    module: {
      __crumbsDev: {
        $$type: "crumbs.css.style-explanation-metadata",
        version: 1,
        moduleId: "@acme/ui/src/Panel.css.ts",
        exports: [{
          path: exportPath,
          candidates,
          branches: [],
          tokenDependencies: [],
          coverage: { status: "complete", reasons: [] },
        }],
      },
      __crumbsModule: {
        $$type: "crumbs.css.native-module",
        version: 2,
        dependencyPlan: { $$type: "crumbs.css.theme-dependency-plan", version: 1, entries: [] },
      },
      panel: style,
    },
    exportPath,
    current: { theme: { contract: {}, values: {}, tokens: {} } },
  }
}

describe("M9.3 flat style explanation properties", () => {
  it("matches an independent last-write evaluator for generated declarations", () => {
    fc.assert(fc.property(fc.array(write, { minLength: 1, maxLength: 50 }), writes => {
      const report = explainStyle(input(writes))
      const expected = Object.fromEntries(writes)
      expect(report.resolution.value).toEqual(expected)

      const expectedByProperty = new Map<string, Array<{ readonly order: number; readonly value: number }>>()
      writes.forEach(([name, value], order) => {
        const declarations = expectedByProperty.get(name) ?? []
        declarations.push({ order, value })
        expectedByProperty.set(name, declarations)
      })
      expect(report.composition.properties.map(({ property }) => property).sort()).toEqual([...expectedByProperty.keys()].sort())
      for (const explanation of report.composition.properties) {
        const declarations = expectedByProperty.get(explanation.property)!
        expect(explanation.winner?.order).toBe(declarations.at(-1)!.order)
        expect(explanation.value).toBe(declarations.at(-1)!.value)
        expect(explanation.overridden.map(declaration => declaration.order)).toEqual(declarations.slice(0, -1).map(declaration => declaration.order))
      }
    }), { seed: 94031, numRuns: 150 })
  })
})
