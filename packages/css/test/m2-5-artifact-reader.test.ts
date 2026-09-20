import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  makeNativeArtifactReader,
  nativeArtifactReader,
} from "../src/contracts/versioned-reader"
import { nativeArtifactCodec, type NativeArtifact } from "../src/contracts/payloads"

const identity = { owner: "@acme/tokens", name: "foundation", version: 1 } as const
const source = { file: "button.css.ts", exportName: "button", path: ["styles"] } as const
const declaration = { _tag: "NativeDeclaration", property: "opacity", value: 0.5, source } as const
const artifact = { _tag: "NativeArtifact", version: 1, contract: identity, declarations: [declaration] } as const

function accepted<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: ReadonlyArray<unknown> }): T {
  expect(result.ok).toBe(true)
  if (!result.ok) throw Error(JSON.stringify(result.issues))
  return result.value
}

describe("M2.5 versioned artifact reader", () => {
  it("encodes the wire version and reads the compatible v1 artifact", () => {
    const encoded = accepted(nativeArtifactReader.encode(artifact))
    expect(JSON.parse(encoded)).toEqual(artifact)
    expect(accepted<NativeArtifact>(nativeArtifactReader.decodeJson(encoded))).toEqual(artifact)
  })

  it("reports an unsupported version before schema admission", () => {
    const result = nativeArtifactReader.decode({ ...artifact, version: 2 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues).toEqual([{
        code: "CRUMBS_CONTRACT_UNSUPPORTED_VERSION",
        boundary: "native-artifact-reader",
        path: ["version"],
        message: "Unsupported native-artifact version 2; supported versions: 1",
      }])
    }
    expect(nativeArtifactCodec.decode({ ...artifact, version: 2 }).ok).toBe(false)
    const encodedFuture = nativeArtifactReader.decodeJson(JSON.stringify({ ...artifact, version: 2 }))
    expect(encodedFuture.ok).toBe(false)
    if (!encodedFuture.ok) expect(encodedFuture.issues[0]?.code).toBe("CRUMBS_CONTRACT_UNSUPPORTED_VERSION")
  })

  it("models an incompatible reader without changing the artifact codec", () => {
    const incompatible = makeNativeArtifactReader([])
    const decoded = incompatible.decode(artifact)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.issues[0]?.code).toBe("CRUMBS_CONTRACT_UNSUPPORTED_VERSION")
    const encoded = nativeArtifactCodec.encode(artifact)
    expect(encoded.ok).toBe(true)
  })

  it("keeps codec laws within the admitted version and preserves authored order", () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 8 }),
      values => {
        const expected: NativeArtifact = {
          _tag: "NativeArtifact",
          version: 1,
          contract: identity,
          declarations: values.map((value, index) => ({
            _tag: "NativeDeclaration",
            property: "opacity",
            value,
            source: { ...source, path: ["styles", index] },
          })),
        }
        const encoded = accepted(nativeArtifactReader.encode(expected))
        expect(accepted<NativeArtifact>(nativeArtifactReader.decodeJson(encoded))).toEqual(expected)
      },
    ), { seed: 4251, numRuns: 100 })
  })

  it("keeps JSON syntax errors at the reader boundary", () => {
    const result = nativeArtifactReader.decodeJson("{")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.issues[0]).toEqual({
        code: "CRUMBS_CONTRACT_INVALID_JSON",
        boundary: "native-artifact-reader",
        path: [],
        message: "Invalid JSON text",
      })
    }
  })

  it("does not execute an accessor while probing a version", () => {
    let calls = 0
    const input = { ...artifact }
    Object.defineProperty(input, "version", { enumerable: true, get() { calls++; throw Error("EXECUTED") } })
    expect(nativeArtifactReader.decode(input).ok).toBe(false)
    expect(calls).toBe(0)
  })
})
