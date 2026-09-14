import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { NativeStylesDiagnosticCode } from "../src/diagnostics"
import { createThemeTokenReference } from "../src/theme-token"
import {
  contractIdentityCodec, legacyThemeTokenReferenceCodec, themeTokenReferenceCodec,
  nativeDeclarationCodec, nativeArtifactCodec, structuredDiagnosticCodec,
} from "../src/contracts/payloads"

const identity = { owner: "@acme/tokens", name: "foundation", version: 1 } as const
const source = { file: "button.css.ts", exportName: "button", path: ["opacity"] } as const
const token = { _tag: "ThemeTokenReference", contract: identity, varName: "--crumbs-opacity" } as const
const declaration = { _tag: "NativeDeclaration", property: "opacity", value: token, source } as const
const artifact = { _tag: "NativeArtifact", version: 1, contract: identity, declarations: [declaration] } as const
function accepted<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: ReadonlyArray<unknown> }): T {
  expect(result.ok).toBe(true)
  if (!result.ok) throw Error(JSON.stringify(result.issues))
  return result.value
}

describe("internal payload contracts", () => {
  it("round trips each boundary independently without changing the current legacy reference", () => {
    for (const [codec, input] of [
      [contractIdentityCodec, identity], [legacyThemeTokenReferenceCodec, createThemeTokenReference("--crumbs-opacity")],
      [themeTokenReferenceCodec, token], [nativeDeclarationCodec, declaration], [nativeArtifactCodec, artifact],
      [structuredDiagnosticCodec, { _tag: "Diagnostic", code: NativeStylesDiagnosticCode.MissingThemeToken, severity: "error", message: "Missing required token", source }],
    ] as const) {
      const decoded = accepted<unknown>(codec.decode(input))
      expect(decoded).toEqual(input)
      const encoded = accepted(codec.encodeUnknown(decoded))
      expect(JSON.parse(encoded)).toEqual(input)
      expect(accepted<unknown>(codec.decodeJson(encoded))).toEqual(input)
    }
  })

  it("rejects tag/version near misses and mismatched qualified contract identities", () => {
    for (const input of [
      { ...artifact, _tag: "nativeArtifact" }, { ...artifact, version: 0 }, { ...artifact, version: 2 },
      { ...artifact, version: "1" }, { ...artifact, version: undefined },
      ...["owner", "name", "version"].map(field => ({ ...artifact, declarations: [{ ...declaration, value: { ...token, contract: { ...identity, [field]: field === "version" ? 2 : "other" } } }] })),
    ]) expect(nativeArtifactCodec.decode(input).ok).toBe(false)
    expect(legacyThemeTokenReferenceCodec.decode(token).ok).toBe(false)
    expect(themeTokenReferenceCodec.decode(createThemeTokenReference("--crumbs-opacity")).ok).toBe(false)
    const mismatch = nativeArtifactCodec.decode({ ...artifact, contract: { ...identity, name: "other" } })
    expect(mismatch.ok).toBe(false)
    if (!mismatch.ok) expect(mismatch.issues.some(issue => JSON.stringify(issue.path) === JSON.stringify(["declarations", 0, "value", "contract"]))).toBe(true)
  })

  it("rejects unknown own fields at every nested boundary with structured paths", () => {
    const inputs = [
      { ...artifact, unexpected: 1 }, { ...artifact, contract: { ...identity, unexpected: 1 } },
      { ...artifact, declarations: [{ ...declaration, unexpected: 1 }] },
      { ...artifact, declarations: [{ ...declaration, source: { ...source, unexpected: 1 } }] },
      { ...artifact, declarations: [{ ...declaration, value: { ...token, unexpected: 1 } }] },
    ]
    for (const input of inputs) {
      const result = nativeArtifactCodec.decode(input)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.issues.every(issue => issue.boundary === "native-artifact" && issue.code === "CRUMBS_CONTRACT_INVALID_PAYLOAD")).toBe(true)
        expect(result.issues.some(issue => issue.path.includes("unexpected"))).toBe(true)
      }
    }
    const result = nativeArtifactCodec.decode({ ...artifact, declarations: [{ ...declaration, value: Infinity }] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues.some(issue => issue.path.slice(0, 3).join("/") === "declarations/0/value")).toBe(true)
  })

  it("enforces finite JSON numbers, exact optional fields and safe integer metadata", () => {
    for (const value of [NaN, Infinity, -Infinity, -0, null, undefined, 1n]) {
      expect(nativeDeclarationCodec.decode({ ...declaration, value }).ok).toBe(false)
      expect(nativeDeclarationCodec.encodeUnknown({ ...declaration, value }).ok).toBe(false)
    }
    for (const value of [-4.5, 0, 0.5, 1e100, true, "auto"]) expect(accepted(nativeDeclarationCodec.decode({ ...declaration, value })).value).toBe(value)
    for (const version of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(contractIdentityCodec.decode({ ...identity, version }).ok).toBe(false)
    for (const location of [{ line: 0 }, { column: -1 }, { line: 1.5 }, { path: [-1] }, { path: [Infinity] }, { line: undefined }]) {
      expect(nativeDeclarationCodec.decode({ ...declaration, source: { ...source, ...location } }).ok).toBe(false)
    }
    expect(accepted(nativeDeclarationCodec.decode({ ...declaration, source: { ...source, line: 1, column: 2, path: ["transform", 0] } })).source).toEqual({ ...source, line: 1, column: 2, path: ["transform", 0] })
    expect(nativeDeclarationCodec.decodeJson('{"_tag":"NativeDeclaration","property":"opacity","value":1e400,"source":{"file":"x","exportName":"x","path":[]}}').ok).toBe(false)
  })

  it("preserves ordered static transforms and shadow offsets, rejecting malformed structures", () => {
    const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 3, 0, 1]
    const transform = [{ translateX: 4 }, { scale: 2 }, { rotate: "45deg" }, { translateY: "10%" }, { matrix }]
    expect(accepted(nativeDeclarationCodec.decode({ ...declaration, property: "transform", value: transform })).value).toEqual(transform)
    expect(accepted(nativeDeclarationCodec.decode({ ...declaration, property: "shadowOffset", value: { width: 2, height: -3 } })).value).toEqual({ width: 2, height: -3 })
    for (const value of [[{ scale: Infinity }], [{ scale: 1, rotate: "1rad" }], [{ unknown: 1 }], [{ matrix: [1, 2] }], [{ rotate: "4px" }], [{ translateX: "auto" }], [{ rotate: `${"9".repeat(400)}deg` }], [{ translateX: `${"9".repeat(400)}%` }], "none", token]) {
      expect(nativeDeclarationCodec.decode({ ...declaration, property: "transform", value }).ok).toBe(false)
    }
    for (const value of [{ width: 2 }, { width: 2, height: Infinity }, { width: 2, height: -3, extra: 1 }, 4]) expect(nativeDeclarationCodec.decode({ ...declaration, property: "shadowOffset", value }).ok).toBe(false)
    // Shape validation does not replace property-specific native/domain admission.
    expect(nativeDeclarationCodec.decode({ ...declaration, property: "opacity", value: 2 }).ok).toBe(true)
  })

  it("admits only plain descriptor data and does not run getters or toJSON", () => {
    let calls = 0
    const accessor = Object.defineProperty({ ...identity }, "owner", { enumerable: true, get() { calls++; throw Error("EXECUTED") } })
    const toJSON = { ...identity, toJSON() { calls++; throw Error("EXECUTED") } }
    const symbol = { ...identity, [Symbol("extra")]: 1 }
    const hidden = Object.defineProperty({ ...identity }, "hidden", { value: 1 })
    const inherited = Object.assign(Object.create({ inherited: 1 }), identity)
    class Identity { owner = identity.owner; name = identity.name; version = 1 }
    for (const input of [accessor, toJSON, symbol, hidden, inherited, new Identity()]) {
      expect(contractIdentityCodec.decode(input).ok).toBe(false)
      expect(contractIdentityCodec.encodeUnknown(input).ok).toBe(false)
    }
    expect(calls).toBe(0)
    expect(accepted(contractIdentityCodec.decode(Object.assign(Object.create(null), identity)))).toEqual(identity)
    expect(accepted(contractIdentityCodec.decode(Object.freeze({ ...identity })))).toEqual(identity)
    const nested = { ...artifact, declarations: [Object.defineProperty({ ...declaration }, "value", { enumerable: true, get() { calls++; return 1 } })] }
    expect(nativeArtifactCodec.decode(nested).ok).toBe(false)
    expect(calls).toBe(0)
  })

  it("rejects cyclic, sparse, decorated and excessively nested data without changing inputs", () => {
    const cyclic: Record<string, unknown> = { ...artifact }; cyclic.self = cyclic
    const decorated = [declaration]; Object.defineProperty(decorated, "extra", { value: 1, enumerable: true })
    const inputs = [cyclic, { ...artifact, declarations: Array(1) }, { ...artifact, declarations: decorated }]
    for (const input of inputs) expect(nativeArtifactCodec.decode(input).ok).toBe(false)
    let deep: unknown = 1; for (let i = 0; i < 100; i++) deep = { nested: deep }
    expect(nativeArtifactCodec.decode(deep).ok).toBe(false)
    expect(cyclic.self).toBe(cyclic)
    const frozen = Object.freeze({ ...artifact, declarations: Object.freeze([Object.freeze({ ...declaration })]) })
    const decoded = accepted(nativeArtifactCodec.decode(frozen))
    expect(decoded).toEqual(artifact)
    expect(decoded).not.toBe(frozen)
  })

  it("reports invalid JSON and diagnostic payloads as ordinary data results", () => {
    for (const input of ["{", "undefined", undefined, 4, { ...artifact }]) {
      const result = nativeArtifactCodec.decodeJson(input)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.issues[0]?.code).toBe("CRUMBS_CONTRACT_INVALID_JSON")
    }
    for (const input of [
      { _tag: "Diagnostic", code: "UNKNOWN", severity: "error", message: "x" },
      { _tag: "Diagnostic", code: NativeStylesDiagnosticCode.MissingThemeToken, severity: "info", message: "x" },
      { _tag: "Diagnostic", code: NativeStylesDiagnosticCode.MissingThemeToken, severity: "error", message: "" },
    ]) expect(structuredDiagnosticCodec.decode(input).ok).toBe(false)
    for (const input of [{ ...identity, owner: "invalid owner" }, { ...identity, name: " " }]) expect(contractIdentityCodec.decode(input).ok).toBe(false)
    for (const varName of ["--other-opacity", "--crumbs-", "var(--crumbs-opacity)", "--crumbs-opacity extra"]) expect(themeTokenReferenceCodec.decode({ ...token, varName }).ok).toBe(false)
  })

  it("round trips independent ordered artifacts and rejects shrinking invalid mutations", () => {
    const values = fc.oneof(fc.integer({ min: -100000, max: 100000 }), fc.string(), fc.boolean())
    fc.assert(fc.property(fc.array(values, { maxLength: 12 }), fc.integer({ min: 1, max: 1000 }), (literals, version) => {
      const contract = { ...identity, version }
      const declarations = literals.map((value, index) => ({ _tag: "NativeDeclaration" as const, property: "opacity", value, source: { ...source, path: ["styles", index] } }))
      const expected = { _tag: "NativeArtifact", version: 1, contract, declarations } as const
      const json = accepted(nativeArtifactCodec.encodeUnknown(expected))
      expect(JSON.parse(json)).toEqual(expected)
      expect(accepted<unknown>(nativeArtifactCodec.decodeJson(json))).toEqual(expected)
      expect(nativeArtifactCodec.decode({ ...expected, contract: { ...contract, extra: version } }).ok).toBe(false)
      expect(expected.declarations.map(entry => entry.value)).toEqual(literals)
    }), { seed: 4121, numRuns: 150 })
    fc.assert(fc.property(fc.integer({ min: 1, max: 1000 }), version => {
      const own = { ...identity, version }
      const other = { ...own, owner: "@other/tokens" }
      const value = { ...token, contract: other }
      expect(nativeArtifactCodec.decode({ ...artifact, contract: own, declarations: [{ ...declaration, value }] }).ok).toBe(false)
      expect(accepted(themeTokenReferenceCodec.decodeJson(accepted(themeTokenReferenceCodec.encodeUnknown(value))))).toEqual(value)
    }), { seed: 4122, numRuns: 100 })
  })

  it("round trips mixed structured/token artifacts and covers every static transform operation", () => {
    const integer = fc.integer({ min: -1000, max: 1000 })
    const numeric = ["perspective", "scale", "scaleX", "scaleY", "translateX", "translateY"]
    const angular = ["rotate", "rotateX", "rotateY", "rotateZ", "skewX", "skewY"]
    const operations = fc.oneof(
      ...numeric.map(key => integer.map(value => ({ [key]: value }))),
      ...angular.map(key => integer.map(value => ({ [key]: `${value}deg` }))),
      fc.constant({ matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 3, 0, 1] }),
    )
    for (const key of [...numeric, ...angular]) {
      expect(nativeDeclarationCodec.decode({ ...declaration, property: "transform", value: [{ [key]: angular.includes(key) ? ".5rad" : 2 }] }).ok).toBe(true)
    }
    fc.assert(fc.property(fc.array(operations, { maxLength: 8 }), integer, integer, (transforms, width, height) => {
      const expected = { ...artifact, declarations: [declaration,
        { ...declaration, property: "transform", value: transforms },
        { ...declaration, property: "shadowOffset", value: { width, height } },
      ] }
      const json = accepted(nativeArtifactCodec.encodeUnknown(expected))
      expect(JSON.parse(json)).toEqual(expected)
      expect(accepted<unknown>(nativeArtifactCodec.decodeJson(json))).toEqual(expected)
      expect(nativeArtifactCodec.decode({ ...expected, declarations: [...expected.declarations, { ...declaration, property: "shadowOffset", value: { width, height, unknown: true } }] }).ok).toBe(false)
    }), { seed: 4123, numRuns: 100 })
  })
})
