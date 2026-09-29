import { endFileScope, setFileScope } from "@vanilla-extract/css/fileScope"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import {
  enumerateContractReviewCases,
  generateFullRows,
  generatePairwiseRows,
  type ContractRecipeLike,
  type ContractReviewCase,
  type CoverageAxis,
} from "./contract-coverage-model"
import { brandScopes, densityScopes, modeScopes } from "../src/styles/theme"

const storyPath = fileURLToPath(new URL("../src/components/ReferenceContractCoverage.stories.tsx", import.meta.url))
const reportPath = fileURLToPath(new URL("../test/contract-review-cases.json", import.meta.url))

type RecipeEntry = {
  readonly recipe: ContractRecipeLike
}

type AxisPairCoverage = {
  readonly axes: readonly [string, string]
  readonly expectedPairs: number
  readonly coveredPairs: number
  readonly complete: boolean
}

type RecipeReviewReport = {
  readonly contract: string
  readonly axes: ReadonlyArray<CoverageAxis>
  readonly counts: {
    readonly total: number
    readonly reachable: number
    readonly unreachable: number
  }
  readonly cases: ReadonlyArray<ContractReviewCase>
}

async function loadReferenceRecipes(): Promise<ReadonlyArray<RecipeEntry>> {
  setFileScope("reference-patterns.css.ts", "@crumbs/storybook")
  let patterns: typeof import("../src/components/ReferencePatterns.css")
  try {
    patterns = await import("../src/components/ReferencePatterns.css")
  } finally {
    endFileScope()
  }

  setFileScope("showcase-card.css.ts", "@crumbs/storybook")
  let showcaseCard: typeof import("../src/components/ShowcaseCard.css")
  try {
    showcaseCard = await import("../src/components/ShowcaseCard.css")
  } finally {
    endFileScope()
  }

  return [
    {recipe: patterns.actionButton},
    {recipe: patterns.inputField},
    {recipe: patterns.selectionControl},
    {recipe: patterns.dialogPanel},
    {recipe: showcaseCard.action},
  ]
}

function themeAxes(): ReadonlyArray<CoverageAxis> {
  return [
    {name: "brand", values: Object.keys(brandScopes)},
    {name: "themeMode", values: Object.keys(modeScopes)},
    {name: "density", values: Object.keys(densityScopes)},
  ]
}

function pairCoverage(
  axes: ReadonlyArray<CoverageAxis>,
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
): ReadonlyArray<AxisPairCoverage> {
  const result: AxisPairCoverage[] = []
  for (let left = 0; left < axes.length; left += 1) {
    for (let right = left + 1; right < axes.length; right += 1) {
      const leftAxis = axes[left]!
      const rightAxis = axes[right]!
      const expectedPairs = leftAxis.values.length * rightAxis.values.length
      const covered = new Set(rows.map(row => JSON.stringify([
        row[leftAxis.name],
        row[rightAxis.name],
      ])))
      result.push({
        axes: [leftAxis.name, rightAxis.name],
        expectedPairs,
        coveredPairs: covered.size,
        complete: covered.size === expectedPairs,
      })
    }
  }
  return result
}

function contractName(recipe: ContractRecipeLike): string {
  const identity = recipe.contract?.identity
  if (identity === undefined) throw new TypeError("Reference story recipes must declare component contracts.")
  return `${identity.owner}#${identity.name}@${identity.version}`
}

function buildReviewReport(
  axes: ReadonlyArray<CoverageAxis>,
  storyRows: ReadonlyArray<Readonly<Record<string, string>>>,
  allRows: ReadonlyArray<Readonly<Record<string, string>>>,
  recipes: ReadonlyArray<RecipeEntry>,
) {
  const sampled = new Set(storyRows.map(row => JSON.stringify(row)))
  const recipeReports: ReadonlyArray<RecipeReviewReport> = recipes.map(({recipe}) => {
    const cases = enumerateContractReviewCases(recipe)
    return {
      contract: contractName(recipe),
      axes: Object.entries(recipe.contract!.public.variants).map(([name, values]) => ({name, values})),
      counts: {
        total: cases.length,
        reachable: cases.filter(reviewCase => reviewCase.status === "reachable").length,
        unreachable: cases.filter(reviewCase => reviewCase.status === "unreachable").length,
      },
      cases,
    }
  })

  return {
    schemaVersion: 1,
    storyPolicy: "pairwise-theme-axes",
    storyPolicyNote: "Every theme-axis value and pair is represented. Full theme combinations omitted from stories are listed; recipe public states are reviewed exhaustively below.",
    theme: {
      axes,
      fullCombinationCount: allRows.length,
      storyCombinationCount: storyRows.length,
      stories: storyRows,
      intentionallyUnrenderedCombinations: allRows.filter(row => !sampled.has(JSON.stringify(row))),
      pairCoverage: pairCoverage(axes, storyRows),
    },
    recipeStatePolicy: "exhaustive-public-variant-selections",
    recipes: recipeReports,
  }
}

function pascalCase(value: string): string {
  const name = value.split(/[^a-zA-Z0-9]+/).filter(Boolean).map(part =>
    part[0]!.toUpperCase() + part.slice(1),
  ).join("")
  if (name.length === 0 || /^\d/.test(name)) {
    throw new TypeError(`Cannot make a valid story export name from ${JSON.stringify(value)}.`)
  }
  return name
}

function renderStorySource(rows: ReadonlyArray<Readonly<Record<string, string>>>): string {
  const stories = rows.map(row => {
    const exportName = Object.values(row).map(pascalCase).join("")
    const globals = Object.entries(row).map(([name, value]) => `    ${name}: ${JSON.stringify(value)},`).join("\n")
    return `export const ${exportName}: Story = {
  globals: {
${globals}
  },
  render: () => (
    <ScrollView contentContainerStyle={{ gap: 24, padding: 20 }} style={{ alignSelf: "stretch", flex: 1 }}>
      <ReferenceSystem />
    </ScrollView>
  ),
}`
  }).join("\n\n")

  return `// Generated by scripts/generate-contract-stories.ts. Do not edit by hand.
import type { Meta, StoryObj } from "@storybook/react-native"
import { ScrollView } from "react-native"
import { ReferenceSystem } from "./ReferenceSystem"

const meta = {
  component: ReferenceSystem,
  title: "Design System/Contract Coverage",
} satisfies Meta<typeof ReferenceSystem>

type Story = StoryObj<typeof meta>

${stories}
`
}

async function writeOrCheck(path: string, expected: string, checkOnly: boolean): Promise<boolean> {
  let actual: string | undefined
  try {
    actual = await readFile(path, "utf8")
  } catch {
    actual = undefined
  }
  if (actual === expected) return false
  if (checkOnly) {
    throw new Error(`${path} is stale. Run \`bun run contracts:generate\` from apps/storybook.`)
  }
  await mkdir(dirname(path), {recursive: true})
  await writeFile(path, expected)
  return true
}

export async function generateContractStoryArtifacts(checkOnly = false): Promise<void> {
  const axes = themeAxes()
  const storyRows = generatePairwiseRows(axes)
  const allRows = generateFullRows(axes)
  const recipes = await loadReferenceRecipes()
  const report = buildReviewReport(axes, storyRows, allRows, recipes)
  const changed = await Promise.all([
    writeOrCheck(storyPath, renderStorySource(storyRows), checkOnly),
    writeOrCheck(reportPath, `${JSON.stringify(report, null, 2)}\n`, checkOnly),
  ])
  if (checkOnly) {
    console.log(`Contract coverage is current: ${recipes.length} recipes, ${storyRows.length}/${allRows.length} theme stories.`)
  } else {
    console.log(`Generated contract coverage: ${recipes.length} recipes, ${storyRows.length}/${allRows.length} theme stories${changed.some(Boolean) ? "." : " (no changes)."}`)
  }
}

if (import.meta.main) {
  const checkOnly = Bun.argv.includes("--check")
  await generateContractStoryArtifacts(checkOnly).catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
