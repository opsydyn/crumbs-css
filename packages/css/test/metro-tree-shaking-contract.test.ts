import { expect, test } from "bun:test"
import { verifyTreeShakingCanary } from "../../../scripts/metro-tree-shaking-contract"
import { CRUMBS_DTCG_IMPORT_FORMAT } from "../src/tooling/dtcg/model"

const canary = "external-token-theme"
const ownershipCanary = "crumbs.design-system-owned-report"

test("verifyTreeShakingCanary accepts both iOS and web decoder/positive-control bundles", () => {
  const result = verifyTreeShakingCanary(
    [
      { platform: "ios", path: "ios.jsbundle", javascript: "decodeTokenValue('white')" },
      { platform: "web", path: "web.js", javascript: "decodeTokenValue('white')" },
    ],
    [
      { platform: "ios", path: "positive-ios.jsbundle", javascript: `decodeExternalTokenTheme('${canary}')` },
      { platform: "web", path: "positive-web.js", javascript: `decodeExternalTokenTheme('${canary}')` },
    ],
    canary,
  )

  expect(result).toEqual({ decoder: ["ios", "web"], positiveControl: ["ios", "web"] })
})

test("verifyTreeShakingCanary rejects a decoder bundle retaining the canary", () => {
  expect(() => verifyTreeShakingCanary(
    [
      { platform: "ios", path: "ios.jsbundle", javascript: `decodeTokenValue(); '${canary}'` },
      { platform: "web", path: "web.js", javascript: "decodeTokenValue()" },
    ],
    [
      { platform: "ios", path: "positive-ios.jsbundle", javascript: canary },
      { platform: "web", path: "positive-web.js", javascript: canary },
    ],
    canary,
  )).toThrow(/decoder.*ios\.jsbundle.*canary/i)
})

test("verifyTreeShakingCanary rejects a positive control that lost the canary", () => {
  expect(() => verifyTreeShakingCanary(
    [
      { platform: "ios", path: "ios.jsbundle", javascript: "decodeTokenValue()" },
      { platform: "web", path: "web.js", javascript: "decodeTokenValue()" },
    ],
    [
      { platform: "ios", path: "positive-ios.jsbundle", javascript: canary },
      { platform: "web", path: "positive-web.js", javascript: "decodeExternalTokenTheme()" },
    ],
    canary,
  )).toThrow(/positive-control.*web\.js.*missing/i)
})

test("verifyTreeShakingCanary requires an iOS and web bundle for each surface", () => {
  expect(() => verifyTreeShakingCanary(
    [{ platform: "ios", path: "ios.js", javascript: "decodeTokenValue()" }],
    [
      { platform: "ios", path: "positive-ios.js", javascript: canary },
      { platform: "web", path: "positive-web.js", javascript: canary },
    ],
    canary,
  )).toThrow(/decoder.*missing web/i)
  expect(() => verifyTreeShakingCanary(
    [
      { platform: "ios", path: "ios.js", javascript: "decodeTokenValue()" },
      { platform: "web", path: "web.js", javascript: "decodeTokenValue()" },
    ],
    [{ platform: "web", path: "positive-web.js", javascript: canary }],
    canary,
  )).toThrow(/positive-control.*missing ios/i)
})

test("verifyTreeShakingCanary rejects source maps as canary inputs", () => {
  expect(() => verifyTreeShakingCanary(
    [
      { platform: "ios", path: "ios.js.map", javascript: canary },
      { platform: "web", path: "web.js", javascript: "decodeTokenValue()" },
    ],
    [
      { platform: "ios", path: "positive-ios.jsbundle", javascript: canary },
      { platform: "web", path: "positive-web.js", javascript: canary },
    ],
    canary,
  )).toThrow(/source map.*not.*javascript bundle/i)
})


test("the DTCG public format marker detects accidental tooling retention in app bundles", () => {
  const cleanDecoderBundles = [
    { platform: "ios" as const, path: "ios.jsbundle", javascript: "decodeExternalTokenTheme()" },
    { platform: "web" as const, path: "web.js", javascript: "decodeExternalTokenTheme()" },
  ]
  const positiveControlBundles = [
    { platform: "ios" as const, path: "positive-ios.jsbundle", javascript: `importDtcgTheme('${CRUMBS_DTCG_IMPORT_FORMAT}')` },
    { platform: "web" as const, path: "positive-web.js", javascript: `importDtcgTheme('${CRUMBS_DTCG_IMPORT_FORMAT}')` },
  ]
  expect(verifyTreeShakingCanary(cleanDecoderBundles, positiveControlBundles, CRUMBS_DTCG_IMPORT_FORMAT))
    .toEqual({ decoder: ["ios", "web"], positiveControl: ["ios", "web"] })
  expect(() => verifyTreeShakingCanary(
    [{ ...cleanDecoderBundles[0]!, javascript: `decodeExternalTokenTheme(); '${CRUMBS_DTCG_IMPORT_FORMAT}'` }, cleanDecoderBundles[1]!],
    positiveControlBundles,
    CRUMBS_DTCG_IMPORT_FORMAT,
  )).toThrow(/decoder.*ios\.jsbundle.*canary/i)
})

test("the ownership report marker detects accidental tooling retention in app bundles", () => {
  const cleanDecoderBundles = [
    { platform: "ios" as const, path: "ios.jsbundle", javascript: "resolveThemeTokens(styles, theme)" },
    { platform: "web" as const, path: "web.js", javascript: "resolveThemeTokens(styles, theme)" },
  ]
  const positiveControlBundles = [
    { platform: "ios" as const, path: "positive-ios.jsbundle", javascript: `annotateDesignSystemReport('${ownershipCanary}')` },
    { platform: "web" as const, path: "positive-web.js", javascript: `annotateDesignSystemReport('${ownershipCanary}')` },
  ]
  expect(verifyTreeShakingCanary(cleanDecoderBundles, positiveControlBundles, ownershipCanary))
    .toEqual({ decoder: ["ios", "web"], positiveControl: ["ios", "web"] })
  expect(() => verifyTreeShakingCanary(
    [{ ...cleanDecoderBundles[0]!, javascript: `resolveThemeTokens(); '${ownershipCanary}'` }, cleanDecoderBundles[1]!],
    positiveControlBundles,
    ownershipCanary,
  )).toThrow(/decoder.*ios\.jsbundle.*canary/i)
})
