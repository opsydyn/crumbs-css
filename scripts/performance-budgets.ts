import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  assessBudgetRegistry,
  budgetRegistryCodec,
  verifyRecordedBaselines,
} from "../packages/css/bench/budget-contract"

const repoRoot = resolve(import.meta.dir, "..")
const registryFile = resolve(repoRoot, "packages/css/bench/budgets.json")
const mode = process.argv[2]
if (mode !== "validate" && mode !== "readiness") throw Error("Use validate or readiness")

const decoded = budgetRegistryCodec.decodeJson(readFileSync(registryFile, "utf8"))
if (!decoded.ok) {
  console.log(JSON.stringify({ valid: false, registryReady: false, performanceQualification: "not-run", issues: decoded.issues }, null, 2))
  process.exitCode = 1
} else {
  const baselineIssues = verifyRecordedBaselines(decoded.value, repoRoot)
  const { ready, ...gaps } = assessBudgetRegistry(decoded.value)
  const valid = baselineIssues.length === 0
  const registryReady = valid && ready
  console.log(JSON.stringify({
    valid,
    registryReady,
    performanceQualification: "not-run",
    registryStatus: decoded.value.status,
    metrics: decoded.value.metrics.length,
    ...gaps,
    baselineIssues,
  }, null, 2))
  if (!valid || mode === "readiness" && !registryReady) process.exitCode = 1
}
