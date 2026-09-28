import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"
import { generateDtcgQualification } from "../../../scripts/m9-6-dtcg-qualification"

const repositoryRoot = resolve(import.meta.dir, "../../..")
const evidencePath = "docs/evidence/2026-09-28-m9-6-dtcg/qualification.json"

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex")
}

function jsonPointerForPath(path: ReadonlyArray<string>): string {
  return `/${path.map(segment => segment.replace(/~/gu, "~0").replace(/\//gu, "~1")).join("/")}`
}

type DtcgQualification = ReturnType<typeof generateDtcgQualification>
type Receipt = {
  readonly format: string
  readonly schemaVersion: number
  readonly roadmapItem: string
  readonly status: string
  readonly profile: Readonly<{
    format: string
    formatVersion: string
    colorVersion: string
    resolverVersions: ReadonlyArray<string>
  }>
  readonly gates: ReadonlyArray<string>
  readonly fixtures: ReadonlyArray<Readonly<{ path: string; sha256: string; bytes: number }>>
  readonly coverage: Readonly<{
    acceptedConversions: ReadonlyArray<Readonly<{ id: string; path: ReadonlyArray<string>; source: string; jsonPointer: string; diagnosticCode?: string }>>
    rejectedConversions: ReadonlyArray<Readonly<{ id: string; source: string; diagnosticCode: string }>>
    provenance: Readonly<{
      id: string
      source: string
      jsonPointer: string
      metadata: Readonly<{
        description?: string
        deprecated?: boolean
        deprecationMessage?: string
        extensions?: Readonly<Record<string, unknown>>
      }>
      groupMetadata: ReadonlyArray<Readonly<{
        path: ReadonlyArray<string>
        metadata: Readonly<{ description?: string; extensions?: Readonly<Record<string, unknown>> }>
      }>>
    }>
  }>
  readonly boundaries: ReadonlyArray<string>
}

function receiptFor(evidence: DtcgQualification): Receipt {
  return JSON.parse(evidence.receiptJson) as Receipt
}

describe("M9.6 DTCG fixture qualification", () => {
  it("qualifies the pinned DTCG profile and complete conversion matrix through public APIs", () => {
    const evidence = generateDtcgQualification()
    const receipt = receiptFor(evidence)

    expect(receipt).toMatchObject({
      format: "crumbs.dtcg-import-qualification",
      schemaVersion: 1,
      roadmapItem: "M9.6",
      status: "qualified-source-tooling",
      profile: {
        format: "2025.10",
        formatVersion: "2025.10",
        colorVersion: "2025.10",
        resolverVersions: ["2025-10-01", "2025-11-01", "2025.10"],
      },
    })
    expect(receipt.gates).toEqual(expect.arrayContaining([
      "public-api-import",
      "accepted-conversions",
      "rejected-conversions",
      "source-provenance-and-metadata",
      "missing-rem-base",
      "repeatable-receipt",
      "fixture-digests",
    ]))
    expect(receipt.coverage.acceptedConversions.map(item => item.id)).toEqual(expect.arrayContaining([
      "official-color-srgb-alpha",
      "dimension-px",
      "dimension-rem",
      "duration-ms",
      "duration-s",
      "opacity-number",
      "enum-font-family",
      "enum-stroke-style",
    ]))
    expect(receipt.coverage.rejectedConversions.map(item => item.id)).toEqual(expect.arrayContaining([
      "color-display-p3",
      "color-alpha-out-of-range",
      "dimension-negative",
      "dimension-unsupported-unit",
      "duration-negative",
      "unsupported-font-weight",
      "unsupported-cubic-bezier",
      "unsupported-border",
      "unsupported-transition",
      "unsupported-shadow",
      "unsupported-gradient",
      "unsupported-typography-composite",
      "number-outside-opacity",
      "opacity-out-of-range",
      "font-family-array",
      "stroke-style-object",
      "rem-without-base",
    ]))
    expect(receipt.coverage.rejectedConversions.every(item => item.diagnosticCode.length > 0)).toBe(true)
    expect(receipt.coverage.acceptedConversions.every(item => item.source.endsWith(".tokens.json") && item.jsonPointer === jsonPointerForPath(item.path))).toBe(true)
    expect(receipt.coverage.rejectedConversions.every(item => item.source.endsWith(".tokens.json"))).toBe(true)
    expect(receipt.coverage.provenance).toMatchObject({
      id: "dimension-px",
      source: "conversions.tokens.json",
      jsonPointer: "/space/eight",
      metadata: {
        description: "Eight-pixel baseline spacing token.",
        deprecated: true,
        deprecationMessage: "Prefer the root-scaled token where appropriate.",
        extensions: { "com.example": { category: "spacing" } },
      },
      groupMetadata: [
        {
          path: [],
          metadata: {
            description: "Root-level inherited dimension type for the qualification fixture.",
            extensions: { "com.example": { layer: "foundation" } },
          },
        },
        {
          path: ["space"],
          metadata: {
            description: "Source-tooling spacing conversion cases.",
            extensions: { "com.example": { group: "spacing" } },
          },
        },
      ],
    })
  })

  it("records checked-in fixture digests, byte counts, and the checked-in canonical receipt", () => {
    const evidence = generateDtcgQualification()
    const receipt = receiptFor(evidence)

    expect(receipt.fixtures.length).toBeGreaterThanOrEqual(8)
    for (const fixture of receipt.fixtures) {
      expect(isAbsolute(fixture.path)).toBe(false)
      const bytes = readFileSync(resolve(repositoryRoot, fixture.path))
      expect(fixture.sha256).toBe(sha256(bytes))
      expect(fixture.bytes).toBe(bytes.byteLength)
    }
    expect(readFileSync(resolve(repositoryRoot, evidencePath), "utf8")).toBe(evidence.receiptJson)
  })

  it("emits deterministic canonical bytes without environment-specific data", () => {
    const first = generateDtcgQualification()
    const second = generateDtcgQualification()

    expect(second.receiptJson).toBe(first.receiptJson)
    expect(first.receiptJson).not.toContain(repositoryRoot)
    expect(first.receiptJson).not.toMatch(/"(?:generatedAt|timestamp|evaluatedOn|durationMs|elapsedMs)"/i)
    expect(first.receiptJson).not.toMatch(/\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}/)
    expect(first.receiptJson).not.toMatch(/\b(?:ENOENT|EACCES|EPERM)\b/)
    expect(first.receiptJson).toBe(`${JSON.stringify(JSON.parse(first.receiptJson), null, 2)}\n`)
    expect(receiptFor(first).boundaries).toEqual(expect.arrayContaining([
      "Source/tooling import only; runtime and device performance are unmeasured.",
      "Resolver expansion and materialized provenance are each bounded at 100,000 steps or origins.",
      "Android/device acceptance is not run and remains parked.",
      "Package publication and consumer release acceptance are not run.",
      "Visual design-system acceptance is not run.",
    ]))
  })
})
