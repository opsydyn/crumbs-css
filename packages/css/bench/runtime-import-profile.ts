import type { SourceMap } from "node:module"

export type RuntimeProfileCallFrame = Readonly<{
  functionName: string
  url: string
  lineNumber: number
  columnNumber: number
}>

export type RuntimeProfileAttribution =
  | Readonly<{ kind: "source"; source: string; line: number; column: number }>
  | Readonly<{ kind: "node-loader"; url: string }>
  | Readonly<{ kind: "unattributed"; reason: string; url: string }>

export type RuntimeCpuProfile = Readonly<{
  nodes: ReadonlyArray<Readonly<{ id: number; callFrame: RuntimeProfileCallFrame }>>
  samples?: ReadonlyArray<number>
  timeDeltas?: ReadonlyArray<number>
}>

export type RuntimeProfileFrameSummary = Readonly<{
  attribution: RuntimeProfileAttribution
  functionName: string
  url: string
  sampleCount: number
  sampledMicros: number | null
}>

export type RuntimeProfileSummary = Readonly<{
  totalSamples: number
  totalSampledMicros: number | null
  frames: ReadonlyArray<RuntimeProfileFrameSummary>
}>

export function normalizeGeneratedJavaScript(source: string): string {
  return source
    .replace(/\r?\n(?:\r?\n)?\/\/[#@]\s*sourceMappingURL=[^\r\n]*(?:\r?\n)?$/, "\n")
    .replace(/\/\*[#@]\s*sourceMappingURL=[\s\S]*?\*\//g, "")
}

function isNodeLoaderUrl(url: string): boolean {
  return /^node:internal\/(?:modules\/(?:cjs|esm)\/|process\/esm_loader$)/.test(url)
}

export function attributeProfileFrame(
  frame: RuntimeProfileCallFrame,
  sourceMap: Pick<SourceMap, "findEntry"> | undefined,
  generatedFilesMatch: boolean,
): RuntimeProfileAttribution {
  if (isNodeLoaderUrl(frame.url)) return { kind: "node-loader", url: frame.url }
  if (frame.url.startsWith("node:internal/")) {
    return { kind: "unattributed", reason: "node-internal", url: frame.url }
  }
  if (!generatedFilesMatch) {
    return { kind: "unattributed", reason: "generated-output-mismatch", url: frame.url }
  }
  if (!sourceMap) {
    return { kind: "unattributed", reason: "source-map-missing", url: frame.url }
  }
  if (!Number.isInteger(frame.lineNumber) || !Number.isInteger(frame.columnNumber) ||
    frame.lineNumber < 0 || frame.columnNumber < 0) {
    return { kind: "unattributed", reason: "invalid-generated-position", url: frame.url }
  }

  let entry: object
  try {
    entry = sourceMap.findEntry(frame.lineNumber, frame.columnNumber)
  } catch {
    return { kind: "unattributed", reason: "source-map-error", url: frame.url }
  }
  if (!("originalSource" in entry) || typeof entry.originalSource !== "string" ||
    !("originalLine" in entry) || typeof entry.originalLine !== "number" ||
    !("originalColumn" in entry) || typeof entry.originalColumn !== "number") {
    return { kind: "unattributed", reason: "source-map-unmapped", url: frame.url }
  }

  return {
    kind: "source",
    source: entry.originalSource,
    line: entry.originalLine + 1,
    column: entry.originalColumn + 1,
  }
}

export function aggregateCpuProfile(
  profile: RuntimeCpuProfile,
  attribute: (frame: RuntimeProfileCallFrame) => RuntimeProfileAttribution,
): RuntimeProfileSummary {
  const samples = profile.samples ?? []
  const durationsAligned = samples.length > 0 && profile.timeDeltas?.length === samples.length
  const nodes = new Map(profile.nodes.map(node => [node.id, node.callFrame]))
  const grouped = new Map<string, {
    attribution: RuntimeProfileAttribution
    functionName: string
    url: string
    sampleCount: number
    sampledMicros: number
    firstSample: number
  }>()

  samples.forEach((nodeId, index) => {
    const frame = nodes.get(nodeId) ?? {
      functionName: "(missing profile node)",
      url: "",
      lineNumber: -1,
      columnNumber: -1,
    }
    const attribution = nodeId === undefined
      ? { kind: "unattributed" as const, reason: "profile-node-missing", url: "" }
      : nodes.has(nodeId)
        ? attribute(frame)
        : { kind: "unattributed" as const, reason: "profile-node-missing", url: "" }
    const key = JSON.stringify([attribution, frame.functionName, frame.url])
    const existing = grouped.get(key)
    const sampledMicros = profile.timeDeltas?.[index] ?? 0
    if (existing) {
      existing.sampleCount += 1
      existing.sampledMicros += sampledMicros
    } else {
      grouped.set(key, {
        attribution,
        functionName: frame.functionName,
        url: frame.url,
        sampleCount: 1,
        sampledMicros,
        firstSample: index,
      })
    }
  })

  const frames = [...grouped.values()]
    .sort((left, right) => right.sampleCount - left.sampleCount || left.firstSample - right.firstSample)
    .map(({ firstSample: _firstSample, ...frame }) => ({
      ...frame,
      sampledMicros: durationsAligned ? frame.sampledMicros : null,
    }))

  return {
    totalSamples: samples.length,
    totalSampledMicros: durationsAligned
      ? profile.timeDeltas!.reduce((sum, duration) => sum + duration, 0)
      : null,
    frames,
  }
}

export function aggregateCpuProfiles(
  profiles: ReadonlyArray<RuntimeCpuProfile>,
  attribute: (frame: RuntimeProfileCallFrame) => RuntimeProfileAttribution,
): RuntimeProfileSummary {
  const nodes: Array<{ id: number; callFrame: RuntimeProfileCallFrame }> = []
  const samples: number[] = []
  const timeDeltas: number[] = []
  let nextId = 0
  let durationsAligned = true

  for (const profile of profiles) {
    const remappedIds = new Map<number, number>()
    for (const node of profile.nodes) {
      const id = nextId++
      remappedIds.set(node.id, id)
      nodes.push({ id, callFrame: node.callFrame })
    }

    const profileSamples = profile.samples ?? []
    const profileDurationsAligned = profileSamples.length > 0 && profile.timeDeltas?.length === profileSamples.length
    if (profileSamples.length > 0 && !profileDurationsAligned) durationsAligned = false

    profileSamples.forEach((nodeId, index) => {
      const remappedId = remappedIds.get(nodeId)
      samples.push(remappedId ?? nextId++)
      if (profileDurationsAligned) timeDeltas.push(profile.timeDeltas![index]!)
    })
  }

  return aggregateCpuProfile({
    nodes,
    samples,
    ...(durationsAligned ? { timeDeltas } : {}),
  }, attribute)
}
