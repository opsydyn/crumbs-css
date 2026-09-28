import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { generatePolicyQualification } from "../../../scripts/m9-4-policy-qualification"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const evidenceRoot = resolve(repositoryRoot, "docs/evidence/2026-09-28-m9-4-design-system-policies")

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

describe("M9.4 policy fixture qualification", () => {
  it("qualifies checked-in policy fixtures deterministically", () => {
    const first = generatePolicyQualification()
    const second = generatePolicyQualification()
    expect(first.reportJson).toBe(second.reportJson)
    expect(first.receiptJson).toBe(second.receiptJson)
    expect(first.reportJson).toBe(readFileSync(resolve(evidenceRoot, "policy-report-v1.json"), "utf8"))
    expect(first.receiptJson).toBe(readFileSync(resolve(evidenceRoot, "qualification.json"), "utf8"))
  })

  it("records fixture and report digests, schema identities, findings, and coverage counts", () => {
    const { reportJson, receiptJson } = generatePolicyQualification()
    const report = JSON.parse(reportJson)
    const receipt = JSON.parse(receiptJson)
    expect(receipt).toMatchObject({
      format: "crumbs.css.design-system-policy-qualification",
      schemaVersion: 1,
      roadmapItem: "M9.4",
      status: "qualified",
      policy: { policyId: "acme.native-policy-fixture", version: 1, preset: { name: "migration", version: 1 } },
      report: {
        path: "docs/evidence/2026-09-28-m9-4-design-system-policies/policy-report-v1.json",
        format: "crumbs.css.design-system-policy-report",
        schemaVersion: 1,
        sha256: sha256(reportJson),
      },
    })
    expect(receipt.fixtures.map((fixture: { path: string }) => fixture.path)).toEqual([
      "packages/css/fixtures/m9-4-policy/current-manifest.json",
      "packages/css/fixtures/m9-4-policy/consumer-manifest.json",
      "packages/css/fixtures/m9-4-policy/style-metadata.json",
      "packages/css/fixtures/m9-4-policy/measurements.json",
      "packages/css/fixtures/m9-4-policy/policy.json",
    ])
    expect(receipt.counts.findings).toMatchObject({ total: report.findings.length })
    expect(receipt.counts.coverage).toMatchObject({ total: report.analysisLimits.length })
    expect(receipt.passedGates).toContain("canonical-report-v1")
    expect(receipt.passedGates).toContain("repeat-run-byte-identical")
  })

  it("omits machine paths and implicit timestamps", () => {
    const output = generatePolicyQualification()
    const receipt = JSON.parse(output.receiptJson)
    const serialized = output.reportJson + output.receiptJson
    expect(serialized).not.toMatch(/(?:\/Users\/|\/private\/|[A-Za-z]:\\\\)/u)
    expect(receipt.evaluatedOn).toBe("2026-09-28")
    expect(receipt.generatedAt).toBeUndefined()
    expect(receipt.timestamp).toBeUndefined()
    expect(receipt.passedGates).not.toContain("device-acceptance")
  })
})
