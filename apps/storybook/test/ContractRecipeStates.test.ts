import { describe, expect, it } from "bun:test"
import { endFileScope, setFileScope } from "@vanilla-extract/css/fileScope"
import { resolveComponentRecipeStyles } from "@opsydyn/crumbs-css/theme"
import reviewReport from "./contract-review-cases.json"

type ReviewCase = {
  readonly selection: Readonly<Record<string, string | boolean>>
  readonly status: "reachable" | "unreachable"
  readonly reason?: string
}

type RecipeReport = {
  readonly contract: string
  readonly counts: { readonly total: number; readonly reachable: number; readonly unreachable: number }
  readonly cases: ReadonlyArray<ReviewCase>
}

const reports = reviewReport.recipes as ReadonlyArray<RecipeReport>

async function referenceRecipes() {
  setFileScope("contract-reference-patterns.test.css.ts", "@crumbs/storybook")
  let patterns: typeof import("../src/components/ReferencePatterns.css")
  try {
    patterns = await import("../src/components/ReferencePatterns.css")
  } finally {
    endFileScope()
  }

  setFileScope("contract-showcase-card.test.css.ts", "@crumbs/storybook")
  let card: typeof import("../src/components/ShowcaseCard.css")
  try {
    card = await import("../src/components/ShowcaseCard.css")
  } finally {
    endFileScope()
  }

  return [
    patterns.actionButton,
    patterns.inputField,
    patterns.selectionControl,
    patterns.dialogPanel,
    card.action,
  ]
}

describe("contract-generated reference recipe review cases", () => {
  it("exhaustively exercises reachable selections and reports unreachable states", async () => {
    const recipes = await referenceRecipes()
    expect(recipes).toHaveLength(reports.length)

    for (const recipe of recipes) {
      const identity = recipe.contract!.identity
      const contractId = `${identity.owner}#${identity.name}@${identity.version}`
      const report = reports.find(item => item.contract === contractId)
      expect(report).toBeDefined()
      expect(report!.counts.total).toBe(report!.cases.length)
      expect(report!.counts.reachable).toBe(report!.cases.filter(item => item.status === "reachable").length)
      expect(report!.counts.unreachable).toBe(report!.cases.filter(item => item.status === "unreachable").length)

      for (const reviewCase of report!.cases) {
        if (reviewCase.status === "unreachable") {
          expect(reviewCase.reason).toBeDefined()
          continue
        }

        const resolved = resolveComponentRecipeStyles(recipe, reviewCase.selection)

        expect(Object.keys(resolved)).toEqual(Object.keys(recipe.slots))
        expect(reviewCase.reason).toBeUndefined()
      }
    }
  })

  it("keeps all theme-axis pairs in four generated stories and lists omitted full combinations", () => {
    expect(reviewReport.theme).toMatchObject({
      fullCombinationCount: 8,
      storyCombinationCount: 4,
    })
    expect(reviewReport.theme.pairCoverage.every(pair => pair.complete)).toBe(true)
    expect(reviewReport.theme.intentionallyUnrenderedCombinations).toHaveLength(4)
  })
})
