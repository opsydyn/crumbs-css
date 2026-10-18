import { describe, expect, it } from "bun:test"
import { createRequire } from "node:module"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { stage } from "../../../scripts/playground"
import * as sdkRunner from "../../../scripts/playground-sdk-candidate"
import { assessPeerCompatibility, candidateManifest } from "../../../scripts/playground-sdk-candidate"
import type { SdkCandidate } from "../../../scripts/playground-sdk-candidate"

const candidate = {
  schemaVersion: 1 as const,
  observedAt: "2026-09-15",
  observed: { expoTag: "latest", expoVersion: "57.0.22", templateVersion: "57.0.24" },
  dependencies: { expo: "57.0.22", react: "19.2.3", "react-native": "0.86.3" },
  devDependencies: { typescript: "6.0.3" },
  expectedOutcome: { kind: "peer-blocked", packagePeer: ">=0.85 <0.86" },
} satisfies SdkCandidate

describe("isolated Expo SDK candidate", () => {
  it("replaces the supported app stack and injects only a packed Crumbs artifact", () => {
    const base = {
      name: "@crumbs/playground",
      dependencies: { expo: "^56.0.0", "@opsydyn/crumbs-css": "workspace:*" },
      devDependencies: { typescript: "~6.0.3" },
    }
    const manifest = candidateManifest(base, candidate, "file:/tmp/crumbs.tgz")

    expect(manifest.name).toBe("@crumbs/playground")
    expect(manifest.dependencies).toEqual({
      expo: "57.0.22",
      react: "19.2.3",
      "react-native": "0.86.3",
      "@opsydyn/crumbs-css": "file:/tmp/crumbs.tgz",
    })
    expect(manifest.devDependencies).toEqual({ typescript: "6.0.3" })
    expect(() => candidateManifest(base, candidate, "workspace:*")).toThrow("packed artifact")
  })

  it("classifies the newest SDK against the package peer range", () => {
    expect(assessPeerCompatibility(candidate, ">=0.85 <0.86")).toEqual({
      compatible: false,
      reactNative: "0.86.3",
      peerRange: ">=0.85 <0.86",
    })
    expect(assessPeerCompatibility(candidate, ">=0.85 <0.87").compatible).toBe(true)
    expect(() => assessPeerCompatibility(candidate, ">=0.85 || >=0.86")).toThrow("bounded peer range")
  })
})


describe("SDK candidate acceptance", () => {
  it("admits the checked-in SDK profiles without floating retained dependencies", async () => {
    for (const sdk of [57, 58]) {
      const profile = JSON.parse(await readFile(join(import.meta.dir, `../../../apps/playground/upgrade/expo-${sdk}.json`), "utf8"))
      expect(() => candidateManifest({ name: "app", dependencies: {} }, profile, "file:/tmp/crumbs.tgz")).not.toThrow()
    }
    const retention = JSON.parse(await readFile(join(import.meta.dir, "../../../apps/playground/upgrade/expo-56-retention.json"), "utf8"))
    for (const version of Object.values({ ...retention.dependencies, ...retention.devDependencies })) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })

  it("preserves the app's explicit runtime import when changing its Expo stack", async () => {
    const parent = await mkdtemp(join(tmpdir(), "crumbs-sdk-runtime-test-"))
    try {
      const consumer = await stage("file:/tmp/crumbs.tgz", parent)
      const base = JSON.parse(await readFile(join(consumer, "package.json"), "utf8"))
      const updated = candidateManifest(base, candidate, "file:/tmp/crumbs.tgz")
      await writeFile(join(consumer, "package.json"), JSON.stringify(updated))
      const runtime = createRequire(join(consumer, "package.json")).resolve("@crumbs/playground/runtime-extensions")
      expect(runtime).toBe(join(consumer, "src/shared-storybook/components/runtime-extensions/runtime.tsx"))
    } finally { await rm(parent, { recursive: true, force: true }) }
  })

  it("admits a qualified candidate only when its expected peer contract agrees", () => {
    const qualified = { ...candidate, expectedOutcome: { kind: "qualified" as const, packagePeer: ">=0.85 <0.87" } }
    expect(sdkRunner.assertCandidateExpectation(qualified, ">=0.85 <0.87").compatible).toBe(true)
    expect(() => sdkRunner.assertCandidateExpectation(qualified, ">=0.85 <0.86")).toThrow("expectation")
    expect(() => sdkRunner.assertCandidateExpectation(candidate, ">=0.85 <0.87")).toThrow("expectation")
    expect(sdkRunner.assertCandidateExpectation(candidate, ">=0.85 <0.86").compatible).toBe(false)
  })

  it("pins CI probes explicitly and rejects ambiguous artifact arguments", () => {
    expect(sdkRunner.parseSdkCandidateArgs(["--pinned", "--tarball", "/tmp/crumbs.tgz", "/tmp/report.json"]))
      .toEqual({ pinned: true, sdk: 57, keep: false, tarball: "/tmp/crumbs.tgz", output: "/tmp/report.json" })
    expect(sdkRunner.parseSdkCandidateArgs([])).toEqual({ pinned: false, sdk: 57, keep: false })
    expect(() => sdkRunner.parseSdkCandidateArgs(["--force"])).toThrow("Unknown")
    expect(() => sdkRunner.parseSdkCandidateArgs(["--tarball"])).toThrow("tarball")
    expect(() => sdkRunner.parseSdkCandidateArgs(["--tarball", "--pinned"])).toThrow("tarball")
    expect(() => sdkRunner.parseSdkCandidateArgs(["one.json", "two.json"])).toThrow("output")
  })

  it("rejects prerelease and floating dependencies from a stable SDK qualification", () => {
    for (const expo of ["57.0.0-beta.1", "^57.0.27", "latest"]) {
      expect(() => candidateManifest({ name: "app", dependencies: {} }, {
        ...candidate, dependencies: { ...candidate.dependencies, expo },
      }, "file:/tmp/crumbs.tgz")).toThrow("exact stable")
    }
  })
})


it("checks the installed artifact bytes and rejects changed, added and linked files", async () => {
  const parent = await mkdtemp(join(tmpdir(), "crumbs-sdk-bytes-test-"))
  const content = "export const value = 1\n"
  const expected = [{ path: "dist/value.mjs", sha256: createHash("sha256").update(content).digest("hex") }]
  try {
    await mkdir(join(parent, "dist"))
    const file = join(parent, "dist/value.mjs")
    await writeFile(file, content)
    await expect(sdkRunner.verifyCandidatePackageFiles(parent, expected)).resolves.toEqual(expected)
    await writeFile(file, "export const value = 2\n")
    await expect(sdkRunner.verifyCandidatePackageFiles(parent, expected)).rejects.toThrow("bytes")
    await writeFile(file, content)
    await writeFile(join(parent, "extra.txt"), "extra")
    await expect(sdkRunner.verifyCandidatePackageFiles(parent, expected)).rejects.toThrow("inventory")
    await rm(join(parent, "extra.txt"))
    await rm(file)
    await expect(sdkRunner.verifyCandidatePackageFiles(parent, expected)).rejects.toThrow("inventory")
    await symlink(join(parent, "target.mjs"), file)
    await expect(sdkRunner.verifyCandidatePackageFiles(parent, expected)).rejects.toThrow("symlink")
  } finally { await rm(parent, { recursive: true, force: true }) }
})


it("accepts compatible React security patches without widening the official SDK minor", () => {
  const template = { version: "57.0.29", dependencies: { expo: "~57.0.27", react: "19.2.3", "react-native": "0.86.3" } }
  const current = { ...candidate, observed: { ...candidate.observed, expoVersion: "57.0.27", templateVersion: "57.0.29" }, dependencies: { ...candidate.dependencies, expo: "57.0.27", react: "19.2.8" } }
  expect(() => sdkRunner.assertOfficialSdkTemplate(current, template)).not.toThrow()
  for (const react of ["19.2.2", "19.3.0", "20.0.0", "19.2.8-beta.1"]) {
    expect(() => sdkRunner.assertOfficialSdkTemplate({ ...current, dependencies: { ...current.dependencies, react } }, template)).toThrow()
  }
  expect(() => sdkRunner.assertOfficialSdkTemplate({ ...current, dependencies: { ...current.dependencies, "react-native": "0.87.0" } }, template)).toThrow("template")
  expect(() => sdkRunner.assertOfficialSdkTemplate({ ...current, dependencies: { ...current.dependencies, expo: "57.0.26" } }, template)).toThrow("template")
})


it("stages the pure motion probe outside the Expo consumer's peer graph", async () => {
  const parent = await mkdtemp(join(tmpdir(), "crumbs-sdk-pure-test-"))
  try {
    const consumer = join(parent, "consumer")
    const installed = join(consumer, "node_modules/@opsydyn/crumbs-css")
    await mkdir(join(installed, "dist"), { recursive: true })
    await mkdir(join(consumer, "test"))
    await writeFile(join(installed, "package.json"), JSON.stringify({ name: "@opsydyn/crumbs-css", version: "1.1.0" }))
    await writeFile(join(installed, "dist/theme-motion.mjs"), "export const defineMotion = x => x")
    await writeFile(join(consumer, "test/motion.node.mjs"), "// pure fixture")
    for (const peer of ["react", "react-native", "effect"]) {
      await mkdir(join(consumer, "node_modules", peer))
      await writeFile(join(consumer, "node_modules", peer, "package.json"), JSON.stringify({ name: peer, main: "index.js" }))
      await writeFile(join(consumer, "node_modules", peer, "index.js"), "")
      expect(createRequire(join(consumer, "package.json")).resolve(peer)).toContain(consumer)
    }
    const probe = await sdkRunner.stagePureMotionProbe(consumer, installed, parent)
    const require = createRequire(join(probe, "test/motion.node.mjs"))
    expect(require.resolve("@opsydyn/crumbs-css/package.json")).toBe(join(probe, "node_modules/@opsydyn/crumbs-css/package.json"))
    for (const peer of ["react", "react-native", "effect"]) expect(() => require.resolve(peer)).toThrow()
    expect(await readFile(join(probe, "node_modules/@opsydyn/crumbs-css-copy/dist/theme-motion.mjs"), "utf8"))
      .toBe("export const defineMotion = x => x")
  } finally { await rm(parent, { recursive: true, force: true }) }
})


it("requires the real Node executable to satisfy the SDK 57 floor", () => {
  for (const version of ["v22.13.0", "v24.15.0", "v26.3.0"]) expect(() => sdkRunner.assertSdkNodeVersion(version)).not.toThrow()
  for (const version of ["v20.19.4", "v22.0.0", "v22.12.9", "v24.0.0-rc.1", "not-node"]) {
    expect(() => sdkRunner.assertSdkNodeVersion(version)).toThrow("Node >=22.13.0")
  }
})
