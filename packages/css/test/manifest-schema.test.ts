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

const tokenContractRoot = { kind: "token-contract", id: "@acme/design-system#foundation@1" } as const

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
    expect(decodeManifest({ ...minimalManifest, tokens: [unicodeToken], coverage: { roots: [tokenContractRoot], unresolved: [] } }).tokens).toEqual([unicodeToken])
  })

  it("rejects non-JSON values and non-finite numbers", () => {
    expect(() => decodeManifest({ ...minimalManifest, package: { ...minimalManifest.package, version: undefined } })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, package: { ...minimalManifest.package, version: 1n } })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, tokens: [{ ...aliasToken, alias: { ...aliasToken.alias, fallback: Infinity } }] })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, tokens: [{ ...aliasToken, alias: { ...aliasToken.alias, fallback: NaN } }] })).toThrow()
    expect(() => decodeManifest({ ...minimalManifest, tokens: [{ ...aliasToken, alias: { ...aliasToken.alias, fallback: -0 } }] })).toThrow()
  })

  it("rejects missing or contradictory internal references in aliases and dependencies", () => {
    const validAliasGraph = {
      ...minimalManifest,
      tokens: [token, aliasToken],
      dependencies: [{ from: aliasToken.id, to: token.id, kind: "token-alias", resolution: "internal" }],
      coverage: { roots: [tokenContractRoot], unresolved: [] },
    } as const
    expect(decodeManifest(validAliasGraph).dependencies).toEqual(validAliasGraph.dependencies)

    const danglingAlias = { ...minimalManifest, tokens: [aliasToken], coverage: { roots: [tokenContractRoot], unresolved: [] } }
    expect(() => decodeManifest(danglingAlias)).toThrow(/alias.*internal.*target|internal.*alias.*target/i)
    expect(() => encodeCanonicalManifest(danglingAlias)).toThrow(/alias.*internal.*target|internal.*alias.*target/i)

    const danglingInternalEdge = {
      ...minimalManifest,
      tokens: [token],
      dependencies: [{ from: "@acme/design-system#missing", to: token.id, kind: "token-alias", resolution: "internal" }],
      coverage: { roots: [tokenContractRoot], unresolved: [] },
    }
    expect(() => decodeManifest(danglingInternalEdge)).toThrow(/dependency.*source|source.*dependency/i)

    const missingTargetEdge = {
      ...minimalManifest,
      tokens: [token, aliasToken],
      dependencies: [{ from: aliasToken.id, to: "@acme/design-system#missing", kind: "token-alias", resolution: "internal" }],
      coverage: { roots: [tokenContractRoot], unresolved: [] },
    }
    expect(() => decodeManifest(missingTargetEdge)).toThrow(/dependency.*target|target.*dependency/i)

    const contradictoryUnresolvedEdge = {
      ...minimalManifest,
      dependencies: [{ from: "styles.css.ts", to: token.id, kind: "style-token", resolution: "unresolved" }],
    }
    expect(() => decodeManifest(contradictoryUnresolvedEdge)).toThrow(/unresolved.*target|target.*unresolved/i)
  })

  it("rejects cycles in internally resolved token aliases", () => {
    const firstAlias = {
      ...aliasToken,
      id: "@acme/design-system#token:color.first",
      path: ["color", "first"],
      alias: { targetId: "@acme/design-system#token:color.second", targetPath: ["color", "second"], resolution: "internal" },
    }
    const secondAlias = {
      ...aliasToken,
      id: "@acme/design-system#token:color.second",
      path: ["color", "second"],
      alias: { targetId: firstAlias.id, targetPath: ["color", "first"], resolution: "internal" },
    }
    expect(() => decodeManifest({
      ...minimalManifest,
      tokens: [firstAlias, secondAlias],
      dependencies: [
        { from: firstAlias.id, to: secondAlias.id, kind: "token-alias", resolution: "internal" },
        { from: secondAlias.id, to: firstAlias.id, kind: "token-alias", resolution: "internal" },
      ],
      coverage: { roots: [tokenContractRoot], unresolved: [] },
    })).toThrow(/alias.*cycle|cycle.*alias/i)
  })

  it("requires internal alias paths to agree with their target identity", () => {
    const contradictoryAlias = {
      ...aliasToken,
      alias: { ...aliasToken.alias, targetPath: ["color", "surface"] },
    }
    expect(() => decodeManifest({
      ...minimalManifest,
      tokens: [token, contradictoryAlias],
      dependencies: [{ from: contradictoryAlias.id, to: token.id, kind: "token-alias", resolution: "internal" }],
      coverage: { roots: [tokenContractRoot], unresolved: [] },
    })).toThrow(/alias.*path|path.*alias/i)
  })

  it("requires declared lifecycle replacements to resolve in the manifest", () => {
    const deprecatedToken = {
      ...token,
      lifecycle: {
        deprecatedSince: "2.0.0",
        replacement: { id: "@acme/design-system#token:color.missing", resolution: "declared" },
      },
    }
    expect(() => decodeManifest({ ...minimalManifest, tokens: [deprecatedToken], coverage: { roots: [tokenContractRoot], unresolved: [] } })).toThrow(/replacement.*declared|declared.*replacement/i)
  })

  it("requires compiler source origin for style-token dependencies", () => {
    const module = {
      id: "@acme/design-system#src/styles.css.ts",
      origin: { path: "src/styles.css.ts" },
      exports: ["card"],
    }
    const dependency = {
      from: module.id,
      to: token.id,
      kind: "style-token",
      resolution: "internal",
    } as const
    expect(() => decodeManifest({
      ...minimalManifest,
      tokens: [token],
      modules: [module],
      dependencies: [dependency],
      coverage: { roots: [tokenContractRoot, { kind: "style-module", id: module.id }], unresolved: [] },
    })).toThrow(/style-token dependency.*origin|origin.*style-token dependency/i)

    const withOrigin = {
      ...minimalManifest,
      tokens: [token],
      modules: [module],
      dependencies: [{ ...dependency, origin: { moduleId: module.id, exportPath: "card", property: "color" } }],
      coverage: { roots: [tokenContractRoot, { kind: "style-module", id: module.id }], unresolved: [] },
    } as const
    expect(decodeManifest(withOrigin).dependencies).toEqual(withOrigin.dependencies)
  })

  it("keeps explicit coverage roots and package-relative module identities aligned with records", () => {
    const emptyContract = { ...minimalManifest, coverage: { roots: [tokenContractRoot], unresolved: [] } }
    expect(decodeManifest(emptyContract).coverage.roots).toEqual([tokenContractRoot])
    expect(() => decodeManifest({
      ...minimalManifest,
      coverage: { roots: [{ kind: "token-contract", id: "foundation" }], unresolved: [] },
    })).toThrow(/token.contract.*coverage|coverage.*token.contract/i)

    const tokenOnly = {
      ...minimalManifest,
      tokens: [token],
      coverage: { roots: [tokenContractRoot], unresolved: [] },
    }
    expect(decodeManifest(tokenOnly).tokens).toEqual([token])
    expect(() => decodeManifest({ ...tokenOnly, coverage: { roots: [], unresolved: [] } })).toThrow(/coverage.*token|token.*coverage/i)

    const module = {
      id: "@acme/design-system#src/styles.css.ts",
      origin: { path: "src/styles.css.ts" },
      exports: ["card"],
    }
    const moduleRoot = { kind: "style-module", id: module.id }
    const moduleOnly = { ...minimalManifest, modules: [module], coverage: { roots: [moduleRoot], unresolved: [] } }
    expect(decodeManifest(moduleOnly).modules).toEqual([module])
    expect(() => decodeManifest({ ...moduleOnly, coverage: { roots: [], unresolved: [] } })).toThrow(/coverage.*style.module|style.module.*coverage/i)
    expect(() => decodeManifest({
      ...minimalManifest,
      coverage: { roots: [{ kind: "style-module", id: "@acme/design-system#missing.css.ts" }], unresolved: [] },
    })).toThrow(/coverage.*root|root.*coverage/i)
    expect(() => decodeManifest({
      ...minimalManifest,
      modules: [{ ...module, id: "@acme/design-system#other.css.ts" }],
      coverage: { roots: [{ kind: "style-module", id: "@acme/design-system#other.css.ts" }], unresolved: [] },
    })).toThrow(/module.*identity|identity.*module/i)

    const component = {
      id: "@acme/design-system#component:card",
      contract: { owner: "@acme/design-system", name: "Card", version: 1 },
      origin: { path: "src/Card.css.ts", exportPath: "Card" },
      slots: ["root"],
      variants: {},
      extensionPoints: [],
      stateConstraints: [],
      defaults: {},
    }
    const componentRoot = { kind: "component-recipe", id: component.id }
    const componentOnly = { ...minimalManifest, components: [component], coverage: { roots: [componentRoot], unresolved: [] } }
    expect(decodeManifest(componentOnly).components).toEqual([component])
    expect(() => decodeManifest({ ...componentOnly, coverage: { roots: [], unresolved: [] } })).toThrow(/coverage.*component|component.*coverage/i)
    expect(() => decodeManifest({
      ...minimalManifest,
      coverage: { roots: [{ kind: "component-recipe", id: "@acme/design-system#component:missing" }], unresolved: [] },
    })).toThrow(/coverage.*root|root.*coverage/i)
  })
})
