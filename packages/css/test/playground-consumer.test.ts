import { describe, expect, it } from "bun:test"
import { mkdtemp, readFile, rm, access, mkdir, writeFile, symlink, readdir, realpath } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, dirname, resolve, sep } from "node:path"
import { createRequire } from "node:module"
import ts from "typescript"
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

  it("stages every relative demo import and its explicit runtime factory inside the standalone app", async () => {
    const parent = await mkdtemp(join(tmpdir(), "crumbs-stage-demo-test-"))
    try {
      const directory = await stage("1.0.0", parent)
      const files: string[] = []
      async function visit(folder: string) {
        for (const item of await readdir(folder, { withFileTypes: true })) {
          const path = join(folder, item.name)
          if (item.isDirectory()) await visit(path)
          else if (/\.[jt]sx?$/.test(item.name)) files.push(path)
        }
      }
      await visit(join(directory, "src"))
      const unresolved: string[] = []
      for (const file of files) {
        const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest, true)
        for (const statement of source.statements) {
          if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue
          const module = statement.moduleSpecifier
          if (!module || !ts.isStringLiteral(module) || !module.text.startsWith(".")) continue
          const target = resolve(dirname(file), module.text)
          let resolved: string | undefined
          for (const suffix of ["", ".ts", ".tsx", ".js", ".jsx", ".json", "/index.ts", "/index.tsx"]) {
            try { resolved = await realpath(target + suffix); break } catch {}
          }
          if (!resolved || !resolved.startsWith(directory + sep)) unresolved.push(file + " -> " + module.text)
        }
      }
      expect(unresolved).toEqual([])
      const runtime = createRequire(join(directory, "package.json")).resolve("@crumbs/playground/runtime-extensions")
      expect(await realpath(runtime)).toStartWith(directory + sep)
      await access(runtime)
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
