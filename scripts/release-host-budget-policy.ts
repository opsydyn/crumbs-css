import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { isDeepStrictEqual } from "node:util"
import { hostBudgetPolicyBindingCodec, releaseHostBudgetPolicyCodec, type HostBudgetPolicy, type HostBudgetPolicyBinding, type ReleaseHostBudgetEvaluation } from "../packages/css/bench/release-host-budget-policy-contract"
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


const approvedRegistryCanonicalSha256 = "0a68e25d399b4e66f5aef5bcdada0d6e40cb3ec3aa11332950b476f11dc9fe95"
const approvedPolicyId = "crumbs-host-budgets-2026-10-08-consumer-scope-v1"
const approvedRegistrySha256 = "0f5752c430db6ced1f8d8a5c94c7de865a3ba9daadaa9a60584148eeb0a4687b"
const approvedAdvisoryIds = new Set([
  "runtime-initialization-node22-esm", "runtime-initialization-node22-cjs",
  "runtime-initialization-current-esm", "runtime-initialization-current-cjs",
  "runtime-theme-core-esm-graph-bytes", "runtime-theme-core-cjs-graph-bytes",
  "runtime-tokens-esm-graph-bytes", "runtime-tokens-cjs-graph-bytes",
  "runtime-theme-compatibility-esm-graph-bytes", "runtime-theme-compatibility-cjs-graph-bytes",
])
// Compiled approval pins prevent a self-consistent edited policy from authorising new roles or evidence.
const approvedBaselineFiles = [
  {
    "path": "docs/evidence/2026-09-14-benchmark-repair/adapter-summary.json",
    "sha256": "1a6103cadc966622bc193db61dcf657d40320914706b4bf3fe02e7a51ad40c7a"
  },
  {
    "path": "docs/evidence/2026-09-15-editor-scale/raw.json",
    "sha256": "c7a6e4f28fac639e21785b11ebbfbb60e973172f86f2f3df4e8dd65a01c8f62d"
  },
  {
    "path": "docs/evidence/2026-09-15-runtime-initialization/baseline.json",
    "sha256": "83ecef0a083031fc864705bdeea6b321ec676fc67c079034ac67d012b4dded7e"
  },
  {
    "path": "docs/evidence/2026-09-21-m4-6-incremental-baseline/metro-incremental.json",
    "sha256": "b0b8bc07f19d6a0f446770b78116ae652a61215caa50cdb0c5d69d18ff63d3c4"
  },
  {
    "path": "docs/evidence/2026-09-21-m4-6-runtime-byte-budget-admission/admission.json",
    "sha256": "a24cd238e72fa951b56ef2c89cb9fab09dafe392f78cad63a7ac46cdb674dda1"
  }
]
const approvedMetrics = releaseHostBudgetMetricContracts.map(({ id, selector }) => ({
  id, selector, enforcement: approvedAdvisoryIds.has(id) ? "advisory" as const : "blocking" as const,
}))
const sha256 = (data: string | Uint8Array): string => createHash("sha256").update(data).digest("hex")
function validatePolicy(value: unknown): readonly string[] {
  const decoded = releaseHostBudgetPolicyCodec.decode(value)
  if (!decoded.ok) return decoded.issues.map(issue => `Invalid host-budget policy: ${issue.message}`)
  const policy = decoded.value
  const blockers: string[] = []
  if (policy.policyId !== approvedPolicyId) blockers.push("Host-budget policy ID differs from approved policy")
  if (policy.registrySha256 !== approvedRegistrySha256) blockers.push("Host-budget policy registry digest differs from approval")
  if (!isDeepStrictEqual(policy.metrics, approvedMetrics)) blockers.push("Host-budget policy roles, IDs or selectors differ from the approved partition")
  if (!isDeepStrictEqual(policy.baselineFiles, approvedBaselineFiles)) blockers.push("Host-budget policy baseline evidence inventory differs from approval")
  return blockers
}
export function loadHostBudgetPolicy(repositoryRoot: string): HostBudgetPolicy {
  const decoded = releaseHostBudgetPolicyCodec.decodeJson(readFileSync(resolve(repositoryRoot, "scripts/release-host-budget-policy.json"), "utf8"))
  if (!decoded.ok) throw Error(`Invalid host-budget policy: ${JSON.stringify(decoded.issues)}`)
  const blockers = [...validatePolicy(decoded.value)]
  if (sha256(readFileSync(resolve(repositoryRoot, "packages/css/bench/budgets.json"))) !== approvedRegistrySha256) blockers.push("Host-budget registry bytes differ from approval")
  for (const file of approvedBaselineFiles) {
    if (sha256(readFileSync(resolve(repositoryRoot, file.path))) !== file.sha256) blockers.push(`Host-budget baseline evidence bytes changed: ${file.path}`)
  }
  if (blockers.length) throw Error(blockers.join("\n"))
  return decoded.value
}
export function captureHostBudgetPolicyBinding(repositoryRoot: string): HostBudgetPolicyBinding {
  const policy = loadHostBudgetPolicy(repositoryRoot)
  return { policyId: policy.policyId, policySha256: sha256(readFileSync(resolve(repositoryRoot, "scripts/release-host-budget-policy.json"))), registrySha256: policy.registrySha256 }
}
export function verifyHostBudgetPolicyBinding(binding: unknown, repositoryRoot: string): readonly string[] {
  const decoded = hostBudgetPolicyBindingCodec.decode(binding)
  if (!decoded.ok) return ["Missing or malformed host-budget policy binding"]
  try {
    return isDeepStrictEqual(decoded.value, captureHostBudgetPolicyBinding(repositoryRoot)) ? [] : ["Host-budget policy binding does not match the checked-out approved policy and registry"]
  } catch (error) { return [`Invalid checked-out host-budget policy: ${error instanceof Error ? error.message : String(error)}`] }
}

const approvedHostDomains = new Set([
  "runtime-footprint",
  "cold-transform",
  "warm-transform",
  "incremental-rebuild",
  "editor",
])
const expectedById = new Map(releaseHostBudgetMetricContracts.map(contract => [contract.id, contract]))

export function verifyReleaseHostBudgetRegistry(registry: BudgetRegistry, policy: HostBudgetPolicy): readonly string[] {
  const blockers: string[] = [...validatePolicy(policy)]
  if (sha256(JSON.stringify(registry)) !== approvedRegistryCanonicalSha256) blockers.push("Host-budget registry contracts differ from the approved snapshot")

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
  policy: HostBudgetPolicy,
): ReleaseHostBudgetEvaluation {
  const blockers = [...validatePolicy(policy)]
  const blocking = { passIds: [] as string[], failIds: [] as string[], incompleteIds: [] as string[] }
  const advisory = { passIds: [] as string[], failIds: [] as string[], incompleteIds: [] as string[] }
  if (!Array.isArray(rows)) return { releasePolicyQualified: false, blockers: [...blockers, "Host-budget rows must be an array"], blocking, advisory }
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (!row || typeof row.id !== "string") { blockers.push("Malformed host-budget result row"); continue }
    counts.set(row.id, (counts.get(row.id) ?? 0) + 1)
    if (!expectedById.has(row.id)) blockers.push(`Unexpected host-budget result row: ${row.id}`)
  }
  for (const { id } of releaseHostBudgetMetricContracts) {
    const count = counts.get(id) ?? 0
    const summary = approvedAdvisoryIds.has(id) ? advisory : blocking
    if (count !== 1) {
      summary.incompleteIds.push(id)
      blockers.push(count === 0 ? `Missing host-budget result row: ${id}` : `Duplicate host-budget result row: ${id} (${count} rows)`)
      continue
    }
    const result = rows.find(row => row?.id === id)!.result
    if (result === "pass") summary.passIds.push(id)
    else if (result === "fail") {
      summary.failIds.push(id)
      if (!approvedAdvisoryIds.has(id)) blockers.push(`Host-budget metric ${id} is fail; expected pass`)
    } else {
      summary.incompleteIds.push(id)
      blockers.push(`Host-budget metric ${id} is ${String(result)}; expected a complete pass or fail result`)
    }
  }
  return { releasePolicyQualified: blockers.length === 0, blockers, blocking, advisory }
}
