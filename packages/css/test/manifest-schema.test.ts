import { describe, expect, it } from "bun:test"
import { decodeManifest } from "../src/tooling/manifest/schema"
import { encodeCanonicalManifest } from "../src/tooling/manifest/canonical-json"

const minimalManifest = {
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

const token = {
  id: "@acme/design-system#token:color.canvas",
  contract: { owner: "@acme/design-system", name: "foundation", version: 1 },
  path: ["color", "canvas"],
  visibility: "public",
  domain: { kind: "color" },
  kind: "definition",
  origin: { path: "src/tokens.css.ts", exportPath: "tokens" },
} as const

const aliasToken = {
  ...token,
  id: "@acme/design-system#token:color.surface",
  path: ["color", "surface"],
  kind: "alias",
  alias: {
    targetId: token.id,
    targetPath: ["color", "canvas"],
    resolution: "internal",
    fallback: "#ffffff",
  },
} as const

describe("design-system manifest v1 schema", () => {
  it("accepts a minimal v1 manifest and returns plain JSON data", () => {
    const decoded = decodeManifest(minimalManifest)
    expect(decoded).toEqual(minimalManifest)
    expect(JSON.parse(encodeCanonicalManifest(decoded))).toEqual(minimalManifest)
  })

  it("rejects unsupported schema versions and unknown fields", () => {
    expect(() => decodeManifest({ ...minimalManifest, schemaVersion: 2 })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, surprise: true })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, package: { ...minimalManifest.package, surprise: true } })).toThrow()
  })

  it("validates stable identities and closed token domains", () => {
    expect(() => decodeManifest({ ...minimalManifest, package: { name: "not a package", version: "1.2.3" } })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, tokens: [{ ...token, id: "  " }] })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, tokens: [{ ...token, contract: { ...token.contract, owner: "bad owner" } }] })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, tokens: [{ ...token, domain: { kind: "opacity", allowNegative: true } }] })).toThrow()
  })

  it("accepts Unicode identity and package-relative path segments", () => {
    const unicodeToken = { ...token, id: "@acme/design-system#token:色.背景", path: ["色", "背景"], origin: { path: "src/主题/色.css.ts", exportPath: "tokens.色" } }
    expect(decodeManifest({ ...minimalManifest, tokens: [unicodeToken] }).tokens).toEqual([unicodeToken])
  })

  it("rejects non-JSON values and non-finite numbers", () => {
    expect(() => decodeManifest({ ...minimalManifest, package: { ...minimalManifest.package, version: undefined } })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, package: { ...minimalManifest.package, version: 1n } })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, tokens: [{ ...aliasToken, alias: { ...aliasToken.alias, fallback: Infinity } }] })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, tokens: [{ ...aliasToken, alias: { ...aliasToken.alias, fallback: NaN } }] })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, tokens: [{ ...aliasToken, alias: { ...aliasToken.alias, fallback: -0 } }] })).toThrow()
  })
})
