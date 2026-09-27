import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { encodeCanonicalManifest } from "../src/tooling/manifest/canonical-json"

const emptyManifest = {
  format: "crumbs.design-system-manifest",
  schemaVersion: 1,
  package: { name: "@acme/design-system", version: "1.2.3" },
  producer: {
    compiler: { name: "@opsydyn/crumbs-css", version: "1.2.3" },
    artifact: { name: "crumbs-native-style-artifact", version: 1 },
  },
  tokens: [],
  components: [],
  modules: [],
  dependencies: [],
  capabilities: [],
  coverage: { roots: [], unresolved: [] },
} as const

const stableText = ["color/颜色", "color/δ", "color/é", "color/🎨"] as const

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys)
  if (value === null || typeof value !== "object") return value
  return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reverseObjectKeys(item)]))
}

function token(id: string) {
  const [, ...path] = id.split("/")
  return {
    id: `@acme/design-system#${id}`,
    contract: { owner: "@acme/design-system", name: "foundation", version: 1 },
    path,
    visibility: "public",
    domain: { kind: "color" },
    kind: "definition",
    origin: { path: `src/主题/${path.join("/")}.css.ts`, exportPath: "tokens" },
  }
}

describe("canonical design-system manifest JSON", () => {
  it("emits the same bytes for object-key permutations and set-valued collection permutations", () => {
    fc.assert(fc.property(
      fc.uniqueArray(fc.constantFrom(...stableText), { maxLength: stableText.length }),
      fc.integer(),
      (ids, seed) => {
        const arranged = [...ids].sort((left, right) => ((left.length * 31 + seed) >>> 0) - ((right.length * 31 + seed) >>> 0) || (left < right ? -1 : left > right ? 1 : 0))
        const component = {
          id: "@acme/design-system#component:按钮",
          contract: { owner: "@acme/design-system", name: "button", version: 1 },
          origin: { path: "src/组件/Button.css.ts", exportPath: "Button" },
          slots: ["root", "label"],
          variants: { tone: ["quiet", "loud"], size: ["small", "large"] },
          extensionPoints: ["before", "after"],
          stateConstraints: [{ discriminator: "status", case: "ready", axes: { tone: ["quiet", "loud"] } }],
          defaults: { tone: "quiet", size: "small" },
        }
        const module = { id: "@acme/design-system#src/主题/按钮.css.ts", origin: { path: "src/主题/按钮.css.ts" }, exports: ["Button", "Button.icon"] }
        const first = {
          ...emptyManifest,
          tokens: ids.map(token),
          components: [component],
          modules: [module],
          coverage: { roots: [{ kind: "style-module", id: module.id }, { kind: "component-recipe", id: component.id }, { kind: "token-contract", id: "@acme/design-system#foundation@1" }], unresolved: [] },
        }
        const second = reverseObjectKeys({
          ...emptyManifest,
          tokens: arranged.map(token).reverse(),
          components: [{ ...component, slots: [...component.slots].reverse(), extensionPoints: [...component.extensionPoints].reverse(), variants: { tone: [...component.variants.tone].reverse(), size: [...component.variants.size].reverse() }, stateConstraints: [{ ...component.stateConstraints[0]!, axes: { tone: [...component.stateConstraints[0]!.axes.tone!].reverse() } }] }],
          modules: [{ ...module, exports: [...module.exports].reverse() }],
          coverage: { roots: [{ kind: "token-contract", id: "@acme/design-system#foundation@1" }, { kind: "style-module", id: module.id }, { kind: "component-recipe", id: component.id }], unresolved: [] },
        })
        expect(encodeCanonicalManifest(first)).toBe(encodeCanonicalManifest(second))
      },
    ), { seed: 94027, numRuns: 100 })
  })

  it("preserves Unicode path order with linked package roots", () => {
    const orderedToken = { ...token("color/颜色/background"), path: ["颜色", "背景"] }
    const module = {
      id: "@acme/design-system#src/主题/颜色.css.ts",
      origin: { path: "src/主题/颜色.css.ts" },
      exports: ["tokens.背景", "tokens.前景"],
    }
    const output = encodeCanonicalManifest({
      ...emptyManifest,
      tokens: [orderedToken],
      modules: [module],
      coverage: {
        roots: [
          { kind: "token-contract", id: "@acme/design-system#foundation@1" },
          { kind: "style-module", id: module.id },
        ],
        unresolved: [],
      },
    })
    expect(output.endsWith("\n")).toBe(true)
    expect(output.match(/\n/g)).toHaveLength(1)
    expect(output).toContain("src/主题/颜色.css.ts")
    expect(JSON.parse(output).coverage.roots).toHaveLength(2)
    expect(JSON.parse(output).tokens[0].path).toEqual(["颜色", "背景"])
  })
})
