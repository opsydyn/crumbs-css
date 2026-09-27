import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { auditPackedRuntimeEntrypoints } from "../../../scripts/packed-runtime-graph"

const temporaryRoots: string[] = []

type FixtureOptions = Readonly<{
  readonly overrides?: Readonly<Record<string, string>>
  readonly extraExports?: Readonly<Record<string, unknown>>
}>

async function createFixturePackage(options: FixtureOptions = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "crumbs-packed-graph-"))
  temporaryRoots.push(root)
  const packageRoot = join(root, "node_modules", "@acme", "crumbs-fixture")
  const exportMap: Record<string, unknown> = {
    ".": runtimeExport("root"),
    "./theme": runtimeExport("theme"),
    "./theme/core": runtimeExport("theme-core"),
    "./dist/theme": runtimeExport("theme"),
    "./tokens": runtimeExport("tokens"),
    "./tokens/schema": runtimeExport("tokens-schema"),
    "./tokens/schema/value": runtimeExport("tokens-schema-value"),
    "./tokens/optic": runtimeExport("tokens-optic"),
    "./style": runtimeExport("style"),
    "./tooling/manifest": runtimeExport("tooling-manifest"),
    "./metro-plugin": runtimeExport("metro-plugin"),
    "./dist/transformer": runtimeExport("transformer"),
    "./dist/metro-plugin": runtimeExport("metro-plugin"),
    "./package.json": "./package.json",
    ...options.extraExports,
  }
  await mkdir(packageRoot, { recursive: true })
  await writeFile(join(packageRoot, "package.json"), JSON.stringify({
    name: "@acme/crumbs-fixture",
    exports: exportMap,
  }, null, 2))

  const files: Record<string, string> = {
    "dist/root.mjs": "export {};\n",
    "dist/root.cjs": "module.exports = {};\n",
    "dist/theme.mjs": 'import React from "react"; export const theme = React;\n',
    "dist/theme.cjs": 'const React = require("react"); module.exports = { theme: React };\n',
    "dist/theme-core.mjs": 'import React from "react"; export const core = React;\n',
    "dist/theme-core.cjs": 'const React = require("react"); module.exports = { core: React };\n',
    "dist/tokens.mjs": 'import "./token-local.mjs"; export { token } from "./token-reexport.mjs"; void import("./token-lazy.mjs");\n',
    "dist/tokens.cjs": 'const token = require("./token-local.cjs"); module.exports = { token };\n',
    "dist/tokens-schema.mjs": 'export const decode = value => value;\n',
    "dist/tokens-schema.cjs": 'exports.decode = value => value;\n',
    "dist/tokens-schema-value.mjs": 'export const decodeTokenValue = value => value;\n',
    "dist/tokens-schema-value.cjs": 'exports.decodeTokenValue = value => value;\n',
    "dist/tokens-optic.mjs": 'export const focus = value => value;\n',
    "dist/tokens-optic.cjs": 'exports.focus = value => value;\n',
    "dist/style.mjs": 'import "node:path"; import "@vanilla-extract/css"; export const style = true;\n',
    "dist/style.cjs": 'require("node:path"); require("@vanilla-extract/css"); exports.style = true;\n',
    "dist/tooling-manifest.mjs": 'import "./tooling-leaf.mjs"; export const tooling = true;\n',
    "dist/tooling-manifest.cjs": 'require("./tooling-leaf.cjs"); exports.tooling = true;\n',
    "dist/tooling-leaf.mjs": 'export const leaf = true;\n',
    "dist/tooling-leaf.cjs": 'module.exports = true;\n',
    "dist/metro-plugin.mjs": 'export const plugin = true;\n',
    "dist/metro-plugin.cjs": 'exports.plugin = true;\n',
    "dist/transformer.mjs": 'import "node:fs"; export const transformer = true;\n',
    "dist/transformer.cjs": 'require("node:fs"); exports.transformer = true;\n',
    "dist/token-local.mjs": 'export const local = true;\n',
    "dist/token-reexport.mjs": 'export const token = true;\n',
    "dist/token-lazy.mjs": 'export const lazy = true;\n',
    "dist/token-local.cjs": 'module.exports = true;\n',
  }
  Object.assign(files, options.overrides)
  for (const [relativePath, contents] of Object.entries(files)) {
    const filename = join(packageRoot, relativePath)
    await mkdir(dirname(filename), { recursive: true })
    await writeFile(filename, contents)
  }
  return packageRoot
}

function runtimeExport(name: string): Readonly<Record<string, string>> {
  return {
    import: `./dist/${name}.mjs`,
    require: `./dist/${name}.cjs`,
  }
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

test("auditPackedRuntimeEntrypoints traverses ESM and CommonJS local edges and classifies every export", async () => {
  const packageRoot = await createFixturePackage()

  const graphs = await auditPackedRuntimeEntrypoints(packageRoot)

  const esmTokens = graphs.find((graph) => graph.subpath === "./tokens" && graph.format === "esm")
  const cjsTokens = graphs.find((graph) => graph.subpath === "./tokens" && graph.format === "cjs")
  expect(esmTokens?.classification).toBe("ordinary-runtime")
  expect(esmTokens?.files).toEqual([
    "dist/token-lazy.mjs",
    "dist/token-local.mjs",
    "dist/token-reexport.mjs",
    "dist/tokens.mjs",
  ])
  expect(cjsTokens?.files).toEqual(["dist/token-local.cjs", "dist/tokens.cjs"])
  expect(graphs.find((graph) => graph.subpath === "./theme" && graph.format === "esm")?.externalSpecifiers)
    .toEqual(["react"])
  expect(graphs.find((graph) => graph.subpath === "./style" && graph.format === "esm")?.externalSpecifiers)
    .toEqual(["@vanilla-extract/css", "node:path"])
  expect(graphs.find((graph) => graph.subpath === "./tokens/schema" && graph.format === "esm")?.classification)
    .toBe("advanced-runtime")
  expect(graphs.find((graph) => graph.subpath === "./tokens/schema/value" && graph.format === "esm")?.classification)
    .toBe("advanced-runtime")
  expect(graphs.find((graph) => graph.subpath === "./tooling/manifest" && graph.format === "esm"))
    .toMatchObject({
      classification: "compiler-tooling",
      files: ["dist/tooling-leaf.mjs", "dist/tooling-manifest.mjs"],
      externalSpecifiers: [],
    })
  expect(graphs.find((graph) => graph.subpath === "./tooling/manifest" && graph.format === "cjs"))
    .toMatchObject({
      classification: "compiler-tooling",
      files: ["dist/tooling-leaf.cjs", "dist/tooling-manifest.cjs"],
      externalSpecifiers: [],
    })
  expect(graphs.find((graph) => graph.subpath === "./package.json" && graph.format === "metadata"))
    .toMatchObject({classification: "metadata", files: ["package.json"], externalSpecifiers: []})
  expect(graphs).toHaveLength(27)
})

test("ordinary runtime entrypoints cannot reach compiler tooling targets", async () => {
  const packageRoot = await createFixturePackage({
    overrides: { "dist/theme.mjs": 'import "./tooling-manifest.mjs"; export {};\n' },
  })

  await expect(auditPackedRuntimeEntrypoints(packageRoot))
    .rejects.toThrow(/ordinary-runtime.*reaches compiler-tooling/i)
})

test("auditPackedRuntimeEntrypoints fails when an exported local file is missing", async () => {
  const packageRoot = await createFixturePackage({
    overrides: {"dist/tokens.mjs": 'import "./missing-token.mjs"; export {};\n'},
  })

  await expect(auditPackedRuntimeEntrypoints(packageRoot)).rejects.toThrow(/missing local dependency/i)
})

test("auditPackedRuntimeEntrypoints fails closed on malformed emitted JavaScript", async () => {
  const packageRoot = await createFixturePackage({
    overrides: {"dist/tokens.mjs": 'export const token = ;\n'},
  })

  await expect(auditPackedRuntimeEntrypoints(packageRoot)).rejects.toThrow(/cannot parse packed runtime file/i)
})

test("auditPackedRuntimeEntrypoints fails closed on non-literal dynamic imports", async () => {
  const packageRoot = await createFixturePackage({
    overrides: {"dist/tokens.mjs": 'const name = "./token-lazy.mjs"; void import(name);\n'},
  })

  await expect(auditPackedRuntimeEntrypoints(packageRoot)).rejects.toThrow(/non-literal import\(\)/i)
})

test("auditPackedRuntimeEntrypoints fails closed on non-literal CommonJS require", async () => {
  const packageRoot = await createFixturePackage({
    overrides: {"dist/tokens.cjs": 'const name = "./token-local.cjs"; require(name);\n'},
  })

  await expect(auditPackedRuntimeEntrypoints(packageRoot)).rejects.toThrow(/non-literal require/i)
})

test("only the configured Metro transformer can use its runtime-supplied upstream path", async () => {
  const packageRoot = await createFixturePackage({
    overrides: {
      "dist/transformer.mjs": 'const upstreamPath = "runtime-selected"; __require(upstreamPath); export {};\n',
      "dist/transformer.cjs": 'const upstreamPath = "runtime-selected"; require(upstreamPath); module.exports = {};\n',
    },
  })

  const graphs = await auditPackedRuntimeEntrypoints(packageRoot)

  expect(graphs.find((graph) => graph.subpath === "./dist/transformer" && graph.format === "esm")?.dynamicLoaderExceptions)
    .toEqual([{
      callee: "__require",
      specifier: "upstreamPath",
      rationale: "Metro supplies its configured upstream transformer path at runtime so Crumbs can delegate Expo's selected transform worker.",
    }])
  expect(graphs.find((graph) => graph.subpath === "./dist/transformer" && graph.format === "cjs")?.dynamicLoaderExceptions)
    .toEqual([{
      callee: "require",
      specifier: "upstreamPath",
      rationale: "Metro supplies its configured upstream transformer path at runtime so Crumbs can delegate Expo's selected transform worker.",
    }])

  const wrongExpression = await createFixturePackage({
    overrides: {"dist/transformer.mjs": 'const pathFromConfig = "runtime-selected"; __require(pathFromConfig); export {};\n'},
  })
  await expect(auditPackedRuntimeEntrypoints(wrongExpression))
    .rejects.toThrow(/non-literal require.*pathFromConfig/i)
})

test("the manifest tooling graph allows the transformer’s approved Metro loader in emitted chunks", async () => {
  const packageRoot = await createFixturePackage({
    overrides: {
      "dist/tooling-manifest.mjs": 'import "./transformer-AbC123.mjs"; export {};\n',
      "dist/tooling-manifest.cjs": 'require("./transformer-AbC123.cjs"); module.exports = {};\n',
      "dist/transformer-AbC123.mjs": 'const upstreamPath = "runtime-selected"; __require(upstreamPath); export {};\n',
      "dist/transformer-AbC123.cjs": 'const upstreamPath = "runtime-selected"; require(upstreamPath); module.exports = {};\n',
    },
  })

  const graphs = await auditPackedRuntimeEntrypoints(packageRoot)

  expect(graphs.find((graph) => graph.subpath === "./tooling/manifest" && graph.format === "esm")?.dynamicLoaderExceptions)
    .toEqual([{
      callee: "__require",
      specifier: "upstreamPath",
      rationale: expect.stringMatching(/configured upstream transformer path/i),
    }])
  expect(graphs.find((graph) => graph.subpath === "./tooling/manifest" && graph.format === "cjs")?.dynamicLoaderExceptions)
    .toEqual([{
      callee: "require",
      specifier: "upstreamPath",
      rationale: expect.stringMatching(/configured upstream transformer path/i),
    }])
})

test("the direct transformer export allows its approved Metro loader in emitted chunks", async () => {
  const packageRoot = await createFixturePackage({
    overrides: {
      "dist/transformer.mjs": 'import "./transformer-AbC123.mjs"; export {};\n',
      "dist/transformer.cjs": 'require("./transformer-AbC123.cjs"); module.exports = {};\n',
      "dist/transformer-AbC123.mjs": 'const upstreamPath = "runtime-selected"; __require(upstreamPath); export {};\n',
      "dist/transformer-AbC123.cjs": 'const upstreamPath = "runtime-selected"; require(upstreamPath); module.exports = {};\n',
    },
  })

  const graphs = await auditPackedRuntimeEntrypoints(packageRoot)

  expect(graphs.find((graph) => graph.subpath === "./dist/transformer" && graph.format === "esm")?.dynamicLoaderExceptions)
    .toHaveLength(1)
  expect(graphs.find((graph) => graph.subpath === "./dist/transformer" && graph.format === "cjs")?.dynamicLoaderExceptions)
    .toHaveLength(1)
})

test("ordinary runtime entrypoints cannot reach an advanced entry target", async () => {
  const packageRoot = await createFixturePackage({
    overrides: {"dist/theme.mjs": 'import "./tokens-schema.mjs"; export {};\n'},
  })

  await expect(auditPackedRuntimeEntrypoints(packageRoot))
    .rejects.toThrow(/ordinary-runtime.*reaches advanced-runtime/i)
})

test("ordinary and advanced runtime classes reject unauthorized external imports", async () => {
  const ordinaryPackage = await createFixturePackage({
    overrides: {"dist/theme.mjs": 'import "effect/Schema"; export {};\n'},
  })
  const tokensPackage = await createFixturePackage({
    overrides: {"dist/tokens.mjs": 'import "react"; export {};\n'},
  })
  const advancedPackage = await createFixturePackage({
    overrides: {"dist/tokens-schema.mjs": 'import "effect/Schema"; export {};\n'},
  })

  await expect(auditPackedRuntimeEntrypoints(ordinaryPackage)).rejects.toThrow(/ordinary-runtime.*effect\/Schema/i)
  await expect(auditPackedRuntimeEntrypoints(tokensPackage)).rejects.toThrow(/ordinary-runtime.*react/i)
  await expect(auditPackedRuntimeEntrypoints(advancedPackage)).rejects.toThrow(/advanced-runtime.*effect\/Schema/i)
})

test("compiler entries allow only build-policy externals and reject Effect", async () => {
  const allowedPackage = await createFixturePackage({
    overrides: {"dist/transformer.mjs": 'import "node:fs"; import "url"; import "metro"; export {};\n'},
  })
  const deniedPackage = await createFixturePackage({
    overrides: {"dist/transformer.mjs": 'import "not-in-build-policy"; export {};\n'},
  })
  const effectPackage = await createFixturePackage({
    overrides: {"dist/transformer.mjs": 'import "effect/Schema"; export {};\n'},
  })

  const allowedGraphs = await auditPackedRuntimeEntrypoints(allowedPackage)
  expect(allowedGraphs).toHaveLength(27)
  expect(allowedGraphs.find((graph) => graph.subpath === "./dist/transformer" && graph.format === "esm")?.externalSpecifiers)
    .toEqual(["metro", "node:fs", "url"])
  await expect(auditPackedRuntimeEntrypoints(deniedPackage)).rejects.toThrow(/compiler-tooling.*not-in-build-policy/i)
  await expect(auditPackedRuntimeEntrypoints(effectPackage)).rejects.toThrow(/compiler-tooling.*effect\/Schema/i)
})

test("auditPackedRuntimeEntrypoints rejects an export with no runtime class", async () => {
  const packageRoot = await createFixturePackage({
    extraExports: {"./unclassified": runtimeExport("custom")},
    overrides: {
      "dist/custom.mjs": "export {};\n",
      "dist/custom.cjs": "module.exports = {};\n",
    },
  })

  await expect(auditPackedRuntimeEntrypoints(packageRoot)).rejects.toThrow(/unclassified export.*\.\/unclassified/i)
})
