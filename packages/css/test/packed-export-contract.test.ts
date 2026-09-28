import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import {
  collectPackedExportTargets,
  verifyPackedExportMap,
} from "../../../scripts/packed-export-contract"

const temporaryRoots: string[] = []

async function createConsumer(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "crumbs-packed-export-"))
  temporaryRoots.push(root)
  await writeFile(join(root, "package.json"), JSON.stringify({ private: true, type: "module" }))
  await mkdir(join(root, "node_modules"), { recursive: true })
  return root
}

async function writeTarget(packageRoot: string, target: string): Promise<void> {
  const filename = join(packageRoot, target.slice(2))
  await mkdir(dirname(filename), { recursive: true })
  await writeFile(filename, "export {}\n")
}

async function writeFixturePackage(packageRoot: string): Promise<void> {
  const manifest = {
    name: "@acme/crumbs-fixture",
    type: "module",
    exports: {
      ".": {
        types: "./types/index.d.ts",
        import: "./dist/index.mjs",
        require: "./dist/index.cjs",
      },
      "./conditional": {
        node: {
          import: "./dist/conditional.mjs",
          require: "./dist/conditional.cjs",
        },
        types: "./types/conditional.d.ts",
      },
      "./tooling/manifest": {
        types: "./dist/tooling-manifest.d.mts",
        import: "./dist/tooling-manifest.mjs",
        require: "./dist/tooling-manifest.cjs",
      },
      "./tooling/policy": {
        types: "./dist/tooling-policy.d.mts",
        import: "./dist/tooling-policy.mjs",
        require: "./dist/tooling-policy.cjs",
      },
      "./tooling/migrations": {
        types: "./dist/tooling-migrations.d.mts",
        import: "./dist/tooling-migrations.mjs",
        require: "./dist/tooling-migrations.cjs",
      },
      "./devtools": {
        types: "./dist/devtools.d.mts",
        import: "./dist/devtools.mjs",
        require: "./dist/devtools.cjs",
      },
      "./package.json": "./package.json",
    },
  }
  await mkdir(packageRoot, { recursive: true })
  await writeFile(join(packageRoot, "package.json"), JSON.stringify(manifest, null, 2))
  for (const target of [
    "./types/index.d.ts",
    "./dist/index.mjs",
    "./dist/index.cjs",
    "./types/conditional.d.ts",
    "./dist/conditional.mjs",
    "./dist/conditional.cjs",
    "./dist/tooling-manifest.d.mts",
    "./dist/tooling-manifest.mjs",
    "./dist/tooling-manifest.cjs",
    "./dist/tooling-policy.d.mts",
    "./dist/tooling-policy.mjs",
    "./dist/tooling-policy.cjs",
    "./dist/tooling-migrations.d.mts",
    "./dist/tooling-migrations.mjs",
    "./dist/tooling-migrations.cjs",
    "./dist/devtools.d.mts",
    "./dist/devtools.mjs",
    "./dist/devtools.cjs",
  ]) {
    await writeTarget(packageRoot, target)
  }
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

test("collectPackedExportTargets flattens nested conditions in manifest order", () => {
  expect(collectPackedExportTargets({
    ".": { types: "./types/index.d.ts", import: "./dist/index.mjs", require: "./dist/index.cjs" },
    "./conditional": {
      node: { import: "./dist/conditional.mjs", require: "./dist/conditional.cjs" },
      types: "./types/conditional.d.ts",
    },
    "./package.json": "./package.json",
  })).toEqual([
    { subpath: ".", conditions: ["types"], target: "./types/index.d.ts" },
    { subpath: ".", conditions: ["import"], target: "./dist/index.mjs" },
    { subpath: ".", conditions: ["require"], target: "./dist/index.cjs" },
    { subpath: "./conditional", conditions: ["node", "import"], target: "./dist/conditional.mjs" },
    { subpath: "./conditional", conditions: ["node", "require"], target: "./dist/conditional.cjs" },
    { subpath: "./conditional", conditions: ["types"], target: "./types/conditional.d.ts" },
    { subpath: "./package.json", conditions: [], target: "./package.json" },
  ])
})

test("verifyPackedExportMap checks every target and Node import/require selection", async () => {
  const consumerRoot = await createConsumer()
  const packageRoot = join(consumerRoot, "node_modules", "@acme", "crumbs-fixture")
  await writeFixturePackage(packageRoot)
  const installedPackage = await realpath(packageRoot)

  const resolutions = await verifyPackedExportMap(installedPackage, consumerRoot)

  expect(resolutions).toEqual([
    {
      subpath: ".",
      import: "./dist/index.mjs",
      require: "./dist/index.cjs",
      types: "./types/index.d.ts",
    },
    {
      subpath: "./conditional",
      import: "./dist/conditional.mjs",
      require: "./dist/conditional.cjs",
      types: "./types/conditional.d.ts",
    },
    {
      subpath: "./tooling/manifest",
      import: "./dist/tooling-manifest.mjs",
      require: "./dist/tooling-manifest.cjs",
      types: "./dist/tooling-manifest.d.mts",
    },
    {
      subpath: "./tooling/policy",
      import: "./dist/tooling-policy.mjs",
      require: "./dist/tooling-policy.cjs",
      types: "./dist/tooling-policy.d.mts",
    },
    {
      subpath: "./tooling/migrations",
      import: "./dist/tooling-migrations.mjs",
      require: "./dist/tooling-migrations.cjs",
      types: "./dist/tooling-migrations.d.mts",
    },
    {
      subpath: "./devtools",
      import: "./dist/devtools.mjs",
      require: "./dist/devtools.cjs",
      types: "./dist/devtools.d.mts",
    },
    {
      subpath: "./package.json",
      import: "./package.json",
      require: "./package.json",
    },
  ])
})

test("verifyPackedExportMap rejects targets outside the installed package", async () => {
  const consumerRoot = await createConsumer()
  const packageRoot = join(consumerRoot, "node_modules", "@acme", "crumbs-fixture")
  await mkdir(packageRoot, { recursive: true })
  await writeFile(join(packageRoot, "package.json"), JSON.stringify({
    name: "@acme/crumbs-fixture",
    exports: { ".": "../../../../outside.js" },
  }))

  await expect(verifyPackedExportMap(packageRoot, consumerRoot))
    .rejects.toThrow(/outside the installed package/i)
})

test("verifyPackedExportMap rejects a declared target that is not a regular file", async () => {
  const consumerRoot = await createConsumer()
  const packageRoot = join(consumerRoot, "node_modules", "@acme", "crumbs-fixture")
  await mkdir(packageRoot, { recursive: true })
  await writeFile(join(packageRoot, "package.json"), JSON.stringify({
    name: "@acme/crumbs-fixture",
    exports: { ".": "./dist/missing.js" },
  }))

  await expect(verifyPackedExportMap(packageRoot, consumerRoot))
    .rejects.toThrow(/missing.*regular file|regular file.*missing/i)
})

test("verifyPackedExportMap rejects a target symlink that escapes the package", async () => {
  const consumerRoot = await createConsumer()
  const packageRoot = join(consumerRoot, "node_modules", "@acme", "crumbs-fixture")
  await mkdir(packageRoot, { recursive: true })
  await writeFile(join(packageRoot, "package.json"), JSON.stringify({
    name: "@acme/crumbs-fixture",
    exports: { ".": "./dist/escape.js" },
  }))
  const outside = join(consumerRoot, "outside.js")
  await writeFile(outside, "export {}\n")
  await mkdir(join(packageRoot, "dist"), { recursive: true })
  await symlink(outside, join(packageRoot, "dist", "escape.js"))

  await expect(verifyPackedExportMap(packageRoot, consumerRoot))
    .rejects.toThrow(/outside the installed package/i)
})
