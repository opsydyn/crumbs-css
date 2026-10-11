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
    expect(parseArgs(["packed", "--sdk=56", "--check"]).sdk56).toBe(true)
    expect(() => parseArgs(["workspace", "--sdk=56"])).toThrow("installed modes")
    expect(() => parseArgs(["packed", "--sdk=58"])).toThrow("Unknown option")
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

  it("retains a standalone SDK 56 regression consumer while the default advances to SDK 57", async () => {
    const parent = await mkdtemp(join(tmpdir(), "crumbs-stage-sdk-test-"))
    try {
      const modern = await stage("1.1.1", parent)
      const legacy = await stage("1.1.1", parent, {sdk56: true})
      const read = async (directory: string) => JSON.parse(await readFile(join(directory, "package.json"), "utf8"))
      const current = await read(modern), baseline = await read(legacy)
      expect(current.dependencies.expo).toBe("57.0.27")
      expect(current.dependencies["react-native"]).toBe("0.86.3")
      expect(baseline.dependencies.expo).toBe("56.0.4")
      expect(baseline.dependencies["react-native"]).toBe("0.85.3")
      expect(baseline.dependencies.react).toBe(baseline.devDependencies["react-test-renderer"])
      expect(baseline.dependencies[packageName]).toBe("1.1.1")
      expect(baseline.dependencies["@vanilla-extract/css"]).toBe(current.dependencies["@vanilla-extract/css"])
      expect(baseline.dependencies["@acme/ui"]).toBeUndefined()
      const runtime = createRequire(join(legacy, "package.json")).resolve("@crumbs/playground/runtime-extensions")
      expect(await realpath(runtime)).toStartWith(legacy + sep)
    } finally { await rm(parent, {recursive: true, force: true}) }
  })

  it("resolves native types from the app even when declarations and demos live in SDK 56 workspaces", () => {
    const app = resolve(import.meta.dir, "../../../apps/playground")
    const config = ts.readConfigFile(join(app, "tsconfig.json"), ts.sys.readFile)
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, app)
    const expected = createRequire(join(app, "package.json")).resolve("react-native/types/index.d.ts")
    for (const origin of ["packages/css/dist/theme.d.mts", "apps/storybook/src/components/native-motion/MotionPanel.tsx"]) {
      const actual = ts.resolveModuleName("react-native", resolve(app, "../..", origin), parsed.options, ts.sys)
      expect(actual.resolvedModule?.resolvedFileName).toBe(expected)
    }
  })

  it("pins native Metro peers to the playground while leaving web aliases to Expo", () => {
    const app = resolve(import.meta.dir, "../../../apps/playground")
    const require = createRequire(join(app, "package.json"))
    const config = require("./metro.config.js")
    const calls: Array<{context: any; moduleName: string; platform: string}> = []
    const context = {resolveRequest: (context: any, moduleName: string, platform: string) => calls.push({context, moduleName, platform})}
    for (const platform of ["ios", "android"]) {
      for (const moduleName of ["react", "react/jsx-runtime", "react-native", "react-native/Libraries/Animated/Animated"]) {
        config.resolver.resolveRequest(context, moduleName, platform)
        const resolved = calls.at(-1)!
        const peer = moduleName.startsWith("react-native") ? "react-native" : "react"
        const expected = dirname(dirname(require.resolve(peer + "/package.json")))
        expect(resolved.context.nodeModulesPaths).toEqual([expected])
        expect(resolved.context.disableHierarchicalLookup).toBe(true)
      }
    }
    config.resolver.resolveRequest(context, "react-native", "web")
    expect(calls.at(-1)!.context.nodeModulesPaths).toEqual([dirname(dirname(require.resolve("react-native-web/package.json")))])
    expect(calls.at(-1)!.moduleName).toBe("react-native")
    config.resolver.resolveRequest(context, "expo", "ios")
    expect(calls.at(-1)!.context).toBe(context)
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
