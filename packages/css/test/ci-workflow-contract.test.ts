import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

type Step = Readonly<{
  name: string
  run?: string
  uses?: string
  with?: Readonly<Record<string, string | number>>
}>

type CiWorkflow = Readonly<{
  on: Readonly<{
    pull_request?: Readonly<{ "paths-ignore"?: ReadonlyArray<string> }>
  }>
  jobs: Readonly<{
    check: Readonly<{ steps: ReadonlyArray<Step> }>
  }>
}>

type RootPackage = Readonly<{
  scripts?: Readonly<Record<string, string>>
}>

const repositoryRoot = resolve(import.meta.dir, "..", "..", "..")
const rootPackage = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
) as RootPackage
const workflow = Bun.YAML.parse(
  readFileSync(resolve(repositoryRoot, ".github", "workflows", "ci.yml"), "utf8"),
) as CiWorkflow

describe("CI consumer qualification contract", () => {
  it("runs app changes through locked package, Storybook, and packed Expo checks", () => {
    const steps = workflow.jobs.check.steps
    const commands = steps.flatMap((step) => step.run === undefined ? [] : [step.run])

    expect(workflow.on.pull_request?.["paths-ignore"] ?? []).not.toContain("apps/**")
    expect(commands).toContain("bun install --frozen-lockfile")
    expect(commands).toContain("bun run build")
    expect(commands).toContain("bun run typecheck")
    expect(commands).toContain("bun run test")
    expect(rootPackage.scripts?.test).toContain("bun run --filter @crumbs/storybook test")
    expect(commands).toContain("bun run app:typecheck")
    expect(commands).toContain("bun run playground:distribution --check")
  })
})
