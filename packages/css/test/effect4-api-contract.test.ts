import { describe, expect, it } from "bun:test"
import { readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import * as Schema from "effect/Schema"
import * as Optic from "effect/Optic"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import fc from "fast-check"

// ADR D3/D4, M1.1: qualify the pinned upstream artifact, not Crumbs payloads.
const packageRoot = path.resolve(import.meta.dir, "..")
const requireFromPackage = createRequire(path.join(packageRoot, "package.json"))
const parseOptions = { onExcessProperty: "error" as const }
const Probe = Schema.Struct({ space: Schema.Struct({ md: Schema.Finite }), label: Schema.String })
const decode = Schema.decodeUnknownSync(Probe, parseOptions)
type ProbeValue = typeof Probe.Type
const spacing = Optic.id<ProbeValue>().key("space").key("md")

describe("pinned Effect 4 API contract", () => {
  it("pins the same exact artifact in package metadata and installation", () => {
    const manifest = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"))
    const installed = requireFromPackage("effect/package.json")
    expect(manifest.dependencies.effect).toBe("4.0.0-rc.115")
    expect(installed.version).toBe(manifest.dependencies.effect)
    expect(installed.type).toBe("module")
    expect(installed.license).toBe("MIT")
    expect(manifest.peerDependencies.effect).toBeUndefined()
  })

  it("keeps Effect types out of the emitted public declaration graph", () => {
    const declarations = readdirSync(path.join(packageRoot, "dist")).filter(file => /\.d\.(?:mts|cts)$/.test(file))
    expect(declarations.length).toBeGreaterThan(0)
    for (const file of declarations) {
      const source = readFileSync(path.join(packageRoot, "dist", file), "utf8")
      expect(source.match(/(?:from\s*|import\s*\()["']effect(?:\/[^"']*)?["']/g)).toBeNull()
    }
  })

  it("requires explicit finite-number and excess-field policies", () => {
    expect(decode({ space: { md: -4.5 }, label: "probe" })).toEqual({ space: { md: -4.5 }, label: "probe" })
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(() => decode({ space: { md: value }, label: "probe" })).toThrow()
    }
    for (const input of [
      { space: { md: 4, unknown: 1 }, label: "probe" },
      { space: { md: 4 }, label: "probe", unknown: 1 },
    ]) {
      const result = Schema.decodeUnknownResult(Probe, parseOptions)(input)
      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) expect(result.failure.issue._tag).toBe("Composite")
    }
    // These upstream defaults are unsuitable as implicit Crumbs admission rules.
    expect(Schema.decodeUnknownSync(Schema.Number)(Infinity)).toBe(Infinity)
    expect(Schema.decodeUnknownSync(Probe)({ space: { md: 4 }, label: "probe", unknown: 1 })).toEqual({ space: { md: 4 }, label: "probe" })
  })

  it("decodes and encodes distinct representations with a service-free Codec", () => {
    const codec: Schema.Codec<number, string, never, never> = Schema.FiniteFromString
    expect(Schema.decodeUnknownSync(codec)("4.5")).toBe(4.5)
    expect(Schema.encodeSync(codec)(4.5)).toBe("4.5")
    for (const input of ["NaN", "Infinity", "-Infinity", "invalid"]) {
      expect(() => Schema.decodeUnknownSync(codec)(input)).toThrow()
    }
    fc.assert(fc.property(fc.integer({ min: -100000, max: 100000 }), value => {
      expect(Schema.decodeUnknownSync(codec)(Schema.encodeSync(codec)(value))).toBe(value)
    }), { seed: 4115, numRuns: 100 })
    // Codec encoding canonicalizes strings; it is not byte-preserving serialization.
    expect(Schema.encodeSync(codec)(Schema.decodeUnknownSync(codec)("04.500"))).toBe("4.5")
  })

  it("derives a JSON-compatible codec for a runtime data type", () => {
    const codec = Schema.toCodecJson(Schema.Option(Schema.Finite))
    const some = Option.some(4.5)
    expect(Schema.encodeSync(codec)(some)).toEqual({ _tag: "Some", value: 4.5 })
    expect(Schema.decodeUnknownSync(codec)({ _tag: "Some", value: 4.5 })).toEqual(some)
    expect(Schema.encodeSync(codec)(Option.none())).toEqual({ _tag: "None" })
    expect(() => Schema.decodeUnknownSync(codec)({ _tag: "Some", value: Infinity })).toThrow()
  })

  it("supports nested immutable focuses and lens laws independently of validation", () => {
    fc.assert(fc.property(fc.integer(), fc.integer(), fc.integer(), (initial, first, last) => {
      const original = Object.freeze({ space: Object.freeze({ md: initial }), label: "probe" })
      const changed = spacing.replace(first, original)
      expect(spacing.get(changed)).toBe(first)
      expect(spacing.replace(spacing.get(original), original)).toEqual(original)
      expect(spacing.replace(last, changed)).toEqual(spacing.replace(last, original))
      expect(original.space.md).toBe(initial)
      expect(changed.label).toBe(original.label)
    }), { seed: 4116, numRuns: 100 })
    const original = decode({ space: { md: 4 }, label: "probe" })
    const invalid = spacing.replace(Infinity, original)
    expect(invalid.space.md).toBe(Infinity)
    expect(() => decode(invalid)).toThrow()
    const derived = Schema.toIso(Probe).key("space").key("md")
    expect(derived.get(original)).toBe(4)
  })

  it("reports missing or inherited record keys without creating a focus", () => {
    const optional = Optic.id<Record<string, number>>().at("md")
    const missing = { other: 2 }
    const inherited: Record<string, number> = Object.create({ md: 4 })
    expect(Result.isFailure(optional.getResult(missing))).toBe(true)
    expect(Result.isFailure(optional.getResult(inherited))).toBe(true)
    expect(Result.isFailure(optional.replaceResult(8, missing))).toBe(true)
    expect(optional.replace(8, missing)).toBe(missing)
    expect(optional.getResult({ md: 4 })).toEqual(Result.succeed(4))
  })

  for (const format of ["esm", "cjs"] as const) {
    it(`executes the exact subpath APIs from Node ${format}`, () => {
      const names = ["Schema", "Optic", "Option"] as const
      const paths = names.map(name => requireFromPackage.resolve(`effect/${name}`))
      const imports = paths.map((file, index) => format === "esm"
        ? `import * as ${names[index]} from ${JSON.stringify(file)};`
        : `const ${names[index]} = require(${JSON.stringify(file)});`).join("\n")
      const script = `${imports}
        const codec = Schema.toCodecJson(Schema.Option(Schema.Finite));
        const value = Schema.decodeUnknownSync(codec)({_tag:'Some',value:4});
        const changed = Optic.id().key('md').replace(8, {md:4});
        if (value.value !== 4 || changed.md !== 8 || Schema.encodeSync(codec)(value).value !== 4) throw Error('Wrong API result');`
      const result = Bun.spawnSync(["node", ...(format === "esm" ? ["--input-type=module"] : []), "-e", script], { stdout: "pipe", stderr: "pipe" })
      expect({ exitCode: result.exitCode, stderr: result.stderr.toString() }).toEqual({ exitCode: 0, stderr: "" })
    })
  }
})
