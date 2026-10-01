import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

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

describe("@opsydyn/crumbs-css Expo SDK 56 contract", () => {
  it("pins the Storybook consumer to the Expo 56 / React Native 0.85 stack", () => {
    const packageJson = readJson<PackageJson>(resolve(storybookRoot, "package.json"))

    expect(packageJson.dependencies?.expo).toBe("^56.0.0")
    expect(packageJson.dependencies?.react).toBe("19.2.3")
    expect(packageJson.dependencies?.["react-dom"]).toBe("19.2.3")
    expect(packageJson.dependencies?.["react-native"]).toBe("0.85.3")
    expect(packageJson.dependencies?.["@react-native-community/datetimepicker"]).toBe("9.1.0")
    expect(packageJson.dependencies?.["@react-native-community/slider"]).toBe("5.2.0")
    expect(packageJson.dependencies?.["react-native-gesture-handler"]).toBe("~2.31.1")
    expect(packageJson.dependencies?.["react-native-reanimated"]).toBe("4.3.1")
    expect(packageJson.dependencies?.["react-native-safe-area-context"]).toBe("~5.7.0")
    expect(packageJson.dependencies?.["react-native-worklets"]).toBe("0.8.3")
    expect(packageJson.scripts?.["storybook:native"]).toContain(
      "EXPO_PUBLIC_STORYBOOK_ENABLED=true",
    )
    expect(packageJson.scripts?.storybook).toBeUndefined()
  })

  it("keeps the playground on the compatible supported stack with committed resolutions", () => {
    const storybook = readJson<PackageJson>(resolve(storybookRoot, "package.json"))
    const playground = readJson<PackageJson>(resolve(playgroundRoot, "package.json"))
    const lockfile = readFileSync(resolve(repoRoot, "bun.lock"), "utf8")

    for (const dependency of ["react", "react-dom", "react-native"] as const) {
      expect(playground.dependencies?.[dependency]).toBe(storybook.dependencies?.[dependency])
    }
    expect(storybook.dependencies?.expo).toBe("^56.0.0")
    expect(playground.dependencies?.expo).toBe("~56.0.23")
    expect(lockfile).toContain('"expo": ["expo@56.0.23"')
    expect(lockfile).toContain('"react-native": ["react-native@0.85.3"')
    expect(lockfile).toContain('"@expo/metro-runtime": ["@expo/metro-runtime@56.0.21"')
  })

  it("isolates the observed newest SDK candidate from supported workspaces", () => {
    const root = readJson<{ readonly workspaces: readonly string[] }>(resolve(repoRoot, "package.json"))
    const candidate = readJson<{
      readonly schemaVersion: number
      readonly observed: { readonly expoTag: string; readonly expoVersion: string; readonly templateVersion: string }
      readonly dependencies: Readonly<Record<string, string>>
      readonly expectedOutcome: { readonly kind: string; readonly packagePeer: string }
    }>(resolve(playgroundRoot, "upgrade", "expo-57.json"))

    expect(root.workspaces).not.toContain("apps/playground/upgrade/*")
    expect(candidate.schemaVersion).toBe(1)
    expect(candidate.observed).toEqual({ expoTag: "latest", expoVersion: "57.0.22", templateVersion: "57.0.24" })
    expect(candidate.dependencies.expo).toBe("57.0.22")
    expect(candidate.dependencies.react).toBe("19.2.3")
    expect(candidate.dependencies["react-native"]).toBe("0.86.3")
    expect(candidate.expectedOutcome).toEqual({ kind: "peer-blocked", packagePeer: ">=0.85 <0.86" })
  })

  it("declares React Native 0.85 package compatibility and tests against it locally", () => {
    const packageJson = readJson<PackageJson>(resolve(packageRoot, "package.json"))

    expect(packageJson.peerDependencies?.react).toBe(">=19 <20")
    expect(packageJson.peerDependencies?.["react-native"]).toBe(">=0.85 <0.86")
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
