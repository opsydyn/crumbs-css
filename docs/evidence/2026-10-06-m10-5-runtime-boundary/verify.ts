import {createHash} from "node:crypto"
import {readFileSync, readdirSync, statSync, writeFileSync} from "node:fs"
import {join, relative, resolve} from "node:path"

const root = import.meta.dir
const manifestPath = join(root, "archive-manifest.json")
const action = process.argv[2]

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name)
    if (path === manifestPath) return []
    return statSync(path).isDirectory() ? walk(path) : [relative(root, path)]
  }).sort()
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as T
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

if (action === "freeze") {
  const files = walk(root).map(path => ({path, sha256: sha256(resolve(root, path))}))
  writeFileSync(manifestPath, JSON.stringify({formatVersion: 1, files}, null, 2) + "\n")
  console.log(`FROZEN ${files.length} M10.5 evidence files`)
} else {
  const manifest = readJson<{formatVersion: number; files: Array<{path: string; sha256: string}>}>("archive-manifest.json")
  assert(manifest.formatVersion === 1, "unsupported archive manifest version")
  const actualFiles = walk(root)
  const expectedFiles = manifest.files.map(file => file.path).sort()
  assert(JSON.stringify(actualFiles) === JSON.stringify(expectedFiles), "archive file inventory differs from frozen manifest")
  for (const file of manifest.files) {
    assert(sha256(resolve(root, file.path)) === file.sha256, `archive hash mismatch: ${file.path}`)
  }

  const control = readJson<{packageArchive: {path: string; sha256: string}}> ("control-manifest.json")
  assert(sha256(join(root, control.packageArchive.path)) === control.packageArchive.sha256, "control package archive hash mismatch")

  const qualification = readJson<any>("qualification.json")
  assert(sha256(join(root, qualification.source.candidateSourceArchive)) === qualification.source.candidateSourceArchiveSha256, "candidate source archive hash mismatch")
  const inputIdentity = readJson<any>(qualification.officialHostBudget.inputIdentity)
  assert(inputIdentity.sourceBefore.sha256 === qualification.source.candidateMeasuredSourceDigest, "candidate host input digest mismatch")
  const comparison = readJson<any>(qualification.officialHostBudget.evidence)
  const counts = comparison.metrics.reduce((result: Record<string, number>, metric: {result: string}) => {
    result[metric.result] = (result[metric.result] ?? 0) + 1
    return result
  }, {})
  assert(comparison.metrics.length === qualification.officialHostBudget.registryMetrics, "official metric count changed")
  assert(counts.pass === 11 && counts.fail === 9 && counts["incomplete-environment-mismatch"] === 1, "official metric disposition differs from the recorded 11/9/1 result")
  assert(comparison.performanceQualified === false, "candidate must remain unqualified")
  assert(comparison.diagnostic.metrics.some((metric: {id: string; result: string}) => metric.id === "runtime-emitted-bytes" && metric.result === "fail"), "diagnostic emitted-byte failure is missing")

  const paired = readJson<any>("paired-first-use/candidate-control.json")
  assert(paired.results.length === 16, "paired first-use cohort count changed")
  assert(paired.results.every((result: {sampleCount: number; diagnosticScreen: string}) => result.sampleCount === 15 && result.diagnosticScreen === "within-control-range"), "paired first-use result escaped the recorded control range")
  assert(paired.results.reduce((sum: number, result: {sampleCount: number}) => sum + result.sampleCount, 0) === 240, "paired first-use sample-pair count changed")

  const packed = readJson<any>("packed-consumer/final-control.json")
  assert(packed.status === "passed" && packed.sourceMapsPassed === 3, "restored-control packed/source-map check is incomplete")
  assert(Object.keys(packed.platforms).sort().join(",") === "android,ios,web", "restored-control packed platform set changed")
  assert(qualification.disposition.productionExtractionRetained === false && qualification.disposition.m10_5Closed === false, "rejection disposition changed")
  assert(qualification.historicalMatrixReconciliation.rowsMarkedStale === 15, "historical matrix reconciliation count changed")

  console.log(`PASS ${manifest.files.length} frozen evidence files; host 11/9/1; paired 240/240 within control range; restored-control packed source maps 3/3`)
}
