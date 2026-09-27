import { describe, expect, it } from "bun:test"
import { checkManifestConsumers } from "../src/tooling/manifest/consumer-check"

const providerName = "@acme/design-system"
const appName = "@acme/app"

function privateToken(id: string, path: ReadonlyArray<string>) {
  return {
    id,
    contract: { owner: providerName, name: "foundation", version: 1 },
    path,
    visibility: "private",
    domain: { kind: "color" },
    kind: "definition",
    origin: { path: `src/tokens/${path.join("-")}.css.ts` },
  }
}

function aliasToken(to: string) {
  return {
    id: `${appName}#token:alias.surface`,
    contract: { owner: appName, name: "consumer", version: 1 },
    path: ["alias", "surface"],
    visibility: "public",
    domain: { kind: "color" },
    kind: "alias",
    alias: { targetId: to, targetPath: ["color", "private"], resolution: "external" },
    origin: { path: "src/tokens.css.ts" },
  }
}

function providerManifest(options: {
  readonly tokens?: ReadonlyArray<Record<string, unknown>>
  readonly modules?: ReadonlyArray<Record<string, unknown>>
  readonly dependencies?: ReadonlyArray<Record<string, unknown>>
  readonly unresolved?: ReadonlyArray<Record<string, unknown>>
} = {}) {
  const tokens = options.tokens ?? []
  const modules = options.modules ?? []
  const roots = new Map<string, { kind: string; id: string }>()
  for (const token of tokens) {
    roots.set(`${providerName}#foundation@1`, { kind: "token-contract", id: `${providerName}#foundation@1` })
  }
  for (const module of modules) roots.set(module.id as string, { kind: "style-module", id: module.id as string })
  return {
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: providerName, version: "1.3.0" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "1.2.0" },
      artifact: { name: "crumbs-native-style-artifact", version: 1 },
    },
    tokens,
    components: [],
    modules,
    dependencies: options.dependencies ?? [],
    capabilities: [],
    coverage: { roots: [...roots.values()], unresolved: options.unresolved ?? [] },
  }
}

function consumerManifest(options: {
  readonly name?: string
  readonly version?: string
  readonly tokens?: ReadonlyArray<Record<string, unknown>>
  readonly modules?: ReadonlyArray<Record<string, unknown>>
  readonly dependencies?: ReadonlyArray<Record<string, unknown>>
  readonly unresolved?: ReadonlyArray<Record<string, unknown>>
} = {}) {
  const name = options.name ?? appName
  const tokens = options.tokens ?? []
  const modules = options.modules ?? []
  const roots = new Map<string, { kind: string; id: string }>()
  for (const token of tokens) roots.set(`${name}#consumer@1`, { kind: "token-contract", id: `${name}#consumer@1` })
  for (const module of modules) roots.set(module.id as string, { kind: "style-module", id: module.id as string })
  return {
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name, version: options.version ?? "2.0.0" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "1.2.0" },
      artifact: { name: "crumbs-native-style-artifact", version: 1 },
    },
    tokens,
    components: [],
    modules,
    dependencies: options.dependencies ?? [],
    capabilities: [],
    coverage: { roots: [...roots.values()], unresolved: options.unresolved ?? [] },
  }
}

function appStyleModule(name = appName) {
  return { id: `${name}#src/styles.css.ts`, origin: { path: "src/styles.css.ts" }, exports: ["Card"] }
}

function styleDependency(targetId: string, name = appName) {
  const moduleId = `${name}#src/styles.css.ts`
  return {
    from: moduleId,
    to: targetId,
    kind: "style-token",
    resolution: "external",
    origin: { moduleId, exportPath: "Card", property: "backgroundColor" },
  }
}

describe("manifest consumer check", () => {
  it("finds external style-token and token-alias edges to current private tokens", () => {
    const styleTokenId = `${providerName}#token:color.surface`
    const aliasTargetId = `${providerName}#token:color.border`
    const current = providerManifest({ tokens: [
      privateToken(styleTokenId, ["color", "surface"]),
      privateToken(aliasTargetId, ["color", "border"]),
    ] })
    const consumer = consumerManifest({
      tokens: [aliasToken(aliasTargetId)],
      modules: [appStyleModule()],
      dependencies: [
        styleDependency(styleTokenId),
        { from: `${appName}#token:alias.surface`, to: aliasTargetId, kind: "token-alias", resolution: "external" },
      ],
    })

    const report = checkManifestConsumers({ current, consumers: [consumer] })
    expect(report.mode).toBe("check")
    expect(report.suppliedConsumers).toEqual([{ name: appName, version: "2.0.0" }])
    expect(report.findings.map(finding => finding.code)).toEqual([
      "consumer.private-token-dependency",
      "consumer.private-token-dependency",
    ])
    const styleFinding = report.findings.find(finding => finding.entityId === styleTokenId)!
    expect(styleFinding).toMatchObject({ level: "error", fieldPath: "visibility" })
    expect(styleFinding.affectedConsumers[0]).toEqual({
      package: { name: appName, version: "2.0.0" },
      dependency: {
        from: `${appName}#src/styles.css.ts`,
        to: styleTokenId,
        kind: "style-token",
        origin: { moduleId: `${appName}#src/styles.css.ts`, exportPath: "Card", property: "backgroundColor" },
      },
    })
    const aliasFinding = report.findings.find(finding => finding.entityId === aliasTargetId)!
    expect(aliasFinding.affectedConsumers[0]?.dependency).toEqual({
      from: `${appName}#token:alias.surface`,
      to: aliasTargetId,
      kind: "token-alias",
    })
  })

  it("does not treat provider-owned style dependencies as external consumer use", () => {
    const tokenId = `${providerName}#token:color.surface`
    const moduleId = `${providerName}#src/internal.css.ts`
    const token = { ...privateToken(tokenId, ["color", "surface"]), visibility: "private" }
    const current = providerManifest({
      tokens: [token],
      modules: [{ id: moduleId, origin: { path: "src/internal.css.ts" }, exports: ["Card"] }],
      dependencies: [{ from: moduleId, to: tokenId, kind: "style-token", resolution: "internal", origin: { moduleId, exportPath: "Card", property: "backgroundColor" } }],
    })

    expect(checkManifestConsumers({ current }).findings).toEqual([])
  })

  it("rejects duplicate consumer identities and the provider package as a consumer", () => {
    const current = providerManifest()
    const consumer = consumerManifest()
    expect(() => checkManifestConsumers({ current, consumers: [consumer, consumer] })).toThrow(/duplicate consumer/i)
    expect(() => checkManifestConsumers({ current, consumers: [consumerManifest({ name: providerName })] })).toThrow(/provider.*consumer|consumer.*provider/i)
  })

  it("reports absent consumer coverage when no consumer manifests are supplied", () => {
    const report = checkManifestConsumers({ current: providerManifest() })
    expect(report.provider).toEqual({ name: providerName, currentVersion: "1.3.0" })
    expect(report.analysisLimits.map(limit => limit.code)).toEqual([
      "component-use-unavailable",
      "consumer-manifests-not-supplied",
      "explicit-coverage",
    ])
    expect(report.findings).toEqual([])
  })
})
