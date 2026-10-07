import { describe, expect, it } from "bun:test"
import type { ReleaseHostEnvironment } from "../../../scripts/release-host-environment"
import { verifyReleaseHostEnvironment } from "../../../scripts/release-host-environment"

const matchingEnvironment: ReleaseHostEnvironment = {
  macOSProductVersion: "26.6.2",
  darwinRelease: "25.6.0",
  chip: "Apple M4 Pro",
  architecture: "arm64",
  bunVersion: "1.4.2",
  npmVersion: "11.12.1",
  nodeFloorVersion: "22.0.0",
  nodeCurrentVersion: "24.15.0",
  bunNodeCompatibilityVersion: "v26.3.0",
  tsdownVersion: "0.21.10",
  typescriptVersion: "6.0.3",
  tsgoVersion: "7.0.0-dev.20260519.1",
}

describe("M10.5 release host environment", () => {
  it("accepts the approved M4 Pro host and locked toolchain", () => {
    expect(verifyReleaseHostEnvironment(matchingEnvironment)).toEqual([])
  })

  it("names every host or toolchain mismatch", () => {
    const cases: Array<[keyof ReleaseHostEnvironment, string, string]> = [
      ["macOSProductVersion", "26.6.1", "macOS product version"],
      ["darwinRelease", "25.5.0", "Darwin release"],
      ["chip", "Apple M4 Max", "chip"],
      ["architecture", "x64", "architecture"],
      ["bunVersion", "1.4.1", "Bun version"],
      ["npmVersion", "11.12.0", "npm version"],
      ["nodeFloorVersion", "22.1.0", "Node floor version"],
      ["nodeCurrentVersion", "24.14.0", "current Node version"],
      ["bunNodeCompatibilityVersion", "v26.2.0", "Bun Node compatibility version"],
      ["tsdownVersion", "0.21.9", "tsdown version"],
      ["typescriptVersion", "6.0.2", "TypeScript version"],
      ["tsgoVersion", "7.0.0-dev.20260519.0", "tsgo version"],
    ]

    for (const [field, value, label] of cases) {
      const blockers = verifyReleaseHostEnvironment({ ...matchingEnvironment, [field]: value })
      expect(blockers.join("\n")).toContain(label)
    }
  })

  it("records Bun's Node compatibility identity without requiring a Node 26 executable", () => {
    expect(matchingEnvironment.nodeCurrentVersion).toBe("24.15.0")
    expect(matchingEnvironment.bunNodeCompatibilityVersion).toBe("v26.3.0")
    expect(verifyReleaseHostEnvironment(matchingEnvironment)).toEqual([])
  })
})
