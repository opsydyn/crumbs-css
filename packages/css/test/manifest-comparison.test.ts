import { describe, expect, it } from "bun:test"
import { checkManifestConsumers } from "../src/tooling/manifest/consumer-check"
import { compareManifestContracts, compareManifests } from "../src/tooling/manifest/comparison"

const packageName = "@acme/design-system"

function manifest(input: {
  readonly name?: string
  readonly version?: string
  readonly tokens?: ReadonlyArray<Record<string, unknown>>
  readonly components?: ReadonlyArray<Record<string, unknown>>
  readonly modules?: ReadonlyArray<Record<string, unknown>>
  readonly dependencies?: ReadonlyArray<Record<string, unknown>>
  readonly unresolved?: ReadonlyArray<Record<string, unknown>>
}) {
  const name = input.name ?? packageName
  const tokens = input.tokens ?? []
  const components = input.components ?? []
  const modules = input.modules ?? []
  const contractRoots = tokens.length === 0
    ? []
    : [{ kind: "token-contract", id: `${name}#foundation@1` }]
  return {
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name, version: input.version ?? "1.2.0" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "1.2.0" },
      artifact: { name: "crumbs-native-style-artifact", version: 1 },
    },
    tokens,
    components,
    capabilities: [],
    coverage: {
      roots: [
        ...contractRoots,
        ...components.map(component => ({ kind: "component-recipe", id: component.id as string })),
        ...modules.map(module => ({ kind: "style-module", id: module.id as string })),
      ],
      unresolved: input.unresolved ?? [],
    },
    modules,
    dependencies: input.dependencies ?? [],
  }
}

function token(input: {
  readonly name: string
  readonly visibility?: "public" | "private"
  readonly domain?: Record<string, unknown>
}) {
  return {
    id: `${packageName}#token:${input.name}`,
    contract: { owner: packageName, name: "foundation", version: 1 },
    path: input.name.split("."),
    visibility: input.visibility ?? "public",
    domain: input.domain ?? { kind: "color" },
    kind: "definition",
    origin: { path: `src/tokens/${input.name}.css.ts` },
  }
}

function component(input: {
  readonly name: string
  readonly slots?: ReadonlyArray<string>
  readonly variants?: Readonly<Record<string, ReadonlyArray<string>>>
  readonly defaults?: Readonly<Record<string, string | number | boolean>>
}) {
  return {
    id: `${packageName}#component:${input.name}`,
    contract: { owner: packageName, name: input.name, version: 1 },
    origin: { path: `src/${input.name}.css.ts`, exportPath: input.name },
    slots: [...(input.slots ?? [])],
    variants: input.variants ?? {},
    extensionPoints: [],
    stateConstraints: [],
    defaults: input.defaults ?? {},
  }
}

function externalConsumer(targets: ReadonlyArray<string>, includeUnresolved = false) {
  const name = "@acme/app"
  const moduleId = `${name}#src/styles.css.ts`
  return manifest({
    name,
    version: "2.0.0",
    modules: [{ id: moduleId, origin: { path: "src/styles.css.ts" }, exports: ["Card"] }],
    dependencies: [
      ...targets.map(to => ({ from: moduleId, to, kind: "style-token", resolution: "external", origin: { moduleId, exportPath: "Card", property: "color" } })),
      ...(includeUnresolved ? [{ from: moduleId, kind: "style-token", resolution: "unresolved", origin: { moduleId, exportPath: "Card", property: "borderColor" } }] : []),
    ],
    unresolved: includeUnresolved ? [{ reference: "color.missing", reason: "consumer edge unresolved" }] : [],
  })
}

describe("manifest contract comparison", () => {
  it("reports public token removals, domain changes, visibility reductions, and additions", () => {
    const baseline = manifest({ tokens: [
      token({ name: "color.removed" }),
      token({ name: "color.changed" }),
      token({ name: "color.private" }),
      token({ name: "color.already-private", visibility: "private" }),
    ] })
    const current = manifest({ version: "1.3.0", tokens: [
      token({ name: "color.changed", domain: { kind: "length", allowNegative: false } }),
      token({ name: "color.private", visibility: "private" }),
      token({ name: "color.added" }),
    ] })

    const result = compareManifestContracts(baseline, current)
    expect(result.provider).toEqual({ name: packageName, baselineVersion: "1.2.0", currentVersion: "1.3.0" })
    expect(result.findings.map(finding => [finding.code, finding.entityId, finding.level])).toEqual([
      ["token.added", `${packageName}#token:color.added`, "info"],
      ["token.domain-changed", `${packageName}#token:color.changed`, "error"],
      ["token.removed", `${packageName}#token:color.removed`, "error"],
      ["token.visibility-reduced", `${packageName}#token:color.private`, "error"],
    ])
    expect(result.findings.every(finding => finding.affectedConsumers.length === 0)).toBe(true)
    expect(result.analysisLimits.map(limit => limit.code)).toContain("explicit-coverage")
    expect(result.findings.find(finding => finding.code === "token.domain-changed")).toMatchObject({
      before: { kind: "color" },
      after: { kind: "length", allowNegative: false },
    })
  })

  it("reports component removal without cascading, and compares retained slots, variant axes/values, defaults, and additions", () => {
    const baseline = manifest({ components: [
      component({ name: "Removed", slots: ["root", "icon"], variants: { size: ["small", "large"] }, defaults: { size: "small" } }),
      component({
        name: "Button",
        slots: ["root", "icon"],
        variants: { size: ["small", "large"], shape: ["round"], tone: ["quiet"] },
        defaults: { size: "small", tone: "quiet" },
      }),
    ] })
    const current = manifest({ version: "1.3.0", components: [
      component({ name: "Button", slots: ["root", "label"], variants: { size: ["small"], tone: ["quiet", "loud"], density: ["compact"] }, defaults: { size: "large", tone: "quiet" } }),
      component({ name: "Badge", slots: ["root"], variants: { tone: ["quiet"] }, defaults: { tone: "quiet" } }),
    ] })

    const findings = compareManifestContracts(baseline, current).findings
    expect(findings.map(finding => [finding.code, finding.entityId, finding.fieldPath, finding.level])).toEqual([
      ["component.added", `${packageName}#component:Badge`, "component", "info"],
      ["component.default-changed", `${packageName}#component:Button`, "defaults.size", "warning"],
      ["component.removed", `${packageName}#component:Removed`, "component", "error"],
      ["component.slot-added", `${packageName}#component:Button`, "slots.label", "info"],
      ["component.slot-removed", `${packageName}#component:Button`, "slots.icon", "error"],
      ["component.variant-added", `${packageName}#component:Button`, "variants.density", "info"],
      ["component.variant-added", `${packageName}#component:Button`, "variants.tone.values.loud", "info"],
      ["component.variant-removed", `${packageName}#component:Button`, "variants.shape", "error"],
      ["component.variant-removed", `${packageName}#component:Button`, "variants.size.values.large", "error"],
    ])
    expect(findings.filter(finding => finding.entityId.startsWith(`${packageName}#component:Removed`))).toHaveLength(1)
    expect(findings.every(finding => finding.affectedConsumers.length === 0)).toBe(true)
    expect(findings.find(finding => finding.code === "component.default-changed")).toMatchObject({
      before: "small",
      after: "large",
    })
  })

  it("treats enum domain values as a set and default-object key order as irrelevant", () => {
    const baseline = manifest({
      tokens: [token({ name: "size.control", domain: { kind: "enum", values: ["small", "large"] } })],
      components: [component({ name: "Button", defaults: { size: "small", tone: "quiet" } })],
    })
    const current = manifest({ version: "1.3.0",
      tokens: [token({ name: "size.control", domain: { kind: "enum", values: ["large", "small"] } })],
      components: [component({ name: "Button", defaults: { tone: "quiet", size: "small" } })],
    })

    expect(compareManifestContracts(baseline, current).findings).toEqual([])
  })

  it("ignores manifest record and set-array order when computing findings", () => {
    const baseline = manifest({
      tokens: [token({ name: "color.removed" }), token({ name: "color.kept" })],
      components: [component({ name: "Button", slots: ["root", "icon"], variants: { size: ["small", "large"] } })],
    })
    const current = manifest({ version: "1.3.0",
      tokens: [token({ name: "color.added" }), token({ name: "color.kept" })].reverse(),
      components: [component({ name: "Button", slots: ["root", "label"], variants: { size: ["small"] } })],
    })
    const permutedBaseline = { ...baseline, tokens: [...baseline.tokens].reverse(), components: [...baseline.components].reverse() }
    const permutedCurrent = { ...current, tokens: [...current.tokens].reverse(), components: [...current.components].reverse() }

    expect(compareManifestContracts(baseline, current)).toEqual(compareManifestContracts(permutedBaseline, permutedCurrent))
  })

  it("rejects different provider package names and unsupported manifest versions", () => {
    const valid = manifest({})
    expect(() => compareManifestContracts(valid, manifest({ name: "@acme/other" }))).toThrow(/package.*name|name.*package/i)
    expect(() => compareManifestContracts(valid, { ...valid, schemaVersion: 2 })).toThrow(/schemaVersion|version/i)
  })

  it("attaches direct consumer references to removed and changed token findings", () => {
    const removed = `${packageName}#token:color.removed`
    const changed = `${packageName}#token:color.changed`
    const baseline = manifest({ tokens: [token({ name: "color.removed" }), token({ name: "color.changed" })] })
    const current = manifest({ version: "1.3.0", tokens: [token({ name: "color.changed", domain: { kind: "length", allowNegative: false } })] })
    const consumer = externalConsumer([removed, changed])

    const report = compareManifests({ baseline, current, consumers: [consumer] })
    expect(report.mode).toBe("compare")
    expect(report.findings.find(finding => finding.entityId === removed)?.affectedConsumers[0]).toMatchObject({
      package: { name: "@acme/app", version: "2.0.0" },
      dependency: { to: removed, kind: "style-token", origin: { property: "color" } },
    })
    expect(report.findings.find(finding => finding.entityId === changed)?.affectedConsumers[0]?.dependency.to).toBe(changed)
    expect(report.analysisLimits.map(limit => limit.code)).toContain("explicit-coverage")
    expect(report.analysisLimits.map(limit => limit.code)).toContain("component-use-unavailable")
    expect(report.analysisLimits.map(limit => limit.code)).not.toContain("consumer-manifests-not-supplied")
  })

  it("does not attribute unresolved or unrelated edges and reports the analysis limits in both modes", () => {
    const removed = `${packageName}#token:color.removed`
    const baseline = manifest({ tokens: [token({ name: "color.removed" })] })
    const current = manifest({ version: "1.3.0" })
    const consumer = externalConsumer(["@acme/other#token:color.unrelated"], true)
    const compared = compareManifests({ baseline, current, consumers: [consumer] })
    const removedFinding = compared.findings.find(finding => finding.entityId === removed)!
    expect(removedFinding.affectedConsumers).toEqual([])
    expect(compared.analysisLimits.map(limit => limit.code)).toContain("unresolved-references")

    const checked = checkManifestConsumers({ current, consumers: [consumer] })
    expect(checked.mode).toBe("check")
    expect(checked.analysisLimits.map(limit => limit.code)).toContain("explicit-coverage")
    expect(checked.analysisLimits.map(limit => limit.code)).toContain("unresolved-references")
    expect(checked.analysisLimits.map(limit => limit.code)).not.toContain("consumer-manifests-not-supplied")
    expect(compareManifests({ baseline, current }).analysisLimits.map(limit => limit.code)).toContain("consumer-manifests-not-supplied")
  })

  it("reports private-token findings in compare mode and never fabricates component-use attribution", () => {
    const privateId = `${packageName}#token:color.private`
    const baseline = manifest({
      tokens: [token({ name: "color.private" })],
      components: [component({ name: "Card", slots: ["root", "icon"] })],
    })
    const current = manifest({ version: "1.3.0",
      tokens: [token({ name: "color.private", visibility: "private" })],
      components: [component({ name: "Card", slots: ["root"] })],
    })
    const cardId = `${packageName}#component:Card`
    const consumer = externalConsumer([privateId, cardId])
    const report = compareManifests({ baseline, current, consumers: [consumer] })

    expect(report.findings.find(finding => finding.code === "token.visibility-reduced")?.affectedConsumers[0]?.dependency.to).toBe(privateId)
    expect(report.findings.find(finding => finding.code === "consumer.private-token-dependency")?.entityId).toBe(privateId)
    expect(report.findings.find(finding => finding.code === "component.slot-removed")?.affectedConsumers).toEqual([])
    expect(report.analysisLimits.map(limit => limit.code)).toContain("component-use-unavailable")
  })
})
