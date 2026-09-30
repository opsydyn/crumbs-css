import { createHash } from "node:crypto"
import { readFileSync, realpathSync, statSync } from "node:fs"
import { isAbsolute, relative, resolve, sep } from "node:path"
import { GUARANTEES_DOMAINS, type GuaranteesMatrix, type GuaranteesMatrixIssue } from "./model"

type BudgetRegistry = {
  readonly metrics?: ReadonlyArray<{
    readonly id?: unknown
    readonly threshold?: { readonly status?: unknown }
  }>
}

function issue(code: string, message: string, path?: string): GuaranteesMatrixIssue {
  return { code, message, ...(path === undefined ? {} : { path }) }
}

function isWithin(root: string, target: string): boolean {
  const pathFromRoot = relative(root, target)
  return pathFromRoot === "" || (pathFromRoot !== ".." && !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot))
}

function validateReferencePath(path: string, fieldPath: string): GuaranteesMatrixIssue | undefined {
  if (
    path.length === 0
    || path !== path.trim()
    || path.includes("\\")
    || path.includes("\u0000")
    || path.startsWith("/")
    || /^[a-zA-Z]:/u.test(path)
    || isAbsolute(path)
    || path.split("/").some(segment => segment === "" || segment === "." || segment === "..")
  ) {
    return issue("unsafe-reference-path", "Expected a normalized, repository-relative path using forward slashes.", fieldPath)
  }
  return undefined
}

function validateFileReference(input: {
  readonly repositoryRoot: string
  readonly path: string
  readonly fieldPath: string
  readonly evidence: boolean
}): { readonly realPath?: string; readonly issue?: GuaranteesMatrixIssue } {
  const unsafe = validateReferencePath(input.path, input.fieldPath)
  if (unsafe !== undefined) return { issue: unsafe }
  if (input.evidence && !input.path.startsWith("docs/evidence/")) {
    return { issue: issue("evidence-outside-root", "Evidence artifacts must be below docs/evidence/.", input.fieldPath) }
  }

  const target = resolve(input.repositoryRoot, input.path)
  let targetRealPath: string
  let repositoryRealPath: string
  try {
    targetRealPath = realpathSync(target)
    repositoryRealPath = realpathSync(input.repositoryRoot)
  } catch {
    return { issue: issue("reference-not-found", "Referenced file does not exist.", input.fieldPath) }
  }
  if (!isWithin(repositoryRealPath, targetRealPath)) {
    return { issue: issue("reference-outside-root", "Referenced file resolves outside the repository.", input.fieldPath) }
  }

  if (input.evidence) {
    let evidenceRealPath: string
    try {
      evidenceRealPath = realpathSync(resolve(repositoryRealPath, "docs/evidence"))
    } catch {
      return { issue: issue("evidence-root-not-found", "The repository evidence root does not exist.", input.fieldPath) }
    }
    if (!isWithin(repositoryRealPath, evidenceRealPath)) {
      return { issue: issue("reference-outside-root", "The docs/evidence directory resolves outside the repository.", input.fieldPath) }
    }
    if (!isWithin(evidenceRealPath, targetRealPath)) {
      return { issue: issue("reference-outside-root", "Evidence artifact resolves outside docs/evidence/.", input.fieldPath) }
    }
  }

  try {
    if (!statSync(targetRealPath).isFile()) {
      return { issue: issue("reference-not-file", "Referenced path must resolve to a regular file.", input.fieldPath) }
    }
  } catch {
    return { issue: issue("reference-not-found", "Referenced file does not exist.", input.fieldPath) }
  }
  return { realPath: targetRealPath }
}

function loadBudgetRegistry(repositoryRoot: string): BudgetRegistry | undefined {
  try {
    return JSON.parse(readFileSync(resolve(repositoryRoot, "packages/css/bench/budgets.json"), "utf8")) as BudgetRegistry
  } catch {
    return undefined
  }
}

/** Validate cross-row, filesystem and registry invariants after strict schema decoding. */
export function validateGuaranteesMatrix(
  matrix: GuaranteesMatrix,
  repositoryRoot: string,
  currentSourceRevision: string,
): ReadonlyArray<GuaranteesMatrixIssue> {
  const issues: GuaranteesMatrixIssue[] = []
  const ids = new Set<string>()
  const domains = new Set<string>()
  const budgetRegistry = loadBudgetRegistry(repositoryRoot)

  for (const [rowIndex, row] of matrix.rows.entries()) {
    const rowPath = `rows.${rowIndex}`
    domains.add(row.domain)
    if (ids.has(row.id)) issues.push(issue("duplicate-row-id", `Duplicate row ID ${JSON.stringify(row.id)}.`, `${rowPath}.id`))
    ids.add(row.id)

    if (row.supportStatus === "unsupported" && !row.basis.some(reference => reference.role === "contract" || reference.role === "policy")) {
      issues.push(issue("unsupported-basis-required", "Unsupported claims require a contract or policy basis reference.", `${rowPath}.basis`))
    }

    if ((row.measurementStatus === "passed" || row.measurementStatus === "failed") && row.evidence.length === 0) {
      issues.push(issue("measurement-evidence-required", "Passed and failed measurements require retained evidence.", `${rowPath}.evidence`))
    }
    if (
      row.measurementStatus === "passed"
      && row.evidence.some(evidence => evidence.resultStatus !== "passed")
    ) {
      issues.push(issue("measurement-evidence-outcome-mismatch", "Passed measurements require every linked evidence outcome to be passed.", `${rowPath}.evidence`))
    }
    if (
      row.measurementStatus === "failed"
      && !row.evidence.some(evidence => evidence.resultStatus === "failed")
    ) {
      issues.push(issue("measurement-evidence-outcome-mismatch", "Failed measurements require at least one linked evidence outcome to be failed.", `${rowPath}.evidence`))
    }
    if (row.measurementStatus === "passed" || row.measurementStatus === "failed") {
      for (const [evidenceIndex, evidence] of row.evidence.entries()) {
        if (evidence.sourceRevision !== currentSourceRevision) {
          issues.push(issue(
            "evidence-source-revision-mismatch",
            "Passed and failed measurements must reference the current repository revision; mark historical evidence stale.",
            `${rowPath}.evidence.${evidenceIndex}.sourceRevision`,
          ))
        }
      }
    }
    if (row.measurementStatus === "stale" && row.evidence.length === 0) {
      issues.push(issue("stale-evidence-required", "Stale measurement status requires the historical evidence it describes.", `${rowPath}.evidence`))
    }
    if (row.measurementStatus === "not-run" && row.evidence.length > 0) {
      issues.push(issue("not-run-has-evidence", "A not-run row cannot carry measurement evidence; mark retained prior evidence stale.", `${rowPath}.evidence`))
    }
    if (["not-run", "not-calibrated", "not-applicable"].includes(row.measurementStatus) && row.measurementNote === undefined) {
      issues.push(issue("measurement-note-required", "Incomplete measurement status requires an explanatory note.", `${rowPath}.measurementNote`))
    }

    for (const [basisIndex, reference] of row.basis.entries()) {
      const checked = validateFileReference({
        repositoryRoot,
        path: reference.path,
        fieldPath: `${rowPath}.basis.${basisIndex}.path`,
        evidence: false,
      })
      if (checked.issue !== undefined) issues.push(checked.issue)
    }

    for (const [evidenceIndex, evidence] of row.evidence.entries()) {
      const fieldPath = `${rowPath}.evidence.${evidenceIndex}`
      const checked = validateFileReference({
        repositoryRoot,
        path: evidence.path,
        fieldPath: `${fieldPath}.path`,
        evidence: true,
      })
      if (checked.issue !== undefined) {
        issues.push(checked.issue)
        continue
      }
      if (checked.realPath === undefined) continue
      const digest = createHash("sha256").update(readFileSync(checked.realPath)).digest("hex")
      if (digest !== evidence.sha256) {
        issues.push(issue("evidence-hash-mismatch", `Evidence SHA-256 does not match ${JSON.stringify(evidence.path)}.`, `${fieldPath}.sha256`))
      }
    }

    if (row.budget !== undefined) {
      const metric = budgetRegistry?.metrics?.find(candidate => candidate.id === row.budget!.metricId)
      if (metric === undefined) {
        issues.push(issue("budget-metric-not-found", `Budget metric ${JSON.stringify(row.budget.metricId)} is not in the existing registry.`, `${rowPath}.budget.metricId`))
      } else if (metric.threshold?.status !== row.budget.thresholdStatus) {
        issues.push(issue("budget-threshold-state-mismatch", `Budget threshold state for ${JSON.stringify(row.budget.metricId)} differs from the registry.`, `${rowPath}.budget.thresholdStatus`))
      }
      if (budgetRegistry === undefined) {
        issues.push(issue("budget-registry-not-found", "The existing performance budget registry could not be read.", "packages/css/bench/budgets.json"))
      }
    }
  }

  for (const domain of GUARANTEES_DOMAINS) {
    if (!domains.has(domain)) issues.push(issue("missing-domain", `The matrix has no row for required domain ${JSON.stringify(domain)}.`, "rows"))
  }
  return issues
}
