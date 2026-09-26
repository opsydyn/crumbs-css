import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, isAbsolute, join, relative, sep } from "node:path"
import {
  assertNoWorkspaceOrLinkDependencies,
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
