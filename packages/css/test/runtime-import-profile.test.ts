import { describe, expect, it } from "bun:test"
import { SourceMap } from "node:module"

type ProfileCallFrame = {
  functionName: string
  url: string
  lineNumber: number
  columnNumber: number
}

type FrameAttribution =
  | { kind: "source"; source: string; line: number; column: number }
  | { kind: "node-loader"; url: string }
  | { kind: "unattributed"; reason: string; url: string }

type RuntimeProfileAnalyzer = {
  normalizeGeneratedJavaScript(source: string): string
  attributeProfileFrame(
    frame: ProfileCallFrame,
    sourceMap: Pick<SourceMap, "findEntry"> | undefined,
    generatedFilesMatch: boolean,
  ): FrameAttribution
  aggregateCpuProfile(
    profile: {
      nodes: ReadonlyArray<{ id: number; callFrame: ProfileCallFrame }>
      samples?: ReadonlyArray<number>
      timeDeltas?: ReadonlyArray<number>
    },
    attribute: (frame: ProfileCallFrame) => FrameAttribution,
  ): {
    totalSamples: number
    totalSampledMicros: number | null
    frames: ReadonlyArray<{
      attribution: FrameAttribution
      functionName: string
      url: string
      sampleCount: number
      sampledMicros: number | null
    }>
  }
  aggregateCpuProfiles(
    profiles: ReadonlyArray<{
      nodes: ReadonlyArray<{ id: number; callFrame: ProfileCallFrame }>
      samples?: ReadonlyArray<number>
      timeDeltas?: ReadonlyArray<number>
    }>,
    attribute: (frame: ProfileCallFrame) => FrameAttribution,
  ): {
    totalSamples: number
    totalSampledMicros: number | null
    frames: ReadonlyArray<{
      attribution: FrameAttribution
      functionName: string
      url: string
      sampleCount: number
      sampledMicros: number | null
    }>
  }
}

const analyzerSpecifier = "../bench/runtime-import-profile"

async function loadAnalyzer(): Promise<RuntimeProfileAnalyzer> {
  const analyzer = await import(analyzerSpecifier).catch(() => null) as RuntimeProfileAnalyzer | null
  expect(analyzer).not.toBeNull()
  if (analyzer === null) throw new Error("Runtime profile analyzer is not implemented")
  return analyzer
}

function frame(
  functionName: string,
  url: string,
  lineNumber = 0,
  columnNumber = 0,
): ProfileCallFrame {
  return { functionName, url, lineNumber, columnNumber }
}

function sourceMap(mappings: string) {
  return new SourceMap({
    version: 3,
    file: "theme-core.mjs",
    sources: ["../src/theme-core.ts"],
    sourcesContent: [],
    names: [],
    mappings,
    sourceRoot: "",
  })
}

describe("M10.5 runtime import profile analysis", () => {
  it("normalizes the source-map comment and its emitted separator without changing other output", async () => {
    const { normalizeGeneratedJavaScript } = await loadAnalyzer()
    const defaultOutput = "export const value = 1;\n"
    const mappedOutput = "export const value = 1;\n\n//# sourceMappingURL=entry.mjs.map\n"

    expect(normalizeGeneratedJavaScript(mappedOutput)).toBe(defaultOutput)
    expect(normalizeGeneratedJavaScript("export const value = 1;\n//# sourceURL=runtime.js\n"))
      .toBe("export const value = 1;\n//# sourceURL=runtime.js\n")
  })

  it("maps generated positions to one-based TypeScript locations", async () => {
    const { attributeProfileFrame } = await loadAnalyzer()
    const emittedFrame = frame("resolveThemeTokens", "file:///repo/dist/theme-core.mjs")

    expect(attributeProfileFrame(emittedFrame, sourceMap("AAAA"), true)).toEqual({
      kind: "source",
      source: "../src/theme-core.ts",
      line: 1,
      column: 1,
    })
  })

  it("leaves frames unattributed when source maps or generated-file parity are absent", async () => {
    const { attributeProfileFrame } = await loadAnalyzer()
    const emittedFrame = frame("resolveThemeTokens", "file:///repo/dist/theme-core.mjs")

    expect(attributeProfileFrame(emittedFrame, undefined, true)).toEqual({
      kind: "unattributed",
      reason: "source-map-missing",
      url: "file:///repo/dist/theme-core.mjs",
    })
    expect(attributeProfileFrame(emittedFrame, sourceMap("AAAA"), false)).toEqual({
      kind: "unattributed",
      reason: "generated-output-mismatch",
      url: "file:///repo/dist/theme-core.mjs",
    })
  })

  it("leaves source-map positions without an original segment unattributed", async () => {
    const { attributeProfileFrame } = await loadAnalyzer()

    expect(attributeProfileFrame(
      frame("unmapped", "file:///repo/dist/theme-core.mjs"),
      sourceMap(";"),
      true,
    )).toEqual({
      kind: "unattributed",
      reason: "source-map-unmapped",
      url: "file:///repo/dist/theme-core.mjs",
    })
  })

  it("recognizes module loader frames without labeling generic Node internals as loaders", async () => {
    const { attributeProfileFrame } = await loadAnalyzer()

    expect(attributeProfileFrame(
      frame("ModuleJob.run", "node:internal/modules/esm/loader"),
      undefined,
      false,
    )).toEqual({
      kind: "node-loader",
      url: "node:internal/modules/esm/loader",
    })
    expect(attributeProfileFrame(
      frame("runInContext", "node:internal/vm"),
      undefined,
      false,
    )).toEqual({
      kind: "unattributed",
      reason: "node-internal",
      url: "node:internal/vm",
    })
  })

  it("aggregates repeated leaf frames and their aligned sampled durations", async () => {
    const { aggregateCpuProfile } = await loadAnalyzer()
    const resolver = frame("resolveThemeTokens", "file:///repo/dist/theme-core.mjs")
    const loader = frame("ModuleJob.run", "node:internal/modules/esm/loader")
    const sourceAttribution: FrameAttribution = {
      kind: "source",
      source: "../src/theme-core.ts",
      line: 1,
      column: 1,
    }
    const loaderAttribution: FrameAttribution = {
      kind: "node-loader",
      url: "node:internal/modules/esm/loader",
    }

    expect(aggregateCpuProfile({
      nodes: [
        { id: 1, callFrame: resolver },
        { id: 2, callFrame: loader },
      ],
      samples: [1, 2, 1],
      timeDeltas: [1000, 500, 2500],
    }, current => current === resolver ? sourceAttribution : loaderAttribution)).toEqual({
      totalSamples: 3,
      totalSampledMicros: 4000,
      frames: [
        {
          attribution: sourceAttribution,
          functionName: "resolveThemeTokens",
          url: "file:///repo/dist/theme-core.mjs",
          sampleCount: 2,
          sampledMicros: 3500,
        },
        {
          attribution: loaderAttribution,
          functionName: "ModuleJob.run",
          url: "node:internal/modules/esm/loader",
          sampleCount: 1,
          sampledMicros: 500,
        },
      ],
    })
  })
})


describe("M10.5 repeated profile aggregation", () => {
  it("combines equal mapped leaf frames across independent child profiles", async () => {
    const { aggregateCpuProfiles } = await loadAnalyzer()
    expect(typeof aggregateCpuProfiles).toBe("function")
    const resolver = frame("resolveThemeTokens", "file:///repo/dist/theme-core.mjs")
    const attribution: FrameAttribution = {
      kind: "source",
      source: "../src/theme-core.ts",
      line: 1,
      column: 1,
    }

    expect(aggregateCpuProfiles([
      { nodes: [{ id: 1, callFrame: resolver }], samples: [1], timeDeltas: [1200] },
      { nodes: [{ id: 1, callFrame: resolver }], samples: [1], timeDeltas: [800] },
    ], () => attribution)).toEqual({
      totalSamples: 2,
      totalSampledMicros: 2000,
      frames: [{
        attribution,
        functionName: "resolveThemeTokens",
        url: "file:///repo/dist/theme-core.mjs",
        sampleCount: 2,
        sampledMicros: 2000,
      }],
    })
  })
})
