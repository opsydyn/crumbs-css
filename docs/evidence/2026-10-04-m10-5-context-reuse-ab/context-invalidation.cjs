"use strict"
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
function findRepoRoot(start) {
  let current = start
  while (true) {
    if (
      fs.existsSync(path.join(current, "packages/css/package.json"))
      && fs.existsSync(path.join(current, "docs/roadmap.md"))
    ) return current
    const parent = path.dirname(current)
    if (parent === current) throw new Error("Cannot locate Crumbs repository root")
    current = parent
  }
}
const repoRoot = findRepoRoot(__dirname)
const packageRoot = path.join(repoRoot, "packages/css")
const scratchRoot = path.join(packageRoot, ".m10-5-context-reuse")
const integrationEntry = require.resolve("@vanilla-extract/integration", { paths: [packageRoot] })
const integration = require(integrationEntry)
const esbuildEntry = require.resolve("esbuild", { paths: [integrationEntry] })
const esbuild = require(esbuildEntry)
const integrationVersion = JSON.parse(fs.readFileSync(path.join(path.dirname(path.dirname(integrationEntry)), "package.json"), "utf8")).version
const esbuildVersion = JSON.parse(fs.readFileSync(path.join(path.dirname(path.dirname(esbuildEntry)), "package.json"), "utf8")).version

const root = path.join(scratchRoot, "invalidation-fixture")
const src = path.join(root, "src")
const entryPath = path.join(src, "entry.css.ts")
const tsconfigPath = path.join(root, "tsconfig.json")
const absWorkingDir = root
const tsconfig = "tsconfig.json"

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, contents)
}
function inputs(result) {
  return Object.keys(result.metafile.inputs).sort()
}
function source(result) {
  assert.equal(result.outputFiles.length, 1)
  return result.outputFiles[0].text
}
async function fresh() {
  const compiled = await integration.compile({
    filePath: entryPath,
    cwd: absWorkingDir,
    esbuildOptions: { tsconfig },
  })
  const built = await esbuild.build(options())
  assert.equal(compiled.source, source(built))
  assert.deepEqual(
    compiled.watchFiles.slice().sort(),
    Object.keys(built.metafile.inputs).map((filePath) => path.join(absWorkingDir, filePath)).sort(),
  )
  return { ...built, source: compiled.source }
}
function options() {
  return {
    entryPoints: [entryPath],
    metafile: true,
    bundle: true,
    external: ["@vanilla-extract"],
    platform: "node",
    write: false,
    plugins: [integration.vanillaExtractTransformPlugin({})],
    absWorkingDir,
    tsconfig,
  }
}
function setup() {
  fs.rmSync(root, { recursive: true, force: true })
  write(path.join(root, "package.json"), JSON.stringify({ name: "m10-5-context-invalidation-fixture" }))
  write(tsconfigPath, JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@spacing": ["./spacing-a.ts"] } } }))
  write(path.join(root, "spacing-a.ts"), "export const space = 2;\n")
  write(path.join(root, "spacing-b.ts"), "export const space = 22;\n")
  write(entryPath, [
    'import { style } from "@vanilla-extract/css";',
    'import { space } from "../spacing-a.ts";',
    "export const panel = style({ padding: space });",
    "",
  ].join("\n"))
}

async function main() {
  setup()
  let ctx = await esbuild.context(options())
  try {
    const initial = await ctx.rebuild()
    assert.match(source(initial), /var space = 2;/)
    assert(inputs(initial).some((name) => name.endsWith("spacing-a.ts")))

    // Different size guarantees esbuild sees changed filesystem metadata.
    write(path.join(root, "spacing-a.ts"), "export const space = 128; // dependency changed\n")
    await new Promise((resolve) => setTimeout(resolve, 5))
    const rebuiltAfterDependency = process.env.STALE_CONTROL === "1" ? initial : await ctx.rebuild()
    assert.match(source(rebuiltAfterDependency), /var space = 128;/)
    const freshAfterDependency = await fresh()
    assert.equal(source(rebuiltAfterDependency), freshAfterDependency.source)
    assert(inputs(rebuiltAfterDependency).some((name) => name.endsWith("spacing-a.ts")))

    // A new import edge must replace the previous dependency receipt.
    write(entryPath, fs.readFileSync(entryPath, "utf8").replace("../spacing-a.ts", "../spacing-b.ts"))
    await new Promise((resolve) => setTimeout(resolve, 5))
    const rebuiltAfterGraphChange = await ctx.rebuild()
    assert.match(source(rebuiltAfterGraphChange), /var space = 22;/)
    assert(!inputs(rebuiltAfterGraphChange).some((name) => name.endsWith("spacing-a.ts")))
    assert(inputs(rebuiltAfterGraphChange).some((name) => name.endsWith("spacing-b.ts")))
    const freshAfterGraphChange = await fresh()
    assert.equal(source(rebuiltAfterGraphChange), freshAfterGraphChange.source)
    assert.deepEqual(inputs(rebuiltAfterGraphChange), inputs(freshAfterGraphChange))

    // Editing tsconfig behind an existing context probes whether config is reloaded.
    write(entryPath, fs.readFileSync(entryPath, "utf8").replace("../spacing-b.ts", "@spacing"))
    write(tsconfigPath, JSON.stringify({ compilerOptions: { baseUrl: ".", paths: { "@spacing": ["./spacing-b.ts"] } } }))
    await new Promise((resolve) => setTimeout(resolve, 5))
    const rebuiltAfterConfigChange = await ctx.rebuild()
    const freshAfterConfigChange = await fresh()
    const contextConfigRefresh = source(rebuiltAfterConfigChange) === freshAfterConfigChange.source
      && inputs(rebuiltAfterConfigChange).some((name) => name.endsWith("spacing-b.ts"))
      && !inputs(rebuiltAfterConfigChange).some((name) => name.endsWith("spacing-a.ts"))

    await ctx.dispose()
    ctx = await esbuild.context(options())
    const recreatedAfterConfigChange = await ctx.rebuild()
    assert.equal(source(recreatedAfterConfigChange), freshAfterConfigChange.source)
    assert(inputs(recreatedAfterConfigChange).some((name) => name.endsWith("spacing-b.ts")))
    assert(!inputs(recreatedAfterConfigChange).some((name) => name.endsWith("spacing-a.ts")))

    process.stdout.write(JSON.stringify({
      status: "passed",
      dependencyContentInvalidation: "passed",
      importGraphInvalidation: "passed",
      dependencyReceipts: "fresh-metafile-inputs",
      contextReloadsTsconfig: contextConfigRefresh,
      disposeAndRecreateOnConfigChange: "passed",
      esbuildVersion,
      integrationVersion,
    }) + "\n")
  } finally {
    await ctx.dispose()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
