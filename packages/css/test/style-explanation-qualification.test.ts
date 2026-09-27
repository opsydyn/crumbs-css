import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { buildStyleExplanationQualificationEvidence } from "../../../scripts/m9-3-style-explanations-qualification"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const fixturePath = "packages/css/fixtures/m9-3-style-explanations.css.ts"

describe("M9.3 style explanation qualification evidence", () => {
  it("pins deterministic report and fixture digests without machine-local or device claims", async () => {
    const evidence = await buildStyleExplanationQualificationEvidence()
    const repeated = await buildStyleExplanationQualificationEvidence()
    const report = JSON.parse(evidence.canonicalReportJson) as {
      readonly $$type: string
      readonly version: number
      readonly target: { readonly moduleId: string; readonly exportPath: ReadonlyArray<string> }
      readonly resolution: { readonly value: Readonly<Record<string, unknown>> }
      readonly composition: { readonly properties: ReadonlyArray<{
        readonly property: string
        readonly winner?: { readonly sourceId: string; readonly value: unknown }
        readonly overridden: ReadonlyArray<{ readonly sourceId: string; readonly value: unknown }>
      }> }
      readonly dependencies: {
        readonly declaredTokens: ReadonlyArray<string>
        readonly activeTokens: ReadonlyArray<string>
        readonly changedTokens: ReadonlyArray<string>
      }
      readonly transition: {
        readonly status: string
        readonly changedInputs: ReadonlyArray<{
          readonly kind: string
          readonly path: ReadonlyArray<string>
          readonly previous?: unknown
          readonly current?: unknown
        }>
        readonly affectedPaths: ReadonlyArray<ReadonlyArray<string>>
      }
      readonly coverage: { readonly status: string; readonly reasons: ReadonlyArray<string> }
    }
    const opacity = report.composition.properties.find(property => property.property === "opacity")

    expect(report.$$type).toBe("crumbs.css.style-explanation")
    expect(report.version).toBe(1)
    expect(report.target).toEqual({
      moduleId: "@opsydyn/crumbs-css#fixtures/m9-3-style-explanations.css.ts",
      exportPath: ["card"],
    })
    expect(report.resolution.value.opacity).toBe(0.8)
    expect(opacity?.winner?.value).toBe(0.8)
    expect(opacity?.overridden.map(candidate => candidate.value)).toEqual([0.25])
    expect(opacity?.winner?.sourceId).toBe("fixtures/m9-3-style-explanations.css.ts")
    expect(opacity?.overridden.every(candidate => candidate.sourceId === "fixtures/m9-3-style-explanations.css.ts")).toBe(true)
    expect(report.dependencies).toEqual({
      declaredTokens: ["--crumbs-space-small"],
      activeTokens: ["--crumbs-space-small"],
      changedTokens: ["--crumbs-space-small"],
    })
    expect(report.transition).toEqual({
      status: "relevant-input-change",
      changedInputs: [{ kind: "theme-token", path: ["--crumbs-space-small"], previous: 8, current: 16 }],
      affectedPaths: [["card"]],
    })
    expect(report.coverage).toEqual({ status: "complete", reasons: [] })
    expect(evidence.coverage.reasons).toEqual([])
    expect(evidence.fixtureSha256).toBe(createHash("sha256").update(readFileSync(resolve(repositoryRoot, fixturePath))).digest("hex"))
    expect(evidence.reportSha256).toBe(createHash("sha256").update(evidence.canonicalReportJson, "utf8").digest("hex"))
    expect(evidence.canonicalReportJson.endsWith("\n")).toBe(true)
    expect(repeated.canonicalReportJson).toBe(evidence.canonicalReportJson)
    expect(repeated.reportSha256).toBe(evidence.reportSha256)
    expect(repeated.fixtureSha256).toBe(evidence.fixtureSha256)

    const serialized = JSON.stringify(evidence)
    expect(serialized).not.toContain(repositoryRoot)
    expect(serialized).not.toMatch(/(?:\/Users\/|\/private\/tmp\/|\/var\/folders\/)/u)
    expect(serialized).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u)
    expect(serialized).not.toMatch(/android|ios|device|frame.?time/iu)
  })
})
