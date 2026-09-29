import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"

const config = JSON.parse(
  readFileSync(new URL("../app.json", import.meta.url), "utf8"),
) as {
  expo: {
    ios?: { bundleIdentifier?: string }
    plugins?: readonly (string | readonly [string, Record<string, unknown>])[]
  }
}

describe("native Expo locale configuration", () => {
  it("declares an iOS bundle with native English and Arabic RTL support", () => {
    const plugin = config.expo.plugins?.find(
      (entry) => Array.isArray(entry) && entry[0] === "expo-localization",
    )

    expect(config.expo.ios?.bundleIdentifier).toBe("dev.crumbs.storybook")
    expect(plugin).toEqual([
      "expo-localization",
      {
        supportsRTL: true,
        supportedLocales: { ios: ["en", "ar"] },
      },
    ])
  })
})
