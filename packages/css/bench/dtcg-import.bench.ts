import { performance } from "node:perf_hooks"
import { importDtcgTheme, type DtcgJsonObject } from "../dist/tooling-dtcg.mjs"
import { assembleManifest, type ManifestTokenDomain } from "../dist/tooling-manifest.mjs"
import { createTokenContract, token, type TokenContractInput } from "../dist/tokens.mjs"

const COUNTS = [1_000, 10_000, 50_000] as const
const IDENTITY_OWNER = "@example/crumbs-dtcg-benchmark"

type Workload = Readonly<{
  readonly tokenCount: number
  readonly resolver: DtcgJsonObject
  readonly resolverUri: string
  readonly documents: Readonly<Record<string, DtcgJsonObject>>
  readonly manifest: ReturnType<typeof assembleManifest>
  readonly documentBytes: number
}>

type ImportRequest = Parameters<typeof importDtcgTheme>[0]

type ResolverChainWorkload = Readonly<{
  readonly depth: number
  readonly request: ImportRequest
  readonly documentBytes: number
}>

function domainForToken(_: number): ManifestTokenDomain {
  return { kind: "length", allowNegative: false }
}

function buildWorkload(tokenCount: number): Workload {
  const identity = { owner: IDENTITY_OWNER, name: `tokens-${tokenCount}`, version: 1 } as const
  const spacing = Object.create(null) as Record<string, TokenContractInput[string]>
  const spacingTokens: Record<string, DtcgJsonObject> = Object.create(null) as Record<string, DtcgJsonObject>
  for (let index = 0; index < tokenCount; index += 1) {
    const name = `token-${String(index).padStart(5, "0")}`
    const domain = domainForToken(index)
    spacing[name] = token.length({ allowNegative: domain.kind === "length" && domain.allowNegative })
    spacingTokens[name] = { $type: "dimension", $value: { value: (index % 96) + 1, unit: "px" } }
  }
  const contract = createTokenContract({ spacing }, identity)
  const manifest = assembleManifest({
    package: { name: identity.owner, version: "1.0.0" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "crumbs.native-style-artifact", version: 1 },
    },
    tokenContracts: [{ contract, origin: { path: "src/tokens.css.ts", exportPath: "tokens" } }],
  })
  const resolverUri = `https://bench.example.test/crumbs/dtcg/${tokenCount}/resolver.json`
  const documentUri = new URL("tokens.json", resolverUri).href
  const document: DtcgJsonObject = { spacing: spacingTokens }
  const resolver: DtcgJsonObject = {
    version: "2025.10",
    sets: { foundation: { sources: [{ $ref: documentUri }] } },
    resolutionOrder: [{ $ref: "#/sets/foundation" }],
  }
  return {
    tokenCount,
    resolver,
    resolverUri,
    documents: { [documentUri]: document },
    manifest,
    documentBytes: Buffer.byteLength(JSON.stringify(document)),
  }
}

function buildResolverChainWorkload(depth: number): ResolverChainWorkload {
  const identity = { owner: IDENTITY_OWNER, name: `resolver-chain-${depth}`, version: 1 } as const
  const contract = createTokenContract({ color: { leaf: token.color() } }, identity)
  const manifest = assembleManifest({
    package: { name: identity.owner, version: "1.0.0" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "crumbs.native-style-artifact", version: 1 },
    },
    tokenContracts: [{ contract, origin: { path: "src/tokens.css.ts", exportPath: "tokens" } }],
  })
  const resolverUri = "https://bench.example.test/crumbs/dtcg/resolver-chain/resolver.json"
  const firstDocumentUri = new URL("0.json", resolverUri).href
  const documents = Object.create(null) as Record<string, DtcgJsonObject>
  let documentBytes = 0
  for (let index = 0; index < depth; index += 1) {
    const uri = new URL(`${index}.json`, resolverUri).href
    const document: DtcgJsonObject = {
      sources: index + 1 < depth
        ? [{ $ref: `${index + 1}.json` }]
        : [{ color: { leaf: { $type: "color", $value: { colorSpace: "srgb", components: [0, 0, 0] } } } }],
    }
    documents[uri] = document
    documentBytes += Buffer.byteLength(JSON.stringify(document))
  }
  const resolver: DtcgJsonObject = {
    version: "2025.10",
    sets: { root: { sources: [{ $ref: firstDocumentUri }] } },
    resolutionOrder: [{ $ref: "#/sets/root" }],
  }
  return {
    depth,
    request: { resolver, resolverUri, documents, manifest, contractIdentity: identity },
    documentBytes,
  }
}

function importResolverChainOnce(workload: ResolverChainWorkload): Readonly<{
  readonly status: "complete"
  readonly payloadTokenCount: number
  readonly durationMs: number
}> {
  const start = performance.now()
  const result = importDtcgTheme(workload.request)
  const durationMs = Number((performance.now() - start).toFixed(3))
  if (!result.ok) {
    const codes = [...new Set(result.diagnostics.map(diagnostic => diagnostic.code))].sort()
    throw new Error(`DTCG resolver-chain benchmark failed: ${codes.join(", ")}.`)
  }
  const payloadTokenCount = Object.keys(result.value.payload.values).length
  if (payloadTokenCount !== 1) throw new Error("DTCG resolver-chain benchmark did not import its token.")
  return { status: "complete", payloadTokenCount, durationMs }
}

function importOnce(workload: Workload): Readonly<{
  readonly status: "complete" | "resource-limited"
  readonly diagnosticCodes: ReadonlyArray<string>
  readonly payloadTokenCount: number | null
  readonly durationMs: number
}> {
  const start = performance.now()
  const result = importDtcgTheme({
    resolver: workload.resolver,
    resolverUri: workload.resolverUri,
    documents: workload.documents,
    manifest: workload.manifest,
    contractIdentity: {
      owner: IDENTITY_OWNER,
      name: `tokens-${workload.tokenCount}`,
      version: 1,
    },
  })
  const durationMs = Number((performance.now() - start).toFixed(3))
  if (!result.ok) {
    const diagnosticCodes = [...new Set(result.diagnostics.map(diagnostic => diagnostic.code))].sort()
    if (!diagnosticCodes.includes("resource.limit-exceeded")) {
      throw new Error(`DTCG benchmark workload ${workload.tokenCount} failed outside its resource boundary: ${diagnosticCodes.join(", ")}.`)
    }
    return { status: "resource-limited", diagnosticCodes, payloadTokenCount: null, durationMs }
  }
  if (Object.keys(result.value.payload.values).length !== workload.tokenCount) {
    throw new Error(`DTCG benchmark workload ${workload.tokenCount} did not import every token.`)
  }
  return {
    status: "complete",
    diagnosticCodes: [],
    payloadTokenCount: Object.keys(result.value.payload.values).length,
    durationMs,
  }
}

function median(values: ReadonlyArray<number>): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!
}

const samples = COUNTS.map(tokenCount => {
  const workload = buildWorkload(tokenCount)
  const warmupCount = tokenCount < 50_000 ? 1 : 0
  const sampleCount = tokenCount === 1_000 ? 5 : tokenCount === 10_000 ? 3 : 1
  for (let index = 0; index < warmupCount; index += 1) importOnce(workload)
  const observations: ReturnType<typeof importOnce>[] = []
  for (let index = 0; index < sampleCount; index += 1) {
    observations.push(importOnce(workload))
  }
  const outcomes = observations.map(({ status, diagnosticCodes, payloadTokenCount }) => ({ status, diagnosticCodes, payloadTokenCount }))
  if (outcomes.some(outcome => JSON.stringify(outcome) !== JSON.stringify(outcomes[0]))) {
    throw new Error(`DTCG benchmark workload ${tokenCount} did not produce a stable outcome.`)
  }
  const durationsMs = observations.map(observation => observation.durationMs)
  const outcome = outcomes[0]!
  return {
    tokenCount,
    manifestTokenCount: workload.manifest.tokens.length,
    documentBytes: workload.documentBytes,
    sampleCount,
    warmupCount,
    status: outcome.status,
    diagnosticCodes: outcome.diagnosticCodes,
    payloadTokenCount: outcome.payloadTokenCount,
    medianImportMs: Number(median(durationsMs).toFixed(3)),
    minImportMs: Math.min(...durationsMs),
    maxImportMs: Math.max(...durationsMs),
    timingsAreSeparateFromQualificationReceipt: true,
  }
})

const resolverChainWorkload = buildResolverChainWorkload(15_000)
const resolverChainWarmups = 1
const resolverChainSampleCount = 3
for (let index = 0; index < resolverChainWarmups; index += 1) importResolverChainOnce(resolverChainWorkload)
const resolverChainObservations = Array.from({ length: resolverChainSampleCount }, () => importResolverChainOnce(resolverChainWorkload))
const resolverChainDurations = resolverChainObservations.map(observation => observation.durationMs)
const resolverChain = {
  depth: resolverChainWorkload.depth,
  documentBytes: resolverChainWorkload.documentBytes,
  sampleCount: resolverChainSampleCount,
  warmupCount: resolverChainWarmups,
  status: "complete",
  payloadTokenCount: resolverChainObservations[0]!.payloadTokenCount,
  medianImportMs: Number(median(resolverChainDurations).toFixed(3)),
  minImportMs: Math.min(...resolverChainDurations),
  maxImportMs: Math.max(...resolverChainDurations),
  timingsAreSeparateFromQualificationReceipt: true,
}

process.stdout.write(`${JSON.stringify({
  format: "crumbs.dtcg-import-benchmark",
  schemaVersion: 1,
  timingScope: "Bun/Node tooling importDtcgTheme call through success or deterministic resource rejection; workload generation and manifest assembly are excluded.",
  samples,
  resolverChain,
  unmeasured: ["React Native runtime", "device rendering", "Android", "iOS", "release consumer performance"],
}, null, 2)}\n`)
