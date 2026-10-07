import type { BudgetRegistry } from "../packages/css/bench/budget-contract"

export const releaseHostBudgetMetricContracts: readonly { id: string; selector: string }[] = Object.freeze([
  { id: "runtime-initialization-node22-esm", selector: "runtime-init.floor.esm.load-ms.median" },
  { id: "runtime-initialization-node22-cjs", selector: "runtime-init.floor.cjs.load-ms.median" },
  { id: "runtime-initialization-current-esm", selector: "runtime-init.current.esm.load-ms.median" },
  { id: "runtime-initialization-current-cjs", selector: "runtime-init.current.cjs.load-ms.median" },
  { id: "cold-transform-ms", selector: "benchmark.cold-transform.max-median-ms" },
  { id: "warm-transform-ms", selector: "benchmark.warm-transform.max-median-ms" },
  { id: "incremental-rebuild", selector: "metro-incremental.direct-css-edit-ms.median" },
  { id: "editor-tsc-wall-10000", selector: "editor.tsc.10000.wall-ms.median" },
  { id: "editor-tsgo-wall-10000", selector: "editor.tsgo.10000.wall-ms.median" },
  { id: "editor-tsc-memory-10000", selector: "editor.tsc.10000.memory-kib.median" },
  { id: "editor-tsgo-memory-10000", selector: "editor.tsgo.10000.memory-kib.median" },
  { id: "editor-tsc-instantiations-10000", selector: "editor.tsc.10000.instantiations" },
  { id: "editor-tsgo-instantiations-10000", selector: "editor.tsgo.10000.instantiations" },
  { id: "editor-first-completion-10000", selector: "editor.10000.first-completion-ms.median" },
  { id: "editor-warm-completion-10000", selector: "editor.10000.warm-completion-ms.median" },
  { id: "runtime-theme-core-esm-graph-bytes", selector: "runtime.theme-core.esm.graph-bytes" },
  { id: "runtime-theme-core-cjs-graph-bytes", selector: "runtime.theme-core.cjs.graph-bytes" },
  { id: "runtime-tokens-esm-graph-bytes", selector: "runtime.tokens.esm.graph-bytes" },
  { id: "runtime-tokens-cjs-graph-bytes", selector: "runtime.tokens.cjs.graph-bytes" },
  { id: "runtime-theme-compatibility-esm-graph-bytes", selector: "runtime.theme-compatibility.esm.graph-bytes" },
  { id: "runtime-theme-compatibility-cjs-graph-bytes", selector: "runtime.theme-compatibility.cjs.graph-bytes" },
])

const approvedHostDomains = new Set([
  "runtime-footprint",
  "cold-transform",
  "warm-transform",
  "incremental-rebuild",
  "editor",
])
const expectedById = new Map(releaseHostBudgetMetricContracts.map(contract => [contract.id, contract]))

export function verifyReleaseHostBudgetRegistry(registry: BudgetRegistry): readonly string[] {
  const blockers: string[] = []

  for (const contract of releaseHostBudgetMetricContracts) {
    const rows = registry.metrics.filter(metric => metric.id === contract.id)
    if (rows.length === 0) {
      blockers.push(`Missing approved host-budget registry metric: ${contract.id}`)
      continue
    }
    if (rows.length > 1) blockers.push(`Duplicate host-budget registry metric: ${contract.id}`)

    for (const metric of rows) {
      if (!approvedHostDomains.has(metric.domain)) {
        blockers.push(`Host-budget metric ${contract.id} was reclassified to domain ${metric.domain}`)
      }
      if (metric.baseline.status !== "recorded") {
        blockers.push(`Host-budget metric ${contract.id} does not have a recorded baseline`)
      } else if (metric.baseline.selector !== contract.selector) {
        blockers.push(
          `Host-budget metric ${contract.id} selector changed from ${contract.selector} to ${metric.baseline.selector}`,
        )
      }
      if (metric.threshold.status !== "approved") {
        blockers.push(`Host-budget metric ${contract.id} does not have an approved threshold`)
      }
    }
  }

  for (const metric of registry.metrics) {
    if (approvedHostDomains.has(metric.domain) && !expectedById.has(metric.id)) {
      blockers.push(`Unapproved host-budget registry metric: ${metric.id}`)
    }
  }

  return blockers
}

export function evaluateReleaseHostBudgetRows(
  rows: readonly { id: string; result: string }[],
): { qualified: boolean; blockers: readonly string[] } {
  const blockers: string[] = []
  const counts = new Map<string, number>()

  for (const row of rows) counts.set(row.id, (counts.get(row.id) ?? 0) + 1)

  for (const contract of releaseHostBudgetMetricContracts) {
    const count = counts.get(contract.id) ?? 0
    if (count === 0) blockers.push(`Missing host-budget result row: ${contract.id}`)
    if (count > 1) blockers.push(`Duplicate host-budget result row: ${contract.id} (${count} rows)`)
  }

  for (const row of rows) {
    if (!expectedById.has(row.id)) {
      blockers.push(`Unexpected host-budget result row: ${row.id}`)
      continue
    }
    if (row.result !== "pass") {
      blockers.push(`Host-budget metric ${row.id} is ${row.result}; expected pass`)
    }
  }

  return { qualified: blockers.length === 0, blockers }
}
