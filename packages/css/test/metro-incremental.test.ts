import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import {
  admitMetroIncrementalReport,
  createHistoricalMetroFixture,
  createHistoricalIncrementalStyleSource,
  createHistoricalWorkspaceTokenSource,
  createIncrementalStyleSource,
  createIncrementalTokenSource,
  createWorkspaceTokenSource,
  incrementalCompiledValue,
} from "../bench/metro-incremental"

function validReport() {
  return {
    formatVersion: 1,
    status: "complete",
    environment: { platform: "darwin", architecture: "arm64", osRelease: "test", cpu: "test", expo: "56.0.0", metro: "0.84.4", reactNative: "0.85.3" },
    protocol: { requestUrl: "/src/incremental-entry.bundle?platform=ios&dev=true", repetitions: 5, editKind: "direct-css-source", cacheState: "one warm graph; five sequential actual edits" },
    fixture: { entrySha256: "0".repeat(64), originalStyleSha256: "1".repeat(64), restoredStyleSha256: "1".repeat(64), originalTokenSha256: "2".repeat(64), restoredTokenSha256: "2".repeat(64),
      originalBaseStyleSha256: "3".repeat(64), restoredBaseStyleSha256: "3".repeat(64), originalWorkspaceTokenSha256: "4".repeat(64), restoredWorkspaceTokenSha256: "4".repeat(64) },
    initial: { compiledValue: 30001, bundleSha256: "bundle-0", bytes: 100 },
    warmup: { excluded: true, previousCompiledValue: 30001, compiledValue: 30100, editToReceiptMs: 15, attempts: 2, bundleSha256: "bundle-warmup", bytes: 100, receipt: { compiledValuePresent: true, previousCompiledValueAbsent: true } },
    runs: Array.from({ length: 5 }, (_, index) => ({
      repetition: index + 1,
      previousCompiledValue: 30100 + index,
      compiledValue: 30101 + index,
      editToReceiptMs: 10 + index,
      attempts: 1,
      bundleSha256: `bundle-${index + 1}`,
      bytes: 100 + index,
      receipt: { compiledValuePresent: true, previousCompiledValueAbsent: true },
    })),
  }
}

describe("Metro actual-edit evidence", () => {
  it("creates source without embedding the compiled value as one literal", () => {
    expect(incrementalCompiledValue(17)).toBe(30017)
    const source = createIncrementalTokenSource(17)
    expect(source).toContain("30000 + 17")
    expect(source).not.toContain("30017")
    const styleSource = createIncrementalStyleSource(117)
    expect(styleSource).toContain("incrementalPadding + 117 - 1")
    expect(styleSource).not.toContain("30117")
    for (const invalid of [0, -1, 1000, 1.5, Number.NaN]) expect(() => createIncrementalTokenSource(invalid)).toThrow()
  })

  it("reconstructs the byte-exact retained M4.6 Metro input while preserving current fixtures for restore", () => {
    const fixture = createHistoricalMetroFixture()
    const hash = (value: string) => createHash("sha256").update(value).digest("hex")
    expect({
      styleSha256: hash(fixture.style),
      tokenSha256: hash(fixture.token),
      baseStyleSha256: hash(fixture.baseStyle),
      workspaceTokenSha256: hash(fixture.workspaceToken),
    }).toEqual({
      styleSha256: "efab45c9923773d91d266b82f1bd7c2d10df0c9268a0ef166c8e90ff5045f13c",
      tokenSha256: "7fc7402174a685353ec647f0ca9179eca94ee60e132f0362955a8f4600f984e7",
      baseStyleSha256: "457e351c0623cb8618446ff0b22a1a254033c073afc80ecb44d4b5e6aedd0142",
      workspaceTokenSha256: "803e41dc2d70c3d82dd02aa7cef41182cf97d0c9935257d136bb85afb3a5bd52",
    })
    expect(createHistoricalWorkspaceTokenSource(4)).toContain("export const workspaceBorderWidth = 32000 + 4")
  })

  it("keeps current shared-token helpers separate from scalar retained-baseline helpers", () => {
    expect(createWorkspaceTokenSource(4)).toContain("export const sharedThemeTokens = { borderWidth: 32000 + 4 }")
    expect(createIncrementalStyleSource(5)).toContain("sharedThemeTokens.borderWidth")
    expect(createHistoricalWorkspaceTokenSource(4)).toContain("export const workspaceBorderWidth = 32000 + 4")
    expect(createHistoricalIncrementalStyleSource(5)).toContain("import { workspaceBorderWidth }")
  })

  it("admits five ordered actual edits with output and restoration receipts", () => {
    expect(admitMetroIncrementalReport(validReport())).toEqual([10, 11, 12, 13, 14])
  })

  it("admits a new report only when measurement and restored worktree fixture identities are complete", () => {
    const base = validReport()
    const report = {
      ...base,
      measurementFixture: {
        entrySha256: base.fixture.entrySha256,
        styleSha256: "5".repeat(64),
        tokenSha256: "6".repeat(64),
        baseStyleSha256: "7".repeat(64),
        workspaceTokenSha256: "8".repeat(64),
      },
    }
    expect(admitMetroIncrementalReport(report)).toEqual([10, 11, 12, 13, 14])
    expect(() => admitMetroIncrementalReport({
      ...report,
      fixture: { ...report.fixture, originalWorkspaceTokenSha256: undefined, restoredWorkspaceTokenSha256: undefined },
    })).toThrow(/workspace token/)
  })

  it("fails closed when evidence can be explained by stale output or an incomplete run", () => {
    const valid = validReport()
    const measurementFixture = {
      entrySha256: "a".repeat(64),
      styleSha256: "b".repeat(64),
      tokenSha256: "c".repeat(64),
      baseStyleSha256: "d".repeat(64),
      workspaceTokenSha256: "e".repeat(64),
    }
    const mutations = [
      { ...valid, status: "incomplete" },
      { ...valid, runs: valid.runs.slice(1) },
      { ...valid, fixture: { ...valid.fixture, restoredTokenSha256: "different" } },
      { ...valid, fixture: { ...valid.fixture, restoredStyleSha256: "different" } },
      { ...valid, fixture: { ...valid.fixture, restoredBaseStyleSha256: "different" } },
      { ...valid, fixture: { ...valid.fixture, restoredWorkspaceTokenSha256: "different" } },
      { ...valid, measurementFixture: { entrySha256: "bad", styleSha256: "bad", tokenSha256: "bad", baseStyleSha256: "bad", workspaceTokenSha256: "bad" } },
      { ...valid, measurementFixture },
      { ...valid, fixture: { ...valid.fixture, originalBaseStyleSha256: undefined, restoredBaseStyleSha256: undefined }, measurementFixture },
      { ...valid, fixture: { ...valid.fixture, entrySha256: "f".repeat(64) }, measurementFixture },
      { ...valid, protocol: { ...valid.protocol, editKind: "dependency-source" } },
      { ...valid, warmup: { ...valid.warmup, excluded: false } },
      { ...valid, warmup: { ...valid.warmup, editToReceiptMs: Number.NaN } },
      { ...valid, runs: valid.runs.map((run, index) => index === 2 ? { ...run, receipt: { ...run.receipt, compiledValuePresent: false } } : run) },
      { ...valid, runs: valid.runs.map((run, index) => index === 2 ? { ...run, bundleSha256: "bundle-2" } : run) },
      { ...valid, runs: valid.runs.map((run, index) => index === 2 ? { ...run, editToReceiptMs: Number.NaN } : run) },
    ]
    for (const mutation of mutations) expect(() => admitMetroIncrementalReport(mutation)).toThrow()
  })
})
