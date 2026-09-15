import { describe, expect, it } from "bun:test"
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

    expect(manifest.name).toBe("@crumbs/playground-expo-57-candidate")
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
