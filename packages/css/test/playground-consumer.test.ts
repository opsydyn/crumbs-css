import { describe, expect, it } from "bun:test"
import { mkdtemp, readFile, rm, access, mkdir, writeFile, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { identity, installedManifest, packageName, parseArgs, stage } from "../../../scripts/playground"

describe("isolated Expo consumer", () => {
  it("rejects ambiguous modes and unknown flags before installation", () => {
    expect(() => parseArgs(["unknown"])).toThrow("Unknown mode")
    expect(() => parseArgs(["packed", "--version=latest"])).toThrow("only valid")
    expect(() => parseArgs(["published", "--version=latest;pwd"])).toThrow("Unknown option")
    expect(parseArgs(["published", "--version=0.1.2-alpha.2", "--check"]).version).toBe("0.1.2-alpha.2")
    expect(parseArgs(["published"]).version).toBe("alpha")
  })

  it("replaces only the Crumbs dependency and rejects links", () => {
    const manifest = { dependencies: { [packageName]: "workspace:*", react: "19.2.5" } }
    const expected = { [packageName]: "0.1.2-alpha.2", react: "19.2.5" }
    expect(installedManifest(manifest, "0.1.2-alpha.2").dependencies).toEqual(expected)
    expect(manifest.dependencies[packageName]).toBe("workspace:*")
    expect(() => installedManifest(manifest, "workspace:*")).toThrow("cannot use")
  })

  it("copies a standalone app without workspace dependencies or build state", async () => {
    const parent = await mkdtemp(join(tmpdir(), "crumbs-stage-test-"))
    try {
      const directory = await stage("0.1.2-alpha.2", parent)
      const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"))
      expect(manifest.dependencies[packageName]).toBe("0.1.2-alpha.2")
      expect(Object.values(manifest.dependencies).some(value => String(value).startsWith("workspace:"))).toBe(false)
      await access(join(directory, "src/screen.css.ts"))
      for (const name of ["node_modules", ".expo", "dist", ".env.local"]) await expect(access(join(directory, name))).rejects.toThrow()
    } finally { await rm(parent, { recursive: true, force: true }) }
  })

  it("verifies actual installed metadata and rejects an external package link", async () => {
    const parent = await mkdtemp(join(tmpdir(), "crumbs-identity-test-"))
    try {
      const consumer = join(parent, "consumer")
      const installed = join(consumer, "node_modules/@opsydyn/crumbs-css")
      await mkdir(join(installed, "dist"), { recursive: true })
      await writeFile(join(installed, "package.json"), JSON.stringify({ name: packageName, version: "1.2.3", exports: { "./theme": "./dist/theme.cjs" } }))
      await writeFile(join(installed, "dist/theme.cjs"), "module.exports = {}")
      expect((await identity(consumer, "packed", "1.2.3")).version).toBe("1.2.3")
      await expect(identity(consumer, "packed", "1.2.4")).rejects.toThrow("does not match")
      const escaped = join(parent, "escaped")
      await mkdir(join(escaped, "node_modules/@opsydyn"), { recursive: true })
      await symlink(installed, join(escaped, "node_modules/@opsydyn/crumbs-css"))
      await expect(identity(escaped, "packed", "1.2.3")).rejects.toThrow("escaped")
    } finally { await rm(parent, { recursive: true, force: true }) }
  })
})
