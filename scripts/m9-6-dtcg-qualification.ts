import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import {
  CRUMBS_DTCG_FORMAT_PROFILE,
  CRUMBS_DTCG_RESOLVER_VERSIONS,
  importDtcgTheme,
  type DtcgJsonObject,
} from "../packages/css/dist/tooling-dtcg.mjs"
import { assembleManifest, type DesignSystemManifest, type ManifestTokenDomain } from "../packages/css/dist/tooling-manifest.mjs"
import { createTokenContract, token, type TokenContractInput } from "../packages/css/dist/tokens.mjs"

const ROADMAP_ITEM = "M9.6"
const RESOLVER_URI = "https://example.test/crumbs/m9-6/resolver.json"
function contractIdentity(name: string) {
  return { owner: "@example/crumbs-qualification", name, version: 1 } as const
}
const FIXTURE_ROOT = resolve(import.meta.dir, "../packages/css/test/fixtures/dtcg")
const EVIDENCE_PATH = resolve(import.meta.dir, "../docs/evidence/2026-09-28-m9-6-dtcg/qualification.json")
const FIXTURE_PATHS = [
  "packages/css/test/fixtures/dtcg/color.tokens.json",
  "packages/css/test/fixtures/dtcg/conversion-cases.json",
  "packages/css/test/fixtures/dtcg/conversions.tokens.json",
  "packages/css/test/fixtures/dtcg/format.tokens.json",
  "packages/css/test/fixtures/dtcg/rejected.tokens.json",
  "packages/css/test/fixtures/dtcg/resolver.json",
  "packages/css/test/fixtures/dtcg/theme-dark.tokens.json",
  "packages/css/test/fixtures/dtcg/theme-light.tokens.json",
] as const
const DOCUMENT_NAMES = [
  "format.tokens.json",
  "color.tokens.json",
  "conversions.tokens.json",
  "rejected.tokens.json",
  "theme-light.tokens.json",
  "theme-dark.tokens.json",
] as const

type ConversionCase = Readonly<{
  id: string
  path: ReadonlyArray<string>
  domain: ManifestTokenDomain
  source: string
  expectedValue?: string | number
  diagnosticCode?: string
  scenario?: string
}>
type ConversionCases = Readonly<{
  profile: Readonly<{
    formatVersion: string
    colorVersion: string
    resolverVersions: ReadonlyArray<string>
  }>
  accepted: ReadonlyArray<ConversionCase>
  rejected: ReadonlyArray<ConversionCase>
}>
type FixtureRecord = Readonly<{ path: string; bytes: Buffer }>
type QualificationInputs = Readonly<{
  readonly fixtures: ReadonlyArray<FixtureRecord>
  readonly resolver: DtcgJsonObject
  readonly documents: Readonly<Record<string, DtcgJsonObject>>
  readonly cases: ConversionCases
}>

function sha256(bytes: string | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex")
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys)
  if (value === null || typeof value !== "object") return value
  const record = value as Record<string, unknown>
  return Object.fromEntries(Object.keys(record).sort(compareText).map(key => [key, sortJsonKeys(record[key])]))
}

function encodeCanonicalJson(value: unknown): string {
  return `${JSON.stringify(sortJsonKeys(value), null, 2)}\n`
}

function readJsonObject(path: string): DtcgJsonObject {
  const value: unknown = JSON.parse(readFileSync(resolve(FIXTURE_ROOT, path), "utf8"))
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("M9.6 fixture qualification expected an object document.")
  }
  return value as DtcgJsonObject
}

function loadInputs(): QualificationInputs {
  const fixtures = FIXTURE_PATHS.map(path => ({ path, bytes: readFileSync(resolve(import.meta.dir, "..", path)) }))
  const resolver = readJsonObject("resolver.json")
  const documents = Object.fromEntries(DOCUMENT_NAMES.map(name => [new URL(name, RESOLVER_URI).href, readJsonObject(name)]))
  const rawCases: unknown = JSON.parse(readFileSync(resolve(FIXTURE_ROOT, "conversion-cases.json"), "utf8"))
  if (typeof rawCases !== "object" || rawCases === null || Array.isArray(rawCases)) {
    throw new Error("M9.6 fixture qualification expected a conversion matrix object.")
  }
  const record = rawCases as {
    readonly profile?: unknown
    readonly accepted?: unknown
    readonly rejected?: unknown
  }
  if (typeof record.profile !== "object" || record.profile === null || Array.isArray(record.profile) ||
    !Array.isArray(record.accepted) || !Array.isArray(record.rejected)) {
    throw new Error("M9.6 fixture qualification expected a profile and accepted/rejected case arrays.")
  }
  return {
    fixtures,
    resolver,
    documents,
    cases: {
      profile: record.profile as ConversionCases["profile"],
      accepted: record.accepted as ReadonlyArray<ConversionCase>,
      rejected: record.rejected as ReadonlyArray<ConversionCase>,
    },
  }
}

function tokenDefinition(domain: ManifestTokenDomain) {
  switch (domain.kind) {
    case "color": return token.color()
    case "length": return token.length({ allowNegative: domain.allowNegative })
    case "duration": return token.duration()
    case "opacity": return token.opacity()
    case "enum": return token.enum(domain.values)
  }
}

type MutableTokenShape = { [key: string]: TokenContractInput[string] }

function tokenShape(cases: ReadonlyArray<ConversionCase>): TokenContractInput {
  const root = Object.create(null) as MutableTokenShape
  for (const conversionCase of cases) {
    if (conversionCase.path.length === 0) throw new Error("M9.6 fixture paths must contain at least one segment.")
    let parent = root
    for (const segment of conversionCase.path.slice(0, -1)) {
      const existing = parent[segment]
      if (existing === undefined) parent[segment] = Object.create(null) as MutableTokenShape
      const next = parent[segment]
      if (typeof next !== "object" || next === null || "$$type" in next) {
        throw new Error("M9.6 fixture token paths cannot collide with another token path.")
      }
      parent = next as MutableTokenShape
    }
    const leaf = conversionCase.path[conversionCase.path.length - 1]!
    if (parent[leaf] !== undefined) throw new Error("M9.6 fixture matrix contains a duplicate token path.")
    parent[leaf] = tokenDefinition(conversionCase.domain)
  }
  return root
}

function manifestFor(cases: ReadonlyArray<ConversionCase>, identity: ReturnType<typeof contractIdentity>): DesignSystemManifest {
  const contract = createTokenContract(tokenShape(cases), identity)
  return assembleManifest({
    package: { name: identity.owner, version: "1.0.0" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "crumbs.native-style-artifact", version: 1 },
    },
    tokenContracts: [{ contract, origin: { path: "src/tokens.css.ts", exportPath: "tokens" } }],
  })
}

function tokenForPath(
  manifest: DesignSystemManifest,
  path: ReadonlyArray<string>,
  identity: ReturnType<typeof contractIdentity>,
) {
  return manifest.tokens.find(tokenEntry => tokenEntry.contract.owner === identity.owner
    && tokenEntry.contract.name === identity.name
    && tokenEntry.contract.version === identity.version
    && JSON.stringify(tokenEntry.path) === JSON.stringify(path))
}

function runImport(
  inputs: Pick<QualificationInputs, "resolver" | "documents">,
  manifest: DesignSystemManifest,
  identity: ReturnType<typeof contractIdentity>,
  remBasePx?: number,
) {
  return importDtcgTheme({
    resolver: inputs.resolver,
    resolverUri: RESOLVER_URI,
    documents: inputs.documents,
    manifest,
    contractIdentity: identity,
    ...(remBasePx === undefined ? {} : { remBasePx }),
  })
}

function evaluateFixtureSet() {
  const inputs = loadInputs()
  if (inputs.cases.profile.formatVersion !== CRUMBS_DTCG_FORMAT_PROFILE ||
    inputs.cases.profile.colorVersion !== CRUMBS_DTCG_FORMAT_PROFILE ||
    JSON.stringify(inputs.cases.profile.resolverVersions) !== JSON.stringify(CRUMBS_DTCG_RESOLVER_VERSIONS) ||
    !inputs.cases.profile.resolverVersions.includes(String(inputs.resolver.version))) {
    throw new Error("M9.6 fixture profile literals do not match the public DTCG tooling profile.")
  }
  const acceptedCases = inputs.cases.accepted
  const acceptedIdentity = contractIdentity("accepted")
  const acceptedManifest = manifestFor(acceptedCases, acceptedIdentity)
  const acceptedResult = runImport(inputs, acceptedManifest, acceptedIdentity, 16)
  if (!acceptedResult.ok) throw new Error("M9.6 accepted conversion fixtures did not produce a complete theme import.")
  const acceptedConversions = acceptedCases.map(conversionCase => {
    const manifestToken = tokenForPath(acceptedManifest, conversionCase.path, acceptedIdentity)
    if (manifestToken === undefined || conversionCase.expectedValue === undefined) {
      throw new Error("M9.6 accepted conversion fixture is missing its declared contract or expected value.")
    }
    const provenance = acceptedResult.value.sidecar.tokens.find(item => item.tokenId === manifestToken.id)
    const expectedSourceUri = new URL(conversionCase.source, RESOLVER_URI).href
    if (provenance?.origin.documentUri !== expectedSourceUri) {
      throw new Error(`M9.6 accepted conversion fixture ${conversionCase.id} did not retain its expected source document.`)
    }
    const value = acceptedResult.value.payload.values[manifestToken.id]
    if (value !== conversionCase.expectedValue) {
      throw new Error(`M9.6 accepted conversion fixture ${conversionCase.id} did not match its expected value.`)
    }
    return {
      id: conversionCase.id,
      path: [...conversionCase.path],
      source: conversionCase.source,
      jsonPointer: provenance.origin.jsonPointer,
      tokenId: manifestToken.id,
      value,
    }
  })
  if (acceptedResult.value.sidecar.modifiers.theme !== "light") {
    throw new Error("M9.6 Resolver fixture did not select its declared default theme context.")
  }
  const provenanceCase = acceptedCases.find(conversionCase => conversionCase.id === "dimension-px")
  const provenanceManifestToken = provenanceCase === undefined
    ? undefined
    : tokenForPath(acceptedManifest, provenanceCase.path, acceptedIdentity)
  const retainedProvenance = provenanceManifestToken === undefined
    ? undefined
    : acceptedResult.value.sidecar.tokens.find(item => item.tokenId === provenanceManifestToken.id)
  const spacingGroupMetadata = retainedProvenance?.groupMetadata.find(group => JSON.stringify(group.path) === JSON.stringify(["space"]))
  if (retainedProvenance?.metadata.description !== "Eight-pixel baseline spacing token." ||
    retainedProvenance.metadata.deprecated !== true ||
    retainedProvenance.metadata.deprecationMessage !== "Prefer the root-scaled token where appropriate." ||
    JSON.stringify(retainedProvenance.metadata.extensions) !== JSON.stringify({ "com.example": { category: "spacing" } }) ||
    spacingGroupMetadata?.metadata.description !== "Source-tooling spacing conversion cases." ||
    JSON.stringify(spacingGroupMetadata.metadata.extensions) !== JSON.stringify({ "com.example": { group: "spacing" } })) {
    throw new Error("M9.6 qualification did not preserve token and inherited group provenance metadata.")
  }

  const rejectedCases = inputs.cases.rejected.filter(conversionCase => conversionCase.scenario !== "omit-rem-base")
  const rejectedIdentity = contractIdentity("rejected")
  const rejectedManifest = manifestFor(rejectedCases, rejectedIdentity)
  const rejectedResult = runImport(inputs, rejectedManifest, rejectedIdentity, 16)
  if (rejectedResult.ok) throw new Error("M9.6 rejected conversion fixtures unexpectedly produced a theme import.")
  const rejectedConversions = rejectedCases.map(conversionCase => {
    const manifestToken = tokenForPath(rejectedManifest, conversionCase.path, rejectedIdentity)
    if (manifestToken === undefined || conversionCase.diagnosticCode === undefined) {
      throw new Error("M9.6 rejected conversion fixture is missing its declared contract or diagnostic.")
    }
    const diagnostic = rejectedResult.diagnostics.find(item => item.crumbsTokenId === manifestToken.id && item.severity === "error")
    if (diagnostic?.code !== conversionCase.diagnosticCode) {
      throw new Error(`M9.6 rejected conversion fixture ${conversionCase.id} did not produce its declared diagnostic.`)
    }
    if (diagnostic.documentUri !== new URL(conversionCase.source, RESOLVER_URI).href) {
      throw new Error(`M9.6 rejected conversion fixture ${conversionCase.id} did not retain its expected source document.`)
    }
    return {
      id: conversionCase.id,
      path: [...conversionCase.path],
      source: conversionCase.source,
      diagnosticCode: diagnostic.code,
    }
  })

  const missingBaseCase = inputs.cases.rejected.find(conversionCase => conversionCase.scenario === "omit-rem-base")
  if (missingBaseCase === undefined || missingBaseCase.diagnosticCode === undefined) {
    throw new Error("M9.6 conversion matrix is missing the rem-without-base fixture.")
  }
  const missingBaseIdentity = contractIdentity("rem-base-required")
  const missingBaseManifest = manifestFor([missingBaseCase], missingBaseIdentity)
  const missingBaseResult = runImport(inputs, missingBaseManifest, missingBaseIdentity)
  const missingBaseToken = tokenForPath(missingBaseManifest, missingBaseCase.path, missingBaseIdentity)
  if (missingBaseResult.ok || missingBaseToken === undefined) {
    throw new Error("M9.6 rem-without-base fixture did not fail as expected.")
  }
  const missingBaseDiagnostic = missingBaseResult.diagnostics.find(item => item.crumbsTokenId === missingBaseToken.id)
  if (missingBaseDiagnostic?.code !== missingBaseCase.diagnosticCode ||
    missingBaseDiagnostic.documentUri !== new URL(missingBaseCase.source, RESOLVER_URI).href) {
    throw new Error("M9.6 rem-without-base fixture did not produce its declared diagnostic.")
  }
  rejectedConversions.push({
    id: missingBaseCase.id,
    path: [...missingBaseCase.path],
    source: missingBaseCase.source,
    diagnosticCode: missingBaseDiagnostic.code,
  })

  const fixtures = inputs.fixtures.map(fixture => ({
    path: fixture.path,
    sha256: sha256(fixture.bytes),
    bytes: fixture.bytes.byteLength,
  }))
  const receipt = {
    format: "crumbs.dtcg-import-qualification",
    schemaVersion: 1,
    roadmapItem: ROADMAP_ITEM,
    status: "qualified-source-tooling",
    profile: {
      format: CRUMBS_DTCG_FORMAT_PROFILE,
      formatVersion: inputs.cases.profile.formatVersion,
      colorVersion: inputs.cases.profile.colorVersion,
      resolverVersions: [...CRUMBS_DTCG_RESOLVER_VERSIONS],
      resolverFixtureVersion: acceptedResult.value.sidecar.resolverVersion,
      resolverVersionNote: "The Resolver final report and published schema use inconsistent date literals; Crumbs supports both report dates and the schema profile literal.",
    },
    gates: [
      "public-api-import",
      "accepted-conversions",
      "rejected-conversions",
      "source-provenance-and-metadata",
      "missing-rem-base",
      "repeatable-receipt",
      "fixture-digests",
    ],
    fixtures,
    coverage: {
      defaultModifier: acceptedResult.value.sidecar.modifiers.theme,
      acceptedCount: acceptedConversions.length,
      acceptedConversions,
      provenance: {
        id: provenanceCase!.id,
        source: provenanceCase!.source,
        jsonPointer: retainedProvenance!.origin.jsonPointer,
        metadata: retainedProvenance!.metadata,
        groupMetadata: retainedProvenance!.groupMetadata,
      },
      rejectedCount: rejectedConversions.length,
      rejectedConversions: rejectedConversions.sort((left, right) => compareText(left.id, right.id)),
    },
    boundaries: [
      "Source/tooling import only; runtime and device performance are unmeasured.",
      "Android/device acceptance is not run and remains parked.",
      "Package publication and consumer release acceptance are not run.",
      "Visual design-system acceptance is not run.",
    ],
  }
  return receipt
}

/** Run the checked-in fixture matrix twice and emit stable, environment-free qualification bytes. */
export function generateDtcgQualification(): Readonly<{ receiptJson: string }> {
  const first = encodeCanonicalJson(evaluateFixtureSet())
  const second = encodeCanonicalJson(evaluateFixtureSet())
  if (first !== second) throw new Error("M9.6 DTCG fixture qualification was not repeatable.")
  return { receiptJson: second }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const evidence = generateDtcgQualification()
  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true })
  writeFileSync(EVIDENCE_PATH, evidence.receiptJson)
  process.stdout.write(evidence.receiptJson)
}
