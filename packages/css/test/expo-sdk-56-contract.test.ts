import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { assessPeerCompatibility, assertCandidateExpectation } from "../../../scripts/playground-sdk-candidate"
import type { SdkCandidate } from "../../../scripts/playground-sdk-candidate"

type PackageJson = {
  readonly dependencies?: Readonly<Record<string, string>>
  readonly devDependencies?: Readonly<Record<string, string>>
  readonly peerDependencies?: Readonly<Record<string, string>>
  readonly scripts?: Readonly<Record<string, string>>
}

type AppConfig = {
  readonly expo?: {
    readonly newArchEnabled?: boolean
  }
}

const repoRoot = resolve(import.meta.dir, "..", "..", "..")
const packageRoot = resolve(repoRoot, "packages", "css")
const storybookRoot = resolve(repoRoot, "apps", "storybook")
const playgroundRoot = resolve(repoRoot, "apps", "playground")

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

describe("@opsydyn/crumbs-css Expo SDK 56/57 contract", () => {
  it("keeps the independent SDK 57 qualification profile outside the workspaces", () => {
    const root = readJson<{ readonly workspaces: readonly string[] }>(resolve(repoRoot, "package.json"))
    const candidate = readJson<SdkCandidate>(resolve(playgroundRoot, "upgrade", "expo-57.json"))
    const packageJson = readJson<PackageJson>(resolve(packageRoot, "package.json"))
    expect(root.workspaces.some(pattern => new Bun.Glob(pattern).match("apps/playground/upgrade"))).toBe(false)
    expect(assertCandidateExpectation(candidate, packageJson.peerDependencies!["react-native"]!).compatible).toBe(true)
  })

  it("admits the tested SDK 56 and 57 React Native lines while rejecting unqualified neighbours", () => {
    const packageJson = readJson<PackageJson>(resolve(packageRoot, "package.json"))
    const candidate = readJson<SdkCandidate>(resolve(playgroundRoot, "upgrade", "expo-57.json"))
    const peer = packageJson.peerDependencies!["react-native"]!
    for (const [reactNative, compatible] of [["0.84.0", false], ["0.85.3", true], ["0.86.3", true], ["0.87.0", false]] as const) {
      const input = { ...candidate, dependencies: { ...candidate.dependencies, "react-native": reactNative } }
      expect(assessPeerCompatibility(input, peer).compatible).toBe(compatible)
    }
    expect(packageJson.devDependencies?.react).toBe("19.2.3")
    expect(packageJson.devDependencies?.["react-native"]).toBe("0.85.3")
  })

  it("documents Expo 56 / React Native 0.85 as the validated consumer baseline", () => {
    const compatibility = readFileSync(resolve(packageRoot, "COMPATIBILITY.md"), "utf8")
    const readme = readFileSync(resolve(packageRoot, "README.md"), "utf8")
    const installPrerequisites = readFileSync(
      resolve(repoRoot, "docs", "src", "content", "docs", "reference", "install-prerequisites.mdx"),
      "utf8",
    )

    expect(compatibility).toContain("Expo SDK 56")
    expect(compatibility).toContain("React Native 0.85")
    expect(readme).toContain("Expo SDK 56")
    expect(readme).toContain("React Native 0.85")
    expect(installPrerequisites).toContain("Expo SDK 56")
    expect(installPrerequisites).toContain("React Native 0.85")
  })

  it("keeps the Storybook app config on the current Expo schema", () => {
    const appConfig = readJson<AppConfig>(resolve(storybookRoot, "app.json"))

    expect(appConfig.expo?.newArchEnabled).toBeUndefined()
  })
})
