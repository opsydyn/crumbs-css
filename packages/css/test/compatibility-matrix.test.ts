import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const repoRoot = resolve(import.meta.dir, "../../..")
const packageMatrix = readFileSync(resolve(repoRoot, "packages/css/COMPATIBILITY.md"), "utf8")
  .replaceAll("`", "")
const publicReference = readFileSync(
  resolve(repoRoot, "docs/src/content/docs/reference/compatibility.mdx"),
  "utf8",
)
const playgroundReadme = readFileSync(resolve(repoRoot, "apps/playground/README.md"), "utf8")

describe("M8.2 compiler, artifact, and runtime compatibility policy", () => {
  it("publishes the exact qualified package and host row", () => {
    for (const value of [
      "@opsydyn/crumbs-css@0.1.1-alpha.1",
      "@acme/design-tokens@1.0.0",
      "@acme/ui@1.0.0",
      "Expo",
      "56.0.4",
      "React",
      "19.2.5",
      "React Native",
      "0.85.3",
      "iOS",
      "web",
      "Qualified",
      "docs/evidence/2026-09-26-m8-2-compatibility-matrix/qualification.json",
    ]) {
      expect(packageMatrix).toContain(value)
    }
  })

  it("classifies public artifact versions and keeps internal formats out of the package ABI", () => {
    for (const value of [
      "Component recipe",
      "v1–v3",
      "recipe v4",
      "extension v1",
      "extension v2",
      "Sprinkles v1",
      "Sprinkles v2",
      "native-module metadata v2",
      "theme dependency plan v1",
      "theme dependency plan v2",
      "external token-theme payload v1",
      "external token-theme payload v2",
      "NativeArtifact v1",
      "Native IR v1",
    ]) {
      expect(packageMatrix).toContain(value)
    }
    for (const state of ["Qualified", "Runtime-supported", "Rejected", "Unqualified"]) {
      expect(packageMatrix).toContain(state)
    }
    expect(packageMatrix).toContain("Internal-only compiler contracts")
    expect(packageMatrix).toContain("excluded from published package compatibility claims")
    expect(packageMatrix).toContain("not consumer-facing artifact ABIs")
  })

  it("links the public reference and documents the separate M8.2 command and receipt", () => {
    expect(publicReference).toContain("packages/css/COMPATIBILITY.md")
    expect(playgroundReadme).toContain("bun run playground:distribution --m8-2-check")
    expect(playgroundReadme).toContain(
      "docs/evidence/2026-09-26-m8-2-compatibility-matrix/qualification.json",
    )
    expect(playgroundReadme).toContain("M8.1")
    expect(playgroundReadme).toContain("Android")
    expect(playgroundReadme).toContain("device")
  })

  it("publishes the M8.3 runtime-resolution policy as pending until its receipt exists", () => {
    for (const value of [
      "M8.3 runtime-resolution qualification",
      "Pending qualification",
      "tokens/schema/value",
      "tokens/schema",
      "Effect 4",
      "implementation dependency",
      "22.0.0",
      "56.0.4",
      "19.2.5",
      "0.85.3",
      "iOS and web",
      "Android export",
      "device acceptance",
      "publishing",
      "external-token-theme",
      "docs/evidence/2026-09-26-m8-3-runtime-resolution/qualification.json",
    ]) {
      expect(packageMatrix).toContain(value)
    }
    expect(playgroundReadme).toContain("bun run playground:distribution --m8-3-check")
    expect(playgroundReadme).toContain("docs/evidence/2026-09-26-m8-3-runtime-resolution/qualification.json")
    expect(publicReference).toContain("M8.3")
    expect(publicReference).toContain("Pending qualification")
  })
})
