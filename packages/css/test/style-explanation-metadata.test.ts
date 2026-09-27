import { describe, expect, it } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { runInNewContext } from "node:vm"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { createNativeStyleExplanationMetadata } from "../src/compiler/style-explanation-metadata"

const packageRoot = path.resolve(import.meta.dir, "..")
const fixturePath = path.join(packageRoot, "fixtures/m9-3-style-explanations.css.ts")

function evaluateModule(code: string): Record<string, unknown> {
  const exports: Record<string, unknown> = Object.create(null)
  runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), {
    exports,
    StyleSheet: { create: (styles: unknown) => styles },
  })
  return exports
}

describe("M9.3 compiler style explanation metadata", () => {
  it("captures source-ordered composed candidates, alias provenance, tokens, and package-relative identities", async () => {
    const source = readFileSync(fixturePath, "utf8")
    const code = await transformCssTsToStyleSheet(fixturePath, packageRoot, { dev: true, useStyleSheet: false })
    const module = evaluateModule(code)
    const metadata = module.__crumbsDev as {
      readonly $$type: string
      readonly version: number
      readonly moduleId: string
      readonly exports: ReadonlyArray<{
        readonly path: ReadonlyArray<string | number>
        readonly candidates: ReadonlyArray<{
          readonly sourceId: string
          readonly packageOwner: string
          readonly logicalPath: ReadonlyArray<string | number>
          readonly authoredProperty: string
          readonly canonicalProperty: string
          readonly shorthandExpansionPath: ReadonlyArray<string>
          readonly order: number
          readonly value: unknown
        }>
        readonly tokenDependencies: ReadonlyArray<string>
        readonly coverage: { readonly status: string; readonly reasons: ReadonlyArray<string> }
      }>
    }

    expect(metadata.$$type).toBe("crumbs.css.style-explanation-metadata")
    expect(metadata.version).toBe(1)
    expect(metadata.moduleId).toBe("@opsydyn/crumbs-css#fixtures/m9-3-style-explanations.css.ts")
    const card = metadata.exports.find(entry => JSON.stringify(entry.path) === JSON.stringify(["card"]))!
    const opacity = card.candidates.filter(candidate => candidate.canonicalProperty === "opacity")
    expect(opacity.map(candidate => candidate.value)).toEqual([0.25, 0.8])
    expect(opacity.map(candidate => candidate.order)).toEqual([0, 3])
    expect(opacity.every(candidate => candidate.packageOwner.length > 0)).toBe(true)
    expect(opacity.every(candidate => candidate.sourceId === "fixtures/m9-3-style-explanations.css.ts")).toBe(true)

    const horizontalPadding = card.candidates.filter(candidate => candidate.authoredProperty === "paddingHorizontal")
    expect(horizontalPadding.map(candidate => candidate.canonicalProperty)).toEqual(["paddingLeft", "paddingRight"])
    expect(horizontalPadding.map(candidate => candidate.shorthandExpansionPath)).toEqual([
      ["paddingHorizontal", "paddingLeft"], ["paddingHorizontal", "paddingRight"],
    ])
    expect(card.tokenDependencies).toEqual(["--crumbs-space-small"])
    expect(card.coverage).toEqual({ status: "complete", reasons: [] })
    expect(JSON.stringify(metadata)).not.toContain(packageRoot)
    expect(source).toContain("viewStyle([base, override])")
    expect(() => createNativeStyleExplanationMetadata({
      moduleId: "/absolute/file.css.ts",
      exportMap: new Map(),
      classStyles: new Map(),
      classCandidates: new Map(),
      dependencyPlan: { $$type: "crumbs.css.theme-dependency-plan", version: 1, entries: [] },
    })).toThrow()
  })

  it("marks compatibility-only output partial without manufacturing declarations", () => {
    const metadata = createNativeStyleExplanationMetadata({
      moduleId: "@acme/ui#src/legacy.css.ts",
      exportMap: new Map([[
        "legacy",
        { $$type: "crumbs.css.class", className: "legacy-class" },
      ]]),
      classStyles: new Map([["legacy-class", { opacity: 0.5 }]]),
      classCandidates: new Map(),
      dependencyPlan: { $$type: "crumbs.css.theme-dependency-plan", version: 1, entries: [] },
    })

    expect(metadata.exports[0]?.candidates).toEqual([])
    expect(metadata.exports[0]?.coverage).toEqual({ status: "partial", reasons: ["compatibility-only"] })
  })

  it("rejects an authored reserved __crumbsDev export", async () => {
    const temporary = mkdtempSync(path.join(packageRoot, "fixtures/.m9-3-reserved-XXXXXX"))
    const file = path.join(temporary, "reserved.css.ts")
    writeFileSync(file, `export const __crumbsDev = "user value";`)
    try {
      await expect(transformCssTsToStyleSheet(file, packageRoot, { useStyleSheet: false })).rejects.toThrow(/__crumbsDev.*reserved/)
    } finally {
      rmSync(temporary, { recursive: true, force: true })
    }
  })
})
