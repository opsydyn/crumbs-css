import { describe, expect, it } from "bun:test"
import {
  admitMetroIncrementalReport,
  createIncrementalStyleSource,
  createIncrementalTokenSource,
  incrementalCompiledValue,
} from "../bench/metro-incremental"

function validReport() {
  return {
    formatVersion: 1,
    status: "complete",
    environment: { platform: "darwin", architecture: "arm64", osRelease: "test", cpu: "test", expo: "56.0.0", metro: "0.84.4", reactNative: "0.85.3" },
    protocol: { requestUrl: "/src/incremental-entry.bundle?platform=ios&dev=true", repetitions: 5, editKind: "direct-css-source", cacheState: "one warm graph; five sequential actual edits" },
    fixture: { entrySha256: "entry", originalStyleSha256: "style", restoredStyleSha256: "style", originalTokenSha256: "token", restoredTokenSha256: "token" },
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
    expect(styleSource).toContain("30000 + 117")
    expect(styleSource).not.toContain("30117")
    for (const invalid of [0, -1, 1000, 1.5, Number.NaN]) expect(() => createIncrementalTokenSource(invalid)).toThrow()
  })

  it("admits five ordered actual edits with output and restoration receipts", () => {
    expect(admitMetroIncrementalReport(validReport())).toEqual([10, 11, 12, 13, 14])
  })

  it("fails closed when evidence can be explained by stale output or an incomplete run", () => {
    const valid = validReport()
    const mutations = [
      { ...valid, status: "incomplete" },
      { ...valid, runs: valid.runs.slice(1) },
      { ...valid, fixture: { ...valid.fixture, restoredTokenSha256: "different" } },
      { ...valid, fixture: { ...valid.fixture, restoredStyleSha256: "different" } },
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
