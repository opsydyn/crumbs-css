import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createDeterministicManifestEvidence } from "../../../scripts/m9-1-manifest-qualification"

describe("M9.1 manifest qualification evidence", () => {
  it("links the checked-in design-system fixture to deterministic bytes across reordered roots and absolute roots", async () => {
    const evidence = await createDeterministicManifestEvidence()

    expect(evidence.manifest.format).toBe("crumbs.design-system-manifest")
    expect(evidence.manifest.schemaVersion).toBe(1)
    expect(evidence.manifest.tokens.some(token => token.kind === "alias")).toBe(true)
    expect(evidence.manifest.components).toHaveLength(1)
    expect(evidence.manifest.components[0]?.lifecycle?.deprecatedSince).toBe("2.0.0")
    expect(evidence.manifest.components[0]?.stateConstraints.length).toBeGreaterThan(0)
    expect(evidence.manifest.components[0]?.defaults).toEqual({ availability: "enabled", tone: "primary" })
    expect(evidence.manifest.modules).toHaveLength(1)
    expect(evidence.manifest.coverage.unresolved.length).toBeGreaterThan(0)
    expect(evidence.manifest.capabilities.every(item => item.evidence === "compiler-observed")).toBe(true)
    expect(evidence.determinism).toEqual({
      absoluteRootCount: 2,
      byteIdentical: true,
      digestIdentical: true,
      rootsReordered: true,
    })
    expect(evidence.sourceRootCounts).toEqual({
      absolutePackageRoots: 2,
      tokenContractsLoaded: 4,
      componentRecipesLoaded: 2,
      styleModulesCompiled: 2,
    })
    expect(evidence.canonicalManifestSha256).toBe(
      createHash("sha256").update(evidence.canonicalManifest, "utf8").digest("hex"),
    )
    expect(evidence.fixtureSha256).toHaveLength(5)
    for (const fixture of evidence.fixtureSha256) {
      const source = readFileSync(resolve(import.meta.dir, "../", fixture.path))
      expect(createHash("sha256").update(source).digest("hex")).toBe(fixture.sha256)
    }
    expect(JSON.stringify(evidence)).not.toContain(process.cwd())
    expect(JSON.stringify(evidence)).not.toContain("/tmp/")
  })

  it("records descriptor origins relative to the owning fixture package", async () => {
    const evidence = await createDeterministicManifestEvidence()
    expect([...new Set(evidence.manifest.tokens.map(token => token.origin.path))].sort()).toEqual([
      "tokens-supplement.ts",
      "tokens.ts",
    ])
    expect(evidence.manifest.components[0]?.origin.path).toBe("components.ts")
    expect(evidence.manifest.modules[0]?.origin.path).toBe("styles.css.ts")
  })
})
