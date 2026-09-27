import { describe, expect, it } from "bun:test"
import { compareManifestContracts } from "../src/tooling/manifest/comparison"

const packageName = "@acme/design-system"

function manifest(input: {
  readonly name?: string
  readonly version?: string
  readonly tokens?: ReadonlyArray<Record<string, unknown>>
  readonly components?: ReadonlyArray<Record<string, unknown>>
}) {
  const name = input.name ?? packageName
  const tokens = input.tokens ?? []
  const components = input.components ?? []
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
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: {
      roots: [
        ...contractRoots,
        ...components.map(component => ({ kind: "component-recipe", id: component.id as string })),
      ],
      unresolved: [],
    },
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
})
