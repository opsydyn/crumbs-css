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

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T
}

describe("@opsydyn/crumbs-css Expo SDK 56 contract", () => {
  it("pins the Storybook consumer to the Expo 56 / React Native 0.85 stack", () => {
    const packageJson = readJson<PackageJson>(resolve(storybookRoot, "package.json"))

    expect(packageJson.dependencies?.expo).toBe("^56.0.0")
    expect(packageJson.dependencies?.react).toBe("19.2.3")
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
