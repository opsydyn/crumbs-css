import { readEmittedGraph, summarizeLoadSamples } from "../packages/css/bench/effect-boundary-audit"
import { approvedReleaseHostEnvironment } from "./release-host-environment"
import type { HostBudgetPolicy, HostBudgetPolicyBinding, ReleaseHostBudgetEvaluation } from "../packages/css/bench/release-host-budget-policy-contract"
import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"
import { isDeepStrictEqual } from "node:util"
import { join, resolve } from "node:path"
import {
  budgetRegistryCodec,
  compareRecordedMetrics,
  verifyDiagnosticBaselines,
  verifyRecordedBaselines,
} from "../packages/css/bench/budget-contract"
import { captureGuaranteesSourceIdentity } from "./guarantees-matrix/source-identity"
import {
  evaluateReleaseHostBudgetRows,
  loadHostBudgetPolicy,
  verifyHostBudgetPolicyBinding,
  verifyReleaseHostBudgetRegistry,
} from "./release-host-budget-policy"

export type ReleaseHostBudgetArtifact = Readonly<{ path: string; sha256: string }>
export type VerifyReleaseHostBudgetReportOptions = Readonly<{
  reportDirectory: string
  repositoryRoot: string
  expectedRevision: string
  expectedArtifacts?: readonly ReleaseHostBudgetArtifact[]
  checkCurrentArtifacts?: boolean
  /** Unpacked transferred dist when checkout artifact checks are disabled. */
  artifactDirectory?: string
}>
export type ReleaseHostBudgetReportVerification = ReleaseHostBudgetEvaluation & Readonly<{
  policy?: HostBudgetPolicyBinding
  sourceRevision?: string
  sourceDigest?: string
}>

const rawReportFiles = [
  "effect.json",
  "runtime-graph.json",
  "runtime-initialization.json",
  "benchmark-summary.json",
  "metro-incremental.json",
  "editor.json",
] as const

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readJsonFile(path: string, label: string, blockers: string[]): unknown | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unreadable JSON"
    blockers.push(`Missing or invalid host-budget report file ${label}: ${detail}`)
    return undefined
  }
}

function artifactInventory(repositoryRoot: string): readonly ReleaseHostBudgetArtifact[] {
  return inventoryAtDirectory(resolve(repositoryRoot, "packages/css/dist"))
}

function inventoryAtDirectory(distributionRoot: string): readonly ReleaseHostBudgetArtifact[] {
  return readdirSync(distributionRoot)
    .sort()
    .filter(path => !path.endsWith(".map"))
    .map(path => ({
      path,
      sha256: createHash("sha256").update(readFileSync(join(distributionRoot, path))).digest("hex"),
    }))
}

function verifyRuntimeEvidence(
  raw: Record<string, unknown>,
  artifactDirectory: string,
  expectedArtifacts: readonly ReleaseHostBudgetArtifact[],
  expectedRevision: string,
): readonly string[] {
  const blockers: string[] = []
  const assert = (condition: unknown, detail: string): void => { if (!condition) throw Error(detail) }
  const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0
  const byteCount = (value: unknown): value is number => nonnegative(value) && Number.isSafeInteger(value)
  const sameKeys = (value: unknown, keys: readonly string[]) => isRecord(value) && isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort())
  try {
    assert(isDeepStrictEqual(inventoryAtDirectory(artifactDirectory), expectedArtifacts), "authoritative runtime artifact inventory differs from the measured artifacts")
    const graph = raw["runtime-graph.json"] as Record<string, any>
    assert(isRecord(graph) && graph.formatVersion === 1 && graph.sourceRevision === expectedRevision, "invalid graph format or source revision")
    assert(sameKeys(graph.currentGraphs, ["theme-core", "tokens", "theme"]), "expected exactly six graph scenarios")
    for (const entrypoint of ["theme-core", "tokens", "theme"] as const) {
      assert(sameKeys(graph.currentGraphs[entrypoint], ["esm", "cjs"]), `invalid graph formats: ${entrypoint}`)
      for (const format of ["esm", "cjs"] as const) {
        const scan = graph.currentGraphs[entrypoint][format]
        const entry = `${entrypoint}.${format === "esm" ? "mjs" : "cjs"}`
        assert(isRecord(scan) && scan.entry === entry && byteCount(scan.graphBytes), `invalid graph bytes or entry: ${entry}`)
        assert(Array.isArray(scan.samples) && scan.samples.length === graph.protocol.repetitions && scan.samples.length >= 5 && scan.samples.every((value: unknown) => byteCount(value) && value === scan.graphBytes), `inconsistent deterministic graph samples: ${entry}`)
        const actual = readEmittedGraph(join(artifactDirectory, entry))
        const artifacts = actual.artifacts.map(artifact => ({ file: artifact.file.slice(artifactDirectory.length + 1), bytes: artifact.bytes, sha256: artifact.sha256 }))
        assert(scan.graphBytes === actual.bytes && isDeepStrictEqual(scan.artifacts, artifacts) && isDeepStrictEqual(scan.externals, actual.externals) && scan.nonliteralLoads === actual.nonliteralLoads, `graph artifacts or metadata differ from authoritative runtime artifacts: ${entry}`)
      }
    }
  } catch (error) { blockers.push(`Invalid runtime graph evidence: ${error instanceof Error ? error.message : String(error)}`) }
  try {
    const initialization = raw["runtime-initialization.json"] as Record<string, any>
    assert(isRecord(initialization) && initialization.formatVersion === 1 && initialization.sourceRevision === expectedRevision, "invalid initialisation format or source revision")
    assert(Array.isArray(initialization.scenarios) && initialization.scenarios.length === 4, "expected four runtime/format cells")
    const expectedCells = ["floor.esm", "floor.cjs", "current.esm", "current.cjs"]
    assert(isDeepStrictEqual(initialization.scenarios.map((scenario: any) => `${scenario.runtime}.${scenario.format}`).sort(), expectedCells.sort()), "invalid or duplicate runtime/format cells")
    for (const scenario of initialization.scenarios) {
      const expectedNode = `v${scenario.runtime === "floor" ? approvedReleaseHostEnvironment.nodeFloorVersion : approvedReleaseHostEnvironment.nodeCurrentVersion}`
      const entry = `theme.${scenario.format === "esm" ? "mjs" : "cjs"}`
      assert(scenario.node === expectedNode && scenario.entrySha256 === expectedArtifacts.find(file => file.path === entry)?.sha256, `runtime entry hash or Node identity mismatch: ${entry}`)
      assert(Array.isArray(scenario.samples) && scenario.samples.length === initialization.environment.repetitions && scenario.samples.length >= 5, "invalid retained runtime repetition count")
      assert(isRecord(scenario.warmup) && scenario.warmup.excluded === true, "runtime warm-up must be excluded")
      for (const sample of [scenario.warmup, ...scenario.samples]) {
        assert(isRecord(sample) && nonnegative(sample.loadMs) && sample.node === expectedNode && sample.receipt === "passed" && typeof sample.execPath === "string" && sample.execPath.length > 0, "invalid runtime timing, receipt or per-sample Node identity")
        assert(Number.isFinite(sample.heapDeltaBytes) && Number.isFinite(sample.rssDeltaBytes), "non-finite runtime memory deltas")
        assert(sample.firstDecodeMs === null && byteCount(sample.cacheBytes) && Array.isArray(sample.cacheFiles) && sample.cacheFiles.every((file: unknown) => typeof file === "string"), "invalid runtime probe metadata")
      }
      assert(isDeepStrictEqual(scenario.summary, summarizeLoadSamples(scenario.samples)), "runtime summary differs from retained samples")
    }
  } catch (error) { blockers.push(`Invalid runtime initialisation evidence: ${error instanceof Error ? error.message : String(error)}`) }
  return blockers
}

export function collectReleaseHostBudgetArtifactInventory(repositoryRoot: string): readonly ReleaseHostBudgetArtifact[] {
  return artifactInventory(repositoryRoot)
}

export function verifyReleaseHostBudgetReport(
  options: VerifyReleaseHostBudgetReportOptions,
): ReleaseHostBudgetReportVerification {
  const blockers: string[] = []
  const reportDirectory = resolve(options.reportDirectory)
  const repositoryRoot = resolve(options.repositoryRoot)

  if (options.expectedRevision.trim().length === 0) blockers.push("Expected release source revision is required")

  const comparison = readJsonFile(join(reportDirectory, "comparison.json"), "comparison.json", blockers)
  const identity = readJsonFile(join(reportDirectory, "input-identity.json"), "input-identity.json", blockers)
  const raw: Record<string, unknown> = {}
  for (const name of rawReportFiles) {
    const value = readJsonFile(join(reportDirectory, name), name, blockers)
    if (value !== undefined) raw[name] = value
  }

  const comparisonRecord = isRecord(comparison) ? comparison : undefined
  const identityRecord = isRecord(identity) ? identity : undefined
  const sourceRevision = comparisonRecord && typeof comparisonRecord.sourceRevision === "string"
    ? comparisonRecord.sourceRevision
    : undefined

  if (!comparisonRecord) blockers.push("Host-budget comparison.json must contain an object")
  else {
    if (comparisonRecord.formatVersion !== 3) blockers.push("Host-budget comparison formatVersion must be 3")
    if (sourceRevision === undefined) blockers.push("Host-budget comparison sourceRevision is required")
    else if (sourceRevision !== options.expectedRevision) {
      blockers.push(`Host-budget source revision ${sourceRevision} does not match release revision ${options.expectedRevision}`)
    }
  }

  let policy: HostBudgetPolicy | undefined
  let policyBinding: HostBudgetPolicyBinding | undefined
  try { policy = loadHostBudgetPolicy(repositoryRoot) }
  catch (error) { blockers.push(`Invalid host-budget policy: ${error instanceof Error ? error.message : String(error)}`) }
  const bindingBlockers = verifyHostBudgetPolicyBinding(comparisonRecord?.policy, repositoryRoot)
  blockers.push(...bindingBlockers)
  if (bindingBlockers.length === 0) policyBinding = comparisonRecord!.policy as HostBudgetPolicyBinding
  let evaluation: ReleaseHostBudgetEvaluation = {
    releasePolicyQualified: false, blockers: [],
    blocking: { passIds: [], failIds: [], incompleteIds: [] },
    advisory: { passIds: [], failIds: [], incompleteIds: [] },
  }
  let sourceDigest: string | undefined
  if (!identityRecord) blockers.push("Host-budget input-identity.json must contain an object")
  else {
    blockers.push(...verifyHostBudgetPolicyBinding(identityRecord.policyBefore, repositoryRoot))
    blockers.push(...verifyHostBudgetPolicyBinding(identityRecord.policyAfter, repositoryRoot))
    if (!isDeepStrictEqual(identityRecord.policyBefore, identityRecord.policyAfter) || !isDeepStrictEqual(identityRecord.policyAfter, comparisonRecord?.policy)) {
      blockers.push("Host-budget policy binding drifted between measurement and comparison")
    }
    const sourceBefore = isRecord(identityRecord.sourceBefore) ? identityRecord.sourceBefore : undefined
    const sourceAfter = isRecord(identityRecord.sourceAfter) ? identityRecord.sourceAfter : undefined
    const artifactsBefore = identityRecord.artifactsBefore
    const artifactsAfter = identityRecord.artifactsAfter

    if (!sourceBefore || typeof sourceBefore.sha256 !== "string" || !sourceAfter || typeof sourceAfter.sha256 !== "string") {
      blockers.push("Host-budget input identity must include sourceBefore and sourceAfter digests")
    } else {
      sourceDigest = sourceAfter.sha256
      if (!isDeepStrictEqual(sourceBefore, sourceAfter)) {
        blockers.push("Host-budget source identity drifted between before and after measurement")
      }
      try {
        const currentSource = captureGuaranteesSourceIdentity(repositoryRoot)
        if (!isDeepStrictEqual(sourceAfter, currentSource)) {
          blockers.push("Host-budget source digest or file inventory does not match the current repository source")
        }
      } catch (error) {
        blockers.push(`Could not capture current source identity: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    if (!Array.isArray(artifactsBefore) || !Array.isArray(artifactsAfter)) {
      blockers.push("Host-budget input identity must include before and after package artifact inventories")
    } else {
      if (!isDeepStrictEqual(artifactsBefore, artifactsAfter)) {
        blockers.push("Host-budget package artifact inventory drifted between before and after measurement")
      }
      if (options.expectedArtifacts && !isDeepStrictEqual(artifactsAfter, options.expectedArtifacts)) {
        blockers.push("Host-budget package artifact inventory does not match the expected release artifacts")
      }
      if (options.checkCurrentArtifacts === false && !options.expectedArtifacts) {
        blockers.push("Expected package artifact inventory is required when checkout dist checks are disabled")
      }
      if (options.checkCurrentArtifacts !== false) {
        try {
          const currentArtifacts = artifactInventory(repositoryRoot)
          if (!isDeepStrictEqual(artifactsAfter, currentArtifacts)) {
            blockers.push("Host-budget package artifact inventory does not match the current dist files")
          }
          if (options.expectedArtifacts && !isDeepStrictEqual(options.expectedArtifacts, currentArtifacts)) {
            blockers.push("Expected package artifact inventory does not match the current dist files")
          }
        } catch (error) {
          blockers.push(`Could not capture current package artifacts: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    }
  }

  let decodedRegistry
  try {
    decodedRegistry = budgetRegistryCodec.decodeJson(
      readFileSync(resolve(repositoryRoot, "packages/css/bench/budgets.json"), "utf8"),
    )
  } catch (error) {
    blockers.push(`Could not read budget registry: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (!decodedRegistry) {
    // The registry read already contributed a specific blocker above.
  } else if (!decodedRegistry.ok) {
    blockers.push(...decodedRegistry.issues.map(issue => `Invalid budget registry: ${issue.message}`))
  } else {
    const registry = decodedRegistry.value
    if (policy) blockers.push(...verifyReleaseHostBudgetRegistry(registry, policy))
    blockers.push(...verifyRecordedBaselines(registry, repositoryRoot)
      .map(issue => `Invalid recorded baseline ${issue.id} (${issue.code}): ${issue.message}`))
    blockers.push(...verifyDiagnosticBaselines(registry, repositoryRoot)
      .map(issue => `Invalid diagnostic baseline ${issue.id} (${issue.code}): ${issue.message}`))

    if (comparisonRecord && Array.isArray(comparisonRecord.metrics)) {
      if (rawReportFiles.every(name => raw[name] !== undefined)) {
        try {
          const authoritativeDirectory = options.checkCurrentArtifacts === false
            ? options.artifactDirectory
            : resolve(repositoryRoot, "packages/css/dist")
          if (!authoritativeDirectory) blockers.push("Authoritative runtime artifact directory is required when checkout dist checks are disabled")
          else blockers.push(...verifyRuntimeEvidence(raw, resolve(authoritativeDirectory), options.expectedArtifacts ?? artifactInventory(repositoryRoot), options.expectedRevision))
          const rederived = compareRecordedMetrics(registry, repositoryRoot, {
            effect: raw["effect.json"],
            runtimeGraph: raw["runtime-graph.json"],
            runtimeInit: raw["runtime-initialization.json"],
            benchmark: raw["benchmark-summary.json"],
            incremental: raw["metro-incremental.json"],
            editor: raw["editor.json"],
          })
          if (policy) {
            evaluation = evaluateReleaseHostBudgetRows(rederived.metrics, policy)
            for (const field of ["releasePolicyQualified", "blockers", "blocking", "advisory"] as const) {
              if (!isDeepStrictEqual(comparisonRecord[field], evaluation[field])) blockers.push(`Stored ${field} differs from independently rederived host-budget policy evaluation`)
            }
          }
          if (!isDeepStrictEqual(comparisonRecord.performanceQualified, rederived.performanceQualified)) blockers.push("Stored performanceQualified differs from the numerical comparison")
          if (!isDeepStrictEqual(comparisonRecord.metrics, rederived.metrics)) {
            blockers.push("Stored metric rows differ from rederived rows from the raw host measurements")
          }
        } catch (error) {
          blockers.push(`Could not rederive host-budget metrics: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      blockers.push(...evaluation.blockers)
    } else {
      blockers.push("Host-budget comparison must contain a metric row array")
    }
  }

  return {
    ...evaluation,
    releasePolicyQualified: blockers.length === 0 && evaluation.releasePolicyQualified,
    ...(policyBinding === undefined ? {} : { policy: policyBinding }),
    blockers,
    ...(sourceRevision === undefined ? {} : { sourceRevision }),
    ...(sourceDigest === undefined ? {} : { sourceDigest }),
  }
}
