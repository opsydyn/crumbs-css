import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { explainStyle } from "../src/devtools/explain-style"
import { resolveRecipeStyle } from "../src/theme-runtime"

const exportPath = ["generated"] as const
const theme = { contract: {}, tokens: {}, values: {} }
const selectionArbitrary = fc.record({
  tone: fc.constantFrom("quiet", "strong"),
  density: fc.constantFrom("compact", "roomy"),
})

function flatten(styles: ReadonlyArray<Record<string, unknown>>): Record<string, unknown> {
  return Object.assign({}, ...styles)
}

describe("M9.3 branch explanation properties", () => {
  it("matches generated recipe selections to the existing resolver and independent style flattening", () => {
    const recipe = {
      $$type: "crumbs.css.recipe",
      base: { padding: 2 },
      defaultVariants: { tone: "quiet", density: "compact" },
      variants: {
        tone: { quiet: { opacity: 0.4 }, strong: { opacity: 0.8 } },
        density: { compact: { padding: 4 }, roomy: { padding: 12 } },
      },
      compoundVariants: [
        { variants: { tone: "strong", density: "compact" }, style: { borderWidth: 1 } },
        { variants: { tone: "strong", density: "roomy" }, style: { borderWidth: 2 } },
      ],
    }
    const module = {
      __crumbsDev: {
        $$type: "crumbs.css.style-explanation-metadata",
        version: 1,
        moduleId: "@acme/ui#src/Generated.css.ts",
        exports: [{
          path: exportPath,
          candidates: [],
          branches: [],
          tokenDependencies: [],
          coverage: { status: "partial", reasons: ["compatibility-only"] },
        }],
      },
      __crumbsModule: { $$type: "crumbs.css.native-module", version: 2, dependencyPlan: { $$type: "crumbs.css.theme-dependency-plan", version: 1, entries: [] } },
      generated: recipe,
    }

    fc.assert(fc.property(selectionArbitrary, selection => {
      const expected = flatten(resolveRecipeStyle(recipe as never, selection as never) as ReadonlyArray<Record<string, unknown>>)
      const report = explainStyle({ module, exportPath, current: { theme, selection } })
      expect(report.resolution.value).toEqual(expected as never)
      for (const axis of ["tone", "density"] as const) {
        const selected = report.resolution.branches.find(branch => branch.path.at(-2) === axis && branch.path.at(-1) === selection[axis])
        expect(selected?.selected).toBe(true)
      }
    }), { seed: 94032, numRuns: 80 })
  })
})
