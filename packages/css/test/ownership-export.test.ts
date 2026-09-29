import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")
const require = createRequire(import.meta.url)
const expectedRuntimeExports = [
  "DESIGN_SYSTEM_OWNED_REPORT_FORMAT",
  "DESIGN_SYSTEM_OWNED_REPORT_VERSION",
  "DESIGN_SYSTEM_OWNERSHIP_FORMAT",
  "DESIGN_SYSTEM_OWNERSHIP_VERSION",
  "OWNERSHIP_ANALYSIS_LIMIT_CODES",
  "OWNERSHIP_MAX_REPORT_REFERENCES",
  "OWNERSHIP_UNRESOLVED_REASON_CODES",
  "annotateDesignSystemReport",
  "decodeDesignSystemOwnership",
  "decodeOwnedReport",
  "encodeCanonicalOwnedReport",
].sort()

describe("isolated ownership tooling export", () => {
  it("resolves the ESM and CommonJS build targets and their declaration companions", async () => {
    const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
      readonly exports: Record<string, { readonly types: string; readonly import: string; readonly require: string }>
    }
    const entry = packageJson.exports["./tooling/ownership"]

    expect(entry).toEqual({
      types: "./dist/tooling-ownership.d.mts",
      import: "./dist/tooling-ownership.mjs",
      require: "./dist/tooling-ownership.cjs",
    })
    expect(existsSync(resolve(packageRoot, entry!.import))).toBe(true)
    expect(existsSync(resolve(packageRoot, entry!.require))).toBe(true)
    expect(existsSync(resolve(packageRoot, entry!.types))).toBe(true)
    expect(existsSync(resolve(packageRoot, "dist/tooling-ownership.d.cts"))).toBe(true)
  })

  it("loads the exact narrow ESM and CommonJS API", async () => {
    let esm: Record<string, unknown> | undefined
    let commonJs: Record<string, unknown> | undefined
    const esmEntry = "../dist/tooling-ownership.mjs"
    try {
      esm = await import(esmEntry) as Record<string, unknown>
    } catch {
      esm = undefined
    }
    try {
      commonJs = require("../dist/tooling-ownership.cjs") as Record<string, unknown>
    } catch {
      commonJs = undefined
    }

    expect(Object.keys(esm ?? {}).sort()).toEqual(expectedRuntimeExports)
    expect(Object.keys(commonJs ?? {}).sort()).toEqual(expectedRuntimeExports)
  })
})
