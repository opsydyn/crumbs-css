import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const EXPECTED_REPORTS = [
  "compatibility",
  "policy",
  "migration",
  "style-explanation",
  "dtcg-success",
  "dtcg-failure",
] as const

async function getQualification() {
  let qualification: typeof import("../../../scripts/m9-7-ownership-qualification") | undefined
  try {
    qualification = await import("../../../scripts/m9-7-ownership-qualification")
  } catch {
    qualification = undefined
  }
  expect(qualification?.generateOwnershipQualification).toBeDefined()
  return qualification!
}

describe("M9.7 ownership fixture qualification", () => {
  it("covers each supported report family and both DTCG result branches", async () => {
    const qualification = await getQualification()
    const result = qualification.generateOwnershipQualification()
    const receipt = JSON.parse(result.receiptJson) as {
      readonly coverage: { readonly reports: ReadonlyArray<{ readonly id: string }> }
    }

    expect(receipt.coverage.reports.map(report => report.id)).toEqual([...EXPECTED_REPORTS])
  })

  it("produces byte-identical canonical receipts on repeated runs", async () => {
    const qualification = await getQualification()
    const first = qualification.generateOwnershipQualification()
    const second = qualification.generateOwnershipQualification()

    expect(first.receiptJson.endsWith("\n")).toBe(true)
    expect(second.receiptJson).toBe(first.receiptJson)
  })

  it("records stable SHA-256 digests for every relative fixture path", async () => {
    const qualification = await getQualification()
    const result = qualification.generateOwnershipQualification()
    const receipt = JSON.parse(result.receiptJson) as {
      readonly fixtures: ReadonlyArray<{ readonly path: string; readonly bytes: number; readonly sha256: string }>
    }

    expect(receipt.fixtures.length).toBeGreaterThanOrEqual(EXPECTED_REPORTS.length + 3)
    for (const fixture of receipt.fixtures) {
      const bytes = readFileSync(resolve(repositoryRoot, fixture.path))
      expect(fixture.bytes).toBe(bytes.byteLength)
      expect(fixture.sha256).toBe(createHash("sha256").update(bytes).digest("hex"))
      expect(fixture.path.startsWith("/")).toBe(false)
    }
  })

  it("contains no machine-local paths or wall-clock timestamps", async () => {
    const qualification = await getQualification()
    const serialized = qualification.generateOwnershipQualification().receiptJson

    expect(serialized).not.toContain(repositoryRoot)
    expect(serialized).not.toMatch(/(?:\/Users\/|\/private\/tmp\/|\/var\/folders\/)/u)
    expect(serialized).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u)
  })

  it("keeps assigned, unassigned, and unresolved attribution counts visible", async () => {
    const qualification = await getQualification()
    const receipt = JSON.parse(qualification.generateOwnershipQualification().receiptJson) as {
      readonly coverage: {
        readonly totals: { readonly assigned: number; readonly unassigned: number; readonly unresolved: number }
        readonly reports: ReadonlyArray<{
          readonly id: string
          readonly attributions: { readonly assigned: number; readonly unassigned: number; readonly unresolved: number }
        }>
      }
    }

    expect(receipt.coverage.totals.assigned).toBeGreaterThan(0)
    expect(receipt.coverage.totals.unassigned).toBeGreaterThan(0)
    expect(receipt.coverage.totals.unresolved).toBeGreaterThan(0)
    expect(receipt.coverage.reports.every(report =>
      Number.isSafeInteger(report.attributions.assigned) &&
      Number.isSafeInteger(report.attributions.unassigned) &&
      Number.isSafeInteger(report.attributions.unresolved))).toBe(true)
  })
})
