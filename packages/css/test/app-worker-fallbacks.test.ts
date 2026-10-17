import { expect, it } from "bun:test";
import * as evidence from "../../../scripts/sdk-worker-evidence";

// Representative routes retained from the real SDK58 all-platform app exports.
const fallback = (file: string, reason: string) => ({
  _e: "transform:noxcturnal:fallback", file: `../../node_modules/${file}`, reason,
});
const common = [
  fallback("react-native/src/private/components/virtualview/VirtualViewNativeComponent.js", "full-metro:react-native-codegen"),
  fallback("react-native/Libraries/Animated/createAnimatedComponent.js", "full-metro:worklets-candidate"),
];
const storybook = [
  ...common,
  fallback("react-native-worklets/src/debug/bundleMode.native.ts", "full-metro:worklets"),
  fallback("react-native-modal-datetime-picker/src/Modal.js", "full-metro:non-default-babel-config"),
];

it.each(["playground", "storybook"] as const)("%s requires each expected file and fallback reason", app => {
  expect(typeof evidence.assertAppWorkerFallbackEvidence).toBe("function");
  const records = app === "storybook" ? storybook : common;
  expect(() => evidence.assertAppWorkerFallbackEvidence(records, app)).not.toThrow();
  expect(() => evidence.assertAppWorkerFallbackEvidence([], app)).toThrow("Missing expected fallback");
  for (let i = 0; i < records.length; i++) {
    expect(() => evidence.assertAppWorkerFallbackEvidence(records.filter((_, j) => i !== j), app)).toThrow("Missing expected fallback");
    expect(() => evidence.assertAppWorkerFallbackEvidence(records.map((r, j) => j === i ? {...r, reason: "unrelated-reason"} : r), app)).toThrow("Missing expected fallback");
    expect(() => evidence.assertAppWorkerFallbackEvidence(records.map((r, j) => j === i ? {...r, _e: "transform:noxcturnal:full", status: "complete"} : r), app)).toThrow("Missing expected fallback");
  }
});
