import { extname } from "node:path"

export type MetroJavaScriptBundle = Readonly<{
  platform: "ios" | "web"
  path: string
  javascript: string
}>

export type TreeShakingCanaryResult = Readonly<{
  decoder: ReadonlyArray<"ios" | "web">
  positiveControl: ReadonlyArray<"ios" | "web">
}>

/** Verify dead-code removal from raw JS, with a positive control for detector sensitivity. */
export function verifyTreeShakingCanary(
  decoderBundles: ReadonlyArray<MetroJavaScriptBundle>,
  positiveControlBundles: ReadonlyArray<MetroJavaScriptBundle>,
  canary: string,
): TreeShakingCanaryResult {
  if (canary.length === 0) throw new Error("Tree-shaking canary must be a non-empty string")
  validateBundlePaths(decoderBundles, "decoder")
  validateBundlePaths(positiveControlBundles, "positive-control")
  assertPlatforms(decoderBundles, "decoder")
  assertPlatforms(positiveControlBundles, "positive-control")

  for (const bundle of decoderBundles) {
    if (bundle.javascript.includes(canary)) {
      throw new Error(`Decoder bundle ${bundle.platform} ${bundle.path} retained canary ${JSON.stringify(canary)}`)
    }
  }
  for (const bundle of positiveControlBundles) {
    if (!bundle.javascript.includes(canary)) {
      throw new Error(`Positive-control bundle ${bundle.platform} ${bundle.path} is missing canary ${JSON.stringify(canary)}`)
    }
  }

  return { decoder: ["ios", "web"], positiveControl: ["ios", "web"] }
}

function validateBundlePaths(
  bundles: ReadonlyArray<MetroJavaScriptBundle>,
  surface: "decoder" | "positive-control",
): void {
  for (const bundle of bundles) {
    const extension = extname(bundle.path).toLowerCase()
    if (extension === ".map") {
      throw new Error(`Source map is not a generated JavaScript bundle for ${surface}: ${bundle.path}`)
    }
    if (extension !== ".js" && extension !== ".jsbundle") {
      throw new Error(`Expected a generated JavaScript bundle for ${surface}: ${bundle.path}`)
    }
  }
}

function assertPlatforms(
  bundles: ReadonlyArray<MetroJavaScriptBundle>,
  surface: "decoder" | "positive-control",
): void {
  for (const platform of ["ios", "web"] as const) {
    if (!bundles.some((bundle) => bundle.platform === platform)) {
      throw new Error(`${surface} bundles are missing ${platform}`)
    }
  }
}
