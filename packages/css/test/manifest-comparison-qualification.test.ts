import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { buildManifestQualificationEvidence } from "../../../scripts/m9-2-manifest-qualification"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const fixturePaths = [
  "packages/css/fixtures/m9-2-manifest/baseline.json",
  "packages/css/fixtures/m9-2-manifest/current.json",
  "packages/css/fixtures/m9-2-manifest/consumer.json",
  "packages/css/fixtures/m9-2-manifest/consumer-mobile.json",
]

function readInputs() {
  const [baselinePath, currentPath, ...consumerPaths] = fixturePaths
  return {
    baseline: JSON.parse(readFileSync(resolve(repositoryRoot, baselinePath!), "utf8")),
    current: JSON.parse(readFileSync(resolve(repositoryRoot, currentPath!), "utf8")),
    consumers: consumerPaths.map(path => JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8"))),
  }
}

describe("M9.2 manifest compatibility qualification evidence", () => {
  it("pins fixture and report digests, findings, limits, and consumer-order determinism", () => {
    const inputs = readInputs()
    const evidence = buildManifestQualificationEvidence(inputs)

    expect(evidence.commandModes).toEqual(["check", "compare"])
    expect(evidence.findingCounts).toEqual({
      check: { error: 1, warning: 0, info: 0 },
      compare: { error: 3, warning: 1, info: 0 },
    })
    expect(evidence.suppliedConsumerIdentities).toEqual([
      { name: "@acme/mobile-app", version: "2.1.0" },
      { name: "@acme/web-app", version: "2.0.0" },
    ])
    expect(evidence.analysisLimitCodes).toEqual({
      check: ["component-use-unavailable", "explicit-coverage"],
      compare: ["component-use-unavailable", "explicit-coverage"],
    })
    expect(evidence.canonicalReportJson).toContain("token.removed")
    expect(evidence.canonicalReportJson).toContain("token.domain-changed")
    expect(evidence.canonicalReportJson).toContain("component.default-changed")
    expect(evidence.canonicalReportJson).toContain("consumer.private-token-dependency")
    expect(evidence.reportSha256).toBe(createHash("sha256").update(evidence.canonicalReportJson, "utf8").digest("hex"))
    expect(evidence.checkReportSha256).toMatch(/^[0-9a-f]{64}$/u)
    expect(evidence.fixtureSha256).toEqual(fixturePaths.map(path => ({
      path,
      sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex"),
    })))

    const reordered = buildManifestQualificationEvidence({ ...inputs, consumers: [...inputs.consumers].reverse() })
    expect(reordered.canonicalReportJson).toBe(evidence.canonicalReportJson)
    expect(reordered.reportSha256).toBe(evidence.reportSha256)
    expect(reordered.checkReportSha256).toBe(evidence.checkReportSha256)
    expect(reordered.fixtureSha256).toEqual(evidence.fixtureSha256)

    const serialized = JSON.stringify(evidence)
    expect(serialized).not.toContain(repositoryRoot)
    expect(serialized).not.toMatch(/(?:\/Users\/|\/private\/tmp\/|\/var\/folders\/)/u)
    expect(serialized).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u)
    expect(serialized).not.toContain("#336699")
    expect(evidence.canonicalReportJson.endsWith("\n")).toBe(true)
  })
})
