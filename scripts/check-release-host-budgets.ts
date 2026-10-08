import { execFileSync } from "node:child_process"
import { resolve } from "node:path"
import {
  collectReleaseHostBudgetArtifactInventory,
  verifyReleaseHostBudgetReport,
} from "./release-host-budget-report"

const repositoryRoot = resolve(import.meta.dir, "..")
const reportDirectory = process.env.CRUMBS_HOST_BUDGET_REPORT

if (!reportDirectory) {
  console.error("CRUMBS_HOST_BUDGET_REPORT is required; run the approved host-budget measurement first.")
  process.exitCode = 1
} else {
  try {
    const expectedRevision = process.env.CRUMBS_RELEASE_SOURCE_REVISION?.trim() ||
      execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim()
    const result = verifyReleaseHostBudgetReport({
      reportDirectory,
      repositoryRoot,
      expectedRevision,
      expectedArtifacts: collectReleaseHostBudgetArtifactInventory(repositoryRoot),
    })
    console.log(result.releasePolicyQualified
      ? `Release host-budget policy admits ${result.sourceRevision}; releasePolicyQualified=true`
      : `Release host-budget policy is blocked for ${result.sourceRevision ?? "unknown revision"}; releasePolicyQualified=false`)
    for (const [label, summary] of [["Blocking", result.blocking], ["Advisory", result.advisory]] as const) {
      console.log(`${label}: ${summary.passIds.length} pass, ${summary.failIds.length} fail, ${summary.incompleteIds.length} incomplete`)
    }
    for (const id of result.advisory.failIds) console.log(`Advisory failure: ${id} (numerical budget exceeded)`)
    for (const blocker of result.blockers) console.error(`- ${blocker}`)
    if (!result.releasePolicyQualified) process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
