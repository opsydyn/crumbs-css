import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, isAbsolute, join, relative, sep } from "node:path"
import {
  assertNoWorkspaceOrLinkDependencies,
  assertPrecompiledComponentFiles,
  verifyExpoBundleInventory,
  verifyDistinctInstalledArtifactCopies,
  verifyInstalledArtifact,
} from "../../../scripts/packed-distribution-contract"

const temporaryRoots: string[] = []

async function createTemporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix))
  temporaryRoots.push(root)
  return root
}

async function createConsumer(): Promise<string> {
  const root = await createTemporaryRoot("crumbs-packed-contract-consumer-")
  await writeFile(join(root, "package.json"), JSON.stringify({ private: true }))
  await mkdir(join(root, "node_modules"), { recursive: true })
  return root
}

async function writePackage(
  packageRoot: string,
  identity: Readonly<{ name: string; version: string }>,
): Promise<void> {
  await mkdir(join(packageRoot, "dist"), { recursive: true })
  await writeFile(
    join(packageRoot, "package.json"),
    JSON.stringify({
      ...identity,
      exports: { ".": "./dist/index.js" },
    }),
  )
  await writeFile(join(packageRoot, "dist/index.js"), "module.exports = {}\n")
}

function isPathWithin(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return pathFromRoot === "" || (
    !isAbsolute(pathFromRoot) &&
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith(`..${sep}`)
  )
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

test("verifyInstalledArtifact accepts the expected package under consumer node_modules", async () => {
  const consumerRoot = await createConsumer()
  const packageRoot = join(consumerRoot, "node_modules", "@acme", "design-tokens")
  await writePackage(packageRoot, { name: "@acme/design-tokens", version: "1.0.0" })

  const installed = await verifyInstalledArtifact(consumerRoot, {
    name: "@acme/design-tokens",
    version: "1.0.0",
  })
  const nodeModulesRoot = await realpath(join(consumerRoot, "node_modules"))

  expect(installed.name).toBe("@acme/design-tokens")
  expect(installed.version).toBe("1.0.0")
  expect(isPathWithin(nodeModulesRoot, installed.packageRoot)).toBe(true)
  expect(installed.entryPath).toBe(await realpath(join(packageRoot, "dist/index.js")))
})

test("verifyDistinctInstalledArtifactCopies accepts two physical copies of the expected package", async () => {
  const directConsumerRoot = await createConsumer()
  const nestedConsumerRoot = await createConsumer()
  const expected = { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" }
  const directPackageRoot = join(directConsumerRoot, "node_modules", "@opsydyn", "crumbs-css")
  const nestedPackageRoot = join(nestedConsumerRoot, "node_modules", "@opsydyn", "crumbs-css")
  await writePackage(directPackageRoot, expected)
  await writePackage(nestedPackageRoot, expected)

  const copies = await verifyDistinctInstalledArtifactCopies(
    directConsumerRoot,
    nestedConsumerRoot,
    expected,
  )

  expect(copies.direct.packageRoot).toBe(await realpath(directPackageRoot))
  expect(copies.nested.packageRoot).toBe(await realpath(nestedPackageRoot))
  expect(copies.direct.packageRoot).not.toBe(copies.nested.packageRoot)
})

test("verifyDistinctInstalledArtifactCopies rejects one physical copy supplied twice", async () => {
  const consumerRoot = await createConsumer()
  const expected = { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" }
  await writePackage(join(consumerRoot, "node_modules", "@opsydyn", "crumbs-css"), expected)

  await expect(verifyDistinctInstalledArtifactCopies(
    consumerRoot,
    consumerRoot,
    expected,
  )).rejects.toThrow(/same physical package copy/i)
})

test("verifyDistinctInstalledArtifactCopies rejects a nested package symlink", async () => {
  const directConsumerRoot = await createConsumer()
  const nestedConsumerRoot = await createConsumer()
  const expected = { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" }
  await writePackage(
    join(directConsumerRoot, "node_modules", "@opsydyn", "crumbs-css"),
    expected,
  )
  const nestedNodeModules = join(nestedConsumerRoot, "node_modules")
  const nestedPackageLink = join(nestedNodeModules, "@opsydyn", "crumbs-css")
  const nestedPackageStore = join(nestedNodeModules, ".store", "crumbs-css")
  await writePackage(nestedPackageStore, expected)
  await mkdir(dirname(nestedPackageLink), { recursive: true })
  await symlink(nestedPackageStore, nestedPackageLink, "dir")

  await expect(verifyDistinctInstalledArtifactCopies(
    directConsumerRoot,
    nestedConsumerRoot,
    expected,
  )).rejects.toThrow(/@opsydyn\/crumbs-css.*symlink/i)
})

test("verifyInstalledArtifact rejects a missing package", async () => {
  const consumerRoot = await createConsumer()

  await expect(verifyInstalledArtifact(consumerRoot, {
    name: "@acme/missing",
    version: "1.0.0",
  })).rejects.toThrow(/@acme\/missing.*not found|cannot resolve/i)
})

test("verifyInstalledArtifact reports an installed package name mismatch", async () => {
  const consumerRoot = await createConsumer()
  await writePackage(
    join(consumerRoot, "node_modules", "@acme", "design-tokens"),
    { name: "@acme/wrong-name", version: "1.0.0" },
  )

  await expect(verifyInstalledArtifact(consumerRoot, {
    name: "@acme/design-tokens",
    version: "1.0.0",
  })).rejects.toThrow(/@acme\/design-tokens@1\.0\.0.*@acme\/wrong-name@1\.0\.0/)
})

test("verifyInstalledArtifact rejects a version mismatch", async () => {
  const consumerRoot = await createConsumer()
  await writePackage(
    join(consumerRoot, "node_modules", "@acme", "design-tokens"),
    { name: "@acme/design-tokens", version: "1.0.0" },
  )

  await expect(verifyInstalledArtifact(consumerRoot, {
    name: "@acme/design-tokens",
    version: "1.0.1",
  })).rejects.toThrow(/@acme\/design-tokens.*version/i)
})

test("verifyInstalledArtifact rejects a package symlink resolving outside node_modules", async () => {
  const consumerRoot = await createConsumer()
  const externalPackageRoot = join(
    await createTemporaryRoot("crumbs-packed-contract-external-"),
    "design-tokens",
  )
  await writePackage(externalPackageRoot, { name: "@acme/design-tokens", version: "1.0.0" })
  const packageLink = join(consumerRoot, "node_modules", "@acme", "design-tokens")
  await mkdir(dirname(packageLink), { recursive: true })
  await symlink(externalPackageRoot, packageLink, "dir")

  await expect(verifyInstalledArtifact(consumerRoot, {
    name: "@acme/design-tokens",
    version: "1.0.0",
  })).rejects.toThrow(/@acme\/design-tokens.*node_modules/i)
})

test("verifyInstalledArtifact rejects a package symlink within node_modules", async () => {
  const consumerRoot = await createConsumer()
  const nodeModules = join(consumerRoot, "node_modules")
  const packageLink = join(nodeModules, "@acme", "design-tokens")
  const packageStore = join(nodeModules, ".store", "design-tokens")
  await writePackage(packageStore, { name: "@acme/design-tokens", version: "1.0.0" })
  await mkdir(dirname(packageLink), { recursive: true })
  await symlink(packageStore, packageLink, "dir")

  await expect(verifyInstalledArtifact(consumerRoot, {
    name: "@acme/design-tokens",
    version: "1.0.0",
  })).rejects.toThrow(/@acme\/design-tokens.*symlink/i)
})

test("verifyInstalledArtifact rejects a node_modules directory symlink escaping the consumer", async () => {
  const consumerRoot = await createConsumer()
  const externalNodeModules = await createTemporaryRoot("crumbs-packed-contract-node-modules-")
  await writePackage(
    join(externalNodeModules, "@acme", "design-tokens"),
    { name: "@acme/design-tokens", version: "1.0.0" },
  )
  await rm(join(consumerRoot, "node_modules"), { recursive: true, force: true })
  await symlink(externalNodeModules, join(consumerRoot, "node_modules"), "dir")

  await expect(verifyInstalledArtifact(consumerRoot, {
    name: "@acme/design-tokens",
    version: "1.0.0",
  })).rejects.toThrow(/@acme\/design-tokens@1\.0\.0.*consumer node_modules resolves outside the consumer root or through a symlink/i)
})

test("assertNoWorkspaceOrLinkDependencies rejects workspace and link protocols", () => {
  for (const manifest of [
    { dependencies: { "@acme/design-tokens": "workspace:*" } },
    { optionalDependencies: { "@acme/ui": "link:../ui" } },
    { peerDependencies: { "@opsydyn/crumbs-css": "workspace:^" } },
  ]) {
    expect(() => assertNoWorkspaceOrLinkDependencies(manifest)).toThrow(/workspace:|link:/)
  }
})


test("assertPrecompiledComponentFiles requires native, web, declaration, and entrypoint outputs", () => {
  const completeFiles = [
    "package/dist/ActionCard.styles.native.js",
    "package/dist/ActionCard.styles.web.js",
    "package/dist/ActionCard.styles.d.ts",
    "package/dist/ActionCard.js",
    "package/dist/ActionCard.d.ts",
    "package/dist/index.js",
    "package/dist/index.d.ts",
  ]
  expect(() => assertPrecompiledComponentFiles(completeFiles)).not.toThrow()
  expect(() => assertPrecompiledComponentFiles(
    completeFiles.filter((file) => !file.endsWith("ActionCard.styles.web.js")),
  )).toThrow(/web.*style/i)
  expect(() => assertPrecompiledComponentFiles(
    completeFiles.filter((file) => !file.endsWith("dist/index.js")),
  )).toThrow(/index.*entry/i)
})

test("assertPrecompiledComponentFiles rejects authored stylesheet sources and maps", () => {
  const compiledFiles = [
    "package/dist/ActionCard.styles.native.js",
    "package/dist/ActionCard.styles.web.js",
    "package/dist/ActionCard.styles.d.ts",
    "package/dist/ActionCard.js",
    "package/dist/ActionCard.d.ts",
    "package/dist/index.js",
    "package/dist/index.d.ts",
  ]
  for (const source of ["package/src/ActionCard.css.ts", "package/src/ActionCard.css.ts.map"]) {
    expect(() => assertPrecompiledComponentFiles([...compiledFiles, source])).toThrow(/\.css\.ts/)
  }
  expect(() => assertPrecompiledComponentFiles([
    ...compiledFiles,
    "package/dist/ActionCard.styles.native.js.map",
  ])).toThrow(/source map/i)
})


type BundleFixture = Readonly<{
  consumerRoot: string
  repositoryRoot: string
  targets: ReadonlyArray<Readonly<{ platform: "ios" | "web"; directory: string }>>
  packageSources: Readonly<Record<string, string>>
  repositorySource: string
  authoredStyleSource: string
}>

const expectedBundlePackages = ["@opsydyn/crumbs-css", "@acme/design-tokens", "@acme/ui"]

async function createBundleFixture(options: Readonly<{ includeUi?: boolean }> = {}): Promise<BundleFixture> {
  const consumerRoot = await createConsumer()
  const repositoryRoot = await createTemporaryRoot("crumbs-packed-contract-repository-")
  const packageSources: Record<string, string> = {}
  const packageIdentities = [
    { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
    { name: "@acme/design-tokens", version: "1.0.0" },
    { name: "@acme/ui", version: "1.0.0" },
  ]
  for (const identity of packageIdentities) {
    if (identity.name === "@acme/ui" && options.includeUi === false) continue
    const packageRoot = join(consumerRoot, "node_modules", ...identity.name.split("/"))
    await writePackage(packageRoot, identity)
    packageSources[identity.name] = await realpath(join(packageRoot, "dist/index.js"))
  }

  const repositorySource = join(repositoryRoot, "src", "authoring-helper.js")
  const authoredStyleSource = join(repositoryRoot, "src", "ActionCard.css.ts")
  await mkdir(join(repositoryRoot, "src"), { recursive: true })
  await writeFile(repositorySource, "export const helper = true\n")
  await writeFile(authoredStyleSource, "export const authored = true\n")

  const iosDirectory = join(consumerRoot, "dist", "ios")
  const webDirectory = join(consumerRoot, "dist", "web")
  const packageFiles = Object.values(packageSources)
  await writeBundleMap(join(iosDirectory, "index.js.map"), [...packageFiles, "\0polyfill:external-require"])
  await writeBundleMap(join(webDirectory, "index.js.map"), [...packageFiles, "\0polyfill:external-require"], { indexed: true })

  return {
    consumerRoot,
    repositoryRoot,
    targets: [
      { platform: "ios", directory: iosDirectory },
      { platform: "web", directory: webDirectory },
    ],
    packageSources,
    repositorySource,
    authoredStyleSource,
  }
}

async function writeBundleMap(
  mapPath: string,
  sources: ReadonlyArray<string>,
  options: Readonly<{ indexed?: boolean }> = {},
): Promise<void> {
  await mkdir(dirname(mapPath), { recursive: true })
  const mapDirectory = await realpath(dirname(mapPath))
  const relativeSources = sources.map((source) => source.includes("\0")
    || source === "__prelude__"
    ? source
    : relative(mapDirectory, source).split(sep).join("/"))
  const regularMap = {
    version: 3,
    sources: relativeSources,
    names: [],
    mappings: "",
  }
  const map = options.indexed
    ? { version: 3, sections: [{ offset: { line: 0, column: 0 }, map: regularMap }] }
    : regularMap
  await writeFile(mapPath, JSON.stringify(map))
}

test("verifyExpoBundleInventory inventories installed sources in regular and indexed iOS/web maps", async () => {
  const fixture = await createBundleFixture()
  const inventory = await verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )

  expect(inventory.map((item) => item.platform)).toEqual(["ios", "web"])
  for (const item of inventory) {
    expect(item.sourceMapFiles).toHaveLength(1)
    for (const packageName of expectedBundlePackages) {
      expect(item.packageSources[packageName]).toContain(fixture.packageSources[packageName])
    }
  }
})

test("verifyExpoBundleInventory requires both iOS and web source maps", async () => {
  const fixture = await createBundleFixture()
  await expect(verifyExpoBundleInventory(
    [fixture.targets[0]!],
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )).rejects.toThrow(/web.*source map/i)
})

test("verifyExpoBundleInventory rejects a repository or authored stylesheet source", async () => {
  const fixture = await createBundleFixture()
  await writeBundleMap(
    join(fixture.targets[0]!.directory, "worktree.js.map"),
    [...Object.values(fixture.packageSources), fixture.repositorySource],
  )
  await expect(verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )).rejects.toThrow(/repository|worktree/i)

  await writeBundleMap(
    join(fixture.targets[0]!.directory, "authored-style.js.map"),
    [...Object.values(fixture.packageSources), fixture.authoredStyleSource],
  )
  await expect(verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )).rejects.toThrow(/\.css\.ts/i)
})

test("verifyExpoBundleInventory requires source evidence from every packed package", async () => {
  const fixture = await createBundleFixture({ includeUi: false })
  await expect(verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )).rejects.toThrow(/@acme\/ui/)
})

test("verifyExpoBundleInventory rejects a packed package symlink within node_modules", async () => {
  const fixture = await createBundleFixture()
  const nodeModules = join(fixture.consumerRoot, "node_modules")
  const packagePath = join(nodeModules, "@acme", "ui")
  const packageStore = join(nodeModules, ".store", "ui")
  await rm(packagePath, { recursive: true, force: true })
  await writePackage(packageStore, { name: "@acme/ui", version: "1.0.0" })
  await symlink(packageStore, packagePath, "dir")

  await expect(verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )).rejects.toThrow(/@acme\/ui.*symlink/i)
})

test("verifyExpoBundleInventory rejects ordinary sources outside the staged consumer", async () => {
  const fixture = await createBundleFixture()
  const externalRoot = await createTemporaryRoot("crumbs-packed-contract-external-source-")
  const externalSource = join(externalRoot, "unpublished-source", "helper.js")
  await mkdir(dirname(externalSource), { recursive: true })
  await writeFile(externalSource, "export const helper = true\n")
  await writeBundleMap(
    join(fixture.targets[0]!.directory, "external-source.js.map"),
    [...Object.values(fixture.packageSources), externalSource],
  )

  await expect(verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )).rejects.toThrow(/source.*outside.*consumer/i)
})

test("verifyExpoBundleInventory does not count a missing package path as provenance", async () => {
  const fixture = await createBundleFixture()
  const sourcesWithoutUi = Object.entries(fixture.packageSources)
    .filter(([packageName]) => packageName !== "@acme/ui")
    .map(([, source]) => source)
  const missingUiSource = join(
    fixture.consumerRoot,
    "node_modules",
    "@acme",
    "ui",
    "dist",
    "does-not-exist.js",
  )
  for (const target of fixture.targets) {
    await writeBundleMap(
      join(target.directory, "missing-package-source.js.map"),
      [...sourcesWithoutUi, missingUiSource],
    )
  }

  await expect(verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )).rejects.toThrow(/source.*does not exist|cannot canonicalize/i)
})

test("verifyExpoBundleInventory rejects directory sources", async () => {
  const fixture = await createBundleFixture()
  const directorySource = join(fixture.consumerRoot, "src")
  await mkdir(directorySource, { recursive: true })
  await writeBundleMap(
    join(fixture.targets[0]!.directory, "directory-source.js.map"),
    [...Object.values(fixture.packageSources), directorySource],
  )

  await expect(verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )).rejects.toThrow(/not a regular file/i)
})

test("verifyExpoBundleInventory rejects undecodable source maps", async () => {
  const fixture = await createBundleFixture()
  await writeFile(join(fixture.targets[0]!.directory, "broken.js.map"), "not-json")
  await expect(verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )).rejects.toThrow(/source map.*decode|parse/i)
})

test("verifyExpoBundleInventory resolves Metro root-relative package sources", async () => {
  const fixture = await createBundleFixture()
  const canonicalConsumerRoot = await realpath(fixture.consumerRoot)
  for (const target of fixture.targets) {
    const mapPath = join(target.directory, "index.js.map")
    const sources = Object.values(fixture.packageSources).map((source) =>
      `/${relative(canonicalConsumerRoot, source).split(sep).join("/")}`,
    )
    await writeFile(mapPath, JSON.stringify({ version: 3, sources, names: [], mappings: "" }))
  }

  const inventory = await verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )
  expect(inventory).toHaveLength(2)
  for (const item of inventory) {
    for (const packageName of expectedBundlePackages) {
      expect(item.packageSources[packageName]).toContain(fixture.packageSources[packageName])
    }
  }
})

test("verifyExpoBundleInventory accepts Metro's virtual web prelude source", async () => {
  const fixture = await createBundleFixture()
  await writeBundleMap(
    join(fixture.targets[1]!.directory, "metro-prelude.js.map"),
    [...Object.values(fixture.packageSources), "__prelude__"],
  )

  const inventory = await verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )
  expect(inventory[1]!.packageSources["@acme/ui"]).toContain(fixture.packageSources["@acme/ui"])
})

test("verifyExpoBundleInventory does not count Metro's virtual web prelude as package provenance", async () => {
  const fixture = await createBundleFixture()
  const sourcesWithoutUi = Object.entries(fixture.packageSources)
    .filter(([packageName]) => packageName !== "@acme/ui")
    .map(([, source]) => source)
  for (const target of fixture.targets) {
    await writeBundleMap(
      join(target.directory, "index.js.map"),
      target.platform === "web"
        ? [...sourcesWithoutUi, "__prelude__"]
        : Object.values(fixture.packageSources),
    )
  }

  await expect(verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )).rejects.toThrow(/No web source map includes installed package source @acme\/ui/)
})


test("verifyExpoBundleInventory rejects repository paths encoded in virtual source URLs", async () => {
  const fixture = await createBundleFixture()
  const mapPath = join(fixture.targets[0]!.directory, "virtual-repository.js.map")
  const sources = [
    ...Object.values(fixture.packageSources),
    `webpack:///${fixture.repositoryRoot.slice(1)}/src/authoring-helper.js`,
  ]
  await writeFile(mapPath, JSON.stringify({ version: 3, sources, names: [], mappings: "" }))

  await expect(verifyExpoBundleInventory(
    fixture.targets,
    fixture.consumerRoot,
    fixture.repositoryRoot,
    expectedBundlePackages,
  )).rejects.toThrow(/repository|worktree/i)
})
