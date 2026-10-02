import {readFileSync} from "node:fs"
import {resolve} from "node:path"
import {describe, expect, it} from "bun:test"

type ProfileSummaryEvidence = Readonly<{
  profileRun: Readonly<{
    matrix: Readonly<{
      expectedCells: number
      completedCells: number
      expectedProfiles: number
      completedProfiles: number
      behaviorReceiptsPassed: number
      normalizedParityFiles: number
      normalizedParityMatches: number
    }>
    scenarios: ReadonlyArray<Readonly<{
      runtime: string
      format: string
      entry: string
      sampleProtocol: Readonly<{
        excludedWarmupCount: number
        retainedSampleCount: number
      }>
      samples: ReadonlyArray<Readonly<{
        role: string
        behaviorReceipt: string
      }>>
      normalizedGeneratedFileParity: ReadonlyArray<Readonly<{
        generatedFilesMatch: boolean
      }>>
    }>>
  }>
}>

const evidenceFile = resolve(
  import.meta.dir,
  "../../../docs/evidence/2026-10-02-m10-5-source-profile/profile-summary.json",
)
const evidence = JSON.parse(readFileSync(evidenceFile, "utf8")) as ProfileSummaryEvidence

describe("M10.5 retained profile summary", () => {
  it("retains every declared matrix cell, profile record, receipt, and parity result", () => {
    const {matrix, scenarios} = evidence.profileRun
    const cellKey = (scenario: typeof scenarios[number]) =>
      `${scenario.runtime}:${scenario.format}:${scenario.entry}`

    expect(scenarios).toHaveLength(matrix.expectedCells)
    expect(scenarios).toHaveLength(matrix.completedCells)
    expect(new Set(scenarios.map(cellKey)).size).toBe(scenarios.length)
    expect([...new Set(scenarios.map(scenario => scenario.runtime))].sort())
      .toEqual(["current", "floor"])
    expect([...new Set(scenarios.map(scenario => scenario.format))].sort())
      .toEqual(["cjs", "esm"])
    expect([...new Set(scenarios.map(scenario => scenario.entry))].sort())
      .toEqual(["theme", "theme-core"])

    const profileCount = scenarios.reduce((total, scenario) => {
      expect(scenario.samples).toHaveLength(
        scenario.sampleProtocol.excludedWarmupCount + scenario.sampleProtocol.retainedSampleCount,
      )
      expect(scenario.samples.filter(sample => sample.role === "warmup"))
        .toHaveLength(scenario.sampleProtocol.excludedWarmupCount)
      expect(scenario.samples.filter(sample => sample.role === "sample"))
        .toHaveLength(scenario.sampleProtocol.retainedSampleCount)
      return total + scenario.samples.length
    }, 0)
    const passedReceipts = scenarios.reduce((total, scenario) =>
      total + scenario.samples.filter(sample => sample.behaviorReceipt === "passed").length, 0)
    const parityFiles = scenarios.reduce(
      (total, scenario) => total + scenario.normalizedGeneratedFileParity.length,
      0,
    )
    const parityMatches = scenarios.reduce(
      (total, scenario) => total + scenario.normalizedGeneratedFileParity
        .filter(file => file.generatedFilesMatch).length,
      0,
    )

    expect(profileCount).toBe(matrix.expectedProfiles)
    expect(profileCount).toBe(matrix.completedProfiles)
    expect(passedReceipts).toBe(matrix.behaviorReceiptsPassed)
    expect(parityFiles).toBe(matrix.normalizedParityFiles)
    expect(parityMatches).toBe(matrix.normalizedParityMatches)
  })
})
