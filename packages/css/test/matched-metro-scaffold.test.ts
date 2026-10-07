import { afterAll, describe, expect, it } from "bun:test"
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { prepareMatchedMetroScaffold } from "../../../scripts/prepare-matched-metro-scaffold"

const baselineRevision = "43c5ece39360cf321fdb074d82cee41d5daaba23"
const temporaryRoots: string[] = []
const fixturePaths = [
  "apps/playground/src/incremental-entry.ts",
  "apps/playground/src/incremental.css.ts",
  "apps/playground/src/incremental-token.ts",
  "apps/playground/src/incremental-base.css.ts",
  "packages/css/fixtures/m2-7-workspace-token.ts",
] as const

afterAll(() => {
  for (const path of temporaryRoots) rmSync(path, { recursive: true, force: true })
})

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n")
}

function installPackage(root: string, packagePath: string, name: string, version: string): void {
  writeJson(join(root, packagePath, "package.json"), { name, version })
}

async function withGitRevision<T>(revision: string, run: () => Promise<T>): Promise<T> {
  const root = temporaryRoots.at(-1)!
  const bin = join(root, "bin")
  mkdirSync(bin, { recursive: true })
  const gitStub = join(bin, "git")
  writeFileSync(gitStub, `#!/bin/sh\nprintf '%s\\n' '${revision}'\n`)
  chmodSync(gitStub, 0o755)
  const previousPath = process.env.PATH
  process.env.PATH = `${bin}:${previousPath ?? ""}`
  try {
    return await run()
  } finally {
    if (previousPath === undefined) delete process.env.PATH
    else process.env.PATH = previousPath
  }
}

function makeRoots() {
  const root = mkdtempSync(join(tmpdir(), "crumbs-matched-metro-scaffold-"))
  temporaryRoots.push(root)
  const sourceRoot = join(root, "source")
  const baselineRoot = join(root, "baseline")
  const outputRoot = join(root, "output")
  const appRoot = join(baselineRoot, "apps/playground")
  const appNodeModules = join(appRoot, "node_modules")
  const packageRoot = join(baselineRoot, "packages/css")

  for (const path of [
    join(sourceRoot, "apps/playground/src"),
    join(sourceRoot, "packages/css/dist"),
    join(sourceRoot, "packages/css/fixtures"),
    join(appRoot, "src"),
    appNodeModules,
    join(baselineRoot, "node_modules"),
    join(packageRoot, "node_modules"),
    join(packageRoot, "dist"),
  ]) mkdirSync(path, { recursive: true })

  writeFileSync(join(baselineRoot, "bun.lock"), "{}\n")
  writeJson(join(baselineRoot, "package.json"), { name: "crumbs-monorepo", private: true })
  writeJson(join(appRoot, "package.json"), {
    name: "@crumbs/playground",
    dependencies: {
      "@opsydyn/crumbs-css": "workspace:*",
      expo: "~56.0.0",
    },
  })
  writeFileSync(join(appRoot, "metro.config.js"), "module.exports = { baseline: true }\n")
  writeFileSync(join(appRoot, "src/incremental-entry.ts"), "export const baselineEntry = true\n")
  writeJson(join(packageRoot, "package.json"), { name: "@opsydyn/crumbs-css", version: "baseline" })
  writeFileSync(join(packageRoot, "tsdown.config.ts"), "export default {}\n")
  writeFileSync(join(packageRoot, "dist/old.mjs"), "export const oldBuild = true\n")

  const currentMetroConfig = "module.exports = { current: true }\n"
  writeFileSync(join(sourceRoot, "apps/playground/metro.config.js"), currentMetroConfig)
  writeJson(join(sourceRoot, "apps/playground/package.json"), {
    name: "@crumbs/playground",
    dependencies: {
      "@opsydyn/crumbs-css": "workspace:*",
      "@vanilla-extract/css": "^1.20.1",
      expo: "~56.0.0",
    },
  })
  for (const [index, path] of fixturePaths.entries()) {
    const absolute = join(sourceRoot, path)
    mkdirSync(join(absolute, ".."), { recursive: true })
    writeFileSync(absolute, `export const fixture${index} = ${index + 1}\n`)
  }
  writeJson(join(sourceRoot, "packages/css/package.json"), {
    name: "@opsydyn/crumbs-css",
    version: "0.1.1-alpha.1",
  })
  writeFileSync(join(sourceRoot, "packages/css/tsdown.config.ts"), "export default {}\n")
  writeFileSync(join(sourceRoot, "packages/css/dist/index.mjs"), "export const currentBuild = true\n")
  writeFileSync(join(sourceRoot, "packages/css/dist/metro-plugin.mjs"), "export const currentPlugin = true\n")

  installPackage(appNodeModules, "expo", "expo", "56.0.4")
  installPackage(appNodeModules, "expo/node_modules/@expo/cli", "@expo/cli", "56.1.11")
  installPackage(appNodeModules, "expo/node_modules/@expo/cli/node_modules/@expo/metro-config", "@expo/metro-config", "56.0.12")
  installPackage(appNodeModules, "expo/node_modules/@expo/cli/node_modules/@expo/metro-config/node_modules/metro", "metro", "0.84.4")
  installPackage(appNodeModules, "react-native", "react-native", "0.85.3")
  installPackage(appNodeModules, "@expo/metro-runtime", "@expo/metro-runtime", "56.0.12")
  installPackage(appNodeModules, "react", "react", "19.2.5")
  installPackage(appNodeModules, "react-dom", "react-dom", "19.2.5")
  installPackage(appNodeModules, "babel-preset-expo", "babel-preset-expo", "56.0.12")
  installPackage(appNodeModules, "@vanilla-extract/css", "@vanilla-extract/css", "1.20.1")
  installPackage(packageRoot, "node_modules/@vanilla-extract/css", "@vanilla-extract/css", "1.20.1")

  return { root, sourceRoot, baselineRoot, outputRoot, currentMetroConfig }
}

describe("M10.5 matched Metro scaffold", () => {
  it("copies current inputs and package artifacts into the pinned baseline scaffold", async () => {
    const roots = makeRoots()
    const result = await withGitRevision(baselineRevision, () => prepareMatchedMetroScaffold({
      baselineRoot: roots.baselineRoot,
      baselineRevision,
      sourceRoot: roots.sourceRoot,
      outputRoot: roots.outputRoot,
    }))

    expect(result.appRoot).toBe(join(roots.outputRoot, "apps/playground"))
    expect(readFileSync(join(result.appRoot, "metro.config.js"), "utf8")).toBe(roots.currentMetroConfig)
    for (const [index, path] of fixturePaths.entries()) {
      expect(readFileSync(join(roots.outputRoot, path), "utf8")).toBe(`export const fixture${index} = ${index + 1}\n`)
    }
    expect(readFileSync(join(roots.outputRoot, "packages/css/dist/index.mjs"), "utf8"))
      .toContain("currentBuild")
    expect(readFileSync(join(roots.outputRoot, "packages/css/dist/metro-plugin.mjs"), "utf8"))
      .toContain("currentPlugin")
    expect(JSON.parse(readFileSync(join(roots.outputRoot, "packages/css/node_modules/@vanilla-extract/css/package.json"), "utf8")))
      .toMatchObject({ version: "1.20.1" })
    expect(JSON.parse(readFileSync(join(roots.outputRoot, "apps/playground/package.json"), "utf8")))
      .toMatchObject({ dependencies: { "@vanilla-extract/css": "^1.20.1", expo: "~56.0.0" } })
    expect(result.fixtureHashes.map(item => item.path).sort()).toEqual(["apps/playground/metro.config.js", ...fixturePaths].sort())
    expect(result.resolvedVersions).toMatchObject({
      expo: "56.0.4",
      metro: "0.84.4",
      reactNative: "0.85.3",
      expoMetroRuntime: "56.0.12",
      react: "19.2.5",
      reactDom: "19.2.5",
      babelPresetExpo: "56.0.12",
      vanillaExtractCss: "1.20.1",
    })
    expect(readFileSync(join(roots.baselineRoot, "apps/playground/metro.config.js"), "utf8"))
      .toContain("baseline: true")
  })

  it("rejects a baseline checkout at any other revision", async () => {
    const roots = makeRoots()
    await withGitRevision("1".repeat(40), async () => {
      await expect(prepareMatchedMetroScaffold({
        baselineRoot: roots.baselineRoot,
        baselineRevision,
        sourceRoot: roots.sourceRoot,
        outputRoot: roots.outputRoot,
      })).rejects.toThrow(/baseline revision/i)
    })
  })

  it("rejects a mismatched direct Vanilla Extract resolution", async () => {
    const roots = makeRoots()
    installPackage(join(roots.baselineRoot, "apps/playground/node_modules"), "@vanilla-extract/css", "@vanilla-extract/css", "1.20.2")
    await withGitRevision(baselineRevision, async () => {
      await expect(prepareMatchedMetroScaffold({
        baselineRoot: roots.baselineRoot,
        baselineRevision,
        sourceRoot: roots.sourceRoot,
        outputRoot: roots.outputRoot,
      })).rejects.toThrow(/1\.20\.1|vanilla-extract/i)
    })
  })

  it("rejects a mismatched package runtime Vanilla Extract resolution", async () => {
    const roots = makeRoots()
    installPackage(join(roots.baselineRoot, "packages/css"), "node_modules/@vanilla-extract/css", "@vanilla-extract/css", "1.20.2")
    await withGitRevision(baselineRevision, async () => {
      await expect(prepareMatchedMetroScaffold({
        baselineRoot: roots.baselineRoot,
        baselineRevision,
        sourceRoot: roots.sourceRoot,
        outputRoot: roots.outputRoot,
      })).rejects.toThrow(/1\.20\.1|vanilla-extract/i)
    })
  })

  it("rejects a current source app with a different Vanilla Extract range", async () => {
    const roots = makeRoots()
    const manifestPath = join(roots.sourceRoot, "apps/playground/package.json")
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
    manifest.dependencies["@vanilla-extract/css"] = "^1.21.0"
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n")
    await withGitRevision(baselineRevision, async () => {
      await expect(prepareMatchedMetroScaffold({
        baselineRoot: roots.baselineRoot,
        baselineRevision,
        sourceRoot: roots.sourceRoot,
        outputRoot: roots.outputRoot,
      })).rejects.toThrow(/source.*@vanilla-extract\/css|1\.20\.1/i)
    })
  })

  it("rejects missing current Metro or fixture inputs", async () => {
    const roots = makeRoots()
    rmSync(join(roots.sourceRoot, fixturePaths[2]))
    await withGitRevision(baselineRevision, async () => {
      await expect(prepareMatchedMetroScaffold({
        baselineRoot: roots.baselineRoot,
        baselineRevision,
        sourceRoot: roots.sourceRoot,
        outputRoot: roots.outputRoot,
      })).rejects.toThrow(/incremental-token\.ts/i)
    })
  })
})
