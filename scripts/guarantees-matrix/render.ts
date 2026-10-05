import type { GuaranteesMatrix, GuaranteesMatrixIssue, GuaranteesMatrixRow } from "./model"

function escapeCell(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("{", "&#123;")
    .replaceAll("}", "&#125;")
    .replaceAll("\\", "&#92;")
    .replaceAll("|", "&#124;")
    .replaceAll("`", "&#96;")
    .replace(/[\r\n]+/gu, " ")
}

function renderBasis(row: GuaranteesMatrixRow): string {
  return row.basis.map(reference => `${escapeCell(reference.role)}: \`${escapeCell(reference.path)}\``).join("<br />")
}

function renderEvidence(row: GuaranteesMatrixRow): string {
  return row.evidence.map(evidence => {
    const versions = Object.entries(evidence.environment.versions)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, version]) => `${escapeCell(name)} ${escapeCell(version)}`)
      .join(", ")
    return [
      `Evidence: \`${escapeCell(evidence.path)}\``,
      `SHA-256 ${escapeCell(evidence.sha256)}`,
      `revision ${escapeCell(evidence.sourceRevision)}`,
      ...(evidence.sourceDigest === undefined ? [] : [`source content SHA-256 ${escapeCell(evidence.sourceDigest)}`]),
      `${escapeCell(evidence.environment.name)} (${versions})`,
      `outcome: ${escapeCell(evidence.resultStatus)}; result: ${escapeCell(evidence.result)}`,
      `scope: ${escapeCell(evidence.scopeLimit)}`,
    ].join("; ")
  }).join("<br />")
}

function renderBudget(row: GuaranteesMatrixRow): string {
  if (row.budget === undefined) return "—"
  const pending = row.budget.thresholdStatus === "pending-review"
    ? " This measurement is not an approved performance guarantee."
    : ""
  return `\`${escapeCell(row.budget.metricId)}\` threshold ${escapeCell(row.budget.thresholdStatus)}.${pending}`
}

function renderRow(row: GuaranteesMatrixRow): string {
  const evidence = renderEvidence(row)
  const basis = renderBasis(row)
  const sources = [basis, evidence].filter(value => value.length > 0).join("<br />")
  const note = row.measurementNote === undefined ? "" : ` Note: ${escapeCell(row.measurementNote)}`
  return `| ${escapeCell(row.id)} | ${escapeCell(row.domain)} | ${escapeCell(row.claim)} | ${escapeCell(row.supportStatus)} | ${escapeCell(row.measurementStatus)}${note} | ${sources} | ${renderBudget(row)} |`
}

/** Render the matrix in declared row/reference order with stable, MDX-safe cells. */
export function renderGuaranteesMatrix(matrix: GuaranteesMatrix): string {
  return [
    "---",
    "title: Guarantees matrix",
    "description: Declared Crumbs CSS support, measured outcomes, and remaining qualification gaps.",
    "---",
    "",
    "# Crumbs CSS guarantees matrix",
    "",
    `Matrix schema version: ${matrix.schemaVersion}. This versioned reference keeps contract support separate from measured outcomes. A test or build result does not by itself establish a support guarantee. Each claim is limited to its cited basis, artifact, source revision, environment, command, result, and scope limit.`,
    "",
    "`supported`, `conditional`, `unsupported`, and `unspecified` describe the declared contract. `passed`, `failed`, `not-run`, `not-calibrated`, `stale`, and `not-applicable` describe measurement evidence for the row. Missing evidence is not proof of unsupported behavior.",
    "",
    "| ID | Domain | Claim | Contract support | Measurement | Basis and evidence | Budget / scope notes |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...matrix.rows.map(renderRow),
    "",
    "A pending budget threshold is not an approved performance guarantee. Device performance, native visual fidelity, screen-reader acceptance, and Android behavior require direct evidence in the named target environment. This matrix does not claim exhaustive coverage of unlisted APIs, packages, versions, or applications.",
    "",
  ].join("\n")
}

/** Return a check issue when the checked-in generated page differs from its source matrix. */
export function generatedPageCheckIssues(expected: string, actual: string): ReadonlyArray<GuaranteesMatrixIssue> {
  return expected === actual
    ? []
    : [{ code: "generated-page-stale", message: "Generated guarantees MDX is stale; run `bun run guarantees:render`.", path: "docs/src/content/docs/reference/guarantees.mdx" }]
}
