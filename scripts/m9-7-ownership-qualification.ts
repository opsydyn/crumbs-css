import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import {
  annotateDesignSystemReport,
  decodeDesignSystemOwnership,
  encodeCanonicalOwnedReport,
  type SupportedSourceReport,
} from "../packages/css/dist/tooling-ownership.mjs"
import { decodeManifest } from "../packages/css/dist/tooling-manifest.mjs"

const ROADMAP_ITEM = "M9.7"
const FIXTURE_DIRECTORY = "packages/css/fixtures/m9-7-ownership"
const FIXTURE_PATHS = [
  `${FIXTURE_DIRECTORY}/ownership.json`,
  `${FIXTURE_DIRECTORY}/manifest-v1.json`,
  `${FIXTURE_DIRECTORY}/manifest-v2.json`,
  `${FIXTURE_DIRECTORY}/compatibility.json`,
  `${FIXTURE_DIRECTORY}/policy.json`,
  `${FIXTURE_DIRECTORY}/migration.json`,
  `${FIXTURE_DIRECTORY}/style-explanation.json`,
  `${FIXTURE_DIRECTORY}/dtcg-success.json`,
  `${FIXTURE_DIRECTORY}/dtcg-failure.json`,
] as const
const REPORT_FIXTURES = [
  { id: "compatibility", path: `${FIXTURE_DIRECTORY}/compatibility.json`, sourceFormat: "crumbs.design-system-compatibility-report", sourceSchemaVersion: 2 },
  { id: "policy", path: `${FIXTURE_DIRECTORY}/policy.json`, sourceFormat: "crumbs.css.design-system-policy-report" },
  { id: "migration", path: `${FIXTURE_DIRECTORY}/migration.json`, sourceFormat: "crumbs.source-migration-report" },
  { id: "style-explanation", path: `${FIXTURE_DIRECTORY}/style-explanation.json`, sourceFormat: "crumbs.css.style-explanation" },
  { id: "dtcg-success", path: `${FIXTURE_DIRECTORY}/dtcg-success.json`, sourceFormat: "crumbs.dtcg-import-result" },
  { id: "dtcg-failure", path: `${FIXTURE_DIRECTORY}/dtcg-failure.json`, sourceFormat: "crumbs.dtcg-import-result" },
] as const
const EVIDENCE_PATH = resolve(import.meta.dir, "../docs/evidence/2026-09-29-m9-7-ownership/qualification.json")

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys)
  if (value === null || typeof value !== "object") return value
  const record = value as Record<string, unknown>
  return Object.fromEntries(Object.keys(record).sort(compareText).map(key => [key, sortJsonKeys(record[key])]))
}

function encodeCanonicalJson(value: unknown): string {
  return `${JSON.stringify(sortJsonKeys(value), null, 2)}\n`
}

function readFixture(path: string): unknown {
  return JSON.parse(readFileSync(resolve(import.meta.dir, "..", path), "utf8")) as unknown
}

function fixtureDigests() {
  return FIXTURE_PATHS.map(path => {
    const bytes = readFileSync(resolve(import.meta.dir, "..", path))
    return { path, bytes: bytes.byteLength, sha256: sha256(bytes) }
  })
}

function countAttributions(ownedReport: ReturnType<typeof annotateDesignSystemReport>) {
  let assigned = 0
  let unassigned = 0
  let unresolved = 0
  for (const attribution of ownedReport.attributions) {
    if (attribution.status === "assigned") assigned += 1
    else if (attribution.status === "unassigned") unassigned += 1
    else unresolved += 1
  }
  return { assigned, unassigned, unresolved }
}

function evaluateFixtureSet() {
  const ownership = decodeDesignSystemOwnership(readFixture(`${FIXTURE_DIRECTORY}/ownership.json`))
  const manifests = [
    decodeManifest(readFixture(`${FIXTURE_DIRECTORY}/manifest-v1.json`)),
    decodeManifest(readFixture(`${FIXTURE_DIRECTORY}/manifest-v2.json`)),
  ]
  const reports = REPORT_FIXTURES.map(fixture => {
    const report = readFixture(fixture.path)
    const owned = annotateDesignSystemReport({ ownership, manifests, report: report as SupportedSourceReport })
    const expectedSourceVersion = "sourceSchemaVersion" in fixture ? fixture.sourceSchemaVersion : 1
    if (owned.source.format !== fixture.sourceFormat || owned.source.schemaVersion !== expectedSourceVersion) {
      throw new Error(`M9.7 ${fixture.id} fixture produced an unexpected owned-report source family.`)
    }
    const canonicalOwnedReport = encodeCanonicalOwnedReport(owned)
    return {
      id: fixture.id,
      sourceFormat: owned.source.format,
      schemaVersion: owned.source.schemaVersion,
      outputSha256: sha256(canonicalOwnedReport),
      attributions: countAttributions(owned),
    }
  })
  const totals = reports.reduce((total, report) => ({
    assigned: total.assigned + report.attributions.assigned,
    unassigned: total.unassigned + report.attributions.unassigned,
    unresolved: total.unresolved + report.attributions.unresolved,
  }), { assigned: 0, unassigned: 0, unresolved: 0 })

  if (totals.assigned === 0 || totals.unassigned === 0 || totals.unresolved === 0) {
    throw new Error("M9.7 fixture qualification requires visible assigned, unassigned, and unresolved attributions.")
  }

  return {
    format: "crumbs.design-system-ownership-qualification",
    schemaVersion: 1,
    roadmapItem: ROADMAP_ITEM,
    status: "qualified-source-tooling",
    gates: [
      "versioned-local-ownership-map",
      "compatibility-policy-and-migration-reports",
      "style-explanation-exact-variable-lookup",
      "dtcg-success-and-failure-adapters",
      "assigned-unassigned-and-unresolved-attributions",
      "canonical-output-digests",
      "repeatable-receipt",
      "fixture-digests",
    ],
    fixtures: fixtureDigests(),
    coverage: { reports, totals },
    boundaries: [
      "Ownership metadata and reports are local tooling inputs; no hosted account or telemetry service is required.",
      "Attribution covers only the explicitly supplied manifests and the source references in each report.",
      "Android/device acceptance is not run and remains parked.",
      "Package publication, visual acceptance, and release acceptance are not run.",
    ],
  }
}

/** Run the checked-in report matrix twice and return canonical, environment-free evidence. */
export function generateOwnershipQualification(): Readonly<{ receiptJson: string }> {
  const first = encodeCanonicalJson(evaluateFixtureSet())
  const second = encodeCanonicalJson(evaluateFixtureSet())
  if (first !== second) throw new Error("M9.7 ownership fixture qualification was not repeatable.")
  return { receiptJson: second }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const result = generateOwnershipQualification()
  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true })
  writeFileSync(EVIDENCE_PATH, result.receiptJson)
  process.stdout.write(result.receiptJson)
}
