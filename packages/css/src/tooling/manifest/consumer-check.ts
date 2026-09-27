import { decodeManifest } from "./schema"
import { decodeManifestCompatibilityReport } from "./comparison-report-schema"
import {
  MANIFEST_COMPATIBILITY_REPORT_FORMAT,
  MANIFEST_COMPATIBILITY_REPORT_VERSION,
} from "./comparison-report-model"
import type {
  ManifestAnalysisLimit,
  ManifestCompatibilityFinding,
  ManifestCompatibilityReport,
  ManifestConsumerReference,
} from "./comparison-report-model"
import type { DesignSystemManifest, ManifestDependency } from "./model"

type ManifestConsumerAnalysis = {
  readonly report: ManifestCompatibilityReport
  readonly referencesByTarget: ReadonlyMap<string, ReadonlyArray<ManifestConsumerReference>>
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function referenceKey(reference: ManifestConsumerReference): string {
  const origin = reference.dependency.origin
  return JSON.stringify([
    reference.package.name,
    reference.package.version,
    reference.dependency.from,
    reference.dependency.to,
    reference.dependency.kind,
    origin?.moduleId,
    origin?.exportPath,
    origin?.property,
  ])
}

function referenceFor(
  packageIdentity: { readonly name: string; readonly version: string },
  dependency: ManifestDependency,
): ManifestConsumerReference {
  return {
    package: { name: packageIdentity.name, version: packageIdentity.version },
    dependency: {
      from: dependency.from,
      to: dependency.to!,
      kind: dependency.kind,
      ...(dependency.origin === undefined ? {} : {
        origin: {
          moduleId: dependency.origin.moduleId,
          exportPath: dependency.origin.exportPath,
          ...(dependency.origin.property === undefined ? {} : { property: dependency.origin.property }),
        },
      }),
    },
  }
}

function buildAnalysisLimits(
  current: DesignSystemManifest,
  consumers: ReadonlyArray<DesignSystemManifest>,
): ReadonlyArray<ManifestAnalysisLimit> {
  const limits: ManifestAnalysisLimit[] = [
    { code: "explicit-coverage", message: "Analysis is limited to the coverage roots declared in the supplied manifests." },
    { code: "component-use-unavailable", message: "Manifest v1 does not record consumer use of component slots or variants." },
  ]
  const manifests = [current, ...consumers]
  if (manifests.some(manifest => manifest.coverage.unresolved.length > 0 || manifest.dependencies.some(edge => edge.resolution === "unresolved"))) {
    limits.push({ code: "unresolved-references", message: "One or more supplied manifests contain unresolved references." })
  }
  if (consumers.length === 0) {
    limits.push({ code: "consumer-manifests-not-supplied", message: "No consumer manifests were supplied; consumer impact is unknown." })
  }
  return limits.sort((left, right) => compareOrdinal(left.code, right.code) || compareOrdinal(left.message, right.message))
}

function buildConsumerReferences(
  providerName: string,
  consumerInputs: ReadonlyArray<unknown>,
): {
  readonly consumers: ReadonlyArray<DesignSystemManifest>
  readonly referencesByTarget: ReadonlyMap<string, ReadonlyArray<ManifestConsumerReference>>
} {
  const consumers = consumerInputs.map(decodeManifest)
  const identities = new Set<string>()
  const referencesByTarget = new Map<string, ManifestConsumerReference[]>()
  for (const consumer of consumers) {
    if (consumer.package.name === providerName) {
      throw new TypeError(`Provider package ${JSON.stringify(providerName)} cannot also be supplied as a consumer.`)
    }
    const identity = `${consumer.package.name}\u0000${consumer.package.version}`
    if (identities.has(identity)) {
      throw new TypeError(`Duplicate consumer identity ${JSON.stringify(`${consumer.package.name}@${consumer.package.version}`)}.`)
    }
    identities.add(identity)
    for (const dependency of consumer.dependencies) {
      if (dependency.resolution !== "external" || dependency.to === undefined) continue
      const references = referencesByTarget.get(dependency.to) ?? []
      references.push(referenceFor(consumer.package, dependency))
      referencesByTarget.set(dependency.to, references)
    }
  }

  for (const [target, references] of referencesByTarget) {
    const byKey = new Map(references.map(reference => [referenceKey(reference), reference]))
    referencesByTarget.set(target, [...byKey.entries()]
      .sort(([left], [right]) => compareOrdinal(left, right))
      .map(([, reference]) => reference))
  }
  return { consumers, referencesByTarget }
}

function compareFindings(left: ManifestCompatibilityFinding, right: ManifestCompatibilityFinding): number {
  return compareOrdinal(left.code, right.code) || compareOrdinal(left.entityId, right.entityId) || compareOrdinal(left.fieldPath, right.fieldPath)
}

function analyzeManifestConsumers(input: {
  readonly current: unknown
  readonly consumers?: ReadonlyArray<unknown>
}): ManifestConsumerAnalysis {
  const current = decodeManifest(input.current)
  const { consumers, referencesByTarget } = buildConsumerReferences(current.package.name, input.consumers ?? [])
  const findings: ManifestCompatibilityFinding[] = []
  for (const token of current.tokens) {
    if (token.visibility !== "private") continue
    const affectedConsumers = referencesByTarget.get(token.id) ?? []
    if (affectedConsumers.length === 0) continue
    findings.push({
      code: "consumer.private-token-dependency",
      level: "error",
      entityId: token.id,
      fieldPath: "visibility",
      message: `Supplied consumer dependencies reference private token ${JSON.stringify(token.id)}.`,
      after: "private",
      affectedConsumers,
    })
  }
  findings.sort(compareFindings)
  const report = decodeManifestCompatibilityReport({
    format: MANIFEST_COMPATIBILITY_REPORT_FORMAT,
    schemaVersion: MANIFEST_COMPATIBILITY_REPORT_VERSION,
    mode: "check",
    provider: { name: current.package.name, currentVersion: current.package.version },
    suppliedConsumers: consumers.map(consumer => ({ name: consumer.package.name, version: consumer.package.version }))
      .sort((left, right) => compareOrdinal(left.name, right.name) || compareOrdinal(left.version, right.version)),
    findings,
    analysisLimits: buildAnalysisLimits(current, consumers),
  })
  return { report, referencesByTarget }
}

/**
 * Check explicitly supplied consumer manifests for stable external edges to
 * tokens that the current provider manifest marks private.
 */
export function checkManifestConsumers(input: {
  readonly current: unknown
  readonly consumers?: ReadonlyArray<unknown>
}): ManifestCompatibilityReport {
  return analyzeManifestConsumers(input).report
}

/** @internal Reuse the same validated consumer evidence for compare-mode attribution. */
export function analyzeManifestConsumerEvidence(input: {
  readonly current: unknown
  readonly consumers?: ReadonlyArray<unknown>
}): ManifestConsumerAnalysis {
  return analyzeManifestConsumers(input)
}
