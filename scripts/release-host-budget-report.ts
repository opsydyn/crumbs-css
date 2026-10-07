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
  verifyReleaseHostBudgetRegistry,
} from "./release-host-budget-policy"

export type ReleaseHostBudgetArtifact = Readonly<{ path: string; sha256: string }>
export type VerifyReleaseHostBudgetReportOptions = Readonly<{
  reportDirectory: string
  repositoryRoot: string
  expectedRevision: string
  expectedArtifacts?: readonly ReleaseHostBudgetArtifact[]
  checkCurrentArtifacts?: boolean
}>
export type ReleaseHostBudgetReportVerification = Readonly<{
  qualified: boolean
  blockers: readonly string[]
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
  const distributionRoot = resolve(repositoryRoot, "packages/css/dist")
  return readdirSync(distributionRoot)
    .sort()
    .filter(path => !path.endsWith(".map"))
    .map(path => ({
      path,
      sha256: createHash("sha256").update(readFileSync(join(distributionRoot, path))).digest("hex"),
    }))
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
    if (comparisonRecord.formatVersion !== 2) blockers.push("Host-budget comparison formatVersion must be 2")
    if (sourceRevision === undefined) blockers.push("Host-budget comparison sourceRevision is required")
    else if (sourceRevision !== options.expectedRevision) {
      blockers.push(`Host-budget source revision ${sourceRevision} does not match release revision ${options.expectedRevision}`)
    }
  }

  let sourceDigest: string | undefined
  if (!identityRecord) blockers.push("Host-budget input-identity.json must contain an object")
  else {
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
    blockers.push(...verifyReleaseHostBudgetRegistry(registry))
    blockers.push(...verifyRecordedBaselines(registry, repositoryRoot)
      .map(issue => `Invalid recorded baseline ${issue.id} (${issue.code}): ${issue.message}`))
    blockers.push(...verifyDiagnosticBaselines(registry, repositoryRoot)
      .map(issue => `Invalid diagnostic baseline ${issue.id} (${issue.code}): ${issue.message}`))

    if (comparisonRecord && Array.isArray(comparisonRecord.metrics)) {
      if (rawReportFiles.every(name => raw[name] !== undefined)) {
        try {
          const rederived = compareRecordedMetrics(registry, repositoryRoot, {
            effect: raw["effect.json"],
            runtimeGraph: raw["runtime-graph.json"],
            runtimeInit: raw["runtime-initialization.json"],
            benchmark: raw["benchmark-summary.json"],
            incremental: raw["metro-incremental.json"],
            editor: raw["editor.json"],
          })
          if (!isDeepStrictEqual(comparisonRecord.metrics, rederived.metrics)) {
            blockers.push("Stored metric rows differ from rederived rows from the raw host measurements")
          }
        } catch (error) {
          blockers.push(`Could not rederive host-budget metrics: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      blockers.push(...evaluateReleaseHostBudgetRows(comparisonRecord.metrics).blockers)
    } else {
      blockers.push("Host-budget comparison must contain a metric row array")
    }
  }

  return {
    qualified: blockers.length === 0,
    blockers,
    ...(sourceRevision === undefined ? {} : { sourceRevision }),
    ...(sourceDigest === undefined ? {} : { sourceDigest }),
  }
}
